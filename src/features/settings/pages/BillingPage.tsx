import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2, Zap, Building2, Download,
  ArrowUpRight, Users, Calendar, MessageCircle, BarChart2, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../services/api/axios";
import { SALON_PLANS } from "../../../services/api/endpoints";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSubscriptionThunk,
  fetchInvoicesThunk,
  verifySubscriptionThunk,
  setSubscriptionExpired,
  createSubscriptionThunk,
} from "../../../store/billingSlice";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import { getSubscriptionPermissions } from "../utils/subscriptionPermissions";
import Button from "../../../components/ui/Button";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import SettingsSection from "../components/SettingsSection";

const planIcons: Record<string, React.ReactNode> = {
  basic:   <Zap size={16} color="#6b7280" />,
  advance: <Sparkles size={16} color="#111827" />,
  pro:     <Building2 size={16} color="#374151" />,
};

// The salon's actual Basic/Advance/Pro assignment — from
// /salon-plans/my-plan (modules/salon-plans on the backend), NOT the
// separate Razorpay billing_plans/billing_subscriptions system
// (billingSlice's `plans`/`subscription`), which has no relationship to
// what super admin configures in Plans & Subscriptions → Salon
// Customization. Billing History below still reads the Razorpay invoices —
// that catalog swap wasn't part of this change.
interface MyPlanCatalogEntry {
  tier: "basic" | "advance" | "pro";
  name: string;
  tagline: string | null;
  price: string;
  features: string[];
  // subscription_plans.id (modules/subscriptions — the module with actual
  // working Razorpay checkout), set once a super admin runs "sync to
  // Razorpay" for that tier. null = no live checkout yet for this plan.
  linked_subscription_plan_id: string | null;
}
interface MyPlanResponse {
  base_tier: "basic" | "advance" | "pro";
  effective_price: string | null;
  is_customized: boolean;
  start_date: string;
  expiry_date: string | null;
  catalog: MyPlanCatalogEntry[];
}

