import { Fragment, useCallback, useEffect, useState } from "react";
import api from "../../../../services/api/axios";
import { SALON_PLANS } from "../../../../services/api/endpoints";
import { PLAN_TIER_ORDER, type PlanDefinition, type PlanTier } from "./plans.types";
import PlanTierBadge from "./PlanTierBadge";

// Display-name (marketing copy) cumulative check for the comparison table
// below — separate from planIncludesFeatureKey (plans.types.ts), which
// checks the enforcement feature_keys list instead. These two lists are
// intentionally different (see plans.types.ts's PlanDefinition comment).
function planIncludesFeatureName(definitions: PlanDefinition[], tier: PlanTier, feature: string): boolean {
  const idx = PLAN_TIER_ORDER.indexOf(tier);
  return definitions
    .filter((d) => PLAN_TIER_ORDER.indexOf(d.tier) <= idx)
    .some((d) => d.features.includes(feature));
}

const TIER_ACCENTS: Record<string, { gradient: string; ring: string }> = {
  basic:   { gradient: "linear-gradient(135deg,#64748b,#94a3b8)", ring: "#e2e8f0" },
  advance: { gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)", ring: "#c7d2fe" },
  pro:     { gradient: "linear-gradient(135deg,#9333ea,#c026d3)", ring: "#e9d5ff" },
};

