import { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Building2,
  Download,
  ArrowUpRight,
  Users,
  Calendar,
  MessageCircle,
  BarChart2,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchBillingPlansThunk,
  fetchSubscriptionThunk,
  fetchInvoicesThunk,
  cancelSubscriptionThunk,
} from "../../../middleware/billing/billing.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { fetchDashboardAll } from "../../../middleware/dashboard/dashboard.thunk";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";

const planIcons: Record<string, React.ReactNode> = {
  starter:    <Zap size={16} color="#6b7280" />,
  growth:     <Sparkles size={16} color="#111827" />,
  enterprise: <Building2 size={16} color="#374151" />,
};

export default function BillingPage() {
  const dispatch = useAppDispatch();
  const { plans, subscription, invoices, loading } = useAppSelector((s) => s.billing);
  const { currentSalon } = useAppSelector((s) => s.salon);
  const { items: staffList } = useAppSelector((s) => s.staff);
  const dashSummary = useAppSelector((s) => s.dashboard.data?.summary);

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchBillingPlansThunk());
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  useEffect(() => {
    if (currentSalon?.id) {
      dispatch(fetchDashboardAll({ salonId: currentSalon.id }));
    }
  }, [dispatch, currentSalon?.id]);

  const usageData = useMemo(() => [
    { label: "Staff Members",           used: staffList.length,                         limit: 10,   icon: <Users size={15} /> },
    { label: "Appointments this month", used: dashSummary?.totalAppointments ?? 0,      limit: 999,  icon: <Calendar size={15} /> },
    { label: "WhatsApp messages sent",  used: 0,                                         limit: 5000, icon: <MessageCircle size={15} />, estimate: true },
    { label: "Analytics reports",       used: 0,                                         limit: 50,   icon: <BarChart2 size={15} />,    estimate: true },
  ], [staffList.length, dashSummary?.totalAppointments]);

  useEffect(() => {
    if (currentSalon?.id) {
      dispatch(fetchSubscriptionThunk(currentSalon.id));
      dispatch(fetchInvoicesThunk(currentSalon.id));
    }
  }, [dispatch, currentSalon?.id]);

  const currentPlanId = subscription?.plan_id ?? null;
  const activePlan = plans.find((p) => p.id === currentPlanId);

  const handleCancelPlan = async () => {
    if (!subscription?.id) return;
    setCancelLoading(true);
    const result = await dispatch(cancelSubscriptionThunk({ id: subscription.id }));
    setCancelLoading(false);
    if (cancelSubscriptionThunk.fulfilled.match(result)) {
      toast.success("Subscription cancelled");
    } else {
      toast.error((result.payload as string) || "Failed to cancel subscription");
    }
  };

  const yearlyDiscount = 0.2;
  const displayPrice = (price: string) => {
    const num = parseFloat(price);
    return billingCycle === "yearly"
      ? Math.round(num * 12 * (1 - yearlyDiscount))
      : num;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active:   "s-badge-success",
      trialing: "s-badge-info",
      past_due: "s-badge-warning",
      cancelled:"s-badge-gray",
      inactive: "s-badge-gray",
    };
    return <span className={`s-badge ${map[status] ?? "s-badge-gray"}`}>{status}</span>;
  };

  const invoiceStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid:  "s-badge-success",
      open:  "s-badge-warning",
      draft: "s-badge-gray",
      void:  "s-badge-danger",
    };
    return <span className={`s-badge ${map[status] ?? "s-badge-gray"}`}>{status}</span>;
  };

  const billingCycleToggle = (
    <div className="settings-billing-cycle">
      {(["monthly", "yearly"] as const).map((cycle) => (
        <button
          key={cycle}
          onClick={() => setBillingCycle(cycle)}
          className={`settings-billing-cycle-btn${billingCycle === cycle ? " active" : ""}`}
        >
          {cycle === "yearly" ? "Yearly (–20%)" : "Monthly"}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Billing & Plans</h2>
        <p className="settings-page-subtitle">
          Manage your subscription, view usage, and download invoices.
        </p>
      </div>

      {/* Current Plan Banner */}
      {loading.subscription ? (
        <div className="settings-section">
          <div className="settings-section-body" style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
            Loading subscription…
          </div>
        </div>
      ) : subscription ? (
        <div className="settings-billing-plan mb-4">
          <p className="settings-billing-plan-label">Current Plan</p>
          <p className="settings-billing-plan-name">
            {activePlan?.name ?? "Plan"} &nbsp;
            {statusBadge(subscription.status)}
          </p>
          <p className="settings-billing-plan-price">
            ₹{parseFloat(subscription.total_amount).toLocaleString()} / month
            &nbsp;·&nbsp; Renews{" "}
            {new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
          {subscription.card_last4 && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 4 }}>
              {subscription.card_brand ?? "Card"} ending ···· {subscription.card_last4}
              &nbsp;·&nbsp; Expires {subscription.card_expiry}
            </p>
          )}
          <div className="settings-billing-plan-actions">
            <Button
              size="sm"
              variant="outline-light"
              loading={cancelLoading}
              onClick={handleCancelPlan}
              disabled={subscription.status === "cancelled"}
            >
              {subscription.status === "cancelled" ? "Cancelled" : "Cancel plan"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="settings-billing-plan mb-4" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <p className="settings-billing-plan-label" style={{ color: "#6b7280" }}>No Active Plan</p>
          <p className="settings-billing-plan-name" style={{ color: "#111827" }}>Free tier</p>
          <p className="settings-billing-plan-price" style={{ color: "#6b7280" }}>
            Choose a plan below to unlock all features
          </p>
        </div>
      )}

      {/* Usage */}
      <SettingsSection title="Current Usage" desc="Monthly usage — live data where available.">
        {usageData.map((item) => {
          const pct = Math.min((item.used / item.limit) * 100, 100);
          const isWarn = pct >= 80;
          const isDanger = pct >= 95;
          return (
            <div key={item.label} className="settings-usage-row">
              <div className="settings-usage-icon-wrap">
                <div className="settings-usage-icon">{item.icon}</div>
                <span className="settings-usage-label">
                  {item.label}
                  {(item as any).estimate && (
                    <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>
                      (not tracked yet)
                    </span>
                  )}
                </span>
              </div>
              <div className="settings-usage-bar-wrap">
                <div
                  className={`settings-usage-bar ${isDanger ? "danger" : isWarn ? "warn" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="settings-usage-count">
                {(item as any).estimate ? "— " : item.used.toLocaleString() + " "}/ {item.limit.toLocaleString()}
              </span>
            </div>
          );
        })}
      </SettingsSection>

      {/* Plans */}
      <SettingsSection
        title="Available Plans"
        desc="Upgrade or downgrade at any time."
        headerAction={billingCycleToggle}
      >
        {loading.plans ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading plans…</p>
        ) : (
          <div className="settings-plans-grid">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const price = displayPrice(plan.price_per_unit);
              return (
                <div
                  key={plan.id}
                  className={`settings-plan-card${isCurrent ? " current" : ""}`}
                >
                  <div className="settings-plan-header">
                    <div className="settings-plan-name-row">
                      {planIcons[plan.name.toLowerCase()] ?? <Zap size={16} />}
                      <span className="settings-plan-name">{plan.name}</span>
                    </div>
                    <p className="settings-plan-price">
                      ₹{price.toLocaleString()}
                      <span> /{billingCycle === "yearly" ? "year" : "mo"}</span>
                    </p>
                    {plan.description && (
                      <p className="settings-plan-desc">{plan.description}</p>
                    )}
                  </div>

                  {plan.features && (
                    <ul className="settings-plan-features">
                      {Object.entries(plan.features)
                        .filter(([, v]) => v)
                        .map(([k]) => (
                          <li key={k} className="settings-plan-feature-item">
                            <CheckCircle2 size={13} color="#10b981" strokeWidth={2.5} />
                            {k.replace(/_/g, " ")}
                          </li>
                        ))}
                    </ul>
                  )}

                  <Button
                    fullWidth
                    size="sm"
                    variant={isCurrent ? "outline-secondary" : "primary"}
                    disabled={isCurrent}
                    onClick={() =>
                      toast(`Upgrade to ${plan.name} coming soon`, { icon: "💳" })
                    }
                  >
                    {isCurrent ? "Current plan" : "Upgrade"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      {/* Payment Method */}
      {subscription?.card_last4 && (
        <SettingsSection
          title="Payment Method"
          desc="Card used for recurring billing."
          headerAction={
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => toast("Update card coming soon", { icon: "💳" })}
            >
              Update card
            </Button>
          }
        >
          <div className="settings-payment-card">
            <CreditCard size={22} color="#374151" />
            <div>
              <p className="settings-payment-card-num">
                •••• •••• •••• {subscription.card_last4}
              </p>
              <p className="settings-payment-card-meta">
                {subscription.card_brand ?? "Card"} &nbsp;·&nbsp; Expires {subscription.card_expiry}
              </p>
            </div>
            <span className="s-badge s-badge-success ms-auto">Default</span>
          </div>
        </SettingsSection>
      )}

      {/* Billing History */}
      <SettingsSection
        title="Billing History"
        desc="Download past invoices for your records."
        noPadding
      >
        {loading.invoices ? (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>No invoices yet.</p>
        ) : (
          <table className="settings-billing-table">
            <thead className="settings-billing-head">
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="settings-billing-row">
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{inv.invoice_number}</td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>
                    {new Date(inv.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    ₹{parseFloat(inv.total_amount).toLocaleString()}
                  </td>
                  <td>{invoiceStatusBadge(inv.status)}</td>
                  <td>
                    <button
                      className="settings-billing-dl-btn"
                      onClick={() => toast("Invoice PDF coming soon", { icon: "📄" })}
                    >
                      <Download size={13} />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SettingsSection>

      {/* Need more? */}
      <div className="settings-billing-cta">
        <div>
          <p className="settings-billing-cta-title">Need a custom plan?</p>
          <p className="settings-billing-cta-sub">
            Contact our sales team for volume pricing, multi-location setups, or
            custom integrations.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline-secondary"
          iconRight={<ArrowUpRight size={14} />}
          onClick={() => toast("Contact sales coming soon", { icon: "📞" })}
        >
          Contact sales
        </Button>
      </div>
    </>
  );
}
