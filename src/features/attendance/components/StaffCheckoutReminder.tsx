import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { getCheckoutReminder } from "../utils/checkoutReminder";
import { formatAttendanceTime } from "../utils/attendanceStatus";

/** Mounted only for the current staff login; never schedules an unchecked background alert. */
export function StaffCheckoutReminder({ state, refresh, busy, unavailable }: {
  state: StaffSelfAttendance | null;
  refresh: () => Promise<void>;
  busy: boolean;
  unavailable: boolean;
}) {
  const [active, setActive] = useState(AppState.currentState === "active");
  const [foregroundAt, setForegroundAt] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const reminder = getCheckoutReminder(state);
  const key = reminder?.key;
  const dueAt = reminder?.dueAt;
  const serverNow = reminder?.serverNow;
  const receivedAt = state?.received_at;
  const alreadyDismissed = !!key && dismissed.includes(key);

  useEffect(() => {
    const listener = AppState.addEventListener("change", status => {
      setActive(status === "active");
      if (status === "active") setForegroundAt(Date.now());
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!active || busy || alreadyDismissed || dueAt === undefined || serverNow === undefined || serverNow >= dueAt) return;
    // Server time avoids depending on the phone's timezone or clock setting.
    const elapsed = Math.max(0, Date.now() - (receivedAt ?? Date.now()));
    const timer = setTimeout(() => { void refresh(); }, Math.min(2147483647, Math.max(0, dueAt - serverNow - elapsed)));
    return () => clearTimeout(timer);
  }, [active, busy, alreadyDismissed, dueAt, serverNow, receivedAt, refresh]);

  const dismiss = () => { if (key) setDismissed(previous => [...previous, key]); };
  return <ConfirmationModal
    visible={active && !busy && !unavailable && !!reminder?.due && !alreadyDismissed && (receivedAt ?? 0) >= foregroundAt}
    title="You haven't checked out"
    description={`Your scheduled shift ended at ${formatAttendanceTime(state?.shift_end)}. It's been at least 15 minutes and your checkout hasn't been recorded. Please check out when you've finished for the day.`}
    cancelLabel="Dismiss"
    confirmLabel="Go to checkout"
    confirmVariant="default"
    onCancel={dismiss}
    onConfirm={() => { dismiss(); router.navigate("/(staff)/home"); }}
  />;
}
