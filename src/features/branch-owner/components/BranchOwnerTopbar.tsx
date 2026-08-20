import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PersonCircle, BoxArrowRight, Bell } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import { fetchMySalonsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import salonoxLogo from "../../../assets/salonox_full_logo.png";

// Mirrors DashboardTopbar.tsx's structure/classes (.topbar/.topbar-left/
// .brand/.topbar-right/.topbar-profile-*) for visual parity with the main
// dashboard — the Active Branch switcher sits in topbar-left the same way
// SalonGroupSwitcher does on the main site's topbar.
export default function BranchOwnerTopbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth) as any;
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [activeBranchId, setActiveBranchId] = useState("");
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);
  useEffect(() => {
    if (!activeBranchId && salons.length > 0) setActiveBranchId(salons[0].id);
  }, [salons, activeBranchId]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const todayLabel = formatDateDDMMYYYY(now);
  const timeLabel = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    dispatch(logout());
    navigate("/login", { replace: true });
  }

  const name = user?.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "Branch Owner";
  const initials = (user?.first_name?.[0] ?? "B").toUpperCase() + (user?.last_name?.[0] ?? "").toUpperCase();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2 className="brand">
          <img src={salonoxLogo} alt="SalonOX" className="brand-logo" width="190" height="61" />
        </h2>

        {salons.length > 0 && (
          <select
            value={activeBranchId}
            onChange={(e) => setActiveBranchId(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 999, border: "1px solid #e5e7eb",
              background: "#f8fafc", fontSize: 13, fontWeight: 600, color: "#111827", cursor: "pointer",
            }}
          >
            {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <button
          type="button"
          onClick={() => setShowAllBranches((v) => !v)}
          style={{
            padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: showAllBranches ? "1px solid #6366f1" : "1px solid #e5e7eb",
            background: showAllBranches ? "#eef2ff" : "#f8fafc",
            color: showAllBranches ? "#6366f1" : "#111827",
          }}
          title="All Branches Overview"
        >
          All Branches Overview
        </button>
      </div>

      <div className="topbar-right">
        <span className="topbar-date" title="Today's date">{todayLabel}</span>
        <span className="topbar-time" title="Current time">{timeLabel}</span>

        <button className="topbar-icon-btn" title="Notifications" aria-label="Notifications">
          <Bell size={19} />
        </button>

        <div className="topbar-profile-wrap" ref={profileRef}>
          <button
            className={`topbar-profile-btn ${showProfile ? "topbar-profile-btn--active" : ""}`}
            onClick={() => setShowProfile((v) => !v)}
            aria-label="Profile menu"
            title="Profile"
          >
            <span className="topbar-profile-initials">{initials}</span>
          </button>

          {showProfile && (
            <div className="topbar-profile-dropdown" role="menu">
              <div className="topbar-profile-info">
                <div className="topbar-profile-info-av">
                  <span className="topbar-profile-initials topbar-profile-initials--lg">{initials}</span>
                </div>
                <div className="topbar-profile-info-text">
                  <p className="topbar-profile-name">{name}</p>
                  <p className="topbar-profile-email">Branch Owner</p>
                </div>
              </div>

              <div className="topbar-profile-divider" />

              <button className="topbar-profile-item" onClick={() => { setShowProfile(false); navigate("/branch-owner/settings"); }}>
                <PersonCircle size={15} /> Settings
              </button>

              <div className="topbar-profile-divider" />

              <button className="topbar-profile-item topbar-profile-item--danger" onClick={handleLogout}>
                <BoxArrowRight size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
