import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";
import { usePlanFeatures } from "../../../hooks/usePlanFeatures";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

interface Props {
  onClose: () => void;
}

// featureKey undefined = core, ungated (matches Basic tier's own
// feature_keys — see Migration/add_feature_key_to_salon_plans.sql).
// permKey undefined = no permission gate (none currently need one).
// Staff History is the one deliberate exception in this whole app: its
// permKey is hidden entirely when denied (see the render below), not just
// disabled — per the Staff History ticket's explicit requirement.
const NAV_ITEMS: { to: string; label: string; featureKey?: string; permKey?: string; hideOnDeny?: boolean }[] = [
  { to: "/dashboard/team/members",     label: "Staff Members", featureKey: "staff", permKey: "view_team" },
  { to: "/dashboard/team/payroll",     label: "Payroll", featureKey: "payroll", permKey: "view_payroll" },
  { to: "/dashboard/team/shifts",      label: "Scheduled shifts", featureKey: "staff", permKey: "view_scheduled_shifts" },
  { to: "/dashboard/team/commissions", label: "Tip & Commission", featureKey: "staff", permKey: "view_team_commissions" },
  { to: "/dashboard/team/attendance",  label: "Attendance", featureKey: "staff", permKey: "view_attendance_list" },
  { to: "/dashboard/team/history",     label: "Staff History", featureKey: "staff", permKey: "view_staff_history", hideOnDeny: true },
];

export default function TeamSubSidebar({ onClose }: Props) {
  const { hasFeature } = usePlanFeatures();
  const { can } = usePermissions();
  const dispatch = useAppDispatch();

  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  return (
    <div className="sub-sidebar sub-sidebar--team">
      <div className="sub-header">
        <h3>Staff</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        {NAV_ITEMS.filter((item) => !item.featureKey || hasFeature(item.featureKey))
          .filter((item) => !(item.hideOnDeny && item.permKey && !can(item.permKey)))
          .map(({ to, label, permKey }) => {
            const allowed = !permKey || can(permKey);
            return allowed ? (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? "sub-link active" : "sub-link")}
              >
                {label}
              </NavLink>
            ) : (
              <button
                key={to}
                type="button"
                className="sub-link"
                style={{ opacity: 0.5, cursor: "not-allowed", background: "none", border: "none", textAlign: "left" }}
                onClick={() => denyPerm(permKey!)}
              >
                {label}
              </button>
            );
          })}
      </div>
    </div>
  );
}
