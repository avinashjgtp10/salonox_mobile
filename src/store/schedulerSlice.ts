import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  Booking,
  BlockedTime,
  ViewMode,
  IntervalOption,
  Staff,
  Client,
} from "../features/bookings/types/booking.types";

// ── ClientStat shape ──────────────────────────────────────────────────────────
export interface ClientStat {
  clientId: string;
  totalRevenue: number;
  rewardPointsTotal: number;
  ewalletAmt: number;
  membership: string;
  notes?: string;
  staffAlert?: string;
}

// ── Scheduler lookup data ─────────────────────────────────────────────────────
export interface SchedulerService {
  id: string; name: string; price: number; duration: number; categoryId?: string;
  // Carried through so ServiceRow's search dropdown (which prefers this
  // cached entry over a fresh API result for any service it already knows
  // about — see mergeServiceResults) doesn't silently serve a stale, empty
  // recipe for a service whose consumables were just configured.
  consumables_used?: { product_id: string; product_name?: string; qty: number; unit?: string }[];
}
export interface SchedulerPackage {
  id: string;
  name: string;
  price: number;
  /** Included service names — kept as plain strings because the package-
   *  coverage matching in AppointmentModal compares against them directly. */
  services: string[];
  /** Same services with their session counts, for the "+ Package" row's info
   *  panel. Separate from `services` above so widening this never changes the
   *  coverage matching. Empty for catalog packages, which have no session data. */
  serviceDetails?: { name: string; sessions: number }[];
  /** Free-text description. Only catalog packages have one — package
   *  templates have no description column at all. */
  description?: string;
  expiryDays?: number | null;
  neverExpires?: boolean;
  /** "Expires after this many services" (see PackageCreateForm.tsx) — caps
   *  how many of this package's services can ever be redeemed in total,
   *  independent of each service's own session count. NULL/undefined = no
   *  cap. Catalog packages have no such concept, only templates. */
  expireAfterServices?: number | null;
}
export interface SchedulerProduct {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  barcode?: string | null;
  retailPrice?: number | null;
  sellingPrice?: number | null;
  retail_price?: number | null;
  selling_price?: number | null;
  sellingPriceRaw?: number | null;
  categoryId?: string;
  // "retail" | "consumable" | "both" — needed to exclude pure-consumable
  // products from the sellable "+ Product" row picker (Quick Sale/Calendar),
  // while still keeping them in this same list for the Consumables panel's
  // stock lookups (ServiceRow.tsx reads this list unfiltered for that).
  productType?: string;
}
export interface SchedulerMembership { id: string; name: string; price: number; sessions: number; validFor: string; colour: string; description?: string; bonusCredit?: number }

