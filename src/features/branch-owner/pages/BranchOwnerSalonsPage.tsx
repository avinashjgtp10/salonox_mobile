import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, enterSalonThunk } from "../../../middleware/branchOwner/branchOwner.thunk";

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:   { bg: "#f0fdf4", text: "#16a34a" },
    inactive: { bg: "#fef2f2", text: "#dc2626" },
  };
  const c = map[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

export default function BranchOwnerSalonsPage() {
  const dispatch = useAppDispatch();
  const { salons, loading: loadingState } = useAppSelector((s) => s.branchOwner);
  const loading = loadingState.salons;
  const [enteringId, setEnteringId] = useState<string | null>(null);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);

  async function handleEnter(salonId: string) {
    setEnteringId(salonId);
    const r = await dispatch(enterSalonThunk(salonId));
    if (enterSalonThunk.fulfilled.match(r)) {
      const { token, isOnboardingComplete = true } = r.payload as any;
      window.open(`${window.location.origin}/oauth/success?token=${token}&isOnboardingComplete=${isOnboardingComplete}`, "_blank");
    }
    setEnteringId(null);
  }

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>My Salons</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{salons.length} salon{salons.length !== 1 ? "s" : ""} assigned to you</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 600 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon", "Owner", "Status", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bo-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : salons.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No salons assigned yet</td></tr>
            ) : (
              salons.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{s.name}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#374151", fontSize: 13 }}>{s.owner_name || "—"}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{s.owner_email}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}><Badge status={s.status} /></td>
                  <td style={{ padding: "13px 16px" }}>
                    <button onClick={() => handleEnter(s.id)} disabled={enteringId === s.id}
                      style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #6366f1", cursor: enteringId === s.id ? "not-allowed" : "pointer", background: "#eef2ff", color: "#6366f1", opacity: enteringId === s.id ? 0.5 : 1 }}>
                      {enteringId === s.id ? "Opening…" : "Enter Salon"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes bo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
