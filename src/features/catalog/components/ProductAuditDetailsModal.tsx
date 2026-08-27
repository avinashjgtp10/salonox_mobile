import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { PlusLg, Trash, ExclamationTriangle } from "react-bootstrap-icons";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Tabs from "../../../components/ui/Tabs";
import type { TabItem } from "../../../components/ui/Tabs";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import type { AppDispatch } from "../../../store/store";
import {
  fetchProductAuditByIdThunk, addProductAuditItemsThunk, removeProductAuditItemThunk,
  updateProductAuditItemThunk, submitProductAuditThunk, approveProductAuditThunk,
  rejectProductAuditThunk, reopenProductAuditThunk,
} from "../../../middleware/inventory/inventory.thunk";
import type { ProductAuditWithDetail, ProductAuditStatus } from "../../../types/inventory.types";
import AddAuditProductModal from "./AddAuditProductModal";
import ReviewAuditModal from "./ReviewAuditModal";

interface Props {
  auditId: string;
  onClose: () => void;
  /** Notified after any mutation so the list page can refresh its row. */
  onChanged: () => void;
}

const STATUS_LABELS: Record<ProductAuditStatus, string> = {
  in_progress: "In Progress",
  pending_review: "Pending Review",
  complete: "Complete",
  rejected: "Rejected",
};

const STATUS_BADGE_VARIANT: Record<ProductAuditStatus, "secondary" | "warning" | "success" | "danger"> = {
  in_progress: "secondary",
  pending_review: "warning",
  complete: "success",
  rejected: "danger",
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = d.getHours();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
};

const diffOf = (systemQty: number, physicalQty: number | null) => (physicalQty == null ? null : physicalQty - systemQty);

