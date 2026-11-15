import { afterEach, describe, expect, it } from "@jest/globals";
import { applyAppTimezone, differsFromDevice, getAppTimezone, resetAppTimezone } from "@/utils/timezoneShim";

// Captured before any test installs the shim, so expectations are computed by the platform itself with an EXPLICIT zone (never by the shim).
const NativeDate = Date;
const NativeDTF = Intl.DateTimeFormat;
const nativeGetHours = Date.prototype.getHours;
const deviceZone = new NativeDTF().resolvedOptions().timeZone;

afterEach(() => { resetAppTimezone(); });

/** Wall-clock parts of an instant in `zone`, from the platform's own explicit-zone formatter. */
function expected(t: number, zone: string) {
  const parts = new NativeDTF("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" }).formatToParts(new NativeDate(t));
  const v = (k: string) => parts.find((p) => p.type === k)!.value;
  const hour = Number(v("hour")) === 24 ? 0 : Number(v("hour"));
  const asUtc = NativeDate.UTC(Number(v("year")), Number(v("month")) - 1, Number(v("day")), hour, Number(v("minute")), Number(v("second")));
  return {
    year: Number(v("year")), month: Number(v("month")) - 1, date: Number(v("day")), hours: hour, minutes: Number(v("minute")), seconds: Number(v("second")),
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday")),
    offsetMin: Math.round((asUtc - Math.floor(t / 1000) * 1000) / 60000),
  };
}

// Zones to test: a fixed-offset one, a half-hour one, a quarter-hour one, and two with daylight saving — keeping only those that
// actually differ from the machine running the tests (on a machine in Dubai, Dubai is the identity case and is tested separately).
const CANDIDATES = ["Asia/Dubai", "Asia/Kolkata", "Asia/Kathmandu", "Pacific/Kiritimati", "Pacific/Pago_Pago", "America/New_York", "Europe/London", "Australia/Lord_Howe"];
const ZONES = CANDIDATES.filter((z) => differsFromDevice(z));

// Instants spread over a year, including both sides of New York's and London's daylight-saving changes (not on the ambiguous hour itself).
const INSTANTS = [
  Date.UTC(2026, 10, 5, 6, 31, 12), Date.UTC(2026, 2, 8, 9, 15), Date.UTC(2026, 2, 8, 6, 59), Date.UTC(2026, 10, 1, 8, 0), Date.UTC(2026, 9, 25, 12, 0),
  Date.UTC(2026, 5, 15, 23, 59, 59), Date.UTC(2027, 0, 1, 0, 0, 0), Date.UTC(2026, 11, 31, 18, 45), Date.UTC(2025, 6, 4, 3, 5), Date.UTC(2031, 0, 20, 14, 30),
];

