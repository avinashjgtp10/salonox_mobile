import { dailySuggestions, readDismissedSuggestions, suggestionDay } from "@/utils/lunoxSuggestions";

describe("daily Lunox suggestions", () => {
  it("keeps two stable questions for the day and replaces both tomorrow", () => {
    const today = dailySuggestions("2026-07-01", []);
    expect(today).toHaveLength(2);
    expect(new Set(today).size).toBe(2);
    expect(dailySuggestions("2026-07-01", [])).toEqual(today);
    expect(dailySuggestions("2026-07-02", []).some(question => today.includes(question))).toBe(false);
  });
  it("changes the day at salon midnight rather than UTC midnight", () => {
    expect(suggestionDay(new Date("2026-11-05T18:29:59Z"))).toBe("2026-11-05");
    expect(suggestionDay(new Date("2026-11-05T18:30:00Z"))).toBe("2026-11-06");
    expect(suggestionDay(new Date("2026-11-05T18:30:00Z"), "America/New_York")).toBe("2026-11-05");
  });
  it("uses festival campaigns only on the two preceding days, with fresh wording each day", () => {
    const twoDays = dailySuggestions("2026-11-06");
    const oneDay = dailySuggestions("2026-11-07");
    expect(twoDays).toHaveLength(2);
    expect(twoDays.every(question => question.includes("Diwali") && question.includes("WhatsApp"))).toBe(true);
    expect(oneDay.every(question => question.includes("Diwali") && question.includes("WhatsApp"))).toBe(true);
    expect(oneDay.some(question => twoDays.includes(question))).toBe(false);
    for (const day of ["2026-11-05", "2026-11-08", "2026-11-09"]) {
      expect(dailySuggestions(day).some(question => question.includes("Diwali"))).toBe(false);
    }
  });
  it("handles New Year across the year boundary", () => {
    expect(dailySuggestions("2026-12-30").every(question => question.includes("New Year"))).toBe(true);
  });
  it("selects the nearest festival deterministically when windows overlap", () => {
    const calendar = [{ name: "Later", date: "2026-07-03" }, { name: "Sooner", date: "2026-07-02" }];
    expect(dailySuggestions("2026-07-01", calendar).every(question => question.includes("Sooner"))).toBe(true);
  });
  it("does not reuse lunar dates in unsupported years", () => {
    expect(dailySuggestions("2028-11-06").some(question => question.includes("Diwali"))).toBe(false);
  });
  it("restores dismissals only for the same day and tolerates bad storage", () => {
    const saved = JSON.stringify({ day: "2026-11-06", dismissed: ["first", "second"] });
    expect(readDismissedSuggestions(saved, "2026-11-06")).toEqual(["first", "second"]);
    expect(readDismissedSuggestions(saved, "2026-11-07")).toEqual([]);
    expect(readDismissedSuggestions("broken", "2026-11-06")).toEqual([]);
    expect(readDismissedSuggestions(null, "2026-11-06")).toEqual([]);
  });
});