export default function PricingPlansTab() {
  const [definitions, setDefinitions] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [editingTier, setEditingTier] = useState<PlanTier | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingNameTier, setEditingNameTier] = useState<PlanTier | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingFeaturesTier, setEditingFeaturesTier] = useState<PlanTier | null>(null);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [savingFeatures, setSavingFeatures] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(SALON_PLANS.DEFINITIONS);
      setDefinitions(res.data?.data ?? []);
    } catch {
      setError("Failed to load plans. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allFeatureNames = definitions.flatMap((d) => d.features);

  function startEdit(plan: PlanDefinition) {
    setEditingTier(plan.tier);
    setEditPrice(plan.price);
  }

  function startEditName(plan: PlanDefinition) {
    setEditingNameTier(plan.tier);
    setEditName(plan.name);
  }

  async function saveName(tier: PlanTier) {
    const name = editName.trim();
    if (!name) return;
    setSavingName(true);
    try {
      const res = await api.put(SALON_PLANS.DEFINITION_UPDATE(tier), { name });
      const updated = res.data?.data as PlanDefinition;
      setDefinitions((prev) => prev.map((d) => (d.tier === tier ? updated : d)));
      setEditingNameTier(null);
    } catch {
      setError("Failed to update plan name. Please try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function savePrice(tier: PlanTier) {
    const price = Number(editPrice);
    if (!Number.isFinite(price) || price < 0) return;
    setSaving(true);
    try {
      const res = await api.put(SALON_PLANS.DEFINITION_UPDATE(tier), { price });
      const updated = res.data?.data as PlanDefinition;
      setDefinitions((prev) => prev.map((d) => (d.tier === tier ? updated : d)));
      setEditingTier(null);
    } catch {
      setError("Failed to update price. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function startEditFeatures(plan: PlanDefinition) {
    setEditingFeaturesTier(plan.tier);
    setEditFeatures([...plan.features]);
    setNewFeatureText("");
  }

  function addFeature() {
    const name = newFeatureText.trim();
    if (!name || editFeatures.includes(name)) return;
    setEditFeatures((prev) => [...prev, name]);
    setNewFeatureText("");
  }

  function removeFeature(name: string) {
    setEditFeatures((prev) => prev.filter((f) => f !== name));
  }

  async function saveFeatures(tier: PlanTier) {
    if (editFeatures.length === 0) {
      setError("A plan must have at least one feature.");
      return;
    }
    setSavingFeatures(true);
    try {
      const res = await api.put(SALON_PLANS.DEFINITION_UPDATE(tier), { features: editFeatures });
      const updated = res.data?.data as PlanDefinition;
      setDefinitions((prev) => prev.map((d) => (d.tier === tier ? updated : d)));
      setEditingFeaturesTier(null);
    } catch {
      setError("Failed to update features. Please try again.");
    } finally {
      setSavingFeatures(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>Loading plans…</div>;
  }

  if (error && definitions.length === 0) {
    return (
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Pricing cards ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 20, maxWidth: 1100, margin: "0 auto 36px",
      }}>
        {PLAN_TIER_ORDER.map((tier) => {
          const plan = definitions.find((d) => d.tier === tier);
          if (!plan) return null;
          const accent = TIER_ACCENTS[tier];
          const isPopular = tier === "advance";
          const isEditing = editingTier === tier;

          return (
            <div key={tier} style={{
              position: "relative", background: "#fff", borderRadius: 18,
              border: isPopular ? `2px solid ${accent.ring}` : "1px solid #e2e8f0",
              boxShadow: isPopular ? "0 12px 32px rgba(99,102,241,0.14)" : "0 1px 4px rgba(0,0,0,0.04)",
              padding: "28px 24px", display: "flex", flexDirection: "column",
              transform: isPopular ? "translateY(-6px)" : "none",
            }}>
              {isPopular && (
                <div style={{
                  position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                  background: accent.gradient, color: "#fff", fontSize: 10.5, fontWeight: 800,
                  padding: "4px 14px", borderRadius: 20, boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                  whiteSpace: "nowrap", letterSpacing: "0.03em",
                }}>
                  ★ MOST POPULAR
                </div>
              )}

              <div style={{
                width: 44, height: 44, borderRadius: 12, background: accent.gradient,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                boxShadow: `0 4px 12px ${accent.ring}`,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.9 6L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7.1-1z"/>
                </svg>
              </div>

              {editingNameTier === tier ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    autoFocus value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName(tier)}
                    style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 8, border: "1.5px solid #6366f1", fontSize: 17, fontWeight: 800, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                  />
                  <button onClick={() => saveName(tier)} disabled={savingName} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                    {savingName ? "…" : "Save"}
                  </button>
                  <button onClick={() => setEditingNameTier(null)} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <h3
                  onClick={() => startEditName(plan)}
                  title="Click to rename"
                  style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a", cursor: "pointer" }}
                >
                  {plan.name}
                </h3>
              )}
              <p style={{ margin: "4px 0 18px", fontSize: 12.5, color: "#94a3b8", minHeight: 48 }}>{plan.tagline}</p>

              <div style={{ marginBottom: 20 }}>
                {isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20, color: "#94a3b8" }}>₹</span>
                    <input
                      type="number" min={0} autoFocus value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && savePrice(tier)}
                      style={{ width: 120, padding: "6px 8px", borderRadius: 8, border: "1.5px solid #6366f1", fontSize: 20, fontWeight: 800, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                    />
                    <button onClick={() => savePrice(tier)} disabled={saving} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                      {saving ? "…" : "Save"}
                    </button>
                    <button onClick={() => setEditingTier(null)} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span onClick={() => startEdit(plan)} style={{ cursor: "pointer" }} title="Click to edit price">
                    <span style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>₹{Number(plan.price).toLocaleString()}</span>
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, flex: 1 }}>
                {tier !== "basic" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {tier === "advance" ? "All Basic Plan features" : "Everything in Advance Plan"}
                  </div>
                )}

                {editingFeaturesTier === tier ? (
                  <>
                    {editFeatures.map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%", background: "#ecfdf5", color: "#059669",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                        </span>
                        <span style={{ fontSize: 12.5, color: "#374151", flex: 1 }}>{f}</span>
                        <button
                          onClick={() => removeFeature(f)}
                          aria-label={`Remove ${f}`}
                          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input
                        value={newFeatureText}
                        onChange={(e) => setNewFeatureText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                        placeholder="New feature name…"
                        style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 6, border: "1.5px solid #e2e8f0", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                      />
                      <button onClick={addFeature} style={{ background: "#eef2ff", color: "#6366f1", border: "1px solid #c7d2fe", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                        Add
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => saveFeatures(tier)} disabled={savingFeatures} style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "7px 0", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                        {savingFeatures ? "Saving…" : "Save Features"}
                      </button>
                      <button onClick={() => setEditingFeaturesTier(null)} style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6, padding: "7px 0", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  plan.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: "50%", background: "#ecfdf5", color: "#059669",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                      </span>
                      <span style={{ fontSize: 12.5, color: "#374151" }}>{f}</span>
                    </div>
                  ))
                )}
              </div>

              {editingFeaturesTier !== tier && (
                <button
                  onClick={() => startEditFeatures(plan)}
                  style={{ background: "none", border: "1px dashed #c7d2fe", color: "#6366f1", borderRadius: 8, padding: "6px 0", fontSize: 11.5, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}
                >
                  + Edit Features
                </button>
              )}

              <div style={{ fontSize: 10.5, color: "#94a3b8", textAlign: "center" }}>Click the name or price to edit</div>
            </div>
          );
        })}
      </div>

      {/* ── Feature comparison toggle ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <button
          onClick={() => setShowComparison((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "13px 18px", background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: "#0f172a",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showComparison ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          Full Feature Comparison
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
            {allFeatureNames.length} features across 3 plans
          </span>
        </button>

        {showComparison && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "11px 18px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Feature</th>
                  {PLAN_TIER_ORDER.map((tier) => (
                    <th key={tier} style={{ padding: "11px 18px", textAlign: "center" }}>
                      <PlanTierBadge tier={tier} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {definitions.map((group) => (
                  <Fragment key={group.tier}>
                    <tr style={{ background: "#fafbff" }}>
                      <td colSpan={4} style={{ padding: "8px 18px", fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {group.name} Features
                      </td>
                    </tr>
                    {group.features.map((feature) => (
                      <tr key={feature} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 18px", color: "#374151", fontWeight: 500 }}>{feature}</td>
                        {PLAN_TIER_ORDER.map((tier) => (
                          <td key={tier} style={{ padding: "10px 18px", textAlign: "center" }}>
                            {planIncludesFeatureName(definitions, tier, feature) ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                              <span style={{ color: "#e2e8f0", fontSize: 14 }}>—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