describe("app time zone", () => {
  it("has zones to test on this machine", () => {
    expect(ZONES.length).toBeGreaterThanOrEqual(3);
  });

  for (const zone of ZONES) {
    describe(zone, () => {
      it("reads the salon's wall clock through every getter", () => {
        expect(applyAppTimezone(zone)).toBe(zone);
        for (const t of INSTANTS) {
          const d = new Date(t);
          const e = expected(t, zone);
          expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getDay()])
            .toEqual([e.year, e.month, e.date, e.hours, e.minutes, e.seconds, e.day]);
          expect(d.getTimezoneOffset()).toBe(-e.offsetMin || 0);
          expect(d.getMilliseconds()).toBe(0);
        }
      });

      it("never changes the moment itself", () => {
        applyAppTimezone(zone);
        for (const t of INSTANTS) {
          const d = new Date(t);
          expect(d.getTime()).toBe(t);
          expect(d.toISOString()).toBe(new NativeDate(t).toISOString());
          expect(JSON.stringify(d)).toBe(JSON.stringify(new NativeDate(t)));
          expect(d.valueOf()).toBe(t);
        }
        expect(new Date(5).getTime()).toBe(5);
        expect(Date.UTC(2026, 10, 5)).toBe(NativeDate.UTC(2026, 10, 5));
        expect(Math.abs(Date.now() - NativeDate.now())).toBeLessThan(1000);
      });

      it("builds a moment from wall-clock parts in the salon's zone", () => {
        applyAppTimezone(zone);
        for (const t of INSTANTS) {
          const e = expected(t, zone);
          const built = new Date(e.year, e.month, e.date, e.hours, e.minutes, e.seconds);
          expect(built.getTime()).toBe(t);
        }
        // overflow rolls over like the platform's own constructor does
        const roll = new Date(2026, 11, 31, 23, 59, 60);
        expect([roll.getFullYear(), roll.getMonth(), roll.getDate(), roll.getHours(), roll.getMinutes()]).toEqual([2027, 0, 1, 0, 0]);
        expect(new Date(2026, 0).getDate()).toBe(1);
        expect(new Date(99, 0, 1).getFullYear()).toBe(1999);
      });

      it("reads a string without an offset as the salon's wall clock, and leaves absolute ones alone", () => {
        applyAppTimezone(zone);
        const wall = new Date("2026-07-15T10:35:00");
        expect([wall.getHours(), wall.getMinutes(), wall.getDate()]).toEqual([10, 35, 15]);
        expect(new Date("2026-07-15 10:35:00").getHours()).toBe(10);
        expect(new Date("2026-07-15T10:35:00Z").getTime()).toBe(NativeDate.UTC(2026, 6, 15, 10, 35));
        expect(new Date("2026-07-15T10:35:00+05:30").getTime()).toBe(NativeDate.UTC(2026, 6, 15, 5, 5));
        expect(new Date("2026-07-15").getTime()).toBe(NativeDate.UTC(2026, 6, 15)); // date-only is UTC by definition
        expect(Date.parse("2026-07-15T10:35:00Z")).toBe(NativeDate.UTC(2026, 6, 15, 10, 35));
        expect(new Date("garbage").getTime()).toBeNaN();
        expect(new Date(NaN).getHours()).toBeNaN();
      });

      it("leaves Postgres-style timestamps (space separator, hours-only or fractional offsets) alone — the API sends timestamptz exactly like that", () => {
        applyAppTimezone(zone);
        const instant = NativeDate.UTC(2026, 10, 5, 9, 30);
        const e = expected(instant, zone);
        for (const s of ["2026-11-05 09:30:00+00", "2026-11-05 09:30:00.123456+00", "2026-11-05 09:30:00+0000", "2026-11-05 09:30:00+00:00", "2026-11-05 15:00:00+05:30", "2026-11-05 05:30:00-04", "2026-11-05 13:30:00+04"]) {
          const d = new Date(s);
          expect(Math.floor(d.getTime() / 60000)).toBe(instant / 60000);
          expect([d.getHours(), d.getMinutes()]).toEqual([e.hours, e.minutes]); // the salon's wall time of that instant, not the device's
        }
        expect(Date.parse("2026-11-05 09:30:00+00")).toBe(instant);
      });

      it("setters work on the salon's wall clock", () => {
        applyAppTimezone(zone);
        const t = NativeDate.UTC(2026, 6, 15, 12, 0, 0);
        const e = expected(t, zone);
        const d = new Date(t);
        d.setHours(0, 0, 0, 0);
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([e.year, e.month, e.date, 0, 0]);
        d.setDate(d.getDate() + 1);
        expect(d.getHours()).toBe(0);
        d.setMonth(0, 31);
        expect([d.getMonth(), d.getDate()]).toEqual([0, 31]);
        d.setFullYear(2030, 5, 10);
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2030, 5, 10, 0]);
        d.setMinutes(45, 30, 5);
        expect([d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([45, 30, 5]);
        expect(new Date(NaN).setHours(1)).toBeNaN();
      });

      it("formats in the salon's zone unless a zone is named", () => {
        applyAppTimezone(zone);
        for (const t of INSTANTS.slice(0, 5)) {
          const e = expected(t, zone);
          const hh = String(e.hours).padStart(2, "0");
          expect(new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })).toBe(`${hh}:${String(e.minutes).padStart(2, "0")}`);
          expect(new Date(t).toLocaleDateString("en-CA")).toBe(`${e.year}-${String(e.month + 1).padStart(2, "0")}-${String(e.date).padStart(2, "0")}`);
          expect(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(t)).toBe(`${hh}:${String(e.minutes).padStart(2, "0")}`);
          // the platform may report a zone under its canonical alias (Asia/Katmandu), so compare with what it reports for the same zone
          expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(new NativeDTF("en-US", { timeZone: zone }).resolvedOptions().timeZone);
        }
        // an explicit zone is respected
        expect(new Date(INSTANTS[0]).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })).toBe("06:31");
        expect(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(INSTANTS[0])).toBe("06:31");
      });

      it("toString names the salon's zone", () => {
        applyAppTimezone(zone);
        const t = INSTANTS[0];
        const e = expected(t, zone);
        const text = new Date(t).toString();
        expect(text).toContain(`${String(e.hours).padStart(2, "0")}:${String(e.minutes).padStart(2, "0")}:12`);
        expect(text).toMatch(/GMT[+-]\d{4} \(.+\)$/);
        expect(new Date(NaN).toString()).toBe("Invalid Date");
        expect(new Date(t).toDateString()).toMatch(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/);
      });
    });
  }
});

