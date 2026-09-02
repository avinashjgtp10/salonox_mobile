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
  // Set only on an appointment auto-created by the package-sale scheduling
  // feature — an exact link back to the client_packages/client_package_services
  // row this visit redeems on completion. Distinct from the fuzzy
  // isPackageService coverage-matching used elsewhere: this row was already
  // paid for in full at package-purchase time and needs no payment here.
  clientPackageId?: string;
  clientPackageServiceId?: string;
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
    // The product's own measure_unit — always what `stock` above is
    // denominated in, which is NOT necessarily `unit` above (staff can log
    // usage in any of the product's configured display units, e.g. "Bottle"
    // on an ml-based product). Total/Remaining Stock must always be labeled
    // and computed against baseUnit, never unit — showing "6000 L" next to a
    // stock figure that's actually 6000 ml was exactly this confusion.
    // Falls back to `unit` when absent (every consumable added via
    // ConsumablesTab's recipe editor has no separate unit picker, so its
    // `unit` already IS the base unit — only this row's own "+ Add
    // Consumable" flow can ever diverge the two).
    baseUnit?: string;
    // Multiply an amount expressed in `unit` by this to get the equivalent
    // in `baseUnit` (e.g. 1000 for unit="L"/baseUnit="ml"). 1 when unit
    // already equals baseUnit. Resolved once at add-time from the product's
    // configured unit conversions — see ServiceRow's confirmAddConsumable.
    unitRatio?: number;
  }[];
}

export interface PackageServiceScheduleDraft {
  serviceId?: string;
  serviceName: string;
  totalSessions: number;
  price: number;
  // Set only when staff opts to book a future appointment for this specific
  // service right now — mirrors CreateClientPackageDTO.services[].schedule
  // on the standalone Sell Package form. Requires serviceId (a real catalog
  // match) — a service the backend can't resolve to a catalog id can't be
  // auto-scheduled.
  schedule?: {
    scheduledAt: string;
    staffId?: string;
  };
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
  // Per-service breakdown of the picked package, resolved client-side at
  // pick time (see AppointmentModal.tsx's PackageRow) so staff can schedule
  // a future appointment for individual services right from this row —
  // same "schedule now, redeem on completion" capability the standalone
  // Sell Package form has. Undefined for a package with no resolvable
  // service breakdown (legacy catalog packages with no serviceIds).
  services?: PackageServiceScheduleDraft[];
  // True for a package built on the spot via "+ Sell Package"
  // (PackageCreateForm's lineItemMode) rather than picked from an existing
  // package/template — packageId is empty for these; `services`,
  // `packageName`, `price` and `customExpiry` fully define it instead. The
  // checkout payload sends it with no package_id at all, and
  // payments.service.ts's existing template-less fallback (already used for
  // legacy catalog "combo" packages) creates the real client_package from
  // this inline definition.
  isCustom?: boolean;
  customExpiry?: { neverExpires: boolean; expiryDate: string };
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
/** Item buckets the bill-level discount can be pointed at. Mirrors
 *  pricing.engine.ts's BucketType — note "packages" (plural), which is the
 *  backend's tax-bucket vocabulary, not this app's `packageRows`/`packageItems`. */
export type DiscountBucket  = "service" | "product" | "membership" | "packages";
/** A bucket, or the whole bill total. "bill" is EXCLUSIVE — it never coexists
 *  with bucket names, and is not merely shorthand for all four (it starts from
 *  the Total Bill figure, so coupon and membership benefits land differently).
 *  Mirrors pricing.engine.ts's DiscountScope. */
export type DiscountScope   = DiscountBucket | "bill";
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
  /** Dialing code for clientPhone (e.g. "91") — omit only when genuinely
   *  unknown; buildClientWhatsAppLink then falls back to India as a default. */
  clientPhoneCode?: string;
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
  // "Delete Appointment" is now a true hard delete server-side — a booking
  // with this set can only appear transiently in stale/cached data, since a
  // fresh fetch will never return a deleted appointment at all.
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
  packageCoveredAmount?: number; // ₹ of this bill covered by an already-purchased package's sessions (pre-tax, never billed or taxed again)
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
  // Buckets the bill discount applies to ("Apply to" checkboxes). Undefined on
  // bills saved before the feature existed — that means legacy scope, which is
  // NOT the same as all-four; see TotalsInput.discountAppliesTo in totalsUtils.ts.
  discountAppliesTo?: DiscountScope[];
  gst?: number; // effective blended tax rate (%), for legacy/simple display
  gstAmount?: number; // total add-on tax amount included in grandTotal
  includeGst?: boolean; // persisted "Include GST" checkbox state, independent of payment — see applyMembershipWallet for the equivalent pattern
  taxBreakdown?: { name: string; rate: number; amount: number; inclusive: boolean }[];
  couponCode?: string;
  couponDiscount?: number;
  referralDiscount?: number; // ₹ instantly discounted off this bill for a referred client's first qualifying visit
  subtotal: number;
  tipAmount?: number;
  /** Formerly the "Add Tip to Salon" checkbox's stored value — that control
   *  has been removed and tipAmount is now always excluded from
   *  grandTotal/revenue regardless of this flag. Kept only for reading a
   *  previously-saved appointment's historical value; not honored anywhere. */
  tipAddedToSalon?: boolean;
  /** Optional per-staff split of tipAmount, entered via the "Split by
   *  staff" popup — see StaffTipsModal.tsx. Undefined/empty when the tip
   *  wasn't split (single-staff sale, or staff just used the plain Tip
   *  field); tipAmount stays the source of truth for bill math either way
   *  and is expected to equal the sum of these entries. */
  tipBreakdown?: { staffId: string; staffName: string; amount: number }[];
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
