import { ChevronLeft } from "react-bootstrap-icons"
import { NavLink } from "react-router-dom"

interface Props {
  onClose: () => void
}

export default function TeamSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
        <h3>Team</h3>

        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <NavLink
        to="/dashboard/team/members"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Team members
      </NavLink>

      <NavLink
        to="/dashboard/team/shifts"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Scheduled shifts
      </NavLink>

      <NavLink
        to="/dashboard/team/timesheets"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Timesheets
      </NavLink>

      <NavLink
        to="/dashboard/team/payruns"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Pay runs
      </NavLink>

    </div>
  )
}