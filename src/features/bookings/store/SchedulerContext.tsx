import type { ReactNode } from "react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toApiStaffId(id?: string | null): string | undefined {
  return id && UUID_RE.test(id) ? id : undefined;
}
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
  deductEWallet,
  processPaymentRewards,
  setSelectedStaffId,
} from "../../../store/schedulerSlice";
import { updateBookingThunk, deleteBookingThunk } from "../../../middleware/booking/booking.thunk";
import {
  fetchBlockedTimesThunk,
  createBlockedTimeThunk,
  updateBlockedTimeThunk,
  deleteBlockedTimeThunk,
} from "../../../middleware/blockedTime/blockedTime.thunk";
import type {
  Booking,
  BlockedTime,
  ViewMode,
  IntervalOption,
} from "../types/scheduler-types";

export function SchedulerProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSchedulerContext() {
  const dispatch = useAppDispatch();
  const {
    bookings,
    blockedTimes,
    viewMode,
    currentDate,
    interval,
    clientStats,
    staffList,
    selectedStaffId,
    clientsList,
    servicesList,
    packagesList,
    membershipsList,
    productsList,
    staffSchedules,
  } = useAppSelector((s) => s.scheduler);
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id);

  return {
    bookings,
    addBooking: (b: Booking) => dispatch(addBooking(b)),
    updateBooking: (b: Booking) => {
      console.log("[DEBUG Drag & Drop Context] updateBooking called with payload:", b);
      const previousBooking = bookings.find((existing) => String(existing.id) === String(b.id));
      dispatch(updateBookingAction(b));
      const rawStatus = ((b as any)._rawStatus || "").toLowerCase();
      const isLocked = rawStatus === "completed" || rawStatus === "no_show";
      if (!String(b.id).startsWith("b_") && !isLocked) {
        const [sh, sm] = b.startTime.split(":").map(Number);
        const [eh, em] = b.endTime.split(":").map(Number);
        const duration = Math.max(5, (eh * 60 + em) - (sh * 60 + sm));
        const apiPayload = {
          id: b.id,
          data: {
            scheduled_at: new Date(`${b.date}T${b.startTime}:00`).toISOString(),
            ends_at: new Date(`${b.date}T${b.endTime}:00`).toISOString(),
            duration_minutes: duration,
            staff_id: toApiStaffId(b.staffId),
            notes: b.notes || undefined,
            staff_alert: (b as any).staffAlert || undefined,
            status: b.status === "Cancelled" ? "cancelled"
              : b.status === "Pending" ? "booked"
                : "confirmed",
            title: (b as any).title,
            // Do NOT send services when rescheduling — the API runs a per-service
            // availability check that conflicts with the booking being moved itself.
            // Services remain associated with the booking; only the booking-level
            // time fields need to change for a drag-and-drop reschedule.
            package_items: b.packageItems ?? [],
            product_items: (b as any).productItems ?? [],
            membership_items: (b as any).membershipItems ?? [],
          },
        };
        console.log("[DEBUG Drag & Drop Context] Dispatching updateBookingThunk with payload:", apiPayload);
        return (dispatch(updateBookingThunk(apiPayload)) as any)
          .then((action: any) => {
            if (updateBookingThunk.rejected.match(action)) {
              console.error("[DEBUG Drag & Drop Context] updateBookingThunk rejected:", action.payload);
              if (previousBooking) dispatch(updateBookingAction(previousBooking));
              throw new Error(action.payload as string || "Staff member already has an appointment at this time");
            }
            // Keep the optimistic Redux update (already applied via dispatch(updateBookingAction(b))
            // above). Overwriting with the API response would re-run svcTimeToLocal on service
            // times that were already correctly set, causing a double-offset (wrong display time).
            return action;
          })
          .catch((err: any) => {
            console.error("[DEBUG Drag & Drop Context] updateBooking catch error:", err);
            if (previousBooking) dispatch(updateBookingAction(previousBooking));
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
      if (salonId) {
        (dispatch(createBlockedTimeThunk({
          salon_id: salonId,
          staff_id: bt.staffId,
          date: bt.date,
          start_time: bt.startTime,
          end_time: bt.endTime,
          reason: bt.reason,
        })) as any)
          .then((action: any) => {
            if (createBlockedTimeThunk.fulfilled.match(action)) {
              const realId = String(action.payload?.id || "");
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
          data: {
            staff_id: bt.staffId,
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
      dispatch(deleteBlockedTimeAction(id));
      if (!String(id).startsWith("bt_")) {
        (dispatch(deleteBlockedTimeThunk(id)) as any).catch((err: any) =>
          console.error("Failed to delete blocked time from API:", err)
        );
      }
    },

    fetchBlockedTimes: (date?: string, staffId?: string) =>
      (dispatch(fetchBlockedTimesThunk({ date, staffId })) as any)
        .then((action: any) => {
          if (fetchBlockedTimesThunk.fulfilled.match(action)) {
            dispatch(setBlockedTimes(action.payload));
          }
        })
        .catch((err: any) => console.error("Failed to fetch blocked times:", err)),

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
    deductEWallet: (clientId: string, amount: number) =>
      dispatch(deductEWallet({ clientId, amount })),
    processPaymentRewards: (clientId: string, billAmount: number) =>
      dispatch(processPaymentRewards({ clientId, billAmount })),

    // ── Lookup data ───────────────────────────────────────────────────────────
    staffList,
    selectedStaffId,
    setSelectedStaffId: (id: string | null) => dispatch(setSelectedStaffId(id)),
    clientsList,
    servicesList,
    packagesList,
    membershipsList,
    productsList,
    staffSchedules,
  };
}
