import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSingleClick } from "../../../../utils/singleClick";
import type { Booking, BlockedTime } from "../../types/booking.types";
import { useAppDispatch, useAppSelector } from "../../../../hooks/useAppRedux";
import { fetchBookingByIdThunk, fetchBookingsThunk, cancelBookingThunk, deleteBookingThunk } from "../../../../middleware/booking/booking.thunk";
import { setBookings, clearDragPatch, deleteBooking } from "../../../../store/schedulerSlice";
import { store } from "../../../../store/store";
import { useSchedulerContext } from "../../store/SchedulerContext";
// ── NEW: 2 focused hooks replace useSchedulerInit ─────────────────────────────
import { useBookings }      from "../../hooks/useBookings";
import { useStaffSchedule } from "../../hooks/useStaffSchedule";
// ── NEW: mapApiBooking now lives in utils ─────────────────────────────────────
import { mapApiBooking } from "../../utils/bookingMapper";
import { getCurrentTime } from "../../utils/timeUtils";
import TopBar        from "./TopBar";
import DayView       from "./DayView";
import WeekView      from "./WeekView";
import MonthView     from "./MonthView";
import ListWeekView  from "./ListWeekView";
// ── NEW: AppointmentModal replaces NewAppointmentModal ────────────────────────
import AppointmentModal from "../modals/AppointmentModal";
import ViewBillModal    from "../modals/ViewBillModal";
import BlockTimeModal   from "../modals/BlockTimeModal";
import CalendarSkeleton from "./CalendarSkeleton";
import "../../styles/Scheduler.scss";

// Stable fallbacks — prevent new [] reference on every selector call when slice is undefined
const EMPTY_ARR: never[] = [];

