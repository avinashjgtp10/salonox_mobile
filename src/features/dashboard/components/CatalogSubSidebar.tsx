import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";

interface Props {
  onClose: () => void;
}

export default function CatalogSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">
      <div className="sub-header">
        <h3>Catalog</h3>

        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <NavLink
        to="/dashboard/catalog/services"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Service menu
      </NavLink>

      <NavLink
        to="/dashboard/catalog/memberships"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Memberships
      </NavLink>

      <NavLink
        to="/dashboard/catalog/products"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Products
      </NavLink>

      <NavLink
        to="/dashboard/catalog/packages"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Packages
      </NavLink>
      <hr className="sub-divider" />

      <div className="sub-category">Inventory</div>
      <NavLink
        to="/dashboard/catalog/inventory/stocktakes"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Stocktakes
      </NavLink>
      <NavLink
        to="/dashboard/catalog/inventory/stock-orders"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Stock orders
      </NavLink>
      <NavLink
        to="/dashboard/catalog/inventory/suppliers"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Suppliers
      </NavLink>
    </div>
  );
}
