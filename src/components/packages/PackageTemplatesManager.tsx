import React, { useState, useCallback, useEffect, useRef } from "react";
import { Plus, Trash, PencilSquare, CheckLg, X, TagFill, ClockFill, CreditCard2Front, Calendar3, ChevronLeft, ChevronRight } from "react-bootstrap-icons";
import { Loader2, Search, Sparkles, Package } from "lucide-react";
import styles from "./packages.module.scss";
import "../../features/analytics/styles/MembershipsPage.scss";
import {
  useListPackageTemplatesQuery,
  useCreatePackageTemplateMutation,
  useUpdatePackageTemplateMutation,
  useDeletePackageTemplateMutation,
} from "../../services/api/endpoints/packages.endpoints";
import type {
  PackageTemplate,
  CreatePackageTemplateDTO,
} from "../../services/api/endpoints/packages.endpoints";
import { useServices } from "../../features/catalog/hooks/useServices";
import type { Service } from "../../features/catalog/types/catalog.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SvcRow {
  id:            number;
  serviceName:   string;
  totalSessions: string;
  price:         string;
}

interface FormState {
  name:           string;
  neverExpires:   boolean;
  expiryDate:     string;   // YYYY-MM-DD; converted to months on save
  basePrice:      string;
  gstPercentage:  string;
  discount:       string;
  paymentMethod:  string;
  services:       SvcRow[];
}

const PAYMENT_METHODS = ["cash", "card", "upi", "net_banking", "other"];

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
];

function emptyForm(): FormState {
  return {
    name: "", neverExpires: true, expiryDate: "",
    basePrice: "", gstPercentage: "0", discount: "0",
    paymentMethod: "cash",
    services: [{ id: Date.now(), serviceName: "", totalSessions: "1", price: "" }],
  };
}

