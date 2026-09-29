import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  Globe2,
  Google,
  Facebook,
  Link45deg,
  QrCode,
} from "react-bootstrap-icons";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

interface Props {
  onClose: () => void;
}

// Each channel has its own independent View toggle (Online Booking Channels
// ticket) — permKey drives the visible-but-disabled + denial-popup pattern
// used by every other gated sub-sidebar (see InventorySubSidebar.tsx).
const links = [
  {
    to: "/dashboard/online-booking/marketplace",
    icon: <Globe2 size={15} />,
    label: "Marketplace profile",
    desc: "Your public salon listing",
    permKey: "view_marketplace",
  },
  {
    to: "/dashboard/online-booking/google",
    icon: <Google size={15} />,
    label: "Reserve with Google",
    desc: "Book button on Search & Maps",
    comingSoon: true,
    permKey: "view_reserve_with_google",
  },
  {
    to: "/dashboard/online-booking/social",
    icon: <Facebook size={15} />,
    label: "Facebook & Instagram",
    desc: "Social media booking buttons",
    comingSoon: true,
    permKey: "view_social_bookings",
  },
  {
    to: "/dashboard/online-booking/links",
    icon: <Link45deg size={15} />,
    label: "Link builder",
    desc: "Custom booking links & QR codes",
    permKey: "view_link_builder",
  },
  {
    to: "/dashboard/online-booking/digital-menu",
    icon: <QrCode size={15} />,
    label: "Digital Menu",
    desc: "QR-code service menu for walk-ins",
    permKey: "view_digital_menu",
  },
];

export default function OnlineBookingSubSidebar({ onClose }: Props) {
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  return (
    <div className="sub-sidebar">
      <div className="sub-header">
        <h3>Online booking</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        <p className="sub-category">Channels</p>

        {links.map((link) => {
          const content = (
            <>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#374151",
                }}
              >
                {link.icon}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 500, color: "#111827" }}>
                  {link.label}
                  {link.comingSoon && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "#9ca3af", background: "#f3f4f6",
                      borderRadius: 999, padding: "1px 7px", letterSpacing: "0.03em" }}>
                      SOON
                    </span>
                  )}
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "#9ca3af", lineHeight: 1.3 }}>
                  {link.desc}
                </span>
              </span>
            </>
          );

          return can(link.permKey) ? (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              {content}
            </NavLink>
          ) : (
            <button
              key={link.to}
              type="button"
              className="sub-link"
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", textAlign: "left", opacity: 0.5, cursor: "not-allowed" }}
              onClick={() => denyPerm(link.permKey)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