const SchedulerContent: React.FC = () => {
  const dispatch    = useAppDispatch();
  const location    = useLocation();
  const navigate    = useNavigate();
  const salonId     = useAppSelector((s: any) => s.salon?.currentSalon?.id ?? s.auth?.user?.salon_id ?? "");
  const { viewMode, setViewMode, currentDate, setCurrentDate, setHighlightedBookingId } = useSchedulerContext();

  const apiServices = useAppSelector((s: any) => s.services?.items ?? EMPTY_ARR);
  const apiStaff    = useAppSelector((s: any) => s.staff?.items   ?? EMPTY_ARR);
  const apiClients  = useAppSelector((s: any) => s.client?.items  ?? EMPTY_ARR);

  // ── Data hooks ───────────────────────────────────────────────────────────
  const { staffReady, hasStaff } = useStaffSchedule(salonId);
  // Fetch bookings as soon as salonId is known — parallel with staff, no more serial dependency.
  // Waiting for hasStaff caused appointments to vanish on page refresh when Redux state is empty
  // and the auth → salon → staff chain took 3-4 s (or broke silently).
  const { loading: bookingsLoading } = useBookings(!salonId);
  // Skeleton instead of a blank page/spinner for: staff not ready yet, or staff
  // is ready but this specific date/view's bookings haven't loaded yet (first
  // visit to that range — see useBookings.ts's `loading`).
  const showSkeleton = !staffReady || (hasStaff && bookingsLoading);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showNewAppt, setShowNewAppt]         = useState(false);
  const [showBlockTime, setShowBlockTime]     = useState(false);
  const [viewingBooking, setViewingBooking]   = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking]   = useState<Booking | null>(null);
  const [apptDefaults, setApptDefaults]       = useState<{ staffId?: string; defaultTime?: string }>({});
  const [defaultClient, setDefaultClient]     = useState<{ id: string; name: string; phone: string } | null>(null);
  const [blockStaffId, setBlockStaffId]       = useState<string | undefined>(undefined);
  const [editingBlockTime, setEditingBlockTime] = useState<BlockedTime | undefined>(undefined);

  function getGlobalSearchDefaultTime() {
    return getCurrentTime();
  }

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

  // ── Jump to + highlight a newly created appointment (e.g. from the public
  // booking success screen's "Add to Calendar" button) ──────────────────────
  useEffect(() => {
    const focus = (location.state as any)?.focusAppointment as { id?: string; date?: string } | undefined;
    if (!focus?.id) return;
    navigate(location.pathname, { replace: true, state: {} });
    if (focus.date) setCurrentDate(focus.date);
    setViewMode("Day");
    setHighlightedBookingId(focus.id);
    const t = setTimeout(() => setHighlightedBookingId(null), 6000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlotClick = useSingleClick((staffId: string, time: string) => {
    setApptDefaults({ staffId, defaultTime: time });
    setEditingBooking(null);
    setShowNewAppt(true);
  });

  const handleEditBooking = useSingleClick(async (booking: Booking) => {
    if (booking.status === "paid") {
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
          const localServices = booking.services || [];
          const mergedServices = enriched.services.length
            ? enriched.services.map((svc: any, idx: number) => {
                // Match by ID first; fall back to position for newly created services
                const local = localPriceMap.get(String(svc.id)) ?? localServices[idx];
                // Prefer detail-API staffId — it has per-service staff_id from DB.
                // local comes from the list endpoint which collapses all services to appointment-level staffId.
                const resolvedStaffId = svc.staffId || local?.staffId;
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
            status: booking.status,
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
          // Preserve per-service staffIds from local Redux booking — same logic as handleEditBooking
          const localPriceMap = new Map((booking.services || []).map((s: any) => [String(s.id), s]));
          const localServices = booking.services || [];
          const mergedServices = enriched.services.length
            ? enriched.services.map((svc: any, idx: number) => {
                const local = localPriceMap.get(String(svc.id)) ?? localServices[idx];
                const resolvedStaffId = svc.staffId || local?.staffId;
                const resolvedStaff = resolvedStaffId
                  ? (apiStaff.find((s: any) => String(s.id) === String(resolvedStaffId)) as any)?.name || svc.staff
                  : svc.staff;
                return { ...svc, staffId: resolvedStaffId, staff: resolvedStaff };
              })
            : booking.services;
          setEditingBooking({ ...booking, ...enriched, services: mergedServices, status: booking.status });
          setShowNewAppt(true);
          return;
        }
      } catch { /* fall through */ }
    }
    setEditingBooking(booking);
    setShowNewAppt(true);
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
      const local = latestBookings.find((lb) => String(lb.id) === String(fb.id));

      // Package appointments: list endpoint may return staff_id=null even though it was set at
      // creation time (backend stores staffId in package_items, not in appointments table).
      // Preserve the staffId from the local Redux booking so the chip stays visible.
      if (!merged.staffId && local?.staffId) {
        (merged as any).staffId = local.staffId;
      }

      // Preserve per-service staffIds saved locally when the API list endpoint
      // doesn't return staff_id per service (all services fall back to appt-level staffId).
      if (local?.services?.length) {
        if (!merged.services?.length) {
          // API returned no services at all — keep the locally cached services so
          // multi-staff chips survive the refresh without losing their assignments.
          (merged as any).services = local.services;
        } else {
          const allSameAsAppt = merged.services.every(
            (s: any) => !s.staffId || String(s.staffId) === String(merged.staffId)
          );
          if (allSameAsAppt) {
            const localById = new Map(local.services.map((s: any) => [String(s.id), s]));
            merged.services = merged.services.map((svc: any, idx: number) => {
              // Match by ID first; fall back to position for newly created services
              const localSvc = localById.get(String(svc.id)) ?? (local as any).services[idx];
              return localSvc?.staffId ? { ...svc, staffId: localSvc.staffId, staff: localSvc.staff } : svc;
            });
          }
        }
      }

      const pay = payCache[String(fb.id)];
      if (pay) {
        merged.status = pay.status;
        merged.dueAmount = pay.status === "paid" ? 0 : pay.dueAmount;
        merged.payingNow = pay.payingNow;
        if (pay.grandTotal !== undefined) (merged as any).grandTotal = pay.grandTotal;
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
    setDefaultClient(null);
    setApptDefaults({});
  }

  const handleCancelBooking = useSingleClick(async (booking: Booking) => {
    const result = await (dispatch(cancelBookingThunk(booking.id)) as any);
    if (cancelBookingThunk.fulfilled.match(result)) handleRefresh();
  });

  const handleDeleteBooking = useSingleClick(async (booking: Booking) => {
    const result = await (dispatch(deleteBookingThunk(booking.id)) as any);
    if (deleteBookingThunk.fulfilled.match(result)) dispatch(deleteBooking(String(booking.id)));
  });

  const handleNewAppointment = useSingleClick(() => {
    setEditingBooking(null);
    setDefaultClient(null);
    setApptDefaults({});
    setShowNewAppt(true);
  });

  const handleNewAppointmentForClient = useSingleClick((client: { id: string; name: string; phone: string }) => {
    setEditingBooking(null);
    setApptDefaults({ defaultTime: getGlobalSearchDefaultTime() });
    setDefaultClient(client);
    setShowNewAppt(true);
  });

  return (
    <div className="scheduler">
      {(!staffReady || hasStaff) && (
        <div className="scheduler__topbar-wrap">
          <TopBar
            onNewAppointment={handleNewAppointment}
            onBlockTime={() => handleBlockTime()}
            onRefresh={handleRefresh}
            onNewAppointmentForClient={handleNewAppointmentForClient}
          />
        </div>
      )}

      <div className={`scheduler__body${viewMode === "Month" || viewMode === "List Week" ? " scheduler__body--scrollable" : ""}`}>
        {/* ── Skeleton while staff/bookings for this view haven't loaded yet ── */}
        {showSkeleton ? (
          <CalendarSkeleton viewMode={viewMode} />
        ) : staffReady && !hasStaff ? (
          <div className="scheduler__empty-state">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="scheduler__empty-title">No staff available</p>
            <p className="scheduler__empty-subtitle">Add team members to start scheduling appointments.</p>
            <a href="/dashboard/team" className="scheduler__empty-link">+ Add Staff</a>
          </div>
        ) : (
          <>
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
          </>
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
          defaultClientId={defaultClient?.id}
          defaultClientName={defaultClient?.name}
          defaultClientPhone={defaultClient?.phone}
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
          onCollectDue={handleForceEdit}
        />
      )}
    </div>
  );
};

const Scheduler: React.FC = () => <SchedulerContent />;
export default Scheduler;
