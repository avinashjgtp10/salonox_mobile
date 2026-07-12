// src/features/bookings/components/modals/AppointmentDetailModal.tsx
//
// Self-fetching wrapper around ViewBillModal/AppointmentModal — given only an
// appointmentId, it fetches + maps the full booking itself (same
// fetchBookingByIdThunk + mapApiBooking pair Scheduler.tsx uses for its
// "open from Reports" deep link) and renders the real bill/edit drawers in
// place, so any page (Reports, client history, etc.) can open them as a
// popup without navigating to the calendar.
import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../../hooks/useAppRedux";
import { fetchBookingByIdThunk, cancelBookingThunk, deleteBookingThunk } from "../../../../middleware/booking/booking.thunk";
import { mapApiBooking } from "../../utils/bookingMapper";
import { useStaffSchedule } from "../../hooks/useStaffSchedule";
import type { Booking } from "../../types";
import ViewBillModal from "./ViewBillModal";
import AppointmentModal from "./AppointmentModal";
import "../../styles/AppointmentDetailModal.scss";

interface Props {
  appointmentId: string;
  onClose: () => void;
  /** Open straight into the edit form instead of the bill view. */
  initialMode?: "view" | "edit";
  /** Called after a save/cancel/delete so the host page can refresh its own list. */
  onChanged?: () => void;
}

const EMPTY_ARR: never[] = [];

export default function AppointmentDetailModal({ appointmentId, onClose, initialMode = "view", onChanged }: Props) {
  const dispatch = useAppDispatch();
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id ?? s.auth?.user?.salon_id ?? "");
  const apiServices = useAppSelector((s: any) => s.services?.items ?? EMPTY_ARR);
  const apiStaff    = useAppSelector((s: any) => s.staff?.items   ?? EMPTY_ARR);
  const apiClients  = useAppSelector((s: any) => s.client?.items  ?? EMPTY_ARR);

  // ViewBillModal reads staff names via useSchedulerContext()'s scheduler.staffList —
  // populate it whether or not the calendar has ever been visited this session.
  useStaffSchedule(salonId);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "edit">(initialMode);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const action = await (dispatch(fetchBookingByIdThunk(appointmentId)) as any);
      if (fetchBookingByIdThunk.fulfilled.match(action)) {
        setBooking(mapApiBooking(action.payload, apiServices, apiStaff, apiClients));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, appointmentId]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = useCallback(async (b: Booking) => {
    const result = await (dispatch(cancelBookingThunk(b.id)) as any);
    if (cancelBookingThunk.fulfilled.match(result)) { onChanged?.(); onClose(); }
  }, [dispatch, onChanged, onClose]);

  const handleDelete = useCallback(async (b: Booking) => {
    const result = await (dispatch(deleteBookingThunk(b.id)) as any);
    if (deleteBookingThunk.fulfilled.match(result)) { onChanged?.(); onClose(); }
  }, [dispatch, onChanged, onClose]);

  // This can be opened while already nested inside another overlay (e.g. the
  // calendar's ClientHistoryModal popup, z-index 1100) — wrapping in our own
  // stacking context here guarantees the bill/edit drawer always renders above
  // whatever host page/modal triggered it, regardless of nesting depth.
  if (loading || !booking) {
    return (
      <div className="adm-stack-lift">
        <div className="adm-loading-overlay">
          <div className="adm-loading-drawer">
            <div className="adm-spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div className="adm-stack-lift">
        <AppointmentModal
          isOpen
          salonId={salonId}
          existingBooking={booking}
          onClose={() => { setMode("view"); load(); }}
          onRefresh={() => { load(); onChanged?.(); }}
          onCancelBooking={handleCancel}
          onDeleteBooking={handleDelete}
        />
      </div>
    );
  }

  return (
    <div className="adm-stack-lift">
      <ViewBillModal
        booking={booking}
        onClose={onClose}
        onEdit={() => setMode("edit")}
        onCollectDue={() => setMode("edit")}
      />
    </div>
  );
}
