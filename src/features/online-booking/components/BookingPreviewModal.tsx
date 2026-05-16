import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircleFill,
  ChevronRight,
  ChevronLeft,
  StarFill,
  X,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SALON } from "../../../services/api/endpoints/salon.endpoints";
import { SERVICES } from "../../../services/api/endpoints/services.endpoints";
import { STAFF } from "../../../services/api/endpoints/staff.endpoints";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { createPublicBookingThunk } from "../../../middleware/onlineBooking/onlineBooking.thunk";

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

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_META: Record<string, { emoji: string; bg: string; text: string }> = {
  Hair:   { emoji: "✂️", bg: "#fef9c3", text: "#a16207" },
  Color:  { emoji: "🎨", bg: "#fce7f3", text: "#be185d" },
  Skin:   { emoji: "✨", bg: "#d1fae5", text: "#065f46" },
  Brows:  { emoji: "👁️", bg: "#ede9fe", text: "#6d28d9" },
  Nails:  { emoji: "💅", bg: "#fef3c7", text: "#b45309" },
  Men:    { emoji: "🧔", bg: "#dbeafe", text: "#1d4ed8" },
  Waxing: { emoji: "🌸", bg: "#fee2e2", text: "#b91c1c" },
  Massage:{ emoji: "💆", bg: "#ccfbf1", text: "#0f766e" },
};
const catMeta = (cat?: string) =>
  CAT_META[cat ?? ""] ?? { emoji: "✂️", bg: "#f5f3ff", text: "#7c3aed" };

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalonData {
  name: string; tagline?: string; description?: string;
  phone?: string; address?: string;
}
interface ServiceItem {
  id: number; name: string; duration: number;
  price: number | string; category_name?: string; description?: string;
}
interface StaffMember {
  id: number; first_name?: string; last_name?: string; name?: string;
  job_title?: string; role?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const staffName = (s: StaffMember) =>
  s.name || `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Staff";

const initials = (n: string) =>
  n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const fmtDur = (m: number) => {
  if (!m) return "";
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
};

const fmtPrice = (p: number | string) => {
  const n = typeof p === "string" ? parseFloat(p) : p;
  return isNaN(n) ? "—" : `$${n.toFixed(2)}`;
};

const DAYS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });
}

function buildSlots(date: Date) {
  const all: string[] = [];
  for (let h = 9; h < 18; h++)
    for (const m of [0, 30]) {
      const h12 = h > 12 ? h - 12 : h || 12;
      all.push(`${h12}:${m ? "30" : "00"} ${h >= 12 ? "PM" : "AM"}`);
    }
  const seed = date.getDate() + date.getMonth();
  return {
    morning:   all.slice(0, 6).filter((_, i) => (i * 3 + seed) % 5 !== 0),
    afternoon: all.slice(6).filter((_, i) => (i * 2 + seed) % 4 !== 0),
  };
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  accent:  "#111827",
  light:   "#f9fafb",
  med:     "#f3f4f6",
  border:  "#e5e7eb",
  dark:    "#010102",
  text:    "#111827",
  muted:   "#6b7280",
  white:   "#ffffff",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean; onClose: () => void;
  previewName?: string; previewTagline?: string; previewDescription?: string;
  galleryPhotos?: string[];
}

export default function BookingPreviewModal({ open, onClose, previewName, previewTagline, previewDescription, galleryPhotos }: Props) {
  const dispatch = useAppDispatch();
  const [loading,  setLoading]  = useState(true);
  const [salon,    setSalon]    = useState<SalonData>({ name: previewName || "My Salon" });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staffList,setStaffList]= useState<StaffMember[]>([]);

  const [step,            setStep]           = useState<1|2|3|4>(1);
  const [activeCat,       setActiveCat]      = useState("All");
  const [search,          setSearch]         = useState("");
  const [selService,      setSelService]     = useState<ServiceItem | null>(null);
  const [selStaff,        setSelStaff]       = useState<StaffMember | "any" | null>(null);
  const [selDate,         setSelDate]        = useState<Date>(new Date());
  const [selTime,         setSelTime]        = useState<string | null>(null);
  const [form,            setForm]           = useState({ name:"", email:"", phone:"", notes:"" });
  const [submitting,      setSubmitting]     = useState(false);

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

  useEffect(() => {
    if (!open) return;
    setStep(1); setActiveCat("All"); setSearch(""); setSelService(null);
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
              selService={selService}
              selStaff={selStaff}
              selDate={selDate}
              selTime={selTime}
              form={form}
              onReset={() => {
                setStep(1); setSelService(null); setSelStaff(null);
                setSelTime(null); setForm({ name:"", email:"", phone:"", notes:"" });
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
                          onPick={() => { setSelService(svc); setStep(2); }}/>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: Stylist + Date + Time ────────────────────── */}
              {step === 2 && (
                <>
                  <BackBtn label="Back to Services" onClick={() => setStep(1)}/>
                  <ServicePill svc={selService!}/>

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
                            {selService?.name}
                          </p>
                          <p style={{ margin:0, fontSize:12.5, opacity:0.85 }}>
                            {fmtDur(selService?.duration ?? 0)} · {fmtPrice(selService?.price ?? 0)}
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
                            {fmtPrice(selService?.price ?? 0)}
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
                              service_id: String(selService?.id),
                              staff_id: selStaff === "any" ? undefined : String((selStaff as StaffMember)?.id),
                              scheduled_at: new Date(`${selDate.toDateString()} ${selTime}`).toISOString(),
                              client_name: form.name,
                              client_email: form.email,
                              client_phone: form.phone,
                              notes: form.notes
                            };
                            await dispatch(createPublicBookingThunk(payload)).unwrap();
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

// ─── Small reusable pieces ────────────────────────────────────────────────────


function AvatarCircle({ name, size = 44, bg }: { name: string; size?: number; bg: string }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:800, fontSize:size * 0.34, flexShrink:0, letterSpacing:"0.02em",
      boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>
      {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  const steps = ["Service", "Stylist & Time", "Confirm"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
      {steps.map((label, i) => {
        const n = i + 1, done = step > n, active = step === n;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", flex: i < 2 ? 1 : 0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <div style={{ width:30, height:30, borderRadius:"50%",
                background: done || active ? C.accent : "#e5e7eb",
                color: done || active ? C.white : "#9ca3af",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:800, transition:"background 0.2s",
                boxShadow: active ? `0 4px 12px ${C.accent}50` : "none" }}>
                {done ? <CheckCircleFill size={14}/> : n}
              </div>
              <span style={{ fontSize:11, color: active ? C.accent : "#9ca3af",
                fontWeight: active ? 700 : 400, whiteSpace:"nowrap" }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex:1, height:2.5, borderRadius:2,
                background: step > i + 1 ? C.accent : "#e5e7eb",
                margin:"0 8px", marginBottom:18, transition:"background 0.3s" }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <h3 style={{ fontSize:19, fontWeight:800, color:C.text, margin:"0 0 3px" }}>{title}</h3>
      <p style={{ fontSize:13, color:C.muted, margin:0 }}>{sub}</p>
    </div>
  );
}

function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ background:"none", border:"none", cursor:"pointer", color:C.accent,
        fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:5,
        marginBottom:24, padding:0 }}>
      <ChevronLeft size={14}/> {label}
    </button>
  );
}

function ServicePill({ svc }: { svc: ServiceItem }) {
  const m = catMeta(svc.category_name);
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      background:C.light, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"11px 16px", marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div>
          <span style={{ fontWeight:700, color:C.accent, fontSize:14 }}>{svc.name}</span>
          <span style={{ color:`${C.accent}80`, fontSize:12.5, marginLeft:8 }}>
            {fmtDur(svc.duration)}
          </span>
        </div>
      </div>
      <span style={{ fontWeight:800, color:C.accent, fontSize:15 }}>{fmtPrice(svc.price)}</span>
    </div>
  );
}

function ServiceCard({ svc, popular, onPick }: { svc: ServiceItem; popular?: boolean; onPick: () => void }) {
  const [hov, setHov] = useState(false);
  const m = catMeta(svc.category_name);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onPick}
      style={{ background:C.white, border:`1.5px solid ${hov ? C.accent : "#e5e7eb"}`,
        borderRadius:18, padding:"18px 20px", cursor:"pointer", transition:"all 0.18s",
        boxShadow: hov ? `0 8px 28px ${C.accent}18` : "0 1px 4px rgba(0,0,0,0.04)",
        position:"relative", overflow:"hidden" }}>
      {popular && (
        <div style={{ position:"absolute", top:12, right:12,
          background:`linear-gradient(135deg,${C.dark},#374151)`,
          color:C.white, fontSize:9.5, fontWeight:800, padding:"3px 9px",
          borderRadius:999, letterSpacing:"0.05em" }}>
          ★ POPULAR
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:"0 0 3px", fontWeight:700, fontSize:14, color:C.text,
            lineHeight:1.2, paddingRight:popular ? 72 : 0 }}>
            {svc.name}
          </p>
          {svc.category_name && (
            <span style={{ display:"inline-block", fontSize:10.5, background:m.bg,
              color:m.text, borderRadius:6, padding:"2px 8px", fontWeight:700 }}>
              {svc.category_name}
            </span>
          )}
        </div>
      </div>
      {svc.description && (
        <p style={{ margin:"0 0 12px", fontSize:12.5, color:"#6b7280", lineHeight:1.55 }}>
          {svc.description.length > 75 ? svc.description.slice(0, 75) + "…" : svc.description}
        </p>
      )}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:17, fontWeight:900, color:C.accent }}>
            {fmtPrice(svc.price)}
          </span>
          {svc.duration > 0 && (
            <span style={{ fontSize:12, color:C.muted, fontWeight:500 }}>
              {fmtDur(svc.duration)}
            </span>
          )}
        </div>
        <span style={{ fontSize:12.5, fontWeight:700, color: hov ? C.accent : C.muted,
          display:"flex", alignItems:"center", gap:4, transition:"color 0.15s" }}>
          Book <ChevronRight size={12}/>
        </span>
      </div>
    </div>
  );
}

