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
      >
        Service menu
      </NavLink>

      <NavLink
        to="/dashboard/catalog/products"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Products
      </NavLink>

      <NavLink
        to="/dashboard/catalog/packages"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Packages
      </NavLink>

      <NavLink
        to="/dashboard/catalog/memberships"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Memberships
      </NavLink>
      <hr className="sub-divider" />

      <div className="sub-category">Inventory</div>
      <NavLink
        to="/dashboard/catalog/inventory/stocktakes"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Stocktakes
      </NavLink>
      <NavLink
        to="/dashboard/catalog/inventory/stock-orders"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Stock orders
      </NavLink>
      <NavLink
        to="/dashboard/catalog/inventory/suppliers"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
      >
        Suppliers
      </NavLink>
    </div>
  );
}
