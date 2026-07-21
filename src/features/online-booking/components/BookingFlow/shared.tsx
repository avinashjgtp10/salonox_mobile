import { useState } from "react";
import {
  CheckCircleFill, ChevronRight, ChevronLeft,
  CalendarPlus, HouseDoorFill, StarFill, PencilSquare,
  Scissors, Palette2, Droplet, Eye, Gem, PersonFill, Flower1, HeartPulse,
} from "react-bootstrap-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalonData {
  id?: number | string;
  name: string; tagline?: string; description?: string;
  phone?: string; address?: string;
}
export interface ServiceItem {
  id: number | string; name: string; duration: number;
  price: number | string; category_name?: string; description?: string;
}
export interface StaffMember {
  id: number | string; first_name?: string; last_name?: string; name?: string;
  job_title?: string; role?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const staffName = (s: StaffMember) =>
  s.name || `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Staff";

export const initials = (n: string) =>
  n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

export const fmtDur = (m: number) => {
  if (!m) return "";
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
};

export const fmtPrice = (p: number | string) => {
  const n = typeof p === "string" ? parseFloat(p) : p;
  return isNaN(n) ? "—" : n.toFixed(2);
};

export const DAYS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });
}

export function buildSlots(date: Date) {
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

export const CAT_META: Record<string, { icon: typeof Scissors; bg: string; text: string }> = {
  Hair:   { icon: Scissors,   bg: "#fef9c3", text: "#a16207" },
  Color:  { icon: Palette2,   bg: "#fce7f3", text: "#be185d" },
  Skin:   { icon: Droplet,    bg: "#d1fae5", text: "#065f46" },
  Brows:  { icon: Eye,        bg: "#ede9fe", text: "#6d28d9" },
  Nails:  { icon: Gem,        bg: "#fef3c7", text: "#b45309" },
  Men:    { icon: PersonFill, bg: "#dbeafe", text: "#1d4ed8" },
  Waxing: { icon: Flower1,    bg: "#fee2e2", text: "#b91c1c" },
  Massage:{ icon: HeartPulse, bg: "#ccfbf1", text: "#0f766e" },
};
export const catMeta = (cat?: string) =>
  CAT_META[cat ?? ""] ?? { icon: Scissors, bg: "#f5f3ff", text: "#7c3aed" };

// ─── Palette ──────────────────────────────────────────────────────────────────
// Premium white / lavender / purple palette

export const C = {
  accent:     "#7c3aed",   // violet-600
  accentDark: "#5b21b6",   // violet-800
  light:      "#faf8ff",
  lavender:   "#f3effe",
  med:        "#ede9fe",   // violet-100
  border:     "#e6e0f7",
  dark:       "#2e1065",   // deep violet, used for dark gradient surfaces
  text:       "#1f1b2e",
  muted:      "#6b7280",
  white:      "#ffffff",
};

export const GRADIENT = `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`;

// ─── Small reusable pieces ────────────────────────────────────────────────────

export function AvatarCircle({ name, size = 44, bg }: { name: string; size?: number; bg: string }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:800, fontSize:size * 0.34, flexShrink:0, letterSpacing:"0.02em",
      boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>
      {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

export function StepBar({ step }: { step: number }) {
  const steps = ["Service", "Stylist & Time", "Review & Confirm"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:36,
      background:C.white, borderRadius:18, padding:"18px 22px",
      border:`1px solid ${C.border}`, boxShadow:"0 2px 14px rgba(124,58,237,0.06)" }}>
      {steps.map((label, i) => {
        const n = i + 1, done = step > n, active = step === n;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ width:32, height:32, borderRadius:"50%",
                background: done || active ? GRADIENT : C.med,
                color: done || active ? C.white : "#a89fc2",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12.5, fontWeight:800, transition:"all 0.25s",
                boxShadow: active ? `0 4px 14px ${C.accent}55` : "none" }}>
                {done ? <CheckCircleFill size={15}/> : n}
              </div>
              <span style={{ fontSize:11, color: active ? C.accent : done ? C.text : "#a89fc2",
                fontWeight: active || done ? 700 : 500, whiteSpace:"nowrap" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex:1, height:3, borderRadius:2, background:C.med,
                margin:"0 10px", marginBottom:20, overflow:"hidden" }}>
                <div style={{ height:"100%", width: step > i + 1 ? "100%" : "0%",
                  background:GRADIENT, borderRadius:2, transition:"width 0.35s ease" }}/>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <h3 style={{ fontSize:19, fontWeight:800, color:C.text, margin:"0 0 3px" }}>{title}</h3>
      <p style={{ fontSize:13, color:C.muted, margin:0 }}>{sub}</p>
    </div>
  );
}

export function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ background:"none", border:"none", cursor:"pointer", color:C.accent,
        fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:5,
        marginBottom:24, padding:0 }}>
      <ChevronLeft size={14}/> {label}
    </button>
  );
}

export function ServicesSummary({ services }: { services: ServiceItem[] }) {
  const totalDuration = services.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  const totalPrice = services.reduce((sum, s) => sum + (typeof s.price === "string" ? parseFloat(s.price) || 0 : s.price), 0);
  return (
    <div style={{ background:C.light, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"6px 16px", marginBottom:28 }}>
      {services.map((svc) => (
        <div key={svc.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"9px 0", borderBottom:`1px solid ${C.med}` }}>
          <div>
            <span style={{ fontWeight:700, color:C.accent, fontSize:14 }}>{svc.name}</span>
            <span style={{ color:`${C.accent}80`, fontSize:12.5, marginLeft:8 }}>
              {fmtDur(svc.duration)}
            </span>
          </div>
          <span style={{ fontWeight:800, color:C.accent, fontSize:15 }}>{fmtPrice(svc.price)}</span>
        </div>
      ))}
      {services.length > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0" }}>
          <span style={{ fontWeight:700, color:C.text, fontSize:13 }}>
            Total ({services.length} services) · {fmtDur(totalDuration)}
          </span>
          <span style={{ fontWeight:800, color:C.text, fontSize:15 }}>{fmtPrice(totalPrice)}</span>
        </div>
      )}
    </div>
  );
}

// Kept for any remaining single-service call sites.
export function ServicePill({ svc }: { svc: ServiceItem }) {
  return <ServicesSummary services={[svc]} />;
}

export function ServiceCard({ svc, popular, selected, onPick }:
  { svc: ServiceItem; popular?: boolean; selected?: boolean; onPick: () => void }) {
  const [hov, setHov] = useState(false);
  const m = catMeta(svc.category_name);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onPick}
      style={{ background: selected ? `${C.accent}0d` : C.white,
        border:`1.5px solid ${selected ? C.accent : hov ? C.accent : C.border}`,
        borderRadius:22, cursor:"pointer", transition:"all 0.25s cubic-bezier(.4,0,.2,1)",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: selected ? `0 4px 18px ${C.accent}30` : hov ? `0 18px 36px ${C.accent}22` : "0 2px 10px rgba(46,16,101,0.05)",
        position:"relative", overflow:"hidden" }}>

      {/* Icon header */}
      <div style={{ height:100, position:"relative",
        background:`linear-gradient(135deg, ${m.bg}, ${C.light})`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ display:"inline-flex",
          transition:"transform 0.25s", transform: hov ? "scale(1.12)" : "scale(1)" }}>
          <m.icon size={30} color={m.text} />
        </div>
        {selected ? (
          <div style={{ position:"absolute", top:10, right:10, display:"flex", alignItems:"center", gap:4,
            background:GRADIENT, color:C.white, fontSize:9.5, fontWeight:800,
            padding:"3px 9px", borderRadius:999, letterSpacing:"0.05em",
            boxShadow:`0 4px 12px ${C.accent}55` }}>
            <CheckCircleFill size={9} /> SELECTED
          </div>
        ) : popular && (
          <div style={{ position:"absolute", top:10, right:10, display:"flex", alignItems:"center", gap:4,
            background:GRADIENT, color:C.white, fontSize:9.5, fontWeight:800,
            padding:"3px 9px", borderRadius:999, letterSpacing:"0.05em",
            boxShadow:`0 4px 12px ${C.accent}55` }}>
            <StarFill size={9} /> POPULAR
          </div>
        )}
        {svc.category_name && (
          <span style={{ position:"absolute", bottom:10, left:12, fontSize:10.5,
            background:"rgba(255,255,255,0.92)", color:m.text, borderRadius:7,
            padding:"3px 9px", fontWeight:700 }}>
            {svc.category_name}
          </span>
        )}
      </div>

      <div style={{ padding:"16px 18px 18px" }}>
        <p style={{ margin:"0 0 6px", fontWeight:700, fontSize:14.5, color:C.text, lineHeight:1.25 }}>
          {svc.name}
        </p>
        {svc.description && (
          svc.description.length <= 20 && !svc.description.includes(" ", 12) ? (
            // Short one/two-word descriptions in this data are typically a gender
            // tag ("Female", "Unisex") rather than real prose — render as a subtle pill.
            <span style={{ display:"inline-block", margin:"0 0 10px", fontSize:10.5, fontWeight:700,
              color:C.muted, background:C.light, border:`1px solid ${C.border}`,
              borderRadius:999, padding:"2px 9px" }}>
              {svc.description}
            </span>
          ) : (
            <p style={{ margin:"0 0 12px", fontSize:12.5, color:C.muted, lineHeight:1.55 }}>
              {svc.description.length > 75 ? svc.description.slice(0, 75) + "…" : svc.description}
            </p>
          )
        )}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:17, fontWeight:900, color:C.accent }}>
            {fmtPrice(svc.price)}
          </span>
          {svc.duration > 0 && (
            <span style={{ fontSize:12, color:C.muted, fontWeight:500 }}>
              {fmtDur(svc.duration)}
            </span>
          )}
        </div>
        <button style={{ marginTop:14, width:"100%", padding:"9px", borderRadius:12,
          border:"none", cursor:"pointer", fontWeight:700, fontSize:12.5,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          background: selected ? GRADIENT : hov ? C.accent : C.med,
          color: selected || hov ? C.white : C.accent,
          transition:"all 0.2s" }}>
          {selected ? <><CheckCircleFill size={13}/> Added</> : <>Add Service <ChevronRight size={13}/></>}
        </button>
      </div>
    </div>
  );
}

export function StaffCard({ name, subtitle, initials: init, bg, selected, onClick }:
  { name:string; subtitle:string; initials:string; bg:string; selected:boolean; onClick:()=>void }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: selected ? C.light : C.white,
        border:`2px solid ${selected ? C.accent : hover ? `${C.accent}70` : C.border}`,
        borderRadius:20, padding:"20px 16px", cursor:"pointer", transition:"all 0.2s ease",
        textAlign:"center", transform: hover && !selected ? "translateY(-3px)" : "none",
        boxShadow: selected ? `0 8px 22px ${C.accent}30`
          : hover ? "0 10px 24px rgba(46,16,101,0.14)" : "0 1px 4px rgba(46,16,101,0.05)" }}>
      <div style={{ position:"relative", width:68, margin:"0 auto 12px" }}>
        <div style={{ width:68, height:68, borderRadius:"50%",
          background: selected ? C.accent : bg,
          color:C.white, display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:800, fontSize:22, border:`3px solid ${C.white}`,
          boxShadow: selected ? `0 6px 16px ${C.accent}45` : "0 4px 14px rgba(0,0,0,0.16)",
          transition:"all 0.2s ease" }}>
          {init}
        </div>
        {selected && (
          <div style={{ position:"absolute", bottom:-2, right:-2, width:22, height:22,
            borderRadius:"50%", background:C.accent, border:`2px solid ${C.white}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 2px 6px ${C.accent}50` }}>
            <CheckCircleFill size={11} color={C.white} />
          </div>
        )}
      </div>
      <p style={{ margin:"0 0 3px", fontSize:14, fontWeight:700,
        color: selected ? C.accent : C.text }}>
        {name}
      </p>
      <p style={{ margin:0, fontSize:11.5, color:C.muted }}>{subtitle}</p>
      {selected && (
        <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:4,
          background:`${C.accent}15`, color:C.accent, fontSize:10.5,
          fontWeight:700, padding:"3px 10px", borderRadius:999 }}>
          <CheckCircleFill size={10}/> Selected
        </div>
      )}
    </div>
  );
}

export function TimeChip({ t, sel, onPick }: { t:string; sel:string|null; onPick:(t:string)=>void }) {
  const act = t === sel;
  return (
    <button onClick={() => onPick(t)}
      style={{ background: act ? GRADIENT : C.white,
        border:`1.5px solid ${act ? C.accent : C.border}`,
        borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:600,
        color: act ? C.white : C.text, cursor:"pointer", transition:"all 0.15s",
        boxShadow: act ? `0 4px 12px ${C.accent}35` : "none" }}>
      {t}
    </button>
  );
}

export function SuccessScreen({ salonName, selServices, selStaff, selDate, selTime, form, onReset, onBackHome, onAddToCalendar, onManage }:
  { salonName:string; selServices:ServiceItem[]; selStaff:StaffMember|"any"|null;
    selDate:Date; selTime:string|null; form:{name:string;email:string};
    onReset:()=>void; onBackHome:()=>void; onAddToCalendar:()=>void; onManage?:()=>void }) {

  const staffLabel = selStaff === "any" ? "Any available" : selStaff ? staffName(selStaff as StaffMember) : "";
  const dateLabel = `${DAYS[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}`;
  const serviceLabel = selServices.map((s) => s.name).join(", ");
  const totalLabel = fmtPrice(
    selServices.reduce((sum, s) => sum + (typeof s.price === "string" ? parseFloat(s.price) || 0 : s.price), 0)
  );

  return (
    <div className="pb-success-wrap">
      <div className="pb-success-card">

        {/* Check icon with ring animation */}
        <div style={{ position:"relative", width:88, height:88, margin:"0 auto 24px" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%",
            border:`3px solid ${C.border}`, animation:"ring 1s ease-out forwards" }}/>
          <div style={{ width:88, height:88, borderRadius:"50%",
            background:GRADIENT,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CheckCircleFill size={40} color={C.white}/>
          </div>
        </div>

        <h2 style={{ margin:"0 0 8px", fontSize:26, fontWeight:900, color:C.text }}>
          You're all set!
        </h2>
        <p style={{ color:C.muted, fontSize:14, margin:"0 0 20px", lineHeight:1.6 }}>
          Appointment at <strong style={{ color:C.text }}>{salonName}</strong> is confirmed.
          A receipt has been sent to <strong style={{ color:C.text }}>{form.email || "your email"}</strong>.
        </p>

        {/* Summary card */}
        <div style={{ background:C.light, borderRadius:16,
          padding:"20px 24px", textAlign:"left", marginBottom:18,
          border:`1.5px solid ${C.border}` }}>
          {[
            { label: selServices.length > 1 ? "Services" : "Service", val: serviceLabel },
            { label:"Stylist", val: staffLabel },
            { label:"Date", val: dateLabel },
            { label:"Time",  val: selTime ?? "" },
            { label:"Total", val: totalLabel },
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

        {/* Success notes */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, textAlign:"left",
          background:`${C.accent}0d`, border:`1px solid ${C.accent}25`, borderRadius:12,
          padding:"12px 16px", marginBottom:24, fontSize:12.5, color:C.text, fontWeight:600 }}>
          <span style={{ display:"flex", alignItems:"center", gap:7 }}>
            <CheckCircleFill size={12} color={C.accent} /> Confirmation email sent.
          </span>
          <span style={{ display:"flex", alignItems:"center", gap:7 }}>
            <CalendarPlus size={12} color={C.accent} /> Appointment added to salon calendar.
          </span>
        </div>

        {/* Actions */}
        <div className="pb-success-actions">
          <button className="pb-success-btn pb-success-btn--primary" onClick={onReset}>
            Book Another Appointment
          </button>
          <button className="pb-success-btn pb-success-btn--outline" onClick={onBackHome}>
            <HouseDoorFill size={14}/> Back to Home
          </button>
          <button className="pb-success-btn pb-success-btn--ghost" onClick={onAddToCalendar}>
            <CalendarPlus size={14}/> Add to Calendar
          </button>
          {onManage && (
            <button className="pb-success-btn pb-success-btn--outline" onClick={onManage}>
              <PencilSquare size={14}/> Cancel or Reschedule
            </button>
          )}
        </div>

        <style>{`
          @keyframes ring {
            0%   { transform: scale(0.85); opacity:0 }
            100% { transform: scale(1.15); opacity:0 }
          }
          @keyframes pbSuccessFadeIn {
            from { opacity:0; transform:translateY(14px) }
            to   { opacity:1; transform:none }
          }
          .pb-success-wrap {
            display:flex; align-items:center; justify-content:center;
            min-height:100%; padding:40px 24px;
          }
          .pb-success-card {
            max-width:520px; width:100%; text-align:center;
            background:${C.white}; border-radius:24px; padding:48px 36px;
            box-shadow:0 12px 48px ${C.accent}18; border:1px solid ${C.border};
            animation: pbSuccessFadeIn 0.5s cubic-bezier(.4,0,.2,1);
          }
          .pb-success-actions { display:flex; flex-direction:column; gap:10px; }
          .pb-success-btn {
            border:none; cursor:pointer; font-weight:700; font-size:13.5px;
            border-radius:12px; padding:13px 20px; width:100%;
            display:flex; align-items:center; justify-content:center; gap:7px;
            transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
          }
          .pb-success-btn:hover { transform: translateY(-2px); }
          .pb-success-btn--primary {
            background:${C.accent}; color:${C.white};
            box-shadow:0 4px 18px ${C.accent}40;
          }
          .pb-success-btn--primary:hover { box-shadow:0 8px 26px ${C.accent}55; }
          .pb-success-btn--outline {
            background:${C.white}; color:${C.accent}; border:1.5px solid ${C.border};
          }
          .pb-success-btn--outline:hover { border-color:${C.accent}; background:${C.light}; }
          .pb-success-btn--ghost {
            background:${C.med}; color:${C.accent}; font-size:12.5px; padding:11px 14px;
          }
          .pb-success-btn--ghost:hover { background:${C.accent}22; }
          @media (max-width: 480px) {
            .pb-success-card { padding:32px 20px; border-radius:18px; }
          }
        `}</style>
      </div>
    </div>
  );
}
