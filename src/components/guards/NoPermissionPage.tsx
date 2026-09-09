import { LockFill, SlashCircleFill } from "react-bootstrap-icons";
import "./NoPermissionPage.scss";

interface Props {
  /** The specific permission key that was missing, when known (shown in the
   *  message for a single blocked module). Omitted for the "no module
   *  access at all" case, which uses a generic message instead. */
  permKey?: string;
}

// Shown when a staff member has been redirected here because there's
// nowhere else to send them (PermissionGuard couldn't find any module they
// do have access to) — the one case where staff genuinely hit a dead end
// instead of landing on a page they can actually use.
export default function NoPermissionPage({ permKey }: Props) {
  return (
    <div className="no-perm-page">
      <div className="no-perm-card">
        <div className="no-perm-card__art">
          <div className="no-perm-card__blob" />
          <div className="no-perm-card__lock">
            <LockFill size={34} />
          </div>
          <div className="no-perm-card__badge">
            <SlashCircleFill size={20} />
          </div>
        </div>
        <h2 className="no-perm-card__title">Access Denied</h2>
        <p className="no-perm-card__sub">
          {permKey
            ? `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
            : "Your account doesn't have permission for any module yet. Ask your salon owner to enable at least one in Settings → Roles & Permissions."}
        </p>
        <span className="no-perm-card__code">403 Forbidden</span>
        <div className="no-perm-card__dots" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => <span key={i} />)}
        </div>
      </div>
    </div>
  );
}
