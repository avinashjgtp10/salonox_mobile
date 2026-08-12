import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import AppointmentModal from "../../bookings/components/modals/AppointmentModal";
import { useStaffSchedule } from "../../bookings/hooks/useStaffSchedule";
import type { RootState } from "../../../store/store";
import type { PackageItem } from "../../bookings/types/booking.types";

interface PendingPackageSale {
  client?: { id: string; name: string; phone?: string };
  customPackageItem?: PackageItem;
}

// Quick Sale reuses the same AppointmentModal used by the Calendar, so a
// quick sale is just a walk-in appointment that skips straight to payment —
// it always creates a real appointment, visible on the calendar.
export default function QuickSalePage() {
  const salonId = useSelector((s: RootState) => (s as any).salon?.currentSalon?.id);
  const location = useLocation();
  const navigate = useNavigate();

  // The staff list (used by the per-row "Select Staff" dropdown) is normally
  // loaded by the Calendar page (Scheduler.tsx) via this same hook. Quick Sale
  // can be opened directly without ever visiting the Calendar first, so it
  // needs its own copy of this fetch — otherwise the staff dropdown silently
  // has zero options until the Calendar happens to be visited in the same
  // session (intermittent "staff select doesn't work" reports).
  useStaffSchedule(salonId);

  // Handoff from the standalone Catalogue "Sell Package" form (PackageModule.tsx)
  // — a client + a built-but-unsold custom package, carried across the page
  // navigation via router state. Captured once, on first mount, into normal
  // state (not re-read from location on every render): the router state is
  // cleared right away (a refresh or back-nav must not replay it), and this
  // captured copy is itself cleared once consumed below so a completed-sale
  // remount doesn't re-add the same package for the NEXT customer.
  const [pending, setPending] = useState<PendingPackageSale | null>(
    () => (location.state as any)?.pendingPackageSale ?? null
  );
  const clearedHistoryState = useRef(false);
  useEffect(() => {
    if (!clearedHistoryState.current && location.state) {
      clearedHistoryState.current = true;
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // After each completed sale, remount the modal so the form resets to a blank
  // quick sale for the next customer — no navigating away from this page.
  const [saleKey, setSaleKey] = useState(0);
  const handleDone = useCallback(() => {
    setSaleKey((k) => k + 1);
    setPending(null);
  }, []);

  return (
    <AppointmentModal
      key={saleKey}
      isOpen
      quickSale
      salonId={salonId}
      onClose={handleDone}
      defaultClientId={pending?.client?.id}
      defaultClientName={pending?.client?.name}
      defaultClientPhone={pending?.client?.phone}
      initialCustomPackageItem={pending?.customPackageItem}
    />
  );
}
