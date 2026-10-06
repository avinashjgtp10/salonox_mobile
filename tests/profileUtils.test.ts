import {
  getAvatarFileName,
  getAvatarMimeType,
  validateAvatar,
  withAvatarCacheKey,
} from "@/features/profile/utils/avatar";
import { formatEmpty, formatMonthYear, getInitials, toProfileEditState } from "@/features/profile/utils/profileFormat";
import type { UserProfile } from "@/types/profile";

describe("avatar checks", () => {
  test("prefers the picker's MIME type and falls back to the file extension", () => {
    expect(getAvatarMimeType({ mimeType: " IMAGE/PNG ", uri: "file:///a.jpg" })).toBe("image/png");
    expect(getAvatarMimeType({ uri: "file:///photos/a.webp" })).toBe("image/webp");
    expect(getAvatarMimeType({ uri: "file:///photos/a.HEIC" })).toBe("image/jpeg");
  });

  test("derives a file name from the URI when the picker gives none", () => {
    expect(getAvatarFileName({ fileName: "  me.png ", uri: "file:///x.jpg" })).toBe("me.png");
    expect(getAvatarFileName({ uri: "file:///cache/crop.png?size=1" })).toBe("crop.png");
    expect(getAvatarFileName({ uri: "content://media/42" })).toBe("avatar.jpg");
  });

  test("rejects unsupported types and files over 999 KB", () => {
    expect(validateAvatar({ uri: "a" }, "image/gif")).toBe("Only JPEG, PNG, or WebP images are supported.");
    expect(validateAvatar({ fileSize: 999 * 1024 + 1, uri: "a" }, "image/png")).toBe(
      "Profile photo must be smaller than 999 KB.",
    );
    expect(validateAvatar({ fileSize: 999 * 1024, uri: "a" }, "image/png")).toBeNull();
    expect(validateAvatar({ uri: "a" }, "image/jpeg")).toBeNull();
  });

  test("adds a cache-busting key only after an upload", () => {
    expect(withAvatarCacheKey("https://cdn/a.png", 0)).toBe("https://cdn/a.png");
    expect(withAvatarCacheKey("https://cdn/a.png", 5)).toBe("https://cdn/a.png?v=5");
    expect(withAvatarCacheKey("https://cdn/a.png?sig=1", 5)).toBe("https://cdn/a.png?sig=1&v=5");
  });
});

describe("profile formatting", () => {
  test("builds up to two initials with a fallback", () => {
    expect(getInitials("  asha   rao kumar ")).toBe("AR");
    expect(getInitials("")).toBe("SO");
  });

  test("marks blank optional values as empty placeholders", () => {
    expect(formatEmpty("  ", "No city set")).toEqual({ isEmpty: true, text: "No city set" });
    expect(formatEmpty(" Pune ", "No city set")).toEqual({ isEmpty: false, text: "Pune" });
  });

  test("shows a dash for missing or invalid dates", () => {
    expect(formatMonthYear(null)).toBe("-");
    expect(formatMonthYear("not a date")).toBe("-");
  });

  test("starts editing with digits-only phone and empty strings for nulls", () => {
    const profile = { address: null, businessName: "Glow", fullName: "Asha", phone: "+91 98765-43210" } as UserProfile;

    expect(toProfileEditState(profile)).toMatchObject({ address: "", businessName: "Glow", fullName: "Asha" });
    expect(toProfileEditState(profile).phone).toMatch(/^\d+$/);
  });
});
