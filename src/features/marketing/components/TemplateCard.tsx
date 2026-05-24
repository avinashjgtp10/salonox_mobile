import { useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { toggleTemplateFavoriteThunk } from "../../../middleware/marketing/marketing.thunk";
import type { Template, TemplateStatus } from "../../../types/marketing.types";
import TemplatePreviewModal from "./TemplatePreviewModal";
import { Button, Badge } from "../../../components/ui";
import "../styles/TemplateCard.scss";

interface Props {
  template:       Template;
  onDelete:       (id: string) => void;
  onSync:         (id: string) => void;
  syncLoading?:   boolean;
  deleteLoading?: boolean;
}

const STATUS_BADGE: Record<TemplateStatus, "success" | "warning" | "danger"> = {
  APPROVED: "success",
  PENDING:  "warning",
  REJECTED: "danger",
};

const CATEGORY_COLOR: Record<string, string> = {
  MARKETING:      "#3b82f6",
  UTILITY:        "#8b5cf6",
  AUTHENTICATION: "#10b981",
};

export default function TemplateCard({
  template, onDelete, onSync, syncLoading, deleteLoading,
}: Props) {
  const dispatch                      = useAppDispatch();
  const [showPreview, setShowPreview] = useState(false);
  const [starring,    setStarring]    = useState(false);

  const isApproved      = template.status === "APPROVED";
  const isRejected      = template.status === "REJECTED";
  const isFavorite      = (template as any).is_favorite ?? false;
  const rejectionReason = template.rejection_reason ?? template.rejectionReason;

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarring(true);
    await dispatch(toggleTemplateFavoriteThunk(String(template.id)));
    setStarring(false);
  };

  return (
    <>
      <div
        className={[
          "tcard",
          `tcard--${template.status.toLowerCase()}`,
          isApproved ? "tcard--clickable" : "",
          isFavorite ? "tcard--favorite"  : "",
        ].join(" ").trim()}
        onClick={() => { if (isApproved) setShowPreview(true); }}
        title={isApproved ? "Click to preview" : undefined}
      >
        {/* Header row: name + star + badge */}
        <div className="tcard-header">
          <div className="tcard-name" title={template.name}>
            {template.name}
          </div>
          <div className="tcard-header-right">
            <button
              className={[
                "tcard-star",
                isFavorite ? "tcard-star--active"  : "",
                starring   ? "tcard-star--spinning" : "",
              ].join(" ").trim()}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              disabled={starring}
              onClick={handleStar}
            >
              {isFavorite ? "⭐" : "☆"}
            </button>
            <Badge variant={STATUS_BADGE[template.status] ?? "secondary"} pill>
              {template.status}
            </Badge>
          </div>
        </div>

        {/* Category + Language pills */}
        <div className="tcard-badges">
          <span
            className="tcard-badge tcard-badge--category"
            style={{
              color:       CATEGORY_COLOR[template.category] ?? "#6b7280",
              borderColor: (CATEGORY_COLOR[template.category] ?? "#e5e7eb") + "40",
              background:  (CATEGORY_COLOR[template.category] ?? "#6b7280") + "10",
            }}
          >
            {template.category}
          </span>
          <span className="tcard-badge">
            {(template.language ?? "").toUpperCase()}
          </span>
        </div>

        {/* Body preview */}
        <div className="tcard-body">
          {(template.body_text ?? template.bodyText ?? "").slice(0, 100)}
          {(template.body_text ?? template.bodyText ?? "").length > 100 ? "..." : ""}
        </div>

        {/* Rejection reason */}
        {isRejected && (
          <div className="tcard-rejection">
            <span className="tcard-rejection-label">❌ Rejected by Meta</span>
            <span className="tcard-rejection-reason">
              {rejectionReason ?? "Click Sync to get rejection reason"}
            </span>
          </div>
        )}

        {/* Pending hint */}
        {template.status === "PENDING" && (
          <div className="tcard-pending-hint">
            ⏳ Awaiting Meta review — usually minutes to hours
          </div>
        )}

        {/* Footer: date + actions */}
        <div className="tcard-footer">
          <span className="tcard-date">
            {(template.created_at ?? template.createdAt)
              ? new Date((template.created_at ?? template.createdAt)!).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })
              : "—"}
          </span>
          <div className="tcard-actions">
            <Button
              variant="outline-secondary"
              size="sm"
              loading={syncLoading}
              disabled={syncLoading || deleteLoading}
              title="Sync status from Meta"
              onClick={(e) => { e?.stopPropagation(); onSync(String(template.id)); }}
            >
              ↻ Sync
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              loading={deleteLoading}
              disabled={syncLoading || deleteLoading}
              title="Delete template"
              onClick={(e) => { e?.stopPropagation(); onDelete(String(template.id)); }}
            >
              🗑 Delete
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