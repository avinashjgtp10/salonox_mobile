import { useState } from "react";
import PricingPlansTab from "../components/plans/PricingPlansTab";
import SalonCustomizationTab from "../components/plans/SalonCustomizationTab";
import BillingInvoicesTab from "../components/plans/BillingInvoicesTab";

// UI-only mock screen — see plans.types.ts for why this stays separate from
// the real billing.types.ts / billingSlice.ts. No backend wiring: every
// action here (save configuration, set default plan) updates local state
// only.
const TABS = [
  { key: "pricing",      label: "Pricing Plans" },
  { key: "customization", label: "Salon Customization" },
  { key: "billing",      label: "Billing & Invoices" },
] as const;

export default function PlansManagementPage() {
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("pricing");

  return (
    <div style={{ padding: "28px 28px 60px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99,102,241,0.35)", flexShrink: 0 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.9 6L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7.1-1z"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Plans & Subscriptions</h1>
          <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13 }}>Manage the 3-tier plan structure, per-salon customization, and billing</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: "1.5px solid #e2e8f0" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, color: tab === t.key ? "#6366f1" : "#94a3b8",
              borderBottom: tab === t.key ? "2.5px solid #6366f1" : "2.5px solid transparent",
              marginBottom: -1.5, fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pricing" && <PricingPlansTab />}
      {tab === "customization" && <SalonCustomizationTab />}
      {tab === "billing" && <BillingInvoicesTab />}
    </div>
  );
}
