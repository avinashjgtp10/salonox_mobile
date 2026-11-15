// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The app's time zone (mirrors salon_mgm_frontend/src/utils/timezoneShim.ts so the app and web agree).
//
// JavaScript's local-time Date API (getHours, getDate, new Date(y, m, d, h), toLocaleTimeString, ...) reads the DEVICE's zone. A salon in
// Dubai managed from a phone still set to India therefore saw India's clock on the Calendar, in Quick Sale's default time, on "today"
// everywhere, while the server (reports, reminders, receipts) used the salon's zone. This module makes the whole app read the SALON's zone
// instead, by making the local-time Date API behave as if the device were in that zone. A moment (getTime, toISOString) is never changed — only
// which wall clock it is read on:
//
//   getters       getHours / getDate / getDay / getTimezoneOffset ...  -> the salon's wall clock
//   setters       setHours / setDate ...                               -> work on the salon's wall clock
//   constructor   new Date(2026, 10, 5, 10, 35), new Date("2026-11-05T10:35") -> that wall time IN THE SALON's zone
//                 (a string with an offset or "Z", a date-only "2026-11-05" (UTC by definition) and a number are left alone)
//   formatting    toLocale*String / Intl.DateTimeFormat without an explicit timeZone -> the salon's zone
//
// It is installed only when the salon's zone really differs from the device's (a salon on a device in its own zone changes nothing — the
// identity case, which is every salon today), and it is removed again on sign-out. Code that names a zone explicitly (Intl with `timeZone`)
// is not affected and stays correct. Never add device-zone compensation next to this.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

type Parts = { y: number; mo: number; d: number; h: number; mi: number; s: number; ms: number };

interface Zone {
  id: string;
  /** Minutes the zone is ahead of UTC at instant `t` (ms). */
  offsetAt(t: number): number;
}

const METHODS = [
  "getFullYear", "getMonth", "getDate", "getDay", "getHours", "getMinutes", "getSeconds", "getMilliseconds", "getTimezoneOffset",
  "setFullYear", "setMonth", "setDate", "setHours", "setMinutes", "setSeconds", "setMilliseconds",
  "toString", "toDateString", "toTimeString", "toLocaleString", "toLocaleDateString", "toLocaleTimeString",
] as const;
type MethodName = (typeof METHODS)[number];

interface Store {
  /** The platform's own Date / Intl.DateTimeFormat and Date methods, captured once (survives Fast Refresh of this module). */
  D: DateConstructor;
  DTF: typeof Intl.DateTimeFormat;
  native: Record<MethodName, (...args: any[]) => any>;
  active: Zone | null;
  zones: Map<string, Zone | null>;
}

const g = globalThis as any;
const S: Store = (g.__salonoxTimezone ??= (() => {
  const native = {} as Store["native"];
  for (const m of METHODS) native[m] = (Date.prototype as any)[m];
  return { D: Date, DTF: Intl.DateTimeFormat, native, active: null, zones: new Map() } as Store;
})());

const MIN = 60_000;
const scratch = new S.D(0); // a native Date used only for UTC arithmetic

/** ms since epoch of a UTC wall time, with years 0-99 kept as written (Date.UTC would map them to 1900-1999). */
function utcFrom(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0): number {
  scratch.setTime(0);
  scratch.setUTCFullYear(y, mo, d);
  scratch.setUTCHours(h, mi, s, ms);
  return scratch.getTime();
}

// ── zones ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const FIXED_FROM = Date.UTC(2020, 0, 1);
const FIXED_TO = Date.UTC(2040, 0, 1);

