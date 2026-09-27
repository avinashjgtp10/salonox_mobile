import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, CheckLg, StarFill, PersonFill, PeopleFill, CalendarEvent,
  GeoAltFill, TelephoneFill, Instagram, Facebook, Globe, PinMapFill,
  Plus, X, ChevronLeft, ChevronRight, Search,
  SunFill, SunsetFill, ShieldLockFill, LightningChargeFill, Gem,
  Headset, CalendarWeek,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { ONLINE_BOOKING } from "../../../services/api/endpoints";
import {
  fetchPublicSalonBySlugThunk,
  createPublicBookingThunk,
  sendBookingEmailOtpThunk,
  verifyBookingEmailOtpThunk,
} from "../../../middleware/onlineBooking/onlineBooking.thunk";
import {
  DAYS, MONTHS, staffName, initials, fmtDur, fmtPrice, hashHue,
  salonDateStr, toSalonInstant,
  type ServiceItem, type StaffMember,
} from "../../online-booking/components/BookingFlow/shared";
import CalendarPicker from "../components/CalendarPicker";
import { useDisplayFont } from "../useDisplayFont";
import "../styles/PublicBooking.scss";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAddress(salon: any): string {
  if (!salon) return "";
  const addr = salon.address;
  if (addr && typeof addr === "object") {
    return [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
  }
  return [addr, salon.city, salon.state, salon.pincode].filter(Boolean).join(", ");
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const OTP_RESEND_SECONDS = 30;

// Sentinel "staff member" for "I don't mind who" — never sent to the backend
// as a real staff_id (both the availability lookup and the booking payload
// omit staff_id entirely when this is selected), so the server's existing
// auto-assign-a-real-stylist logic runs exactly like it always has for an
// unspecified staff_id.
const ANY_STAFF_ID = "any";
const ANY_STAFF: StaffMember = { id: ANY_STAFF_ID, name: "Any Available" };

/** A UUID is unusable as something a customer reads out over the phone. */
function shortBookingId(id?: string | null): string {
  if (!id) return "—";
  return `#BK${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** #rgb / #rrggbb / #rrggbbaa -> [r, g, b], or null if it isn't a hex colour. */
function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length < 6) return null;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A salon's brand colour can be light or dark; the text on it has to follow. */
function readableOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#17130a" : "#ffffff";
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

// Monogram discs stand in for the photos no service has. A fixed set of muted
// tints indexed by a hash, so a grid reads as one palette — a free-running hue
// puts orange next to lime and fights the accent.
const MARK_TONES = [
  "linear-gradient(145deg, #e7efe9, #d5e3d9)", // sage
  "linear-gradient(145deg, #efeae1, #e2dacd)", // sand
  "linear-gradient(145deg, #e8e9f0, #d8dae6)", // lilac
  "linear-gradient(145deg, #e5eef1, #d3e1e8)", // sky
  "linear-gradient(145deg, #f0eae7, #e3d7d2)", // clay
  "linear-gradient(145deg, #ecefe4, #dde3d0)", // olive
  "linear-gradient(145deg, #efe8ec, #e1d6dc)", // mauve
  "linear-gradient(145deg, #e3eeeb, #d1e3de)", // teal
];

const tileBg = (key: string): string => MARK_TONES[hashHue(key) % MARK_TONES.length];
const monogram = (key: string): string => (key.trim().charAt(0) || "S").toUpperCase();

const STEP_LABELS = [
  { label: "Services", note: "Choose your service(s)" },
  { label: "Date & Time", note: "Select a convenient slot" },
  { label: "Confirm", note: "Review and book" },
] as const;

/** Monday of the week containing `d`. */
function weekStartOf(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const shift = (out.getDay() + 6) % 7; // Mon = 0
  out.setDate(out.getDate() - shift);
  return out;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// 1 = the booking page (services, stylist, date & time), 2 = confirm
// (details + review), 3 = booked.
type Step = 1 | 2 | 3;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preselectServiceId = searchParams.get("serviceId");
  const preselectStaffId   = searchParams.get("staffId");
  const navigate = useNavigate();

  const dispatch = useAppDispatch();

  useDisplayFont();

  const { salonDetails, loading, bookingLoading, error } = useAppSelector((s) => s.onlineBooking);

  const [step, setStep] = useState<Step>(1);
  const [activeCat, setActiveCat] = useState<string>("All");
  const [serviceSearch, setServiceSearch] = useState("");
  const catbarRef = useRef<HTMLDivElement>(null);
  const [catbarOverflowing, setCatbarOverflowing] = useState(false);

  const [selServices, setSelServices] = useState<ServiceItem[]>([]);
  const [selStaff, setSelStaff] = useState<StaffMember | null>(null);
  const [selDate, setSelDate] = useState<Date>(new Date());
  const [selTime, setSelTime] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(new Date()));
  const [showMonth, setShowMonth] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", countryCode: "+91", notes: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Email OTP — `emailVerifiedFor` pins the verification to the exact address
  // it was granted for, so editing the email after a successful verify (or
  // switching addresses) can't carry the old verification over.
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [emailVerifiedFor, setEmailVerifiedFor] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const [preselected, setPreselected] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

  useEffect(() => {
    if (slug) dispatch(fetchPublicSalonBySlugThunk(slug));
  }, [slug, dispatch]);

  // The page root is its own scroll container: index.css pins body to
  // `overflow: hidden`, so window.scrollTo is a no-op here.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { rootRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  // Section anchors, used by the nav links and the summary's "Change" actions.
  const servicesRef = useRef<HTMLElement>(null);
  const stylistRef  = useRef<HTMLElement>(null);
  const whenRef     = useRef<HTMLElement>(null);
  const aboutRef    = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    const root = rootRef.current, el = ref.current;
    if (!root || !el) return;
    // offsetTop is relative to the scroll container, less the sticky nav.
    root.scrollTo({ top: Math.max(0, el.offsetTop - 84), behavior: "smooth" });
  };

  const services: ServiceItem[] = salonDetails?.services ?? [];
  const staffList: StaffMember[] = salonDetails?.staff ?? [];
  const salon = salonDetails?.salon ?? null;
  const salonName = salon?.business_name || salon?.display_name || salon?.name || "This salon";
  const currencyCode: string | undefined = salon?.currency;
  const address = buildAddress(salon);
  const phone: string = salon?.phone ?? "";
  const city: string = [salon?.city, salon?.state].filter(Boolean).join(", ");

  const cancellationNoticeHours: number = Number(salon?.cancellation_notice_hours) || 0;

  // Hero band photo: whichever gallery photos the salon has uploaded, shown
  // behind the hero. Rendered full-strength (no wash across the whole image)
  // with only a left-side scrim behind the text, so any photo the salon adds
  // shows crisp rather than looking hazy/blurry. Auto-advances every 4s, plus
  // a left/right arrow pair on desktop, a swipe (native touch drag, tracked
  // below) on mobile, and tap-able position dots on any device — any manual
  // move is still respected, it just gets overridden by the next 4s tick.
  const gallery: string[] = Array.isArray(salon?.gallery) ? salon.gallery : [];
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const heroSwipeStartX = useRef<number | null>(null);
  const goHeroPhoto = (dir: 1 | -1) =>
    setHeroPhotoIndex((i) => (i + dir + gallery.length) % gallery.length);
  useEffect(() => {
    if (gallery.length < 2) return;
    const t = setInterval(() => goHeroPhoto(1), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery.length]);
  const handleHeroTouchStart = (e: React.TouchEvent) => { heroSwipeStartX.current = e.touches[0].clientX; };
  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (heroSwipeStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - heroSwipeStartX.current;
    heroSwipeStartX.current = null;
    if (Math.abs(delta) < 40) return; // not a deliberate swipe
    goHeroPhoto(delta < 0 ? 1 : -1);
  };

  // A map link is only ever built from a real configured address. Falling back
  // to the salon's *name* hands Google a search term that resolves to an
  // unrelated business — a confidently wrong pin is worse than none.
  const mapQuery: string = useMemo(() => {
    const trimmed = (address ?? "").trim();
    return trimmed.length >= 6 ? trimmed : "";
  }, [address]);

  // Only an explicit false narrows these — an older salon record, or a database
  // without the columns yet, keeps today's behaviour.
  const allowSameDay: boolean = salon?.allow_same_day_booking !== false;
  const allowMultipleServices: boolean = salon?.allow_multiple_services !== false;
  const aboutEnabled: boolean = salon?.about_enabled !== false;
  const instagramUrl: string = aboutEnabled ? String(salon?.instagram_url ?? "").trim() : "";
  const facebookUrl: string = aboutEnabled ? String(salon?.facebook_url ?? "").trim() : "";
  const websiteUrl: string = aboutEnabled ? String(salon?.website ?? "").trim() : "";
  const description: string = aboutEnabled
    ? String(salon?.marketplace_description ?? salon?.description ?? "").trim()
    : "";
  // Facilities/Amenities + Salon Specialities — same fixed enum keys the
  // admin Marketplace Profile checkboxes save (e.g. "wheelchair_accessible");
  // humanized here rather than duplicating the admin page's exact label map,
  // so the two never drift out of sync over a wording tweak on one side.
  const humanizeKey = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const salonFeatures: string[] = aboutEnabled
    ? [
        ...(Array.isArray(salon?.amenities) ? salon.amenities : []),
        ...(Array.isArray(salon?.highlights) ? salon.highlights : []),
        ...(Array.isArray(salon?.values) ? salon.values : []),
      ].map(humanizeKey)
    : [];
  const showAbout = !!(description || salonFeatures.length > 0 || mapQuery || instagramUrl || facebookUrl || websiteUrl);

  // 0/absent means "not configured" — fall back to the same 30-day default the
  // backend uses rather than locking the picker down to today.
  const maxAdvanceDays: number = Number(salon?.max_advance_days) > 0
    ? Number(salon.max_advance_days)
    : 30;

  // Pre-select service/staff from the query params once data has loaded.
  useEffect(() => {
    if (preselected || loading || (!preselectServiceId && !preselectStaffId)) return;
    if (services.length === 0 && staffList.length === 0) return;

    if (preselectServiceId) {
      const svc = services.find((s) => String(s.id) === preselectServiceId);
      if (svc) setSelServices([svc]);
    }
    if (preselectStaffId) {
      const st = staffList.find((s) => String(s.id) === preselectStaffId);
      if (st) setSelStaff(st);
    }
    setPreselected(true);
  }, [preselected, loading, services, staffList, preselectServiceId, preselectStaffId]);

  // The picker opens on today. If the salon doesn't take same-day bookings,
  // move to tomorrow once the salon's settings have loaded, so the flow never
  // starts on a date the picker has disabled.
  useEffect(() => {
    if (allowSameDay) return;
    const today = new Date();
    if (!sameDay(selDate, today)) return;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelDate(tomorrow);
    setSelTime(null);
  }, [allowSameDay, selDate]);

  const totalDuration = useMemo(
    () => selServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0),
    [selServices]
  );
  const totalPrice = useMemo(
    () => selServices.reduce((sum, s) => sum + (typeof s.price === "string" ? parseFloat(s.price) || 0 : s.price), 0),
    [selServices]
  );

  // Real availability for the chosen stylist, date and total duration.
  const [slots, setSlots] = useState<{ morning: string[]; afternoon: string[] }>({ morning: [], afternoon: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  useEffect(() => {
    // Every slot list is per-stylist, so there is nothing meaningful to
    // request until the customer has chosen one.
    if (!salon?.id || !selStaff || totalDuration <= 0) { setSlots({ morning: [], afternoon: [] }); return; }
    let cancelled = false;
    setSlotsLoading(true);
    api.get(ONLINE_BOOKING.AVAILABILITY(String(salon.id)), {
      params: {
        date: salonDateStr(selDate),
        durationMinutes: totalDuration,
        // Lets the server narrow to staff who can actually perform what's in
        // the basket.
        serviceIds: selServices.map((s) => String(s.id)).join(","),
        // Omitted (not sent) for "Any Available" — the server already treats
        // a missing staffId as "anyone eligible", computing availability
        // across every stylist who can do these services.
        ...(selStaff.id !== ANY_STAFF_ID ? { staffId: String(selStaff.id) } : {}),
      },
    })
      .then((res) => {
        if (cancelled) return;
        const all: string[] = res.data?.data?.slots ?? [];
        setSlots({
          morning: all.filter((t) => t.endsWith("AM")),
          afternoon: all.filter((t) => t.endsWith("PM")),
        });
      })
      .catch(() => { if (!cancelled) setSlots({ morning: [], afternoon: [] }); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [salon?.id, selDate, selStaff, totalDuration]);

  // ── Catalogue ───────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) {
      const name = String((s as any).category_name || "Other");
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [services]);

  // Right-edge fade for the category bar — shown only while there's actually
  // more to scroll to, hidden once scrolled to the end (or if everything
  // already fits) so it never falsely implies more categories.
  useEffect(() => {
    const el = catbarRef.current;
    if (!el) { setCatbarOverflowing(false); return; }
    const update = () => setCatbarOverflowing(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories.length]);

  // Tapping a category previously only changed which chip looked active —
  // on a long list (a salon can have 10+ categories) the chip you just
  // tapped could still sit partly or fully scrolled out of view, especially
  // near the end of the row. Bring it fully into view instead of leaving the
  // customer to manually swipe and hunt for their own selection.
  function scrollCatIntoView(el: HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  const filtered = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((s) => {
      const inCategory = activeCat === "All" || String((s as any).category_name || "Other") === activeCat;
      if (!inCategory) return false;
      if (!q) return true;
      // Name only — a salon with a large catalogue (seen with 200+ services)
      // has no other quick way to find one specific service beyond scrolling
      // past every category.
      return s.name.toLowerCase().includes(q);
    });
  }, [services, activeCat, serviceSearch]);

  function toggleService(svc: ServiceItem) {
    setSelServices((prev) => {
      const already = prev.some((s) => s.id === svc.id);
      if (already) return prev.filter((s) => s.id !== svc.id);
      // When the salon books one service per appointment, picking a second
      // replaces the first rather than adding to it.
      return allowMultipleServices ? [...prev, svc] : [svc];
    });
    // Duration changes invalidate whichever slot was picked for the old total.
    setSelTime(null);
  }

  function pickStaff(next: StaffMember) {
    setSelStaff(next);
    // Slots are per-stylist; keeping the old selection would submit a time the
    // newly chosen stylist may not have free.
    setSelTime(null);
  }

  // ── Week strip ──────────────────────────────────────────────────────────────
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  // Mirrors the rules the server enforces, so a day the customer can click is
  // always a day the API will accept.
  const isDayDisabled = useMemo(() => (d: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    if (day < today) return true;
    if (!allowSameDay && day.getTime() === today.getTime()) return true;
    const max = new Date(today);
    max.setDate(max.getDate() + maxAdvanceDays);
    return day > max;
  }, [allowSameDay, maxAdvanceDays]);

  const weekLabel = `${MONTHS[weekDays[3].getMonth()]} ${weekDays[3].getFullYear()}`;
  const atFirstWeek = weekStart.getTime() <= weekStartOf(new Date()).getTime();

  function shiftWeek(delta: number) {
    setWeekStart((w) => {
      const next = new Date(w);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  }

  function pickDate(d: Date) {
    setSelDate(d);
    setSelTime(null);
  }

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const emailValid = EMAIL_RE.test(form.email.trim());
  const emailVerified = emailVerifiedFor !== null && emailVerifiedFor === form.email.trim().toLowerCase();

  function handleEmailChange(value: string) {
    setForm((f) => ({ ...f, email: value }));
    // Any edit invalidates whatever OTP state applied to the previous value.
    setOtpSentTo(null);
    setOtpCode("");
    setOtpError(null);
    setEmailVerifiedFor(null);
  }

  async function handleSendOtp() {
    const email = form.email.trim();
    if (!emailValid || otpSending || resendIn > 0) return;
    setOtpError(null);
    setOtpSending(true);
    try {
      await dispatch(sendBookingEmailOtpThunk(email)).unwrap();
      setOtpSentTo(email.toLowerCase());
      setOtpCode("");
      setResendIn(OTP_RESEND_SECONDS);
    } catch (err: any) {
      setOtpError(typeof err === "string" ? err : "Failed to send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    const email = form.email.trim();
    if (otpCode.trim().length !== 6 || otpVerifying) return;
    setOtpError(null);
    setOtpVerifying(true);
    try {
      await dispatch(verifyBookingEmailOtpThunk({ email, otp: otpCode.trim() })).unwrap();
      setEmailVerifiedFor(email.toLowerCase());
    } catch (err: any) {
      setOtpError(typeof err === "string" ? err : "Invalid or expired OTP.");
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleSubmit() {
    if (!salon?.id || !selStaff || selServices.length === 0 || !selTime || !emailVerified) return;
    setSubmitError(null);
    try {
      const appointment = await dispatch(
        createPublicBookingThunk({
          salon_id: String(salon.id),
          service_ids: selServices.map((s) => String(s.id)),
          // Omitted for "Any Available" — the backend auto-assigns a real,
          // eligible, available stylist when no staff_id is given.
          ...(selStaff.id !== ANY_STAFF_ID ? { staff_id: String(selStaff.id) } : {}),
          scheduled_at: toSalonInstant(selDate, String(selTime)),
          client_name: form.name.trim(),
          client_email: form.email.trim(),
          client_phone: form.phone.trim(),
          notes: form.notes.trim(),
        })
      ).unwrap();
      setCreatedAppointment(appointment);
      setStep(3);
    } catch (err: any) {
      setSubmitError(typeof err === "string" ? err : "Failed to create booking. Please try again.");
    }
  }

  function resetBooking() {
    setStep(1);
    setSelServices([]);
    setSelStaff(null);
    setSelTime(null);
    setForm({ name: "", email: "", phone: "", countryCode: "+91", notes: "" });
    setCreatedAppointment(null);
    setSubmitError(null);
    setOtpSentTo(null);
    setOtpCode("");
    setEmailVerifiedFor(null);
    setOtpError(null);
    setResendIn(0);
  }

  // +91 numbers are exactly 10 digits; other country codes vary by country,
  // so those keep the looser 8-15 digit sanity check instead of a hard rule.
  const phoneDigits = form.phone.replace(/\D/g, "");
  const phoneValid = form.countryCode === "+91"
    ? phoneDigits.length === 10
    : phoneDigits.length >= 8 && phoneDigits.length <= 15;
  const phoneTouched = phoneDigits.length > 0;

  const detailsValid = form.name.trim().length > 1 && phoneValid && emailValid && emailVerified;
  const dateLabel = `${DAYS[selDate.getDay()]}, ${selDate.getDate()} ${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;
  const staffLabel = selStaff ? staffName(selStaff) : "Not selected yet";
  const bookingReady = selServices.length > 0 && !!selStaff && !!selTime;

  // The mobile sticky bar's CTA — on a catalog with hundreds of services, a
  // customer picking from the list has no way to reach Stylist/Date & Time
  // without manually scrolling past everything else, since the bar's button
  // just stayed disabled until all three were chosen. It now jumps straight
  // to whichever section is still needed instead.
  const mobileCta: { label: string; action: () => void; disabled: boolean } =
    selServices.length === 0
      ? { label: "Select services", action: () => {}, disabled: true }
      : !selStaff
      ? { label: "Select Staff", action: () => scrollTo(stylistRef), disabled: false }
      : !selTime
      ? { label: "Select Date & Time", action: () => scrollTo(whenRef), disabled: false }
      : { label: "Continue", action: () => setStep(2), disabled: false };

  // Which numbered step reads as current.
  const activeStep: 1 | 2 | 3 = step >= 2 ? 3 : selServices.length > 0 ? 2 : 1;

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (!salonDetails && !error) {
    return (
      <div className="pb">
        <div className="pb__center">
          <div className="pb__spinner" />
          <p className="pb__subtitle">Loading booking page…</p>
        </div>
      </div>
    );
  }

  // Heading stays true for both cases the API distinguishes — a wrong link and
  // a salon that has online booking switched off. The specific reason comes
  // from the server and is shown beneath it.
  if (error || !salon) {
    return (
      <div className="pb">
        <div className="pb__center">
          <h2 className="pb__title">Booking unavailable</h2>
          <p className="pb__subtitle">
            {error || "This salon doesn't have a public booking page yet."}
          </p>
        </div>
      </div>
    );
  }

  // Neutral by default; a salon's own brand kit overrides the accent so the page
  // reads as theirs. No brand kit exists for any salon today (the editor was
  // removed), so in practice everyone gets the default palette — the wiring is
  // here so it just works the moment one is populated.
  const brand = (salon as any)?.brand_kit ?? null;
  const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v.trim());
  const brandAccent = isHex(brand?.primary_color) ? brand.primary_color
    : isHex(brand?.accent_color) ? brand.accent_color
    : null;

  const styleVars = {
    ...(brandAccent
      ? {
          "--pb-accent": brandAccent,
          "--pb-accent-grad": brandAccent,
          "--pb-accent-soft": withAlpha(brandAccent, 0.1),
          "--pb-accent-line": withAlpha(brandAccent, 0.3),
          "--pb-on-accent": readableOn(brandAccent),
        }
      : {}),
    ...(brand?.body_font ? { fontFamily: `${brand.body_font}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` } : {}),
  } as React.CSSProperties;

  // ── Shared chrome ───────────────────────────────────────────────────────────

  const TopNav = () => (
    <header className="pb__nav">
      <div className="pb__nav-inner">
        {/* A clear, labelled Back sits on the far left — the previous
            arrow-only affordance lived on the right mixed in with other
            actions, easy to miss and easy to mistake for "Book Appointment"'s
            sibling rather than a distinct back action. Only step 2 has a
            real previous step to return to; step 3 is a completed booking
            with its own "Book Another Appointment" action in the confirmation
            card itself, not something to "go back" from. */}
        {step === 2 && (
          <button type="button" className="pb__nav-back" onClick={() => setStep(1)}
            aria-label="Back">
            <ArrowLeft size={16} /> <span className="pb__nav-back-label">Back</span>
          </button>
        )}

        <div className="pb__logo">
          {salon?.logo_url && (
            <img className="pb__logo-mark" src={salon.logo_url} alt="" />
          )}
          <span className="pb__logo-text">
            <span className="pb__logo-name">{salonName}</span>
            <span className="pb__logo-tag">Look good. Feel great.</span>
          </span>
        </div>

        {/* Links move within this page — nothing here navigates somewhere that
            doesn't exist for a salon that only has a booking page. */}
        {step === 1 && (
          <nav className="pb__nav-links" aria-label="Sections">
            <button type="button" onClick={() => scrollTo(servicesRef)}>Services</button>
            {staffList.length > 0 && (
              <button type="button" onClick={() => scrollTo(stylistRef)}>Our Stylists</button>
            )}
            {(description || salonFeatures.length > 0) && (
              <button type="button" onClick={() => scrollTo(aboutRef)}>About Us</button>
            )}
            {phone && <a href={`tel:${phone}`}>Contact</a>}
          </nav>
        )}

        <div className="pb__nav-actions">
          {city && <span className="pb__nav-loc"><GeoAltFill size={12} /> {city}</span>}
          {step === 1 && (
            <button type="button" className="pb__btn pb__btn--light pb__btn--auto pb__btn--glow"
              onClick={() => scrollTo(servicesRef)}>
              Book Appointment
            </button>
          )}
          {step === 3 && (
            <button type="button" className="pb__btn pb__btn--light pb__btn--auto"
              onClick={resetBooking}>
              <ArrowLeft size={14} /> Book another
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const Band = ({ title, sub }: { title: string; sub: string }) => {
    const hasPhoto = gallery.length > 0;
    const hasMultiplePhotos = gallery.length > 1;
    return (
      <div className={`pb__band ${hasPhoto ? "pb__band--photo" : ""}`}
        onTouchStart={hasMultiplePhotos ? handleHeroTouchStart : undefined}
        onTouchEnd={hasMultiplePhotos ? handleHeroTouchEnd : undefined}>
        {hasPhoto && gallery.map((url, i) => (
          <div key={url} className="pb__band-bg" aria-hidden="true"
            style={{ backgroundImage: `url(${url})`, opacity: i === heroPhotoIndex ? 1 : 0 }} />
        ))}
        {hasPhoto && <div className="pb__band-scrim" aria-hidden="true" />}

        {hasMultiplePhotos && (
          <>
            <button type="button" className="pb__band-nav pb__band-nav--prev"
              onClick={() => goHeroPhoto(-1)} aria-label="Previous photo">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="pb__band-nav pb__band-nav--next"
              onClick={() => goHeroPhoto(1)} aria-label="Next photo">
              <ChevronRight size={18} />
            </button>
            <div className="pb__band-dots" role="tablist" aria-label="Photo">
              {gallery.map((url, i) => (
                <button key={url} type="button" role="tab" aria-selected={i === heroPhotoIndex}
                  className={`pb__band-dot ${i === heroPhotoIndex ? "is-active" : ""}`}
                  aria-label={`Show photo ${i + 1}`}
                  onClick={() => setHeroPhotoIndex(i)} />
              ))}
            </div>
          </>
        )}

        <div className="pb__band-inner">
          <div className="pb__band-copy">
            <p className="pb__eyebrow">Online booking</p>
            <h1 className="pb__display">{title}</h1>
            <p className="pb__band-sub">{sub}</p>
            {hasPhoto && step === 1 && (
              <button type="button" className="pb__btn pb__btn--primary pb__btn--auto pb__band-cta pb__btn--glow"
                onClick={() => scrollTo(servicesRef)}>
                Book Appointment <span aria-hidden="true">→</span>
              </button>
            )}
          </div>

          {!hasPhoto && (
            <ol className="pb__steps" aria-label="Booking progress">
              {STEP_LABELS.map((s, i) => {
                const index = (i + 1) as 1 | 2 | 3;
                const state = index === activeStep ? "is-active" : index < activeStep ? "is-done" : "";
                return (
                  <li key={s.label} className={`pb__step ${state}`}
                    aria-current={index === activeStep ? "step" : undefined}>
                    <span className="pb__step-dot">{index}</span>
                    <span className="pb__step-label">{s.label}</span>
                    <span className="pb__step-note">{s.note}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {!hasPhoto && (
            <p className="pb__band-script" aria-hidden="true">Self care looks good on you.</p>
          )}
        </div>
      </div>
    );
  };

  const ServiceRow = ({ svc }: { svc: ServiceItem }) => {
    const on = selServices.some((s) => s.id === svc.id);
    const img = (svc as any).image_url;
    const cat = String((svc as any).category_name || "").trim();
    const key = cat || svc.name;
    const desc = String((svc as any).description ?? "").trim();
    return (
      <button
        type="button"
        className={`pb__svc ${on ? "is-selected" : ""}`}
        onClick={() => toggleService(svc)}
        aria-pressed={on}
      >
        <span className="pb__svc-thumb" style={{ background: tileBg(key) }}>
          {img ? <img src={img} alt="" /> : <span aria-hidden="true">{monogram(key)}</span>}
        </span>
        <span className="pb__svc-body">
          <span className="pb__svc-name">{svc.name}</span>
          <span className="pb__svc-meta">
            {Number(svc.duration) > 0 && (
              <>
                <span>{fmtDur(Number(svc.duration))}</span>
                <span className="pb__svc-dot">•</span>
              </>
            )}
            <span className="pb__svc-price">{fmtPrice(svc.price, currencyCode)}</span>
          </span>
          {desc && <span className="pb__svc-desc">{desc}</span>}
        </span>
        <span className={`pb__svc-add ${on ? "is-on" : ""}`} aria-hidden="true">
          {on ? <Check size={16} /> : <Plus size={16} />}
        </span>
      </button>
    );
  };

  const SummaryItems = ({ removable }: { removable?: boolean }) => (
    <>
      {selServices.map((s) => {
        const key = String((s as any).category_name || s.name);
        return (
          <div key={s.id} className="pb__sum-item">
            <span className="pb__sum-thumb" style={{ background: tileBg(key) }}>
              {monogram(key)}
            </span>
            <span className="pb__sum-item-body">
              <span className="pb__sum-item-name">{s.name}</span>
              {Number(s.duration) > 0 && (
                <span className="pb__sum-item-meta">{fmtDur(Number(s.duration))}</span>
              )}
            </span>
            <span className="pb__sum-item-price">{fmtPrice(s.price, currencyCode)}</span>
            {removable && (
              <button type="button" className="pb__sum-remove" onClick={() => toggleService(s)}
                aria-label={`Remove ${s.name}`}>
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </>
  );

  // ── Screens ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb" ref={rootRef} style={styleVars}>
      <TopNav />

      {/* 1 — Everything the booking is made of: services, stylist, when.
           One page with a running summary rather than a wizard: the choices
           interact (a stylist changes the slots, a service changes the
           duration), so they need to be visible together. */}
      {step === 1 && (
        <>
          <Band title="Your Next Look Awaits" sub="Book your favourite services in a few simple steps." />

          <div className={`pb__layout ${showAbout ? "pb__layout--tight-bottom" : ""}`}>
            <div className="pb__col-main">

              <section className="pb__panel" ref={servicesRef}>
                <div className="pb__panel-head">
                  <h2 className="pb__panel-title">1. Select Service(s)</h2>
                  <p className="pb__panel-note">
                    {filtered.length} {filtered.length === 1 ? "service" : "services"}
                  </p>
                </div>

                {/* Sticks just under the top nav while the (possibly very
                    long, e.g. 200-service) list below scrolls — otherwise
                    finding a second service means scrolling back up to reach
                    search/category filtering again. */}
                <div className="pb__svc-sticky">
                  <div className="pb__svc-search">
                    <Search size={15} />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Search services…"
                      aria-label="Search services"
                    />
                    {serviceSearch && (
                      <button type="button" aria-label="Clear search" onClick={() => setServiceSearch("")}>
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {categories.length > 0 && (
                    <div className="pb__catbar-wrap">
                      <div className="pb__catbar" ref={catbarRef} role="tablist" aria-label="Service categories">
                        <button type="button" role="tab" aria-selected={activeCat === "All"}
                          className={`pb__cat ${activeCat === "All" ? "is-active" : ""}`}
                          onClick={(e) => { setActiveCat("All"); scrollCatIntoView(e.currentTarget); }}>All</button>
                        {categories.map((c) => (
                          <button key={c.name} type="button" role="tab" aria-selected={activeCat === c.name}
                            className={`pb__cat ${activeCat === c.name ? "is-active" : ""}`}
                            onClick={(e) => { setActiveCat(c.name); scrollCatIntoView(e.currentTarget); }}>{c.name}</button>
                        ))}
                      </div>
                      {/* Fade hint that more categories continue off-screen — a
                          visible scrollbar (see .pb__catbar) only helps desktop
                          with a mouse; mobile shows no persistent scrollbar at
                          rest, so a phone user has no way to tell "Hair Women"/
                          "Wax Women" aren't the only two categories. Hidden once
                          scrolled to the end so it doesn't keep implying more. */}
                      {catbarOverflowing && <div className="pb__catbar-fade" aria-hidden="true" />}
                    </div>
                  )}
                </div>

                {filtered.length === 0 ? (
                  <p className="pb__empty">
                    {services.length === 0
                      ? "This salon hasn't published any services yet."
                      : "No services match your search."}
                  </p>
                ) : (
                  <div className="pb__grid">
                    {filtered.map((svc) => <ServiceRow key={svc.id} svc={svc} />)}
                  </div>
                )}
              </section>

              <section className="pb__panel" ref={stylistRef}>
                <div className="pb__panel-head">
                  <h2 className="pb__panel-title">2. Select Stylist</h2>
                </div>

                {staffList.length === 0 ? (
                  <p className="pb__empty">
                    This salon hasn't listed any stylists for online booking yet.
                    {phone ? <> Please call them on <a href={`tel:${phone}`}>{phone}</a>.</> : null}
                  </p>
                ) : (
                  <div className="pb__grid">
                    <button type="button"
                      className={`pb__svc ${selStaff?.id === ANY_STAFF_ID ? "is-selected" : ""}`}
                      onClick={() => pickStaff(ANY_STAFF)} aria-pressed={selStaff?.id === ANY_STAFF_ID}>
                      <span className="pb__svc-thumb pb__svc-thumb--round" style={{ background: "#e9f1ec" }}>
                        <PeopleFill size={18} color="#1e4634" />
                      </span>
                      <span className="pb__svc-body">
                        <span className="pb__svc-name">Any Available</span>
                        <span className="pb__svc-meta">
                          <span>Best match for your slot</span>
                        </span>
                      </span>
                      <span className={`pb__svc-add ${selStaff?.id === ANY_STAFF_ID ? "is-on" : ""}`} aria-hidden="true">
                        {selStaff?.id === ANY_STAFF_ID ? <Check size={16} /> : <Plus size={16} />}
                      </span>
                    </button>
                    {staffList.map((s) => {
                      const on = selStaff?.id === s.id;
                      const name = staffName(s);
                      const rating = Number((s as any).rating);
                      const reviewCount = Number((s as any).review_count) || 0;
                      const avatar = (s as any).avatar_url;
                      return (
                        <button key={s.id} type="button"
                          className={`pb__svc ${on ? "is-selected" : ""}`}
                          onClick={() => pickStaff(s)} aria-pressed={on}>
                          <span className="pb__svc-thumb pb__svc-thumb--round"
                            style={{ background: tileBg(String(s.id)) }}>
                            {avatar ? <img src={avatar} alt="" /> : initials(name)}
                          </span>
                          <span className="pb__svc-body">
                            <span className="pb__svc-name">{name}</span>
                            <span className="pb__svc-meta">
                              <span>{(s as any).designation || s.job_title || "Stylist"}</span>
                              {/* Real review data only — a stylist with no
                                  reviews shows nothing rather than a score. */}
                              {Number.isFinite(rating) && reviewCount > 0 && (
                                <>
                                  <span className="pb__svc-dot">•</span>
                                  <span className="pb__rating">
                                    <StarFill size={11} /> {rating.toFixed(1)}
                                    <span className="pb__muted">({reviewCount})</span>
                                  </span>
                                </>
                              )}
                            </span>
                          </span>
                          <span className={`pb__svc-add ${on ? "is-on" : ""}`} aria-hidden="true">
                            {on ? <Check size={16} /> : <Plus size={16} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="pb__panel" ref={whenRef}>
                <div className="pb__panel-head">
                  <h2 className="pb__panel-title">3. Select Date &amp; Time</h2>
                  <button type="button" className="pb__link" onClick={() => setShowMonth((v) => !v)}>
                    <CalendarWeek size={14} /> {showMonth ? "Hide calendar" : "View calendar"}
                  </button>
                </div>

                {/* Exactly one date-picking widget at a time — showing the week
                    strip's own nav ("‹ Sep 2026 ›") alongside the month
                    calendar's near-identical nav read as two competing date
                    pickers stacked on top of each other. */}
                {!showMonth ? (
                  <div className="pb__week">
                    <div className="pb__week-nav">
                      <button type="button" className="pbc__nav" onClick={() => shiftWeek(-1)}
                        disabled={atFirstWeek} aria-label="Previous week">
                        <ChevronLeft size={14} />
                      </button>
                      <span className="pb__week-label">{weekLabel}</span>
                      <button type="button" className="pbc__nav" onClick={() => shiftWeek(1)}
                        aria-label="Next week">
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="pb__week-days">
                      {weekDays.map((d) => {
                        const off = isDayDisabled(d);
                        const on = sameDay(d, selDate);
                        return (
                          <button key={d.toISOString()} type="button" disabled={off}
                            className={`pb__day ${on ? "is-selected" : ""}`}
                            aria-pressed={on} onClick={() => pickDate(d)}>
                            <span className="pb__day-name">{DAYS[d.getDay()]}</span>
                            <span className="pb__day-num">{d.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="pb__month">
                    <CalendarPicker
                      value={selDate}
                      onChange={(d) => { pickDate(d); setWeekStart(weekStartOf(d)); }}
                      maxAdvanceDays={maxAdvanceDays}
                      allowSameDay={allowSameDay}
                    />
                  </div>
                )}

                <div className="pb__divider" role="separator" aria-hidden="true" />

                <p className="pb__col-title">Available slots</p>

                {!selStaff ? (
                  <p className="pb__empty">Choose a stylist above to see their available times.</p>
                ) : selServices.length === 0 ? (
                  <p className="pb__empty">Pick a service above to see available times.</p>
                ) : slotsLoading ? (
                  <p className="pb__empty">Checking availability…</p>
                ) : slots.morning.length === 0 && slots.afternoon.length === 0 ? (
                  <p className="pb__empty">
                    No times available on this date for {staffName(selStaff)}.
                    Try another date or stylist
                    {phone ? <> or call the salon on <a href={`tel:${phone}`}>{phone}</a></> : null}.
                  </p>
                ) : (
                  <>
                    {slots.morning.length > 0 && (
                      <>
                        <p className="pb__slot-group-label"><SunFill size={12} /> Morning</p>
                        <div className="pb__slots">
                          {slots.morning.map((t) => (
                            <button key={t} type="button"
                              className={`pb__slot ${selTime === t ? "is-selected" : ""}`}
                              aria-pressed={selTime === t}
                              onClick={() => setSelTime(t)}>{t}</button>
                          ))}
                        </div>
                      </>
                    )}
                    {slots.afternoon.length > 0 && (
                      <>
                        <p className="pb__slot-group-label"><SunsetFill size={12} /> Afternoon &amp; Evening</p>
                        <div className="pb__slots">
                          {slots.afternoon.map((t) => (
                            <button key={t} type="button"
                              className={`pb__slot ${selTime === t ? "is-selected" : ""}`}
                              aria-pressed={selTime === t}
                              onClick={() => setSelTime(t)}>{t}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>

            </div>

            <aside className="pb__col-side" aria-label="Your booking">
              <div className="pb__panel pb__sum">
                <div className="pb__sum-head">
                  <div>
                    <h2 className="pb__sum-title">Your Booking</h2>
                    <p className="pb__sum-sub">Review your selections</p>
                  </div>
                  <span className="pb__chip">Step {activeStep} of 3</span>
                </div>

                {selServices.length === 0
                  ? <p className="pb__sum-empty">No services selected yet.</p>
                  : <SummaryItems removable />}

                <button type="button" className="pb__sum-add" onClick={() => scrollTo(servicesRef)}>
                  <Plus size={14} /> Add more services
                </button>

                <div className="pb__sum-row">
                  <span className="pb__sum-icon"><PersonFill size={15} /></span>
                  <span className="pb__sum-row-body">
                    <span className="pb__sum-row-label">{selStaff ? "Preferred Stylist" : "Select Staff"}</span>
                    <span className="pb__sum-row-value">{staffLabel}</span>
                  </span>
                  <button type="button" className="pb__link" onClick={() => scrollTo(stylistRef)}>
                    {selStaff ? "Change" : "Select"}
                  </button>
                </div>

                <div className="pb__sum-row">
                  <span className="pb__sum-icon"><CalendarEvent size={15} /></span>
                  <span className="pb__sum-row-body">
                    <span className="pb__sum-row-label">{selTime ? "Date & Time" : "Select Date & Time"}</span>
                    <span className="pb__sum-row-value">
                      {selTime ? `${dateLabel} • ${selTime}` : "Not selected yet"}
                    </span>
                  </span>
                  <button type="button" className="pb__link" onClick={() => scrollTo(whenRef)}>
                    {selTime ? "Change" : "Select"}
                  </button>
                </div>

                <div className="pb__sum-total">
                  <span>Total Amount</span>
                  <span className="pb__sum-total-amount">{fmtPrice(totalPrice, currencyCode)}</span>
                </div>

                <button type="button" className="pb__btn pb__btn--primary"
                  disabled={!bookingReady} onClick={() => setStep(2)}>
                  Continue <span aria-hidden="true">→</span>
                </button>

                <p className="pb__sum-secure">
                  <ShieldLockFill size={12} /> Your information is secure with us.
                </p>

                <div className="pb__sum-badges">
                  <span><LightningChargeFill size={15} /> Instant<br />confirmation</span>
                  <span><ShieldLockFill size={15} /> Secure<br />booking</span>
                  <span>
                    <Gem size={15} />
                    {cancellationNoticeHours > 0 ? <>Free<br />cancellation</> : <>Trusted<br />professionals</>}
                  </span>
                </div>
              </div>

              {phone && (
                <a className="pb__panel pb__helpcard" href={`tel:${phone}`}>
                  <span className="pb__helpcard-icon"><Headset size={18} /></span>
                  <span className="pb__helpcard-body">
                    <span className="pb__helpcard-title">Need Help?</span>
                    <span className="pb__helpcard-sub">Contact us or call <strong>{phone}</strong></span>
                  </span>
                  <ChevronRight size={16} />
                </a>
              )}
            </aside>
          </div>

          {/* Moved out from under Services/Stylist/Date&Time (inside
              .pb__col-main) to its own full-width row below the whole
              two-column layout — previously it rendered above "Your Booking"
              on mobile (col-main's own content all comes before col-side in
              a single-column stack), when it reads better as the last thing
              on the page, after the booking summary. */}
          {showAbout && (
            <div className="pb__layout pb__layout--single">
              <section className="pb__panel" ref={aboutRef}>
                <div className="pb__panel-head">
                  <h2 className="pb__panel-title">About {salonName}</h2>
                </div>
                {description && <p className="pb__about">{description}</p>}
                {salonFeatures.length > 0 && (
                  <div className="pb__about-features">
                    {salonFeatures.map((f) => (
                      <span key={f} className="pb__about-feature-chip">{f}</span>
                    ))}
                  </div>
                )}
                <div className="pb__about-actions">
                  {phone && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={`tel:${phone}`}>
                      <TelephoneFill size={13} /> {phone}
                    </a>
                  )}
                  {mapQuery && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" target="_blank" rel="noopener noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}>
                      <PinMapFill size={13} /> Directions
                    </a>
                  )}
                  {instagramUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={instagramUrl}
                      target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={14} /></a>
                  )}
                  {facebookUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={facebookUrl}
                      target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={14} /></a>
                  )}
                  {websiteUrl && (
                    <a className="pb__btn pb__btn--ghost pb__btn--auto" href={websiteUrl}
                      target="_blank" rel="noopener noreferrer" aria-label="Website"><Globe size={14} /></a>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Phone-width action bar — the summary card is below the fold there. */}
          <div className="pb__mobilebar">
            <div className="pb__sticky-info">
              <p className="pb__sticky-count">
                {selServices.length} service{selServices.length !== 1 ? "s" : ""}
                {totalDuration > 0 ? ` · ${fmtDur(totalDuration)}` : ""}
              </p>
              <p className="pb__sticky-total">{fmtPrice(totalPrice, currencyCode)}</p>
            </div>
            <button type="button" className="pb__btn pb__btn--primary pb__btn--auto"
              disabled={mobileCta.disabled} onClick={mobileCta.action}>
              {mobileCta.label} <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      )}

      {/* 2 — Confirm: your details beside the whole booking. */}
      {step === 2 && (
        <>
          <Band title="Confirm Your Booking" sub="A few details and you're done." />

          <div className="pb__layout">
            <div className="pb__col-main">
              <section className="pb__panel">
                <div className="pb__panel-head">
                  <h2 className="pb__panel-title">Your Details</h2>
                </div>

                {submitError && <p className="pb__error">{submitError}</p>}

                <div className="pb__field">
                  <label className="pb__label" htmlFor="pb-name">Full Name *</label>
                  <input id="pb-name" className="pb__input" value={form.name} autoComplete="name"
                    onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                </div>

                <div className="pb__field">
                  <label className="pb__label" htmlFor="pb-phone">Phone Number *</label>
                  <div className="pb__phone-row">
                    <select id="pb-country" className="pb__phone-code" aria-label="Country code"
                      value={form.countryCode}
                      onChange={(e) => setForm({ ...form, countryCode: e.target.value })}>
                      <option value="+91">+91</option>
                      <option value="+971">+971</option>
                      <option value="+44">+44</option>
                      <option value="+1">+1</option>
                    </select>
                    <input id="pb-phone" className="pb__input" value={form.phone}
                      inputMode="tel" autoComplete="tel" maxLength={form.countryCode === "+91" ? 10 : 15}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s-]/g, "") })}
                      placeholder="9876543210" />
                  </div>
                  {phoneTouched && !phoneValid && (
                    <p className="pb__field-hint pb__field-hint--error">
                      {form.countryCode === "+91"
                        ? "Enter a valid 10-digit mobile number"
                        : "Enter a valid phone number"}
                    </p>
                  )}
                  <p className="pb__field-note">
                    We'll use this number to send WhatsApp booking confirmations, appointment reminders, and other booking-related updates.
                  </p>
                </div>

                <div className="pb__field">
                  <label className="pb__label" htmlFor="pb-email">Email *</label>
                  <div className="pb__phone-row">
                    <input id="pb-email" className="pb__input" value={form.email} type="email" autoComplete="email"
                      disabled={emailVerified}
                      onChange={(e) => handleEmailChange(e.target.value)} placeholder="you@example.com" />
                    {!emailVerified && (
                      <button type="button" className="pb__btn pb__btn--ghost pb__btn--auto"
                        disabled={!emailValid || otpSending || resendIn > 0}
                        onClick={handleSendOtp}>
                        {otpSending
                          ? "Sending…"
                          : otpSentTo === form.email.trim().toLowerCase() && resendIn > 0
                          ? `Resend in ${resendIn}s`
                          : otpSentTo === form.email.trim().toLowerCase()
                          ? "Resend OTP"
                          : "Send OTP"}
                      </button>
                    )}
                  </div>

                  {emailVerified && (
                    <p className="pb__field-hint pb__field-hint--success">
                      <Check size={13} /> Email verified
                    </p>
                  )}

                  {!emailVerified && otpSentTo === form.email.trim().toLowerCase() && (
                    <div className="pb__field" style={{ marginTop: 8 }}>
                      <label className="pb__label" htmlFor="pb-otp">Enter the 6-digit code sent to your email</label>
                      <div className="pb__phone-row">
                        <input id="pb-otp" className="pb__input" value={otpCode} inputMode="numeric"
                          maxLength={6}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456" />
                        <button type="button" className="pb__btn pb__btn--primary pb__btn--auto"
                          disabled={otpCode.length !== 6 || otpVerifying}
                          onClick={handleVerifyOtp}>
                          {otpVerifying ? "Verifying…" : "Verify"}
                        </button>
                      </div>
                      <p className="pb__field-hint">
                        Don't see it? Check your spam or junk folder.
                      </p>
                    </div>
                  )}

                  {otpError && <p className="pb__field-hint pb__field-hint--error">{otpError}</p>}
                </div>

                <div className="pb__field">
                  <label className="pb__label" htmlFor="pb-notes">
                    Any special requests? <span className="pb__optional">(optional)</span>
                  </label>
                  <textarea id="pb-notes" className="pb__textarea" value={form.notes} rows={3}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Prefer a quieter time of day" />
                </div>

                <button type="button" className="pb__btn pb__btn--primary"
                  disabled={!detailsValid || bookingLoading} onClick={handleSubmit}>
                  {bookingLoading ? "Confirming…" : "Confirm Booking"}
                  {!bookingLoading && <span aria-hidden="true">→</span>}
                </button>
              </section>
            </div>

            <aside className="pb__col-side" aria-label="Your booking">
              <div className="pb__panel pb__sum">
                <div className="pb__sum-head">
                  <div>
                    <h2 className="pb__sum-title">Your Booking</h2>
                    <p className="pb__sum-sub">Review before confirming</p>
                  </div>
                  <span className="pb__chip">Step 3 of 3</span>
                </div>

                <SummaryItems />

                <div className="pb__sum-row">
                  <span className="pb__sum-icon"><PersonFill size={15} /></span>
                  <span className="pb__sum-row-body">
                    <span className="pb__sum-row-label">Stylist</span>
                    <span className="pb__sum-row-value">{staffLabel}</span>
                  </span>
                </div>

                <div className="pb__sum-row">
                  <span className="pb__sum-icon"><CalendarEvent size={15} /></span>
                  <span className="pb__sum-row-body">
                    <span className="pb__sum-row-label">Date &amp; Time</span>
                    <span className="pb__sum-row-value">{dateLabel} • {selTime}</span>
                  </span>
                </div>

                <div className="pb__sum-total">
                  <span>Total Amount</span>
                  <span className="pb__sum-total-amount">{fmtPrice(totalPrice, currencyCode)}</span>
                </div>

                <button type="button" className="pb__btn pb__btn--primary"
                  disabled={!detailsValid || bookingLoading} onClick={handleSubmit}>
                  {bookingLoading ? "Confirming…" : "Confirm Booking"}
                  {!bookingLoading && <span aria-hidden="true">→</span>}
                </button>

                {cancellationNoticeHours > 0 && (
                  <p className="pb__sum-secure">
                    Free cancellation up to {cancellationNoticeHours} hour
                    {cancellationNoticeHours === 1 ? "" : "s"} before your appointment.
                  </p>
                )}
              </div>
            </aside>
          </div>

          <div className="pb__mobilebar">
            <div className="pb__sticky-info">
              <p className="pb__sticky-count">Total</p>
              <p className="pb__sticky-total">{fmtPrice(totalPrice, currencyCode)}</p>
            </div>
            <button type="button" className="pb__btn pb__btn--primary pb__btn--auto"
              disabled={!detailsValid || bookingLoading} onClick={handleSubmit}>
              {bookingLoading ? "Confirming…" : "Confirm"}
            </button>
          </div>
        </>
      )}

      {/* 3 — Booked */}
      {step === 3 && (
        <div className="pb__layout pb__layout--single">
          <div className="pb__panel">
            <div className="pb__confirm">
              <div className="pb__confirm-mark"><CheckLg size={32} /></div>
              <h1 className="pb__confirm-title">Booking Confirmed!</h1>
              <p className="pb__confirm-sub">Your appointment has been booked successfully.</p>
            </div>

            <dl className="pb__kv">
              <dt>Booking ID</dt>
              <dd>{shortBookingId(createdAppointment?.id)}</dd>
              <dt>Date &amp; Time</dt>
              <dd>{dateLabel}, {selTime}</dd>
              <dt>Services</dt>
              <dd>{selServices.map((s) => s.name).join(", ")}</dd>
              <dt>Stylist</dt>
              <dd>{staffLabel}</dd>
              <dt>Amount</dt>
              <dd>{fmtPrice(totalPrice, currencyCode)}</dd>
            </dl>

            <div className="pb__actions">
              {createdAppointment?.id && createdAppointment?.manage_token && (
                <button type="button" className="pb__btn pb__btn--primary"
                  onClick={() => navigate(`/book/${slug}/manage/${createdAppointment.id}?token=${createdAppointment.manage_token}`)}>
                  View Booking
                </button>
              )}
              <button type="button" className="pb__btn pb__btn--ghost" onClick={resetBooking}>
                Book Another Appointment
              </button>
            </div>

            <p className="pb__confirm-note">
              A confirmation has been sent to your phone{form.email ? " and email" : ""}.
            </p>

            {mapQuery && (
              <div className="pb__help">
                <div>
                  <p className="pb__help-title">Getting there</p>
                  <p className="pb__help-sub">{address}</p>
                </div>
                <a className="pb__btn pb__btn--ghost pb__btn--auto" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}>
                  <GeoAltFill size={13} /> Directions
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
