import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import { fetchPlansThunk } from "../../../store/billingSlice";
import UpgradeButton from "./UpgradeButton";

// A condensed, scannable checklist replaces the old per-category bullet dump
// (8 headers x 4-8 sub-items each) — same coverage, one line per item instead
// of a wall of text.
const PLAN_HIGHLIGHTS: string[] = [
  "Booking & Calendar",
  "Billing & POS (GST-ready)",
  "Client Management & Loyalty",
  "Staff Management & Payroll",
  "Packages & Memberships",
  "Inventory Tracking",
  "Marketing & WhatsApp",
  "30+ Reports & Analytics",
  "Multi-user Access",
  "Real-time Notifications",
  "Multi-currency Support",
];

export default function SubscriptionWall() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.role);
  const { plans, loading } = useAppSelector((s) => ({ plans: s.billing.plans, loading: s.billing.loading.plans }));

  const isOwnerOrAdmin = role === "salon_owner" || role === "admin";

  // Same session-clearing pattern as DashboardLayout's handleLogout — clears
  // the persisted auth slice (tokens/role/salonId) and redirects to /login,
  // so a user stuck behind this wall can still leave without renewing.
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  useEffect(() => {
    if (isOwnerOrAdmin) dispatch(fetchPlansThunk());
  }, [isOwnerOrAdmin, dispatch]);

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.card, maxWidth: isOwnerOrAdmin ? "900px" : "460px" }}>
        <div style={styles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 style={styles.title}>Your subscription has ended</h1>

        <p style={styles.subtitle}>
          {isOwnerOrAdmin ? (
            <>
              Your SalonOx access has been paused.
              <br />
              Renew your plan to continue managing your salon seamlessly.
            </>
          ) : (
            "Your salon's subscription has expired. Please contact your salon owner to renew."
          )}
        </p>

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

        {isOwnerOrAdmin && (
          <div style={styles.plansWrap}>
            {loading ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>Loading plans…</p>
            ) : plans.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>No plans available. Contact support.</p>
            ) : (
              plans.map((plan, i) => (
                <div key={plan.id} style={styles.planCard}>
                  <div style={styles.planHeaderRow}>
                    <div style={styles.planHeaderLeft}>
                      <div style={styles.planIconChip}>👑</div>
                      <div>
                        <p style={styles.planName}>{plan.name}</p>
                        <p style={styles.planPrice}>
                          ₹{plan.price.toLocaleString()}
                          <span style={{ fontSize: 13, fontWeight: 400, color: "#9ca3af" }}>
                            {" "}/{({ monthly: "mo", yearly: "yr", weekly: "wk", daily: "day" } as Record<string, string>)[plan.billing_cycle] ?? "mo"}
                          </span>
                        </p>
                      </div>
                    </div>
                    {i === 0 && <span style={styles.popularBadge}>★ Most Popular</span>}
                  </div>

                  <div style={styles.highlightsGrid}>
                    {PLAN_HIGHLIGHTS.map((label) => (
                      <div key={label} style={styles.highlightItem}>
                        <span style={styles.highlightCheck} aria-hidden="true">✓</span>
                        {label}
                      </div>
                    ))}
                  </div>

                  <UpgradeButton plan={plan} />
                </div>
              ))
            )}

            <button
              style={styles.logoutBtn}
              onClick={handleLogout}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              Logout
            </button>
          </div>
        )}

        <p style={styles.help}>
          Need help?{" "}
          <button
            type="button"
            style={styles.linkBtn}
            // Same destination the landing page's own "Contact Us" footer
            // link navigates to (see Footer.tsx's handleContactUsClick) —
            // the book-demo section doubles as this app's contact/support
            // form, there is no separate support route. Opened in a new tab
            // rather than navigated in-place: this wall is a fixed overlay
            // rendered outside <Routes> (see App.tsx), so it stays mounted
            // over EVERY route — including "/" — for as long as the
            // subscription is expired, which would otherwise cover the
            // landing page right back up the instant it navigated there.
            onClick={() => window.open("/#book-demo", "_blank", "noopener,noreferrer")}
          >
            Contact support
          </button>
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
    background: "linear-gradient(180deg, #f5f3ff 0%, #ffffff 240px)",
    borderRadius: "20px", padding: "40px",
    width: "100%", textAlign: "center",
    boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "16px", transition: "max-width 0.3s ease",
  },
  iconWrap: {
    width: "72px", height: "72px", borderRadius: "50%",
    background: "#fef2f2", display: "flex",
    alignItems: "center", justifyContent: "center", marginBottom: "4px",
  },
  title: { fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3 },
  subtitle: { fontSize: "14px", color: "#6b7280", lineHeight: 1.6, margin: 0, maxWidth: "420px" },
  logoutBtn: {
    marginTop: "8px", background: "#fff", color: "#374151",
    border: "1px solid #d1d5db", borderRadius: "10px", padding: "14px 40px",
    fontSize: "15px", fontWeight: 600, cursor: "pointer",
    transition: "background 0.15s", width: "100%",
  },
  plansWrap: {
    display: "flex", flexDirection: "column", gap: "16px",
    width: "100%", marginTop: "8px",
  },
  planCard: {
    border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px",
    display: "flex", flexDirection: "column", gap: "20px", textAlign: "left",
    background: "#fff",
  },
  planHeaderRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: "12px",
  },
  planHeaderLeft: { display: "flex", alignItems: "center", gap: "12px" },
  planIconChip: {
    width: "44px", height: "44px", borderRadius: "10px",
    background: "#ede9fe", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: "20px",
  },
  planName: { fontWeight: 700, fontSize: "17px", color: "#111827", margin: 0 },
  planPrice: { fontSize: "22px", fontWeight: 800, color: "#111827", margin: "2px 0 0" },
  popularBadge: {
    background: "#7c3aed", color: "#fff", fontSize: "12px", fontWeight: 600,
    borderRadius: "999px", padding: "6px 14px", whiteSpace: "nowrap",
  },
  highlightsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "10px 18px", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb",
    padding: "18px 0",
  },
  highlightItem: {
    display: "flex", alignItems: "center", gap: "8px",
    fontSize: "13px", fontWeight: 500, color: "#374151",
  },
  highlightCheck: {
    flexShrink: 0, width: "18px", height: "18px", borderRadius: "50%",
    background: "#ecfdf5", color: "#059669", fontSize: "11px", fontWeight: 700,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  help: { fontSize: "13px", color: "#9ca3af", margin: 0 },
  linkBtn: {
    color: "#6b7280", textDecoration: "underline",
    background: "none", border: "none", padding: 0,
    font: "inherit", cursor: "pointer",
  },
};