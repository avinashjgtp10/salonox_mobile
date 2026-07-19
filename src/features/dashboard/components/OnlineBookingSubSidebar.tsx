import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  Globe2,
  Google,
  Facebook,
  Link45deg,
} from "react-bootstrap-icons";

interface Props {
  onClose: () => void;
}

const links = [
  {
    to: "/dashboard/online-booking/marketplace",
    icon: <Globe2 size={15} />,
    label: "Marketplace profile",
    desc: "Your public salon listing",
  },
  {
    to: "/dashboard/online-booking/google",
    icon: <Google size={15} />,
    label: "Reserve with Google",
    desc: "Book button on Search & Maps",
  },
  {
    to: "/dashboard/online-booking/social",
    icon: <Facebook size={15} />,
    label: "Facebook & Instagram",
    desc: "Social media booking buttons",
  },
  {
    to: "/dashboard/online-booking/links",
    icon: <Link45deg size={15} />,
    label: "Link builder",
    desc: "Custom booking links & QR codes",
  },
];

export default function OnlineBookingSubSidebar({ onClose }: Props) {
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

        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
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
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: "#111827" }}>
                {link.label}
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: "#9ca3af", lineHeight: 1.3 }}>
                {link.desc}
              </span>
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
