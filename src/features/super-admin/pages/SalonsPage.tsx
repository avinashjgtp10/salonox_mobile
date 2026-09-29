import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, setSalonStatusThunk, forceOnboardingThunk, impersonateSalonThunk, deleteSalonThunk, createUserThunk, fetchSuperAdminUsersThunk, resetUserPasswordThunk } from "../../../middleware/superAdmin/superAdmin.thunk";
import Pagination from "../components/Pagination";
import { Badge, ActionBtn, Toast } from "../components/SuperAdminUI";
import { EMAIL_REGEX } from "../../../components/Landing/shared";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";

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
      setCoords({ top: rect.bottom + 4, left: rect.right - 160 });
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
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 1000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
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

// Matches the dd MMM yyyy convention used elsewhere in the app (see
// ClientHistoryDetail.tsx's fmtDateShort) — e.g. "19 Jul 2026".
const fmtDateShort = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

// Buckets used by both the "Date Remaining" cell and the expiry filter, so
// a salon showing e.g. "3 days left" always falls under the "Expiring Soon"
// filter option — the two can never disagree about where a salon lands.
type ExpiryBucket = "no_plan" | "expired" | "expiring_soon" | "active" | "long_term";

const EXPIRY_FILTERS: { key: ExpiryBucket; label: string }[] = [
  { key: "expired",       label: "Expired" },
  { key: "expiring_soon", label: "Expiring Soon (≤ 7 days)" },
  { key: "active",        label: "Active (> 7 days)" },
  { key: "no_plan",       label: "No Plan" },
];

function daysRemaining(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function expiryBucket(iso?: string | null): ExpiryBucket {
  const days = daysRemaining(iso);
  if (days === null) return "no_plan";
  if (days < 0) return "expired";
  if (days <= 7) return "expiring_soon";
  if (days <= 30) return "active";
  return "long_term";
}

function DateRemainingCell({ iso }: { iso?: string | null }) {
  const days = daysRemaining(iso);
  if (days === null) return <span style={{ color: "#cbd5e1" }}>—</span>;
  if (days < 0) return <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12.5 }}>Expired {fmtDateShort(iso)}</span>;
  if (days === 0) return <span style={{ color: "#d97706", fontWeight: 700, fontSize: 12.5 }}>Expires today</span>;
  if (days <= 7) return <span style={{ color: "#d97706", fontWeight: 700, fontSize: 12.5 }}>{days} day{days !== 1 ? "s" : ""} left</span>;
  return <span style={{ color: "#374151", fontSize: 12.5 }}>{days} days left</span>;
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

function genPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function ResetPasswordModal({ owner, onClose }: { owner: { id: string; name: string; email: string }; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState(genPassword());
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setSaving(true); setErr("");
    const r = await dispatch(resetUserPasswordThunk({ id: owner.id, password }));
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
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12.5 }}>{owner.name || owner.email}</p>
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

