// Where a client came from. Stored as clients.client_source (free VARCHAR — the
// backend accepts any value). Same list and same stored values as the web app's
// src/features/clients/constants/clientSources.ts, so a client edited on either
// side shows the same source.
export const CLIENT_SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "online_booking", label: "Online Booking" },
  { value: "other", label: "Other" },
] as const;

export const clientSourceLabel = (value?: string | null) =>
  CLIENT_SOURCES.find((source) => source.value === value)?.label ?? "";
