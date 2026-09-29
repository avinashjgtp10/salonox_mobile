import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { refreshSessionThunk } from "../../middleware/auth/authThunk";
import { logout } from "../../store/authSlice";

export default function BranchOwnerGuard() {
  const { accessToken, refreshToken, role } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

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

  // Rendered as null, not a spinner element, while restoring — restoring
  // only ever goes true -> false once (never back to true after mount), so
  // null here means nothing under this guard exists yet to tear down when it
  // switches to <Outlet/>. A spinner <div/> in its place would make that
  // switch a real element-type change at the same position, forcing React to
  // unmount/remount the routed page (and re-fire its data-fetching effects)
  // the instant the token restore finishes, on every page refresh.
  if (restoring) return null;
  if (!accessToken) return <Navigate to="/login" replace />;
  if (role !== "branch_owner") return <Navigate to="/login" replace />;

  return <Outlet />;
}