function StaffCard({ name, subtitle, initials: init, bg, selected, onClick }:
  { name:string; subtitle:string; initials:string; bg:string; selected:boolean; onClick:()=>void }) {
  return (
    <div onClick={onClick}
      style={{ background: selected ? C.light : C.white,
        border:`2px solid ${selected ? C.accent : "#e5e7eb"}`,
        borderRadius:16, padding:"16px 14px", cursor:"pointer", transition:"all 0.15s",
        textAlign:"center", boxShadow: selected ? `0 4px 16px ${C.accent}25` : "none" }}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
        <div style={{ width:52, height:52, borderRadius:"50%",
          background: selected ? C.accent : bg,
          color:C.white, display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:800, fontSize:18, boxShadow:`0 4px 12px rgba(0,0,0,0.15)`,
          transition:"background 0.15s" }}>
          {init}
        </div>
      </div>
      <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:700,
        color: selected ? C.accent : C.text }}>
        {name}
      </p>
      <p style={{ margin:0, fontSize:11, color:C.muted }}>{subtitle}</p>
      {selected && (
        <div style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:4,
          background:`${C.accent}15`, color:C.accent, fontSize:10.5,
          fontWeight:700, padding:"3px 10px", borderRadius:999 }}>
          <CheckCircleFill size={10}/> Selected
        </div>
      )}
    </div>
  );
}

