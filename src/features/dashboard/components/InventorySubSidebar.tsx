import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

interface Props {
  onClose: () => void;
}

// Orders/Product Inventory/Consumable Inventory/Product Audit/Stock Ledger
// don't have their own dedicated permissions yet (their routes all still
// share manage_inventory) — but a plain NavLink for them meant clicking one
// without manage_inventory silently redirected all the way to Dashboard
// instead of dimming + showing the popup like every other gated action in
// the app. Same manage_inventory the routes actually check, just also
// reflected here so the tab's look matches what clicking it will do.
const MANAGE_INVENTORY_TABS: { to: string; label: string }[] = [
  { to: "/dashboard/inventory/orders", label: "Orders" },
  { to: "/dashboard/inventory/products", label: "Product Inventory" },
  { to: "/dashboard/inventory/consumables", label: "Consumable Inventory" },
  { to: "/dashboard/inventory/audit", label: "Product Audit" },
  { to: "/dashboard/inventory/ledger", label: "Stock Ledger" },
];

export default function InventorySubSidebar({ onClose }: Props) {
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const canViewSuppliers = can("view_suppliers");
  const canManageInventory = can("manage_inventory");

  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  return (
    <div className="sub-sidebar sub-sidebar--inventory">
      <div className="sub-header">
        <h3>Warehouse</h3>

        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        {/* Suppliers has its own independent permission (see the Warehouse
            -> Suppliers ticket) — stays visible always, just disabled
            (click shows the popup) when the permission is off, instead of
            navigating. */}
        {canViewSuppliers ? (
          <NavLink
            to="/dashboard/inventory/suppliers"
            className={({ isActive }) =>
              isActive ? "sub-link active" : "sub-link"
            }
          >
            Suppliers
          </NavLink>
        ) : (
          <button
            type="button"
            className="sub-link"
            style={{ opacity: 0.5, cursor: "not-allowed", background: "none", border: "none", textAlign: "left" }}
            onClick={() => denyPerm("view_suppliers")}
          >
            Suppliers
          </button>
        )}

        {MANAGE_INVENTORY_TABS.map((tab) =>
          canManageInventory ? (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                isActive ? "sub-link active" : "sub-link"
              }
            >
              {tab.label}
            </NavLink>
          ) : (
            <button
              key={tab.to}
              type="button"
              className="sub-link"
              style={{ opacity: 0.5, cursor: "not-allowed", background: "none", border: "none", textAlign: "left" }}
              onClick={() => denyPerm("manage_inventory")}
            >
              {tab.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