export default function ProductAuditDetailsModal({ auditId, onClose, onChanged }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { showError, overlay } = useStatusOverlay();

  const [audit, setAudit] = useState<ProductAuditWithDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("products");
  const [addOpen, setAddOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<"approve" | "reject" | null>(null);
  const [busy, setBusy] = useState(false);
  // Debounced per-row qty/reason edits pending a PATCH, so every keystroke
  // doesn't fire a request — mirrors the search-debounce pattern used
  // elsewhere (ProductInventoryPage's 350ms search debounce).
  const [pendingEdits, setPendingEdits] = useState<Record<string, { physicalQty: number | null; reason: string }>>({});

  // silent=true skips the loading-placeholder swap — used for the
  // post-save refresh after a debounced qty/reason edit, so the modal's
  // inputs stay mounted and don't drop focus mid-type (the full-page
  // "Loading…" branch below used to unmount them on every autosave).
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await dispatch(fetchProductAuditByIdThunk(auditId)).unwrap();
      setAudit(result);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't load audit");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dispatch, auditId, showError]);

  useEffect(() => { load(); }, [load]);

  // Flush a row's pending edit to the server 500ms after the last change.
  // Skips rows the server is guaranteed to reject (a nonzero difference with
  // no reason yet) — otherwise every keystroke on the qty field before the
  // user gets to the reason field fires a failing PATCH, over and over as
  // they keep typing. Those rows stay held in local state (still shown,
  // still block Submit for Review via withPendingReasons) until the reason
  // is filled in or the qty is changed back to match system_qty.
  useEffect(() => {
    const ids = Object.keys(pendingEdits).filter((itemId) => {
      const edit = pendingEdits[itemId];
      const item = audit?.items.find((i) => i.id === itemId);
      if (!item) return false;
      const d = diffOf(item.system_qty, edit.physicalQty);
      return d == null || d === 0 || !!edit.reason.trim();
    });
    if (ids.length === 0) return;
    const t = setTimeout(async () => {
      for (const itemId of ids) {
        const edit = pendingEdits[itemId];
        try {
          await dispatch(updateProductAuditItemThunk({
            auditId, itemId, payload: { physical_qty: edit.physicalQty, reason: edit.reason },
          })).unwrap();
          setPendingEdits((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        } catch {
          // Left in pendingEdits so the value the user typed isn't lost —
          // will retry once it becomes valid (see the filter above).
        }
      }
      load(true);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEdits]);

  const editable = audit?.status === "in_progress";
  // Who to record as reviewer is picked inside ReviewAuditModal, which
  // already excludes the auditor from its options — the audit must be
  // reviewed by someone other than its auditor, but that's not the same as
  // the logged-in account, so Approve/Reject stay available regardless of
  // who's logged in.
  const canReview = audit?.status === "pending_review";

  const effectiveItems = useMemo(() => {
    if (!audit) return [];
    return audit.items.map((item) => {
      const pending = pendingEdits[item.id];
      return pending
        ? { ...item, physical_qty: pending.physicalQty, reason: pending.reason }
        : item;
    });
  }, [audit, pendingEdits]);

  const withPendingReasons = useMemo(
    () => effectiveItems.filter((i) => {
      const d = diffOf(i.system_qty, i.physical_qty);
      return d != null && d !== 0 && !(i.reason || "").trim();
    }),
    [effectiveItems],
  );

  const summary = useMemo(() => {
    let counted = 0, matched = 0, over = 0, short = 0, missingReason = 0;
    for (const i of effectiveItems) {
      const d = diffOf(i.system_qty, i.physical_qty);
      if (d == null) continue;
      counted++;
      if (d === 0) matched++;
      else if (d > 0) over++;
      else short++;
      if (d !== 0 && !(i.reason || "").trim()) missingReason++;
    }
    return { total: effectiveItems.length, counted, matched, over, short, missingReason };
  }, [effectiveItems]);

  const setLocalEdit = (itemId: string, patch: Partial<{ physicalQty: number | null; reason: string }>) => {
    setPendingEdits((prev) => {
      const item = effectiveItems.find((i) => i.id === itemId);
      const current = prev[itemId] ?? { physicalQty: item?.physical_qty ?? null, reason: item?.reason ?? "" };
      return { ...prev, [itemId]: { ...current, ...patch } };
    });
  };

  const removeItem = async (itemId: string) => {
    setBusy(true);
    try {
      const updated = await dispatch(removeProductAuditItemThunk({ auditId, itemId })).unwrap();
      setAudit(updated);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't remove product");
    } finally {
      setBusy(false);
    }
  };

  const addProducts = async (productIds: string[]) => {
    setBusy(true);
    try {
      const updated = await dispatch(addProductAuditItemsThunk({ auditId, productIds })).unwrap();
      setAudit(updated);
      setAddOpen(false);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't add products");
    } finally {
      setBusy(false);
    }
  };

  const submitForReview = async () => {
    if (withPendingReasons.length > 0) return;
    setBusy(true);
    try {
      const updated = await dispatch(submitProductAuditThunk(auditId)).unwrap();
      setAudit(updated);
      onChanged();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't submit for review");
    } finally {
      setBusy(false);
    }
  };

  const confirmReview = async ({ reviewerId, reason }: { reviewerId: string; reason?: string }) => {
    setBusy(true);
    try {
      const updated = reviewOpen === "approve"
        ? await dispatch(approveProductAuditThunk({ auditId, reviewerId })).unwrap()
        : await dispatch(rejectProductAuditThunk({ auditId, reason: reason || "", reviewerId })).unwrap();
      setAudit(updated);
      setReviewOpen(null);
      onChanged();
    } catch (err: any) {
      showError(typeof err === "string" ? err : `Couldn't ${reviewOpen} audit`);
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    setBusy(true);
    try {
      const updated = await dispatch(reopenProductAuditThunk(auditId)).unwrap();
      setAudit(updated);
      onChanged();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't reopen audit");
    } finally {
      setBusy(false);
    }
  };

  const closeAndRefresh = () => {
    onChanged();
    onClose();
  };

  const tabs: TabItem[] = [
    { key: "products", label: "Products", count: effectiveItems.length },
    { key: "summary", label: "Summary" },
    { key: "history", label: "History", count: audit?.history.length ?? 0 },
  ];

  if (loading || !audit) {
    return (
      <Modal show onClose={onClose} title="Loading audit…">
        <p className="paudit-empty">Loading…</p>
      </Modal>
    );
  }

  return (
    <Modal
      show
      onClose={closeAndRefresh}
      title={audit.name}
      size="xl"
      footer={
        <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
          {overlay}
          <div className="d-flex align-items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[audit.status]}>{STATUS_LABELS[audit.status]}</Badge>
            {audit.status === "in_progress" && withPendingReasons.length > 0 && (
              <span className="paudit-warn-text">
                <ExclamationTriangle size={14} /> {withPendingReasons.length} product(s) need a reason
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            {editable && (
              <>
                <Button variant="outline-dark" onClick={closeAndRefresh} disabled={busy}>
                  Close
                </Button>
                <Button variant="dark" onClick={submitForReview} disabled={busy || withPendingReasons.length > 0 || effectiveItems.length === 0}>
                  Submit for Review
                </Button>
              </>
            )}
            {canReview && (
              <>
                <Button variant="outline-danger" onClick={() => setReviewOpen("reject")} disabled={busy}>
                  Reject
                </Button>
                <Button variant="success" onClick={() => setReviewOpen("approve")} disabled={busy}>
                  Approve & Complete
                </Button>
              </>
            )}
            {audit.status === "rejected" && (
              <Button variant="dark" onClick={reopen} disabled={busy}>
                Reopen for Recount
              </Button>
            )}
            {audit.status === "complete" && (
              <Button variant="outline-dark" onClick={closeAndRefresh}>Close</Button>
            )}
          </div>
        </div>
      }
    >
      <div className="paudit-modal-meta mb-3">
        <span><strong>Auditor:</strong> {audit.auditor_name || "—"}</span>
        <span><strong>Created:</strong> {fmtDateTime(audit.created_at)}</span>
        {audit.reviewer_name && <span><strong>Reviewer:</strong> {audit.reviewer_name}</span>}
      </div>

      {audit.status === "rejected" && audit.rejection_reason && (
        <div className="paudit-rejection-banner mb-3">
          <ExclamationTriangle size={16} />
          <div>
            <strong>Rejected</strong>
            <p>{audit.rejection_reason}</p>
          </div>
        </div>
      )}

      <Tabs tabs={tabs} activeKey={tab} onChange={setTab} variant="underline" className="mb-3" />

      {tab === "products" && (
        <div>
          {editable && (
            <div className="d-flex justify-content-end mb-2">
              <Button variant="outline-dark" size="sm" iconLeft={<PlusLg size={14} />} onClick={() => setAddOpen(true)}>
                Add Products
              </Button>
            </div>
          )}
          <div className="paudit-products-table-wrap">
            <table className="paudit-table--compact">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="paudit-num">System Qty</th>
                  <th className="paudit-num">Physical Qty</th>
                  <th className="paudit-num">Difference</th>
                  <th>Reason</th>
                  {editable && <th style={{ width: 40 }} />}
                </tr>
              </thead>
              <tbody>
                {effectiveItems.length === 0 ? (
                  <tr><td colSpan={editable ? 6 : 5} className="paudit-empty">No products added to this audit yet.</td></tr>
                ) : (
                  effectiveItems.map((p) => {
                    const d = diffOf(p.system_qty, p.physical_qty);
                    const needsReason = d != null && d !== 0 && !(p.reason || "").trim();
                    return (
                      <tr key={p.id} className={needsReason ? "paudit-row--warn" : ""}>
                        <td>
                          <div className="paudit-prod-cell">
                            <span className="name">{p.product_name}</span>
                            <span className="sub">{p.sku || "—"} · {p.category || "—"}</span>
                          </div>
                        </td>
                        <td className="paudit-num">{p.system_qty}</td>
                        <td className="paudit-num">
                          {editable ? (
                            <input
                              type="number"
                              className="paudit-qty-input"
                              value={p.physical_qty ?? ""}
                              placeholder="—"
                              onChange={(e) => {
                                const v = e.target.value;
                                setLocalEdit(p.id, { physicalQty: v === "" ? null : Number(v) });
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          ) : (
                            p.physical_qty ?? "—"
                          )}
                        </td>
                        <td className="paudit-num">
                          {d == null ? (
                            "—"
                          ) : (
                            <span className={d === 0 ? "paudit-diff-zero" : d > 0 ? "paudit-diff-over" : "paudit-diff-short"}>
                              {d > 0 ? `+${d}` : d}
                            </span>
                          )}
                        </td>
                        <td>
                          {editable ? (
                            <input
                              type="text"
                              className={`paudit-reason-input${needsReason ? " paudit-reason-input--err" : ""}`}
                              placeholder={d != null && d !== 0 ? "Reason required" : "Optional"}
                              value={p.reason ?? ""}
                              onChange={(e) => setLocalEdit(p.id, { reason: e.target.value })}
                            />
                          ) : (
                            p.reason || "—"
                          )}
                        </td>
                        {editable && (
                          <td>
                            <button className="paudit-row-remove" onClick={() => removeItem(p.id)} aria-label="Remove product" disabled={busy}>
                              <Trash size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "summary" && (
        <div className="paudit-summary-grid">
          <div className="paudit-summary-card">
            <span className="label">Total Products</span>
            <span className="value">{summary.total}</span>
          </div>
          <div className="paudit-summary-card">
            <span className="label">Counted</span>
            <span className="value">{summary.counted}</span>
          </div>
          <div className="paudit-summary-card">
            <span className="label">Matched</span>
            <span className="value paudit-diff-zero">{summary.matched}</span>
          </div>
          <div className="paudit-summary-card">
            <span className="label">Overage</span>
            <span className="value paudit-diff-over">{summary.over}</span>
          </div>
          <div className="paudit-summary-card">
            <span className="label">Shortage</span>
            <span className="value paudit-diff-short">{summary.short}</span>
          </div>
          <div className="paudit-summary-card">
            <span className="label">Missing Reason</span>
            <span className="value paudit-diff-short">{summary.missingReason}</span>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="paudit-timeline">
          {audit.history.slice().reverse().map((h) => (
            <div key={h.id} className="paudit-timeline-item">
              <div className="paudit-timeline-dot" />
              <div className="paudit-timeline-body">
                <div className="paudit-timeline-head">
                  <strong>{h.action}</strong>
                  <span className="paudit-timeline-date">{fmtDateTime(h.created_at)}</span>
                </div>
                <div className="paudit-timeline-actor">{h.actor_name || "—"}</div>
                {h.note && <p className="paudit-timeline-note">{h.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddAuditProductModal
          existingProductIds={audit.items.map((i) => i.product_id)}
          onClose={() => setAddOpen(false)}
          onAdd={addProducts}
        />
      )}

      {reviewOpen && (
        <ReviewAuditModal
          mode={reviewOpen}
          auditorId={audit.auditor_id}
          busy={busy}
          onClose={() => setReviewOpen(null)}
          onConfirm={confirmReview}
        />
      )}
    </Modal>
  );
}
