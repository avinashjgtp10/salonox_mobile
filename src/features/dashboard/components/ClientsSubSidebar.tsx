import { NavLink } from "react-router-dom"
import { ChevronLeft } from "react-bootstrap-icons"

interface Props {
  onClose: () => void
}

export default function ClientsSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
        <h3>Clients</h3>
        <button className="close-btn" onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <NavLink
        to="/dashboard/clients/list"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Clients list
      </NavLink>

      <NavLink
        to="/dashboard/clients/loyalty"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Client loyalty
      </NavLink>

    </div>
  )
}