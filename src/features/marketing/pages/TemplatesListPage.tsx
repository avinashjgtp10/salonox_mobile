import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchTemplatesThunk,
  deleteTemplateThunk,
  syncTemplateThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { TemplateCard } from "../components";
import { Button, Input, Modal } from "../../../components/ui";
import { useOnce } from "../../../hooks/useOnce";
import "../styles/TemplatesListPage.scss";

type StatusFilter = "ALL" | "APPROVED" | "PENDING" | "REJECTED";

export default function TemplatesListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { templates, loading } = useAppSelector((s) => s.marketing);

  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  useEffect(() => { dispatch(fetchTemplatesThunk()); }, [dispatch]);

  const filtered = templates.filter(t => {
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
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => String(t.id))));
  };

  const openConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmModal({ open: true, message, onConfirm });
  }, []);

  const closeConfirm = () => setConfirmModal(c => ({ ...c, open: false }));

  // ── Single-click protected handlers ──────────────────────────────────────

  const [handleSyncAll, syncingAll] = useOnce(async () => {
    const pending = templates.filter(t => t.status === "PENDING");
    if (!pending.length) { toast("No pending templates to sync"); return; }
    for (const t of pending) await dispatch(syncTemplateThunk(String(t.id)));
    toast.success(`Synced ${pending.length} pending template(s)`);
  });

  const [handleBulkDelete, bulkDeleting] = useOnce(async () => {
    for (const id of selected) await dispatch(deleteTemplateThunk(id));
    toast.success(`${selected.size} template(s) deleted`);
    setSelected(new Set());
    closeConfirm();
  });

  const [handleDelete, deleting] = useOnce(async (id: string) => {
    await dispatch(deleteTemplateThunk(id));
    toast.success("Template deleted");
    closeConfirm();
  });

  const [handleSync, syncing] = useOnce(async (id: string) => {
    await dispatch(syncTemplateThunk(id));
    toast.success("Template synced");
  });

  return (
    <div className="tl-page">

      {/* ── Header ── */}
      <div className="tl-header">
        <div>
          <h1 className="tl-title">WhatsApp Templates</h1>
          <p className="tl-sub">Manage your message templates for campaigns</p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate("/dashboard/marketing/templates/create")}
        >
          + New Template
        </Button>
      </div>

      {/* ── Status Filter Pills ── */}
      <div className="tl-status-row">
        {([
          { key: "ALL",      label: `All (${templates.length})` },
          { key: "APPROVED", label: `Approved (${counts.approved})` },
          { key: "PENDING",  label: `Pending (${counts.pending})` },
          { key: "REJECTED", label: `Rejected (${counts.rejected})` },
        ] as { key: StatusFilter; label: string }[]).map(s => (
          <button
            key={s.key}
            className={`tl-pill ${status === s.key ? "tl-pill--active" : ""}`}
            onClick={() => setStatus(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="tl-toolbar">
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClass="mb-0 flex-1"
        />
        <div className="tl-toolbar-right">
          {counts.pending > 0 && (
            <Button
              variant="outline-warning"
              size="sm"
              loading={syncingAll}
              disabled={syncingAll}
              onClick={handleSyncAll}
            >
              ↻ Sync Pending ({counts.pending})
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              variant="outline-danger"
              size="sm"
              loading={bulkDeleting}
              disabled={bulkDeleting}
              onClick={() => openConfirm(
                `Delete ${selected.size} template(s)? This cannot be undone.`,
                handleBulkDelete
              )}
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

      {/* ── Content ── */}
      {loading.fetchTemplates ? (
        <div className="tl-loading">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="tl-empty">
          <div className="tl-empty-icon">🎨</div>
          <p>{templates.length === 0 ? "No templates yet." : "No templates match your filter."}</p>
          {templates.length === 0 && (
            <Button
              variant="primary"
              onClick={() => navigate("/dashboard/marketing/templates/create")}
            >
              Create your first template →
            </Button>
          )}
        </div>
      ) : (
        <div className="tl-grid">
          {filtered.map(t => (
            <div
              key={t.id}
              className={`tl-card-wrap ${selected.has(String(t.id)) ? "tl-card-wrap--selected" : ""}`}
            >
              <label className="tl-checkbox-label" title="Select">
                <input
                  type="checkbox"
                  className="tl-checkbox-input"
                  checked={selected.has(String(t.id))}
                  onChange={() => toggleSelect(String(t.id))}
                />
                <span className="tl-checkbox-box">
                  {selected.has(String(t.id)) && "✓"}
                </span>
              </label>

              <TemplateCard
                template={t}
                onDelete={(id) => openConfirm("Delete this template?", () => handleDelete(id))}
                onSync={handleSync}
                syncLoading={syncing}
                deleteLoading={deleting}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Confirm Modal ── */}
      <Modal
        show={confirmModal.open}
        onClose={closeConfirm}
        title="Confirm"
        size="sm"
        footer={
          <div className="d-flex gap-2 justify-content-end w-100">
            <Button variant="outline-secondary" size="sm" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting || bulkDeleting}
              disabled={deleting || bulkDeleting}
              onClick={confirmModal.onConfirm}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="mb-0" style={{ fontSize: 14, color: "#555" }}>
          {confirmModal.message}
        </p>
      </Modal>
    </div>
  );
}