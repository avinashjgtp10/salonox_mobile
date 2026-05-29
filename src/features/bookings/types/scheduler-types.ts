export interface Staff {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar?: string;
}
export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  fileNo?: string;
  cardNumber?: string;
  eWallet: number;
}
export interface ServiceItem {
  id: string;
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
export interface PackageItem {
  id: string;
  packageId: string;
  packageName: string;
  price: number;
  qty: number;
  total: number;
}
export type BookingStatus = "Confirmed" | "Pending" | "Cancelled";
export type PaymentStatus = "Paid" | "Unpaid" | "Partial";
export type PaymentMode = "Cash" | "Card" | "UPI" | "Ewallet";
export type DiscountType = "Percentage (%)" | "Flat (₹)";
export interface Booking {
  id: string;
  title?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  staffId: string;
  date: string;
  billDate: string;
  startTime: string;
  endTime: string;
  services: ServiceItem[];
  groupItems?: GroupItem[];
  packages?: PackageItem[];
  packageItems?: PackageItem[];
  products?: any[];
  productItems?: any[];
  memberships?: any[];
  membershipItems?: any[];
  status: BookingStatus;
  _rawStatus?: string;
  paymentStatus: PaymentStatus;
  payment_status?: string | null;  // ✅ snake_case alias from DB/API
  paymentMode?: PaymentMode;
  rewardPoints?: string;
  exCharges?: number;
  discount?: number;
  discountType?: DiscountType;
  gst?: number;
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
export interface BlockedTime {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  token: string;
}
export interface LoginCredentials {
  email: string;
  password: string;
}
export type ViewMode = "Day" | "Week" | "Month" | "List Week";
export type IntervalOption =
  | "5 Mins"
  | "10 Mins"
  | "15 Mins"
  | "20 Mins"
  | "30 Mins"
  | "60 Mins";
