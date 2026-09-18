import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, fetchSuperAdminUsersThunk, fetchBranchOwnerSalonsThunk, assignBranchOwnerSalonsThunk, updateUserThunk, deleteUserThunk } from "../../../middleware/superAdmin/superAdmin.thunk";
import { Badge, ActionBtn, Toast } from "../components/SuperAdminUI";

function EditBranchOwnerModal({ branchOwner, onClose, onSaved }: { branchOwner: { id: string; name: string; email: string; phone?: string | null }; onClose: () => void; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const nameParts = branchOwner.name.trim().split(/\s+/);
  const [firstName, setFirstName] = useState(nameParts[0] ?? "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" "));
  const [email, setEmail] = useState(branchOwner.email);
  const [phone, setPhone] = useState(branchOwner.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!firstName.trim()) { setErr("First name is required"); return; }
    if (!email.trim()) { setErr("Email is required"); return; }
    setSaving(true); setErr("");
    const r = await dispatch(updateUserThunk({
      id: branchOwner.id,
      first_name: firstName.trim(),
      last_name: lastName.trim() || undefined,
      email: email.trim(),
      phone: phone.trim() || undefined,
    }));
    setSaving(false);
    if (updateUserThunk.fulfilled.match(r)) {
      onSaved();
    } else {
      setErr((r.payload as string) || "Failed to save changes.");
    }
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13.5, color: "#0f172a", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px", width: 420, boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 700 }}>Edit Branch Owner</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First Name</label>
              <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last Name</label>
              <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        {err && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginTop: 14 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteBranchOwnerModal({ name, email, onConfirm, onCancel, loading }: { name: string; email: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Delete Branch Owner</div>
            <div style={{ color: "#64748b", fontSize: 12.5, marginTop: 2 }}>This action cannot be undone</div>
          </div>
        </div>
        <p style={{ margin: "0 0 24px", color: "#374151", fontSize: 13.5, lineHeight: 1.6 }}>
          Are you sure you want to delete <strong style={{ color: "#0f172a" }}>{name || email}</strong>? Their login and salon assignments will be removed — the assigned salons themselves are not affected.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading}
            style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#dc2626", color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignSalonsModal({ branchOwner, allSalons, onClose, onSaved }: { branchOwner: { id: string; name: string }; allSalons: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

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

  const filteredSalons = allSalons.filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase())
  );

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

        <input
          type="text"
          placeholder="Search salons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13.5, color: "#0f172a", outline: "none", marginBottom: 10 }}
        />

        <div style={{ overflowY: "auto", flex: 1, border: "1px solid #e2e8f0", borderRadius: 10 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</div>
          ) : allSalons.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons available</div>
          ) : filteredSalons.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons match your search</div>
          ) : (
            filteredSalons.map((s) => (
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
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; email: string; phone?: string | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    dispatch(fetchSuperAdminUsersThunk({ role: "branch_owner" }));
    dispatch(fetchSuperAdminSalonsThunk(undefined));
  }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  const branchOwners = users.filter((u: any) => u.role === "branch_owner");

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleDeleteBranchOwner() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const r = await dispatch(deleteUserThunk({ id: deleteTarget.id }));
    setDeleteLoading(false);
    if (deleteUserThunk.fulfilled.match(r)) {
      showToast(`"${deleteTarget.name || deleteTarget.email}" deleted.`);
      load();
    } else {
      showToast((r.payload as any)?.message || "Failed to delete branch owner.", false);
    }
    setDeleteTarget(null);
  }

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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <ActionBtn label="Assign Salons" color="#6366f1" bg="#eef2ff" onClick={() => setAssignTarget({ id: u.id, name: u.name })} disabled={false} />
                      <ActionBtn label="Edit" color="#0f172a" bg="#f1f5f9" onClick={() => setEditTarget({ id: u.id, name: u.name, email: u.email, phone: u.phone })} disabled={false} />
                      <ActionBtn label="Delete" color="#dc2626" bg="#fef2f2" onClick={() => setDeleteTarget({ id: u.id, name: u.name, email: u.email })} disabled={false} />
                    </div>
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

      {editTarget && (
        <EditBranchOwnerModal
          branchOwner={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); showToast("Branch owner updated."); load(); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteBranchOwnerModal
          name={deleteTarget.name}
          email={deleteTarget.email}
          onConfirm={handleDeleteBranchOwner}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      <style>{`@keyframes bo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
