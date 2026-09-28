// Geocoders sometimes return a Plus Code as the place name. Keep only
// readable address text; a code alone is not a usable place label.
export const formatAttendancePlaceLabel = (value?: string | null): string => {
  const text = value?.trim() || "";
  if (/^[+-]?\d{1,3}(?:\.\d+)?\s*,\s*[+-]?\d{1,3}(?:\.\d+)?$/.test(text)) return "";
  return text
    .replace(/\b[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/gi, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
};
