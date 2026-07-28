import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import logo from "../../../assets/logo.png";
import UpgradeButton from "./UpgradeButton";
import api from "../../../services/api/axios";
import type { SubscriptionPlan } from "../types/billing.types";

export default function SubscriptionWall() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.role);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showPlans, setShowPlans] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOwnerOrAdmin = role === "salon_owner" || role === "admin";

  // Same session-clearing pattern as DashboardLayout's handleLogout — clears
  // the persisted auth slice (tokens/role/salonId) and redirects to /login,
  // so a user stuck behind this wall can still leave without renewing.
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const loadPlans = () => {
    setLoading(true);
    api.get<{ success: boolean; data: SubscriptionPlan[] }>("/api/v1/subscriptions/plans")
      .then((res) => setPlans(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOwnerOrAdmin) loadPlans();
  }, [isOwnerOrAdmin]);

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.card, maxWidth: showPlans ? "720px" : "460px" }}>
        <img src={logo} alt="SalonOx" style={styles.logo} />

        <div style={styles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 style={styles.title}>Your subscription has ended</h1>

        <p style={styles.subtitle}>
          {isOwnerOrAdmin
            ? "Renew your plan to continue using SalonOx and restore access for your entire staff."
            : "Your salon's subscription has expired. Please contact your salon owner to renew."}
        </p>

        {isOwnerOrAdmin && !showPlans && (
          <div style={styles.actionsRow}>
            <button
              style={{ ...styles.btn, flex: 1, width: "auto" }}
              onClick={() => setShowPlans(true)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a2e")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#111827")}
            >
              Renew Now
            </button>
            <button
              style={{ ...styles.logoutBtn, flex: 1, width: "auto" }}
              onClick={handleLogout}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              Logout
            </button>
          </div>
        )}

        {!isOwnerOrAdmin && (
          <button
            style={styles.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Logout
          </button>
        )}

        {isOwnerOrAdmin && showPlans && (
          <div style={styles.plansWrap}>
            {loading ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Loading plans…</p>
            ) : plans.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>No plans available. Contact support.</p>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} style={styles.planCard}>
                  <p style={styles.planName}>{plan.name}</p>
                  <p style={styles.planPrice}>
                    ₹{plan.price.toLocaleString()}
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      {" "}{({ monthly: "/mo", yearly: "/yr", weekly: "/wk", daily: "/day" } as Record<string, string>)[plan.billing_cycle] ?? "/mo"}
                    </span>
                  </p>
                  {plan.features && (
                    <ul style={styles.featureList}>
                      {Object.entries(plan.features)
                        .filter(([, v]) => v)
                        .map(([k]) => (
                          <li key={k} style={styles.featureItem}>✓ {k.replace(/_/g, " ")}</li>
                        ))}
                    </ul>
                  )}
                  <UpgradeButton plan={plan} />
                </div>
              ))
            )}
          </div>
        )}

        {isOwnerOrAdmin && showPlans && (
          <button
            style={styles.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Logout
          </button>
        )}

        <p style={styles.help}>
          Need help?{" "}
          <a href="mailto:support@salonox.com" style={styles.link}>Contact support</a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 99999,
    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px", overflowY: "auto",
  },
  card: {
    background: "#fff", borderRadius: "20px", padding: "48px 40px",
    width: "100%", textAlign: "center",
    boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "16px", transition: "max-width 0.3s ease",
  },
  logo: { height: "36px", objectFit: "contain", marginBottom: "4px" },
  iconWrap: {
    width: "72px", height: "72px", borderRadius: "50%",
    background: "#fef2f2", display: "flex",
    alignItems: "center", justifyContent: "center", marginBottom: "4px",
  },
  title: { fontSize: "22px", fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3 },
  subtitle: { fontSize: "14px", color: "#6b7280", lineHeight: 1.6, margin: 0, maxWidth: "340px" },
  btn: {
    marginTop: "8px", background: "#111827", color: "#fff",
    border: "none", borderRadius: "10px", padding: "14px 40px",
    fontSize: "15px", fontWeight: 600, cursor: "pointer",
    transition: "background 0.15s", width: "100%",
  },
  actionsRow: {
    display: "flex", gap: "12px", width: "100%", marginTop: "8px",
  },
  logoutBtn: {
    marginTop: "8px", background: "#fff", color: "#374151",
    border: "1px solid #d1d5db", borderRadius: "10px", padding: "14px 40px",
    fontSize: "15px", fontWeight: 600, cursor: "pointer",
    transition: "background 0.15s", width: "100%",
  },
  plansWrap: {
    display: "flex", gap: "16px", flexWrap: "wrap",
    justifyContent: "center", width: "100%", marginTop: "8px",
  },
  planCard: {
    border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px",
    flex: "1 1 180px", minWidth: "160px", maxWidth: "220px",
    display: "flex", flexDirection: "column", gap: "8px", textAlign: "left",
  },
  planName: { fontWeight: 700, fontSize: "15px", color: "#111827", margin: 0 },
  planPrice: { fontSize: "20px", fontWeight: 800, color: "#111827", margin: 0 },
  featureList: {
    listStyle: "none", padding: 0, margin: "4px 0 8px",
    display: "flex", flexDirection: "column", gap: "4px", flex: 1,
  },
  featureItem: { fontSize: "12px", color: "#6b7280" },
  help: { fontSize: "13px", color: "#9ca3af", margin: 0 },
  link: { color: "#6b7280", textDecoration: "underline" },
};