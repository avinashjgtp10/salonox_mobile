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
export type BookingStatus   = "Completed" | "Pending" | "Cancelled" | "Confirmed" | "Due";
export type PaymentStatus   = "Paid" | "Unpaid" | "Partial";
export type PaymentMode     = "Cash" | "Card" | "UPI" | "Ewallet";
export type DiscountType    = "Percentage (%)" | "Flat (₹)";
export type ViewMode        = "Day" | "Week" | "Month" | "List Week";
export type IntervalOption  = "5 Mins" | "10 Mins" | "15 Mins" | "20 Mins" | "30 Mins" | "60 Mins";

// ─── Booking ─────────────────────────────────────────────────────────────────
export interface Booking {
  id: string;
  title?: string;
  invoiceNumber?: number;
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

  // Payment — always Title Case ("Paid" / "Partial" / "Unpaid")
  paymentStatus: PaymentStatus;
  payment_status?: string | null; // snake_case alias from API
  paymentMode?: PaymentMode;

  rewardPoints?: string;
  rewardPointsValue?: number; // ₹ value of reward points redeemed against THIS bill (not the client's balance)
  exCharges?: number;
  discount?: number;
  discountAmount?: number; // computed monetary discount (₹), as opposed to discount which may be a raw %/flat input
  discountType?: DiscountType;
  gst?: number; // effective blended tax rate (%), for legacy/simple display
  gstAmount?: number; // total add-on tax amount included in grandTotal
  taxBreakdown?: { name: string; rate: number; amount: number; inclusive: boolean }[];
  couponCode?: string;
  couponDiscount?: number;
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
