import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, setSalonStatusThunk, forceOnboardingThunk, impersonateSalonThunk, deleteSalonThunk } from "../../../middleware/superAdmin/superAdmin.thunk";
import Pagination from "../components/Pagination";

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:   { bg: "#f0fdf4", text: "#16a34a" },
    inactive: { bg: "#fef2f2", text: "#dc2626" },
  };
  const c = map[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

function ActionBtn({ label, color, bg, onClick, disabled }: { label: string; color: string; bg: string; onClick: () => void; disabled: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: `1.5px solid ${color}`, cursor: disabled ? "not-allowed" : "pointer", background: hov && !disabled ? bg : "#fff", color, transition: "all 0.15s", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}

// Matches the dd MMM yyyy convention used elsewhere in the app (see
// ClientHistoryDetail.tsx's fmtDateShort) — e.g. "19 Jul 2026".
const fmtDateShort = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`, color: ok ? "#15803d" : "#dc2626", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
      {ok ? "✓ " : "✗ "}{msg}
    </div>
  );
}

function ConfirmDeleteModal({ salonName, onConfirm, onCancel, loading }: { salonName: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
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
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Delete Salon</div>
            <div style={{ color: "#64748b", fontSize: 12.5, marginTop: 2 }}>This action cannot be undone</div>
          </div>
        </div>
        <p style={{ margin: "0 0 24px", color: "#374151", fontSize: 13.5, lineHeight: 1.6 }}>
          Are you sure you want to delete <strong style={{ color: "#0f172a" }}>{salonName}</strong>? All associated data will be permanently removed.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading}
            style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#dc2626", color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Deleting…" : "Delete Salon"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalonsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { salons, loading } = useAppSelector((s) => s.superAdmin);
  const [search, setSearch]   = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [createdSort, setCreatedSort] = useState<"asc" | "desc" | null>(null);

  const load = useCallback((q?: string) => { dispatch(fetchSuperAdminSalonsThunk(q)); }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  // Search already hits the backend, which now also matches against a
  // "DD Mon YYYY" formatted created_at (see super-admin.repository.ts::
  // getAllSalons), so typing e.g. "19 Jul 2026" filters by Created Date too.
  // Sorting by Created Date is applied client-side on top of whatever page
  // of results comes back.
  const sortedSalons = createdSort
    ? [...salons].sort((a: any, b: any) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return createdSort === "asc" ? da - db : db - da;
      })
    : salons;

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleStatus(id: string, activate: boolean) {
    setActionId(id);
    const r = await dispatch(setSalonStatusThunk({ id, is_active: activate }));
    setSalonStatusThunk.fulfilled.match(r) ? showToast(`Salon ${activate ? "activated" : "deactivated"}.`) : showToast("Action failed.", false);
    load(search || undefined); setActionId(null);
  }

  async function handleOnboarding(id: string) {
    setActionId(id);
    const r = await dispatch(forceOnboardingThunk(id));
    forceOnboardingThunk.fulfilled.match(r) ? showToast("Onboarding marked complete.") : showToast("Action failed.", false);
    load(search || undefined); setActionId(null);
  }

  async function handleImpersonate(id: string) {
    setActionId(id);
    const r = await dispatch(impersonateSalonThunk(id));
    if (impersonateSalonThunk.fulfilled.match(r)) {
      const { token, isOnboardingComplete = true } = (r.payload as any) ?? {};
      if (token) window.open(`${window.location.origin}/oauth/success?token=${token}&isOnboardingComplete=${isOnboardingComplete}`, "_blank");
    } else { showToast("Impersonate failed.", false); }
    setActionId(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const r = await dispatch(deleteSalonThunk(deleteTarget.id));
    if (deleteSalonThunk.fulfilled.match(r)) {
      showToast(`"${deleteTarget.name}" deleted successfully.`);
      load(search || undefined);
    } else {
      showToast((r.payload as string) || "Failed to delete salon.", false);
    }
    setDeleteLoading(false);
    setDeleteTarget(null);
  }

  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {toast && <Toast {...toast} />}
      {deleteTarget && (
        <ConfirmDeleteModal
          salonName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Salon Management</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{salons.length} salon{salons.length !== 1 ? "s" : ""} registered</p>
        </div>
        <div style={{ position: "relative" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value || undefined); }}
            placeholder="Search salons or email…"
            style={{ padding: "9px 14px 9px 36px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13.5, outline: "none", width: 240, transition: "border-color 0.15s" }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon", "Owner", "Plan", "Staff", "Clients", "Revenue", "Created Date", "Status", "Onboarding", "Actions"].map(h => (
                h === "Created Date" ? (
                  <th key={h}
                    onClick={() => setCreatedSort(createdSort === "desc" ? "asc" : "desc")}
                    style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by creation date">
                    {h} {createdSort === "asc" ? "▲" : createdSort === "desc" ? "▼" : ""}
                  </th>
                ) : (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                )
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.salons ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(10)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sa-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedSalons.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No salons found</td></tr>
            ) : (
              sortedSalons.slice((page - 1) * perPage, page * perPage).map((s: any) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s", cursor: "pointer" }}
                  onClick={() => navigate(`/super-admin/salons/${s.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 13.5 }}>{s.name}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#374151", fontSize: 13 }}>{s.owner_name || "—"}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{s.owner_email}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {s.plan_name ? <span style={{ color: "#6366f1", fontWeight: 600, fontSize: 12.5 }}>{s.plan_name}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{s.staff_count ?? "—"}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{s.client_count ?? "—"}</td>
                  <td style={{ padding: "13px 16px", color: "#16a34a", fontWeight: 700 }}>{fmt(s.revenue)}</td>
                  <td style={{ padding: "13px 16px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDateShort(s.created_at)}</td>
                  <td style={{ padding: "13px 16px" }}><Badge status={s.status} /></td>
                  <td style={{ padding: "13px 16px" }}>
                    {s.is_onboarding_complete
                      ? <span style={{ color: "#16a34a", fontSize: 12.5, fontWeight: 600 }}>✓ Done</span>
                      : <span style={{ color: "#d97706", fontSize: 12.5, fontWeight: 600 }}>⚠ Pending</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {s.status === "active"
                        ? <ActionBtn label="Deactivate" color="#dc2626" bg="#fef2f2" onClick={() => handleStatus(s.id, false)} disabled={actionId === s.id} />
                        : <ActionBtn label="Activate"   color="#16a34a" bg="#f0fdf4" onClick={() => handleStatus(s.id, true)}  disabled={actionId === s.id} />}
                      {!s.is_onboarding_complete && (
                        <ActionBtn label="Force Complete" color="#d97706" bg="#fffbeb" onClick={() => handleOnboarding(s.id)} disabled={actionId === s.id} />
                      )}
                      <ActionBtn label="Impersonate" color="#6366f1" bg="#eef2ff" onClick={() => handleImpersonate(s.id)} disabled={actionId === s.id} />
                      <ActionBtn label="Delete" color="#dc2626" bg="#fef2f2" onClick={() => setDeleteTarget({ id: s.id, name: s.name })} disabled={actionId === s.id} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          total={salons.length} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage}
          itemLabel="salons"
        />
      </div>
      <style>{`@keyframes sa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
