import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search, PlusLg, X, ClipboardData, ThreeDotsVertical, Eye,
  CheckCircle, XCircle, ArrowRepeat,
} from "react-bootstrap-icons";
import { Dropdown } from "react-bootstrap";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import Pagination from "../../../components/ui/Pagination";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import {
  fetchProductAuditsThunk, createProductAuditThunk, submitProductAuditThunk,
  approveProductAuditThunk, rejectProductAuditThunk, reopenProductAuditThunk,
} from "../../../middleware/inventory/inventory.thunk";
import ProductAuditDetailsModal from "../components/ProductAuditDetailsModal";
import CreateAuditModal from "../components/CreateAuditModal";
import ReviewAuditModal from "../components/ReviewAuditModal";
import type { ProductAuditListRow, ProductAuditStatus } from "../../../types/inventory.types";
import "../styles/ProductAuditPage.scss";

const PAGE_SIZES = [10, 20, 50];

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

export default function ProductAuditPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentSalon, branches } = useSelector((state: RootState) => state.salon);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [rows, setRows] = useState<ProductAuditListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductAuditStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (currentSalon?.id) dispatch(fetchBranchesThunk(currentSalon.id));
  }, [dispatch, currentSalon?.id]);

  const defaultBranchId = useMemo(
    () => branches.find((b) => b.id !== currentSalon?.id)?.id || branches[0]?.id || "",
    [branches, currentSalon?.id],
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dispatch(fetchProductAuditsThunk({
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: pageSize,
      })).unwrap();
      setRows(result.data);
      setTotal(result.total);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't load product audits");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, statusFilter, debouncedSearch, page, pageSize, showError]);

  useEffect(() => { load(); }, [load]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    {
      key: "status", label: "Status",
      options: (Object.keys(STATUS_LABELS) as ProductAuditStatus[]).map((s) => ({ id: s, label: STATUS_LABELS[s] })),
    },
  ], []);

  const filterMenuSelected = useMemo(() => ({
    status: statusFilter ? [statusFilter] : [],
  }), [statusFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    const one = (v?: string[]) => (v?.length ? v[v.length - 1] : "");
    setStatusFilter(one(next.status) as ProductAuditStatus | "");
  };

  const handleCreate = async (draft: { name: string; branch: string; notes: string; auditorId: string }) => {
    try {
      const created = await dispatch(createProductAuditThunk({
        branch_id: draft.branch,
        name: draft.name,
        notes: draft.notes || undefined,
        auditor_id: draft.auditorId || undefined,
      })).unwrap();
      setCreateOpen(false);
      showSuccess("Audit created");
      load();
      setDetailsId(created.id);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't create audit");
    }
  };

  const quickAction = async (audit: ProductAuditListRow, action: "submit" | "reopen") => {
    try {
      if (action === "submit") await dispatch(submitProductAuditThunk(audit.id)).unwrap();
      else await dispatch(reopenProductAuditThunk(audit.id)).unwrap();
      showSuccess("Audit updated");
      load();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Action failed");
    }
  };

  const [reviewTarget, setReviewTarget] = useState<{ audit: ProductAuditListRow; mode: "approve" | "reject" } | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const confirmReview = async ({ reviewerId, reason }: { reviewerId: string; reason?: string }) => {
    if (!reviewTarget) return;
    setReviewing(true);
    try {
      if (reviewTarget.mode === "approve") {
        await dispatch(approveProductAuditThunk({ auditId: reviewTarget.audit.id, reviewerId })).unwrap();
        showSuccess("Audit approved");
      } else {
        await dispatch(rejectProductAuditThunk({ auditId: reviewTarget.audit.id, reason: reason || "", reviewerId })).unwrap();
        showSuccess("Audit rejected");
      }
      setReviewTarget(null);
      load();
    } catch (err: any) {
      showError(typeof err === "string" ? err : `Couldn't ${reviewTarget.mode} audit`);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="paudit-page">
      {overlay}

      <header className="paudit-page__header">
        <div>
          <h1>
            Product Audit
            <span className="paudit-count">{total}</span>
          </h1>
          <p>Count physical stock against system quantities and reconcile differences.</p>
        </div>
        <Button variant="dark" iconLeft={<PlusLg size={14} />} onClick={() => setCreateOpen(true)} disabled={!defaultBranchId}>
          New Audit
        </Button>
      </header>

      <div className="paudit-page__controls">
        <Input
          containerClass="search-box mb-0"
          type="text"
          placeholder="Search by audit name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
          iconRight={search ? (
            <button type="button" className="search-clear-btn" aria-label="Clear search" onClick={() => setSearch("")}>
              <X size={16} />
            </button>
          ) : undefined}
        />
        <JiraFilterMenu
          fields={filterFields}
          selected={filterMenuSelected}
          onApply={handleFiltersApply}
          triggerLabel="Filters"
        />
      </div>

      <main className="paudit-page__content">
        {loading ? (
          <table className="paudit-table">
            <thead>
              <tr>
                <th>Audit</th><th>Auditor</th>
                <th className="paudit-num">Products</th><th className="paudit-num">Differences</th>
                <th>Status</th><th>Last Updated</th><th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width="70%" height={13} /></td>
                  <td><Skeleton width="60%" height={12} /></td>
                  <td><Skeleton width="30%" height={12} /></td>
                  <td><Skeleton width="30%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="60%" height={12} /></td>
                  <td className="actions-cell" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="paudit-table">
            <thead>
              <tr>
                <th>Audit</th>
                <th>Auditor</th>
                <th className="paudit-num">Products</th>
                <th className="paudit-num">Differences</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((a) => {
                  return (
                    <tr key={a.id} className="paudit-row" onClick={() => setDetailsId(a.id)}>
                      <td className="paudit-name-cell" title={a.name}>
                        <div className="paudit-icon"><ClipboardData size={18} /></div>
                        <div className="name-info">
                          <span className="name">{a.name}</span>
                          {a.notes && <span className="sub">{a.notes}</span>}
                        </div>
                      </td>
                      <td>{a.auditor_name || "—"}</td>
                      <td className="paudit-num">{a.item_count}</td>
                      <td className="paudit-num">
                        {a.diff_count > 0 ? <span className="paudit-diff-flag">{a.diff_count}</span> : "—"}
                      </td>
                      <td>
                        <Badge variant={STATUS_BADGE_VARIANT[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                      </td>
                      <td className="paudit-date">{fmtDateTime(a.updated_at)}</td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <Dropdown align="end">
                          <Dropdown.Toggle
                            as="button"
                            bsPrefix="row-actions-toggle"
                            className="row-actions-toggle"
                            id={`paudit-row-actions-${a.id}`}
                          >
                            <ThreeDotsVertical size={16} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu
                            className="shadow-sm border-0 rounded-3 py-2"
                            style={{ minWidth: "200px" }}
                            renderOnMount
                            popperConfig={{ strategy: "fixed" }}
                          >
                            <Dropdown.Item onClick={() => setDetailsId(a.id)} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                              <Eye size={14} /> View / Edit
                            </Dropdown.Item>
                            {a.status === "in_progress" && (
                              <Dropdown.Item onClick={() => quickAction(a, "submit")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                                <CheckCircle size={14} /> Submit for Review
                              </Dropdown.Item>
                            )}
                            {/* Who to record as reviewer is picked inside ReviewAuditModal,
                                which already excludes the auditor from its options — the
                                audit itself must be reviewed by someone other than its
                                auditor, but that's not the same as the logged-in account,
                                so Approve/Reject stay available regardless of who's logged in. */}
                            {a.status === "pending_review" && (
                              <>
                                <Dropdown.Item onClick={() => setReviewTarget({ audit: a, mode: "approve" })} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-success">
                                  <CheckCircle size={14} /> Approve
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => setReviewTarget({ audit: a, mode: "reject" })} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-danger">
                                  <XCircle size={14} /> Reject
                                </Dropdown.Item>
                              </>
                            )}
                            {a.status === "rejected" && (
                              <Dropdown.Item onClick={() => quickAction(a, "reopen")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                                <ArrowRepeat size={14} /> Reopen
                              </Dropdown.Item>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="paudit-empty-cell">
                    <EmptyState
                      icon={<ClipboardData size={36} />}
                      title={(search || statusFilter) ? "No audits match these filters." : "No audits yet."}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>

      {total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZES}
          className="paudit-pagination"
        />
      )}

      {createOpen && defaultBranchId && (
        <CreateAuditModal
          defaultBranchId={defaultBranchId}
          branches={branches}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {detailsId && (
        <ProductAuditDetailsModal
          // Forces a fresh mount whenever a different audit is opened (the
          // dropdown/row-click paths below can set a new detailsId directly,
          // without detailsId ever passing through null) — without this, the
          // modal's own pendingEdits/debounce-timer state from the PREVIOUS
          // audit would survive into the new one, risking a save landing
          // against the wrong audit/item id.
          key={detailsId}
          auditId={detailsId}
          onClose={() => setDetailsId(null)}
          onChanged={load}
        />
      )}

      {reviewTarget && (
        <ReviewAuditModal
          mode={reviewTarget.mode}
          auditorId={reviewTarget.audit.auditor_id}
          busy={reviewing}
          onClose={() => setReviewTarget(null)}
          onConfirm={confirmReview}
        />
      )}
    </div>
  );
}
