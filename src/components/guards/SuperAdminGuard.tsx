import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { refreshSessionThunk } from "../../middleware/auth/authThunk";
import { logout } from "../../store/authSlice";

export default function SuperAdminGuard() {
  const { accessToken, refreshToken, role } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  // On refresh, accessToken is null (not persisted). Wait while we restore it.
  const [restoring, setRestoring] = useState(!accessToken && !!refreshToken);

  useEffect(() => {
    if (!accessToken && refreshToken) {
      dispatch(refreshSessionThunk())
        .unwrap()
        .catch(() => dispatch(logout()))
        .finally(() => setRestoring(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (restoring) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!accessToken) return <Navigate to="/super-admin/login" replace />;
  if (role !== "super_admin") return <Navigate to="/super-admin/login" replace />;

  return <Outlet />;
}
