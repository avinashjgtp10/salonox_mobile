import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";

interface Props {
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: "/dashboard/team/dashboard",    label: "Overview" },
  { to: "/dashboard/team/members",      label: "Team members" },
  { to: "/dashboard/team/performance",  label: "Performance" },

  { to: "/dashboard/team/shifts",       label: "Scheduled shifts" },
  { to: "/dashboard/team/payruns",      label: "Pay runs" },
];

export default function TeamSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">
      <div className="sub-header">
        <h3>Team</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

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
  );
}