function makeZone(id: string): Zone | null {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new S.DTF("en-US", { timeZone: id, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  } catch {
    return null; // not a time zone
  }
  const compute = (t: number): number => {
    const v = { year: 0, month: 1, day: 1, hour: 0, minute: 0, second: 0 } as Record<string, number>;
    for (const p of fmt.formatToParts(new S.D(t))) if (p.type in v) v[p.type] = Number(p.value);
    const wall = utcFrom(v.year, v.month - 1, v.day, v.hour === 24 ? 0 : v.hour, v.minute, v.second);
    return Math.round((wall - Math.floor(t / 1000) * 1000) / MIN);
  };

  // A zone with no daylight saving (India, the Gulf...) has one offset: detect it once so the hot path is a constant.
  let fixed: number | null = compute(FIXED_FROM);
  for (let t = FIXED_FROM; t < FIXED_TO && fixed !== null; t += 30 * 86_400_000) if (compute(t) !== fixed) fixed = null;

  const cache = new Map<number, number>();
  const offsetAt = (t: number): number => {
    if (fixed !== null && t >= FIXED_FROM && t < FIXED_TO) return fixed;
    const bucket = Math.floor(t / (15 * MIN)); // offsets change on quarter-hour boundaries
    let v = cache.get(bucket);
    if (v === undefined) {
      if (cache.size > 4000) cache.clear();
      v = compute(bucket * 15 * MIN);
      cache.set(bucket, v);
    }
    return v;
  };
  return { id, offsetAt };
}

function zoneFor(id: string): Zone | null {
  if (!S.zones.has(id)) S.zones.set(id, makeZone(id));
  return S.zones.get(id) ?? null;
}

/** Whether `id` has the same offset as the device at every sample over a year either side of now — i.e. installing it would change nothing. */
function sameAsDevice(zone: Zone): boolean {
  const now = S.D.now();
  for (let k = -12; k <= 12; k++) {
    const t = now + k * 30 * 86_400_000;
    const device = -S.native.getTimezoneOffset.call(new S.D(t));
    if (zone.offsetAt(t) !== device) return false;
  }
  return true;
}

// ── wall clock <-> instant, in the active zone ─────────────────────────────────────────────────────────────────────

const zone = (): Zone => S.active as Zone;

/** The wall-clock reading of instant `t` in the active zone, as a UTC-based ms value (read it with getUTC*). */
const wallOf = (t: number): number => t + zone().offsetAt(t) * MIN;

/** The instant at which the active zone's wall clock reads `wall` (a UTC-based ms value). Settles offsets that change near the guess (DST). */
function wallToInstant(wall: number): number {
  if (wall !== wall) return NaN; // an invalid date stays invalid (and must never reach Intl, which throws on it)
  const a = zone().offsetAt(wall);
  let t = wall - a * MIN;
  const b = zone().offsetAt(t);
  if (b !== a) t = wall - b * MIN;
  return t;
}

function partsOf(self: Date): Parts | null {
  const t = self.getTime();
  if (t !== t) return null;
  scratch.setTime(wallOf(t));
  return { y: scratch.getUTCFullYear(), mo: scratch.getUTCMonth(), d: scratch.getUTCDate(), h: scratch.getUTCHours(), mi: scratch.getUTCMinutes(), s: scratch.getUTCSeconds(), ms: scratch.getUTCMilliseconds() };
}

// ── the replacements ───────────────────────────────────────────────────────────────────────────────────────────────

type Getter = (p: Parts) => number;
const getter = (read: Getter) =>
  function (this: Date): number {
    const p = partsOf(this);
    return p ? read(p) : NaN;
  };

function setter(apply: (p: Parts, a: number[]) => void, nanBase = false) {
  return function (this: Date, ...args: number[]): number {
    const a = args.map(Number);
    let p = partsOf(this);
    if (!p) {
      if (!nanBase) return NaN; // a setter on an Invalid Date stays invalid (setFullYear alone starts again from 1970-01-01)
      p = { y: 1970, mo: 0, d: 1, h: 0, mi: 0, s: 0, ms: 0 };
    }
    apply(p, a);
    const t = wallToInstant(utcFrom(p.y, p.mo, p.d, p.h, p.mi, p.s, p.ms));
    this.setTime(t);
    return this.getTime();
  };
}
const has = (a: number[], i: number) => a.length > i;

function withZone(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  return options && options.timeZone ? options : { ...options, timeZone: zone().id };
}

function gmtOffsetText(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `GMT${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}${String(abs % 60).padStart(2, "0")}`;
}

/** Date#toString / toDateString / toTimeString in the active zone: "Thu Nov 05 2026 10:35:00 GMT+0400 (Gulf Standard Time)". */
function longText(self: Date, kind: "all" | "date" | "time"): string {
  const t = self.getTime();
  if (t !== t) return "Invalid Date";
  const parts = new S.DTF("en-US", {
    timeZone: zone().id, hourCycle: "h23", weekday: "short", month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "long",
  }).formatToParts(new S.D(t));
  const v = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${v("weekday")} ${v("month")} ${v("day")} ${v("year")}`;
  const time = `${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}:${v("second")} ${gmtOffsetText(zone().offsetAt(t))} (${v("timeZoneName")})`;
  return kind === "date" ? date : kind === "time" ? time : `${date} ${time}`;
}

const REPLACEMENTS: Record<MethodName, (...args: any[]) => any> = {
  getFullYear: getter((p) => p.y),
  getMonth: getter((p) => p.mo),
  getDate: getter((p) => p.d),
  getDay: function (this: Date) {
    const t = this.getTime();
    if (t !== t) return NaN;
    scratch.setTime(wallOf(t));
    return scratch.getUTCDay();
  },
  getHours: getter((p) => p.h),
  getMinutes: getter((p) => p.mi),
  getSeconds: getter((p) => p.s),
  getMilliseconds: getter((p) => p.ms),
  getTimezoneOffset: function (this: Date) {
    const t = this.getTime();
    return t !== t ? NaN : -zone().offsetAt(t) || 0;
  },
  setFullYear: setter((p, a) => { p.y = a[0]; if (has(a, 1)) p.mo = a[1]; if (has(a, 2)) p.d = a[2]; }, true),
  setMonth: setter((p, a) => { p.mo = a[0]; if (has(a, 1)) p.d = a[1]; }),
  setDate: setter((p, a) => { p.d = a[0]; }),
  setHours: setter((p, a) => { p.h = a[0]; if (has(a, 1)) p.mi = a[1]; if (has(a, 2)) p.s = a[2]; if (has(a, 3)) p.ms = a[3]; }),
  setMinutes: setter((p, a) => { p.mi = a[0]; if (has(a, 1)) p.s = a[1]; if (has(a, 2)) p.ms = a[2]; }),
  setSeconds: setter((p, a) => { p.s = a[0]; if (has(a, 1)) p.ms = a[1]; }),
  setMilliseconds: setter((p, a) => { p.ms = a[0]; }),
  toString: function (this: Date) { return longText(this, "all"); },
  toDateString: function (this: Date) { return longText(this, "date"); },
  toTimeString: function (this: Date) { return longText(this, "time"); },
  toLocaleString: function (this: Date, locales?: any, options?: Intl.DateTimeFormatOptions) { return S.native.toLocaleString.call(this, locales, withZone(options)); },
  toLocaleDateString: function (this: Date, locales?: any, options?: Intl.DateTimeFormatOptions) { return S.native.toLocaleDateString.call(this, locales, withZone(options)); },
  toLocaleTimeString: function (this: Date, locales?: any, options?: Intl.DateTimeFormatOptions) { return S.native.toLocaleTimeString.call(this, locales, withZone(options)); },
};

/** A string the platform would read as the DEVICE's local time (no offset / "Z" / GMT, and not a date-only ISO date, which is UTC) -> read as the salon's. */
function parseString(v: string): number {
  const t = S.D.parse(v);
  if (t !== t) return NaN;
  const s = v.trim();
  if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s)) return t; // date-only ISO: UTC by definition
  if (/(?:z|gmt|utc|[+-]\d{2}:?\d{2}|\))\s*$/i.test(s)) return t; // carries its own zone
  // ...including an hours-only offset after a time, which is how the backend can hand timestamptz columns over unparsed
  // ("2026-11-05 09:30:00+00", "...13:30:00+04"). Missing this read the device's wall digits as the salon's, shifting
  // every API timestamp by the difference between the two zones.
  if (/\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*[+-]\d{2}\s*$/.test(s)) return t;
  const d = new S.D(t); // the platform read it on the device's wall clock; reread those parts on the salon's
  const n = S.native;
  return wallToInstant(utcFrom(n.getFullYear.call(d), n.getMonth.call(d), n.getDate.call(d), n.getHours.call(d), n.getMinutes.call(d), n.getSeconds.call(d), n.getMilliseconds.call(d)));
}

function ShimDate(this: any, ...args: any[]): any {
  if (!new.target) return String(new ShimDateCtor());
  if (args.length === 0) return new S.D();
  if (args.length === 1) {
    const v = args[0];
    if (typeof v === "string") return new S.D(parseString(v));
    return new S.D(v instanceof S.D ? v.getTime() : v);
  }
  const [y, mo, d = 1, h = 0, mi = 0, s = 0, ms = 0] = args.map(Number);
  if ([y, mo, d, h, mi, s, ms].some((x) => x !== x)) return new S.D(NaN);
  const year = Number.isInteger(y) && y >= 0 && y <= 99 ? 1900 + y : y; // the same rule the platform applies
  return new S.D(wallToInstant(utcFrom(year, mo, d, h, mi, s, ms)));
}
const ShimDateCtor = ShimDate as unknown as DateConstructor;
Object.defineProperty(ShimDate, "name", { value: "Date" });
Object.defineProperty(ShimDate, "length", { value: 7 });
ShimDate.prototype = S.D.prototype;
Object.assign(ShimDate, { now: S.D.now.bind(S.D), UTC: S.D.UTC.bind(S.D), parse: (v: string) => parseString(String(v)) });

function WrappedDateTimeFormat(locales?: any, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new S.DTF(locales, withZone(options));
}
WrappedDateTimeFormat.prototype = S.DTF.prototype;
(WrappedDateTimeFormat as any).supportedLocalesOf = S.DTF.supportedLocalesOf;

// ── install / remove ───────────────────────────────────────────────────────────────────────────────────────────────

function install(z: Zone): void {
  S.active = z;
  const proto = S.D.prototype as any;
  for (const m of METHODS) proto[m] = REPLACEMENTS[m];
  proto.constructor = ShimDate;
  g.Date = ShimDate;
  (Intl as any).DateTimeFormat = WrappedDateTimeFormat;
}

function uninstall(): void {
  if (!S.active) return;
  S.active = null;
  const proto = S.D.prototype as any;
  for (const m of METHODS) proto[m] = S.native[m];
  proto.constructor = S.D;
  g.Date = S.D;
  (Intl as any).DateTimeFormat = S.DTF;
}

/** The IANA zone the app is currently reading time in when it differs from the device's, else null (the device's own zone is in use). */
export const getAppTimezone = (): string | null => S.active?.id ?? null;

/** Whether `timeZone` is a real zone with a different offset from the device's (so applying it would change anything). */
export function differsFromDevice(timeZone: string | null | undefined): boolean {
  const z = timeZone ? zoneFor(timeZone) : null;
  return !!z && !sameAsDevice(z);
}

/**
 * Makes the whole app read time in `timeZone` (an IANA name). A blank / invalid zone, or one that matches the device's, leaves — or restores —
 * the device's own behaviour. Safe to call repeatedly. Returns the zone now in effect (null = the device's).
 */
export function applyAppTimezone(timeZone: string | null | undefined): string | null {
  const z = timeZone ? zoneFor(timeZone) : null;
  if (!z || sameAsDevice(z)) {
    uninstall();
    return null;
  }
  if (S.active?.id !== z.id) {
    uninstall();
    install(z);
  }
  return z.id;
}

/** Back to the device's own clock (sign-out). */
export const resetAppTimezone = (): void => { uninstall(); };
