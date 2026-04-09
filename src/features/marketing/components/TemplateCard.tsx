import type { Template, TemplateStatus } from "../../../types/marketing.types";
import "../styles/TemplateCard.scss";

interface Props {
  template: Template;
  onDelete: (id: string) => void;
  onSync: (id: string) => void;
}

const STATUS_MAP: Record<TemplateStatus, { label: string; color: string; bg: string }> = {
  APPROVED: { label: "Approved", color: "#16a34a", bg: "#f0fdf4" },
  PENDING:  { label: "Pending",  color: "#d97706", bg: "#fffbeb" },
  REJECTED: { label: "Rejected", color: "#dc2626", bg: "#fef2f2" },
};

export default function TemplateCard({ template, onDelete, onSync }: Props) {
  const status = STATUS_MAP[template.status] ?? STATUS_MAP.PENDING;

  return (
    <div className="tcard">
      <div className="tcard-header">
        <div className="tcard-name">{template.name}</div>
        <span
          className="tcard-status"
          style={{ color: status.color, background: status.bg }}
        >
          {status.label}
        </span>
      </div>

      <div className="tcard-badges">
        <span className="tcard-badge">{template.category}</span>
        <span className="tcard-badge">{template.language}</span>
      </div>

      <div className="tcard-body">{template.bodyText}</div>

      {template.rejectionReason && (
        <div className="tcard-rejection">⚠️ {template.rejectionReason}</div>
      )}

      <div className="tcard-footer">
        <span className="tcard-date">
          {template.createdAt
            ? new Date(template.createdAt).toLocaleDateString("en-IN")
            : "—"}
        </span>
        <div className="tcard-actions">
          <button
            className="tcard-btn"
            onClick={() => onSync(String(template.id))}
            title="Sync from Meta"
          >
            ↻
          </button>
          <button
            className="tcard-btn danger"
            onClick={() => onDelete(String(template.id))}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