describe("app time zone: lifecycle", () => {
  it("is not installed (and nothing changes) when the zone matches the device's, or is blank or invalid", () => {
    for (const z of [deviceZone, "", null, undefined, "Not/AZone"]) {
      expect(applyAppTimezone(z as string | null | undefined)).toBeNull();
      expect(getAppTimezone()).toBeNull();
      expect(globalThis.Date).toBe(NativeDate);
      expect(Intl.DateTimeFormat).toBe(NativeDTF);
      expect(Date.prototype.getHours).toBe(nativeGetHours);
    }
  });

  it("installs, switches between zones, and restores the platform exactly", () => {
    const [a, b] = ZONES;
    expect(applyAppTimezone(a)).toBe(a);
    expect(getAppTimezone()).toBe(a);
    expect(globalThis.Date).not.toBe(NativeDate);
    const first = new Date(INSTANTS[0]).getHours();
    expect(applyAppTimezone(b)).toBe(b);
    expect(new Date(INSTANTS[0]).getHours()).toBe(expected(INSTANTS[0], b).hours);
    expect(first).toBe(expected(INSTANTS[0], a).hours);
    expect(applyAppTimezone(b)).toBe(b); // idempotent
    resetAppTimezone();
    expect(getAppTimezone()).toBeNull();
    expect(globalThis.Date).toBe(NativeDate);
    expect(Intl.DateTimeFormat).toBe(NativeDTF);
    expect(Date.prototype.getHours).toBe(nativeGetHours);
    expect(new Date(INSTANTS[0]).getHours()).toBe(new NativeDate(INSTANTS[0]).getHours());
  });

  it("instances and instanceof keep working while installed", () => {
    applyAppTimezone(ZONES[0]);
    const d = new Date();
    expect(d instanceof Date).toBe(true);
    expect(d instanceof NativeDate).toBe(true);
    expect(new NativeDate() instanceof Date).toBe(true);
    expect(d.constructor).toBe(Date);
    expect(typeof Date()).toBe("string");
    expect(Object.prototype.toString.call(d)).toBe("[object Date]");
  });

  it("the date an app screen would call 'today' is the salon's date, even when the device's is another day", () => {
    // 21:00 UTC on 5 Nov: still 5 Nov for the Pacific zones behind UTC, already 6 Nov for zones ahead of it
    const t = Date.UTC(2026, 10, 5, 21, 0, 0);
    for (const z of ZONES) {
      applyAppTimezone(z);
      const e = expected(t, z);
      const d = new Date(t);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; // what todayIsoDate/getDateKey compute
      expect(ymd).toBe(`${e.year}-${String(e.month + 1).padStart(2, "0")}-${String(e.date).padStart(2, "0")}`);
    }
  });
});
