import type { NavigateFunction } from "react-router-dom";
import { store, persistor } from "../store/store";
import { logout } from "../store/authSlice";
import api from "../services/api/axios";
import { AUTH } from "../services/api/endpoints/auth.endpoints";

// Single source of truth for "the user is being logged out" — every Logout
// button, "Log out of all devices" action, and post-account-deletion
// redirect should call this instead of dispatching authSlice's logout()
// directly. That alone only ever reset the auth slice's own fields; this
// closes every other gap:
//   1. Revokes the refresh token server-side (the backend has always had
//      this at POST /auth/logout — the frontend never called it, so a
//      captured refresh token stayed valid indefinitely after "logout").
//   2. Resets EVERY Redux slice back to its own initialState, not just
//      auth — store.ts's root reducer does this for any auth/logout
//      dispatch, so salon/clients/staff/products/RTK-Query-caches/etc. all
//      go with it too. Otherwise the next login on the same browser tab
//      could briefly render the previous user's still-cached data.
//   3. Purges every redux-persist key from localStorage (auth's
//      refreshToken/custom_permissions, shift's staffMembers/shifts,
//      scheduler's serviceStaffCache) — resetting in-memory state alone
//      doesn't touch what's already written to disk.
//   4. Clears localStorage/sessionStorage outright as a final backstop, so
//      "no previous user data remains" holds even for anything written
//      outside redux-persist.
export async function performLogout(navigate: NavigateFunction): Promise<void> {
  const refreshToken = store.getState().auth.refreshToken;

  // Best-effort — a network blip or an already-expired/revoked token must
  // never block the user from actually logging out client-side.
  if (refreshToken) {
    try {
      await api.post(AUTH.LOGOUT, { refreshToken });
    } catch {
      // ignore — client-side cleanup below still proceeds
    }
  }

  store.dispatch(logout());

  try {
    await persistor.purge();
  } catch {
    // storage unavailable (private mode, etc.) — nothing to purge
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // storage unavailable — nothing left to do
  }

  navigate("/login", { replace: true });
}
