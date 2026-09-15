import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  closeCashCounterThunk,
  openCashCounterThunk,
} from "../../../middleware/cashCounter/cashCounter.thunk";
import { logout } from "../../../store/authSlice";
import { disconnectSocket } from "../../../services/socket/socket";
import { sendDailySummaryEmail } from "../cashManagement.api";
import { CloseCounterModal, OpenCounterModal } from "../pages/CashManagementModals";
import type { CloseCounterPayload } from "../cashManagement.types";
import { showGlobalToast } from "../../../utils/globalToast";

import { selectUserProfile } from "../../../store/selectors/slices.selectors";

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
  const cashCounterLoading = useAppSelector((state) => state.cashCounter.loading);
  const userProfile = useAppSelector(selectUserProfile);
  const userEmail = userProfile?.email;
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [closing, setClosing] = useState(false);
  const [showOpenTodayModal, setShowOpenTodayModal] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(false);

  const today = formatDateInput(new Date());
  const openedDateKey = dashboard?.openedAt ? formatDateInput(new Date(dashboard.openedAt)) : null;
  const isStaleOpenCounter =
    Boolean(dashboard?.cashManagementId) &&
    dashboard?.status === "open" &&
    openedDateKey !== null &&
    openedDateKey !== today;

  const isOnCashManagementPage = location.pathname.startsWith(CASH_MANAGEMENT_PATH);
  const show = isStaleOpenCounter && !isOnCashManagementPage;
  // `!overlay` matters right after opening today's counter: `dashboard` can
  // briefly still reflect the old stale-counter state for one render before
  // the just-opened counter's data lands, which would otherwise flash this
  // modal back up directly on top of the "opened successfully" confirmation.
  // It simply reappears once the overlay clears, if the stale counter is
  // somehow still genuinely open.
  const showPendingModal = show && !showOpenTodayModal && !overlay;

  // Previous day's counter closed properly (or never opened) and today has
  // no counter yet — distinct from the stale case above, which still has a
  // counter left open from a prior day. CashManagementPage already prompts
  // for this on its own page, so this only covers every other page, mirroring
  // isOnCashManagementPage's exclusion above.
  const dashboardLoaded = dashboard !== null;
  const hasOpenCounterToday =
    Boolean(dashboard?.cashManagementId) && dashboard?.status === "open" && !isStaleOpenCounter;
  const closedToday =
    Boolean(dashboard?.cashManagementId) &&
    dashboard?.status === "closed" &&
    openedDateKey !== null &&
    openedDateKey === today;
  const needsOpenCounterToday =
    dashboardLoaded && !isStaleOpenCounter && !hasOpenCounterToday && !closedToday;

  useEffect(() => {
    if (cashCounterLoading || !dashboardLoaded || isOnCashManagementPage) return;
    if (needsOpenCounterToday) {
      setShowOpenTodayModal(true);
    } else if (hasOpenCounterToday) {
      // Counter is open for today (the normal case) — dismiss the forced
      // modal so it doesn't stay stuck open once the real state arrives.
      setShowOpenTodayModal(false);
    }
  }, [cashCounterLoading, dashboardLoaded, isOnCashManagementPage, needsOpenCounterToday, hasOpenCounterToday]);

  const handleClosePreviousCounter = useCallback(async (payload: CloseCounterPayload) => {
    setClosing(true);
    try {
      const action = await dispatch(closeCashCounterThunk(payload));
      const closedData = closeCashCounterThunk.fulfilled.match(action) ? action.payload : dashboard;

      // Send summary via email to Salon Owner's registered email address
      // (no PDF attachment). Sent silently — no notification either way.
      try {
        await sendDailySummaryEmail(payload.cash_management_id, closedData ?? dashboard, userEmail);
      } catch (emailErr: any) {
        console.error("[UnclosedCounterGate] Email delivery error:", emailErr);
      }
      showGlobalToast("success", "Previous counter closed", "The stale counter was closed successfully.");

      // Directly display Open Today's Counter modal
      setShowOpenTodayModal(true);
    } finally {
      setClosing(false);
    }
  }, [dashboard, dispatch, userEmail]);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    dispatch(logout());
    navigate("/login");
  }, [dispatch, navigate]);

  return (
    <>
      {overlay}
      {dashboard && (
        <CloseCounterModal
          show={showPendingModal}
          dashboard={dashboard}
          loading={closing}
          mandatory
          onLogout={handleLogout}
          onClose={() => { }}
          onNotify={(tone, message) => {
            if (tone === "error") showError(message);
            else showSuccess(message);
          }}
          onSubmit={handleClosePreviousCounter}
        />
      )}

      <OpenCounterModal
        show={showOpenTodayModal}
        loading={openingLoading}
        mandatory={true}
        onClose={() => setShowOpenTodayModal(false)}
        onNotify={(tone, message) => {
          if (tone === "error") showError(message);
          else showSuccess(message);
        }}
        onSubmit={async (payload) => {
          setOpeningLoading(true);
          try {
            await dispatch(openCashCounterThunk(payload)).unwrap();
            setShowOpenTodayModal(false);
            showGlobalToast("success", "Counter opened", "Today's cash counter opened successfully!");
          } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? "Failed to open today's counter.";
            showError(msg);
            throw err;
          } finally {
            setOpeningLoading(false);
          }
        }}
      />
    </>
  );
}



