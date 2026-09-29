import type { PlanTier } from "./plans.types";

const TIER_COLORS: Record<PlanTier, { bg: string; text: string; border: string }> = {
  basic:   { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  advance: { bg: "#eef2ff", text: "#6366f1", border: "#c7d2fe" },
  pro:     { bg: "#faf5ff", text: "#9333ea", border: "#e9d5ff" },
};

const TIER_LABELS: Record<PlanTier, string> = { basic: "Basic", advance: "Advance", pro: "Growth" };

export default function PlanTierBadge({ tier, size = "md" }: { tier: PlanTier; size?: "sm" | "md" }) {
  const c = TIER_COLORS[tier];
  const small = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: small ? 10.5 : 11.5, fontWeight: 700,
      padding: small ? "2px 8px" : "3px 10px", borderRadius: 20,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
      {TIER_LABELS[tier]}
    </span>
  );
}
