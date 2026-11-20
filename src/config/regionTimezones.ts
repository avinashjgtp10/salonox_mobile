// Timezone options for Region settings.
//
// The web's Region page offers a fixed list of 16 zones, which leaves a salon
// outside those regions unable to pick its own. Here the picker offers every
// IANA zone the device knows (`Intl.supportedValuesOf`, ~400 of them), with the
// 16 web zones kept in front so the common choices stay one tap away and the
// search box handles the rest.
//
// Nothing about the saved value changes: it is still a plain IANA zone string,
// so a zone chosen here shows and works on the web exactly as one chosen there
// — the web keeps whatever is saved even when it is outside its own list. Only
// what the picker offers is wider.
//
// Hermes does not always ship `Intl.supportedValuesOf`, so an engine without it
// falls back to the web's 16.

/** The web's list — the common zones, shown first. */
export const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Colombo",
  "Asia/Kathmandu",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

const allZones = (): string[] => {
  const supportedValuesOf = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  if (typeof supportedValuesOf !== "function") return [];
  try {
    return supportedValuesOf("timeZone");
  } catch {
    return [];
  }
};

export const REGION_TIMEZONES = [...new Set([...COMMON_TIMEZONES, ...allZones()])];
