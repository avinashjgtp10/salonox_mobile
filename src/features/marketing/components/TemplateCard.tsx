import { useState } from "react";
import type { Template, TemplateStatus } from "../../../types/marketing.types";
import TemplatePreviewModal from "./TemplatePreviewModal";
import { Button, Badge } from "../../../components/ui";
import "../styles/TemplateCard.scss";

interface Props {
  template:      Template;
  onDelete:      (id: string) => void;
  onSync:        (id: string) => void;
  syncLoading?:  boolean;
  deleteLoading?: boolean;
}

const STATUS_BADGE: Record<TemplateStatus, "success" | "warning" | "danger"> = {
  APPROVED: "success",
  PENDING:  "warning",
  REJECTED: "danger",
};

export default function TemplateCard({
  template, onDelete, onSync, syncLoading, deleteLoading,
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const isApproved = template.status === "APPROVED";

  return (
    <>
      <div
        className={`tcard ${isApproved ? "tcard--clickable" : ""}`}
        onClick={() => { if (isApproved) setShowPreview(true); }}
        title={isApproved ? "Click to preview" : undefined}
      >
        {/* Header: name + status badge */}
        <div className="tcard-header">
          <div className="tcard-name">{template.name}</div>
          <Badge variant={STATUS_BADGE[template.status] ?? "secondary"} pill>
            {template.status}
          </Badge>
        </div>

        {/* Category + language pills */}
        <div className="tcard-badges">
          <span className="tcard-badge">{template.category}</span>
          <span className="tcard-badge">{template.language}</span>
        </div>

        {/* Body preview */}
        <div className="tcard-body">
          {template.body_text ?? template.bodyText}
        </div>

        

        {/* No header warning */}
        {(template.header_type === "none") && (
          <div className="tcard-no-header">⚠️ No header</div>
        )}

        {/* Footer: date + action buttons */}
        <div className="tcard-footer">
          <span className="tcard-date">
            {(template.created_at ?? template.createdAt)
              ? new Date((template.created_at ?? template.createdAt)!).toLocaleDateString("en-IN")
              : "—"}
          </span>
          <div className="tcard-actions">
            <Button
              variant="outline-secondary"
              size="sm"
              loading={syncLoading}
              disabled={syncLoading || deleteLoading}
              title="Sync from Meta"
              onClick={(e) => { e.stopPropagation(); onSync(String(template.id)); }}
            >
              ↻
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              loading={deleteLoading}
              disabled={syncLoading || deleteLoading}
              title="Delete template"
              onClick={(e) => { e.stopPropagation(); onDelete(String(template.id)); }}
            >
              ✕
            </Button>
          </div>
        </div>
      </div>

      {showPreview && (
        <TemplatePreviewModal
          template={template}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}