import type { RootState } from "@/store";
import { selectSalonCountry, selectSalonTimezone } from "@/store/salon/region.selectors";
import { salonCountry, salonDateKey, validSalonTimezone } from "@/utils/salonRegion";
import { dailySuggestions } from "@/utils/lunoxSuggestions";

describe("international salon dates", () => {
  it("uses Dubai midnight, regardless of the phone timezone", () => {
    const before = new Date("2026-11-05T19:59:59Z");
    expect(salonDateKey(before, "Asia/Dubai")).toBe("2026-11-05");
    expect(salonDateKey(before, "Asia/Kolkata")).toBe("2026-11-06");
    expect(salonDateKey(new Date("2026-11-05T20:00:00Z"), "Asia/Dubai")).toBe("2026-11-06");
  });
  it("handles northern and southern DST offsets", () => {
    expect(salonDateKey(new Date("2026-07-01T03:59:59Z"), "America/New_York")).toBe("2026-06-30");
    expect(salonDateKey(new Date("2026-07-01T04:00:00Z"), "America/New_York")).toBe("2026-07-01");
    expect(salonDateKey(new Date("2026-01-01T04:00:00Z"), "America/New_York")).toBe("2025-12-31");
    expect(salonDateKey(new Date("2026-12-31T13:00:00Z"), "Australia/Sydney")).toBe("2027-01-01");
  });
  it("keeps the web fallback for absent or invalid timezone settings", () => {
    expect(validSalonTimezone(null)).toBe("Asia/Kolkata");
    expect(validSalonTimezone("invalid/zone")).toBe("Asia/Kolkata");
  });
  it("separates country from telephone dial codes", () => {
    expect(salonCountry("United Arab Emirates", "+971", "Asia/Dubai")).toBe("AE");
    expect(salonCountry("Canada", "+1", "America/Toronto")).toBe("CA");
    expect(salonCountry("", "+1", "America/Toronto")).toBeNull();
    expect(salonCountry("", "", "Asia/Dubai")).toBe("AE");
    expect(salonCountry("France", "FR", "Europe/Paris")).toBeNull();
  });
  it("loads region from the active branch before Settings has been opened", () => {
    const state = {
      user: { user: { salonId: "india" } },
      branch: { activeBranchId: "dubai", branches: [
        { id: "india", timezone: "Asia/Kolkata", country: "India" },
        { id: "dubai", timezone: "Asia/Dubai", country: "United Arab Emirates" },
      ] },
      salon: { salons: [] },
    } as unknown as RootState;
    expect(selectSalonTimezone(state)).toBe("Asia/Dubai");
    expect(selectSalonCountry(state)).toBe("AE");
    state.branch.activeBranchId = "india";
    expect(selectSalonTimezone(state)).toBe("Asia/Kolkata");
    expect(selectSalonCountry(state)).toBe("IN");
  });
});

describe("country-specific campaign calendar", () => {
  it("does not show Indian festivals to a UAE salon", () => {
    expect(dailySuggestions("2026-11-06", undefined, "IN")[0]).toContain("Diwali");
    expect(dailySuggestions("2026-11-06", undefined, "AE").some(q => q.includes("Diwali"))).toBe(false);
  });
  it("uses UAE Eid dates instead of India's dates", () => {
    expect(dailySuggestions("2026-03-18", undefined, "AE")[0]).toContain("Eid al-Fitr");
    expect(dailySuggestions("2026-03-18", undefined, "IN").some(q => q.includes("Eid al-Fitr"))).toBe(false);
  });
  it("suggests UAE National Day campaigns only in the UAE", () => {
    expect(dailySuggestions("2026-11-30", undefined, "AE")[0]).toContain("UAE National Day");
    expect(dailySuggestions("2026-11-30", undefined, "IN")[0]).not.toContain("UAE National Day");
  });
  it("keeps two business questions for unsupported or unknown markets", () => {
    for (const country of [null, "FR", "ZZ"]) {
      const questions = dailySuggestions("2026-11-06", undefined, country);
      expect(questions).toHaveLength(2);
      expect(questions.some(q => q.includes("Diwali"))).toBe(false);
    }
  });
});
