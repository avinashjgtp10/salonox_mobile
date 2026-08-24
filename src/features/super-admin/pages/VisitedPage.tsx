import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, fetchSuperAdminUsersThunk, forceOnboardingThunk, deleteUserThunk } from "../../../middleware/superAdmin/superAdmin.thunk";
import Pagination from "../components/Pagination";

const fmtDateShort = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";

function daysSince(iso?: string | null) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "Today" : `${days} day${days !== 1 ? "s" : ""} ago`;
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`, color: ok ? "#15803d" : "#dc2626", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
      {ok ? "✓ " : "✗ "}{msg}
    </div>
  );
}

function ConfirmDeleteAccountModal({ ownerName, ownerEmail, onConfirm, onCancel, loading }: { ownerName: string; ownerEmail: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Delete Account</div>
            <div style={{ color: "#64748b", fontSize: 12.5, marginTop: 2 }}>This action cannot be undone</div>
          </div>
        </div>
        <p style={{ margin: "0 0 24px", color: "#374151", fontSize: 13.5, lineHeight: 1.6 }}>
          Are you sure you want to delete the account for <strong style={{ color: "#0f172a" }}>{ownerName || ownerEmail}</strong>? This only deletes the login — if this person owns a salon, delete the salon first.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading}
            style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#dc2626", color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VisitedPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { salons, users, loading } = useAppSelector((s) => s.superAdmin);
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback((q?: string) => { dispatch(fetchSuperAdminSalonsThunk(q)); }, [dispatch]);
  useEffect(() => { load(); dispatch(fetchSuperAdminUsersThunk({})); }, [load, dispatch]);

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  // Everyone who has registered, most recent first — with a single clear
  // onboarding status column rather than pre-filtering to "incomplete only".
  const visited = [...salons].sort((a: any, b: any) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );

  // Owner/staff record for a salon, used to surface phone + last-visited time
  // not present on the salon object itself.
  function ownerFor(salonId: string) {
    const salonUsers = users.filter((u: any) => u.salon_id === salonId);
    if (salonUsers.length === 0) return undefined;
    return salonUsers.reduce((latest: any, u: any) =>
      !latest || (u.last_login && (!latest.last_login || new Date(u.last_login) > new Date(latest.last_login))) ? u : latest
    , undefined);
  }

  async function handleForceComplete(id: string) {
    setActionId(id);
    const r = await dispatch(forceOnboardingThunk(id));
    forceOnboardingThunk.fulfilled.match(r) ? showToast("Onboarding marked complete.") : showToast("Action failed.", false);
    load(search || undefined);
    setActionId(null);
  }

  async function handleDeleteAccount() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const r = await dispatch(deleteUserThunk({ id: deleteTarget.id }));
    if (deleteUserThunk.fulfilled.match(r)) {
      showToast(`Account for "${deleteTarget.name || deleteTarget.email}" deleted.`);
      dispatch(fetchSuperAdminUsersThunk({}));
    } else {
      // Backend blocks with 409 USER_OWNS_SALON when this login still owns a
      // salon — surface that reason instead of a generic failure message.
      showToast(r.payload?.message || "Failed to delete account.", false);
    }
    setDeleteLoading(false);
    setDeleteTarget(null);
  }

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {toast && <Toast {...toast} />}
      {deleteTarget && (
        <ConfirmDeleteAccountModal
          ownerName={deleteTarget.name}
          ownerEmail={deleteTarget.email}
          onConfirm={handleDeleteAccount}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Visited</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
            {visited.length} registration{visited.length !== 1 ? "s" : ""} · {visited.filter((s: any) => !s.is_onboarding_complete).length} onboarding pending
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value || undefined); }}
            placeholder="Search by name or email…"
            style={{ padding: "9px 14px 9px 36px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13.5, outline: "none", width: 240 }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 1150 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon / Owner", "Email", "Mobile", "Location", "Registered On", "Last Visited", "Onboarding", "Actions"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.salons ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sa-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : visited.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No registrations found</td></tr>
            ) : (
              visited.slice((page - 1) * perPage, page * perPage).map((s: any) => {
                const owner = ownerFor(s.id);
                return (
                  <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s", cursor: "pointer" }}
                    onClick={() => navigate(`/super-admin/salons/${s.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 13.5 }}>{s.name}</span>
                      <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{s.owner_name || "—"}</div>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontSize: 13 }}>{s.owner_email}</td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontSize: 13, whiteSpace: "nowrap" }}>{s.phone || owner?.phone || "—"}</td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontSize: 13 }}>{s.address || s.city || "—"}</td>
                    <td style={{ padding: "13px 16px", color: "#374151", whiteSpace: "nowrap" }}>
                      {fmtDateShort(s.created_at)}
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{daysSince(s.created_at)}</div>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontSize: 12.5, whiteSpace: "nowrap" }}>{fmtDateTime(owner?.last_login)}</td>
                    <td style={{ padding: "13px 16px" }}>
                      {s.is_onboarding_complete
                        ? <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: "#f0fdf4", color: "#16a34a" }}>✓ Complete</span>
                        : <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: "#fffbeb", color: "#d97706" }}>⚠ Pending</span>}
                    </td>
                    <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {!s.is_onboarding_complete && (
                          <button onClick={() => handleForceComplete(s.id)} disabled={actionId === s.id}
                            style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #d97706", cursor: actionId === s.id ? "not-allowed" : "pointer", background: "#fffbeb", color: "#d97706", opacity: actionId === s.id ? 0.5 : 1, whiteSpace: "nowrap" }}>
                            Force Complete
                          </button>
                        )}
                        {owner && (
                          <button onClick={() => setDeleteTarget({ id: owner.id, name: owner.name ?? "", email: owner.email ?? s.owner_email ?? "" })}
                            style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #dc2626", cursor: "pointer", background: "#fef2f2", color: "#dc2626", whiteSpace: "nowrap" }}>
                            Delete Account
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          total={visited.length} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage}
          itemLabel="registrations"
        />
      </div>
      <style>{`@keyframes sa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
