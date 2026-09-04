import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronRight, ChevronLeft, ChevronDown, StarFill, GeoAltFill, TelephoneFill, ShareFill,
  Wifi, CarFrontFill, PeopleFill, Scissors,
  Snow, ShieldCheck, PinMapFill, Search as SearchIcon,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { ONLINE_BOOKING } from "../../../services/api/endpoints";
import {
  fetchPublicSalonBySlugThunk,
  createPublicBookingThunk,
} from "../../../middleware/onlineBooking/onlineBooking.thunk";
import {
  C, GRADIENT, DAYS, MONTHS, staffName, initials, fmtDur, fmtPrice, nextDays, catMeta, hashHue, fmtClock,
  StepBar, SectionHead, BackBtn, ServicesSummary, ServiceCard, StaffCard, TimeChip, SuccessScreen,
  type ServiceItem, type StaffMember,
} from "../../online-booking/components/BookingFlow/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Shown as the hero background when a salon hasn't set a cover image yet.
const DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=1600";

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

const REVIEW_PREVIEW_COUNT = 3;

// Matches the real Amenity enum (marketplace.types.ts) — only keys the
// Marketplace Profile features editor can actually produce.
function amenityMeta(key: string): { icon: JSX.Element; label: string } {
  const map: Record<string, { icon: JSX.Element; label: string }> = {
    parking_available:      { icon: <CarFrontFill size={14} />,      label: "Parking" },
    near_public_transport:  { icon: <GeoAltFill size={14} />,        label: "Near Transit" },
    showers:                { icon: <Wifi size={14} />,              label: "Showers" },
    lockers:                { icon: <ShieldCheck size={14} />,       label: "Lockers" },
    bath_towels:            { icon: <ShieldCheck size={14} />,       label: "Bath Towels" },
    swimming_pool:          { icon: <Snow size={14} />,              label: "Swimming Pool" },
    sauna:                  { icon: <Snow size={14} />,              label: "Sauna" },
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
  const [heroSlide, setHeroSlide] = useState(0);
  const [reviewSlide, setReviewSlide] = useState(0);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const serviceSectionRef = useRef<HTMLDivElement>(null);
  const pageRootRef = useRef<HTMLDivElement>(null);
  const catMenuRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(step);

  useEffect(() => {
    if (!catMenuOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [catMenuOpen]);

  useEffect(() => {
    if (slug) dispatch(fetchPublicSalonBySlugThunk(slug));
  }, [slug, dispatch]);

  // Advancing a step (via a "Continue" button) jumps straight to the new
  // step's content instead of the page top — the hero would otherwise sit
  // between the user and content they already scrolled past to get here.
  // Going back a step is left alone since the user is already scrolled to
  // roughly the right place, and resetting to step 1 has its own explicit
  // scroll handling (handleBackHome / handleBookAnother).
  useEffect(() => {
    const prevStep = prevStepRef.current;
    prevStepRef.current = step;
    if (step > prevStep) {
      bodyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  const services: ServiceItem[] = salonDetails?.services ?? [];
  const staffList: StaffMember[] = salonDetails?.staff ?? [];
  const salon = salonDetails?.salon ?? null;
  const salonName = salon?.business_name || salon?.display_name || salon?.name || "This salon";
  const currencyCode: string | undefined = salon?.currency;

  // Hero / sidebar derived fields (defensive — backend salon shape is loosely typed;
  // banner_url is the real column, the rest are aliases some callers may send instead)
  const logoUrl   = salon?.logo_url || salon?.logoUrl || "";
  const coverUrl  = (
    salon?.banner_url ||
    salon?.cover_image ||
    salon?.image_url ||
    salon?.cover_url ||
    salon?.bannerUrl ||
    salon?.coverUrl ||
    DEFAULT_COVER_IMAGE
  ).trim();
  const address   = buildAddress(salon);
  const phone     = salon?.phone || salon?.business_phone || salon?.contact_number || "";
  const rating    = typeof salon?.rating === "number" ? salon.rating : 0;
  const reviewCount = typeof salon?.review_count === "number" ? salon.review_count : 0;
  const ratingBreakdown: Record<number, number> = salon?.rating_breakdown ?? {};
  const reviewsList: { name: string; rating: number; date: string; text: string }[] = Array.isArray(salon?.reviews)
    ? salon.reviews.map((r: any) => ({
        name: r.client_first_name || "Guest",
        rating: r.rating,
        date: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        text: r.review_text,
      }))
    : [];
  const todayHours = getTodayHours(salon?.working_hours ?? salon?.hours);
  const amenities: string[] = Array.isArray(salon?.amenities) ? salon.amenities : [];
  const cancellationNoticeHours: number = Number(salon?.cancellation_notice_hours) || 0;
  const heroSlides = useMemo(() => [
    {
      eyebrow: "Hair Styling",
      title: "Premium Hair Styling Experience",
      copy: "Book certified stylists for the perfect haircut and styling.",
      cta: "Book Now",
      image: coverUrl,
      badge: "4.9 (12,000 Reviews)",
    },
    {
      eyebrow: "Professional Makeup",
      title: "Look Gorgeous For Every Occasion",
      copy: "Luxury artists, event-ready looks, and effortless booking.",
      cta: "Explore Makeup",
      image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1800&auto=format&fit=crop",
      badge: "20% OFF",
    },
    {
      eyebrow: "Facial & Skin Care",
      title: "Healthy Skin Starts Here",
      copy: "Relax with premium facial treatments and skin-care experts.",
      cta: "Book Facial",
      image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1800&auto=format&fit=crop",
      badge: "Glow Packages",
    },
    {
      eyebrow: "Nail Art",
      title: "Creative Nail Designs",
      copy: "Discover luxury nail studios, nail extensions, and nail art.",
      cta: "Explore Nails",
      image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1800&auto=format&fit=crop",
      badge: "Trending Now",
    },
    {
      eyebrow: "Special Offers",
      title: "Flat 30% OFF",
      copy: "First Booking Special Offer on selected beauty services.",
      cta: "Claim Offer",
      image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1800&auto=format&fit=crop",
      badge: "First Booking",
    },
  ], [coverUrl]);
  // Real reviews only — up to 3 for the hero's floating card carousel.
  const reviewCards = reviewsList.slice(0, 3).map((r) => ({
    title: "★".repeat(r.rating),
    text: r.text,
    name: r.name,
  }));

  useEffect(() => {
    const id = window.setInterval(() => setHeroSlide((s) => (s + 1) % heroSlides.length), 5000);
    return () => window.clearInterval(id);
  }, [heroSlides.length]);

  useEffect(() => {
    if (reviewCards.length === 0) return;
    const id = window.setInterval(() => setReviewSlide((s) => (s + 1) % reviewCards.length), 4200);
    return () => window.clearInterval(id);
  }, [reviewCards.length]);

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
  const totalDuration = useMemo(
    () => selServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0),
    [selServices]
  );
  const totalPrice = useMemo(
    () => selServices.reduce((sum, s) => sum + (typeof s.price === "string" ? parseFloat(s.price) || 0 : s.price), 0),
    [selServices]
  );

  // Real availability — which staff (or which of "any" staff) are actually
  // free for this date/duration, instead of a fake hash-of-the-date list.
  const [slots, setSlots] = useState<{ morning: string[]; afternoon: string[] }>({ morning: [], afternoon: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  useEffect(() => {
    if (!salon?.id || totalDuration <= 0) { setSlots({ morning: [], afternoon: [] }); return; }
    let cancelled = false;
    setSlotsLoading(true);
    const dateStr = `${selDate.getFullYear()}-${String(selDate.getMonth() + 1).padStart(2, "0")}-${String(selDate.getDate()).padStart(2, "0")}`;
    api.get(ONLINE_BOOKING.AVAILABILITY(String(salon.id)), {
      params: {
        date: dateStr,
        durationMinutes: totalDuration,
        ...(selStaff && selStaff !== "any" ? { staffId: String((selStaff as StaffMember).id) } : {}),
      },
    })
      .then((res) => {
        if (cancelled) return;
        const all: string[] = res.data?.data?.slots ?? [];
        setSlots({
          morning:   all.filter((t) => t.endsWith("AM")),
          afternoon: all.filter((t) => t.endsWith("PM")),
        });
      })
      .catch(() => { if (!cancelled) setSlots({ morning: [], afternoon: [] }); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [salon?.id, selDate, selStaff, totalDuration]);

  const categories = ["All", ...Array.from(new Set(services.map((s) => s.category_name ?? "Other")))];
  const VISIBLE_CAT_COUNT = 6;
  const visibleCategories = categories.slice(0, VISIBLE_CAT_COUNT);
  const moreCategories = categories.slice(VISIBLE_CAT_COUNT);
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
      <div className="pb-loading">
        <div className="pb-spinner" />
        <style>{`
          .pb-loading {
            display:flex; align-items:center; justify-content:center; min-height:100vh;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:${C.light};
          }
          .pb-spinner {
            width:40px; height:40px; border-radius:50%;
            border:3px solid ${C.med}; border-top-color:${C.accent};
            animation:spin 0.7s linear infinite;
          }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="pb-notfound">
        <h2 className="pb-notfound-title">Booking page not found</h2>
        <p className="pb-notfound-sub">
          {error || "This salon doesn't have a public booking page yet."}
        </p>
        <style>{`
          .pb-notfound {
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            min-height:100vh; gap:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            padding:24px; text-align:center; background:${C.light};
          }
          .pb-notfound-title { margin:0; font-size:20px; color:${C.text}; }
          .pb-notfound-sub { margin:0; color:${C.muted}; font-size:14px; }
        `}</style>
      </div>
    );
  }

  return (
    <div ref={pageRootRef} data-testid="pb-page-root" className="pb-root">

      <style>{`
        .pb-hero {
          position: relative;
          min-height: 340px;
          flex-shrink: 0;
          background-color: #111827;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .pb-hero {
          min-height:650px; height:auto; align-items:stretch; background:#0b0618;
          font-family:Poppins,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        }
        .pb-lux-hero { position:relative; width:100%; min-height:650px; overflow:hidden; }
        .pb-lux-slide {
          position:absolute; inset:0; opacity:0; transform:scale(1.04);
          transition:opacity 900ms ease, transform 5200ms ease; pointer-events:none;
        }
        .pb-lux-slide.active { opacity:1; transform:scale(1); }
        .pb-lux-slide img { width:100%; height:100%; object-fit:cover; display:block; }
        .pb-lux-overlay {
          position:absolute; inset:0; z-index:2;
          background:
            radial-gradient(circle at 76% 20%, rgba(236,72,153,0.28), transparent 32%),
            radial-gradient(circle at 16% 82%, rgba(16,185,129,0.20), transparent 34%),
            linear-gradient(90deg, rgba(0,0,0,0.42), rgba(37,18,70,0.30) 48%, rgba(0,0,0,0.10));
          backdrop-filter:blur(1.5px); -webkit-backdrop-filter:blur(1.5px);
        }
        .pb-lux-inner {
          position:relative; z-index:3; min-height:650px; max-width:1180px; margin:0 auto;
          padding:70px 28px 70px; display:grid; grid-template-columns:minmax(0,1fr) 380px;
          gap:48px; align-items:center; animation:pbHeroFade 700ms ease both;
        }
        .pb-lux-copy { max-width:640px; color:#fff; }
        .pb-lux-brand { display:flex; align-items:center; gap:16px; margin-bottom:14px; }
        .pb-lux-avatar {
          width:60px; height:60px; border-radius:50%; flex-shrink:0; overflow:hidden;
          border:3px solid rgba(255,255,255,0.85); background:linear-gradient(135deg,#a78bfa,#7c3aed);
          display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:18px;
          box-shadow:0 10px 24px rgba(0,0,0,0.32);
        }
        .pb-lux-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
        .pb-lux-copy h1 { margin:0; font-size:clamp(34px,4.2vw,50px); line-height:1.04; letter-spacing:-0.01em; font-weight:900; text-shadow:0 20px 50px rgba(0,0,0,0.34); }
        .pb-lux-copy p { margin:14px 0 0; max-width:560px; color:rgba(255,255,255,0.86); font-size:17px; line-height:1.6; }
        .pb-lux-rating { display:flex; align-items:center; gap:8px; color:#fff; font-size:14px; font-weight:800; }
        .pb-lux-meta { display:flex; flex-wrap:wrap; gap:16px; margin-top:10px; }
        .pb-lux-meta span { display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.85); font-size:13px; font-weight:600; }
        .pb-lux-badges { display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; }
        .pb-lux-badge {
          display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:700; color:#fff;
          background:rgba(76,29,149,0.38); border:1px solid rgba(255,255,255,0.3); border-radius:999px;
          padding:8px 14px; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
        }
        .pb-lux-quick-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
        .pb-lux-quick-action {
          display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:700; color:#fff;
          background:rgba(76,29,149,0.34); border:1px solid rgba(255,255,255,0.3); border-radius:999px;
          padding:9px 16px; cursor:pointer; text-decoration:none; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
          transition:background 0.2s, transform 0.2s;
        }
        .pb-lux-quick-action:hover { background:rgba(124,58,237,0.5); transform:translateY(-1px); }
        .pb-lux-cta-primary {
          border:0; border-radius:999px; color:#fff; font-weight:900; cursor:pointer;
          background:linear-gradient(135deg,#7C3AED,#9333EA,#EC4899); background-size:180% 180%;
          box-shadow:0 16px 32px rgba(124,58,237,0.35); animation:pbGradientMove 5s ease infinite;
          transition:transform 0.2s, box-shadow 0.2s;
        }
        .pb-lux-cta-primary:hover { transform:translateY(-2px); }
        .pb-lux-ctas { display:flex; flex-wrap:wrap; gap:10px; margin-top:26px; }
        .pb-lux-cta-primary {
          min-height:54px; padding:0 24px; font-size:16px; display:inline-flex; align-items:center; gap:8px;
        }
        .pb-lux-side { position:relative; min-height:380px; }
        .pb-lux-image-card {
          position:relative; width:100%; height:380px; border-radius:28px; overflow:hidden;
          box-shadow:0 30px 70px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.18);
        }
        .pb-lux-image-card img { width:100%; height:100%; object-fit:cover; display:block; }
        .pb-lux-image-badge {
          position:absolute; top:16px; right:16px; padding:9px 16px; border-radius:999px;
          background:rgba(255,255,255,0.92); color:#7c3aed; font-weight:900; font-size:12.5px;
          box-shadow:0 8px 20px rgba(0,0,0,0.25); backdrop-filter:blur(8px);
        }
        .pb-review-float {
          position:absolute; left:-24px; bottom:-30px; width:280px; padding:18px; border-radius:24px;
          background:rgba(255,255,255,0.92); border:1px solid rgba(255,255,255,0.9);
          box-shadow:0 24px 60px rgba(15,23,42,0.24); backdrop-filter:blur(18px);
          animation:pbFloatCard 4.6s ease-in-out infinite;
        }
        .pb-review-float b { display:block; margin:8px 0 5px; color:#0f172a; font-size:16px; }
        .pb-review-float p { margin:0; color:#475569; font-size:13px; line-height:1.5; }
        .pb-review-float span { display:block; margin-top:10px; color:#7C3AED; font-size:12px; font-weight:900; }
        .pb-hero-arrow {
          position:absolute; z-index:5; top:50%; transform:translateY(-50%); width:44px; height:44px;
          border:1px solid rgba(255,255,255,0.34); border-radius:50%; background:rgba(255,255,255,0.16);
          color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; backdrop-filter:blur(12px);
        }
        .pb-hero-arrow.left { left:22px; } .pb-hero-arrow.right { right:22px; }
        .pb-hero-dots { position:absolute; z-index:5; left:50%; bottom:26px; transform:translateX(-50%); display:flex; gap:8px; }
        .pb-hero-dot { width:9px; height:9px; border-radius:999px; border:0; background:rgba(255,255,255,0.42); cursor:pointer; transition:all 0.2s; }
        .pb-hero-dot.active { width:30px; background:#fff; }
        @keyframes pbHeroFade { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        @keyframes pbGradientMove { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        @keyframes pbFloatCard { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }

        .pb-container { padding: 28px 24px 64px; max-width: 1180px; margin: 0 auto; }
        .pb-layout { display:grid; grid-template-columns: 1fr 320px; gap: 28px; align-items:start; }
        .pb-main { min-width:0; }
        .pb-sidebar { display:flex; flex-direction:column; gap:18px; position:sticky; top:20px; }
        .pb-sidebar-card { background:#fff; border:1px solid ${C.border}; border-radius:20px; padding:20px; box-shadow:0 2px 14px rgba(46,16,101,0.06); }
        .pb-sidebar-title { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:800; color:${C.text}; margin:0 0 14px; text-transform:uppercase; letter-spacing:0.05em; }
        .pb-sidebar-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; font-size:12.5px; gap:10px; }
        .pb-sidebar-row span:first-child { color:${C.muted}; }
        .pb-sidebar-row span:last-child { color:${C.text}; font-weight:700; text-align:right; }
        .pb-map-preview { height:112px; margin-top:12px; border-radius:14px; background:linear-gradient(135deg,${C.light},${C.med}); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; cursor:pointer; text-decoration:none; border:1.5px dashed ${C.border}; transition: all 0.2s; color:${C.accent}; }
        .pb-map-preview-label { font-size:11.5px; font-weight:700; }
        .pb-cancellation-text { margin:0; font-size:12.5px; color:${C.muted}; line-height:1.6; }
        .pb-map-preview:hover { background:linear-gradient(135deg,${C.med},${C.light}); border-color:${C.accent}; }
        .pb-amenity-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .pb-amenity { display:flex; align-items:center; gap:8px; font-size:11.5px; color:${C.text}; font-weight:600; background:${C.light}; border-radius:10px; padding:9px 10px; }
        .pb-payment-row { display:flex; gap:8px; flex-wrap:wrap; }
        .pb-payment-chip { display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:${C.accent}; background:${C.med}; border-radius:8px; padding:6px 10px; }

        .pb-staff-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(168px,1fr)); gap:14px; margin-bottom:28px; }

        .pb-date-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:28px; }
        .pb-date-btn {
          background:${C.white}; border:1.5px solid ${C.border}; border-radius:14px; padding:10px 14px;
          cursor:pointer; text-align:center; color:${C.text}; min-width:58px; box-shadow:none;
          transition:all 0.18s;
        }
        .pb-date-btn.active { background:${GRADIENT}; border-color:${C.accent}; color:${C.white}; box-shadow:0 4px 14px ${C.accent}40; }
        .pb-date-day { font-size:9.5px; font-weight:700; opacity:0.55; margin-bottom:3px; letter-spacing:0.06em; }
        .pb-date-btn.active .pb-date-day { opacity:0.85; }
        .pb-date-num { font-size:20px; font-weight:900; line-height:1; }
        .pb-date-month { font-size:9.5px; opacity:0.45; margin-top:3px; }
        .pb-date-btn.active .pb-date-month { opacity:0.8; }

        .pb-slot-label { font-size:11px; font-weight:700; color:${C.muted}; text-transform:uppercase; letter-spacing:0.07em; margin:0 0 10px; }
        .pb-slot-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
        .pb-slot-row--last { margin-bottom:28px; }

        .pb-step2-continue {
          background:${GRADIENT}; color:${C.white}; border:none; border-radius:12px; padding:13px 28px;
          font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px;
          box-shadow:0 4px 18px ${C.accent}40;
        }
        .pb-step2-continue:disabled {
          background:${C.med}; color:${C.muted}; cursor:not-allowed; box-shadow:none;
        }

        .pb-form-grid { display:grid; grid-template-columns:1fr 300px; gap:24px; align-items:start; }
        .pb-form-card { background:${C.white}; border-radius:20px; padding:24px; border:1px solid ${C.border}; box-shadow:0 2px 12px rgba(46,16,101,0.05); }
        .pb-field { margin-bottom:18px; }
        .pb-field-label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; }
        .pb-field-required { color:#dc2626; margin-left:2px; }
        .pb-field-optional { font-weight:400; color:${C.muted}; }
        .pb-field-input {
          width:100%; padding:10px 14px; border:1.5px solid ${C.border}; border-radius:10px;
          font-size:13.5px; outline:none; box-sizing:border-box; color:${C.text}; background:${C.white};
          font-family:inherit;
        }
        .pb-field-select-empty { color:#9ca3af; }
        .pb-field-textarea { resize:vertical; }

        .pb-summary-title { font-size:14px; font-weight:700; color:${C.text}; margin:0 0 14px; }
        .pb-summary-card { background:${C.white}; border-radius:20px; border:1.5px solid ${C.border}; overflow:hidden; box-shadow:0 4px 24px ${C.accent}18; }
        .pb-summary-head { background:${GRADIENT}; padding:18px 20px; color:${C.white}; }
        .pb-summary-service { margin:0 0 3px; font-weight:800; font-size:15px; }
        .pb-summary-meta { margin:0; font-size:12.5px; opacity:0.85; }
        .pb-summary-body { padding:16px 20px; display:flex; flex-direction:column; gap:10px; }
        .pb-summary-row {
          display:flex; justify-content:space-between; align-items:center; padding:8px 12px;
          background:${C.light}; border-radius:9px; border:1px solid ${C.border};
        }
        .pb-summary-row-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; }
        .pb-summary-row-value { font-size:13px; color:#1e293b; font-weight:600; }
        .pb-summary-total { border-top:1px solid ${C.med}; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; }
        .pb-summary-total-label { font-size:13px; font-weight:600; color:${C.muted}; }
        .pb-summary-total-value { font-size:20px; font-weight:900; color:${C.accent}; }

        .pb-submit-error { font-size:12.5px; color:#dc2626; margin-top:10px; }
        .pb-confirm-btn {
          margin-top:14px; width:100%; background:${GRADIENT}; color:${C.white}; border:none;
          border-radius:12px; padding:13px; font-size:14px; font-weight:700; cursor:pointer;
          box-shadow:0 4px 18px ${C.accent}40;
        }
        .pb-confirm-btn:disabled { background:${C.med}; color:${C.muted}; cursor:not-allowed; box-shadow:none; }
        .pb-cancel-note { font-size:11.5px; color:${C.muted}; text-align:center; margin-top:10px; }

        .pb-search-sticky { position:sticky; top:0; z-index:5; background:${C.light}; padding:10px 0 14px; margin-bottom:4px; }
        .pb-search-wrap { position:relative; }
        .pb-search-icon { position:absolute; left:18px; top:50%; transform:translateY(-50%); color:${C.muted}; pointer-events:none; }
        .pb-search-input {
          width:100%; padding:14px 18px 14px 44px; border:1.5px solid ${C.border}; border-radius:999px;
          font-size:13.5px; outline:none; box-sizing:border-box; color:${C.text}; background:#fff;
          box-shadow:0 4px 16px rgba(46,16,101,0.06);
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .pb-search-input:focus { border-color:${C.accent}; box-shadow:0 0 0 4px ${C.accent}18, 0 4px 16px rgba(46,16,101,0.06); }

        .pb-cat-row {
          display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px;
        }
        .pb-cat-chip {
          display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:999px;
          border:1.5px solid ${C.border}; background:${C.light}; color:${C.text}; font-size:12.5px;
          font-weight:600; cursor:pointer; transition: all 0.18s; white-space:nowrap; flex-shrink:0;
        }
        .pb-cat-chip:hover { border-color:${C.accent}; transform: translateY(-1px); box-shadow:0 4px 12px rgba(124,58,237,0.15); }
        .pb-cat-chip.active {
          background:linear-gradient(135deg, #7c3aed, #ec4899); border-color:transparent; color:#fff;
          box-shadow:0 4px 14px rgba(124,58,237,0.4);
        }
        .pb-cat-more-btn { display:inline-flex; align-items:center; gap:5px; }
        .pb-cat-more-btn svg { transition:transform 0.2s; }
        .pb-cat-more-btn.open svg { transform:rotate(180deg); }

        .pb-cat-panel {
          width:100%; margin:8px 0 24px; padding:18px; border-radius:20px;
          background:#fff; border:1.5px solid ${C.border}; box-shadow:0 16px 40px rgba(46,16,101,0.14);
          display:flex; flex-wrap:wrap; gap:10px;
          animation:pbPanelIn 0.2s ease both;
        }
        @keyframes pbPanelIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .pb-cat-panel-item {
          display:inline-flex; align-items:center; gap:8px; padding:8px 16px 8px 8px; border-radius:999px;
          background:${C.light}; border:1.5px solid transparent; color:${C.text}; font-size:13px; font-weight:700;
          cursor:pointer; transition:all 0.2s ease;
        }
        .pb-cat-panel-item:hover { border-color:${C.accent}; transform:translateY(-1px); box-shadow:0 4px 12px rgba(124,58,237,0.15); }
        .pb-cat-panel-item.active {
          background:linear-gradient(135deg, #7c3aed, #ec4899); color:#fff;
          box-shadow:0 4px 14px rgba(124,58,237,0.4);
        }
        .pb-cat-panel-icon {
          width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center;
          background:rgba(124,58,237,0.12); color:${C.accent}; flex-shrink:0; transition:all 0.2s ease;
        }
        .pb-cat-panel-item.active .pb-cat-panel-icon { background:rgba(255,255,255,0.25); color:#fff; }

        .pb-services-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:18px; }

        .pb-reviews { margin-top:48px; padding-top:32px; border-top:1px solid ${C.border}; }
        .pb-reviews-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:18px; }
        .pb-reviews-head-title { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex:1; min-width:240px; }
        .pb-write-review-btn {
          flex-shrink:0; margin-top:2px; padding:10px 18px; border-radius:12px; border:1.5px solid ${C.accent};
          background:#fff; color:${C.accent}; font-weight:700; font-size:13px; cursor:pointer; transition:all 0.18s;
        }
        .pb-write-review-btn:hover { background:${C.light}; }

        .pb-review-form {
          background:#fff; border:1.5px solid ${C.border}; border-radius:20px; padding:20px;
          margin-bottom:24px; display:flex; flex-direction:column; gap:16px;
          box-shadow:0 2px 12px rgba(46,16,101,0.05);
        }
        .pb-review-form-row { display:flex; flex-direction:column; }
        .pb-review-form-stars { display:flex; gap:6px; margin-top:2px; }
        .pb-review-star-btn { background:none; border:none; padding:2px; cursor:pointer; line-height:0; }
        .pb-review-submit-btn {
          align-self:flex-start; background:${GRADIENT}; color:${C.white}; border:none; border-radius:12px;
          padding:11px 24px; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 4px 18px ${C.accent}40;
        }
        .pb-review-submit-btn:disabled { background:${C.med}; color:${C.muted}; cursor:not-allowed; box-shadow:none; }
        .pb-rating-summary { display:flex; align-items:center; gap:22px; }
        .pb-rating-big { font-size:42px; font-weight:900; color:${C.text}; line-height:1; }
        .pb-rating-bars { display:flex; flex-direction:column; gap:4px; min-width:150px; }
        .pb-rating-bar-row { display:flex; align-items:center; gap:8px; font-size:11px; color:${C.muted}; }
        .pb-rating-bar-track { flex:1; height:6px; border-radius:4px; background:${C.med}; overflow:hidden; }
        .pb-rating-bar-fill { height:100%; background:${GRADIENT}; border-radius:4px; }
        .pb-review-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:16px; }
        .pb-review-card { position:relative; background:#fff; border:1px solid ${C.border}; border-radius:20px; padding:18px 38px 18px 18px; box-shadow:0 2px 10px rgba(46,16,101,0.04); }
        .pb-review-remove-btn {
          position:absolute; top:14px; right:14px; width:24px; height:24px; border-radius:50%;
          border:1px solid ${C.border}; background:${C.light}; color:${C.muted};
          display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.18s;
        }
        .pb-review-remove-btn:hover { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }
        .pb-view-all-btn { display:inline-flex; align-items:center; gap:6px; margin-top:22px; padding:11px 22px; border-radius:12px; border:1.5px solid ${C.border}; background:#fff; color:${C.accent}; font-weight:700; font-size:13px; cursor:pointer; }
        .pb-view-all-btn:hover { border-color:${C.accent}; background:${C.light}; }
        .pb-view-all-btn svg { transition:transform 0.2s; }
        .pb-view-all-icon-up { transform:rotate(-90deg); }

        .pb-root { height:100vh; overflow-y:auto; display:flex; flex-direction:column;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:${C.light}; }
        .pb-body { flex:1; }

        .pb-empty-state { text-align:center; padding:48px 24px; background:#fff; border-radius:20px; border:1.5px dashed ${C.border}; }
        .pb-empty-title { font-weight:700; color:${C.text}; margin:0 0 4px; }
        .pb-empty-sub { font-size:13px; color:${C.muted}; margin:0; }

        .pb-continue-bar {
          position:sticky; bottom:16px; margin-top:24px; display:flex; align-items:center;
          justify-content:space-between; gap:16px; background:rgba(255,255,255,0.75);
          backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(255,255,255,0.6); border-radius:18px;
          padding:14px 20px; box-shadow:0 12px 36px rgba(46,16,101,0.18);
        }
        .pb-continue-count { margin:0 0 2px; font-size:13px; font-weight:700; color:${C.text}; }
        .pb-continue-meta { margin:0; font-size:12px; color:${C.muted}; }
        .pb-continue-btn {
          background:${GRADIENT}; color:#fff; border:none; border-radius:12px;
          padding:12px 24px; font-size:14px; font-weight:700; cursor:pointer;
          display:flex; align-items:center; gap:8px; box-shadow:0 4px 18px ${C.accent}40;
        }

        .pb-rating-stars { display:flex; gap:2px; margin-top:4px; }
        .pb-rating-count { font-size:11.5px; color:${C.muted}; margin-top:4px; }
        .pb-review-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .pb-review-avatar {
          width:36px; height:36px; border-radius:50%; background:${GRADIENT}; color:#fff;
          display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; flex-shrink:0;
        }
        .pb-review-who { min-width:0; }
        .pb-review-name { margin:0; font-size:13px; font-weight:700; color:${C.text}; }
        .pb-review-date { margin:0; font-size:11px; color:${C.muted}; }
        .pb-review-stars { display:flex; gap:2px; margin-bottom:8px; }
        .pb-review-text { margin:0; font-size:12.5px; color:#4b5563; line-height:1.6; }

        @media (max-width: 1024px) {
          .pb-hero, .pb-lux-hero { min-height:0; }
          .pb-lux-inner { min-height:0; grid-template-columns:1fr; padding:58px 22px 60px; gap:36px; }
          .pb-lux-side { min-height:0; }
          .pb-lux-image-card { height:320px; }
          .pb-review-float { left:16px; bottom:16px; }
          .pb-layout { grid-template-columns: 1fr; }
          .pb-sidebar { display:none; }
        }
        @media (max-width: 640px) {
          .pb-hero, .pb-lux-hero { min-height:0; }
          .pb-lux-inner { padding:48px 16px 48px; }
          .pb-lux-copy h1 { font-size:34px; }
          .pb-lux-copy p { font-size:15px; }
          .pb-lux-cta-primary { width:100%; justify-content:center; font-size:16px; }
          .pb-lux-image-card { height:240px; }
          .pb-review-float { position:static; width:auto; margin-top:14px; }
          .pb-hero-arrow { display:none; }
          .pb-services-grid { grid-template-columns:1fr; }
          .pb-review-grid { grid-template-columns:1fr; }
          .pb-rating-summary { flex-direction:column; align-items:flex-start; gap:12px; }
        }
      `}</style>

      {/* ── Premium Hero ── */}
      <div className="pb-hero">
        <div className="pb-lux-hero">
          {heroSlides.map((slide, i) => (
            <div key={slide.title} className={`pb-lux-slide ${i === heroSlide ? "active" : ""}`}>
              <img src={slide.image} alt={slide.title} />
            </div>
          ))}
          <div className="pb-lux-overlay" />

          <button className="pb-hero-arrow left" onClick={() => setHeroSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length)} aria-label="Previous hero slide">
            <ChevronLeft size={20} />
          </button>
          <button className="pb-hero-arrow right" onClick={() => setHeroSlide((s) => (s + 1) % heroSlides.length)} aria-label="Next hero slide">
            <ChevronRight size={20} />
          </button>

          <div className="pb-lux-inner">
            <div className="pb-lux-copy">
              <div className="pb-lux-brand">
                <div className="pb-lux-avatar">
                  {logoUrl ? <img src={logoUrl} alt={salonName} /> : salonName.slice(0, 2).toUpperCase()}
                </div>
                <h1>{salonName}</h1>
              </div>
              {reviewCount > 0 && (
                <div className="pb-lux-rating">
                  {[1,2,3,4,5].map((i) => (
                    <StarFill key={i} size={15} color={i <= Math.round(rating) ? "#F59E0B" : "rgba(255,255,255,0.35)"} />
                  ))}
                  <span>{rating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}</span>
                </div>
              )}
              {(address || phone) && (
                <div className="pb-lux-meta">
                  {address && <span><GeoAltFill size={13} /> {address}</span>}
                  {phone && <span><TelephoneFill size={13} /> {phone}</span>}
                </div>
              )}
              <p>{heroSlides[heroSlide].copy}</p>

              <div className="pb-lux-badges">
                <span className="pb-lux-badge"><Scissors size={13} /> {services.length} Services</span>
                <span className="pb-lux-badge"><PeopleFill size={13} /> {staffList.length} Staff</span>
              </div>

              <div className="pb-lux-ctas">
                <button className="pb-lux-cta-primary" onClick={scrollToServices}>
                  Book Appointment <ChevronRight size={18} />
                </button>
              </div>

              <div className="pb-lux-quick-actions">
                {phone && (
                  <a className="pb-lux-quick-action" href={`tel:${phone}`}>
                    <TelephoneFill size={13} /> Call Salon
                  </a>
                )}
                {(address || salonName) && (
                  <a className="pb-lux-quick-action" target="_blank" rel="noopener noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || salonName)}`}>
                    <GeoAltFill size={13} /> Get Directions
                  </a>
                )}
                <button className="pb-lux-quick-action" onClick={handleShare}>
                  <ShareFill size={13} /> Share
                </button>
              </div>
            </div>

            <div className="pb-lux-side">
              <div className="pb-lux-image-card">
                <img src={heroSlides[heroSlide].image} alt={salonName} />
                <div className="pb-lux-image-badge">{heroSlides[heroSlide].badge}</div>
              </div>
              {reviewCards.length > 0 && (
                <div className="pb-review-float">
                  <div>{[1,2,3,4,5].map((i) => <StarFill key={i} size={13} color="#F59E0B" />)}</div>
                  <b>{reviewCards[reviewSlide % reviewCards.length].title}</b>
                  <p>{reviewCards[reviewSlide % reviewCards.length].text}</p>
                  <span>- {reviewCards[reviewSlide % reviewCards.length].name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pb-hero-dots">
            {heroSlides.map((slide, i) => (
              <button key={slide.title} className={`pb-hero-dot ${i === heroSlide ? "active" : ""}`} onClick={() => setHeroSlide(i)} aria-label={`Show ${slide.title}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pb-body" ref={bodyRef}>
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
            currencyCode={currencyCode}
          />
        ) : (
          <div className="pb-container">
            <StepBar step={step} />

            {step === 1 && (
              <div className="pb-layout">
                <div className="pb-main" ref={serviceSectionRef}>
                  <SectionHead title="Choose a Service" sub="Select what you'd like to book today" />

                  <div className="pb-search-sticky">
                    <div className="pb-search-wrap">
                      <SearchIcon className="pb-search-icon" size={15} />
                      <input
                        className="pb-search-input"
                        placeholder="Search for services..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {categories.length > 2 && (
                    <div ref={catMenuRef}>
                      <div className="pb-cat-row">
                        {visibleCategories.map((cat) => {
                          const act = activeCat === cat;
                          return (
                            <button key={cat} className={`pb-cat-chip ${act ? "active" : ""}`}
                              onClick={() => setActiveCat(cat)}>
                              {cat}
                            </button>
                          );
                        })}
                        {moreCategories.length > 0 && (
                          <button
                            className={`pb-cat-chip pb-cat-more-btn ${moreCategories.includes(activeCat) ? "active" : ""} ${catMenuOpen ? "open" : ""}`}
                            onClick={() => setCatMenuOpen((o) => !o)}>
                            {moreCategories.includes(activeCat) ? activeCat : "More"}
                            <ChevronDown size={12} />
                          </button>
                        )}
                      </div>

                      {catMenuOpen && moreCategories.length > 0 && (
                        <div className="pb-cat-panel">
                          {moreCategories.map((cat) => {
                            const meta = catMeta(cat);
                            const isActive = activeCat === cat;
                            return (
                              <button key={cat}
                                className={`pb-cat-panel-item ${isActive ? "active" : ""}`}
                                onClick={() => { setActiveCat(cat); setCatMenuOpen(false); }}>
                                <span className="pb-cat-panel-icon"><meta.icon size={13} /></span>
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {filtered.length === 0 ? (
                    <div className="pb-empty-state">
                      <p className="pb-empty-title">No services available</p>
                      <p className="pb-empty-sub">Please check back later.</p>
                    </div>
                  ) : (
                    <div className="pb-services-grid">
                      {filtered.map((svc) => (
                        <ServiceCard key={svc.id} svc={svc}
                          selected={selServices.some((s) => s.id === svc.id)}
                          onPick={() => toggleService(svc)}
                          currencyCode={currencyCode} />
                      ))}
                    </div>
                  )}

                  {selServices.length > 0 && (
                    <div className="pb-continue-bar">
                      <div>
                        <p className="pb-continue-count">
                          {selServices.length} service{selServices.length > 1 ? "s" : ""} selected
                        </p>
                        <p className="pb-continue-meta">
                          {fmtDur(totalDuration)} · {fmtPrice(totalPrice, currencyCode)}
                        </p>
                      </div>
                      <button className="pb-continue-btn" onClick={() => setStep(2)}>
                        Continue <ChevronRight size={15} />
                      </button>
                    </div>
                  )}

                  {/* ── Reviews — real reviews only, sourced from completed, rated
                      appointments. There's no open public review form: reviews
                      here come verified from the post-visit feedback flow, not
                      an anonymous form anyone browsing could flood. ── */}
                  <div className="pb-reviews">
                    <div className="pb-reviews-head">
                      <div className="pb-reviews-head-title">
                        <SectionHead title="Customer Reviews" sub="What clients are saying" />
                      </div>
                      {reviewCount > 0 && (
                        <div className="pb-rating-summary">
                          <div>
                            <div className="pb-rating-big">{rating.toFixed(1)}</div>
                            <div className="pb-rating-stars">
                              {[1,2,3,4,5].map((i) => (
                                <StarFill key={i} size={13} color={i <= Math.round(rating) ? "#fbbf24" : C.border} />
                              ))}
                            </div>
                            <div className="pb-rating-count">{reviewCount} review{reviewCount === 1 ? "" : "s"}</div>
                          </div>
                          <div className="pb-rating-bars">
                            {[5, 4, 3, 2, 1].map((star) => (
                              <div key={star} className="pb-rating-bar-row">
                                <span>{star}★</span>
                                <div className="pb-rating-bar-track">
                                  <div className="pb-rating-bar-fill"
                                    style={{ width: `${reviewCount ? ((ratingBreakdown[star] ?? 0) / reviewCount) * 100 : 0}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {reviewsList.length === 0 ? (
                      <div className="pb-empty-state">
                        <p className="pb-empty-title">No reviews yet</p>
                        <p className="pb-empty-sub">Be the first to book and share your experience.</p>
                      </div>
                    ) : (
                      <>
                        <div className="pb-review-grid">
                          {(showAllReviews ? reviewsList : reviewsList.slice(0, REVIEW_PREVIEW_COUNT)).map((rev, i) => (
                            <div key={i} className="pb-review-card">
                              <div className="pb-review-head">
                                <div className="pb-review-avatar">
                                  {initials(rev.name)}
                                </div>
                                <div className="pb-review-who">
                                  <p className="pb-review-name">{rev.name}</p>
                                  <p className="pb-review-date">{rev.date}</p>
                                </div>
                              </div>
                              <div className="pb-review-stars">
                                {[1,2,3,4,5].map((i2) => (
                                  <StarFill key={i2} size={11} color={i2 <= rev.rating ? "#fbbf24" : C.border} />
                                ))}
                              </div>
                              <p className="pb-review-text">{rev.text}</p>
                            </div>
                          ))}
                        </div>

                        {reviewsList.length > REVIEW_PREVIEW_COUNT && (
                          <button className="pb-view-all-btn" onClick={() => setShowAllReviews((v) => !v)}>
                            {showAllReviews ? "Show Less" : "View All Reviews"}
                            <ChevronRight size={13} className={showAllReviews ? "pb-view-all-icon-up" : ""} />
                          </button>
                        )}
                      </>
                    )}
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
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || salonName)}`}>
                      <PinMapFill size={20} />
                      <span className="pb-map-preview-label">Open in Google Maps</span>
                    </a>
                  </div>

                  {amenities.length > 0 && (
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
                  )}

                  <div className="pb-sidebar-card">
                    <p className="pb-sidebar-title">Cancellation Policy</p>
                    <p className="pb-cancellation-text">
                      {cancellationNoticeHours > 0
                        ? `Free cancellation up to ${cancellationNoticeHours} hour${cancellationNoticeHours === 1 ? "" : "s"} before your appointment.`
                        : "This salon accepts cancellations at any time before your appointment."}
                    </p>
                  </div>
                </aside>
              </div>
            )}

            {step === 2 && selServices.length > 0 && (
              <>
                <BackBtn label="Back to Services" onClick={() => setStep(1)} />
                <ServicesSummary services={selServices} currencyCode={currencyCode} />

                <SectionHead title="Pick Your Stylist" sub="Choose who you'd like to work with" />
                <div className="pb-staff-grid">
                  <StaffCard
                    name="Any available" subtitle="Best match for your slot"
                    initials="?" bg={C.muted}
                    selected={selStaff === "any"}
                    onClick={() => { setSelStaff("any"); setSelTime(null); }} />
                  {staffList.map((s) => {
                    const n = staffName(s);
                    const hue = hashHue(String(s.id));
                    return (
                      <StaffCard key={s.id} name={n}
                        subtitle={s.job_title || ("role" in s ? s.role : undefined) || "Stylist"}
                        initials={initials(n)}
                        bg={`hsl(${hue},55%,52%)`}
                        selected={selStaff !== "any" && (selStaff as StaffMember)?.id === s.id}
                        onClick={() => { setSelStaff(s); setSelTime(null); }} />
                    );
                  })}
                </div>

                <SectionHead title="Choose a Date" sub="Select your preferred appointment day" />
                <div className="pb-date-row">
                  {dates.map((d, i) => {
                    const act = d.toDateString() === selDate.toDateString();
                    return (
                      <button key={i} className={`pb-date-btn ${act ? "active" : ""}`}
                        onClick={() => { setSelDate(d); setSelTime(null); }}>
                        <div className="pb-date-day">
                          {i === 0 ? "TODAY" : DAYS[d.getDay()].toUpperCase()}
                        </div>
                        <div className="pb-date-num">{d.getDate()}</div>
                        <div className="pb-date-month">{MONTHS[d.getMonth()]}</div>
                      </button>
                    );
                  })}
                </div>

                <SectionHead
                  title="Available Times"
                  sub={`${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}`}
                />
                {slotsLoading ? (
                  <p className="pb-slot-label">Checking availability…</p>
                ) : slots.morning.length === 0 && slots.afternoon.length === 0 ? (
                  <p className="pb-slot-label">No times available on this date — try another day.</p>
                ) : (
                  <>
                    {slots.morning.length > 0 && (
                      <>
                        <p className="pb-slot-label">Morning</p>
                        <div className="pb-slot-row">
                          {slots.morning.map((t) => <TimeChip key={t} t={t} sel={selTime} onPick={setSelTime} />)}
                        </div>
                      </>
                    )}
                    {slots.afternoon.length > 0 && (
                      <>
                        <p className="pb-slot-label">Afternoon</p>
                        <div className="pb-slot-row pb-slot-row--last">
                          {slots.afternoon.map((t) => <TimeChip key={t} t={t} sel={selTime} onPick={setSelTime} />)}
                        </div>
                      </>
                    )}
                  </>
                )}

                <button
                  disabled={!selStaff || !selTime}
                  onClick={() => setStep(3)}
                  className="pb-step2-continue">
                  Continue to Confirmation <ChevronRight size={15} />
                </button>
              </>
            )}

            {step === 3 && selServices.length > 0 && (
              <>
                <BackBtn label="Back" onClick={() => setStep(2)} />
                <div className="pb-form-grid">
                  <div>
                    <SectionHead title="Your Details" sub="Enter your contact info to complete the booking" />
                    <div className="pb-form-card">
                      {(["name", "email", "phone"] as const).map((field) => (
                        <div key={field} className="pb-field">
                          <label className="pb-field-label">
                            {{ name:"Full Name", email:"Email Address", phone:"Phone Number" }[field]}
                            <span className="pb-field-required">*</span>
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
                            className="pb-field-input"
                          />
                        </div>
                      ))}
                      <div className="pb-field">
                        <label className="pb-field-label">
                          Gender <span className="pb-field-optional">(optional)</span>
                        </label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                          className={`pb-field-input ${form.gender ? "" : "pb-field-select-empty"}`}>
                          <option value="">Prefer not to say</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="non_binary">Non-binary</option>
                        </select>
                      </div>
                      <div>
                        <label className="pb-field-label">
                          Notes <span className="pb-field-optional">(optional)</span>
                        </label>
                        <textarea
                          placeholder="Any requests or info for your stylist…"
                          value={form.notes} rows={3}
                          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                          className="pb-field-input pb-field-textarea"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="pb-summary-title">Booking Summary</p>
                    <div className="pb-summary-card">
                      <div className="pb-summary-head">
                        <p className="pb-summary-service">
                          {selServices.map((s) => s.name).join(", ")}
                        </p>
                        <p className="pb-summary-meta">
                          {fmtDur(totalDuration)} · {fmtPrice(totalPrice, currencyCode)}
                        </p>
                      </div>
                      <div className="pb-summary-body">
                        {[
                          { label:"Stylist", value: selStaff === "any" ? "Any available stylist" : selStaff ? staffName(selStaff as StaffMember) : "" },
                          { label:"Date", value: `${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}` },
                          { label:"Time", value: selTime ?? "" },
                        ].map(({ label, value }) => (
                          <div key={label} className="pb-summary-row">
                            <span className="pb-summary-row-label">{label}</span>
                            <span className="pb-summary-row-value">{value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pb-summary-total">
                        <span className="pb-summary-total-label">Total</span>
                        <span className="pb-summary-total-value">{fmtPrice(totalPrice, currencyCode)}</span>
                      </div>
                    </div>

                    {submitError && (
                      <p className="pb-submit-error">{submitError}</p>
                    )}

                    <button
                      disabled={bookingLoading || !form.name || !form.email || form.phone.length !== 10}
                      onClick={handleSubmit}
                      className="pb-confirm-btn">
                      {bookingLoading ? "Confirming…" : "Confirm Booking"}
                    </button>
                    <p className="pb-cancel-note">
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
