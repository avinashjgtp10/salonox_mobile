// ── Booking entity ─────────────────────────────────────────────────────────────
export interface Booking {
  id:          string | number;
  clientId?:   string | null;
  staffId?:    string | null;
  serviceId?:  string | null;
  date:        string;
  startTime:   string;
  endTime:     string;
  status:      string; // pending, confirmed, cancelled, completed
  totalPrice?: number;
  [key: string]: any;
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateBookingPayload {
  clientId?:   string | null;
  staffId?:    string | null;
  serviceId?:  string | null;
  date:        string;
  startTime:   string;
  endTime:     string;
  [key: string]: any;
}

export interface UpdateBookingPayload {
  id:   string | number;
  data: Partial<CreateBookingPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface BookingResponse {
  data: Booking;
}

export interface BookingListResponse {
  data: Booking[];
}
