import { toApiStaffId } from "../utils/paymentUtils";
function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import {
  setBookings,
  addBooking,
  updateBooking as updateBookingAction,
  deleteBooking as deleteBookingAction,
  setBlockedTimes,
  addBlockedTime as addBlockedTimeAction,
  updateBlockedTime as updateBlockedTimeAction,
  replaceBlockedTimeId,
  deleteBlockedTime as deleteBlockedTimeAction,
  setViewMode,
  setCurrentDate,
  setInterval,
  navigate,
  updateClientNotes,
  setSelectedStaffIds,
  setHighlightedBookingId,
  setDragPatch,
  clearDragPatch,
} from "../../../store/schedulerSlice";
import { updateBookingThunk, deleteBookingThunk } from "../../../middleware/booking/booking.thunk";
import { updateStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  updateBlockedTimeThunk,
  deleteBlockedTimeThunk,
} from "../../../middleware/blockedTime/blockedTime.thunk";
import type {
  Booking,
  BlockedTime,
  ViewMode,
  IntervalOption,
} from "../types/scheduler-types";

export function useSchedulerContext() {
  const dispatch = useAppDispatch();
  const bookings = useAppSelector((s) => s.scheduler.bookings);
  const blockedTimes = useAppSelector((s) => s.scheduler.blockedTimes);
  const viewMode = useAppSelector((s) => s.scheduler.viewMode);
  const currentDate = useAppSelector((s) => s.scheduler.currentDate);
  const interval = useAppSelector((s) => s.scheduler.interval);
  const clientStats = useAppSelector((s) => s.scheduler.clientStats);
  const staffList = useAppSelector((s) => s.scheduler.staffList);
  const selectedStaffIds = useAppSelector((s) => s.scheduler.selectedStaffIds);
  const highlightedBookingId = useAppSelector((s) => s.scheduler.highlightedBookingId);
  const clientsList = useAppSelector((s) => s.scheduler.clientsList);
  const servicesList = useAppSelector((s) => s.scheduler.servicesList);
  const packagesList = useAppSelector((s) => s.scheduler.packagesList);
  const membershipsList = useAppSelector((s) => s.scheduler.membershipsList);
  const productsList = useAppSelector((s) => s.scheduler.productsList);
  const staffSchedules = useAppSelector((s) => s.scheduler.staffSchedules);
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id);

  return {
    bookings,
    addBooking: (b: Booking) => dispatch(addBooking(b)),
    updateBooking: (b: Booking) => {
      const previousBooking = bookings.find((existing) => String(existing.id) === String(b.id));
      dispatch(updateBookingAction(b));
      // Store the drag position so setBookings re-runs (from background fetches or
      // navigation remounts) don't revert to stale rawApiBookings data.
      dispatch(setDragPatch({ id: String(b.id), startTime: b.startTime, endTime: b.endTime, staffId: b.staffId || undefined }));
      if (!String(b.id).startsWith("b_")) {
        const [sh, sm] = b.startTime.split(":").map(Number);
        const [eh, em] = b.endTime.split(":").map(Number);
        const duration = Math.max(5, (eh * 60 + em) - (sh * 60 + sm));
        // Send updated service staff_ids so the backend persists the new staff
        // assignment. Without this, a refresh after dragging to a different staff
        // causes the server to return the old staff_id on services, reverting the drag.
        // Mirrors buildServiceApiItems() in useAppointment.ts (the proven-working save
        // path) field-for-field: the backend appears to replace each service row with
        // exactly what's sent, so any field omitted here (e.g. name) gets nulled out —
        // that's what was blanking the displayed service name after a drag.
        const serviceItems = (b.services || []).map((s: any) => {
          const hasDbServiceId = !!s.service_id;
          const svcTypeId = s.service_id || s.id || undefined;
          const svcRowId  = hasDbServiceId ? (s.id || undefined) : undefined;
          return {
            ...(svcRowId ? { id: svcRowId } : {}),
            service_id: svcTypeId,
            name: s.service || s.name,
            staff_id: toApiStaffId(s.staffId),
            start_time: new Date(`${b.date}T${s.time || b.startTime}:00`).toISOString(),
            price: s.price,
            qty: s.qty ?? 1,
            discount: s.discount,
            total: s.total,
            duration: s.duration,
          };
        });

        // package_items / product_items / membership_items ARE now included below —
        // the list endpoint this calendar fetches from does `SELECT a.*` (full row,
        // same JSONB columns as everywhere else) and bookingMapper.ts already extracts
        // them onto `b.packageItems`/`productItems`/`membershipItems`, so the old
        // "lightweight fetch, no nested data" assumption no longer holds. Included so
        // a drag update matches the same payload shape useAppointment.ts's save() sends
        // (which reliably persists) instead of a narrower partial update.
        const shiftedItemApiShape = (items: any[] | undefined, idKey: string) =>
          (items || []).map((it: any) => ({
            [idKey]:     it[`${idKey === "package_id" ? "packageId" : idKey === "product_id" ? "productId" : "membershipId"}`] || it.id || undefined,
            name:        it[idKey === "package_id" ? "packageName" : idKey === "product_id" ? "productName" : "membershipName"] || it.name || "",
            price:       it.price || 0,
            quantity:    it.qty ?? 1,
            total:       it.total,
            discount:    Number(it.discount) || 0,
            staff_id:    toApiStaffId(it.staffId),
            start_time:  new Date(`${b.date}T${it.time || b.startTime}:00`).toISOString(),
            ...(idKey === "package_id" && it.isPackageService ? { is_package_service: true } : {}),
            // A reschedule must not quietly rewrite what was SOLD — only when
            // it happens. This rebuild previously emitted a fixed field list,
            // so dragging an appointment stripped a package's `services` and
            // custom expiry from package_items. Harmless for a template
            // package (package_id re-derives it), fatal for a custom one:
            // with neither package_id nor services, payments.service.ts can't
            // resolve the package at checkout and creates nothing, so a fully
            // paid client ends up with no package at all.
            ...(idKey === "package_id" && Array.isArray(it.services) && it.services.length
              ? {
                  services: it.services.map((s: any) => ({
                    serviceId:     s.serviceId || undefined,
                    serviceName:   s.serviceName,
                    totalSessions: s.totalSessions || 1,
                    price:         s.price || 0,
                    ...(s.schedule?.scheduledAt
                      ? { schedule: { scheduledAt: new Date(s.schedule.scheduledAt).toISOString(), staffId: s.schedule.staffId || undefined } }
                      : {}),
                  })),
                }
              : {}),
            ...(idKey === "package_id" && it.customExpiry
              ? {
                  never_expires: !!it.customExpiry.neverExpires,
                  expiry_date:   it.customExpiry.neverExpires ? undefined : (it.customExpiry.expiryDate || undefined),
                }
              : {}),
          }));

        // status is intentionally omitted — a reschedule never changes payment/
        // lifecycle state itself. The one exception (a no-show booking getting
        // dragged/resized) is handled server-side in appointments.service.ts's
        // update(), which detects the reschedule and resets status to "booked".
        const apiPayload = {
          id: b.id,
          data: {
            scheduled_at: new Date(`${b.date}T${b.startTime}:00`).toISOString(),
            ends_at: new Date(`${b.date}T${b.endTime}:00`).toISOString(),
            duration_minutes: duration,
            staff_id: toApiStaffId(b.staffId),
            notes: b.notes || undefined,
            staff_alert: (b as any).staffAlert || undefined,
            title: (b as any).title,
            services: serviceItems,
            package_items:    shiftedItemApiShape((b as any).packageItems, "package_id"),
            product_items:    shiftedItemApiShape((b as any).productItems, "product_id"),
            membership_items: shiftedItemApiShape((b as any).membershipItems, "membership_id"),
          },
        };
        return (dispatch(updateBookingThunk(apiPayload)) as any)
          .then((action: any) => {
            if (updateBookingThunk.rejected.match(action)) {
              if (previousBooking) dispatch(updateBookingAction(previousBooking));
              dispatch(clearDragPatch(String(b.id)));
              throw new Error(action.payload as string || "Staff member already has an appointment at this time");
            }
            // Keep the optimistic Redux update (already applied via dispatch(updateBookingAction(b))
            // above). Overwriting with the API response would re-run svcTimeToLocal on service
            // times that were already correctly set, causing a double-offset (wrong display time).
            return action;
          })
          .catch((err: any) => {
            if (previousBooking) dispatch(updateBookingAction(previousBooking));
            dispatch(clearDragPatch(String(b.id)));
            throw err;
          });
      }
      return Promise.resolve();
    },
    deleteBooking: (id: string) => {
      dispatch(deleteBookingAction(id));
      if (!String(id).startsWith("b_")) {
        (dispatch(deleteBookingThunk(id)) as any).catch((err: any) =>
          console.error("Failed to delete booking from API:", err)
        );
      }
    },
    setBookings: (bs: Booking[]) => dispatch(setBookings(bs)),

    // ── Blocked times ────────────────────────────────────────────────────────
    blockedTimes,
    setBlockedTimes: (bts: BlockedTime[]) => dispatch(setBlockedTimes(bts)),

    addBlockedTime: (bt: BlockedTime) => {
      dispatch(addBlockedTimeAction(bt));
      if (bt.staffId) {
        // PATCH /api/v1/staff/:staffId — embed blocked_times in the staff update body
        (dispatch(updateStaffThunk({
          id: bt.staffId,
          data: {
            blocked_times: [{
              date: bt.date,
              start_time: bt.startTime,
              end_time: bt.endTime,
              reason: bt.reason,
            }],
          } as any,
        })) as any)
          .then((action: any) => {
            if (updateStaffThunk.fulfilled.match(action)) {
              const createdBts: any[] = action.payload?.blocked_times ?? [];
              const realBt = createdBts[0];
              const realId = realBt ? String(realBt.id) : "";
              if (realId && realId !== bt.id) {
                dispatch(replaceBlockedTimeId({ localId: bt.id, realId }));
              }
            }
          })
          .catch((err: any) => console.error("Failed to create blocked time:", err));
      }
    },

    updateBlockedTime: (bt: BlockedTime) => {
      dispatch(updateBlockedTimeAction(bt));
      if (!String(bt.id).startsWith("bt_")) {
        (dispatch(updateBlockedTimeThunk({
          id: bt.id,
          staffId: bt.staffId,
          data: {
            date: bt.date,
            start_time: bt.startTime,
            end_time: bt.endTime,
            reason: bt.reason,
          },
        })) as any)
          .then((action: any) => {
            if (updateBlockedTimeThunk.fulfilled.match(action)) {
              const p = action.payload;
              dispatch(updateBlockedTimeAction({
                ...p,
                date: p.date ? toLocalDateStr(p.date) : p.date,
              }));
            }
          })
          .catch((err: any) => console.error("Failed to update blocked time:", err));
      }
    },

    deleteBlockedTime: (id: string) => {
      const bt = blockedTimes.find((b) => b.id === id);
      dispatch(deleteBlockedTimeAction(id));
      if (!String(id).startsWith("bt_") && bt?.staffId) {
        (dispatch(deleteBlockedTimeThunk({ id, staffId: bt.staffId })) as any).catch((err: any) =>
          console.error("Failed to delete blocked time from API:", err)
        );
      }
    },

    // ── Calendar navigation ──────────────────────────────────────────────────
    viewMode,
    setViewMode: (v: ViewMode) => dispatch(setViewMode(v)),
    currentDate,
    setCurrentDate: (d: string) => dispatch(setCurrentDate(d)),
    interval,
    setInterval: (i: IntervalOption) => dispatch(setInterval(i)),
    navigate: (dir: 1 | -1) => dispatch(navigate(dir)),

    // ── Client stats ─────────────────────────────────────────────────────────
    clientStats,
    updateClientNotes: (clientId: string, notes: string, staffAlert: string) =>
      dispatch(updateClientNotes({ clientId, notes, staffAlert })),

    // ── Lookup data ───────────────────────────────────────────────────────────
    staffList,
    selectedStaffIds,
    setSelectedStaffIds: (ids: string[]) => dispatch(setSelectedStaffIds(ids)),
    highlightedBookingId,
    setHighlightedBookingId: (id: string | null) => dispatch(setHighlightedBookingId(id)),
    clientsList,
    servicesList,
    packagesList,
    membershipsList,
    productsList,
    staffSchedules,
  };
}
