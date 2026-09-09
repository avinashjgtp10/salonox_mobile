import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";
import { usePlanFeatures } from "../../../hooks/usePlanFeatures";

interface Props {
  onClose: () => void;
}

// featureKey undefined = core, ungated (matches Basic tier's own
// feature_keys — see Migration/add_feature_key_to_salon_plans.sql).
const NAV_ITEMS: { to: string; label: string; featureKey?: string }[] = [
  { to: "/dashboard/team/members",     label: "Staff Members", featureKey: "staff" },
  { to: "/dashboard/team/shifts",      label: "Scheduled shifts", featureKey: "staff" },
  { to: "/dashboard/team/commissions", label: "Tip & Commission", featureKey: "staff" },
  { to: "/dashboard/team/attendance",  label: "Attendance", featureKey: "staff" },
  { to: "/dashboard/team/payroll",     label: "Payroll", featureKey: "payroll" },
  { to: "/dashboard/team/history",     label: "Staff History", featureKey: "staff" },
];

export default function TeamSubSidebar({ onClose }: Props) {
  const { hasFeature } = usePlanFeatures();

  return (
    <div className="sub-sidebar sub-sidebar--team">
      <div className="sub-header">
        <h3>Staff</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        {NAV_ITEMS.filter((item) => !item.featureKey || hasFeature(item.featureKey)).map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? "sub-link active" : "sub-link")}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
