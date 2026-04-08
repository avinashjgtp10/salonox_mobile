import { NavLink } from "react-router-dom";
import { ChevronLeft } from "react-bootstrap-icons";

interface Props {
  onClose: () => void;
}

export default function SalesSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">
      <div className="sub-header">
        <h3>Sales</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <NavLink
        to="/dashboard/sales/daily"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Daily sales summary
      </NavLink>

      <NavLink
        to="/dashboard/sales/appointments"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Appointments
      </NavLink>

      <NavLink
        to="/dashboard/sales"
        end
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Sales
      </NavLink>

      <NavLink
        to="/dashboard/sales/payments"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Payments
      </NavLink>

      <NavLink
        to="/dashboard/sales/gift-cards"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Gift cards sold
      </NavLink>

      <NavLink
        to="/dashboard/sales/memberships"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Memberships sold
      </NavLink>
    </div>
  );
}
