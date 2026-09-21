import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../../store/authSlice";

// Also the landing page for super-admin "Impersonate" links (opened via
// window.open, see BranchOwnersPage/SalonsPage handleImpersonate) — those
// tokens can carry a role other than salon owner (e.g. branch_owner), which
// has its own guarded dashboard route, so the landing route below is decided
// from the token's own `role` claim rather than always assuming /dashboard.
function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded))?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * OAuthSuccessPage
 * ─────────────────
 * The backend redirects here after a successful Google sign-in:
 *   /oauth/success?token=ACCESS_TOKEN&refreshToken=REFRESH_TOKEN
 *
 * We read the token, persist it in Redux + localStorage, and
 * send the user on to the dashboard.
 */
export default function OAuthSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const accessToken = params.get("accessToken") || params.get("token");
    const refreshToken = params.get("refreshToken");
    const isOnboardingComplete = params.get("isOnboardingComplete") === "true";

    if (!accessToken) {
      alert("Google login failed: no token received.");
      navigate("/login");
      return;
    }

    // Dispatch the tokens and status
    dispatch(login({ accessToken, refreshToken, isOnboardingComplete }));

    const role = decodeRole(accessToken);
    if (role === "branch_owner") {
      navigate("/branch-owner");
    } else if (role === "super_admin") {
      navigate("/super-admin");
    } else if (isOnboardingComplete) {
      navigate("/dashboard");
    } else {
      navigate("/business-name");
    }
  }, []);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border text-dark mb-3" role="status" />
        <p className="text-muted">Signing you in with Google...</p>
      </div>
    </div>
  );
}