// ── Staff schedule shape ──────────────────────────────────────────────────────
export interface StaffDaySchedule {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// ── Slice state ───────────────────────────────────────────────────────────────
interface SchedulerState {
  bookings: Booking[];
  blockedTimes: BlockedTime[];
  viewMode: ViewMode;
  currentDate: string;
  interval: IntervalOption;
  clientStats: ClientStat[];
  staffList: Staff[];
  // Empty array = "All Staff" (no filter). Multiple ids = show only those
  // staff members' columns/appointments side by side for comparison.
  selectedStaffIds: string[];
  highlightedBookingId: string | null;
  clientsList: Client[];
  servicesList: SchedulerService[];
  packagesList: SchedulerPackage[];
  membershipsList: SchedulerMembership[];
  productsList: SchedulerProduct[];
  // Keyed by staffId → then either a specific "YYYY-MM-DD" date (a date-specific
  // shift, which is how every shift saved from the Scheduled Shifts page is
  // stored) or a "dow-N" fallback key (0=Sun..6=Sat) for a recurring weekly
  // pattern with no concrete date. See useStaffSchedule.ts / WeekView.tsx.
  staffSchedules: Record<string, Record<string, StaffDaySchedule>>;
  scheduleVersion: number;
  dragPatchCache: Record<string, { startTime: string; endTime: string; staffId?: string }>;
  paymentPatchCache: Record<string, { status: string; payingNow: number; dueAmount: number; grandTotal?: number; paymentMode?: string; gstAmount?: number; taxBreakdown?: Booking["taxBreakdown"]; couponDiscount?: number; couponCode?: string; referralDiscount?: number; ewalletUsed?: number; membershipWalletUsed?: number; membershipDiscountUsed?: number; rewardPointsValue?: number; referralCreditUsed?: number; splitDetails?: Record<string, number> }>;
  serviceStaffCache: Record<string, Array<{ staffId: string; staff: string }>>;
}

const initialState: SchedulerState = {
  bookings: [],
  blockedTimes: [],
  viewMode: "Day",
  currentDate: new Date().toISOString().slice(0, 10),
  interval: "30 Mins",
  clientStats: [],
  staffList: [],
  selectedStaffIds: [],
  highlightedBookingId: null,
  clientsList: [],
  servicesList: [],
  packagesList: [],
  membershipsList: [],
  productsList: [],
  staffSchedules: {},
  scheduleVersion: 0,
  dragPatchCache: {},
  paymentPatchCache: {},
  serviceStaffCache: {},
};

const schedulerSlice = createSlice({
  name: "scheduler",
  initialState,
  reducers: {
    setBookings(state, { payload }: PayloadAction<Booking[]>) {
      state.bookings = payload.map((b) => {
        const drag    = state.dragPatchCache[String(b.id)];
        const pay     = state.paymentPatchCache[String(b.id)];
        const svcStaff = state.serviceStaffCache[String(b.id)];
        const merged  = drag ? { ...b, ...drag } : { ...b };
        if (pay) {
          (merged as any).status    = pay.status;
          (merged as any).payingNow = pay.payingNow;
          (merged as any).dueAmount = pay.status === "paid" ? 0 : pay.dueAmount;
          if (pay.grandTotal !== undefined) (merged as any).grandTotal = pay.grandTotal;
          if (pay.paymentMode !== undefined) (merged as any).paymentMode = pay.paymentMode;
          if (pay.gstAmount !== undefined) (merged as any).gstAmount = pay.gstAmount;
          if (pay.taxBreakdown !== undefined) (merged as any).taxBreakdown = pay.taxBreakdown;
          if (pay.couponDiscount !== undefined) (merged as any).couponDiscount = pay.couponDiscount;
          if (pay.couponCode !== undefined) (merged as any).couponCode = pay.couponCode;
          if (pay.referralDiscount !== undefined) (merged as any).referralDiscount = pay.referralDiscount;
          if (pay.ewalletUsed !== undefined) (merged as any).ewalletUsed = pay.ewalletUsed;
          if (pay.membershipWalletUsed !== undefined) (merged as any).membershipWalletUsed = pay.membershipWalletUsed;
          if (pay.membershipDiscountUsed !== undefined) (merged as any).membershipDiscountUsed = pay.membershipDiscountUsed;
          if (pay.rewardPointsValue !== undefined) (merged as any).rewardPointsValue = pay.rewardPointsValue;
          if (pay.referralCreditUsed !== undefined) (merged as any).referralCreditUsed = pay.referralCreditUsed;
          if (pay.splitDetails !== undefined) (merged as any).splitDetails = pay.splitDetails;
        }
        // Restore per-service staff assignments that the list endpoint collapses to appointment-level.
        if (svcStaff?.length && (merged as any).services?.length) {
          const apptStaffId = String((merged as any).staffId ?? "");
          const allSame = ((merged as any).services as any[]).every(
            (s: any) => !s.staffId || String(s.staffId) === apptStaffId
          );
          if (allSame) {
            (merged as any).services = ((merged as any).services as any[]).map((svc: any, idx: number) => {
              const cached = svcStaff[idx];
              return cached ? { ...svc, staffId: cached.staffId, staff: cached.staff } : svc;
            });
          }
        }
        return merged;
      });
    },
    setDragPatch(state, { payload }: PayloadAction<{ id: string; startTime: string; endTime: string; staffId?: string }>) {
      state.dragPatchCache[String(payload.id)] = {
        startTime: payload.startTime,
        endTime:   payload.endTime,
        ...(payload.staffId ? { staffId: payload.staffId } : {}),
      };
    },
    clearDragPatch(state, { payload }: PayloadAction<string>) {
      delete state.dragPatchCache[String(payload)];
    },
    // paymentPatchCache bridges the gap right after a payment, before the list
    // endpoint's own row catches up — but nothing ever cleared it afterward, so
    // it kept overriding every later refresh's fresh status/grandTotal/etc.
    // forever, e.g. making a later edit to that same (already-paid) appointment
    // look like it never refreshed. Called once a genuine update to the
    // appointment itself has round-tripped, so the next refresh trusts the
    // server's fresh response again instead of the stale payment snapshot.
    clearPaymentPatch(state, { payload }: PayloadAction<string>) {
      delete state.paymentPatchCache[String(payload)];
    },
    setStaffList(state, { payload }: PayloadAction<Staff[]>) {
      state.staffList = payload;
    },
    setSelectedStaffIds(state, { payload }: PayloadAction<string[]>) {
      state.selectedStaffIds = payload;
    },
    setHighlightedBookingId(state, { payload }: PayloadAction<string | null>) {
      state.highlightedBookingId = payload;
    },
    setClientsList(state, { payload }: PayloadAction<Client[]>) {
      state.clientsList = payload;
    },
    setServicesList(state, { payload }: PayloadAction<SchedulerService[]>) {
      state.servicesList = payload;
    },
    setPackagesList(state, { payload }: PayloadAction<SchedulerPackage[]>) {
      state.packagesList = payload;
    },
    setMembershipsList(state, { payload }: PayloadAction<SchedulerMembership[]>) {
      state.membershipsList = payload;
    },
    setProductsList(state, { payload }: PayloadAction<SchedulerProduct[]>) {
      state.productsList = payload;
    },
    setStaffSchedules(state, { payload }: PayloadAction<Record<string, Record<string, StaffDaySchedule>>>) {
      state.staffSchedules = payload;
    },
    bumpScheduleVersion(state) {
      state.scheduleVersion += 1;
      state.staffSchedules = {};
    },
    addBooking(state, { payload }: PayloadAction<Booking>) {
      state.bookings.push(payload);
      const services: any[] = (payload as any).services ?? [];
      const apptStaffId = String((payload as any).staffId ?? "");
      const hasPerServiceStaff = services.some(
        (s: any) => s.staffId && String(s.staffId) !== apptStaffId
      );
      if (hasPerServiceStaff) {
        state.serviceStaffCache[String(payload.id)] = services.map((s: any) => {
          const sf = s.staff;
          const staffStr = sf && typeof sf === "object" ? ((sf as any).name || "") : (sf ? String(sf) : "");
          return { staffId: String(s.staffId ?? ""), staff: staffStr };
        });
      }
    },
    updateBooking(state, { payload }: PayloadAction<Booking>) {
      const idx = state.bookings.findIndex((b) => b.id === payload.id);
      if (idx !== -1) state.bookings[idx] = payload;
      // Cache per-service staff assignments so setBookings can restore them after list-endpoint overwrites.
      const services: any[] = (payload as any).services ?? [];
      const apptStaffId = String((payload as any).staffId ?? "");
      const hasPerServiceStaff = services.some(
        (s: any) => s.staffId && String(s.staffId) !== apptStaffId
      );
      if (hasPerServiceStaff) {
        state.serviceStaffCache[String(payload.id)] = services.map((s: any) => {
          const sf = s.staff;
          const staffStr = sf && typeof sf === "object" ? ((sf as any).name || "") : (sf ? String(sf) : "");
          return { staffId: String(s.staffId ?? ""), staff: staffStr };
        });
      }
    },
    patchPaymentStatus(
      state,
      { payload }: PayloadAction<{
        id: string;
        status: string;
        payingNow?: number;
        dueAmount?: number;
        grandTotal?: number;
        paymentMode?: string;
        gstAmount?: number;
        taxBreakdown?: Booking["taxBreakdown"];
        couponDiscount?: number;
        couponCode?: string;
        referralDiscount?: number;
        ewalletUsed?: number;
        membershipWalletUsed?: number;
        membershipDiscountUsed?: number;
        rewardPointsValue?: number;
        referralCreditUsed?: number;
        splitDetails?: Record<string, number>;
      }>
    ) {
      const booking = state.bookings.find((b) => String(b.id) === String(payload.id));
      if (booking) {
        (booking as any).status = payload.status;
        if (payload.payingNow  !== undefined) (booking as any).payingNow  = payload.payingNow;
        if (payload.dueAmount  !== undefined) (booking as any).dueAmount  = payload.status === "paid" ? 0 : payload.dueAmount;
        if (payload.grandTotal !== undefined) (booking as any).grandTotal = payload.grandTotal;
        if (payload.paymentMode !== undefined) (booking as any).paymentMode = payload.paymentMode;
        if (payload.gstAmount !== undefined) (booking as any).gstAmount = payload.gstAmount;
        if (payload.taxBreakdown !== undefined) (booking as any).taxBreakdown = payload.taxBreakdown;
        if (payload.couponDiscount !== undefined) (booking as any).couponDiscount = payload.couponDiscount;
        if (payload.couponCode !== undefined) (booking as any).couponCode = payload.couponCode;
        if (payload.referralDiscount !== undefined) (booking as any).referralDiscount = payload.referralDiscount;
        if (payload.ewalletUsed !== undefined) (booking as any).ewalletUsed = payload.ewalletUsed;
        if (payload.membershipWalletUsed !== undefined) (booking as any).membershipWalletUsed = payload.membershipWalletUsed;
        if (payload.membershipDiscountUsed !== undefined) (booking as any).membershipDiscountUsed = payload.membershipDiscountUsed;
        if (payload.rewardPointsValue !== undefined) (booking as any).rewardPointsValue = payload.rewardPointsValue;
        if (payload.referralCreditUsed !== undefined) (booking as any).referralCreditUsed = payload.referralCreditUsed;
        if (payload.splitDetails !== undefined) (booking as any).splitDetails = payload.splitDetails;
      }
      state.paymentPatchCache[String(payload.id)] = {
        status:        payload.status,
        payingNow:     payload.payingNow ?? 0,
        dueAmount:     payload.status === "paid" ? 0 : (payload.dueAmount ?? 0),
        grandTotal:    payload.grandTotal,
        paymentMode:   payload.paymentMode,
        gstAmount:     payload.gstAmount,
        taxBreakdown:  payload.taxBreakdown,
        couponDiscount: payload.couponDiscount,
        couponCode:    payload.couponCode,
        referralDiscount: payload.referralDiscount,
        ewalletUsed: payload.ewalletUsed,
        membershipWalletUsed: payload.membershipWalletUsed,
        membershipDiscountUsed: payload.membershipDiscountUsed,
        rewardPointsValue: payload.rewardPointsValue,
        referralCreditUsed: payload.referralCreditUsed,
        splitDetails: payload.splitDetails,
      };
    },
    replaceBookingId(state, { payload }: PayloadAction<{ localId: string; realId: string }>) {
      const idx = state.bookings.findIndex((b) => b.id === payload.localId);
      if (idx !== -1) state.bookings[idx] = { ...state.bookings[idx], id: payload.realId };
      if (state.serviceStaffCache[payload.localId]) {
        state.serviceStaffCache[payload.realId] = state.serviceStaffCache[payload.localId];
        delete state.serviceStaffCache[payload.localId];
      }
    },
    deleteBooking(state, { payload }: PayloadAction<string>) {
      const id = String(payload);
      // "Delete Appointment" is a true hard delete server-side (the row and
      // every linked payment/sale/commission record are removed), so it must
      // vanish from the calendar immediately rather than sticking around
      // greyed out — there's no longer a row to re-fetch and reconcile against.
      state.bookings = state.bookings.filter((b) => b.id !== id);
      delete state.serviceStaffCache[id];
    },
    setBlockedTimes(state, { payload }: PayloadAction<BlockedTime[]>) {
      state.blockedTimes = payload;
    },
    addBlockedTime(state, { payload }: PayloadAction<BlockedTime>) {
      state.blockedTimes.push(payload);
    },
    updateBlockedTime(state, { payload }: PayloadAction<BlockedTime>) {
      const idx = state.blockedTimes.findIndex((b) => b.id === payload.id);
      if (idx !== -1) state.blockedTimes[idx] = payload;
    },
    replaceBlockedTimeId(state, { payload }: PayloadAction<{ localId: string; realId: string }>) {
      const idx = state.blockedTimes.findIndex((b) => b.id === payload.localId);
      if (idx !== -1) state.blockedTimes[idx] = { ...state.blockedTimes[idx], id: payload.realId };
    },
    deleteBlockedTime(state, { payload }: PayloadAction<string>) {
      state.blockedTimes = state.blockedTimes.filter((b) => b.id !== payload);
    },
    setViewMode(state, { payload }: PayloadAction<ViewMode>) {
      state.viewMode = payload;
    },
    setCurrentDate(state, { payload }: PayloadAction<string>) {
      state.currentDate = payload;
    },
    setInterval(state, { payload }: PayloadAction<IntervalOption>) {
      state.interval = payload;
    },
    navigate(state, { payload: dir }: PayloadAction<1 | -1>) {
      const d = new Date(state.currentDate + "T12:00:00");
      if (state.viewMode === "Day") d.setDate(d.getDate() + dir);
      else if (state.viewMode === "Week" || state.viewMode === "List Week") d.setDate(d.getDate() + dir * 7);
      else if (state.viewMode === "Month") d.setMonth(d.getMonth() + dir);
      state.currentDate = d.toISOString().slice(0, 10);
    },
    updateClientNotes(
      state,
      { payload }: PayloadAction<{ clientId: string; notes: string; staffAlert: string }>
    ) {
      let stat = state.clientStats.find((c) => c.clientId === payload.clientId);
      if (!stat) {
        stat = { clientId: payload.clientId, totalRevenue: 0, rewardPointsTotal: 0, ewalletAmt: 0, membership: "NA" };
        state.clientStats.push(stat);
      }
      stat.notes = payload.notes;
      stat.staffAlert = payload.staffAlert;
    },
  },
});

export const {
  setBookings, setDragPatch, clearDragPatch,
  setStaffList, setSelectedStaffIds, setHighlightedBookingId, setClientsList,
  setServicesList, setPackagesList, setMembershipsList, setProductsList,
  setStaffSchedules, bumpScheduleVersion,
  addBooking, updateBooking, patchPaymentStatus, clearPaymentPatch, replaceBookingId, deleteBooking,
  setBlockedTimes, addBlockedTime, updateBlockedTime, replaceBlockedTimeId, deleteBlockedTime,
  setViewMode, setCurrentDate, setInterval, navigate,
  updateClientNotes,
} = schedulerSlice.actions;

export default schedulerSlice.reducer;
