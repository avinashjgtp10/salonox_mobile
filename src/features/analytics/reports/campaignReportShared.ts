// Shared vocabulary and formatting for the campaign engagement reports (Open
// Rate, Reply Rate). Both read the same wa_campaigns / wa_campaign_contacts
// data through the same backend filters, so their status labels, channel list
// and date presets have to agree — duplicating them is how two reports end up
// calling the same state "Opened" in one place and "Read" in the other.

// Campaign-level lifecycle states (wa_campaigns.status).
export const CAMPAIGN_STATUS_OPTIONS = [
  { id: "DRAFT", label: "Draft" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "SENDING", label: "Running" },
  { id: "PAUSED", label: "Paused" },
  { id: "COMPLETED", label: "Completed" },
  { id: "FAILED", label: "Failed" },
];

// Per-message states (wa_campaign_contacts.status). BLOCKED is a real fifth
// state — surfaced rather than folded into Failed, since a blocked recipient
// is a different problem to a send error.
export const MESSAGE_STATUS_OPTIONS = [
  { id: "SENT", label: "Sent" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "READ", label: "Opened" },
  { id: "FAILED", label: "Failed" },
  { id: "BLOCKED", label: "Blocked" },
];

// Only WhatsApp exists today. The generic campaigns/campaign_recipients tables
// that would carry SMS and Email have no rows and nothing writes to them, so
// those two are shown (keeping the intended shape discoverable) but disabled —
// a filter that can only ever return nothing is worse than a greyed-out one.
export const CHANNEL_OPTIONS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS (not available)", disabled: true },
  { id: "email", label: "Email (not available)", disabled: true },
];

export const CAMPAIGN_STATUS_LABELS: Record<string, string> =
  Object.fromEntries(CAMPAIGN_STATUS_OPTIONS.map((o) => [o.id, o.label]));
export const MESSAGE_STATUS_LABELS: Record<string, string> =
  Object.fromEntries(MESSAGE_STATUS_OPTIONS.map((o) => [o.id, o.label]));

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp", sms: "SMS", email: "Email",
};

export function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function formatDateTime(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()} ${hh}:${mi}`;
}

// Always carries the % sign — a bare "0" in a rate column reads as missing
// data rather than "nobody engaged".
export const fmtPct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;

export const campStatusClass = (s: string) =>
  s === "COMPLETED" ? "ok" : s === "SENDING" ? "run" : s === "PAUSED" ? "warn" : s === "FAILED" ? "fail" : "neutral";

// ── Date-range presets ──────────────────────────────────────────────────────
// Local-time based (not UTC) so "Today" means the salon's today, matching how
// every other date in the app is rendered.
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const CUSTOM_PRESET_ID = "custom";

export const PRESETS: { id: string; label: string; range: () => [string, string] }[] = [
  { id: "today", label: "Today", range: () => { const d = new Date(); return [ymd(d), ymd(d)]; } },
  { id: "yesterday", label: "Yesterday", range: () => { const d = new Date(); d.setDate(d.getDate() - 1); return [ymd(d), ymd(d)]; } },
  {
    id: "this_week", label: "This Week", range: () => {
      const d = new Date();
      // Week starts Monday — getDay() is 0 for Sunday, so shift it to 6.
      const start = new Date(d); start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return [ymd(start), ymd(d)];
    },
  },
  {
    id: "this_month", label: "This Month", range: () => {
      const d = new Date();
      return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), ymd(d)];
    },
  },
  {
    id: "last_month", label: "Last Month", range: () => {
      const d = new Date();
      // Day 0 of this month is the last day of the previous one.
      return [
        ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
        ymd(new Date(d.getFullYear(), d.getMonth(), 0)),
      ];
    },
  },
  {
    id: "this_year", label: "This Year", range: () => {
      const d = new Date();
      return [ymd(new Date(d.getFullYear(), 0, 1)), ymd(d)];
    },
  },
];

// PRESETS plus a "Custom Date Range" entry, for reports that pair the preset
// row with their own from/to date inputs. Kept as a separate array rather
// than appended to PRESETS because the campaign reports (Open Rate / Reply
// Rate) render PRESETS directly — adding Custom there would give them a
// button that just blanks their date range with no way to pick one.
// Selecting Custom computes no range; it hands control to the caller's
// inputs, so range() returns empty strings the caller ignores.
export const PRESETS_WITH_CUSTOM: typeof PRESETS = [
  ...PRESETS,
  { id: CUSTOM_PRESET_ID, label: "Custom Date Range", range: () => ["", ""] },
];