function TimeChip({ t, sel, onPick }: { t:string; sel:string|null; onPick:(t:string)=>void }) {
  const act = t === sel;
  return (
    <button onClick={() => onPick(t)}
      style={{ background: act ? C.accent : C.white,
        border:`1.5px solid ${act ? C.accent : "#e5e7eb"}`,
        borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:600,
        color: act ? C.white : C.text, cursor:"pointer", transition:"all 0.15s",
        boxShadow: act ? `0 4px 12px ${C.accent}35` : "none" }}>
      {t}
    </button>
  );
}

function SuccessScreen({ salonName, selService, selStaff, selDate, selTime, form, onReset }:
  { salonName:string; selService:ServiceItem|null; selStaff:StaffMember|"any"|null;
    selDate:Date; selTime:string|null; form:{name:string;email:string};
    onReset:()=>void }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100%", padding:"40px 24px" }}>
      <div style={{ maxWidth:520, width:"100%", textAlign:"center",
        background:C.white, borderRadius:24, padding:"48px 36px",
        boxShadow:`0 12px 48px ${C.accent}18`, border:`1px solid ${C.border}` }}>

        {/* Check icon with ring animation */}
        <div style={{ position:"relative", width:88, height:88, margin:"0 auto 24px" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%",
            border:`3px solid ${C.border}`, animation:"ring 1s ease-out forwards" }}/>
          <div style={{ width:88, height:88, borderRadius:"50%",
            background:`linear-gradient(135deg,${C.dark},#374151)`,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CheckCircleFill size={40} color={C.white}/>
          </div>
        </div>

        <h2 style={{ margin:"0 0 8px", fontSize:26, fontWeight:900, color:C.text }}>
          You're all set! 🎉
        </h2>
        <p style={{ color:C.muted, fontSize:14, margin:"0 0 28px", lineHeight:1.6 }}>
          Appointment at <strong style={{ color:C.text }}>{salonName}</strong> is confirmed.
          A receipt has been sent to <strong style={{ color:C.text }}>{form.email || "your email"}</strong>.
        </p>

        {/* Summary card */}
        <div style={{ background:C.light, borderRadius:16,
          padding:"20px 24px", textAlign:"left", marginBottom:28,
          border:`1.5px solid ${C.border}` }}>
          {[
            { label:"Service", val: selService?.name ?? "" },
            { label:"Stylist",
              val: selStaff === "any" ? "Any available" : selStaff ? staffName(selStaff as StaffMember) : "" },
            { label:"Date",
              val: `${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}` },
            { label:"Time",  val: selTime ?? "" },
            { label:"Total", val: fmtPrice(selService?.price ?? 0) },
          ].map(({ label, val }) => (
            <div key={label} style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", padding:"9px 0",
              borderBottom:`1px solid ${C.med}` }}>
              <span style={{ fontSize:12, color:C.muted, fontWeight:600,
                textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{val}</span>
            </div>
          ))}
        </div>

        <button onClick={onReset}
          style={{ background:C.accent, color:C.white, border:"none",
            borderRadius:12, padding:"13px 28px", fontSize:14, fontWeight:700,
            cursor:"pointer", width:"100%",
            boxShadow:`0 4px 18px ${C.accent}40` }}>
          Book Another Appointment
        </button>

        <style>{`
          @keyframes ring {
            0%   { transform: scale(0.85); opacity:0 }
            100% { transform: scale(1.15); opacity:0 }
          }
        `}</style>
      </div>
    </div>
  );
}
