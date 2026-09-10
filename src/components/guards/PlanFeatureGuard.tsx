import { Outlet, useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { usePlanFeatures } from "../../hooks/usePlanFeatures";

interface Props {
  featureKey: string;
  /** Human label shown in the upgrade message (e.g. "Inventory Management"). */
  label: string;
}

// Route-level counterpart to the sidebar's hasFeature() checks (see
// DashboardSidebar.tsx, CatalogSubSidebar.tsx, TeamSubSidebar.tsx) — blocks
// direct URL entry to a page whose module the sidebar already hides, same
// "layout route + <Outlet />" pattern as PermissionGuard.tsx. Backend
// enforcement (requirePlanFeature middleware) is the actual security
// boundary; this only stops a confusing blank/broken page when a salon
// without the feature navigates here directly (bookmark, typed URL, stale
// link) — its own API calls would 403 anyway.
export default function PlanFeatureGuard({ featureKey, label }: Props) {
  const navigate = useNavigate();
  const { hasFeature, loaded } = usePlanFeatures();

  // hasFeature() fails open (returns true) while loading, so this spinner
  // only ever shows for an instant on first mount, never as a false block.
  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={28} style={{ animation: "perm-spin 0.75s linear infinite", color: "#9ca3af" }} />
      </div>
    );
  }

  if (hasFeature(featureKey)) return <Outlet />;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", textAlign: "center", padding: 24, gap: 6,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", background: "#fffbeb",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
      }}>
        <Lock size={30} color="#f59e0b" />
      </div>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a" }}>Upgrade Required</h2>
      <p style={{ margin: "4px 0 4px", color: "#64748b", fontSize: 13.5, maxWidth: 380 }}>
        {label} is not included in your current plan. Upgrade your plan to unlock this feature.
      </p>
      <button
        onClick={() => navigate("/dashboard/settings/billing")}
        style={{
          marginTop: 10, padding: "10px 22px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
        }}
      >
        View Plans
      </button>
    </div>
  );
}
