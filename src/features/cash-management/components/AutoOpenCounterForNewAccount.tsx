import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { openCashCounterThunk } from "../../../middleware/cashCounter/cashCounter.thunk";
import { OpenCounterModal } from "../pages/CashManagementModals";

// Mounted once at the dashboard layout level, same pattern as UnclosedCounterGate.
//
// "New account" is derived straight from backend state instead of a
// client-side flag set during registration: `cashManagementId` is only ever
// empty when this salon has NEVER opened a cash counter in its lifetime
// (see fetchCashCounterDashboardThunk's confirmedNoCounterDashboard, and
// normalizeDashboard's default). The moment they open their first counter,
// cashManagementId is permanently populated — even after closing it — so
// this condition can only ever be true once, with no separate flag to set,
// clear, or scope per browser/device.
export default function AutoOpenCounterForNewAccount() {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector((state) => state.cashCounter.dashboard);

  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasNeverOpenedCounter =
    dashboard !== null && dashboard.cashManagementId === "" && dashboard.status !== "open";
  const show = hasNeverOpenedCounter && !dismissed;

  const dismiss = useCallback(() => setDismissed(true), []);

  return (
    <OpenCounterModal
      show={show}
      loading={loading}
      mandatory
      onClose={dismiss}
      onNotify={(tone, message) => {
        if (tone === "error") toast.error(message);
        else toast.success(message);
      }}
      onSubmit={async (payload) => {
        setLoading(true);
        try {
          await dispatch(openCashCounterThunk(payload)).unwrap();
          toast.success("Today's cash counter opened successfully!");
          dismiss();
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? err?.message ?? "Failed to open today's counter.";
          toast.error(msg);
          throw err;
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}
