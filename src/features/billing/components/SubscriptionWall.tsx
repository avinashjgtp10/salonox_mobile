import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import { performLogout } from "../../../utils/performLogout";
import { createSubscriptionThunk } from "../../../store/billingSlice";
import api from "../../../services/api/axios";
import { SALON_PLANS } from "../../../services/api/endpoints";

// The real Basic/Advance/Growth catalog super admin manages in Plans &
// Subscriptions → Pricing Plans — same source as BillingPage.tsx's
// "Available Plans", NOT the old Razorpay billing_plans catalog this wall
// used to read via fetchPlansThunk (which only ever had one plan seeded,
// hence "show all three plans here").
//
// linked_subscription_plan_id points at a row in the DIFFERENT
// subscription_plans table (modules/subscriptions — the module with actual
// working Razorpay checkout) — set once a super admin runs "sync to
// Razorpay" for that tier (POST /salon-plans/definitions/:tier/sync-razorpay).
// null until then, in which case Pay & Continue is disabled with an
// explanatory message rather than attempting a checkout with nothing to
// charge against.
interface CatalogPlan {
  tier: "basic" | "advance" | "pro";
  name: string;
  tagline: string | null;
  price: string;
  features: string[];
  linked_subscription_plan_id: string | null;
}

export default function SubscriptionWall() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.role);
  const { currentSalon } = useAppSelector((s) => s.salon);

  const isOwnerOrAdmin = role === "salon_owner" || role === "admin";

  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [payingTier, setPayingTier] = useState<string | null>(null);

  // Same shared logout path every other Logout button uses — clears every
  // Redux slice + persisted storage and revokes the refresh token server-
  // side, so a user stuck behind this wall can still leave without renewing.
  const handleLogout = () => {
    performLogout(navigate);
  };

  useEffect(() => {
    if (!isOwnerOrAdmin) return;
    api.get(SALON_PLANS.DEFINITIONS)
      .then((res) => setPlans(res.data?.data ?? []))
      .catch((err) => {
        // Was previously swallowed silently ("No plans available" with no
        // indication of WHY) — this wall is shown to users who are, by
        // definition, in a broken/expired-access state, so a stale or
        // expired token here is a real scenario worth surfacing rather than
        // guessing at.
        setPlansError(
          err?.response?.status === 401
            ? "Your session has expired — please log out and log back in."
            : (err?.response?.data?.error?.message ?? "Failed to load plans.")
        );
        setPlans([]);
      })
      .finally(() => setLoading(false));
  }, [isOwnerOrAdmin]);

  // Same flow as UpgradeButton.tsx (the old billing_plans equivalent) — a
  // Razorpay subscription's hosted checkout page, reached via a redirect to
  // its short_url, not an inline widget. Yearly-only for this catalog (see
  // salon-plans.service.ts's syncToRazorpay: billing_cycle is fixed to
  // "yearly"), so total_count is always 1.
  const handlePayAndContinue = async (plan: CatalogPlan) => {
    if (!plan.linked_subscription_plan_id) return;
    if (!currentSalon?.id) {
      toast.error("No salon context found");
      return;
    }
    setPayingTier(plan.tier);
    try {
      const result = await dispatch(createSubscriptionThunk({
        plan_id: plan.linked_subscription_plan_id,
        salon_id: currentSalon.id,
        total_count: 1,
      }));
      if (!createSubscriptionThunk.fulfilled.match(result)) {
        toast.error((result.payload as string) || "Failed to initiate payment");
        return;
      }
      const { short_url } = result.payload;
      if (!short_url) {
        toast.error("Could not get payment link. Please try again.");
        return;
      }
      window.location.href = short_url;
    } finally {
      setPayingTier(null);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.card, maxWidth: isOwnerOrAdmin ? "1080px" : "460px" }}>
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
              Your SalonoX access has been paused.
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
            ) : plansError ? (
              <p style={{ color: "#dc2626", fontSize: 13 }}>{plansError}</p>
            ) : plans.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>No plans available. Contact support.</p>
            ) : (
              <div style={styles.plansRow}>
                {plans.map((plan) => (
                  <div key={plan.tier} style={styles.planCard}>
                    <div style={styles.planHeaderRow}>
                      <div style={styles.planHeaderLeft}>
                        <div style={styles.planIconChip}>👑</div>
                        <div>
                          <p style={styles.planName}>{plan.name}</p>
                          <p style={styles.planPrice}>
                            ₹{parseFloat(plan.price).toLocaleString()}
                            <span style={{ fontSize: 13, fontWeight: 400, color: "#9ca3af" }}> /yr</span>
                          </p>
                        </div>
                      </div>
                      {plan.tier === "advance" && <span style={styles.popularBadge}>★ Most Popular</span>}
                    </div>

                    {plan.tagline && (
                      <p style={{ margin: "-8px 0 0", fontSize: 13, color: "#6b7280" }}>{plan.tagline}</p>
                    )}

                    <div style={styles.highlightsGrid}>
                      {plan.features.map((label) => (
                        <div key={label} style={styles.highlightItem}>
                          <span style={styles.highlightCheck} aria-hidden="true">✓</span>
                          {label}
                        </div>
                      ))}
                    </div>

                    {plan.linked_subscription_plan_id ? (
                      <button
                        style={{ ...styles.upgradeBtn, opacity: payingTier === plan.tier ? 0.7 : 1 }}
                        disabled={payingTier === plan.tier}
                        onClick={() => handlePayAndContinue(plan)}
                      >
                        {payingTier === plan.tier ? "Redirecting to Razorpay…" : "Pay & Continue"}
                      </button>
                    ) : (
                      // Not synced to a real Razorpay plan yet (super admin
                      // hasn't run the sync action for this tier) — nothing
                      // to charge against, so fall back to contact-support
                      // instead of a checkout button that would 400.
                      <button
                        style={styles.upgradeBtn}
                        onClick={() => window.open(`/#book-demo`, "_blank", "noopener,noreferrer")}
                      >
                        Contact support to renew
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
  plansRow: {
    display: "flex", flexWrap: "wrap", gap: "16px",
    width: "100%", alignItems: "stretch",
  },
  planCard: {
    flex: "1 1 280px", minWidth: "260px",
    border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px",
    display: "flex", flexDirection: "column", gap: "20px", textAlign: "left",
    background: "#fff",
  },
  upgradeBtn: {
    background: "#7c3aed", color: "#fff", border: "none",
    borderRadius: "10px", padding: "14px 24px",
    fontSize: "14px", fontWeight: 700, cursor: "pointer",
    width: "100%",
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
    display: "flex", flexDirection: "column",
    gap: "10px", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb",
    padding: "18px 0", flex: 1,
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