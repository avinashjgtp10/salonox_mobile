import type {
  AppointmentPaymentMethod,
  AppointmentStatus,
} from "@/types/appointment";

export const STATUS_FILTERS: ("All" | AppointmentStatus)[] = [
  "All",
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
  "Partial",
  "Completed",
  "Cancelled",
  "Missed",
];

export const CALENDAR_STATUS_FILTERS: {
  color: string;
  label: string;
  status: "All" | AppointmentStatus;
}[] = [
  { color: "#B9689B", label: "All", status: "All" },
  { color: "#D97706", label: "Booked", status: "Upcoming" },
  { color: "#16A34A", label: "Paid", status: "Completed" },
  { color: "#6D28D9", label: "Partial", status: "Partial" },
  { color: "#DC2626", label: "Cancelled", status: "Cancelled" },
  { color: "#0891B2", label: "No Show", status: "Missed" },
  { color: "#6B7280", label: "Deleted", status: "Deleted" },
];

export const STAFF_AVAILABILITY_REALTIME_ENTITIES = new Set([
  "appointments",
  "staff",
  "staffAvailability",
]);

export const FORM_STATUS_OPTIONS: AppointmentStatus[] = [
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
  "Partial",
  "Completed",
  "Cancelled",
  "Missed",
];

export const PAYMENT_METHODS: AppointmentPaymentMethod[] = [
  "Cash",
  "Card",
  "UPI",
  "Wallet",
  "Bank Transfer",
  "Other",
];

export const CLIENT_SEARCH_MIN_LETTERS = 3;
export const CLIENT_SEARCH_RESULT_LIMIT = 8;
export const AUTOCOMPLETE_DROPDOWN_GAP = 14;
export const CLIENT_SEARCH_DEBOUNCE_MS = 240;
