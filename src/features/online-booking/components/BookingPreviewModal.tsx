import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  StarFill,
  X,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SALON } from "../../../services/api/endpoints/salon.endpoints";
import { SERVICES } from "../../../services/api/endpoints/services.endpoints";
import { STAFF } from "../../../services/api/endpoints/staff.endpoints";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { createPublicBookingThunk } from "../../../middleware/onlineBooking/onlineBooking.thunk";
import {
  C, DAYS, MONTHS, catMeta, staffName, initials, fmtDur, fmtPrice, nextDays, buildSlots,
  AvatarCircle, StepBar, SectionHead, BackBtn, ServicesSummary, ServiceCard, StaffCard, TimeChip, SuccessScreen,
  type SalonData, type ServiceItem, type StaffMember,
} from "./BookingFlow/shared";

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_SERVICES = [
  { id: -1, name: "Haircut & Styling", duration: 45, price: 35, category_name: "Hair", description: "Precision cut tailored to your face shape and texture." },
  { id: -2, name: "Color & Highlights", duration: 90, price: 85, category_name: "Color", description: "Full color, balayage, or foil highlights by our color experts." },
  { id: -3, name: "Blowdry & Finish", duration: 30, price: 28, category_name: "Hair", description: "Salon-quality blowdry with your choice of straight or curled finish." },
  { id: -4, name: "Classic Facial", duration: 60, price: 60, category_name: "Skin", description: "Deep cleanse, exfoliation, steam and hydration mask." },
  { id: -5, name: "Eyebrow Shaping", duration: 20, price: 18, category_name: "Brows", description: "Threading or waxing for perfectly defined brows." },
  { id: -6, name: "Beard Trim & Shape", duration: 25, price: 22, category_name: "Men", description: "Precision beard shaping and edge-up with hot towel finish." },
];

