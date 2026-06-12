import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2, Zap, Building2, Download,
  ArrowUpRight, Users, Calendar, MessageCircle, BarChart2, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchSubscriptionThunk,
  fetchInvoicesThunk,
  cancelSubscriptionThunk,
} from "../../../middleware/billing/billing.thunk";
import { setSubscriptionExpired } from "../../../store/billingSlice";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";
import UpgradeButton from "../../billing/components/UpgradeButton";
import api from "../../../services/api/axios";
import type { SubscriptionPlan } from "../../billing/types/billing.types";

const planIcons: Record<string, React.ReactNode> = {
  starter:    <Zap size={16} color="#6b7280" />,
  growth:     <Sparkles size={16} color="#111827" />,
  enterprise: <Building2 size={16} color="#374151" />,
};

export default function BillingPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, invoices, loading } = useAppSelector((s) => s.billing);
  const { currentSalon } = useAppSelector((s) => s.salon);
  const { items: staffList } = useAppSelector((s) => s.staff);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // ── Detect redirect back from Razorpay after payment ─────────────────────
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success" && currentSalon?.id) {
      setVerifying(true);
      toast.loading("Verifying payment...", { id: "verify" });

      api.post(`/api/v1/subscriptions/verify/${currentSalon.id}`)
        .then((res) => {
          const status = res.data?.data?.status;
          if (status === "active") {
            dispatch(setSubscriptionExpired(false));
            dispatch(fetchSubscriptionThunk(currentSalon.id));
            dispatch(fetchInvoicesThunk(currentSalon.id));
            toast.success("🎉 Subscription activated!", { id: "verify" });
          } else {
            toast.error(`Payment received but status is: ${status}. Contact support.`, { id: "verify" });
          }
        })
        .catch(() => {
          toast.error("Could not verify payment. Please contact support.", { id: "verify" });
        })
        .finally(() => {
          setVerifying(false);
          // Remove ?payment=success from URL
          searchParams.delete("payment");
          setSearchParams(searchParams);
        });
    }
  }, [currentSalon?.id]);

  // Fetch plans
  useEffect(() => {
    setPlansLoading(true);
    api.get<{ success: boolean; data: SubscriptionPlan[] }>("/api/v1/subscriptions/plans")
      .then((res) => setPlans(res.data.data))
      .catch(() => toast.error("Failed to load plans"))
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  useEffect(() => {
    if (currentSalon?.id) {
      dispatch(fetchSubscriptionThunk(currentSalon.id));
      dispatch(fetchInvoicesThunk(currentSalon.id));
    }
  }, [dispatch, currentSalon?.id]);

  const usageData = useMemo(() => [
    { label: "Staff Members",           used: staffList.length, limit: 10,   icon: <Users size={15} /> },
    { label: "Appointments this month", used: 0,                limit: 999,  icon: <Calendar size={15} />, estimate: true },
    { label: "WhatsApp messages sent",  used: 0,                limit: 5000, icon: <MessageCircle size={15} />, estimate: true },
    { label: "Analytics reports",       used: 0,                limit: 50,   icon: <BarChart2 size={15} />,    estimate: true },
  ], [staffList.length]);

  const currentPlanId = subscription?.plan_id ?? null;

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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "s-badge-success", trialing: "s-badge-info",
      past_due: "s-badge-warning", cancelled: "s-badge-gray", inactive: "s-badge-gray",
    };
    return <span className={`s-badge ${map[status] ?? "s-badge-gray"}`}>{status}</span>;
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

      {/* Current Plan */}
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
            {plans.find(p => p.id === currentPlanId)?.name ?? "Plan"} &nbsp;
            {statusBadge(subscription.status)}
          </p>
          <p className="settings-billing-plan-price">
            ₹{parseFloat(subscription.total_amount).toLocaleString()} / year
            &nbsp;·&nbsp; Renews{" "}
            {new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
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

      {/* Plans */}
      <SettingsSection title="Available Plans" desc="Upgrade at any time.">
        {plansLoading ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading plans…</p>
        ) : plans.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>No plans available.</p>
        ) : (
          <div className="settings-plans-grid">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              return (
                <div key={plan.id} className={`settings-plan-card${isCurrent ? " current" : ""}`}>
                  <div className="settings-plan-header">
                    <div className="settings-plan-name-row">
                      {planIcons[plan.name.toLowerCase()] ?? <Zap size={16} />}
                      <span className="settings-plan-name">{plan.name}</span>
                    </div>
                    <p className="settings-plan-price">
                      ₹{plan.price.toLocaleString()}
                      <span> /yr</span>
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
                  {isCurrent ? (
                    <Button fullWidth size="sm" variant="outline-secondary" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <UpgradeButton plan={plan} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      {/* Billing History */}
      <SettingsSection title="Billing History" desc="Download past invoices." noPadding>
        {loading.invoices ? (
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
                    <button className="settings-billing-dl-btn" onClick={() => { toast("Invoice PDF coming soon", { icon: "📄" }); }}>
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
          onClick={() => { toast("Contact sales coming soon", { icon: "📞" }); }}>
          Contact sales
        </Button>
      </div>
    </>
  );
}