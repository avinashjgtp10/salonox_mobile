import { ChevronLeft } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

interface Props {
  onClose: () => void;
}

// Each ticketed section gets its own permKey (Suppliers -> view_suppliers,
// Orders -> view_orders); everything else still shares manage_inventory
// until it gets the same treatment. A plain NavLink for an unticketed
// section meant clicking one without manage_inventory silently redirected
// all the way to Dashboard instead of dimming + showing the popup like
// every other gated action in the app — this list makes every tab
// consistent regardless of which permission (or shared fallback) gates it.
const TABS: { to: string; label: string; permKey: string }[] = [
  { to: "/dashboard/inventory/suppliers",   label: "Suppliers",             permKey: "view_suppliers" },
  { to: "/dashboard/inventory/orders",      label: "Orders",                permKey: "view_orders" },
  { to: "/dashboard/inventory/products",    label: "Product Inventory",     permKey: "manage_inventory" },
  { to: "/dashboard/inventory/consumables", label: "Consumable Inventory",  permKey: "manage_inventory" },
  { to: "/dashboard/inventory/audit",       label: "Product Audit",         permKey: "manage_inventory" },
  { to: "/dashboard/inventory/ledger",      label: "Stock Ledger",          permKey: "manage_inventory" },
];

export default function InventorySubSidebar({ onClose }: Props) {
  const { can } = usePermissions();
  const dispatch = useAppDispatch();

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
        {TABS.map((tab) =>
          can(tab.permKey) ? (
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
              onClick={() => denyPerm(tab.permKey)}
            >
              {tab.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
