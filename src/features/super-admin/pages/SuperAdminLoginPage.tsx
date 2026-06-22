import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { login as loginAction } from "../../../store/authSlice";
import api from "../../../services/api/axios";
import { SUPER_ADMIN } from "../../../services/api/endpoints/superAdmin.endpoints";

export default function SuperAdminLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accessToken, role } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (accessToken && role === "super_admin") navigate("/super-admin", { replace: true });
  }, [accessToken, role, navigate]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    setError("");
    setLoading(true);
    try {
      const res  = await api.post(SUPER_ADMIN.LOGIN, { email, password });
      const data = res.data?.data ?? res.data;
      if (data?.user?.role !== "super_admin") { setError("Access denied. Super admin credentials required."); return; }
      dispatch(loginAction({ accessToken: data.accessToken, refreshToken: data.refreshToken ?? null, isOnboardingComplete: true }));
      navigate("/super-admin", { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? "";
      setError(msg.includes("credentials") || msg.includes("Invalid") ? "Invalid email or password." : (msg || "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "#f8fafc",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    }}>
      {/* Left panel */}
      <div style={{
        width: 480, background: "linear-gradient(145deg,#4f46e5 0%,#7c3aed 100%)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 52px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>SalonOx</span>
        </div>

        <div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Super Admin Portal</div>
          <h1 style={{ color: "#fff", fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: "0 0 20px", letterSpacing: "-0.5px" }}>
            Complete control<br/>of your platform
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Manage salons, users, subscriptions, and platform settings from one centralised dashboard.
          </p>

          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "🏪", label: "Salon Management — activate, impersonate, onboard" },
              { icon: "👥", label: "User Management — roles, passwords, status" },
              { icon: "💳", label: "Billing — subscriptions, plans, payments" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,0.8)", fontSize: 13.5 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>
          This portal is monitored and access is logged.
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
              Sign in
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14.5 }}>
              Enter your super admin credentials below.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} placeholder="admin@salonox.com"
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 14.5, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} value={password} placeholder="••••••••••"
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  style={{ width: "100%", padding: "11px 42px 11px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 14.5, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e)  => (e.target.style.borderColor = "#e2e8f0")}
                />
                <button type="button" onClick={() => setShowPass((p) => !p)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex" }}>
                  {showPass
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "11px 14px", color: "#dc2626", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button onClick={handleLogin} disabled={loading} style={{
              width: "100%", padding: "12px 0", borderRadius: 9, border: "none",
              background: loading ? "#a5b4fc" : "#6366f1",
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 2px 12px rgba(99,102,241,0.3)",
              transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "sa-spin 0.7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Signing in…</>
              ) : "Sign In →"}
            </button>
          </div>

          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12.5, marginTop: 28 }}>
            Protected by SalonOx Security. All access is logged.
          </p>
        </div>
      </div>

      <style>{`@keyframes sa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