export default function BillingPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { invoices, loading } = useAppSelector((s) => s.billing);
  const { currentSalon } = useAppSelector((s) => s.salon);
  const { items: staffList } = useAppSelector((s) => s.staff);
  const settingItems = useAppSelector((s: any) => s.setting.items);
  useEffect(() => { dispatch(fetchSettingsThunk()); }, [dispatch]);
  // UI-only — hides/disables actions the account can't use so it doesn't show
  // a button that will 403. The actual enforcement is server-side, in
  // requireSubscriptionPermission() (subscriptionPermission.middleware.ts).
  const subPerms = useMemo(() => getSubscriptionPermissions(settingItems), [settingItems]);

  const [verifying, setVerifying] = useState(false);
  const [payingTier, setPayingTier] = useState<string | null>(null);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // The salon's real Basic/Advance/Pro assignment — see MyPlanResponse
  // comment above for why this replaces billingSlice's `plans` for display.
  const [myPlan, setMyPlan] = useState<MyPlanResponse | null>(null);
  const [myPlanLoading, setMyPlanLoading] = useState(true);
  useEffect(() => {
    api.get(SALON_PLANS.MY_PLAN)
      .then((res) => setMyPlan(res.data?.data ?? null))
      .catch(() => setMyPlan(null))
      .finally(() => setMyPlanLoading(false));
  }, []);

  // ── Detect redirect back from Razorpay after payment ─────────────────────
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success" && currentSalon?.id) {
      setVerifying(true);
      toast.loading("Verifying payment...", { id: "verify" });

      // Razorpay appends these query params on redirect — pass them to the backend
      dispatch(verifySubscriptionThunk({
        salonId: currentSalon.id,
        razorpay_payment_id: searchParams.get("razorpay_payment_id"),
        razorpay_subscription_id: searchParams.get("razorpay_subscription_id"),
        razorpay_signature: searchParams.get("razorpay_signature"),
      }))
        .then((result) => {
          if (verifySubscriptionThunk.fulfilled.match(result) && result.payload.status === "active") {
            dispatch(setSubscriptionExpired(false));
            dispatch(fetchSubscriptionThunk(currentSalon.id));
            dispatch(fetchInvoicesThunk(currentSalon.id));
            toast.dismiss("verify");
            showSuccess("🎉 Subscription activated!");
          } else {
            toast.dismiss("verify");
            const status = verifySubscriptionThunk.fulfilled.match(result) ? result.payload.status : undefined;
            showError(status ? `Payment received but status is: ${status}. Contact support.` : "Could not verify payment. Please contact support.");
          }
        })
        .finally(() => {
          setVerifying(false);
          // Remove ?payment=success from URL
          searchParams.delete("payment");
          setSearchParams(searchParams);
        });
    }
  }, [currentSalon?.id]);

  useEffect(() => {
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  useEffect(() => {
    if (currentSalon?.id && subPerms.view_subscription) {
      dispatch(fetchSubscriptionThunk(currentSalon.id));
    }
    if (currentSalon?.id && subPerms.view_billing_history) {
      dispatch(fetchInvoicesThunk(currentSalon.id));
    }
  }, [dispatch, currentSalon?.id, subPerms.view_subscription, subPerms.view_billing_history]);

  const usageData = useMemo(() => [
    { label: "Staff Members",           used: staffList.length, limit: 10,   icon: <Users size={15} /> },
    { label: "Appointments this month", used: 0,                limit: 999,  icon: <Calendar size={15} />, estimate: true },
    { label: "WhatsApp messages sent",  used: 0,                limit: 5000, icon: <MessageCircle size={15} />, estimate: true },
    { label: "Analytics reports",       used: 0,                limit: 50,   icon: <BarChart2 size={15} />,    estimate: true },
  ], [staffList.length]);

  // Days remaining until myPlan.expiry_date (the real Basic/Advance/Pro
  // assignment's own expiry, not Razorpay's current_period_end), floor-
  // rounded so "30 days or less" reads naturally. null when there's no
  // expiry date set (open-ended plan) — callers treat null as "don't show
  // the warning".
  const daysUntilExpiry = useMemo(() => {
    if (!myPlan?.expiry_date) return null;
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((new Date(myPlan.expiry_date).getTime() - Date.now()) / msPerDay);
  }, [myPlan?.expiry_date]);

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

  // Same flow as SubscriptionWall.tsx's handlePayAndContinue — see that
  // component's comment for why linked_subscription_plan_id (not the tier
  // itself) is what gets passed as plan_id.
  const handlePayAndContinue = async (plan: MyPlanCatalogEntry) => {
    if (!plan.linked_subscription_plan_id || !currentSalon?.id) return;
    setPayingTier(plan.tier);
    try {
      const result = await dispatch(createSubscriptionThunk({
        plan_id: plan.linked_subscription_plan_id,
        salon_id: currentSalon.id,
        total_count: 1,
      }));
      if (!createSubscriptionThunk.fulfilled.match(result)) {
        showError((result.payload as string) || "Failed to initiate payment");
        return;
      }
      const { short_url } = result.payload;
      if (!short_url) {
        showError("Could not get payment link. Please try again.");
        return;
      }
      window.location.href = short_url;
    } finally {
      setPayingTier(null);
    }
  };

  const invoiceStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: "s-badge-success", open: "s-badge-warning",
      draft: "s-badge-gray", void: "s-badge-danger",
    };
    return <span className={`s-badge ${map[status] ?? "s-badge-gray"}`}>{status}</span>;
  };

  return (
    <>
      {overlay}
      {verifying && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
          padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#166534"
        }}>
          ⏳ Verifying your payment with Razorpay…
        </div>
      )}

      <div className="settings-page-header">
        <h2 className="settings-page-title">Billing & Plans</h2>
        <p className="settings-page-subtitle">
          Manage your subscription, view usage, and download invoices.
        </p>
      </div>

      {/* Current Plan — from /salon-plans/my-plan, the salon's real
          Basic/Advance/Pro assignment (see MyPlanResponse comment above). */}
      {!subPerms.view_subscription ? (
        <div className="settings-billing-plan mb-4" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <p className="settings-billing-plan-label" style={{ color: "#6b7280" }}>Subscription details unavailable</p>
          <p className="settings-billing-plan-price" style={{ color: "#6b7280" }}>
            Your account does not have permission to view subscription details. Contact support if you believe this is a mistake.
          </p>
        </div>
      ) : myPlanLoading ? (
        <div className="settings-section">
          <div className="settings-section-body" style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
            Loading subscription…
          </div>
        </div>
      ) : myPlan ? (
        <div className="settings-billing-plan mb-4">
          {isExpiringSoon && (
            <div style={{
              background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
              padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#92400e",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span aria-hidden="true">⚠️</span>
              <span>
                Your plan will expire soon. Please renew your plan to continue using all features without interruption.
                {" "}({daysUntilExpiry === 0 ? "expires today" : `${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} remaining`})
              </span>
            </div>
          )}
          <p className="settings-billing-plan-label">Current Plan</p>
          <p className="settings-billing-plan-name">
            {myPlan.catalog.find((p) => p.tier === myPlan.base_tier)?.name ?? myPlan.base_tier} &nbsp;
            {myPlan.is_customized && (
              <span className="s-badge s-badge-info">Special pricing</span>
            )}
          </p>
          <p className="settings-billing-plan-price">
            {/* Intentionally fixed to ₹ — this is our own SaaS subscription charge,
                regardless of the salon's own display currency (Settings →
                Configuration → Currency), which only governs how the salon
                prices its own clients. Do not swap for useCurrency(). */}
            {myPlan.effective_price !== null && `₹${parseFloat(myPlan.effective_price).toLocaleString()} / year`}
            {myPlan.expiry_date && (
              <>
                &nbsp;·&nbsp; Renews{" "}
                {new Date(myPlan.expiry_date).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="settings-billing-plan mb-4" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <p className="settings-billing-plan-label" style={{ color: "#6b7280" }}>No Active Plan</p>
          <p className="settings-billing-plan-name" style={{ color: "#111827" }}>Free tier</p>
          <p className="settings-billing-plan-price" style={{ color: "#6b7280" }}>
            Contact support to set up a plan
          </p>
        </div>
      )}

      {/* Usage */}
      <SettingsSection title="Current Usage" desc="Monthly usage — live data where available.">
        {usageData.map((item) => {
          const pct = Math.min((item.used / item.limit) * 100, 100);
          return (
            <div key={item.label} className="settings-usage-row">
              <div className="settings-usage-icon-wrap">
                <div className="settings-usage-icon">{item.icon}</div>
                <span className="settings-usage-label">
                  {item.label}
                  {(item as any).estimate && (
                    <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>(not tracked yet)</span>
                  )}
                </span>
              </div>
              <div className="settings-usage-bar-wrap">
                <div className="settings-usage-bar" style={{ width: `${pct}%` }} />
              </div>
              <span className="settings-usage-count">
                {(item as any).estimate ? "—" : item.used.toLocaleString()} / {item.limit.toLocaleString()}
              </span>
            </div>
          );
        })}
      </SettingsSection>

      {/* Plans — the same Basic/Advance/Pro catalog super admin manages in
          Plans & Subscriptions → Pricing Plans, not the separate Razorpay
          billing_plans catalog. Plan changes are admin-managed (Salon
          Customization tab), not self-serve Razorpay checkout, so this is
          read-only with a contact-support CTA rather than an upgrade button. */}
      <SettingsSection title="Available Plans" desc="Contact support to upgrade or change your plan.">
        {myPlanLoading ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading plans…</p>
        ) : !myPlan || myPlan.catalog.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>No plans available.</p>
        ) : (
          <div className="settings-plans-grid">
            {myPlan.catalog.map((plan) => {
              const isCurrent = plan.tier === myPlan.base_tier;
              return (
                <div key={plan.tier} className={`settings-plan-card${isCurrent ? " current" : ""}`}>
                  <div className="settings-plan-header">
                    <div className="settings-plan-name-row">
                      {planIcons[plan.tier] ?? <Zap size={16} />}
                      <span className="settings-plan-name">{plan.name}</span>
                    </div>
                    <p className="settings-plan-price">
                      ₹{parseFloat(plan.price).toLocaleString()}
                      <span> /yr</span>
                    </p>
                    {plan.tagline && (
                      <p className="settings-plan-desc">{plan.tagline}</p>
                    )}
                  </div>
                  {plan.features && plan.features.length > 0 && (
                    <ul className="settings-plan-features">
                      {plan.features.map((f) => (
                        <li key={f} className="settings-plan-feature-item">
                          <CheckCircle2 size={13} color="#10b981" strokeWidth={2.5} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isCurrent ? (
                    <Button fullWidth size="sm" variant="outline-secondary" disabled>
                      Current plan
                    </Button>
                  ) : plan.linked_subscription_plan_id ? (
                    <Button
                      fullWidth size="sm" variant="primary"
                      loading={payingTier === plan.tier}
                      disabled={payingTier === plan.tier}
                      onClick={() => handlePayAndContinue(plan)}
                    >
                      Pay & Continue
                    </Button>
                  ) : (
                    // Not synced to a real Razorpay plan yet — see
                    // MyPlanCatalogEntry comment above.
                    <Button
                      fullWidth size="sm" variant="outline-secondary"
                      onClick={() => { window.location.href = "mailto:support@salonox.com?subject=Plan%20Change%20Request"; }}
                    >
                      Contact support to switch
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      {/* Billing History */}
      <SettingsSection title="Billing History" desc="Download past invoices." noPadding>
        {!subPerms.view_billing_history ? (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>Your account does not have permission to view billing history.</p>
        ) : loading.invoices ? (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>Loading…</p>
        ) : invoices.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>No invoices yet.</p>
        ) : (
          <table className="settings-billing-table">
            <thead className="settings-billing-head">
              <tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="settings-billing-row">
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{inv.invoice_number}</td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>
                    {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{parseFloat(inv.total_amount).toLocaleString()}</td>
                  <td>{invoiceStatusBadge(inv.status)}</td>
                  <td>
                    <button className="settings-billing-dl-btn" onClick={() => { showError("Invoice PDF coming soon"); }}>
                      <Download size={13} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SettingsSection>

      <div className="settings-billing-cta">
        <div>
          <p className="settings-billing-cta-title">Need a custom plan?</p>
          <p className="settings-billing-cta-sub">Contact our sales team for volume pricing or custom integrations.</p>
        </div>
        <Button size="sm" variant="outline-secondary" iconRight={<ArrowUpRight size={14} />}
          onClick={() => {
            window.location.href = "mailto:support@salonox.com?subject=Custom%20Plan%20Inquiry";
          }}>
          Contact sales
        </Button>
      </div>
    </>
  );
}