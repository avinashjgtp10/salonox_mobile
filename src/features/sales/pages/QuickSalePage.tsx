import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import AppointmentModal from "../../bookings/components/modals/AppointmentModal";
import { useStaffSchedule } from "../../bookings/hooks/useStaffSchedule";
import type { RootState } from "../../../store/store";

// Quick Sale reuses the same AppointmentModal used by the Calendar, so a
// quick sale is just a walk-in appointment that skips straight to payment —
// it always creates a real appointment, visible on the calendar.
export default function QuickSalePage() {
  const salonId = useSelector((s: RootState) => (s as any).salon?.currentSalon?.id);

  // The staff list (used by the per-row "Select Staff" dropdown) is normally
  // loaded by the Calendar page (Scheduler.tsx) via this same hook. Quick Sale
  // can be opened directly without ever visiting the Calendar first, so it
  // needs its own copy of this fetch — otherwise the staff dropdown silently
  // has zero options until the Calendar happens to be visited in the same
  // session (intermittent "staff select doesn't work" reports).
  useStaffSchedule(salonId);

  // After each completed sale, remount the modal so the form resets to a blank
  // quick sale for the next customer — no navigating away from this page.
  const [saleKey, setSaleKey] = useState(0);
  const handleDone = useCallback(() => setSaleKey((k) => k + 1), []);

  return (
    <AppointmentModal
      key={saleKey}
      isOpen
      quickSale
      salonId={salonId}
      onClose={handleDone}
    />
  );
}
