import { useCallback, useEffect, useState } from "react";
import api from "../../../../services/api/axios";
import { SALON_PLANS, SUPER_ADMIN } from "../../../../services/api/endpoints";
import {
  PLAN_TIER_ORDER, planIncludesFeatureKey, allFeatureRows,
  type PlanDefinition, type SalonPlanCustomization, type PlanTier, type FeatureKeyEntry,
} from "./plans.types";
import PlanTierBadge from "./PlanTierBadge";

interface SalonSearchRow { id: string; name: string; owner_email: string | null }

function FeatureToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px", borderRadius: 8, background: on ? "#f0fdf4" : "#fafbfc",
      border: `1px solid ${on ? "#bbf7d0" : "#f1f5f9"}`,
    }}>
      <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 500 }}>{label}</span>
      <button
        onClick={onChange}
        style={{
          width: 36, height: 20, borderRadius: 12, border: "none", position: "relative",
          cursor: "pointer", flexShrink: 0,
          background: on ? "#16a34a" : "#e2e8f0", transition: "background 0.2s", padding: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: on ? "calc(100% - 18px)" : 2,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

export default function SalonCustomizationTab() {
  const [definitions, setDefinitions] = useState<PlanDefinition[]>([]);
  const [salons, setSalons] = useState<SalonSearchRow[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<SalonSearchRow | null>(null);
  const [draft, setDraft] = useState<SalonPlanCustomization | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState("");
  // When on, the salon's effective features are EXACTLY the checked boxes —
  // nothing from the base tier applies unless explicitly checked here. Off
  // (default) keeps the normal behavior: base tier's features, with
  // overrides only adjusting individual ones on top.
  const [exactFeatureSet, setExactFeatureSet] = useState(false);

  const [definitionsError, setDefinitionsError] = useState("");

  useEffect(() => {
    api.get(SALON_PLANS.DEFINITIONS)
      .then((res) => setDefinitions(res.data?.data ?? []))
      .catch(() => {
        // Was previously swallowed silently — switchBaseTier's `definitions.find(...)`
        // then always misses and no-ops, so a tier-switch click did literally nothing
        // with zero visible feedback. Surfacing this so a failed fetch is obvious
        // instead of looking like a working-but-ignored click.
        setDefinitionsError("Failed to load the plan catalog. Tier switching and feature overrides won't work until this loads — try reloading the page.");
      });
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(SUPER_ADMIN.SUBSCRIPTION_PERMISSIONS_SEARCH, { params: { q: search } });
        setSalons(res.data?.data ?? []);
      } catch {
        setSalons([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openCustomize = useCallback(async (salon: SalonSearchRow) => {
    setSelectedId(salon.id);
    setSelectedSalon(salon);
    setDraft(null);
    setSavedMsg(false);
    setError("");
    setExactFeatureSet(false);
    setLoadingDraft(true);
    try {
      const res = await api.get(SALON_PLANS.CUSTOMIZATION_GET(salon.id));
      setDraft(res.data?.data ?? null);
    } catch {
      setError("Failed to load this salon's plan.");
    } finally {
      setLoadingDraft(false);
    }
  }, []);

  function closeCustomize() {
    setSelectedId(null);
    setSelectedSalon(null);
    setDraft(null);
  }

  function switchBaseTier(tier: PlanTier) {
    const plan = definitions.find((d) => d.tier === tier);
    if (!plan) {
      // Previously a silent no-op when the plan catalog hadn't loaded (or
      // failed to load) — the button looked clickable and gave zero
      // feedback while doing nothing, which is exactly the "customization
      // tab isn't working" symptom this was causing.
      setError("Plan catalog not loaded yet — please wait a moment and try again.");
      return;
    }
    setDraft((d) => d && {
      ...d, base_tier: tier,
      staff_limit: plan.default_staff_limit,
      customer_limit: plan.default_customer_limit,
      appointment_limit: plan.default_appointment_limit,
      branch_limit: plan.default_branch_limit,
      storage_limit_gb: plan.default_storage_limit_gb,
      feature_overrides: {},
    });
  }

  async function saveDraft() {
    if (!draft || !selectedId) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.put(SALON_PLANS.CUSTOMIZATION_UPSERT(selectedId), {
        base_tier: draft.base_tier,
        custom_price: draft.custom_price === null ? null : Number(draft.custom_price),
        staff_limit: draft.staff_limit,
        customer_limit: draft.customer_limit,
        appointment_limit: draft.appointment_limit,
        branch_limit: draft.branch_limit,
        storage_limit_gb: draft.storage_limit_gb,
        feature_overrides: draft.feature_overrides,
        start_date: draft.start_date,
        expiry_date: draft.expiry_date,
      });
      setDraft(res.data?.data ?? draft);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  const featureRows: FeatureKeyEntry[] = allFeatureRows(definitions);
  const selectedPlan = draft ? definitions.find((d) => d.tier === draft.base_tier) : null;

  // The salon's actual effective feature set right now: everything its base
  // tier includes (cumulative, Basic ⊆ Advance ⊆ Pro), with per-salon
  // feature_overrides applied on top — an override can both add a feature
  // the base tier lacks (true) and remove one it has (false). This is what
  // requirePlanFeature() on the backend actually checks against, so it's
  // shown as its own read-only list rather than only the toggle grid below,
  // which mixes editing controls in with the same information.
  const effectiveFeatures = draft
    ? featureRows.filter((row) => {
        const includedByBase = planIncludesFeatureKey(definitions, draft.base_tier, row.key);
        return draft.feature_overrides[row.key] ?? includedByBase;
      })
    : [];
  // Limits aren't editable from this screen (see saveDraft — they're still
  // sent through unchanged from whatever switchBaseTier last set), so only
  // price and feature overrides count toward "customized" here.
  const isCustomized = !!draft && (
    draft.custom_price !== null ||
    Object.keys(draft.feature_overrides).length > 0
  );

  return (
    <div>
      {definitionsError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {definitionsError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: selectedId ? "380px 1fr" : "1fr", gap: 20, alignItems: "start" }}>
      {/* ── Salon list ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <div style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search salon by name or owner email…"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }}
          />
        </div>
        <div style={{ maxHeight: 560, overflowY: "auto" }}>
          {searching ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Searching…</div>
          ) : salons.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons found</div>
          ) : (
            salons.map((s) => (
              <div
                key={s.id}
                onClick={() => openCustomize(s)}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  borderBottom: "1px solid #f8fafc",
                  background: s.id === selectedId ? "#eef2ff" : "#fff",
                  borderLeft: s.id === selectedId ? "3px solid #6366f1" : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.name}</span>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.owner_email}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Customization panel ── */}
      {selectedId && selectedSalon && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{selectedSalon.name}</h3>
                {draft && <PlanTierBadge tier={draft.base_tier} />}
                {isCustomized && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 20 }}>
                    Special pricing
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{selectedSalon.owner_email}</div>
            </div>
            <button onClick={closeCustomize} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#64748b", fontSize: 16 }}>×</button>
          </div>

          {loadingDraft ? (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>Loading…</div>
          ) : !draft ? (
            <div style={{ padding: 60, textAlign: "center", color: "#dc2626", fontSize: 13.5 }}>{error || "Could not load this salon's plan."}</div>
          ) : (
            <>
              {/* Current effective features — what this account can actually
                  access right now, matching requirePlanFeature() on the backend. */}
              <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                  Current Plan Features ({effectiveFeatures.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {effectiveFeatures.map((row) => (
                    <span key={row.key} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11.5, fontWeight: 600, color: "#166534",
                      background: "#f0fdf4", border: "1px solid #bbf7d0",
                      padding: "4px 10px", borderRadius: 20,
                    }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                      {row.label}
                    </span>
                  ))}
                  {effectiveFeatures.length === 0 && (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>No features enabled for this account.</span>
                  )}
                </div>
              </div>

              <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
                {/* Base plan selector */}
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Base Plan</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
                    Choose which of the 3 fixed plans this salon is built on — customization always starts from one of Basic, Advance or Pro, never a separate plan.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {PLAN_TIER_ORDER.map((tier) => (
                      <button
                        key={tier}
                        onClick={() => switchBaseTier(tier)}
                        style={{
                          flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                          border: draft.base_tier === tier ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
                          background: draft.base_tier === tier ? "#eef2ff" : "#fff",
                          color: draft.base_tier === tier ? "#6366f1" : "#64748b",
                          fontSize: 13, fontWeight: 700,
                        }}
                      >
                        {definitions.find((d) => d.tier === tier)?.name ?? tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom price */}
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Custom Price</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: 220 }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }}>₹</span>
                      <input
                        type="number" min={0}
                        value={draft.custom_price ?? ""}
                        placeholder={selectedPlan ? `Standard: ₹${Number(selectedPlan.price).toLocaleString()}` : ""}
                        onChange={(e) => setDraft((d) => d && { ...d, custom_price: e.target.value === "" ? null : e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 26px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                    {draft.custom_price !== null && (
                      <button onClick={() => setDraft((d) => d && { ...d, custom_price: null })} style={{ fontSize: 11.5, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        Reset to standard
                      </button>
                    )}
                  </div>
                </div>

                {/* Start / expiry date */}
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Subscription Period</div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>Start Date</label>
                      <input type="date" value={draft.start_date?.slice(0, 10) ?? ""} onChange={(e) => setDraft((d) => d && { ...d, start_date: e.target.value })}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>Expiry Date</label>
                      <input type="date" value={draft.expiry_date?.slice(0, 10) ?? ""} onChange={(e) => setDraft((d) => d && { ...d, expiry_date: e.target.value || null })}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    </div>
                  </div>
                </div>

                {/* Feature toggles */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>Feature Overrides</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#374151", fontWeight: 600, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={exactFeatureSet}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setExactFeatureSet(next);
                          if (next) {
                            // Seed overrides from the CURRENT effective set (base tier
                            // + existing overrides) so switching the mode on doesn't
                            // silently drop everything the salon already has — it
                            // freezes today's access into an explicit list the admin
                            // can then trim from.
                            const seeded: Record<string, boolean> = {};
                            for (const row of featureRows) {
                              seeded[row.key] = draft.feature_overrides[row.key]
                                ?? planIncludesFeatureKey(definitions, draft.base_tier, row.key);
                            }
                            setDraft((d) => d && { ...d, feature_overrides: seeded });
                          }
                        }}
                      />
                      Only selected features (ignore base plan)
                    </label>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
                    {exactFeatureSet
                      ? "This salon gets ONLY the checked features below — everything else is off, even if the base plan normally includes it."
                      : "Turn individual features ON/OFF for this salon on top of its base plan."}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
                    {featureRows.map((row) => {
                      const includedByBase = planIncludesFeatureKey(definitions, draft.base_tier, row.key);
                      const on = exactFeatureSet
                        ? (draft.feature_overrides[row.key] ?? false)
                        : (draft.feature_overrides[row.key] ?? includedByBase);
                      return (
                        <FeatureToggleRow
                          key={row.key}
                          label={row.label}
                          on={on}
                          onChange={() => setDraft((d) => d && {
                            ...d,
                            feature_overrides: { ...d.feature_overrides, [row.key]: !on },
                          })}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Save bar */}
              <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12, background: "#fafbfc", flexWrap: "wrap" }}>
                <button onClick={saveDraft} disabled={saving} style={{
                  padding: "10px 22px", background: saving ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                  border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving ? "none" : "0 4px 14px rgba(99,102,241,0.35)", fontFamily: "inherit",
                }}>
                  {saving ? "Saving…" : "Save Configuration"}
                </button>
                {savedMsg && (
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", padding: "6px 12px", borderRadius: 7, border: "1px solid #bbf7d0" }}>
                    ✓ Configuration saved
                  </span>
                )}
                {error && (
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#dc2626", background: "#fef2f2", padding: "6px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
                    {error}
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>
                  Salon still shows <b style={{ color: "#374151" }}>{selectedPlan?.name ?? draft.base_tier}</b> with a "Special pricing" tag
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {!selectedId && (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0",
          padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 13.5,
        }}>
          Select a salon from the list to customize its plan.
        </div>
      )}
      </div>
    </div>
  );
}
