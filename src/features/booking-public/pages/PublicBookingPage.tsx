import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronRight, StarFill, GeoAltFill, TelephoneFill, ShareFill,
  Wifi, CarFrontFill, CreditCard2FrontFill, PeopleFill, Scissors,
  Snow, ShieldCheck, PinMapFill, CashCoin,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchPublicSalonBySlugThunk,
  createPublicBookingThunk,
} from "../../../middleware/onlineBooking/onlineBooking.thunk";
import {
  C, GRADIENT, DAYS, MONTHS, staffName, initials, fmtDur, fmtPrice, nextDays, buildSlots,
  StepBar, SectionHead, BackBtn, ServicesSummary, ServiceCard, StaffCard, TimeChip, SuccessScreen,
  type ServiceItem, type StaffMember,
} from "../../online-booking/components/BookingFlow/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Staff ids are UUID strings — Number(id) is NaN, so hash the string into a hue instead.
function hashHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 360;
}

function fmtClock(t?: string): string {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

function getTodayHours(workingHours: any): { open: boolean; from?: string; to?: string } | null {
  if (!Array.isArray(workingHours) || workingHours.length === 0) return null;
  const dow = new Date().getDay();
  const today = workingHours.find((w: any) => w.day_of_week === dow);
  if (!today) return null;
  if (!today.is_open || !today.slots?.length) return { open: false };
  const slot = today.slots[0];
  return { open: true, from: slot.open_time, to: slot.close_time };
}

function buildAddress(salon: any): string {
  if (!salon) return "";
  const addr = salon.address;
  if (addr && typeof addr === "object") {
    return [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
  }
  return [addr, salon.city, salon.state, salon.pincode].filter(Boolean).join(", ");
}

const DEMO_REVIEWS = [
  { name: "Priya Sharma", rating: 5, date: "2 weeks ago",
    text: "Amazing experience! The staff was professional and the haircut turned out exactly how I wanted." },
  { name: "Rahul Verma", rating: 5, date: "1 month ago",
    text: "Best salon in town. Clean, punctual, and great attention to detail every single time." },
  { name: "Ananya Iyer", rating: 4, date: "1 month ago",
    text: "Loved the ambience and the service quality. Will definitely be booking again soon." },
];
const RATING_BREAKDOWN = [
  { star: 5, pct: 78 }, { star: 4, pct: 15 }, { star: 3, pct: 5 }, { star: 2, pct: 1 }, { star: 1, pct: 1 },
];

function amenityMeta(key: string): { icon: JSX.Element; label: string } {
  const map: Record<string, { icon: JSX.Element; label: string }> = {
    wifi:                  { icon: <Wifi size={14} />,              label: "Free WiFi" },
    ac:                     { icon: <Snow size={14} />,              label: "Air Conditioned" },
    parking:                { icon: <CarFrontFill size={14} />,      label: "Parking" },
    parking_available:      { icon: <CarFrontFill size={14} />,      label: "Parking" },
    card_payment:           { icon: <CreditCard2FrontFill size={14} />, label: "Card Payment" },
    near_public_transport:  { icon: <GeoAltFill size={14} />,        label: "Near Transit" },
  };
  return map[key] ?? {
    icon: <ShieldCheck size={14} />,
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preselectServiceId = searchParams.get("serviceId");
  const preselectStaffId   = searchParams.get("staffId");
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const { salonDetails, loading, bookingLoading, error } = useAppSelector((s) => s.onlineBooking);

  const [step,       setStep]       = useState<1|2|3|4>(1);
  const [activeCat,  setActiveCat]  = useState("All");
  const [search,     setSearch]     = useState("");
  const [selServices, setSelServices] = useState<ServiceItem[]>([]);
  const [selStaff,   setSelStaff]   = useState<StaffMember | "any" | null>(null);
  const [selDate,    setSelDate]    = useState<Date>(new Date());
  const [selTime,    setSelTime]    = useState<string | null>(null);
  const [form,       setForm]       = useState({ name: "", email: "", phone: "", gender: "", notes: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preselected, setPreselected] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

  const serviceSectionRef = useRef<HTMLDivElement>(null);
  const pageRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) dispatch(fetchPublicSalonBySlugThunk(slug));
  }, [slug, dispatch]);

  // Each step starts from the top (past the hero) instead of keeping the
  // previous step's scroll offset, which otherwise made the hero look
  // like it never rendered once the user had scrolled down once.
  useEffect(() => {
    pageRootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const services: ServiceItem[] = salonDetails?.services ?? [];
  const staffList: StaffMember[] = salonDetails?.staff ?? [];
  const salon = salonDetails?.salon ?? null;
  const salonName = salon?.business_name || salon?.display_name || salon?.name || "This salon";

  // Hero / sidebar derived fields (defensive — backend salon shape is loosely typed)
  const logoUrl   = salon?.logo_url || salon?.logoUrl || "";
  const coverUrl  = salon?.banner_url || salon?.cover_url || salon?.bannerUrl || "";
  const address   = buildAddress(salon);
  const phone     = salon?.phone || salon?.business_phone || salon?.contact_number || "";
  const rating    = typeof salon?.rating === "number" ? salon.rating : 4.8;
  const reviewCount = salon?.review_count ?? salon?.reviews_count ?? 120;
  const servicesCount = services.length;
  const staffCount    = staffList.length;
  const todayHours = getTodayHours(salon?.working_hours ?? salon?.hours);
  const amenities: string[] = Array.isArray(salon?.amenities) && salon.amenities.length
    ? salon.amenities
    : ["wifi", "ac", "parking", "card_payment"];

  // Pre-select service/staff from the query params once data has loaded
  useEffect(() => {
    if (preselected || loading || (!preselectServiceId && !preselectStaffId)) return;
    if (services.length === 0 && staffList.length === 0) return;

    let nextStep: 1 | 2 = 1;

    if (preselectServiceId) {
      const svc = services.find((s) => String(s.id) === preselectServiceId);
      if (svc) {
        setSelServices([svc]);
        nextStep = 2;
      }
    }
    if (preselectStaffId) {
      const st = staffList.find((s) => String(s.id) === preselectStaffId);
      if (st) setSelStaff(st);
    }

    setStep(nextStep);
    setPreselected(true);
  }, [preselected, loading, services, staffList, preselectServiceId, preselectStaffId]);

  const dates = useMemo(() => nextDays(8), []);
  const slots = useMemo(() => buildSlots(selDate), [selDate]);
  const totalDuration = useMemo(
    () => selServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0),
    [selServices]
  );
  const totalPrice = useMemo(
    () => selServices.reduce((sum, s) => sum + (typeof s.price === "string" ? parseFloat(s.price) || 0 : s.price), 0),
    [selServices]
  );

  const categories = ["All", ...Array.from(new Set(services.map((s) => s.category_name ?? "Other")))];
  const filtered = services.filter((s) => {
    const catOk  = activeCat === "All" || s.category_name === activeCat;
    const srchOk = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return catOk && srchOk;
  });

  function toggleService(svc: ServiceItem) {
    setSelServices((prev) =>
      prev.some((s) => s.id === svc.id) ? prev.filter((s) => s.id !== svc.id) : [...prev, svc]
    );
  }

  async function handleSubmit() {
    if (!salon?.id || selServices.length === 0) return;
    setSubmitError(null);
    try {
      const appointment = await dispatch(
        createPublicBookingThunk({
          salon_id: String(salon.id),
          service_ids: selServices.map((s) => String(s.id)),
          staff_id: selStaff === "any" ? undefined : String((selStaff as StaffMember)?.id),
          scheduled_at: new Date(`${selDate.toDateString()} ${selTime}`).toISOString(),
          client_name: form.name,
          client_email: form.email,
          client_phone: form.phone,
          client_gender: form.gender || undefined,
          notes: form.notes,
        })
      ).unwrap();
      setCreatedAppointment(appointment);
      setStep(4);
    } catch (err: any) {
      setSubmitError(err || "Failed to create booking. Please try again.");
    }
  }

  function handleAddToCalendar() {
    if (!createdAppointment?.id) return;
    const dateStr = String(createdAppointment.scheduled_at ?? "").slice(0, 10)
      || new Date(`${selDate.toDateString()} ${selTime}`).toISOString().slice(0, 10);
    navigate("/dashboard/calendar", {
      state: { focusAppointment: { id: createdAppointment.id, date: dateStr } },
    });
  }

  function scrollToServices() {
    setStep(1);
    requestAnimationFrame(() =>
      serviceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  function resetBooking() {
    setStep(1); setSelServices([]); setSelStaff(null);
    setSelTime(null); setForm({ name: "", email: "", phone: "", gender: "", notes: "" });
    setCreatedAppointment(null);
  }

  function handleBookAnother() {
    resetBooking();
    requestAnimationFrame(() =>
      serviceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  function handleBackHome() {
    resetBooking();
    pageRootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleShare() {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: salonName, url }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Booking link copied!");
      } catch {
        toast.error("Could not copy link.");
      }
    }
  }

  // No definitive answer yet (fetch hasn't resolved) — keep showing the
  // loader instead of falling through to the "not found" state below.
  // `loading` alone isn't enough: it starts `false` in the slice, so on the
  // very first render (before the fetch dispatch's `pending` action lands)
  // it would otherwise flash "Salon Not Found" for a frame.
  if (!salonDetails && !error) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh",
        fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background:C.light }}>
        <div style={{ width:40, height:40, borderRadius:"50%",
          border:`3px solid ${C.med}`, borderTopColor:C.accent,
          animation:"spin 0.7s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        minHeight:"100vh", gap:12, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        padding:24, textAlign:"center", background:C.light }}>
        <h2 style={{ margin:0, fontSize:20, color:C.text }}>Booking page not found</h2>
        <p style={{ margin:0, color:C.muted, fontSize:14 }}>
          {error || "This salon doesn't have a public booking page yet."}
        </p>
      </div>
    );
  }

  return (
    <div ref={pageRootRef} data-testid="pb-page-root" style={{ height:"100vh", overflowY:"auto", display:"flex", flexDirection:"column",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background:C.light }}>

      <style>{`
        .pb-hero {
          position: relative;
          min-height: 340px;
          flex-shrink: 0;
          background-size: cover;
          background-position: center;
          background-image: linear-gradient(135deg, ${C.dark} 0%, ${C.accentDark} 55%, ${C.accent} 100%);
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .pb-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(46,16,101,0.30) 0%, rgba(35,12,80,0.55) 55%, rgba(20,6,48,0.94) 100%);
        }
        .pb-hero-inner {
          position: relative; z-index: 1; width: 100%;
          max-width: 1180px; margin: 0 auto;
          padding: 84px 28px 28px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .pb-hero-top { display:flex; align-items:flex-end; gap:18px; flex-wrap:wrap; }
        .pb-hero-avatar {
          width:88px; height:88px; border-radius:50%;
          border:4px solid #fff; flex-shrink:0; overflow:hidden;
          background: linear-gradient(135deg,#a78bfa,#7c3aed);
          display:flex; align-items:center; justify-content:center;
          color:#fff; font-weight:900; font-size:26px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        }
        .pb-hero-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
        .pb-hero-info h1 { margin:0 0 8px; font-size:27px; font-weight:900; color:#fff; letter-spacing:-0.01em; }
        .pb-hero-rating { display:flex; align-items:center; gap:3px; font-size:13px; color:rgba(255,255,255,0.85); flex-wrap:wrap; }
        .pb-hero-rating b { color:#fff; margin:0 4px 0 6px; }
        .pb-hero-line { display:flex; align-items:center; gap:6px; font-size:12.5px; color:rgba(255,255,255,0.82); margin-top:6px; }
        .pb-hero-line-group { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:8px; }
        .pb-status-badge { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; padding:5px 11px; border-radius:999px; background:rgba(255,255,255,0.14); color:#fff; }
        .pb-status-badge .dot { width:7px; height:7px; border-radius:50%; }
        .pb-status-badge.open .dot { background:#22c55e; }
        .pb-status-badge.closed .dot { background:#f87171; }

        .pb-hero-badges { display:flex; gap:10px; flex-wrap:wrap; }
        .pb-glass-badge {
          display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600;
          color:#fff; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.25);
          backdrop-filter: blur(10px); border-radius:12px; padding:9px 15px;
        }
        .pb-glass-badge b { font-weight:800; }

        .pb-hero-actions { display:flex; gap:10px; flex-wrap:wrap; }
        .pb-action {
          display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:700;
          padding:11px 20px; border-radius:12px; border:1px solid rgba(255,255,255,0.3);
          background:rgba(255,255,255,0.12); color:#fff; cursor:pointer; text-decoration:none;
          backdrop-filter: blur(10px); transition: all 0.2s;
        }
        .pb-action:hover { background:rgba(255,255,255,0.22); transform: translateY(-1px); }
        .pb-action--primary {
          background: ${GRADIENT}; border-color: transparent;
          box-shadow: 0 8px 24px rgba(124,58,237,0.5);
        }
        .pb-action--primary:hover { filter: brightness(1.08); }

        .pb-container { padding: 28px 24px 64px; max-width: 1180px; margin: 0 auto; }
        .pb-layout { display:grid; grid-template-columns: 1fr 320px; gap: 28px; align-items:start; }
        .pb-main { min-width:0; }
        .pb-sidebar { display:flex; flex-direction:column; gap:18px; position:sticky; top:20px; }
        .pb-sidebar-card { background:#fff; border:1px solid ${C.border}; border-radius:20px; padding:20px; box-shadow:0 2px 14px rgba(46,16,101,0.06); }
        .pb-sidebar-title { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:800; color:${C.text}; margin:0 0 14px; text-transform:uppercase; letter-spacing:0.05em; }
        .pb-sidebar-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; font-size:12.5px; gap:10px; }
        .pb-sidebar-row span:first-child { color:${C.muted}; }
        .pb-sidebar-row span:last-child { color:${C.text}; font-weight:700; text-align:right; }
        .pb-map-preview { height:112px; border-radius:14px; background:linear-gradient(135deg,${C.light},${C.med}); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; cursor:pointer; text-decoration:none; border:1.5px dashed ${C.border}; transition: all 0.2s; color:${C.accent}; }
        .pb-map-preview:hover { background:linear-gradient(135deg,${C.med},${C.light}); border-color:${C.accent}; }
        .pb-amenity-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .pb-amenity { display:flex; align-items:center; gap:8px; font-size:11.5px; color:${C.text}; font-weight:600; background:${C.light}; border-radius:10px; padding:9px 10px; }
        .pb-payment-row { display:flex; gap:8px; flex-wrap:wrap; }
        .pb-payment-chip { display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:${C.accent}; background:${C.med}; border-radius:8px; padding:6px 10px; }

        .pb-search-sticky { position:sticky; top:0; z-index:5; background:${C.light}; padding:10px 0 14px; margin-bottom:4px; }
        .pb-search-input { width:100%; padding:13px 18px; border:1.5px solid ${C.border}; border-radius:14px; font-size:13.5px; outline:none; box-sizing:border-box; color:${C.text}; background:#fff; transition:border-color 0.2s, box-shadow 0.2s; }
        .pb-search-input:focus { border-color:${C.accent}; box-shadow:0 0 0 4px ${C.accent}18; }

        .pb-cat-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
        .pb-cat-chip { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:999px; border:1.5px solid ${C.border}; background:#fff; color:${C.text}; font-size:12.5px; font-weight:600; cursor:pointer; transition: all 0.18s; }
        .pb-cat-chip:hover { border-color:${C.accent}; transform: translateY(-1px); }
        .pb-cat-chip.active { background:${GRADIENT}; border-color:transparent; color:#fff; box-shadow:0 4px 14px ${C.accent}45; }

        .pb-services-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:18px; }

        .pb-reviews { margin-top:48px; padding-top:32px; border-top:1px solid ${C.border}; }
        .pb-reviews-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:18px; }
        .pb-rating-summary { display:flex; align-items:center; gap:22px; }
        .pb-rating-big { font-size:42px; font-weight:900; color:${C.text}; line-height:1; }
        .pb-rating-bars { display:flex; flex-direction:column; gap:4px; min-width:150px; }
        .pb-rating-bar-row { display:flex; align-items:center; gap:8px; font-size:11px; color:${C.muted}; }
        .pb-rating-bar-track { flex:1; height:6px; border-radius:4px; background:${C.med}; overflow:hidden; }
        .pb-rating-bar-fill { height:100%; background:${GRADIENT}; border-radius:4px; }
        .pb-review-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:16px; }
        .pb-review-card { background:#fff; border:1px solid ${C.border}; border-radius:20px; padding:18px; box-shadow:0 2px 10px rgba(46,16,101,0.04); }
        .pb-view-all-btn { display:inline-flex; align-items:center; gap:6px; margin-top:22px; padding:11px 22px; border-radius:12px; border:1.5px solid ${C.border}; background:#fff; color:${C.accent}; font-weight:700; font-size:13px; cursor:pointer; }
        .pb-view-all-btn:hover { border-color:${C.accent}; background:${C.light}; }

        @media (max-width: 1024px) {
          .pb-layout { grid-template-columns: 1fr; }
          .pb-sidebar { display:none; }
        }
        @media (max-width: 640px) {
          .pb-hero { min-height:auto; }
          .pb-hero-inner { padding:64px 18px 22px; gap:16px; }
          .pb-hero-avatar { width:68px; height:68px; font-size:20px; }
          .pb-hero-info h1 { font-size:21px; }
          .pb-hero-actions { flex-direction:column; }
          .pb-action { width:100%; justify-content:center; }
          .pb-services-grid { grid-template-columns:1fr; }
          .pb-review-grid { grid-template-columns:1fr; }
          .pb-rating-summary { flex-direction:column; align-items:flex-start; gap:12px; }
        }
      `}</style>

      {/* ── Premium Hero ── */}
      <div className="pb-hero" style={coverUrl ? { backgroundImage:`url(${coverUrl})` } : undefined}>
        <div className="pb-hero-overlay" />
        <div className="pb-hero-inner">
          <div className="pb-hero-top">
            <div className="pb-hero-avatar">
              {logoUrl ? <img src={logoUrl} alt={salonName} /> : salonName.slice(0, 2).toUpperCase()}
            </div>
            <div className="pb-hero-info">
              <h1>{salonName}</h1>
              <div className="pb-hero-rating">
                {[1,2,3,4,5].map((i) => (
                  <StarFill key={i} size={13} color={i <= Math.round(rating) ? "#fbbf24" : "rgba(255,255,255,0.25)"} />
                ))}
                <b>{rating.toFixed(1)}</b> · {reviewCount} reviews
              </div>
              {address && <div className="pb-hero-line"><GeoAltFill size={12} /> {address}</div>}
              <div className="pb-hero-line-group">
                {todayHours && (
                  <span className={`pb-status-badge ${todayHours.open ? "open" : "closed"}`}>
                    <span className="dot" />
                    {todayHours.open
                      ? `Open · Closes ${fmtClock(todayHours.to)}`
                      : "Closed today"}
                  </span>
                )}
                {phone && <span className="pb-hero-line" style={{ marginTop:0 }}><TelephoneFill size={11} /> {phone}</span>}
              </div>
            </div>
          </div>

          <div className="pb-hero-badges">
            <div className="pb-glass-badge"><Scissors size={13} /> <b>{servicesCount}</b> Services</div>
            <div className="pb-glass-badge"><PeopleFill size={13} /> <b>{staffCount}</b> Staff</div>
          </div>

          <div className="pb-hero-actions">
            <button className="pb-action pb-action--primary" onClick={scrollToServices}>
              Book Now <ChevronRight size={13} />
            </button>
            {phone && (
              <a className="pb-action" href={`tel:${phone}`}>
                <TelephoneFill size={13} /> Call Salon
              </a>
            )}
            {(address || salonName) && (
              <a className="pb-action" target="_blank" rel="noopener noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || salonName)}`}>
                <GeoAltFill size={13} /> Get Directions
              </a>
            )}
            <button className="pb-action" onClick={handleShare}>
              <ShareFill size={13} /> Share
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1 }}>
        {step === 4 ? (
          <SuccessScreen
            salonName={salonName}
            selServices={selServices}
            selStaff={selStaff}
            selDate={selDate}
            selTime={selTime}
            form={form}
            onReset={handleBookAnother}
            onBackHome={handleBackHome}
            onAddToCalendar={handleAddToCalendar}
            onManage={
              createdAppointment?.id && createdAppointment?.manage_token
                ? () => navigate(`/book/${slug}/manage/${createdAppointment.id}?token=${createdAppointment.manage_token}`)
                : undefined
            }
          />
        ) : (
          <div className="pb-container">
            <StepBar step={step} />

            {step === 1 && (
              <div className="pb-layout">
                <div className="pb-main" ref={serviceSectionRef}>
                  <SectionHead title="Choose a Service" sub="Select what you'd like to book today" />

                  <div className="pb-search-sticky">
                    <input
                      className="pb-search-input"
                      placeholder="Search services…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {categories.length > 2 && (
                    <div className="pb-cat-row">
                      {categories.map((cat) => {
                        const act = activeCat === cat;
                        return (
                          <button key={cat} className={`pb-cat-chip ${act ? "active" : ""}`}
                            onClick={() => setActiveCat(cat)}>
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filtered.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"48px 24px",
                      background:C.white, borderRadius:20, border:`1.5px dashed ${C.border}` }}>
                      <p style={{ fontWeight:700, color:C.text, margin:"0 0 4px" }}>No services available</p>
                      <p style={{ fontSize:13, color:C.muted, margin:0 }}>Please check back later.</p>
                    </div>
                  ) : (
                    <div className="pb-services-grid">
                      {filtered.map((svc) => (
                        <ServiceCard key={svc.id} svc={svc}
                          selected={selServices.some((s) => s.id === svc.id)}
                          onPick={() => toggleService(svc)} />
                      ))}
                    </div>
                  )}

                  {selServices.length > 0 && (
                    <div style={{ position:"sticky", bottom:0, marginTop:24, display:"flex",
                      alignItems:"center", justifyContent:"space-between", gap:16,
                      background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16,
                      padding:"14px 20px", boxShadow:`0 -8px 24px rgba(46,16,101,0.08)` }}>
                      <div>
                        <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:C.text }}>
                          {selServices.length} service{selServices.length > 1 ? "s" : ""} selected
                        </p>
                        <p style={{ margin:0, fontSize:12, color:C.muted }}>
                          {fmtDur(totalDuration)} · {fmtPrice(totalPrice)}
                        </p>
                      </div>
                      <button onClick={() => setStep(2)}
                        style={{ background:GRADIENT, color:C.white, border:"none", borderRadius:12,
                          padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer",
                          display:"flex", alignItems:"center", gap:8,
                          boxShadow:`0 4px 18px ${C.accent}40` }}>
                        Continue <ChevronRight size={15} />
                      </button>
                    </div>
                  )}

                  {/* ── Reviews ── */}
                  <div className="pb-reviews">
                    <div className="pb-reviews-head">
                      <SectionHead title="Customer Reviews" sub="What clients are saying" />
                      <div className="pb-rating-summary">
                        <div>
                          <div className="pb-rating-big">{rating.toFixed(1)}</div>
                          <div style={{ display:"flex", gap:2, marginTop:4 }}>
                            {[1,2,3,4,5].map((i) => (
                              <StarFill key={i} size={13} color={i <= Math.round(rating) ? "#fbbf24" : C.border} />
                            ))}
                          </div>
                          <div style={{ fontSize:11.5, color:C.muted, marginTop:4 }}>{reviewCount} reviews</div>
                        </div>
                        <div className="pb-rating-bars">
                          {RATING_BREAKDOWN.map((r) => (
                            <div key={r.star} className="pb-rating-bar-row">
                              <span>{r.star}★</span>
                              <div className="pb-rating-bar-track">
                                <div className="pb-rating-bar-fill" style={{ width:`${r.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pb-review-grid">
                      {DEMO_REVIEWS.map((rev, i) => (
                        <div key={i} className="pb-review-card">
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                            <div style={{ width:36, height:36, borderRadius:"50%", background:GRADIENT,
                              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                              fontWeight:800, fontSize:13, flexShrink:0 }}>
                              {initials(rev.name)}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.text }}>{rev.name}</p>
                              <p style={{ margin:0, fontSize:11, color:C.muted }}>{rev.date}</p>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:2, marginBottom:8 }}>
                            {[1,2,3,4,5].map((i2) => (
                              <StarFill key={i2} size={11} color={i2 <= rev.rating ? "#fbbf24" : C.border} />
                            ))}
                          </div>
                          <p style={{ margin:0, fontSize:12.5, color:"#4b5563", lineHeight:1.6 }}>{rev.text}</p>
                        </div>
                      ))}
                    </div>

                    <button className="pb-view-all-btn">View All Reviews <ChevronRight size={13} /></button>
                  </div>
                </div>

                {/* ── Sidebar (desktop only) ── */}
                <aside className="pb-sidebar">
                  <div className="pb-sidebar-card">
                    <p className="pb-sidebar-title">Salon Information</p>
                    {address && (
                      <div className="pb-sidebar-row">
                        <span>Address</span>
                        <span>{address}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="pb-sidebar-row">
                        <span>Phone</span>
                        <span>{phone}</span>
                      </div>
                    )}
                    {todayHours && (
                      <div className="pb-sidebar-row">
                        <span>Today</span>
                        <span>{todayHours.open ? `${fmtClock(todayHours.from)} – ${fmtClock(todayHours.to)}` : "Closed"}</span>
                      </div>
                    )}
                    <a className="pb-map-preview"
                      target="_blank" rel="noopener noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || salonName)}`}
                      style={{ marginTop:12 }}>
                      <PinMapFill size={20} />
                      <span style={{ fontSize:11.5, fontWeight:700 }}>Open in Google Maps</span>
                    </a>
                  </div>

                  <div className="pb-sidebar-card">
                    <p className="pb-sidebar-title">Amenities</p>
                    <div className="pb-amenity-grid">
                      {amenities.slice(0, 6).map((a) => {
                        const m = amenityMeta(a);
                        return (
                          <div key={a} className="pb-amenity">
                            {m.icon} {m.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pb-sidebar-card">
                    <p className="pb-sidebar-title">Payment Methods</p>
                    <div className="pb-payment-row">
                      <span className="pb-payment-chip"><CashCoin size={12} /> Cash</span>
                      <span className="pb-payment-chip"><CreditCard2FrontFill size={12} /> Card</span>
                      <span className="pb-payment-chip"><ShieldCheck size={12} /> UPI</span>
                    </div>
                  </div>

                  <div className="pb-sidebar-card">
                    <p className="pb-sidebar-title">Cancellation Policy</p>
                    <p style={{ margin:0, fontSize:12.5, color:C.muted, lineHeight:1.6 }}>
                      Free cancellation up to 24 hours before your appointment. Late cancellations may incur a fee.
                    </p>
                  </div>
                </aside>
              </div>
            )}

            {step === 2 && selServices.length > 0 && (
              <>
                <BackBtn label="Back to Services" onClick={() => setStep(1)} />
                <ServicesSummary services={selServices} />

                <SectionHead title="Pick Your Stylist" sub="Choose who you'd like to work with" />
                <div style={{ display:"grid",
                  gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:12, marginBottom:28 }}>
                  <StaffCard
                    name="Any available" subtitle="Best match for your slot"
                    initials="?" bg={C.muted}
                    selected={selStaff === "any"}
                    onClick={() => setSelStaff("any")} />
                  {staffList.map((s) => {
                    const n = staffName(s);
                    const hue = hashHue(String(s.id));
                    return (
                      <StaffCard key={s.id} name={n}
                        subtitle={s.job_title || ("role" in s ? s.role : undefined) || "Stylist"}
                        initials={initials(n)}
                        bg={`hsl(${hue},55%,52%)`}
                        selected={selStaff !== "any" && (selStaff as StaffMember)?.id === s.id}
                        onClick={() => setSelStaff(s)} />
                    );
                  })}
                </div>

                <SectionHead title="Choose a Date" sub="Select your preferred appointment day" />
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 }}>
                  {dates.map((d, i) => {
                    const act = d.toDateString() === selDate.toDateString();
                    return (
                      <button key={i} onClick={() => { setSelDate(d); setSelTime(null); }}
                        style={{ background: act ? GRADIENT : C.white,
                          border:`1.5px solid ${act ? C.accent : C.border}`,
                          borderRadius:14, padding:"10px 14px", cursor:"pointer",
                          textAlign:"center", color: act ? C.white : C.text, minWidth:58,
                          boxShadow: act ? `0 4px 14px ${C.accent}40` : "none" }}>
                        <div style={{ fontSize:9.5, fontWeight:700, opacity: act ? 0.85 : 0.55,
                          marginBottom:3, letterSpacing:"0.06em" }}>
                          {i === 0 ? "TODAY" : DAYS[d.getDay()].toUpperCase()}
                        </div>
                        <div style={{ fontSize:20, fontWeight:900, lineHeight:1 }}>{d.getDate()}</div>
                        <div style={{ fontSize:9.5, opacity: act ? 0.8 : 0.45, marginTop:3 }}>
                          {MONTHS[d.getMonth()]}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <SectionHead
                  title="Available Times"
                  sub={`${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}`}
                />
                {slots.morning.length > 0 && (
                  <>
                    <p style={{ fontSize:11, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 10px" }}>
                      Morning
                    </p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:18 }}>
                      {slots.morning.map((t) => <TimeChip key={t} t={t} sel={selTime} onPick={setSelTime} />)}
                    </div>
                  </>
                )}
                {slots.afternoon.length > 0 && (
                  <>
                    <p style={{ fontSize:11, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 10px" }}>
                      Afternoon
                    </p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:28 }}>
                      {slots.afternoon.map((t) => <TimeChip key={t} t={t} sel={selTime} onPick={setSelTime} />)}
                    </div>
                  </>
                )}

                <button
                  disabled={!selStaff || !selTime}
                  onClick={() => setStep(3)}
                  style={{ background: selStaff && selTime ? GRADIENT : C.med,
                    color: selStaff && selTime ? C.white : C.muted,
                    border:"none", borderRadius:12, padding:"13px 28px",
                    fontSize:14, fontWeight:700,
                    cursor: selStaff && selTime ? "pointer" : "not-allowed",
                    display:"flex", alignItems:"center", gap:8,
                    boxShadow: selStaff && selTime ? `0 4px 18px ${C.accent}40` : "none" }}>
                  Continue to Confirmation <ChevronRight size={15} />
                </button>
              </>
            )}

            {step === 3 && selServices.length > 0 && (
              <>
                <BackBtn label="Back" onClick={() => setStep(2)} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:24, alignItems:"start" }}>
                  <div>
                    <SectionHead title="Your Details" sub="Enter your contact info to complete the booking" />
                    <div style={{ background:C.white, borderRadius:20, padding:24,
                      border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(46,16,101,0.05)" }}>
                      {(["name", "email", "phone"] as const).map((field) => (
                        <div key={field} style={{ marginBottom:18 }}>
                          <label style={{ display:"block", fontSize:13, fontWeight:600,
                            color:"#374151", marginBottom:6 }}>
                            {{ name:"Full Name", email:"Email Address", phone:"Phone Number" }[field]}
                            {field !== "phone" && <span style={{ color:C.accent, marginLeft:2 }}>*</span>}
                          </label>
                          <input
                            type={{ name:"text", email:"email", phone:"tel" }[field]}
                            placeholder={{ name:"Jane Smith", email:"jane@example.com", phone:"+1 (555) 000-0000" }[field]}
                            value={form[field]}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (field === "phone") val = val.replace(/\D/g, "").slice(0, 10);
                              setForm((f) => ({ ...f, [field]: val }));
                            }}
                            style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${C.border}`,
                              borderRadius:10, fontSize:13.5, outline:"none",
                              boxSizing:"border-box", color:C.text }}
                          />
                        </div>
                      ))}
                      <div style={{ marginBottom:18 }}>
                        <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>
                          Gender <span style={{ fontWeight:400, color:C.muted }}>(optional)</span>
                        </label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                          style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${C.border}`,
                            borderRadius:10, fontSize:13.5, outline:"none",
                            boxSizing:"border-box", color:form.gender ? C.text : "#9ca3af", background:C.white }}>
                          <option value="">Prefer not to say</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="non_binary">Non-binary</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>
                          Notes <span style={{ fontWeight:400, color:C.muted }}>(optional)</span>
                        </label>
                        <textarea
                          placeholder="Any requests or info for your stylist…"
                          value={form.notes} rows={3}
                          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                          style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${C.border}`,
                            borderRadius:10, fontSize:13.5, outline:"none", resize:"vertical",
                            fontFamily:"inherit", boxSizing:"border-box", color:C.text }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:C.text, margin:"0 0 14px" }}>Booking Summary</p>
                    <div style={{ background:C.white, borderRadius:20,
                      border:`1.5px solid ${C.border}`, overflow:"hidden",
                      boxShadow:`0 4px 24px ${C.accent}18` }}>
                      <div style={{ background:GRADIENT, padding:"18px 20px", color:C.white }}>
                        <p style={{ margin:"0 0 3px", fontWeight:800, fontSize:15 }}>
                          {selServices.map((s) => s.name).join(", ")}
                        </p>
                        <p style={{ margin:0, fontSize:12.5, opacity:0.85 }}>
                          {fmtDur(totalDuration)} · {fmtPrice(totalPrice)}
                        </p>
                      </div>
                      <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                        {[
                          { label:"Stylist", value: selStaff === "any" ? "Any available stylist" : selStaff ? staffName(selStaff as StaffMember) : "" },
                          { label:"Date", value: `${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}` },
                          { label:"Time", value: selTime ?? "" },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display:"flex", justifyContent:"space-between",
                            alignItems:"center", padding:"8px 12px", background:C.light, borderRadius:9,
                            border:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8",
                              textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
                            <span style={{ fontSize:13, color:"#1e293b", fontWeight:600 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop:`1px solid ${C.med}`, padding:"14px 20px",
                        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.muted }}>Total</span>
                        <span style={{ fontSize:20, fontWeight:900, color:C.accent }}>{fmtPrice(totalPrice)}</span>
                      </div>
                    </div>

                    {submitError && (
                      <p style={{ fontSize:12.5, color:"#dc2626", marginTop:10 }}>{submitError}</p>
                    )}

                    <button
                      disabled={bookingLoading || !form.name || !form.email || form.phone.length !== 10}
                      onClick={handleSubmit}
                      style={{ marginTop:14, width:"100%",
                        background: bookingLoading || !form.name || !form.email || form.phone.length !== 10 ? C.med : GRADIENT,
                        color: bookingLoading || !form.name || !form.email || form.phone.length !== 10 ? C.muted : C.white,
                        border:"none", borderRadius:12, padding:"13px",
                        fontSize:14, fontWeight:700,
                        cursor: bookingLoading || !form.name || !form.email || form.phone.length !== 10 ? "not-allowed" : "pointer",
                        boxShadow: form.name && form.email && form.phone.length === 10 && !bookingLoading
                          ? `0 4px 18px ${C.accent}40` : "none" }}>
                      {bookingLoading ? "Confirming…" : "Confirm Booking"}
                    </button>
                    <p style={{ fontSize:11.5, color:C.muted, textAlign:"center", marginTop:10 }}>
                      Free cancellation up to 24 hours before.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
