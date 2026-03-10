import { ChevronLeft } from "react-bootstrap-icons"
import { NavLink } from "react-router-dom"

interface Props {
  onClose: () => void
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
        to="/dashboard/catalog/services/categories"
        className={({ isActive }) =>
          isActive ? "sub-link active" : "sub-link"
        }
        onClick={onClose}
      >
        Categories
      </NavLink>

      <div className="sub-link">Memberships</div>
      <div className="sub-link">Products</div>
      <hr className="sub-divider" />

      <div className="sub-category">
        Inventory
      </div>
      <div className="sub-link">Stocktakes</div>
      <div className="sub-link">Stock orders</div>
      <div className="sub-link">Suppliers</div>

    </div>
  )
}