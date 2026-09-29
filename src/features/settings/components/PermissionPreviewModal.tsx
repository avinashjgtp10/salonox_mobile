import { CheckCircleFill, XCircleFill, LockFill } from "react-bootstrap-icons";
import Modal from "../../../components/ui/Modal";
import { usePlanFeatures } from "../../../hooks/usePlanFeatures";
import { canWith } from "../utils/permissionPreview";
import { SIDEBAR_PREVIEW_ITEMS } from "../data/sidebarPreviewItems";
import { navGroups as settingsNavGroups } from "./SettingsLayout";

interface Props {
  show: boolean;
  onClose: () => void;
  /** The Roles & Permissions editor's CURRENT in-memory permission map —
   *  including any unsaved changes. Never the last-saved baseline; the whole
   *  point of Preview is to reflect exactly what's on screen right now. */
  draft: Record<string, boolean>;
  /** "Manager"/"Staff" or a specific staff member's name — shown in the
   *  modal title so it's clear whose (draft) access this is. */
  subjectLabel: string;
}

// Structural preview only — shows which sidebar items and Settings sections
// would be visible/enabled for the CURRENT DRAFT permission state, without
// actually rendering/navigating the real app. Deliberately does not fetch
// live data or let the admin "use" the app as the role (see Permission audit
// ticket item 26's scoping discussion) — that would require threading a
// global permission override through every usePermissions() call site,
// which is a much larger, riskier change than this feature needs.
export default function PermissionPreviewModal({ show, onClose, draft, subjectLabel }: Props) {
  const { hasFeature } = usePlanFeatures();

  return (
    <Modal show={show} onClose={onClose} title={`Preview — ${subjectLabel}`} size="lg">
      <p className="text-muted small mb-3">
        This reflects the permission state currently shown below, including anything not yet saved.
        Nothing here is applied until you click Save.
      </p>

      <h6 className="fw-bold mb-2">Sidebar</h6>
      <div className="pp-preview-list mb-4">
        {SIDEBAR_PREVIEW_ITEMS.map((item) => {
          const featureOk = item.featureKeys.length === 0 || item.featureKeys.some((f) => hasFeature(f));
          const permOk = canWith(draft, item.permKey);
          if (!featureOk) return null; // plan tier hides it outright, same as the real sidebar
          return (
            <div key={item.label} className="pp-preview-row">
              {permOk ? (
                <CheckCircleFill size={14} className="text-success" />
              ) : (
                <XCircleFill size={14} className="text-danger" />
              )}
              <span className={permOk ? "" : "text-muted"}>{item.label}</span>
              {!permOk && <span className="pp-preview-badge">Disabled — shows "Permission Required"</span>}
            </div>
          );
        })}
      </div>

      <h6 className="fw-bold mb-2">Settings</h6>
      <div className="pp-preview-list">
        {settingsNavGroups.flatMap((g) => g.items).filter((item) => !item.hidden).map((item) => {
          const permOk = canWith(draft, item.permKey);
          return (
            <div key={item.id} className="pp-preview-row">
              {permOk ? (
                <CheckCircleFill size={14} className="text-success" />
              ) : item.alwaysOpen ? (
                <LockFill size={14} className="text-warning" />
              ) : (
                <XCircleFill size={14} className="text-danger" />
              )}
              <span className={permOk ? "" : "text-muted"}>{item.label}</span>
              {!permOk && (
                <span className="pp-preview-badge">
                  {item.alwaysOpen ? "Opens, but its actions stay disabled" : 'Disabled — shows "Access Denied"'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .pp-preview-list { display: flex; flex-direction: column; gap: 6px; }
        .pp-preview-row { display: flex; align-items: center; gap: 8px; font-size: 13.5px; padding: 4px 0; }
        .pp-preview-badge { margin-left: auto; font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 999px; padding: 1px 8px; }
      `}</style>
    </Modal>
  );
}