export default function SalonsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { salons, loading } = useAppSelector((s) => s.superAdmin);
  // Salon rows only carry the owner's email/name, not their user id — the
  // reset-password endpoint operates on a user id (/users/:id/reset-password),
  // so owner ids are resolved from the general salon_owner users list by
  // matching email, same source BranchOwnersPage already uses for its own
  // Reset Password action.
  const [ownerIdByEmail, setOwnerIdByEmail] = useState<Record<string, string>>({});
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [search, setSearch]   = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [createdSort, setCreatedSort] = useState<"asc" | "desc" | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryBucket | "">("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
  const [onboardingFilter, setOnboardingFilter] = useState<"done" | "pending" | "">("");
  // "Date Remaining" as an exact manually-typed range — separate from the
  // quick-bucket presets above (expiryFilter), same "custom render field
  // inside the same Filters panel" pattern as Clients' Revenue min/max (see
  // ClientsListPage.tsx's filterFields) — both can be applied together.
  const [expiryDateFrom, setExpiryDateFrom] = useState("");
  const [expiryDateTo, setExpiryDateTo] = useState("");
  // Plan is multi-select (unlike Status/Onboarding/Date Remaining above) —
  // plan_name is free text off subscription_plans.name ("SalonOx Growth",
  // "SalonOx Pro", plain "Pro", etc., not a fixed tier enum), so picking just
  // one at a time would be too narrow; ticking several is an OR within the
  // field, same as every other multi-select JiraFilterMenu field.
  const [planFilter, setPlanFilter] = useState<string[]>([]);
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [createdDateTo, setCreatedDateTo] = useState("");
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");

  // Create account modal
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createErr, setCreateErr]     = useState("");
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; role: string; name: string; status: string } | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", phone: "", role: "salon_owner", business_name: "", address: "" });
  const [showFormPw, setShowFormPw] = useState(false);

  const load = useCallback((q?: string) => { dispatch(fetchSuperAdminSalonsThunk(q)); }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    dispatch(fetchSuperAdminUsersThunk({ role: "salon_owner" })).then((r) => {
      if (fetchSuperAdminUsersThunk.fulfilled.match(r)) {
        const map: Record<string, string> = {};
        for (const u of r.payload) map[u.email.toLowerCase()] = u.id;
        setOwnerIdByEmail(map);
      }
    });
  }, [dispatch]);

  function openCreateModal() {
    const pw = genPassword();
    setForm({ first_name: "", last_name: "", email: "", password: pw, phone: "", role: "salon_owner", business_name: "", address: "" });
    setCreateErr(""); setCreatedUser(null); setShowFormPw(false); setCreateModal(true);
  }

  async function handleCreate() {
    if (!form.first_name.trim()) { setCreateErr("First name is required."); return; }
    if (!form.email.trim()) { setCreateErr("Email is required."); return; }
    if (!EMAIL_REGEX.test(form.email.trim())) { setCreateErr("Enter a valid email address."); return; }
    if (form.password.length < 6) { setCreateErr("Password must be at least 6 characters."); return; }
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 10) { setCreateErr("Phone number must have at least 10 digits."); return; }
    if (form.role === "salon_owner" && !form.business_name.trim()) { setCreateErr("Business name is required for Salon Owner."); return; }
    setCreateErr(""); setCreating(true);
    const r = await dispatch(createUserThunk({
      first_name: form.first_name, last_name: form.last_name || undefined,
      email: form.email, password: form.password,
      phone: form.phone || undefined, role: form.role,
      business_name: form.business_name.trim() || undefined,
      address: form.address.trim() || undefined,
    }));
    setCreating(false);
    if (createUserThunk.fulfilled.match(r)) {
      setCreatedUser({ email: form.email, password: form.password, role: form.role, name: `${form.first_name} ${form.last_name}`.trim(), status: (r.payload as any)?.status || "active" });
      load(search || undefined);
    } else {
      setCreateErr((r.payload as string) || "Failed to create user.");
    }
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

  // Search already hits the backend, which now also matches against a
  // "DD Mon YYYY" formatted created_at (see super-admin.repository.ts::
  // getAllSalons), so typing e.g. "19 Jul 2026" filters by Created Date too.
  // Every other filter below (Status, Onboarding, Plan, Date Remaining
  // bucket, the manually-typed expiry/created date ranges, and Revenue) is
  // applied client-side on top of whatever page of results comes back, then
  // AND-combined — all must match for a salon to stay in the list (Plan
  // itself is multi-select, so a salon matches if it has ANY of the ticked
  // plan names). Sorting by Created Date is applied on top of that.
  const anyFilterActive = !!(
    statusFilter || onboardingFilter || expiryFilter || expiryDateFrom || expiryDateTo ||
    planFilter.length > 0 || createdDateFrom || createdDateTo || minRevenue || maxRevenue
  );

  const expiryFiltered = salons.filter((s: any) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (onboardingFilter === "done" && !s.is_onboarding_complete) return false;
    if (onboardingFilter === "pending" && s.is_onboarding_complete) return false;
    if (expiryFilter && expiryBucket(s.plan_expires_at) !== expiryFilter) return false;
    if (expiryDateFrom || expiryDateTo) {
      if (!s.plan_expires_at) return false;
      const d = String(s.plan_expires_at).slice(0, 10);
      if (expiryDateFrom && d < expiryDateFrom) return false;
      if (expiryDateTo && d > expiryDateTo) return false;
    }
    if (planFilter.length > 0 && !planFilter.includes(s.plan_name || "")) return false;
    if (createdDateFrom || createdDateTo) {
      if (!s.created_at) return false;
      const d = String(s.created_at).slice(0, 10);
      if (createdDateFrom && d < createdDateFrom) return false;
      if (createdDateTo && d > createdDateTo) return false;
    }
    if (minRevenue && Number(s.revenue ?? 0) < Number(minRevenue)) return false;
    if (maxRevenue && Number(s.revenue ?? 0) > Number(maxRevenue)) return false;
    return true;
  });

  const sortedSalons = createdSort
    ? [...expiryFiltered].sort((a: any, b: any) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return createdSort === "asc" ? da - db : db - da;
      })
    : expiryFiltered;

  // Distinct plan_name values actually present in the currently loaded
  // salons — plan_name is free text off subscription_plans.name ("SalonOx
  // Growth", "SalonOx Pro", plain "Pro", etc.), not a fixed tier enum, so
  // the Plan filter's options are derived from real data rather than a
  // hardcoded list that could drift out of sync with it.
  const planOptions = useMemo(() => {
    const names = new Set<string>();
    for (const s of salons as any[]) if (s.plan_name) names.add(s.plan_name);
    return Array.from(names).sort().map((name) => ({ id: name, label: name }));
  }, [salons]);

  // Same "Filters" pattern reports use (JiraFilterMenu — draft state inside
  // the panel, nothing touches the list until Apply is clicked; Clear resets
  // and applies immediately). Status/Onboarding/Date-Remaining-bucket are
  // single-select by convention (last ticked id wins, same as Gender in
  // ClientsListPage.tsx) — "All" is simply nothing ticked. Plan is a normal
  // multi-select checkbox list (OR within the field). "Expiry Date (Manual)",
  // "Created Date (Manual)" and "Revenue" are custom render fields, same
  // escape hatch Clients' Revenue min/max uses, so exact values/ranges can be
  // typed in directly instead of picking a preset.
  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Status", options: [
      { id: "active",   label: "Active" },
      { id: "inactive", label: "Inactive" },
    ] },
    { key: "onboarding", label: "Onboarding", options: [
      { id: "done",    label: "Completed" },
      { id: "pending", label: "Pending" },
    ] },
    { key: "plan", label: "Plan", options: planOptions, searchable: planOptions.length > 8 },
    { key: "expiryBucket", label: "Date Remaining", options: EXPIRY_FILTERS.map(({ key, label }) => ({ id: key, label })) },
    {
      key: "expiryRange",
      label: "Expiry Date (Manual)",
      options: [],
      // draft is [fromISO, toISO]; either half may be blank (open-ended).
      render: (draft, setDraft) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 2 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>From</label>
            <input
              type="date"
              value={draft[0] ?? ""}
              onChange={(e) => setDraft([e.target.value, draft[1] ?? ""])}
              style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>To</label>
            <input
              type="date"
              value={draft[1] ?? ""}
              onChange={(e) => setDraft([draft[0] ?? "", e.target.value])}
              style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "createdRange",
      label: "Created Date (Manual)",
      options: [],
      render: (draft, setDraft) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 2 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>From</label>
            <input
              type="date"
              value={draft[0] ?? ""}
              onChange={(e) => setDraft([e.target.value, draft[1] ?? ""])}
              style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>To</label>
            <input
              type="date"
              value={draft[1] ?? ""}
              onChange={(e) => setDraft([draft[0] ?? "", e.target.value])}
              style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "revenue",
      label: "Revenue (₹)",
      options: [],
      // draft is [min, max]; either half may be blank (open-ended).
      render: (draft, setDraft) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 2 }}>
          <input
            type="number" min="0" placeholder="Min"
            value={draft[0] ?? ""}
            onChange={(e) => setDraft([e.target.value, draft[1] ?? ""])}
            style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
          <span style={{ color: "#94a3b8", fontSize: 12 }}>to</span>
          <input
            type="number" min="0" placeholder="Max"
            value={draft[1] ?? ""}
            onChange={(e) => setDraft([draft[0] ?? "", e.target.value])}
            style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
      ),
    },
  ], [planOptions]);

  const filterMenuSelected = useMemo(() => ({
    status: statusFilter ? [statusFilter] : [],
    onboarding: onboardingFilter ? [onboardingFilter] : [],
    plan: planFilter,
    expiryBucket: expiryFilter ? [expiryFilter] : [],
    expiryRange: (expiryDateFrom || expiryDateTo) ? [expiryDateFrom, expiryDateTo] : [],
    createdRange: (createdDateFrom || createdDateTo) ? [createdDateFrom, createdDateTo] : [],
    revenue: (minRevenue || maxRevenue) ? [minRevenue, maxRevenue] : [],
  }), [statusFilter, onboardingFilter, planFilter, expiryFilter, expiryDateFrom, expiryDateTo, createdDateFrom, createdDateTo, minRevenue, maxRevenue]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    const status = next.status?.length ? next.status[next.status.length - 1] : "";
    const onboarding = next.onboarding?.length ? next.onboarding[next.onboarding.length - 1] : "";
    const bucket = next.expiryBucket?.length ? next.expiryBucket[next.expiryBucket.length - 1] : "";
    const [expFrom = "", expTo = ""] = next.expiryRange ?? [];
    const [createdFrom = "", createdTo = ""] = next.createdRange ?? [];
    const [minRev = "", maxRev = ""] = next.revenue ?? [];
    setStatusFilter(status as "active" | "inactive" | "");
    setOnboardingFilter(onboarding as "done" | "pending" | "");
    setPlanFilter(next.plan ?? []);
    setExpiryFilter(bucket as ExpiryBucket | "");
    setExpiryDateFrom(expFrom);
    setExpiryDateTo(expTo);
    setCreatedDateFrom(createdFrom);
    setCreatedDateTo(createdTo);
    setMinRevenue(minRev);
    setMaxRevenue(maxRev);
    setPage(1);
  };

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

  // The tab must be opened synchronously, right here, before the `await`
  // below — once an async gap passes, browsers stop treating window.open as
  // directly triggered by the click and silently block it (no tab, no
  // error, page just sits there looking like nothing happened). Opening a
  // blank tab now and redirecting it once the token arrives keeps the
  // click's permission alive.
  async function handleImpersonate(id: string) {
    setActionId(id);
    const newTab = window.open("", "_blank");
    const r = await dispatch(impersonateSalonThunk(id));
    if (impersonateSalonThunk.fulfilled.match(r)) {
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
      showToast("Impersonate failed.", false);
    }
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

      {resetTarget && (
        <ResetPasswordModal
          owner={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {/* ── Create Account modal ──────────────────────────────────────────── */}
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
                      <div style={{ color: "#64748b", fontSize: 12, textTransform: "capitalize" }}>{createdUser.role.replace("_", " ")}</div>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <Badge status={createdUser.status} />
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
                  <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { setCreatedUser(null); const pw = genPassword(); setForm({ first_name: "", last_name: "", email: "", password: pw, phone: "", role: "salon_owner", business_name: "", address: "" }); }}>
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
                      { val: "salon_owner",  label: "Salon Owner" },
                      { val: "admin",        label: "Admin" },
                      { val: "staff",        label: "Staff" },
                      { val: "client",       label: "Client" },
                      { val: "branch_owner", label: "Branch Owner" },
                    ].map(({ val, label }) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {form.role === "salon_owner" && (
                  <>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Business Name *</label>
                      <input value={form.business_name} placeholder="e.g. Glamour Studio"
                        onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                        style={{ ...inputStyle }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Business Address <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
                      <input value={form.address} placeholder="e.g. 12 MG Road, Mumbai"
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        style={{ ...inputStyle }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>
                  </>
                )}

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Password *</label>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, password: genPassword() }))}
                      style={{ fontSize: 11.5, color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      ↻ Generate
                    </button>
                  </div>
                  <div style={{ position: "relative" }} className="sa-pw-field">
                    <input type={showFormPw ? "text" : "password"} value={form.password}
                      autoComplete="new-password"
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Salon Management</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
            {anyFilterActive
              ? `${sortedSalons.length} of ${salons.length} salon${salons.length !== 1 ? "s" : ""} match filter`
              : `${salons.length} salon${salons.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
          <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
          <button onClick={openCreateModal} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 2px 10px rgba(99,102,241,0.3)", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4f46e5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#6366f1")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Account
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon", "Owner", "Plan", "Date Remaining", "Staff", "Clients", "Revenue", "Created Date", "Status", "Onboarding", "Actions"].map(h => (
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
                  {[...Array(11)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sa-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedSalons.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No salons found</td></tr>
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
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <DateRemainingCell iso={s.plan_expires_at} />
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
                    <ActionsMenu
                      rowId={s.id}
                      openId={openMenuId}
                      setOpenId={setOpenMenuId}
                      actions={[
                        s.status === "active"
                          ? { label: "Deactivate", color: "#dc2626", bg: "#fef2f2", onClick: () => handleStatus(s.id, false), disabled: actionId === s.id }
                          : { label: "Activate",   color: "#16a34a", bg: "#f0fdf4", onClick: () => handleStatus(s.id, true),  disabled: actionId === s.id },
                        ...(!s.is_onboarding_complete
                          ? [{ label: "Force Complete", color: "#d97706", bg: "#fffbeb", onClick: () => handleOnboarding(s.id), disabled: actionId === s.id }]
                          : []),
                        { label: "Impersonate", color: "#6366f1", bg: "#eef2ff", onClick: () => handleImpersonate(s.id), disabled: actionId === s.id },
                        ...(ownerIdByEmail[String(s.owner_email || "").toLowerCase()]
                          ? [{ label: "Reset Password", color: "#d97706", bg: "#fffbeb", onClick: () => setResetTarget({ id: ownerIdByEmail[String(s.owner_email).toLowerCase()], name: s.owner_name || s.name, email: s.owner_email }) }]
                          : []),
                        { label: "Delete", color: "#dc2626", bg: "#fef2f2", onClick: () => setDeleteTarget({ id: s.id, name: s.name }), disabled: actionId === s.id },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          total={sortedSalons.length} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage}
          itemLabel="salons"
        />
      </div>
      <style>{`
        @keyframes sa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .sa-pw-field input::-ms-reveal, .sa-pw-field input::-ms-clear { display: none; }
      `}</style>
    </div>
  );
}
