import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, fetchSuperAdminUsersThunk, fetchBranchOwnerSalonsThunk, assignBranchOwnerSalonsThunk } from "../../../middleware/superAdmin/superAdmin.thunk";
import { Badge, ActionBtn, Toast } from "../components/SuperAdminUI";

function AssignSalonsModal({ branchOwner, allSalons, onClose, onSaved }: { branchOwner: { id: string; name: string }; allSalons: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await dispatch(fetchBranchOwnerSalonsThunk(branchOwner.id));
      if (!cancelled && fetchBranchOwnerSalonsThunk.fulfilled.match(r)) {
        setSelected(new Set((r.payload as any[]).map((s) => s.id)));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [branchOwner.id, dispatch]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true); setErr("");
    const r = await dispatch(assignBranchOwnerSalonsThunk({ branchOwnerId: branchOwner.id, salonIds: Array.from(selected) }));
    setSaving(false);
    if (assignBranchOwnerSalonsThunk.fulfilled.match(r)) {
      onSaved();
    } else {
      setErr((r.payload as string) || "Failed to save assignment.");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px", width: 460, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 700 }}>Assign Salons</h3>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12.5 }}>{branchOwner.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, border: "1px solid #e2e8f0", borderRadius: 10 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</div>
          ) : allSalons.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons available</div>
          ) : (
            allSalons.map((s) => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13.5, color: "#0f172a" }}>
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                {s.name}
              </label>
            ))
          )}
        </div>

        {err && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginTop: 14 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BranchOwnersPage() {
  const dispatch = useAppDispatch();
  const { salons, users, loading } = useAppSelector((s) => s.superAdmin);
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    dispatch(fetchSuperAdminUsersThunk({ role: "branch_owner" }));
    dispatch(fetchSuperAdminSalonsThunk(undefined));
  }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  const branchOwners = users.filter((u: any) => u.role === "branch_owner");

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {toast && <Toast {...toast} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Branch Owners</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{branchOwners.length} branch owner{branchOwners.length !== 1 ? "s" : ""}</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 500 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Name", "Email", "Status", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.users ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bo-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : branchOwners.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>
                No branch owners yet. Create one from the Salons page (Create Account → Role: Branch Owner).
              </td></tr>
            ) : (
              branchOwners.map((u: any) => (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{u.name}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{u.email}</td>
                  <td style={{ padding: "13px 16px" }}><Badge status={u.status} /></td>
                  <td style={{ padding: "13px 16px" }}>
                    <ActionBtn label="Assign Salons" color="#6366f1" bg="#eef2ff" onClick={() => setAssignTarget({ id: u.id, name: u.name })} disabled={false} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assignTarget && (
        <AssignSalonsModal
          branchOwner={assignTarget}
          allSalons={salons.map((s: any) => ({ id: s.id, name: s.name }))}
          onClose={() => setAssignTarget(null)}
          onSaved={() => { setAssignTarget(null); showToast("Salon assignment saved."); }}
        />
      )}

      <style>{`@keyframes bo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
