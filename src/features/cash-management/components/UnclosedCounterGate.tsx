import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarEvent, CashStack, JournalText, Safe2, Wallet2 } from "react-bootstrap-icons";
import toast from "react-hot-toast";
import { Button, Modal } from "../../../components/ui";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  closeCashCounterThunk,
  openCashCounterThunk,
} from "../../../middleware/cashCounter/cashCounter.thunk";
import { logout } from "../../../store/authSlice";
import { disconnectSocket } from "../../../services/socket/socket";
import { sendDailySummaryEmail, fetchTodaysPaymentMethodCounts } from "../cashManagement.api";
import { OpenCounterModal } from "../pages/CashManagementModals";

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
  const { formatAmount } = useCurrency();
  const dashboard = useAppSelector((state) => state.cashCounter.dashboard);
  const cashCounterLoading = useAppSelector((state) => state.cashCounter.loading);
  const userProfile = useAppSelector(selectUserProfile);
  const userEmail = userProfile?.email;

  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [showOpenTodayModal, setShowOpenTodayModal] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(false);
  const [paymentMethodCounts, setPaymentMethodCounts] = useState({
    upi: 0,
    card: 0,
    cash: 0,
    amounts: { upi: 0, card: 0, cash: 0 },
  });

  const today = formatDateInput(new Date());
  const openedDateKey = dashboard?.openedAt ? formatDateInput(new Date(dashboard.openedAt)) : null;
  const isStaleOpenCounter =
    Boolean(dashboard?.cashManagementId) &&
    dashboard?.status === "open" &&
    openedDateKey !== null &&
    openedDateKey !== today;

  const isOnCashManagementPage = location.pathname.startsWith(CASH_MANAGEMENT_PATH);
  const show = isStaleOpenCounter && !isOnCashManagementPage;
  const showPendingModal = show && !showOpenTodayModal;

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

  useEffect(() => {
    if (!showPendingModal || !openedDateKey) return;
    let cancelled = false;
    fetchTodaysPaymentMethodCounts(openedDateKey).then((counts) => {
      if (!cancelled) setPaymentMethodCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [showPendingModal, openedDateKey]);

  const handleClosePreviousCounter = useCallback(async () => {
    setClosing(true);
    setError("");
    try {
      let closedData = dashboard;

      // 1. Dispatch backend close counter request if active counter ID exists
      if (dashboard?.cashManagementId) {
        const candidate = dashboard.inStoreCash ?? dashboard.closingBalance ?? 0;
        const numericInStoreCash = Number(candidate);
        const inStoreCash = Number.isFinite(numericInStoreCash) ? Math.max(0, numericInStoreCash) : 0;

        const action = await dispatch(
          closeCashCounterThunk({
            cash_management_id: dashboard.cashManagementId,
            in_store_cash: inStoreCash,
            remarks: dashboard.remarks ?? "",
          }),
        );
        if (closeCashCounterThunk.fulfilled.match(action)) {
          closedData = action.payload;
        }
      }

      // 2. Prepare Daily Summary data
      const summaryData = closedData || dashboard || {
        cashManagementId: "preview-id",
        status: "closed",
        openingBalance: 0,
        cashRevenue: 0,
        cashExpense: 0,
        closingBalance: 0,
        inStoreCash: 0,
        reconciliationAmount: 0,
        openedAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        remarks: null,
      };

      // 3. Send summary via email to Salon Owner's registered email address
      // (no PDF attachment). Sent silently — no notification either way.
      try {
        await sendDailySummaryEmail(
          dashboard?.cashManagementId ?? "",
          { ...summaryData, paymentCounts: paymentMethodCounts },
          userEmail,
        );
      } catch (emailErr: any) {
        console.error("[UnclosedCounterGate] Email delivery error:", emailErr);
      }
      toast.success("Previous counter closed.");

      // 4. Directly display Open Today's Counter modal
      setShowOpenTodayModal(true);
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
  }, [dashboard, dispatch, userEmail, paymentMethodCounts]);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    dispatch(logout());
    navigate("/login");
  }, [dispatch, navigate]);

  const openedAtFormatted = dashboard?.openedAt
    ? new Date(dashboard.openedAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    : null;

  return (
    <>
      <Modal
        show={showPendingModal}
        onClose={() => { }}
        hideCloseButton
        title="Cash Counter Pending"
        size="md"
        footer={
          <div className="topbar-confirm-footer">
            <Button variant="ghost" onClick={handleLogout} disabled={closing}>
              Logout
            </Button>
            <Button
              variant="danger"
              loading={closing}
              disabled={closing}
              onClick={() => void handleClosePreviousCounter()}
            >
              Close Previous Counter
            </Button>
          </div>
        }
      >
        <div className="d-flex flex-column gap-3">
          <p className="topbar-confirm-copy mb-0">
            The cash counter from a previous session is still open. Please review the daily summary below and close it before opening today's counter.
          </p>

          {dashboard ? (
            <div className="p-3 bg-light rounded-3 border">
              <div className="d-flex align-items-center gap-2 mb-3 text-muted small fw-semibold border-bottom pb-2">
                <CalendarEvent size={15} />
                <span>Opened on: {openedAtFormatted || "Previous Session"}</span>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <Wallet2 size={13} className="text-primary" /> Opening Balance
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(dashboard.openingBalance ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <CashStack size={13} className="text-success" /> Cash Revenue
                    </div>
                    <div className="fw-bold text-success fs-6 mt-1">
                      {formatAmount(dashboard.cashRevenue ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <JournalText size={13} className="text-warning" /> Cash Expense
                    </div>
                    <div className="fw-bold text-warning fs-6 mt-1">
                      {formatAmount(dashboard.cashExpense ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <Safe2 size={13} className="text-dark" /> Expected Closing
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(dashboard.closingBalance ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <CashStack size={13} className="text-primary" /> UPI Payments
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(paymentMethodCounts.amounts.upi)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <Wallet2 size={13} className="text-primary" /> Card Payments
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(paymentMethodCounts.amounts.card)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="topbar-confirm-copy topbar-confirm-copy--error mb-0">{error}</p>
          ) : null}
        </div>
      </Modal>

      <OpenCounterModal
        show={showOpenTodayModal}
        loading={openingLoading}
        mandatory={true}
        onClose={() => setShowOpenTodayModal(false)}
        onNotify={(tone, message) => {
          if (tone === "error") toast.error(message);
          else toast.success(message);
        }}
        onSubmit={async (payload) => {
          setOpeningLoading(true);
          try {
            await dispatch(openCashCounterThunk(payload)).unwrap();
            setShowOpenTodayModal(false);
            toast.success("Today's cash counter opened successfully!");
          } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? "Failed to open today's counter.";
            toast.error(msg);
            throw err;
          } finally {
            setOpeningLoading(false);
          }
        }}
      />
    </>
  );
}



