import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";
import { usePlanFeatures } from "../../../hooks/usePlanFeatures";

interface Props {
  onClose: () => void;
}

export default function CatalogSubSidebar({ onClose }: Props) {
  const { hasFeature } = usePlanFeatures();

  return (
    <div className="sub-sidebar sub-sidebar--catalog">
      <div className="sub-header">
        <h3>Catalog</h3>

        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        {hasFeature("services") && (
          <NavLink
            to="/dashboard/catalog/services"
            className={({ isActive }) =>
              isActive ? "sub-link active" : "sub-link"
            }
          >
            Service menu
          </NavLink>
        )}

        {hasFeature("services") && (
          <NavLink
            to="/dashboard/catalog/digital-menu"
            className={({ isActive }) =>
              isActive ? "sub-link active" : "sub-link"
            }
          >
            Digital Menu
          </NavLink>
        )}

        {hasFeature("products") && (
          <NavLink
            to="/dashboard/catalog/products"
            className={({ isActive }) =>
              isActive ? "sub-link active" : "sub-link"
            }
          >
            Products
          </NavLink>
        )}

        {hasFeature("packages") && (
          <NavLink
            to="/dashboard/catalog/packages"
            className={({ isActive }) =>
              isActive ? "sub-link active" : "sub-link"
            }
          >
            Packages
          </NavLink>
        )}

        {hasFeature("memberships") && (
          <NavLink
            to="/dashboard/catalog/memberships"
            className={({ isActive }) =>
              isActive ? "sub-link active" : "sub-link"
            }
          >
            Memberships
          </NavLink>
        )}
      </div>
    </div>
  );
}
