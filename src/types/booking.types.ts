// ── Booking / Appointment entity (matches backend snake_case response) ──────────
import type { EntityId } from "./common.types";

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Booking {
  id: EntityId;
  salon_id: string;
  branch_id?: string | null;
  client_id?: string | null;
  staff_id?: string | null;
  service_id?: string | null;
  title?: string | null;
  notes?: string | null;
  status: AppointmentStatus | string;
  scheduled_at: string;      // ISO timestamp
  duration_minutes: number;
  ends_at?: string | null;   // ISO timestamp
  colour?: string | null;
  sale_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;        // allow extra fields without TS errors
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateBookingPayload {
  salon_id: string;
  branch_id?: string;
  client_id?: string;
  staff_id?: string;
  service_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  title?: string;
  notes?: string;
  colour?: string;
  [key: string]: any;
}

export interface UpdateBookingPayload {
  id: EntityId;
  data: Partial<CreateBookingPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface BookingResponse {
  success: boolean;
  data: Booking;
  message?: string;
}

export interface BookingListResponse {
  success: boolean;
  data: Booking[];
  message?: string;
}