function monthsToDate(months: number | null): string {
  if (!months) return "";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

function dateToMonths(dateStr: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  const exp   = new Date(dateStr + "T12:00:00");
  const m = (exp.getFullYear() - today.getFullYear()) * 12 + (exp.getMonth() - today.getMonth());
  return Math.max(1, m);
}

function templateToForm(t: PackageTemplate): FormState {
  return {
    name:          t.name,
    neverExpires:  t.neverExpires,
    expiryDate:    t.neverExpires ? "" : monthsToDate(t.expiryMonths),
    basePrice:     String(t.basePrice),
    gstPercentage: String(t.gstPercentage),
    discount:      String(t.discount),
    paymentMethod: t.paymentMethod,
    services:      t.services.map((s, i) => ({
      id:            i,
      serviceName:   s.serviceName,
      totalSessions: String(s.totalSessions),
      price:         String(s.price),
    })),
  };
}

// ─── Service search dropdown ──────────────────────────────────────────────────

interface ServiceSearchProps {
  value:    string;
  options:  Service[];
  loading:  boolean;
  disabled: boolean;
  onChange: (svc: Service) => void;
  onSearch: (q: string) => void;
}

function ServiceSearchInput({ value, options, loading, disabled, onChange, onSearch }: ServiceSearchProps) {
  const [query, setQuery] = useState(value);
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const filtered = options.filter(o =>
    String(o.name).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
        <input
          className="pkg-sold-panel__edit-input"
          style={{ paddingLeft: 28 }}
          value={query}
          placeholder={loading ? "Loading services…" : "Search service…"}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && !disabled && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 9999,
          maxHeight: 200, overflowY: "auto",
        }}>
          {loading && <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>No services found</div>
          )}
          {filtered.map(svc => {
            const name  = String(svc.name);
            const price = parseFloat(String(svc.price)) || 0;
            const isSelected = name === value;
            return (
              <div
                key={String(svc.id)}
                onMouseDown={() => { onChange(svc); setQuery(name); setOpen(false); }}
                style={{
                  padding: "9px 12px", fontSize: 13, cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: isSelected ? "#f5f3ff" : undefined,
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = isSelected ? "#f5f3ff" : ""; }}
              >
                <span style={{ color: isSelected ? "#7c3aed" : "#111827", fontWeight: isSelected ? 600 : 400 }}>{name}</span>
                {price > 0 && <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>₹{price}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function MiniCalendar({ value, onChange, disabled }: { value: string; onChange: (d: string) => void; disabled: boolean }) {
  const todayRef = useRef(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const today    = todayRef.current();

  const parsed = value ? new Date(value + "T12:00:00") : null;
  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(() => parsed?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsed?.getMonth()     ?? today.getMonth());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const toISO = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const displayVal = parsed
    ? parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Select date…";

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", border: `1px solid ${open ? "#7c3aed" : "#d1d5db"}`,
          borderRadius: 8, background: "#fff", color: parsed ? "#111827" : "#9ca3af",
          fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit", minWidth: 180, transition: "border-color .15s",
          boxShadow: open ? "0 0 0 3px rgba(124,58,237,.1)" : "none",
        }}
      >
        <Calendar3 size={14} style={{ color: "#7c3aed", flexShrink: 0 }} />
        {displayVal}
      </button>

      {open && !disabled && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,.14)", padding: "14px 12px", minWidth: 248,
        }}>
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={prevMonth} style={{ border: "none", background: "#f5f3ff", color: "#7c3aed", borderRadius: 6, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ border: "none", background: "#f5f3ff", color: "#7c3aed", borderRadius: 6, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9ca3af", paddingBottom: 4 }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const iso      = toISO(day);
              const cellDate = new Date(viewYear, viewMonth, day); cellDate.setHours(0,0,0,0);
              const isPast   = cellDate < today;
              const isSel    = iso === value;
              const isToday  = cellDate.getTime() === today.getTime();
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  style={{
                    border: "none", padding: "5px 0", fontSize: 12, textAlign: "center",
                    cursor: isPast ? "not-allowed" : "pointer", borderRadius: 6,
                    background: isSel ? "#7c3aed" : isToday ? "#f5f3ff" : "transparent",
                    color: isSel ? "#fff" : isPast ? "#d1d5db" : isToday ? "#7c3aed" : "#374151",
                    fontWeight: isSel || isToday ? 700 : 400,
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => { if (!isSel && !isPast) (e.currentTarget as HTMLButtonElement).style.background = "#f5f3ff"; }}
                  onMouseLeave={e => { if (!isSel && !isPast) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              style={{ marginTop: 10, width: "100%", border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 0", fontSize: 12, color: "#6b7280", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Template Form Modal ──────────────────────────────────────────────────────

interface FormPanelProps {
  form:            FormState;
  saving:          boolean;
  error:           string | null;
  isEdit:          boolean;
  catalogServices: Service[];
  servicesLoading: boolean;
  onChange:        (patch: Partial<FormState>) => void;
  onSave:          () => void;
  onClose:         () => void;
  onSearch:        (q: string) => void;
}

function FormPanel({ form, saving, error, isEdit, catalogServices, servicesLoading, onChange, onSave, onClose, onSearch }: FormPanelProps) {
  const servicesTotal = form.services.reduce((s, r) => s + (parseFloat(r.price) || 0), 0);
  const base   = parseFloat(form.basePrice)     || servicesTotal;
  const gst    = parseFloat(form.gstPercentage) || 0;
  const disc   = parseFloat(form.discount)      || 0;
  const gstAmt = (base - disc) * gst / 100;
  const total  = base - disc + gstAmt;

  const addService = () =>
    onChange({ services: [...form.services, { id: Date.now(), serviceName: "", totalSessions: "1", price: "" }] });

  const removeService = (id: number) =>
    onChange({ services: form.services.filter(s => s.id !== id) });

  const updateService = (id: number, patch: Partial<SvcRow>) =>
    onChange({ services: form.services.map(s => s.id === id ? { ...s, ...patch } : s) });

  const pickService = (rowId: number, svc: Service) => {
    updateService(rowId, {
      serviceName: String(svc.name),
      price: svc.price != null ? String(parseFloat(String(svc.price)) || 0) : "",
    });
  };

  return (
    <div
      className="pkg-tmpl-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pkg-tmpl-modal" onClick={e => e.stopPropagation()}>
        <div className="pkg-tmpl-modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div className="pkg-tmpl-modal__title">
              {isEdit ? "Edit Template" : "New Package Template"}
            </div>
          </div>
          <div className="pkg-tmpl-modal__actions">
            <button
              className="pkg-sold-panel__btn pkg-sold-panel__btn--save"
              onClick={onSave}
              disabled={saving || !form.name.trim() || form.services.every(s => !s.serviceName.trim())}
            >
              {saving ? <Loader2 size={12} style={{ animation: "spin 0.6s linear infinite" }} /> : <CheckLg size={13} />}
              {saving ? "Saving…" : "Save Template"}
            </button>
            <button className="pkg-sold-panel__close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="pkg-tmpl-modal__body">
          <div className="pkg-sold-panel__edit-group">
            <label className="pkg-sold-panel__edit-label">Template Name *</label>
            <input
              className="pkg-sold-panel__edit-input"
              value={form.name}
              onChange={e => onChange({ name: e.target.value })}
              disabled={saving}
              placeholder="e.g. Glow Skin Package"
            />
          </div>

          <div className="pkg-sold-panel__edit-group">
            <label className="pkg-sold-panel__edit-label">Expiry Date</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={form.neverExpires}
                onChange={e => onChange({ neverExpires: e.target.checked, expiryDate: "" })}
                disabled={saving}
              />
              Never expires
            </label>
            {!form.neverExpires && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <MiniCalendar
                  value={form.expiryDate}
                  onChange={d => onChange({ expiryDate: d })}
                  disabled={saving}
                />
                {form.expiryDate && (
                  <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 500 }}>
                    ≈ {dateToMonths(form.expiryDate)} month{(dateToMonths(form.expiryDate) ?? 1) !== 1 ? "s" : ""} from today
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="pkg-sold-panel__edit-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="pkg-sold-panel__edit-label">Services *</label>
              <button
                onClick={addService}
                className={styles.btnSecondary}
                style={{ padding: "3px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                disabled={saving}
              >
                <Plus size={12} /> Add Service
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 30px", gap: 8, marginBottom: 4 }}>
              {["Service Name", "Sessions", "Price (₹)", ""].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const }}>{h}</span>
              ))}
            </div>
            {form.services.map(svc => (
              <div key={svc.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 30px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <ServiceSearchInput
                  value={svc.serviceName}
                  options={catalogServices}
                  loading={servicesLoading}
                  disabled={saving}
                  onChange={picked => pickService(svc.id, picked)}
                  onSearch={onSearch}
                />
                <input
                  type="number"
                  className="pkg-sold-panel__edit-input"
                  value={svc.totalSessions}
                  onChange={e => updateService(svc.id, { totalSessions: e.target.value })}
                  disabled={saving}
                  min={1}
                  style={{ textAlign: "center" }}
                />
                <input
                  type="number"
                  className="pkg-sold-panel__edit-input"
                  value={svc.price}
                  onChange={e => updateService(svc.id, { price: e.target.value })}
                  disabled={saving}
                  placeholder="0"
                  min={0}
                />
                <button onClick={() => removeService(svc.id)} className={styles.btnDanger} disabled={saving || form.services.length <= 1}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="pkg-sold-panel__edit-row">
            <div className="pkg-sold-panel__edit-group">
              <label className="pkg-sold-panel__edit-label">Base Price (₹)</label>
              <input
                type="number"
                className="pkg-sold-panel__edit-input"
                value={form.basePrice}
                onChange={e => onChange({ basePrice: e.target.value })}
                disabled={saving}
                placeholder={String(servicesTotal || "0")}
                min={0}
              />
              {!form.basePrice && servicesTotal > 0 && (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Auto: ₹{servicesTotal}</span>
              )}
            </div>
            <div className="pkg-sold-panel__edit-group">
              <label className="pkg-sold-panel__edit-label">GST (%)</label>
              <select className="pkg-sold-panel__edit-select" value={form.gstPercentage} onChange={e => onChange({ gstPercentage: e.target.value })} disabled={saving}>
                {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g === 0 ? "0% (Exempt)" : `${g}%`}</option>)}
              </select>
            </div>
          </div>

          <div className="pkg-sold-panel__edit-group" style={{ maxWidth: "50%" }}>
            <label className="pkg-sold-panel__edit-label">Discount (₹)</label>
            <input type="number" className="pkg-sold-panel__edit-input" value={form.discount} onChange={e => onChange({ discount: e.target.value })} disabled={saving} min={0} />
          </div>

          <div className="pkg-sold-panel__price-preview">
            Total: <strong>₹{total.toFixed(2)}</strong>
            {gstAmt > 0 && <span style={{ marginLeft: 10, opacity: 0.7, fontSize: 12 }}>incl. ₹{gstAmt.toFixed(2)} GST</span>}
            {disc > 0 && <span style={{ marginLeft: 10, color: "#16a34a", fontSize: 12 }}>-₹{disc} off</span>}
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: 13, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template:   PackageTemplate;
  index:      number;
  deleting:   boolean;
  onEdit:     () => void;
  onDelete:   () => void;
}

function TemplateCard({ template: t, index, deleting, onEdit, onDelete }: TemplateCardProps) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const gstAmt = (t.basePrice - t.discount) * t.gstPercentage / 100;
  const total  = t.basePrice - t.discount + gstAmt;
  const payLabel = t.paymentMethod.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      transition: "box-shadow .15s, transform .15s",
      display: "flex",
      flexDirection: "column",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      {/* Gradient header */}
      <div style={{ background: gradient, padding: "20px 20px 16px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.75)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
              Package Template
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{t.name}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>₹{total.toFixed(0)}</div>
            {t.discount > 0 && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)", marginTop: 2 }}>
                <span style={{ textDecoration: "line-through" }}>₹{t.basePrice}</span>
                <span style={{ marginLeft: 4, background: "rgba(255,255,255,.2)", borderRadius: 4, padding: "1px 5px" }}>-₹{t.discount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Meta pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 500 }}>
            <ClockFill size={10} />
            {t.neverExpires ? "Never expires" : `${t.expiryMonths ?? "?"} months`}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 500 }}>
            <CreditCard2Front size={10} />
            {payLabel}
          </span>
          {t.gstPercentage > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 500 }}>
              GST {t.gstPercentage}%
            </span>
          )}
        </div>
      </div>

      {/* Services list */}
      <div style={{ flex: 1, padding: "14px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
          {t.services.length} Service{t.services.length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {t.services.map((s, si) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TagFill size={10} color="#7c3aed" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.serviceName}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f0f1f3", color: "#6b7280", borderRadius: 12, padding: "2px 8px" }}>
                  ×{s.totalSessions}
                </span>
                {s.price > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>₹{s.price}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ borderTop: "1px solid #f0f1f3", padding: "10px 18px", display: "flex", gap: 8, justifyContent: "flex-end", background: "#fafafa" }}>
        <button
          onClick={onEdit}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", border: "1px solid #e5e7eb", borderRadius: 8,
            background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
        >
          <PencilSquare size={12} /> Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", border: "1px solid #fee2e2", borderRadius: 8,
            background: "#fff", color: "#dc2626", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
            opacity: deleting ? 0.5 : 1,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
        >
          {deleting ? <Loader2 size={12} className={styles.spin} /> : <Trash size={12} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PackageTemplatesManager: React.FC = () => {
  const { data: templates = [], isLoading } = useListPackageTemplatesQuery();
  const [createTemplate] = useCreatePackageTemplateMutation();
  const [updateTemplate] = useUpdatePackageTemplateMutation();
  const [deleteTemplate] = useDeletePackageTemplateMutation();

  const { services: catalogServices, loading: servicesLoading, fetchServices } = useServices();

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [form,       setForm]       = useState<FormState>(emptyForm());
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchServices({ limit: 200 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((t: PackageTemplate) => {
    setEditingId(t.id);
    setForm(templateToForm(t));
    setFormError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setFormError(null);
  }, []);

  const handleChange = useCallback((patch: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  const handleSearch = useCallback((q: string) => {
    fetchServices({ search: q, limit: 30 });
  }, [fetchServices]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { setFormError("Template name is required."); return; }
    if (!form.neverExpires && !form.expiryDate) { setFormError("Please select an expiry date, or check 'Never expires'."); return; }
    const validServices = form.services.filter(s => s.serviceName.trim());
    if (!validServices.length) { setFormError("Add at least one service."); return; }

    setSaving(true);
    setFormError(null);
    try {
      const payload: CreatePackageTemplateDTO = {
        name:          form.name.trim(),
        neverExpires:  form.neverExpires,
        expiryMonths:  form.neverExpires ? null : dateToMonths(form.expiryDate),
        basePrice:     parseFloat(form.basePrice) || validServices.reduce((s, r) => s + (parseFloat(r.price) || 0), 0),
        gstPercentage: parseFloat(form.gstPercentage) || 0,
        discount:      parseFloat(form.discount) || 0,
        paymentMethod: form.paymentMethod,
        services: validServices.map(s => ({
          serviceName:   s.serviceName.trim(),
          totalSessions: parseInt(s.totalSessions) || 1,
          price:         parseFloat(s.price) || 0,
        })),
      };

      if (editingId) {
        await updateTemplate({ id: editingId, data: payload }).unwrap();
      } else {
        await createTemplate(payload).unwrap();
      }
      closeModal();
    } catch {
      setFormError("Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [form, editingId, createTemplate, updateTemplate, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id).unwrap();
    } finally {
      setDeletingId(null);
    }
  }, [deleteTemplate]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={18} color="#fff" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-.02em" }}>Package Templates</h2>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 0 46px" }}>
            Define reusable packages — load them instantly when selling to a client.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff",
            border: "none", borderRadius: 10, padding: "10px 18px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(102,126,234,.4)",
            transition: "all .15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(102,126,234,.5)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(102,126,234,.4)"; }}
        >
          <Plus size={15} /> New Template
        </button>
      </div>


      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <Loader2 size={32} className={styles.spin} color="#667eea" />
          <div style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>Loading templates…</div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "2px dashed #e5e7eb", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#eef2ff,#f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Package size={28} color="#7c3aed" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 }}>No templates yet</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, maxWidth: 320 }}>
            Create reusable package templates to speed up sales. Pick a template to auto-fill the entire package form.
          </div>
          <button
            onClick={openCreate}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 20px",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(102,126,234,.35)",
            }}
          >
            <Plus size={15} /> Create First Template
          </button>
        </div>
      )}

      {/* Template grid */}
      {!isLoading && templates.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {templates.map((t, i) => (
            <TemplateCard
              key={t.id}
              template={t}
              index={i}
              deleting={deletingId === t.id}
              onEdit={() => openEdit(t)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <FormPanel
          form={form}
          saving={saving}
          error={formError}
          isEdit={!!editingId}
          catalogServices={catalogServices}
          servicesLoading={servicesLoading}
          onChange={handleChange}
          onSave={handleSave}
          onClose={closeModal}
          onSearch={handleSearch}
        />
      )}
    </div>
  );
};

export default PackageTemplatesManager;
