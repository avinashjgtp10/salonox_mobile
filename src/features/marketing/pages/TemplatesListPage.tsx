import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  fetchTemplatesThunk,
  deleteTemplateThunk,
  syncTemplateThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { TemplateCard } from "../components";
import TriggerTemplatesPanel from "../components/TriggerTemplatesPanel";
import { Button, Input, Modal, PageHeader, Tabs } from "../../../components/ui";
import "../styles/TemplatesListPage.scss";

type StatusFilter = "ALL" | "APPROVED" | "PENDING" | "REJECTED" | "FAVORITE";
type TemplateTab = "campaign" | "trigger";

const POLL_INTERVAL = 60_000;

export default function TemplatesListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { templates, loading, waConfig } = useAppSelector((s) => s.marketing);
  // WhatsApp Campaign templates need a connected WhatsApp account; Trigger
  // Templates (SMS/Email included) don't — this page is now reachable
  // without WhatsApp configured (see MarketingRoutes.tsx), so default to the
  // tab that's actually usable instead of landing on an empty Campaign list.
  const isWaConfigured = !!((waConfig as any)?.phoneNumberId ?? (waConfig as any)?.phone_number_id);

  const [activeTab, setActiveTab] = useState<TemplateTab>(isWaConfigured ? "campaign" : "trigger");
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── FIXED: confirm modal stores id + message, confirm button calls dispatch directly ──
  const [confirmModal, setConfirmModal] = useState<{
    open:      boolean;
    message:   string;
    ids:       string[];
    isBulk:    boolean;
  }>({ open: false, message: "", ids: [], isBulk: false });

  const [isDeleting,  setIsDeleting]  = useState(false);
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [syncingId,   setSyncingId]   = useState<string | null>(null);

  const prevStatuses = useRef<Record<string, string>>({});
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => { dispatch(fetchTemplatesThunk()); }, [dispatch]);

  useEffect(() => {
    if (templates.length === 0) return;
    templates.forEach(t => {
      if (!prevStatuses.current[String(t.id)]) {
        prevStatuses.current[String(t.id)] = t.status;
      }
    });
  }, [templates]);

  const syncPending = useCallback(async () => {
    const pending = templates.filter(t => t.status === "PENDING");
    if (pending.length === 0) return;
    for (const t of pending) {
      const res = await dispatch(syncTemplateThunk(String(t.id)));
      if (syncTemplateThunk.fulfilled.match(res)) {
        const updated = res.payload;
        const prev    = prevStatuses.current[String(t.id)];
        if (prev && prev !== updated.status) {
          if (updated.status === "APPROVED") showSuccess(`✅ Template "${updated.name}" approved by Meta!`);
          else if (updated.status === "REJECTED") showError(`❌ Template "${updated.name}" was rejected by Meta.`);
        }
        prevStatuses.current[String(t.id)] = updated.status;
      }
    }
  }, [templates, dispatch]);

  useEffect(() => {
    const hasPending = templates.some(t => t.status === "PENDING");
    if (!hasPending) { setCountdown(POLL_INTERVAL / 1000); return; }
    setCountdown(POLL_INTERVAL / 1000);
    const ticker = setInterval(() => setCountdown(prev => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1)), 1000);
    const poller = setInterval(() => { syncPending(); setCountdown(POLL_INTERVAL / 1000); }, POLL_INTERVAL);
    return () => { clearInterval(ticker); clearInterval(poller); };
  }, [syncPending, templates]);

  const filtered = templates.filter(t => {
  if (status === "FAVORITE") return (t as any).is_favorite === true;
  const matchStatus = status === "ALL" || t.status === status;
  const matchSearch = !search || (t.name ?? "").toLowerCase().includes(search.toLowerCase());
  return matchStatus && matchSearch;
});

  const counts = {
    approved: templates.filter(t => t.status === "APPROVED").length,
    pending:  templates.filter(t => t.status === "PENDING").length,
    rejected: templates.filter(t => t.status === "REJECTED").length,
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => String(t.id))));
  };

  // ── FIXED: open confirm with ids stored — no useOnce wrapping ─────────────
  const openDeleteConfirm = (ids: string[], isBulk = false) => {
    const msg = isBulk
      ? `Delete ${ids.length} template(s)? This cannot be undone.`
      : "Delete this template? This cannot be undone.";
    setConfirmModal({ open: true, message: msg, ids, isBulk });
  };

  // ── FIXED: actual delete — called from modal confirm button ───────────────
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      let successCount = 0;
      for (const id of confirmModal.ids) {
        const res = await dispatch(deleteTemplateThunk(id));
        if (deleteTemplateThunk.rejected.match(res)) {
          const msg = (res.payload as string) ?? "";
          if (msg.includes("campaign")) {
            showError("This template is used in campaigns and can't be deleted.");
          } else {
            showError("Failed to delete template. Please try again.");
          }
        } else {
          successCount++;
        }
      }
      if (successCount > 0) {
        showSuccess(successCount > 1 ? `${successCount} templates deleted` : "Template deleted");
      }
      setSelected(new Set());
      setConfirmModal({ open: false, message: "", ids: [], isBulk: false });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncAll = async () => {
    const pending = templates.filter(t => t.status === "PENDING");
    if (!pending.length) { showError("No pending templates to sync"); return; }
    setIsSyncing(true);
    for (const t of pending) await dispatch(syncTemplateThunk(String(t.id)));
    showSuccess(`Synced ${pending.length} pending template(s)`);
    setIsSyncing(false);
  };

  // ── FIXED: per-card sync — no useOnce ────────────────────────────────────
  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await dispatch(syncTemplateThunk(id));
      if (syncTemplateThunk.fulfilled.match(res)) showSuccess("Template status synced from Meta");
      else showError("Failed to sync template");
    } finally {
      setSyncingId(null);
    }
  };

  const hasPending = counts.pending > 0;

  return (
    <div className="tl-page">
      {overlay}

      {/* Header */}
      <PageHeader
        title="Templates"
        subtitle={
          activeTab === "campaign"
            ? "Sent manually to a list via a Blast Campaign"
            : "Fire automatically off a real event — a sale, a booking, a lifecycle date"
        }
        actions={
          activeTab === "campaign" ? (
            <Button variant="primary" size="sm" onClick={() => navigate("/dashboard/marketing/templates/create")}>
              + New Template
            </Button>
          ) : undefined
        }
      />

      <Tabs
        className="tl-tabs"
        variant="underline"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TemplateTab)}
        tabs={[
          { key: "campaign", label: "Campaign Templates" },
          { key: "trigger",  label: "Trigger Templates" },
        ]}
      />

      {activeTab === "trigger" ? (
        <TriggerTemplatesPanel />
      ) : (
      <>
      {/* Auto-sync banner */}
      {hasPending && (
        <div className="tl-autopoll-banner">
          <span className="tl-autopoll-dot" />
          <span className="tl-autopoll-text">Auto-checking Meta approval every 60s</span>
          <span className="tl-autopoll-countdown">Next check in <strong>{countdown}s</strong></span>
          <Button variant="outline-warning" size="sm" loading={isSyncing} disabled={isSyncing} onClick={handleSyncAll}>
            ↻ Check Now
          </Button>
        </div>
      )}

      {/* Status Filter Pills */}
      <div className="tl-status-row">
        {([
  { key: "ALL",      label: `All (${templates.length})` },
  { key: "FAVORITE", label: `⭐ Favorites (${templates.filter(t => (t as any).is_favorite).length})` },
  { key: "APPROVED", label: `✅ Approved (${counts.approved})` },
  { key: "PENDING",  label: `⏳ Pending (${counts.pending})` },
  { key: "REJECTED", label: `❌ Rejected (${counts.rejected})` },
] as { key: StatusFilter; label: string }[]).map(s => (
  <button
    key={s.key}
    className={`tl-pill ${status === s.key ? "tl-pill--active" : ""} ${s.key === "PENDING" && counts.pending > 0 ? "tl-pill--pending-pulse" : ""}`}
    onClick={() => setStatus(s.key)}
  >
    {s.label}
  </button>
))}
      </div>

      {/* Toolbar */}
      <div className="tl-toolbar">
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClass="mb-0 flex-1"
        />
        <div className="tl-toolbar-right">
          {selected.size > 0 && (
            <Button
              variant="outline-danger"
              size="sm"
              disabled={isDeleting}
              onClick={() => openDeleteConfirm(Array.from(selected), true)}
            >
              🗑 Delete ({selected.size})
            </Button>
          )}
          {filtered.length > 0 && (
            <Button variant="outline-secondary" size="sm" onClick={toggleAll}>
              {selected.size === filtered.length ? "✗ Deselect All" : "✓ Select All"}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading.fetchTemplates ? (
        <div className="tl-loading">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="tl-empty">
          <div className="tl-empty-icon">🎨</div>
          <p>{templates.length === 0 ? "No templates yet." : "No templates match your filter."}</p>
          {templates.length === 0 && (
            <Button variant="primary" onClick={() => navigate("/dashboard/marketing/templates/create")}>
              Create your first template →
            </Button>
          )}
        </div>
      ) : (
        <div className="tl-grid">
          {filtered.map(t => (
            <div
              key={t.id}
              className={`tl-card-wrap ${selected.has(String(t.id)) ? "tl-card-wrap--selected" : ""} ${t.status === "PENDING" ? "tl-card-wrap--pending" : ""}`}
            >
              <label className="tl-checkbox-label" title="Select" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="tl-checkbox-input"
                  checked={selected.has(String(t.id))}
                  onChange={() => toggleSelect(String(t.id))}
                />
                <span className="tl-checkbox-box">{selected.has(String(t.id)) && "✓"}</span>
              </label>

              <TemplateCard
                template={t}
                onDelete={(id) => openDeleteConfirm([id])}
                onSync={handleSync}
                syncLoading={syncingId === String(t.id)}
                deleteLoading={isDeleting && confirmModal.ids.includes(String(t.id))}
              />
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* Confirm Delete Modal */}
      <Modal
        show={confirmModal.open}
        onClose={() => !isDeleting && setConfirmModal(c => ({ ...c, open: false }))}
        title="Delete Template"
        size="sm"
        footer={
          <div className="d-flex gap-2 justify-content-end w-100">
            <Button variant="outline-secondary" size="sm" disabled={isDeleting} onClick={() => setConfirmModal(c => ({ ...c, open: false }))}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isDeleting}
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="mb-0" style={{ fontSize: 14, color: "#555" }}>{confirmModal.message}</p>
      </Modal>
    </div>
  );
}