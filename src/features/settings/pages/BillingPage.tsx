import { useState } from "react";
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
import Button from "../../../components/ui/Button";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  description: string;
  invoice: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    period: "month",
    description: "Perfect for solo stylists and small salons just getting started.",
    features: [
      "Up to 2 staff members",
      "100 appointments/month",
      "Basic client management",
      "Payment processing",
      "Email notifications",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 2499,
    period: "month",
    description: "For growing salons ready to scale their operations.",
    features: [
      "Up to 10 staff members",
      "Unlimited appointments",
      "Advanced client management",
      "WhatsApp campaigns",
      "Analytics & reports",
      "Inventory management",
      "Online booking page",
      "Priority support",
    ],
    highlight: true,
    badge: "Most Popular",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 5999,
    period: "month",
    description: "For large salons and chains with advanced requirements.",
    features: [
      "Unlimited staff",
      "Multi-location support",
      "Custom integrations",
      "White-label booking",
      "Dedicated account manager",
      "API access",
      "Custom reporting",
      "SLA guarantee",
    ],
    badge: "Best Value",
  },
];

const invoices: Invoice[] = [
  {
    id: "INV-2024-012",
    date: "Dec 1, 2024",
    amount: 2499,
    status: "paid",
    description: "Growth Plan — December 2024",
    invoice: "#",
  },
  {
    id: "INV-2024-011",
    date: "Nov 1, 2024",
    amount: 2499,
    status: "paid",
    description: "Growth Plan — November 2024",
    invoice: "#",
  },
  {
    id: "INV-2024-010",
    date: "Oct 1, 2024",
    amount: 2499,
    status: "paid",
    description: "Growth Plan — October 2024",
    invoice: "#",
  },
  {
    id: "INV-2024-009",
    date: "Sep 1, 2024",
    amount: 999,
    status: "paid",
    description: "Starter Plan — September 2024",
    invoice: "#",
  },
];

const usageData = [
  { label: "Staff Members", used: 6, limit: 10, icon: <Users size={15} /> },
  { label: "Appointments this month", used: 284, limit: 999, icon: <Calendar size={15} /> },
  { label: "WhatsApp messages sent", used: 1820, limit: 5000, icon: <MessageCircle size={15} /> },
  { label: "Analytics reports", used: 12, limit: 50, icon: <BarChart2 size={15} /> },
];

