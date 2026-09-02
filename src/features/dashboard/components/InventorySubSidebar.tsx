import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";

interface Props {
  onClose: () => void;
}

export default function InventorySubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar sub-sidebar--inventory">
      <div className="sub-header">
        <h3>Inventory Management</h3>

        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        <NavLink
          to="/dashboard/inventory/suppliers"
          className={({ isActive }) =>
            isActive ? "sub-link active" : "sub-link"
          }
        >
          Suppliers
        </NavLink>
        <NavLink
          to="/dashboard/inventory/orders"
          className={({ isActive }) =>
            isActive ? "sub-link active" : "sub-link"
          }
        >
          Orders
        </NavLink>
        <NavLink
          to="/dashboard/inventory/products"
          className={({ isActive }) =>
            isActive ? "sub-link active" : "sub-link"
          }
        >
          Product Inventory
        </NavLink>
        <NavLink
          to="/dashboard/inventory/consumables"
          className={({ isActive }) =>
            isActive ? "sub-link active" : "sub-link"
          }
        >
          Consumable Inventory
        </NavLink>
        <NavLink
          to="/dashboard/inventory/audit"
          className={({ isActive }) =>
            isActive ? "sub-link active" : "sub-link"
          }
        >
          Product Audit
        </NavLink>
        <NavLink
          to="/dashboard/inventory/ledger"
          className={({ isActive }) =>
            isActive ? "sub-link active" : "sub-link"
          }
        >
          Stock Ledger
        </NavLink>
      </div>
    </div>
  );
}
