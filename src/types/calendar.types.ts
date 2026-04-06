// ── Calendar entity ────────────────────────────────────────────────────────────
import type { EntityId } from './common.types';

export interface CalendarEvent {
  id:          EntityId;
  title:       string;
  start:       string; // ISO date string
  end:         string; // ISO date string
  clientId?:   string | null;
  staffId?:    string | null;
  status?:     string; // e.g. 'scheduled', 'completed', 'cancelled'
  [key: string]: any;          // allow extra fields from API
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateCalendarEventPayload {
  title:       string;
  start:       string;
  end:         string;
  clientId?:   string | null;
  staffId?:    string | null;
  status?:     string;
  [key: string]: any;
}

export interface UpdateCalendarEventPayload {
  id:   EntityId;
  data: Partial<CreateCalendarEventPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface CalendarEventResponse {
  data: CalendarEvent;
}

export interface CalendarEventListResponse {
  data: CalendarEvent[];
}
