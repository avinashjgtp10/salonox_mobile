import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Modal } from "../../../components/ui";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { closeCashCounterThunk } from "../../../middleware/cashCounter/cashCounter.thunk";
import { logout } from "../../../store/authSlice";
import { disconnectSocket } from "../../../services/socket/socket";

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Cash Management owns the full close-counter form (manual in-store-cash
// entry) for reconciling a stale counter — this lightweight app-wide popup
// steps aside there instead of stacking a second modal on top of it.
const CASH_MANAGEMENT_PATH = "/dashboard/cash-management";

// Mounted once at the dashboard layout level so it can catch a counter left
// open from a previous day on ANY page, not just Cash Management — per the
// "auto detect and prevent opening a new counter" requirement. Driven purely
// by the shared cashCounter Redux state, so once the stale counter is closed
// (from here or from Cash Management) it disappears on its own everywhere.
export default function UnclosedCounterGate() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboard = useAppSelector((state) => state.cashCounter.dashboard);

  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");

  const today = formatDateInput(new Date());
  const openedDateKey = dashboard?.openedAt ? formatDateInput(new Date(dashboard.openedAt)) : null;
  const isStaleOpenCounter =
    Boolean(dashboard?.cashManagementId) &&
    dashboard?.status === "open" &&
    openedDateKey !== null &&
    openedDateKey !== today;

  const isOnCashManagementPage = location.pathname.startsWith(CASH_MANAGEMENT_PATH);
  const show = isStaleOpenCounter && !isOnCashManagementPage;

  const handleClosePreviousCounter = useCallback(async () => {
    if (!dashboard?.cashManagementId) return;
    setClosing(true);
    setError("");
    try {
      // `inStoreCash`/`closingBalance` can arrive as null (uncomputed for a
      // still-open counter) or, rarely, negative (expenses outran cash on
      // hand). `||` treats a legitimate 0 as "missing" and falls through, and
      // a null/non-numeric value serializes to JSON `null` — which the
      // backend rejects as "must be a non-negative number" since there's no
      // input field here for the user to correct it. Coerce explicitly and
      // clamp to 0 so this auto-close path always sends a valid number.
      const candidate = dashboard.inStoreCash ?? dashboard.closingBalance ?? 0;
      const numericInStoreCash = Number(candidate);
      const inStoreCash = Number.isFinite(numericInStoreCash) ? Math.max(0, numericInStoreCash) : 0;

      await dispatch(
        closeCashCounterThunk({
          cash_management_id: dashboard.cashManagementId,
          in_store_cash: inStoreCash,
          remarks: dashboard.remarks ?? "",
        }),
      ).unwrap();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          err?.response?.data?.error ??
          err?.message ??
          "Failed to close the previous counter.",
      );
    } finally {
      setClosing(false);
    }
  }, [dashboard, dispatch]);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    dispatch(logout());
    navigate("/login");
  }, [dispatch, navigate]);

  return (
    <Modal
      show={show}
      onClose={() => {}}
      hideCloseButton
      title="Cash Counter Pending"
      size="sm"
      footer={
        <div className="topbar-confirm-footer">
          <Button variant="ghost" onClick={handleLogout} disabled={closing}>
            Logout
          </Button>
          <Button
            variant="dark"
            loading={closing}
            disabled={closing}
            onClick={() => void handleClosePreviousCounter()}
          >
            Close Previous Counter
          </Button>
        </div>
      }
    >
      <p className="topbar-confirm-copy">
        Previous day's cash counter is still open. Please close it first before opening today's
        counter.
      </p>
      {error ? (
        <p className="topbar-confirm-copy topbar-confirm-copy--error">{error}</p>
      ) : null}
    </Modal>
  );
}
