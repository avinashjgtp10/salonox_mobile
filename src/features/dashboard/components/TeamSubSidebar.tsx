import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";

interface Props {
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: "/dashboard/team/members",     label: "Staff Members" },
  { to: "/dashboard/team/shifts",      label: "Scheduled shifts" },
  { to: "/dashboard/team/commissions", label: "Commissions" },
  { to: "/dashboard/team/attendance",  label: "Attendance" },
  { to: "/dashboard/team/payroll",     label: "Payroll" },
  { to: "/dashboard/team/history",     label: "Staff History" },
];

export default function TeamSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar sub-sidebar--team">
      <div className="sub-header">
        <h3>Staff</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        {NAV_ITEMS.map(({ to, label }) => (
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