export default function BillingPage() {
  const [currentPlan] = useState("growth");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) return;
    setUpgradeLoading(planId);
    await new Promise((r) => setTimeout(r, 800));
    setUpgradeLoading(null);
    toast.success(`Upgrade to ${plans.find((p) => p.id === planId)?.name} initiated`);
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    if (status === "paid")
      return <span className="s-badge s-badge-success">Paid</span>;
    if (status === "pending")
      return <span className="s-badge s-badge-warning">Pending</span>;
    return <span className="s-badge s-badge-danger">Failed</span>;
  };

  const yearlyDiscount = 0.2;
  const adjustedPrice = (price: number) =>
    billingCycle === "yearly"
      ? Math.round(price * 12 * (1 - yearlyDiscount))
      : price;

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
      <div className="settings-billing-plan mb-4">
        <p className="settings-billing-plan-label">Current Plan</p>
        <p className="settings-billing-plan-name">Growth Plan</p>
        <p className="settings-billing-plan-price">
          ₹2,499 / month &nbsp;·&nbsp; Renews Jan 1, 2025
        </p>
        <div className="settings-billing-plan-features">
          {[
            "10 staff members",
            "Unlimited appointments",
            "WhatsApp campaigns",
            "Analytics",
          ].map((f) => (
            <span key={f} className="settings-billing-plan-feature">
              <CheckCircle2 size={13} />
              {f}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <Button
            size="sm"
            variant="light"
            onClick={() => toast("Manage subscription coming soon", { icon: "💳" })}
          >
            Manage subscription
          </Button>
          <Button
            size="sm"
            variant="outline-light"
            onClick={() => toast("Cancel flow coming soon", { icon: "ℹ️" })}
          >
            Cancel plan
          </Button>
        </div>
      </div>

      {/* Usage */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Current Usage</p>
            <p className="settings-section-desc">
              Monthly usage for your Growth plan limits.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          {usageData.map((item) => {
            const pct = Math.min((item.used / item.limit) * 100, 100);
            const isWarn = pct >= 80;
            const isDanger = pct >= 95;
            return (
              <div key={item.label} className="settings-usage-row">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: 200,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      background: "#f3f4f6",
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#374151",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <span className="settings-usage-label" style={{ width: "auto" }}>
                    {item.label}
                  </span>
                </div>
                <div className="settings-usage-bar-wrap">
                  <div
                    className={`settings-usage-bar ${isDanger ? "danger" : isWarn ? "warn" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="settings-usage-count">
                  {item.used.toLocaleString()} / {item.limit.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plans */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Available Plans</p>
            <p className="settings-section-desc">
              Upgrade or downgrade at any time. Changes apply at the next billing date.
            </p>
          </div>
          {/* Billing Cycle Toggle */}
          <div
            style={{
              display: "flex",
              background: "#f3f4f6",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            {(["monthly", "yearly"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                style={{
                  padding: "5px 12px",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: billingCycle === cycle ? "#fff" : "transparent",
                  color: billingCycle === cycle ? "#111827" : "#6b7280",
                  boxShadow:
                    billingCycle === cycle
                      ? "0 1px 4px rgba(0,0,0,0.08)"
                      : "none",
                  transition: "all 0.15s",
                }}
              >
                {cycle === "yearly" ? "Yearly (–20%)" : "Monthly"}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-section-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  style={{
                    border: `2px solid ${isCurrent ? "#111827" : plan.highlight ? "#e5e7eb" : "#e5e7eb"}`,
                    borderRadius: 14,
                    padding: 20,
                    position: "relative",
                    background: isCurrent ? "#f9fafb" : "#fff",
                    boxShadow: plan.highlight ? "0 4px 16px rgba(0,0,0,0.06)" : undefined,
                  }}
                >
                  {plan.badge && (
                    <div
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: plan.highlight ? "#111827" : "#f59e0b",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      {plan.id === "starter" && <Zap size={16} color="#6b7280" />}
                      {plan.id === "growth" && <Sparkles size={16} color="#111827" />}
                      {plan.id === "enterprise" && <Building2 size={16} color="#374151" />}
                      <span
                        style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}
                      >
                        {plan.name}
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>
                        ₹{adjustedPrice(plan.price).toLocaleString()}
                      </span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {" "}
                        /{billingCycle === "yearly" ? "year" : "mo"}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                      {plan.description}
                    </p>
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px" }}>
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          fontSize: 12.5,
                          color: "#374151",
                          marginBottom: 6,
                        }}
                      >
                        <CheckCircle2 size={13} color="#10b981" strokeWidth={2.5} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    fullWidth
                    size="sm"
                    variant={isCurrent ? "outline-secondary" : "primary"}
                    disabled={isCurrent}
                    loading={upgradeLoading === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent ? "Current plan" : "Upgrade"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Payment Method</p>
            <p className="settings-section-desc">
              Card used for recurring billing.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => toast("Update card coming soon", { icon: "💳" })}
          >
            Update card
          </Button>
        </div>
        <div className="settings-section-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          >
            <CreditCard size={22} color="#374151" />
            <div>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#111827",
                  margin: 0,
                }}
              >
                •••• •••• •••• 4242
              </p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                Visa &nbsp;·&nbsp; Expires 12/26
              </p>
            </div>
            <span className="s-badge s-badge-success ms-auto">Default</span>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Billing History</p>
            <p className="settings-section-desc">
              Download past invoices for your records.
            </p>
          </div>
        </div>
        <div className="settings-section-body" style={{ padding: 0 }}>
          <table className="settings-billing-table">
            <thead className="settings-billing-head">
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="settings-billing-row">
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{inv.id}</td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>{inv.date}</td>
                  <td style={{ fontSize: 13 }}>{inv.description}</td>
                  <td style={{ fontWeight: 700 }}>
                    ₹{inv.amount.toLocaleString()}
                  </td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "#111827",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 6,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = "")
                      }
                      onClick={() => toast("Invoice download coming soon", { icon: "📄" })}
                    >
                      <Download size={13} />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Need more? */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              margin: "0 0 3px",
            }}
          >
            Need a custom plan?
          </p>
          <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>
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
