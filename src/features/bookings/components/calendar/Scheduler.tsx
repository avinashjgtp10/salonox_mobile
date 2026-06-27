import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSingleClick } from "../../../../utils/singleClick";
import type { Booking, BlockedTime } from "../../types/booking.types";
import { useAppDispatch, useAppSelector } from "../../../../hooks/useAppRedux";
import { fetchBookingByIdThunk, fetchBookingsThunk, cancelBookingThunk, deleteBookingThunk } from "../../../../middleware/booking/booking.thunk";
import { setBookings, clearDragPatch } from "../../../../store/schedulerSlice";
import { store } from "../../../../store/store";
import { useSchedulerContext } from "../../store/SchedulerContext";
// ── NEW: 3 focused hooks replace useSchedulerInit ─────────────────────────────
import { useBookings }      from "../../hooks/useBookings";
import { useStaffSchedule } from "../../hooks/useStaffSchedule";
import { useServices }      from "../../hooks/useServices";
// ── NEW: mapApiBooking now lives in utils ─────────────────────────────────────
import { mapApiBooking } from "../../utils/bookingMapper";
import TopBar        from "./TopBar";
import DayView       from "./DayView";
import WeekView      from "./WeekView";
import MonthView     from "./MonthView";
import ListWeekView  from "./ListWeekView";
// ── NEW: AppointmentModal replaces NewAppointmentModal ────────────────────────
import AppointmentModal from "../modals/AppointmentModal";
import ViewBillModal    from "../modals/ViewBillModal";
import PaymentModal     from "../modals/PaymentModal";
import BlockTimeModal   from "../modals/BlockTimeModal";

// Stable fallbacks — prevent new [] reference on every selector call when slice is undefined
const EMPTY_ARR: never[] = [];

