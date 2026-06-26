import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Pagination from "../components/Pagination";
import {
  fetchSuperAdminUsersThunk,
  setUserStatusThunk,
  setUserRoleThunk,
  resetUserPasswordThunk,
  deleteUserThunk,
  impersonateUserThunk,
  createUserThunk,
} from "../../../middleware/superAdmin/superAdmin.thunk";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  salon_owner: { bg: "#eef2ff", text: "#6366f1" },
  admin:       { bg: "#eff6ff", text: "#3b82f6" },
  staff:       { bg: "#f0fdf4", text: "#16a34a" },
  client:      { bg: "#f8fafc", text: "#64748b" },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? { bg: "#f8fafc", text: "#64748b" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>
      {role?.replace("_", " ")}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px", width: 420, boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`, color: ok ? "#15803d" : "#dc2626", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
      {ok ? "✓ " : "✗ "}{msg}
    </div>
  );
}

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const { users, loading } = useAppSelector((s) => s.superAdmin);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRole]       = useState("");
  const [loginFilter, setLoginFilter] = useState<number | "">("");
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const [roleModal, setRoleModal] = useState<{ id: string; current: string } | null>(null);
  const [pwModal, setPwModal]     = useState<{ id: string; name: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deleteOwnssalon, setDeleteOwnsalon] = useState(false);
  const [newRole, setNewRole]     = useState("");
  const [newPw, setNewPw]         = useState("");

  // Create user modal
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createErr, setCreateErr]     = useState("");
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; role: string; name: string } | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", phone: "", role: "salon_owner" });
  const [showFormPw, setShowFormPw] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchSuperAdminUsersThunk({
      search:     search     || undefined,
      role:       roleFilter || undefined,
      min_logins: loginFilter !== "" ? loginFilter : undefined,
    }));
    setPage(1);
  }, [dispatch, search, roleFilter, loginFilter]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleStatus(id: string, activate: boolean) {
    setActionId(id);
    const r = await dispatch(setUserStatusThunk({ id, is_active: activate }));
    setUserStatusThunk.fulfilled.match(r) ? showToast(`User ${activate ? "activated" : "deactivated"}.`) : showToast("Action failed.", false);
    load(); setActionId(null);
  }

  async function handleRoleChange() {
    if (!roleModal || !newRole) return;
    setActionId(roleModal.id);
    const r = await dispatch(setUserRoleThunk({ id: roleModal.id, role: newRole }));
    setUserRoleThunk.fulfilled.match(r) ? showToast("Role updated.") : showToast("Failed to update role.", false);
    setRoleModal(null); setNewRole(""); load(); setActionId(null);
  }

  async function handlePasswordReset() {
    if (!pwModal || !newPw) return;
    setActionId(pwModal.id);
    const r = await dispatch(resetUserPasswordThunk({ id: pwModal.id, password: newPw }));
    resetUserPasswordThunk.fulfilled.match(r) ? showToast("Password reset successfully.") : showToast("Failed to reset password.", false);
    setPwModal(null); setNewPw(""); setActionId(null);
  }

  async function handleDeleteUser(force = false) {
    if (!deleteModal) return;
    setActionId(deleteModal.id);
    const r = await dispatch(deleteUserThunk({ id: deleteModal.id, force }));
    if (deleteUserThunk.fulfilled.match(r)) {
      showToast(force ? "User and all salon data deleted successfully." : "User deleted successfully.");
      setDeleteModal(null);
      setDeleteOwnsalon(false);
      load();
    } else {
      const payload = r.payload as { message: string; code?: string };
      if (payload?.code === "USER_OWNS_SALON") {
        setDeleteOwnsalon(true);
      } else {
        showToast(payload?.message || "Failed to delete user.", false);
      }
    }
    setActionId(null);
  }

  async function handleImpersonate(id: string) {
    setActionId(id);
    const r = await dispatch(impersonateUserThunk(id));
    if (impersonateUserThunk.fulfilled.match(r)) {
      const { token, isOnboardingComplete } = r.payload as any;
      if (token) {
        window.open(
          `${window.location.origin}/oauth/success?token=${token}&isOnboardingComplete=${isOnboardingComplete}`,
          "_blank"
        );
      }
    } else {
      showToast("Failed to access account.", false);
    }
    setActionId(null);
  }

  function genPassword() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  function openCreateModal() {
    const pw = genPassword();
    setForm({ first_name: "", last_name: "", email: "", password: pw, phone: "", role: "salon_owner" });
    setCreateErr(""); setCreatedUser(null); setShowFormPw(false); setCreateModal(true);
  }

  async function handleCreate() {
    if (!form.first_name.trim()) { setCreateErr("First name is required."); return; }
    if (!form.email.trim()) { setCreateErr("Email is required."); return; }
    if (form.password.length < 6) { setCreateErr("Password must be at least 6 characters."); return; }
    setCreateErr(""); setCreating(true);
    const r = await dispatch(createUserThunk({
      first_name: form.first_name, last_name: form.last_name || undefined,
      email: form.email, password: form.password,
      phone: form.phone || undefined, role: form.role,
    }));
    setCreating(false);
    if (createUserThunk.fulfilled.match(r)) {
      setCreatedUser({ email: form.email, password: form.password, role: form.role, name: `${form.first_name} ${form.last_name}`.trim() });
      load();
    } else {
      setCreateErr((r.payload as string) || "Failed to create user.");
    }
  }

  function initials(name: string) {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1.5px solid #e2e8f0", background: "#fff",
    color: "#0f172a", fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const btnPrimary: React.CSSProperties = {
    flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
    background: "#6366f1", color: "#fff",
    fontWeight: 700, fontSize: 14, cursor: "pointer",
  };

  const btnSecondary: React.CSSProperties = {
    flex: 1, padding: "10px 0", borderRadius: 8,
    border: "1.5px solid #e2e8f0", background: "#fff",
    color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer",
  };

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {toast && <Toast {...toast} />}

      {/* ── Create User modal ─────────────────────────────────────────────── */}
      {createModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px", width: 480, boxShadow: "0 24px 48px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17, fontWeight: 700 }}>Create New Account</h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12.5 }}>Account credentials will be shared with the user</p>
              </div>
              <button onClick={() => setCreateModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
            </div>

            {/* Success state — show credentials */}
            {createdUser ? (
              <div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                      {createdUser.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{createdUser.name}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{createdUser.role.replace("_", " ")}</div>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 12px", color: "#15803d", fontSize: 13, fontWeight: 600 }}>✓ Account created successfully!</p>
                  <p style={{ margin: "0 0 6px", color: "#374151", fontSize: 12.5 }}>Share these credentials with the user:</p>
                  {[{ label: "Email", val: createdUser.email }, { label: "Password", val: createdUser.password }].map(({ label, val }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #d1fae5", borderRadius: 8, padding: "9px 12px", marginBottom: 6 }}>
                      <div>
                        <div style={{ color: "#64748b", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                        <div style={{ color: "#0f172a", fontSize: 13.5, fontWeight: 600, fontFamily: "monospace" }}>{val}</div>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(val)} title="Copy"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", padding: "4px 6px", borderRadius: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </div>
                  ))}
                  <p style={{ margin: "10px 0 0", color: "#6b7280", fontSize: 11.5 }}>
                    The user can log in at <strong>your app's login page</strong> with these credentials.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...btnSecondary, flex: 1 }} onClick={() => setCreateModal(false)}>Close</button>
                  <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { setCreatedUser(null); const pw = genPassword(); setForm({ first_name: "", last_name: "", email: "", password: pw, phone: "", role: "salon_owner" }); }}>
                    Create Another
                  </button>
                </div>
              </div>
            ) : (
              /* Form state */
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "First Name *", key: "first_name", placeholder: "John" },
                    { label: "Last Name",    key: "last_name",  placeholder: "Doe" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>
                      <input value={(form as any)[key]} placeholder={placeholder}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        style={{ ...inputStyle }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Email Address *</label>
                  <input type="email" value={form.email} placeholder="user@example.com"
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    style={{ ...inputStyle }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Phone (optional)</label>
                  <input value={form.phone} placeholder="+91 98765 43210"
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    style={{ ...inputStyle }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Role *</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                    {[
                      { val: "salon_owner", label: "Salon Owner" },
                      { val: "admin",       label: "Admin" },
                      { val: "staff",       label: "Staff" },
                      { val: "client",      label: "Client" },
                    ].map(({ val, label }) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Password *</label>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, password: genPassword() }))}
                      style={{ fontSize: 11.5, color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      ↻ Generate
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showFormPw ? "text" : "password"} value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      style={{ ...inputStyle, fontFamily: showFormPw ? "inherit" : "monospace", paddingRight: 40 }}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                    />
                    <button type="button" onClick={() => setShowFormPw((v) => !v)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
                      {showFormPw
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                  <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: 11 }}>Min 6 characters. This will be the user's login password.</p>
                </div>

                {createErr && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                    {createErr}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button style={btnSecondary} onClick={() => setCreateModal(false)}>Cancel</button>
                  <button style={{ ...btnPrimary, opacity: creating ? 0.7 : 1 }} onClick={handleCreate} disabled={creating}>
                    {creating ? "Creating…" : "Create Account"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Role modal */}
      {roleModal && (
        <Modal title="Change User Role" onClose={() => setRoleModal(null)}>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Select a new role for this user.</p>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
            style={{ ...inputStyle, marginBottom: 20, appearance: "none" }}>
            <option value="">Select role…</option>
            {["salon_owner", "admin", "staff", "client"].map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnSecondary} onClick={() => setRoleModal(null)}>Cancel</button>
            <button style={btnPrimary} onClick={handleRoleChange} disabled={!newRole}>Save</button>
          </div>
        </Modal>
      )}

      {/* Password reset modal */}
      {pwModal && (
        <Modal title={`Reset Password — ${pwModal.name}`} onClose={() => setPwModal(null)}>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Enter a new password for this user (min 6 characters).</p>
          <input type="password" placeholder="New password" value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            style={{ ...inputStyle, marginBottom: 20 }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnSecondary} onClick={() => setPwModal(null)}>Cancel</button>
            <button style={btnPrimary} onClick={handlePasswordReset} disabled={newPw.length < 6}>Reset Password</button>
          </div>
        </Modal>
      )}

      {/* Delete user modal */}
      {deleteModal && (
        <Modal title="Delete User" onClose={() => { setDeleteModal(null); setDeleteOwnsalon(false); }}>
          {deleteOwnssalon ? (
            <>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ color: "#9a3412", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>This user owns a salon.</div>
                <div style={{ color: "#7c2d12", fontSize: 12.5, lineHeight: 1.5 }}>
                  Force deleting will permanently remove <strong>{deleteModal.name || deleteModal.email}</strong> and all their salon data — including appointments, clients, staff, billing, and settings. This cannot be undone.
                </div>
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>{deleteModal.email}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btnSecondary} onClick={() => { setDeleteModal(null); setDeleteOwnsalon(false); }}>Cancel</button>
                <button
                  style={{ ...btnPrimary, background: "#dc2626", opacity: actionId === deleteModal.id ? 0.7 : 1 }}
                  onClick={() => handleDeleteUser(true)}
                  disabled={actionId === deleteModal.id}
                >
                  {actionId === deleteModal.id ? "Deleting..." : "Force Delete Everything"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ color: "#991b1b", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>This action cannot be undone.</div>
                <div style={{ color: "#7f1d1d", fontSize: 12.5, lineHeight: 1.5 }}>
                  You are about to permanently delete <strong>{deleteModal.name || deleteModal.email}</strong>.
                </div>
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>{deleteModal.email}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btnSecondary} onClick={() => setDeleteModal(null)}>Cancel</button>
                <button
                  style={{ ...btnPrimary, background: "#dc2626", opacity: actionId === deleteModal.id ? 0.7 : 1 }}
                  onClick={() => handleDeleteUser(false)}
                  disabled={actionId === deleteModal.id}
                >
                  {actionId === deleteModal.id ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>User Management</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{users.length} user{users.length !== 1 ? "s" : ""} across platform</p>
        </div>
        <button onClick={openCreateModal} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 2px 10px rgba(99,102,241,0.3)", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#4f46e5")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#6366f1")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Account
        </button>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email…"
              style={{ padding: "9px 14px 9px 34px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none", width: 220, transition: "border-color 0.15s" }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRole(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, outline: "none", appearance: "none", cursor: "pointer" }}>
            <option value="">All Roles</option>
            {["salon_owner", "admin", "staff", "client"].map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
          <select value={loginFilter} onChange={(e) => setLoginFilter(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, outline: "none", appearance: "none", cursor: "pointer" }}>
            <option value="">All Activity</option>
            <option value={5}>Frequent (5+ logins)</option>
            <option value={20}>Very Frequent (20+ logins)</option>
            <option value={50}>Power Users (50+ logins)</option>
          </select>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 860 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["User", "Contact", "Role", "Salon", "Status", "Login Count", "Last Active", "Actions"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.users ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sa-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No users found</td></tr>
            ) : (
              users.slice((page - 1) * perPage, page * perPage).map((u: any) => (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 13.5 }}>{u.name || "—"}</div>
                        <div style={{ color: "#cbd5e1", fontSize: 11 }}>ID: {u.id?.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#374151", fontSize: 13 }}>{u.email}</div>
                    {u.phone && <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{u.phone}</div>}
                  </td>
                  <td style={{ padding: "13px 16px" }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{u.salon_name || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: u.is_active ? "#f0fdf4" : "#fef2f2", color: u.is_active ? "#16a34a" : "#dc2626" }}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", textAlign: "center" }}>
                    {(u.login_count ?? 0) > 0 ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                        background: (u.login_count ?? 0) >= 50 ? "#fef3c7" : (u.login_count ?? 0) >= 20 ? "#ede9fe" : "#eff6ff",
                        color:      (u.login_count ?? 0) >= 50 ? "#d97706" : (u.login_count ?? 0) >= 20 ? "#7c3aed"  : "#3b82f6",
                      }}>
                        {(u.login_count ?? 0) >= 50 ? "🔥" : (u.login_count ?? 0) >= 20 ? "⚡" : ""}
                        {u.login_count ?? 0}
                      </span>
                    ) : (
                      <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12 }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <button onClick={() => handleImpersonate(u.id)}
                        disabled={actionId === u.id || !u.is_active}
                        title="Open this user's account in a new tab"
                        style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, border: "1.5px solid #6366f1", background: "#eef2ff", color: "#6366f1", cursor: actionId === u.id || !u.is_active ? "not-allowed" : "pointer", opacity: !u.is_active ? 0.45 : 1, display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                        Login As
                      </button>
                      <button onClick={() => { setRoleModal({ id: u.id, current: u.role }); setNewRole(u.role); }}
                        disabled={actionId === u.id}
                        style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #64748b", background: "#fff", color: "#64748b", cursor: "pointer" }}>
                        Role
                      </button>
                      <button onClick={() => setPwModal({ id: u.id, name: u.name })}
                        disabled={actionId === u.id}
                        style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #d97706", background: "#fff", color: "#d97706", cursor: "pointer" }}>
                        Reset PW
                      </button>
                      {u.is_active
                        ? <button onClick={() => handleStatus(u.id, false)} disabled={actionId === u.id}
                            style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                            Disable
                          </button>
                        : <button onClick={() => handleStatus(u.id, true)} disabled={actionId === u.id}
                            style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #16a34a", background: "#fff", color: "#16a34a", cursor: "pointer" }}>
                            Enable
                          </button>
                      }
                      <button onClick={() => setDeleteModal({ id: u.id, name: u.name, email: u.email })}
                        disabled={actionId === u.id}
                        style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, border: "1.5px solid #b91c1c", background: "#fef2f2", color: "#b91c1c", cursor: actionId === u.id ? "not-allowed" : "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          total={users.length} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage}
          itemLabel="users"
        />
      </div>
      <style>{`@keyframes sa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
