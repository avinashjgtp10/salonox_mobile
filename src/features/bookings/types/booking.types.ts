// ─── Staff ────────────────────────────────────────────────────────────────────
export interface Staff {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar?: string;
}

// ─── Client (lightweight — used in booking chips & dropdowns) ─────────────────
export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  eWallet: number;
}

// ─── Line items ───────────────────────────────────────────────────────────────
export interface ServiceItem {
  id: string;
  service_id?: string;
  service: string;
  staff: string;
  staffId: string;
  time: string;
  price: number;
  qty: number;
  discount?: number;
  total: number;
  duration?: number;
  isFav?: boolean;
  isPackageService?: boolean;
  // service_categories id, copied from the catalog service when picked — lets
  // a category-restricted membership benefit (wallet/discount/loyalty) know
  // whether this row is eligible.
  categoryId?: string;
  // This row's own real GST, attached at read time once the appointment has
  // a linked, paid sale (see appointmentsService's enrichItemsWithTax) —
  // undefined for an unpaid appointment, which falls back to receipt.ts's
  // blended bill-level rate approximation.
  tax?: number;
  // Copied from the service's own configured recipe when it's picked (see
  // ServiceRow.selectService) — `qty` is the STANDARD usage for this row at
  // its CURRENT billed quantity (unitQty × row.qty, kept in sync whenever
  // row.qty changes — see ServiceRow's rescaleConsumables), read-only in the
  // Consumables panel. `unitQty` is the immutable per-single-session recipe
  // rate that `qty` is rescaled from; never sent on the save payload, purely
  // a frontend bookkeeping field so a later qty change has a stable base to
  // multiply from instead of compounding off the already-scaled `qty`.
  // `actualQty` is what staff actually used, editable per appointment
  // (defaults to `qty` until manually touched, then stays put across further
  // qty changes since it now represents a deliberate override).
  // Carried on the appointment save payload but never sent to
  // calculate-totals — consumables never affect billing — and only actually
  // deducted from stock server-side once the appointment is paid.
  consumables?: {
    productId: string;
    productName: string;
    qty: number;
    unitQty?: number;
    unit: string;
    actualQty?: number;
    // The product's on-hand stock in BASE units, sent alongside the recipe by
    // the services API (CONSUMABLES_USED_SUBQUERY). Authoritative when
    // present — the Consumables panel used to resolve stock only through the
    // frontend's shared products cache, which is paged, shared with the retail
    // picker and replaced wholesale on every fetch, so a consumable outside
    // the cached page showed no stock at all. Optional because the reopened-
    // appointment path doesn't carry it yet; the cache remains the fallback.
    stock?: number;
  }[];
}

export interface PackageItem {
  id: string;
  packageId: string;
  packageName: string;
  price: number;
  qty: number;
  discount?: number;
  total: number;
  staffId?: string;
  time?: string;
  tax?: number;
}

export interface ProductItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  qty: number;
  discount?: number;
  total: number;
  staffId?: string;
  time?: string;
  tax?: number;
  // service_categories id, copied from the catalog product when picked — lets
  // a category-restricted membership benefit (wallet/discount/loyalty) know
  // whether this row is eligible.
  categoryId?: string;
}

export interface MembershipItem {
  id: string;
  membershipId: string;
  membershipName: string;
  price: number;
  qty: number;
  discount?: number;
  total: number;
  staffId?: string;
  time?: string;
  tax?: number;
}

export interface GroupItem {
  id: string;
  guestName: string;
  service: string;
  staffId: string;
  time: string;
  price: number;
  qty: number;
  total: number;
}

// ─── Booking status enums ─────────────────────────────────────────────────────
// Matches the backend's unified appointments.status column exactly — one field,
// no separate payment_status. "paid"/"partial" ARE the payment state.
export type BookingStatus   = "booked" | "paid" | "partial" | "cancelled" | "no-show" | "deleted";
export type PaymentMode     = "Cash" | "Card" | "UPI" | "Ewallet";
export type DiscountType    = "Percentage (%)" | "Flat (₹)";
export type ViewMode        = "Day" | "Week" | "Month" | "List Week";
export type IntervalOption  = "5 Mins" | "10 Mins" | "15 Mins" | "20 Mins" | "30 Mins" | "60 Mins";

// ─── Booking ─────────────────────────────────────────────────────────────────
export interface Booking {
  id: string;
  title?: string;
  invoiceNumber?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  staffId: string;
  staffName?: string;
  staffPhone?: string;
  staffEmail?: string;
  date: string;
  billDate: string;
  startTime: string;
  endTime: string;

  services: ServiceItem[];
  groupItems?: GroupItem[];
  packageItems?: PackageItem[];
  productItems?: ProductItem[];
  membershipItems?: MembershipItem[];

  status: BookingStatus;
  // Soft-deleted ("Delete Appointment") — the row still exists server-side
  // (deleted_at is set, not removed), so it keeps showing on the calendar,
  // greyed out, instead of vanishing without a trace. Redundant with
  // `status === "deleted"` but kept as its own flag since the backend still
  // tracks deleted_at as a separate audit timestamp alongside status.
  isDeleted?: boolean;
  // True once a Paid booking has been content-edited back down to "partial"
  // (see appointments.service.ts::update()) — keeps its services/items
  // editable on reopen, unlike a genuinely-original partial/deposit booking,
  // which stays locked to prevent changing what a deposit was collected for.
  reopenedFromPaid?: boolean;

  paymentMode?: PaymentMode;
  membershipWalletUsed?: number; // ₹ amount of this bill previously covered by the client's membership wallet
  applyMembershipWallet?: boolean; // persisted "Apply Membership" checkbox state, independent of payment
  membershipDiscountUsed?: number; // ₹ amount of this bill previously discounted by a percentage and/or loyalty membership (combined total)
  membershipPercentageDiscountUsed?: number; // just the Discount Balance (percentage) share of membershipDiscountUsed above — Loyalty's share is the difference
  applyMembershipDiscount?: boolean; // persisted "Membership Discount" (percentage) checkbox state, independent of payment
  applyLoyaltyDiscount?: boolean; // persisted "Loyalty Discount" checkbox state — independent sibling, stacks with applyMembershipDiscount above
  ewalletUsed?: number; // ₹ amount of this bill covered by the client's real eWallet balance
  splitDetails?: Record<string, number>; // per-method breakdown of the latest payment (e.g. {Cash: 200, eWallet: 300})

  rewardPoints?: string;
  rewardPointsValue?: number; // ₹ value of reward points redeemed against THIS bill (not the client's balance)
  exCharges?: number;
  discount?: number;
  discountAmount?: number; // computed monetary discount (₹), as opposed to discount which may be a raw %/flat input
  discountType?: DiscountType;
  gst?: number; // effective blended tax rate (%), for legacy/simple display
  gstAmount?: number; // total add-on tax amount included in grandTotal
  includeGst?: boolean; // persisted "Include GST" checkbox state, independent of payment — see applyMembershipWallet for the equivalent pattern
  taxBreakdown?: { name: string; rate: number; amount: number; inclusive: boolean }[];
  couponCode?: string;
  couponDiscount?: number;
  referralDiscount?: number; // ₹ instantly discounted off this bill for a referred client's first qualifying visit
  subtotal: number;
  tipAmount?: number;
  taxableAmount: number;
  grandTotal: number;
  payingNow: number;
  dueAmount: number;
  notes?: string;
  staffAlert?: string;
}

// ─── Blocked time ─────────────────────────────────────────────────────────────
export interface BlockedTime {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  token: string;
}
