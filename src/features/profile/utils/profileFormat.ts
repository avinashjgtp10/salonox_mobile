import type { UserProfile } from "@/types/profile";
import { sanitizePhoneDigits } from "@/utils/validation";

export type ProfileEditState = {
  address: string;
  businessName: string;
  fullName: string;
  phone: string;
};

export const toProfileEditState = (profile: UserProfile): ProfileEditState => ({
  address: profile.address ?? "",
  businessName: profile.businessName ?? "",
  fullName: profile.fullName ?? "",
  phone: sanitizePhoneDigits(profile.phone ?? ""),
});

export const getInitials = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SO";

export const formatValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
};

/** For optional fields that show a muted placeholder (e.g. "No website set") when empty. */
export const formatEmpty = (value: string | null | undefined, emptyText: string) => {
  const trimmed = value?.trim();
  return trimmed ? { isEmpty: false, text: trimmed } : { isEmpty: true, text: emptyText };
};

export const formatMonthYear = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