const SchedulerContent: React.FC = () => {
  const dispatch    = useAppDispatch();
  const location    = useLocation();
  const navigate    = useNavigate();
  const salonId     = useAppSelector((s: any) => s.salon?.currentSalon?.id ?? s.auth?.user?.salon_id ?? "");
  const { viewMode, setViewMode, currentDate, setCurrentDate } = useSchedulerContext();

  const apiServices = useAppSelector((s: any) => s.services?.items ?? EMPTY_ARR);
  const apiStaff    = useAppSelector((s: any) => s.staff?.items   ?? EMPTY_ARR);
  const apiClients  = useAppSelector((s: any) => s.client?.items  ?? EMPTY_ARR);

  // ── Data hooks (each fetches one concern independently) ───────────────────
  useBookings();
  useStaffSchedule(salonId);
  useServices(salonId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showNewAppt, setShowNewAppt]         = useState(false);
  const [showBlockTime, setShowBlockTime]     = useState(false);
  const [viewingBooking, setViewingBooking]   = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking]   = useState<Booking | null>(null);
  const [paymentBooking, setPaymentBooking]   = useState<Booking | null>(null);
  const [collectDueMode, setCollectDueMode]   = useState(false);
  const [apptDefaults, setApptDefaults]       = useState<{ staffId?: string; defaultTime?: string }>({});
  const [blockStaffId, setBlockStaffId]       = useState<string | undefined>(undefined);
  const [editingBlockTime, setEditingBlockTime] = useState<BlockedTime | undefined>(undefined);

  // ── Auto-open appointment when navigated from Reports page ────────────────
  useEffect(() => {
    const appointmentId = (location.state as any)?.openAppointmentId;
    if (!appointmentId) return;
    navigate(location.pathname, { replace: true, state: {} });
    (async () => {
      try {
        const action = await (dispatch(fetchBookingByIdThunk(appointmentId)) as any);
        if (fetchBookingByIdThunk.fulfilled.match(action)) {
          const enriched = mapApiBooking(action.payload, apiServices, apiStaff, apiClients);
          setEditingBooking(enriched);
          setShowNewAppt(true);
        }
      } catch { /* ignore */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlotClick = useSingleClick((staffId: string, time: string) => {
    setApptDefaults({ staffId, defaultTime: time });
    setEditingBooking(null);
    setShowNewAppt(true);
  });

  const handleEditBooking = useSingleClick(async (booking: Booking) => {
    if (booking.paymentStatus === "Paid") {
      setViewingBooking(booking);
      return;
    }
    const isApiBooking = !String(booking.id).startsWith("b_");
    if (isApiBooking) {
      try {
        const action = await (dispatch(fetchBookingByIdThunk(booking.id)) as any);
        if (fetchBookingByIdThunk.fulfilled.match(action)) {
          const enriched = mapApiBooking(action.payload, apiServices, apiStaff, apiClients);
          const localPriceMap = new Map(
            (booking.services || []).map((s: any) => [String(s.id), s])
          );
          const mergedServices = enriched.services.length
            ? enriched.services.map((svc: any) => {
                const local = localPriceMap.get(String(svc.id));
                const resolvedStaffId = local?.staffId || svc.staffId;
                const resolvedStaff = resolvedStaffId
                  ? (apiStaff.find((s: any) => String(s.id) === String(resolvedStaffId)) as any)?.name || svc.staff
                  : svc.staff;
                return {
                  ...svc,
                  price: (svc.price || 0) > 0 ? svc.price : (local?.price || 0),
                  total: (svc.total || 0) > 0 ? svc.total : (local?.total || local?.price || 0),
                  qty: svc.qty || local?.qty || 1,
                  staffId: resolvedStaffId,
                  staff: resolvedStaff,
                };
              })
            : booking.services;
          setEditingBooking({
            ...booking,
            ...enriched,
            services: mergedServices,
            paymentStatus: booking.paymentStatus,
            payingNow: booking.payingNow != null ? booking.payingNow : enriched.payingNow,
            dueAmount: booking.dueAmount != null ? booking.dueAmount : enriched.dueAmount,
            grandTotal: (booking.grandTotal || 0) > 0 ? booking.grandTotal : enriched.grandTotal,
          });
          setShowNewAppt(true);
          return;
        }
      } catch { /* fall through */ }
    }
    setEditingBooking(booking);
    setShowNewAppt(true);
  });

  // Force-open edit modal regardless of payment status (called from ViewBillModal Edit button)
  const handleForceEdit = useSingleClick(async (booking: Booking) => {
    setViewingBooking(null);
    const isApiBooking = !String(booking.id).startsWith("b_");
    if (isApiBooking) {
      try {
        const action = await (dispatch(fetchBookingByIdThunk(booking.id)) as any);
        if (fetchBookingByIdThunk.fulfilled.match(action)) {
          const enriched = mapApiBooking(action.payload, apiServices, apiStaff, apiClients);
          setEditingBooking({ ...booking, ...enriched, paymentStatus: booking.paymentStatus });
          setShowNewAppt(true);
          return;
        }
      } catch { /* fall through */ }
    }
    setEditingBooking(booking);
    setShowNewAppt(true);
  });

  const handleCollectDue = useSingleClick((booking: Booking) => {
    setPaymentBooking(booking);
    setCollectDueMode(true);
  });

  const handleBlockTime = useSingleClick((staffId?: string) => {
    setBlockStaffId(staffId);
    setEditingBlockTime(undefined);
    setShowBlockTime(true);
  });

  const handleEditBlockTime = useSingleClick((block: BlockedTime) => {
    setEditingBlockTime(block);
    setBlockStaffId(undefined);
    setShowBlockTime(true);
  });

  const handleDayClick = useSingleClick((date: string) => {
    setCurrentDate(date);
    setViewMode("Day");
  });

  const handleRefresh = useSingleClick(async () => {
    const dateStr = currentDate || new Date().toISOString().slice(0, 10);
    const action = await (dispatch(fetchBookingsThunk({ startDate: dateStr, endDate: dateStr })) as any);
    if (!fetchBookingsThunk.fulfilled.match(action)) return;

    const payload = action.payload as any;
    const fresh: Booking[] = (Array.isArray(payload) ? payload : (payload?.data ?? [])) as Booking[];
    const freshIds = new Set(fresh.map((fb) => String(fb.id)));
    const schedulerState = store.getState().scheduler as any;
    const latestBookings: Booking[] = schedulerState.bookings;
    const payCache: Record<string, any> = schedulerState.paymentPatchCache ?? {};

    const updated = fresh.map((fb) => {
      const merged: Booking = { ...fb } as Booking;
      const pay = payCache[String(fb.id)];
      if (pay) {
        merged.paymentStatus = pay.paymentStatus;
        merged.dueAmount = pay.paymentStatus === "Paid" ? 0 : pay.dueAmount;
        merged.payingNow = pay.payingNow;
        if (pay.grandTotal !== undefined) (merged as any).grandTotal = pay.grandTotal;
        const local = latestBookings.find((lb) => String(lb.id) === String(fb.id));
        if (local) (merged as any).paymentMode = (local as any).paymentMode || (fb as any).paymentMode;
      }
      return merged;
    });

    const preserved = latestBookings.filter((lb) => !freshIds.has(String(lb.id)));
    fresh.forEach((fb) => dispatch(clearDragPatch(String(fb.id))));
    dispatch(setBookings([...updated, ...preserved]));
  });

  function handleCloseAppt() {
    setShowNewAppt(false);
    setEditingBooking(null);
    setApptDefaults({});
  }

  const handleCancelBooking = useSingleClick(async (booking: Booking) => {
    const result = await (dispatch(cancelBookingThunk(booking.id)) as any);
    if (cancelBookingThunk.fulfilled.match(result)) handleRefresh();
  });

  const handleDeleteBooking = useSingleClick(async (booking: Booking) => {
    const result = await (dispatch(deleteBookingThunk(booking.id)) as any);
    if (deleteBookingThunk.fulfilled.match(result)) handleRefresh();
  });

  const handleNewAppointment = useSingleClick(() => {
    setEditingBooking(null);
    setApptDefaults({});
    setShowNewAppt(true);
  });

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      background: "#f8fafc",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{ flexShrink: 0, width: "100%", overflow: "hidden", position: "relative", zIndex: 30 }}>
        <TopBar
          onNewAppointment={handleNewAppointment}
          onBlockTime={() => handleBlockTime()}
        />
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
        overflowY: viewMode === "Month" || viewMode === "List Week" ? "auto" : "hidden",
        overflowX: "hidden",
      }}>
        {viewMode === "Day" && (
          <DayView
            onSlotClick={handleSlotClick}
            onEditBooking={handleEditBooking}
            onCancelBooking={handleCancelBooking}
            onDeleteBooking={handleDeleteBooking}
            onBlockTime={(staffId: string) => handleBlockTime(staffId)}
            onEditBlockTime={handleEditBlockTime}
          />
        )}
        {viewMode === "Week" && (
          <WeekView onSlotClick={handleSlotClick} onViewBill={setViewingBooking} />
        )}
        {viewMode === "Month" && (
          <MonthView onDayClick={handleDayClick} onViewBill={setViewingBooking} />
        )}
        {viewMode === "List Week" && (
          <ListWeekView onViewBill={setViewingBooking} />
        )}
      </div>

      {/* ── AppointmentModal replaces NewAppointmentModal ── */}
      {showNewAppt && (
        <AppointmentModal
          isOpen={showNewAppt}
          salonId={salonId}
          onClose={handleCloseAppt}
          onRefresh={handleRefresh}
          defaultStaffId={apptDefaults.staffId}
          defaultTime={apptDefaults.defaultTime}
          defaultDate={editingBooking?.date || undefined}
          existingBooking={editingBooking || undefined}
          onCancelBooking={handleCancelBooking}
          onDeleteBooking={handleDeleteBooking}
        />
      )}
      {showBlockTime && (
        <BlockTimeModal
          onClose={() => { setShowBlockTime(false); setEditingBlockTime(undefined); }}
          defaultStaffId={blockStaffId}
          editingBlock={editingBlockTime}
        />
      )}
      {viewingBooking && (
        <ViewBillModal
          booking={viewingBooking}
          onClose={() => setViewingBooking(null)}
          onEdit={(b) => handleForceEdit(b)}
          onCollectDue={handleCollectDue}
        />
      )}
      {paymentBooking && (
        <PaymentModal
          booking={paymentBooking}
          collectDue={collectDueMode}
          onClose={() => { setPaymentBooking(null); setCollectDueMode(false); }}
        />
      )}
    </div>
  );
};

const Scheduler: React.FC = () => <SchedulerContent />;
export default Scheduler;