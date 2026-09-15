// src/features/dashboard/components/ClientsSubSidebar.tsx
import { NavLink } from "react-router-dom";
import { ChevronLeft } from "react-bootstrap-icons";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

interface Props {
  onClose: () => void;
}

export default function ClientsSubSidebar({ onClose }: Props) {
  const { can } = usePermissions();
  const dispatch = useAppDispatch();

  // Each tab stays visible always — permission only controls whether it's
  // clickable. A disabled tab renders as a plain button (not a NavLink, so
  // it can never navigate) that pops the same global "Permission Required"
  // dialog every other blocked action in the app uses.
  const tabs: { to: string; label: string; permKey: string }[] = [
    { to: "/dashboard/clients/list",    label: "Clients list",       permKey: "view_clients" },
    { to: "/dashboard/clients/loyalty", label: "Referral & rewards", permKey: "view_referral_rewards" },
    { to: "/dashboard/clients/history", label: "Client history",     permKey: "view_client_history" },
  ];

  return (
    <div className="sub-sidebar sub-sidebar--clients">
      <div className="sub-header">
        <h3>Clients</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        {tabs.map((tab) =>
          can(tab.permKey) ? (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => isActive ? "sub-link active" : "sub-link"}
            >
              {tab.label}
            </NavLink>
          ) : (
            <button
              key={tab.to}
              type="button"
              className="sub-link"
              style={{ opacity: 0.5, cursor: "not-allowed", background: "none", border: "none", textAlign: "left" }}
              onClick={() => dispatch(showPermissionDenied(
                `Your account does not have the "${tab.permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
              ))}
            >
              {tab.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