const DEMO_STAFF = [
  { id: -1, first_name: "Alice", last_name: "Johnson", job_title: "Senior Stylist" },
  { id: -2, first_name: "Ben", last_name: "Carter", job_title: "Color Specialist" },
  { id: -3, first_name: "Chloe", last_name: "Kim", job_title: "Skin Therapist" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean; onClose: () => void;
  previewName?: string; previewTagline?: string; previewDescription?: string;
  galleryPhotos?: string[];
}

export default function BookingPreviewModal({ open, onClose, previewName, previewTagline, previewDescription, galleryPhotos }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [loading,  setLoading]  = useState(true);
  const [salon,    setSalon]    = useState<SalonData>({ name: previewName || "My Salon" });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staffList,setStaffList]= useState<StaffMember[]>([]);

  const [step,            setStep]           = useState<1|2|3|4>(1);
  const [activeCat,       setActiveCat]      = useState("All");
  const [search,          setSearch]         = useState("");
  const [selServices,     setSelServices]    = useState<ServiceItem[]>([]);
  const [selStaff,        setSelStaff]       = useState<StaffMember | "any" | null>(null);
  const [selDate,         setSelDate]        = useState<Date>(new Date());
  const [selTime,         setSelTime]        = useState<string | null>(null);
  const [form,            setForm]           = useState({ name:"", email:"", phone:"", notes:"" });
  const [submitting,      setSubmitting]     = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

  const dates    = nextDays(8);
  const slots    = buildSlots(selDate);
  const isDemo   = services.length === 0;
  const display  = isDemo ? DEMO_SERVICES : services;
  const displayStaff = staffList.length === 0 ? DEMO_STAFF : staffList;

  const categories = ["All", ...Array.from(new Set(display.map(s => s.category_name ?? "Other")))];
  const filtered = display.filter(s => {
    const catOk  = activeCat === "All" || s.category_name === activeCat;
    const srchOk = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return catOk && srchOk;
  });

  const totalDuration = selServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  const totalPrice = selServices.reduce(
    (sum, s) => sum + (typeof s.price === "string" ? parseFloat(s.price) || 0 : s.price), 0
  );

  function toggleService(svc: ServiceItem) {
    setSelServices(prev =>
      prev.some(s => s.id === svc.id) ? prev.filter(s => s.id !== svc.id) : [...prev, svc]
    );
  }

  useEffect(() => {
    if (!open) return;
    setStep(1); setActiveCat("All"); setSearch(""); setSelServices([]);
    setSelStaff(null); setSelDate(new Date()); setSelTime(null);
    setForm({ name:"", email:"", phone:"", notes:"" });
    loadData();
  }, [open]);

  async function loadData() {
    setLoading(true);
    try {
      const [sr, svr, str] = await Promise.allSettled([
        api.get(SALON.ME), api.get(SERVICES.BASE), api.get(STAFF.BASE),
      ]);
      if (sr.status === "fulfilled") {
        const d = sr.value.data?.data ?? sr.value.data ?? {};
        const addr = d.address;
        setSalon({
          id:          d.id,
          name:        previewName    || d.name        || "My Salon",
          tagline:     previewTagline || d.tagline     || "",
          description: previewDescription || d.description || "",
          phone:       d.phone || d.contact_number || "",
          address:     typeof addr === "string" ? addr
                       : addr?.street ? `${addr.street}, ${addr.city || ""}` : "",
        });
      } else {
        setSalon({ name: previewName || "My Salon", tagline: previewTagline || "", description: previewDescription || "" });
      }
      if (svr.status === "fulfilled") {
        const raw = svr.value.data?.data ?? svr.value.data?.services ?? svr.value.data ?? [];
        setServices(Array.isArray(raw) ? (raw as ServiceItem[]).slice(0, 18) : []);
      }
      if (str.status === "fulfilled") {
        const raw = str.value.data?.data ?? str.value.data?.staff ?? str.value.data ?? [];
        setStaffList(Array.isArray(raw) ? (raw as StaffMember[]).slice(0, 8) : []);
      }
    } finally { setLoading(false); }
  }

  if (!open) return null;

  const salonName = salon.name || previewName || "My Salon";

  return createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:99999, display:"flex", flexDirection:"column",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: C.white }}>

      {/* ── Top Banner ─────────────────────────────────────────────────── */}
      <div style={{ background:"#010102", color:"#9ca3af", padding:"9px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        fontSize:12.5, fontWeight:500, flexShrink:0, letterSpacing:"0.01em" }}>
        <span style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ background:"#374151", color:"#fff", borderRadius:5,
            padding:"2px 9px", fontSize:10.5, fontWeight:800, letterSpacing:"0.07em" }}>PREVIEW</span>
          This is how clients see your booking page — changes are not live yet
        </span>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid #374151",
          color:"#9ca3af", cursor:"pointer", borderRadius:8, padding:"6px 14px",
          fontSize:12.5, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
          <X size={14} /> Close Preview
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════ */}
        <div style={{ width:300, flexShrink:0, background:"#fff",
          borderRight:`1px solid ${C.border}`, overflowY:"auto",
          display:"flex", flexDirection:"column" }}>

          {/* ── Hero Banner ───────────────────────────────────────────── */}
          <div style={{ background:"linear-gradient(160deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)",
            padding:"28px 22px 24px", position:"relative", overflow:"hidden" }}>
            {/* subtle dot pattern */}
            <div style={{ position:"absolute", inset:0, opacity:0.06,
              backgroundImage:"radial-gradient(#fff 1px,transparent 1px)",
              backgroundSize:"18px 18px", pointerEvents:"none" }} />

            {/* Logo circle */}
            <div style={{ width:58, height:58, borderRadius:18,
              background:"linear-gradient(135deg,#f59e0b,#d97706)",
              display:"flex", alignItems:"center", justifyContent:"center",
              marginBottom:14, flexShrink:0,
              boxShadow:"0 4px 20px rgba(245,158,11,0.4)",
              fontSize:22, fontWeight:900, color:"#fff",
              letterSpacing:"-0.03em" }}>
              {salonName.slice(0,2).toUpperCase()}
            </div>

            <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:900,
              color:"#fff", lineHeight:1.2, letterSpacing:"-0.02em" }}>
              {salonName}
            </h2>

            {salon.tagline && (
              <p style={{ margin:"0 0 14px", fontSize:12.5,
                color:"rgba(255,255,255,0.65)", lineHeight:1.4 }}>
                {salon.tagline}
              </p>
            )}

            {/* Stars */}
            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
              {[1,2,3,4,5].map(i => (
                <StarFill key={i} size={12}
                  color={i<=4?"#f59e0b":"rgba(255,255,255,0.2)"}/>
              ))}
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.55)",
                marginLeft:7, fontWeight:500 }}>
                4.8 &nbsp;·&nbsp;
                <span style={{ color:"rgba(255,255,255,0.85)", fontWeight:700 }}>
                  120 reviews
                </span>
              </span>
            </div>
          </div>

          {/* ── Info Cards ────────────────────────────────────────────── */}
          <div style={{ padding:"18px 18px 0", display:"flex",
            flexDirection:"column", gap:10 }}>

            {salon.description && (
              <div style={{ background:"#f8fafc", borderRadius:12,
                padding:"12px 14px", border:"1px solid #e2e8f0" }}>
                <p style={{ margin:0, fontSize:12.5, color:"#475569",
                  lineHeight:1.7 }}>
                  {salon.description}
                </p>
              </div>
            )}

            {salon.address && (
              <div style={{ background:"#f8fafc", borderRadius:12,
                padding:"11px 14px", border:"1px solid #e2e8f0" }}>
                <span style={{ display:"block", fontSize:10, fontWeight:700,
                  color:"#94a3b8", textTransform:"uppercase",
                  letterSpacing:"0.08em", marginBottom:3 }}>
                  Location
                </span>
                <span style={{ fontSize:13, color:"#1e293b", fontWeight:500,
                  lineHeight:1.5 }}>
                  {salon.address}
                </span>
              </div>
            )}

            {salon.phone && (
              <div style={{ background:"#f8fafc", borderRadius:12,
                padding:"11px 14px", border:"1px solid #e2e8f0" }}>
                <span style={{ display:"block", fontSize:10, fontWeight:700,
                  color:"#94a3b8", textTransform:"uppercase",
                  letterSpacing:"0.08em", marginBottom:3 }}>
                  Phone
                </span>
                <span style={{ fontSize:13, color:"#1e293b", fontWeight:600 }}>
                  {salon.phone}
                </span>
              </div>
            )}

            <div style={{ background:"#f8fafc", borderRadius:12,
              padding:"11px 14px", border:"1px solid #e2e8f0" }}>
              <span style={{ display:"block", fontSize:10, fontWeight:700,
                color:"#94a3b8", textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8 }}>
                Opening Hours
              </span>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[
                  { days:"Mon – Fri", time:"9:00 AM – 6:00 PM", open:true },
                  { days:"Saturday",  time:"10:00 AM – 5:00 PM", open:true },
                  { days:"Sunday",    time:"Closed", open:false },
                ].map(row => (
                  <div key={row.days} style={{ display:"flex",
                    justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:"#475569", fontWeight:500 }}>
                      {row.days}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700,
                      color: row.open ? "#0f172a" : "#94a3b8" }}>
                      {row.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Stats Row ─────────────────────────────────────────────── */}
          <div style={{ padding:"14px 18px 0",
            display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { val:"120+", label:"Clients" },
              { val:"4.8★", label:"Rating" },
              { val:"5 yrs", label:"Experience" },
            ].map(({ val, label }) => (
              <div key={label} style={{ background:"#f8fafc", borderRadius:12,
                padding:"10px 8px", textAlign:"center",
                border:"1px solid #e2e8f0" }}>
                <div style={{ fontSize:14, fontWeight:900, color:"#0f172a",
                  letterSpacing:"-0.02em" }}>{val}</div>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:500,
                  marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ── Team ──────────────────────────────────────────────────── */}
          {displayStaff.length > 0 && (
            <div style={{ padding:"18px 18px 0" }}>
              <p style={{ fontSize:10, fontWeight:700, color:"#94a3b8",
                textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 12px" }}>
                Meet Our Team
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {displayStaff.slice(0,6).map((s) => {
                  const n = staffName(s);
                  const hue = Math.abs((s.id * 53 + 180) % 360);
                  return (
                    <div key={s.id} style={{ display:"flex", flexDirection:"column",
                      alignItems:"center", gap:5, width:52 }}>
                      <AvatarCircle name={n} size={48}
                        bg={`hsl(${hue},55%,52%)`}/>
                      <span style={{ fontSize:10, color:"#475569", fontWeight:600,
                        textAlign:"center", lineHeight:1.2,
                        overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap", width:52 }}>
                        {n.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Gallery ───────────────────────────────────────────────── */}
          {galleryPhotos && galleryPhotos.length > 0 && (
            <div style={{ padding:"18px 18px 0" }}>
              <p style={{ fontSize:10, fontWeight:700, color:"#94a3b8",
                textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 10px" }}>
                Our Work
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:5 }}>
                {galleryPhotos.slice(0,6).map((url, i) => (
                  <div key={i} style={{ aspectRatio:"1", borderRadius:10,
                    overflow:"hidden", background:C.med }}>
                    <img src={url} alt={`gallery ${i+1}`}
                      style={{ width:"100%", height:"100%",
                        objectFit:"cover", display:"block" }}/>
                  </div>
                ))}
              </div>
              {galleryPhotos.length > 6 && (
                <p style={{ fontSize:11, color:"#94a3b8", margin:"8px 0 0",
                  textAlign:"center", fontWeight:500 }}>
                  +{galleryPhotos.length - 6} more photos
                </p>
              )}
            </div>
          )}

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div style={{ marginTop:"auto", padding:"18px 20px",
            borderTop:`1px solid ${C.border}`, textAlign:"center",
            fontSize:11, color:"#94a3b8" }}>
            Powered by{" "}
            <span style={{ color:"#0f172a", fontWeight:800,
              letterSpacing:"-0.02em" }}>Salonox</span>
          </div>
        </div>

        {/* ══ RIGHT PANEL ═══════════════════════════════════════════════ */}
        <div style={{ flex:1, overflowY:"auto", background:"#f8f7ff" }}>

          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", height:"80%", gap:14 }}>
              <div style={{ width:40, height:40, borderRadius:"50%",
                border:`3px solid ${C.med}`, borderTopColor:C.accent,
                animation:"spin 0.7s linear infinite" }}/>
              <p style={{ color:C.muted, fontSize:14, margin:0 }}>Loading your booking page…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>

          ) : step === 4 ? (
            <SuccessScreen
              salonName={salonName}
              selServices={selServices}
              selStaff={selStaff}
              selDate={selDate}
              selTime={selTime}
              form={form}
              onReset={() => {
                setStep(1); setSelServices([]); setSelStaff(null);
                setSelTime(null); setForm({ name:"", email:"", phone:"", notes:"" });
                setCreatedAppointment(null);
              }}
              onBackHome={onClose}
              onAddToCalendar={() => {
                if (!createdAppointment?.id) return;
                const dateStr = String(createdAppointment.scheduled_at ?? "").slice(0, 10)
                  || new Date(`${selDate.toDateString()} ${selTime}`).toISOString().slice(0, 10);
                onClose();
                navigate("/dashboard/calendar", {
                  state: { focusAppointment: { id: createdAppointment.id, date: dateStr } },
                });
              }}
            />

          ) : (
            <div style={{ padding:"28px 32px", maxWidth:760, margin:"0 auto" }}>
              <StepBar step={step} />

              {/* ── STEP 1: Services ─────────────────────────────────── */}
              {step === 1 && (
                <>
                  <SectionHead title="Choose a Service" sub="Select what you'd like to book today"/>

                  {isDemo && (
                    <div style={{ display:"flex", alignItems:"center", gap:10,
                      background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10,
                      padding:"10px 16px", marginBottom:20, fontSize:12.5, color:"#92400e" }}>
                      ⚠️ <strong>Sample preview</strong> — add your real services in the Catalog section.
                    </div>
                  )}

                  {/* Search */}
                  <div style={{ position:"relative", marginBottom:16 }}>
                    <input
                      placeholder="Search services…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ width:"100%", padding:"11px 16px", border:`1.5px solid #e5e7eb`,
                        borderRadius:10, fontSize:13.5, outline:"none", boxSizing:"border-box",
                        color:C.text, background:C.white }}
                      onFocus={e => (e.target.style.borderColor = C.accent)}
                      onBlur={e  => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>

                  {/* Category tabs */}
                  {categories.length > 2 && (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                      {categories.map(cat => {
                        const m   = catMeta(cat === "All" ? undefined : cat);
                        const act = activeCat === cat;
                        return (
                          <button key={cat} onClick={() => setActiveCat(cat)}
                            style={{ display:"flex", alignItems:"center",
                              padding:"7px 16px", borderRadius:999,
                              border:`1.5px solid ${act ? C.accent : "#e5e7eb"}`,
                              background: act ? C.accent : C.white,
                              color: act ? C.white : C.text,
                              fontSize:12.5, fontWeight:600, cursor:"pointer",
                              transition:"all 0.15s" }}>
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Service grid */}
                  {filtered.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"48px 24px",
                      background:C.white, borderRadius:16, border:`1.5px dashed ${C.border}` }}>
                      <div style={{ fontSize:36, marginBottom:10 }}>🔍</div>
                      <p style={{ fontWeight:700, color:C.text, margin:"0 0 4px" }}>No services found</p>
                      <p style={{ fontSize:13, color:C.muted, margin:0 }}>Try a different search or category.</p>
                    </div>
                  ) : (
                    <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:14 }}>
                      {filtered.map((svc, idx) => (
                        <ServiceCard key={svc.id} svc={svc} popular={idx < 2 && isDemo}
                          selected={selServices.some(s => s.id === svc.id)}
                          onPick={() => toggleService(svc)}/>
                      ))}
                    </div>
                  )}

                  {selServices.length > 0 && (
                    <div style={{ position:"sticky", bottom:0, marginTop:20, display:"flex",
                      alignItems:"center", justifyContent:"space-between", gap:16,
                      background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16,
                      padding:"14px 20px", boxShadow:"0 -8px 24px rgba(0,0,0,0.06)" }}>
                      <div>
                        <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color:C.text }}>
                          {selServices.length} service{selServices.length > 1 ? "s" : ""} selected
                        </p>
                        <p style={{ margin:0, fontSize:12, color:C.muted }}>
                          {fmtDur(totalDuration)} · {fmtPrice(totalPrice)}
                        </p>
                      </div>
                      <button onClick={() => setStep(2)}
                        style={{ background:C.accent, color:C.white, border:"none", borderRadius:12,
                          padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer",
                          display:"flex", alignItems:"center", gap:8,
                          boxShadow:`0 4px 18px ${C.accent}40` }}>
                        Continue <ChevronRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: Stylist + Date + Time ────────────────────── */}
              {step === 2 && (
                <>
                  <BackBtn label="Back to Services" onClick={() => setStep(1)}/>
                  <ServicesSummary services={selServices}/>

                  <SectionHead title="Pick Your Stylist" sub="Choose who you'd like to work with"/>
                  <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:12, marginBottom:28 }}>
                    <StaffCard
                      name="Any available" subtitle="Best match for your slot"
                      initials="?" bg={C.muted}
                      selected={selStaff === "any"}
                      onClick={() => setSelStaff("any")}/>
                    {displayStaff.map(s => {
                      const n = staffName(s);
                      const hue = Math.abs((s.id * 53 + 180) % 360);
                      return (
                        <StaffCard key={s.id} name={n}
                          subtitle={s.job_title || ("role" in s ? s.role : undefined) || "Stylist"}
                          initials={initials(n)}
                          bg={`hsl(${hue},55%,52%)`}
                          selected={selStaff !== "any" && (selStaff as StaffMember)?.id === s.id}
                          onClick={() => setSelStaff(s)}/>
                      );
                    })}
                  </div>

                  <SectionHead title="Choose a Date" sub="Select your preferred appointment day"/>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 }}>
                    {dates.map((d, i) => {
                      const act = d.toDateString() === selDate.toDateString();
                      return (
                        <button key={i} onClick={() => { setSelDate(d); setSelTime(null); }}
                          style={{ background: act ? C.accent : C.white,
                            border:`1.5px solid ${act ? C.accent : "#e5e7eb"}`,
                            borderRadius:14, padding:"10px 14px", cursor:"pointer",
                            textAlign:"center", color: act ? C.white : C.text,
                            transition:"all 0.15s", minWidth:58,
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
                        ☀️ Morning
                      </p>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:18 }}>
                        {slots.morning.map(t => <TimeChip key={t} t={t} sel={selTime} onPick={setSelTime}/>)}
                      </div>
                    </>
                  )}
                  {slots.afternoon.length > 0 && (
                    <>
                      <p style={{ fontSize:11, fontWeight:700, color:C.muted,
                        textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 10px" }}>
                        🌤 Afternoon
                      </p>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:28 }}>
                        {slots.afternoon.map(t => <TimeChip key={t} t={t} sel={selTime} onPick={setSelTime}/>)}
                      </div>
                    </>
                  )}

                  <button
                    disabled={!selStaff || !selTime}
                    onClick={() => setStep(3)}
                    style={{ background: selStaff && selTime ? C.accent : "#e5e7eb",
                      color: selStaff && selTime ? C.white : C.muted,
                      border:"none", borderRadius:12, padding:"13px 28px",
                      fontSize:14, fontWeight:700,
                      cursor: selStaff && selTime ? "pointer" : "not-allowed",
                      display:"flex", alignItems:"center", gap:8, transition:"all 0.15s",
                      boxShadow: selStaff && selTime ? `0 4px 18px ${C.accent}40` : "none" }}>
                    Continue to Confirmation <ChevronRight size={15}/>
                  </button>
                </>
              )}

              {/* ── STEP 3: Confirm ──────────────────────────────────── */}
              {step === 3 && (
                <>
                  <BackBtn label="Back" onClick={() => setStep(2)}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 300px",
                    gap:24, alignItems:"start" }}>

                    {/* Form */}
                    <div>
                      <SectionHead title="Your Details" sub="Enter your contact info to complete the booking"/>
                      <div style={{ background:C.white, borderRadius:16, padding:24,
                        border:"1px solid #f3f4f6", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
                        {(["name","email","phone"] as const).map(field => (
                          <div key={field} style={{ marginBottom:18 }}>
                            <label style={{ display:"block", fontSize:13, fontWeight:600,
                              color:"#374151", marginBottom:6 }}>
                              {{ name:"Full Name", email:"Email Address", phone:"Phone Number" }[field]}
                              {field !== "phone" && <span style={{ color:C.accent, marginLeft:2 }}>*</span>}
                            </label>
                            <input
                              type={{ name:"text", email:"email", phone:"tel" }[field]}
                              placeholder={{ name:"Jane Smith", email:"jane@example.com",
                                phone:"+1 (555) 000-0000" }[field]}
                              value={form[field]}
                              onChange={e => {
                                let val = e.target.value;
                                if (field === "phone") val = val.replace(/\D/g, "").slice(0, 10);
                                setForm(f => ({ ...f, [field]: val }));
                              }}
                              style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e5e7eb",
                                borderRadius:10, fontSize:13.5, outline:"none",
                                boxSizing:"border-box", color:C.text, transition:"border-color 0.15s" }}
                              onFocus={e => (e.target.style.borderColor = C.accent)}
                              onBlur={e  => (e.target.style.borderColor = "#e5e7eb")}
                            />
                          </div>
                        ))}
                        <div>
                          <label style={{ display:"block", fontSize:13, fontWeight:600,
                            color:"#374151", marginBottom:6 }}>
                            Notes <span style={{ fontWeight:400, color:C.muted }}>(optional)</span>
                          </label>
                          <textarea
                            placeholder="Any requests or info for your stylist…"
                            value={form.notes} rows={3}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e5e7eb",
                              borderRadius:10, fontSize:13.5, outline:"none", resize:"vertical",
                              fontFamily:"inherit", boxSizing:"border-box", color:C.text }}
                            onFocus={e => (e.target.style.borderColor = C.accent)}
                            onBlur={e  => (e.target.style.borderColor = "#e5e7eb")}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:C.text, margin:"0 0 14px" }}>
                        Booking Summary
                      </p>
                      <div style={{ background:C.white, borderRadius:16,
                        border:`1.5px solid ${C.border}`, overflow:"hidden",
                        boxShadow:`0 4px 24px ${C.accent}18` }}>
                        <div style={{ background:`linear-gradient(135deg,${C.dark},#374151)`,
                          padding:"18px 20px", color:C.white }}>
                          <p style={{ margin:"0 0 3px", fontWeight:800, fontSize:15 }}>
                            {selServices.map(s => s.name).join(", ")}
                          </p>
                          <p style={{ margin:0, fontSize:12.5, opacity:0.85 }}>
                            {fmtDur(totalDuration)} · {fmtPrice(totalPrice)}
                          </p>
                        </div>
                        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                          {[
                            { label:"Stylist",
                              value: selStaff === "any" ? "Any available stylist"
                                     : selStaff ? staffName(selStaff as StaffMember) : "" },
                            { label:"Date",
                              value: `${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}` },
                            { label:"Time",
                              value: selTime ?? "" },
                          ].map(({ label, value }) => (
                            <div key={label}
                              style={{ display:"flex", justifyContent:"space-between",
                                alignItems:"center", padding:"8px 12px",
                                background:"#f8fafc", borderRadius:9,
                                border:"1px solid #e2e8f0" }}>
                              <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8",
                                textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
                              <span style={{ fontSize:13, color:"#1e293b", fontWeight:600 }}>{value}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ borderTop:`1px solid ${C.med}`, padding:"14px 20px",
                          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:13, fontWeight:600, color:C.muted }}>Total</span>
                          <span style={{ fontSize:20, fontWeight:900, color:C.accent }}>
                            {fmtPrice(totalPrice)}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={submitting || !form.name || !form.email || form.phone.length !== 10}
                        onClick={async () => {
                          setSubmitting(true);
                          try {
                            const payload = {
                              salon_id: (salon as any).id || "demo-salon-id",
                              service_ids: selServices.map(s => String(s.id)),
                              staff_id: selStaff === "any" ? undefined : String((selStaff as StaffMember)?.id),
                              scheduled_at: new Date(`${selDate.toDateString()} ${selTime}`).toISOString(),
                              client_name: form.name,
                              client_email: form.email,
                              client_phone: form.phone,
                              notes: form.notes
                            };
                            const appointment = await dispatch(createPublicBookingThunk(payload)).unwrap();
                            setCreatedAppointment(appointment);
                            setStep(4);
                          } catch (err: any) {
                            alert(err || "Failed to create booking");
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        style={{ marginTop:14, width:"100%",
                          background: submitting || !form.name || !form.email || form.phone.length !== 10 ? "#e5e7eb" : C.accent,
                          color: submitting || !form.name || !form.email || form.phone.length !== 10 ? C.muted : C.white,
                          border:"none", borderRadius:12, padding:"13px",
                          fontSize:14, fontWeight:700,
                          cursor: submitting || !form.name || !form.email || form.phone.length !== 10 ? "not-allowed" : "pointer",
                          boxShadow: form.name && form.email && form.phone.length === 10 && !submitting
                            ? `0 4px 18px ${C.accent}40` : "none",
                          transition:"all 0.15s" }}>
                        {submitting
                          ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                              <span style={{ width:14, height:14, borderRadius:"50%",
                                border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff",
                                animation:"spin 0.7s linear infinite", display:"inline-block" }}/>
                              Confirming…
                            </span>
                          : "Confirm Booking"}
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
    </div>,
    document.body
  );
}
