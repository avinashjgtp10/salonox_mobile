import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, fetchSuperAdminUsersThunk, fetchBranchOwnerSalonsThunk, assignBranchOwnerSalonsThunk, updateUserThunk, deleteUserThunk, resetUserPasswordThunk, impersonateUserThunk } from "../../../middleware/superAdmin/superAdmin.thunk";
import { Badge, Toast } from "../components/SuperAdminUI";

type MenuAction = { label: string; color: string; bg: string; onClick: () => void; disabled?: boolean };

function ActionsMenu({ actions, rowId, openId, setOpenId }: { actions: MenuAction[]; rowId: string; openId: string | null; setOpenId: (id: string | null) => void }) {
  const open = openId === rowId;
  const [hov, setHov] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpenId(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, setOpenId]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.right - 170 });
    }
    setOpenId(open ? null : rowId);
  }

  return (
    <div style={{ display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={toggle}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        title="Actions"
        style={{ width: 30, height: 30, borderRadius: 7, border: "1.5px solid #e2e8f0", background: hov || open ? "#f8fafc" : "#fff", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
      </button>
      {open && coords && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 10000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 170, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
          {actions.map((a, i) => (
            <button key={i}
              onClick={() => { setOpenId(null); a.onClick(); }}
              disabled={a.disabled}
              style={{ display: "flex", alignItems: "center", padding: "8px 10px", borderRadius: 7, border: "none", background: "transparent", color: a.color, fontSize: 12.5, fontWeight: 600, cursor: a.disabled ? "not-allowed" : "pointer", opacity: a.disabled ? 0.5 : 1, textAlign: "left", transition: "background 0.12s" }}
              onMouseEnter={(e) => !a.disabled && (e.currentTarget.style.background = a.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

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

function genPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function ResetPasswordModal({ branchOwner, onClose }: { branchOwner: { id: string; name: string; email: string }; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState(genPassword());
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setSaving(true); setErr("");
    const r = await dispatch(resetUserPasswordThunk({ id: branchOwner.id, password }));
    setSaving(false);
    if (resetUserPasswordThunk.fulfilled.match(r)) {
      setDone(true);
    } else {
      setErr((r.payload as string) || "Failed to reset password.");
    }
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13.5, color: "#0f172a", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px", width: 420, boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 700 }}>Reset Password</h3>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12.5 }}>{branchOwner.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
        </div>

        {done ? (
          <div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 12px", color: "#15803d", fontSize: 13, fontWeight: 600 }}>✓ Password reset successfully!</p>
              <p style={{ margin: "0 0 6px", color: "#374151", fontSize: 12.5 }}>Share this new password with the user:</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #d1fae5", borderRadius: 8, padding: "9px 12px" }}>
                <div>
                  <div style={{ color: "#64748b", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Password</div>
                  <div style={{ color: "#0f172a", fontSize: 13.5, fontWeight: 600, fontFamily: "monospace" }}>{password}</div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(password)} title="Copy"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", padding: "4px 6px", borderRadius: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>New Password</label>
                <button type="button" onClick={() => setPassword(genPassword())}
                  style={{ fontSize: 11.5, color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  ↻ Generate
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, fontFamily: showPw ? "inherit" : "monospace", paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: 11 }}>Min 6 characters.</p>
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
              <button onClick={handleReset} disabled={saving}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </>
        )}
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

function AssignSalonsModal({ branchOwner, allSalons, onClose, onSaved }: { branchOwner: { id: string; name: string }; allSalons: { id: string; name: string; email: string }[]; onClose: () => void; onSaved: () => void }) {
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
    s.email.toLowerCase().includes(search.trim().toLowerCase())
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
          placeholder="Search by salon email…"
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
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons match that email</div>
          ) : (
            filteredSalons.map((s) => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13.5, color: "#0f172a" }}>
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span>{s.name}</span>
                  <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{s.email}</span>
                </div>
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

const fmtDateShort = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const fmtMoney = (n: any) => (n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

function daysRemaining(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function DateRemainingCell({ iso }: { iso?: string | null }) {
  const days = daysRemaining(iso);
  if (days === null) return <span style={{ color: "#cbd5e1" }}>—</span>;
  if (days < 0) return <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12.5 }}>Expired {fmtDateShort(iso)}</span>;
  if (days === 0) return <span style={{ color: "#d97706", fontWeight: 700, fontSize: 12.5 }}>Expires today</span>;
  if (days <= 7) return <span style={{ color: "#d97706", fontWeight: 700, fontSize: 12.5 }}>{days} day{days !== 1 ? "s" : ""} left</span>;
  return <span style={{ color: "#374151", fontSize: 12.5 }}>{days} days left</span>;
}

function StatChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", minWidth: 110 }}>
      <div style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function BranchOwnerDetailModal({ branchOwner, allSalons, onClose }: { branchOwner: { id: string; name: string; email: string; status: string; phone?: string | null }; allSalons: any[]; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [assignedIds, setAssignedIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const r = await dispatch(fetchBranchOwnerSalonsThunk(branchOwner.id));
      if (!cancelled && fetchBranchOwnerSalonsThunk.fulfilled.match(r)) {
        setAssignedIds(new Set((r.payload as any[]).map((s) => s.id)));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [branchOwner.id, dispatch]);

  async function handleUnassign(salonId: string) {
    if (!assignedIds) return;
    setUnassigningId(salonId);
    const remaining = Array.from(assignedIds).filter((id) => id !== salonId);
    const r = await dispatch(assignBranchOwnerSalonsThunk({ branchOwnerId: branchOwner.id, salonIds: remaining }));
    setUnassigningId(null);
    if (assignBranchOwnerSalonsThunk.fulfilled.match(r)) {
      setAssignedIds(new Set(remaining));
    }
  }

  const assignedSalons = assignedIds ? allSalons.filter((s: any) => assignedIds.has(s.id)) : [];
  const totalStaff = assignedSalons.reduce((sum, s) => sum + (s.staff_count ?? 0), 0);
  const totalRevenue = assignedSalons.reduce((sum, s) => sum + (s.revenue ?? 0), 0);
  const activePlans = assignedSalons.filter((s) => (daysRemaining(s.plan_expires_at) ?? -1) >= 0).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px", width: 760, maxWidth: "95vw", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17, fontWeight: 700 }}>{branchOwner.name}</h3>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12.5 }}>
              {branchOwner.email}{branchOwner.phone ? ` · ${branchOwner.phone}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge status={branchOwner.status} />
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <StatChip label="Assigned Salons" value={assignedSalons.length} />
          <StatChip label="Total Staff" value={totalStaff} />
          <StatChip label="Total Revenue" value={fmtMoney(totalRevenue)} />
          <StatChip label="Active Plans" value={activePlans} />
        </div>

        <div style={{ overflowY: "auto", flex: 1, border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Salon", "Plan", "Subscription", "Staff", "Clients", "Revenue", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#f8fafc" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</td></tr>
              ) : assignedSalons.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons assigned yet</td></tr>
              ) : (
                assignedSalons.map((s: any) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px", color: "#0f172a", fontWeight: 700 }}>{s.name}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {s.plan_name ? <span style={{ color: "#6366f1", fontWeight: 600, fontSize: 12 }}>{s.plan_name}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      <DateRemainingCell iso={s.plan_expires_at} />
                    </td>
                    <td style={{ padding: "11px 14px", color: "#374151" }}>{s.staff_count ?? "—"}</td>
                    <td style={{ padding: "11px 14px", color: "#374151" }}>{s.client_count ?? "—"}</td>
                    <td style={{ padding: "11px 14px", color: "#16a34a", fontWeight: 700 }}>{fmtMoney(s.revenue)}</td>
                    <td style={{ padding: "11px 14px" }}><Badge status={s.status} /></td>
                    <td style={{ padding: "11px 14px" }}>
                      <ActionsMenu
                        rowId={s.id}
                        openId={openMenuId}
                        setOpenId={setOpenMenuId}
                        actions={[
                          { label: "View Salon", color: "#6366f1", bg: "#eef2ff", onClick: () => navigate(`/super-admin/salons/${s.id}`) },
                          { label: unassigningId === s.id ? "Unassigning…" : "Unassign", color: "#dc2626", bg: "#fef2f2", onClick: () => handleUnassign(s.id), disabled: unassigningId === s.id },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
  const [detailTarget, setDetailTarget] = useState<{ id: string; name: string; email: string; status: string; phone?: string | null } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    dispatch(fetchSuperAdminUsersThunk({ role: "branch_owner" }));
    dispatch(fetchSuperAdminSalonsThunk(undefined));
  }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  const branchOwners = users.filter((u: any) => u.role === "branch_owner");
  const totalBranches = branchOwners.reduce((sum: number, u: any) => sum + (u.branch_count ?? 0), 0);
  const activeBranchOwners = branchOwners.filter((u: any) => u.status === "active").length;
  const avgBranches = branchOwners.length ? (totalBranches / branchOwners.length) : 0;

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

  // Mints a token for the account and opens its dashboard in a new tab.
  // The tab must be opened synchronously, right here, before the `await`
  // below — once an async gap passes, browsers stop treating window.open as
  // directly triggered by the click and silently block it (no tab, no
  // error, page just sits there looking like nothing happened). Opening a
  // blank tab now and redirecting it once the token arrives keeps the
  // click's permission alive.
  async function handleImpersonate(id: string) {
    setActionId(id);
    const newTab = window.open("", "_blank");
    const r = await dispatch(impersonateUserThunk(id));
    if (impersonateUserThunk.fulfilled.match(r)) {
      const { token, refreshToken, isOnboardingComplete = true } = (r.payload as any) ?? {};
      if (!newTab) {
        showToast("Popup blocked — please allow popups for this site and try again.", false);
      } else if (token) {
        const params = new URLSearchParams({ token, isOnboardingComplete: String(isOnboardingComplete) });
        if (refreshToken) params.set("refreshToken", refreshToken);
        newTab.location.href = `${window.location.origin}/oauth/success?${params.toString()}`;
      }
    } else {
      newTab?.close();
      showToast((r.payload as string) || "Impersonate failed.", false);
    }
    setActionId(null);
  }

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {toast && <Toast {...toast} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Branch Owners</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{branchOwners.length} branch owner{branchOwners.length !== 1 ? "s" : ""}</p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatChip label="Branch Owners" value={branchOwners.length} />
        <StatChip label="Active" value={activeBranchOwners} />
        <StatChip label="Total Branches" value={totalBranches} />
        <StatChip label="Avg Branches / Owner" value={avgBranches.toFixed(1)} />
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 500 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Name", "Email", "Status", "Salon Count", "Created", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.users ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bo-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : branchOwners.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>
                No branch owners yet. Create one from the Salons page (Create Account → Role: Branch Owner).
              </td></tr>
            ) : (
              branchOwners.map((u: any) => (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => setDetailTarget({ id: u.id, name: u.name, email: u.email, status: u.status, phone: u.phone })}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{u.name}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{u.email}</td>
                  <td style={{ padding: "13px 16px" }}><Badge status={u.status} /></td>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 600 }}>{u.branch_count ?? 0}</td>
                  <td style={{ padding: "13px 16px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtDateShort(u.created_at)}</td>
                  <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <ActionsMenu
                      rowId={u.id}
                      openId={openMenuId}
                      setOpenId={setOpenMenuId}
                      actions={[
                        { label: "Assign Salons",  color: "#6366f1", bg: "#eef2ff", onClick: () => setAssignTarget({ id: u.id, name: u.name }) },
                        { label: "Impersonate",    color: "#6366f1", bg: "#eef2ff", onClick: () => handleImpersonate(u.id), disabled: actionId === u.id },
                        { label: "Edit",           color: "#0f172a", bg: "#f1f5f9", onClick: () => setEditTarget({ id: u.id, name: u.name, email: u.email, phone: u.phone }) },
                        { label: "Reset Password", color: "#d97706", bg: "#fffbeb", onClick: () => setResetTarget({ id: u.id, name: u.name, email: u.email }) },
                        { label: "Delete",         color: "#dc2626", bg: "#fef2f2", onClick: () => setDeleteTarget({ id: u.id, name: u.name, email: u.email }) },
                      ]}
                    />
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
          allSalons={salons.map((s: any) => ({ id: s.id, name: s.name, email: s.owner_email }))}
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

      {detailTarget && (
        <BranchOwnerDetailModal
          branchOwner={detailTarget}
          allSalons={salons}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          branchOwner={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      <style>{`@keyframes bo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
