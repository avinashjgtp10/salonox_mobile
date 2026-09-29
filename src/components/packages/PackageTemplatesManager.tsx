import React, { useState, useCallback } from "react";
import { Plus, Trash, PencilSquare, TagFill, ClockFill, CreditCard2Front } from "react-bootstrap-icons";
import { Loader2, Package } from "lucide-react";
import styles from "./packages.module.scss";
import "./PackageTemplatesManager.scss";
import {
  useListPackageTemplatesQuery,
  useDeletePackageTemplateMutation,
} from "../../services/api/endpoints/packages.endpoints";
import type { PackageTemplate } from "../../services/api/endpoints/packages.endpoints";
import { useCurrency } from "../../hooks/useCurrency";
import PackageCreateForm from "./PackageCreateForm";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppDispatch } from "../../hooks/useAppRedux";
import { showPermissionDenied } from "../../store/permissionDialogSlice";

const friendlyPermissionDenied = (permKey: string) =>
  `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`;

// ─── Types ────────────────────────────────────────────────────────────────────

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
];

// ─── Template Card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template:   PackageTemplate;
  index:      number;
  deleting:   boolean;
  onEdit:     () => void;
  onDelete:   () => void;
}

function TemplateCard({ template: t, index, deleting, onEdit, onDelete }: TemplateCardProps) {
  const { formatAmount } = useCurrency();
  const { can } = usePermissions();
  const canEdit = can("edit_package_template");
  const canDelete = can("delete_package_template");
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const gstAmt = (t.basePrice - t.discount) * t.gstPercentage / 100;
  const total  = t.basePrice - t.discount + gstAmt;
  const payLabel = t.paymentMethod.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      transition: "box-shadow .15s, transform .15s",
      display: "flex",
      flexDirection: "column",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      {/* Gradient header */}
      <div style={{ background: gradient, padding: "20px 20px 16px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.75)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
              Package Template
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{t.name}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{formatAmount(total)}</div>
            {t.discount > 0 && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)", marginTop: 2 }}>
                <span style={{ textDecoration: "line-through" }}>{formatAmount(t.basePrice)}</span>
                <span style={{ marginLeft: 4, background: "rgba(255,255,255,.2)", borderRadius: 4, padding: "1px 5px" }}>-{formatAmount(t.discount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Meta pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 500 }}>
            <ClockFill size={10} />
            {t.neverExpires ? "Never expires" : `${t.expiryMonths ?? "?"} months`}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 500 }}>
            <CreditCard2Front size={10} />
            {payLabel}
          </span>
        </div>
      </div>

      {/* Services list */}
      <div style={{ flex: 1, padding: "14px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
          {t.services.length} Service{t.services.length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {t.services.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TagFill size={10} color="#7c3aed" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.serviceName}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f0f1f3", color: "#6b7280", borderRadius: 12, padding: "2px 8px" }}>
                  ×{s.totalSessions}
                </span>
                {s.price > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{formatAmount(s.price)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ borderTop: "1px solid #f0f1f3", padding: "10px 18px", display: "flex", gap: 8, justifyContent: "flex-end", background: "#fafafa" }}>
        <button
          onClick={onEdit}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", border: "1px solid #e5e7eb", borderRadius: 8,
            background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600,
            cursor: canEdit ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all .15s",
            opacity: canEdit ? 1 : 0.5,
          }}
          onMouseEnter={e => { if (canEdit) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
        >
          <PencilSquare size={12} /> Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", border: "1px solid #fee2e2", borderRadius: 8,
            background: "#fff", color: "#dc2626", fontSize: 12, fontWeight: 600,
            cursor: deleting ? "default" : canDelete ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all .15s",
            opacity: deleting ? 0.5 : canDelete ? 1 : 0.5,
          }}
          onMouseEnter={e => { if (canDelete) (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
        >
          {deleting ? <Loader2 size={12} className={styles.spin} /> : <Trash size={12} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PackageTemplatesManager: React.FC = () => {
  const { data: templates = [], isLoading } = useListPackageTemplatesQuery();
  const [deleteTemplate] = useDeletePackageTemplateMutation();
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = useCallback((permKey: string) => dispatch(showPermissionDenied(friendlyPermissionDenied(permKey))), [dispatch]);

  const [modalOpen,       setModalOpen]       = useState(false);
  // The full template being edited, not just its id — PackageCreateForm's
  // templateToEdit prop needs the real object to pre-fill the form from.
  // null while creating a brand-new template.
  const [editingTemplate, setEditingTemplate] = useState<PackageTemplate | null>(null);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);

  const openCreate = useCallback(() => {
    if (!can("add_package_template")) { denyPerm("add_package_template"); return; }
    setEditingTemplate(null);
    setModalOpen(true);
  }, [can, denyPerm]);

  const openEdit = useCallback((t: PackageTemplate) => {
    if (!can("edit_package_template")) { denyPerm("edit_package_template"); return; }
    setEditingTemplate(t);
    setModalOpen(true);
  }, [can, denyPerm]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingTemplate(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!can("delete_package_template")) { denyPerm("delete_package_template"); return; }
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id).unwrap();
    } finally {
      setDeletingId(null);
    }
  }, [can, denyPerm, deleteTemplate]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={18} color="#fff" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>Package Templates</h2>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 0 46px" }}>
            Define reusable packages — load them instantly when selling to a client.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff",
            border: "none", borderRadius: 10, padding: "10px 18px",
            fontSize: 13, fontWeight: 700, cursor: can("add_package_template") ? "pointer" : "not-allowed",
            fontFamily: "inherit", whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(102,126,234,.4)",
            opacity: can("add_package_template") ? 1 : 0.5,
            transition: "all .15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(102,126,234,.5)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(102,126,234,.4)"; }}
        >
          <Plus size={15} /> New Template
        </button>
      </div>


      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <Loader2 size={32} className={styles.spin} color="#667eea" />
          <div style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>Loading templates…</div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "2px dashed #e5e7eb", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#eef2ff,#f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Package size={28} color="#7c3aed" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 }}>No templates yet</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, maxWidth: 320 }}>
            Create reusable package templates to speed up sales. Pick a template to auto-fill the entire package form.
          </div>
          <button
            onClick={openCreate}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 20px",
              fontSize: 13, fontWeight: 700, cursor: can("add_package_template") ? "pointer" : "not-allowed", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(102,126,234,.35)",
              opacity: can("add_package_template") ? 1 : 0.5,
            }}
          >
            <Plus size={15} /> Create First Template
          </button>
        </div>
      )}

      {/* Template grid */}
      {!isLoading && templates.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {templates.map((t, i) => (
            <TemplateCard
              key={t.id}
              template={t}
              index={i}
              deleting={deletingId === t.id}
              onEdit={() => openEdit(t)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal — reuses the same form Custom Package sale uses
          (PackageCreateForm), in templateOnly mode: Client/Staff/Payment
          Method and per-service scheduling are hidden since a template has
          none of those, and saving always creates/updates the template
          itself rather than selling anything. */}
      {modalOpen && (
        <div
          className="pkg-tmpl-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="pkg-tmpl-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ overflowY: "auto", padding: 20 }}>
              <PackageCreateForm
                templateOnly
                selectedClient={null}
                onClientChange={() => {}}
                onCancel={closeModal}
                onSaved={closeModal}
                onTemplateSaved={closeModal}
                templateToEdit={editingTemplate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageTemplatesManager;
