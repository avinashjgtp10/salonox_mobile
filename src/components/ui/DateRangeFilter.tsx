import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Calendar3, Check2, ChevronDown, ChevronRight } from "react-bootstrap-icons";
import "./styles/DateRangeFilter.scss";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "all_time"
  | "custom";

export interface DateRangeFilterValue {
  preset: DateRangePreset;
  /** "YYYY-MM-DD". Empty string for both fields means "all_time" (unbounded) — callers should omit date params rather than sending "". */
  startDate: string;
  endDate: string;
}

interface DateRangeFilterProps {
  value: DateRangeFilterValue;
  onChange: (value: DateRangeFilterValue) => void;
  className?: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  this_year: "This year",
  all_time: "All time",
  custom: "Custom range",
};

const QUICK_RANGES: { key: DateRangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This week" },
];

const BY_PERIOD: { key: DateRangePreset; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "this_year", label: "This year" },
  { key: "all_time", label: "All time" },
];

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtLabel = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const startOfWeek = (d: Date) => {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  return s;
};

const endOfWeek = (d: Date) => {
  const e = startOfWeek(d);
  e.setDate(e.getDate() + 6);
  return e;
};

function getMonthDays(year: number, month0: number): (string | null)[] {
  const firstDay = new Date(year, month0, 1).getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(`${year}-${String(month0 + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
  }
  return days;
}

/**
 * Computes the start/end dates for every preset except "custom" (which has
 * no fixed range — its dates come from user selection). "This week" runs
 * Sunday–Saturday and "This quarter" follows calendar quarters (Jan–Mar,
 * Apr–Jun, Jul–Sep, Oct–Dec); both are the system-wide definitions other
 * modules should match rather than re-deriving their own.
 */
export function getDateRangePresetValue(preset: Exclude<DateRangePreset, "custom">): { startDate: string; endDate: string } {
  const now = new Date();
  switch (preset) {
    case "today": {
      const iso = toISO(now);
      return { startDate: iso, endDate: iso };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const iso = toISO(y);
      return { startDate: iso, endDate: iso };
    }
    case "this_week":
      return { startDate: toISO(startOfWeek(now)), endDate: toISO(endOfWeek(now)) };
    case "this_month": {
      const y = now.getFullYear(), m = now.getMonth();
      return { startDate: toISO(new Date(y, m, 1)), endDate: toISO(new Date(y, m + 1, 0)) };
    }
    case "last_month": {
      const y = now.getFullYear(), m = now.getMonth() - 1;
      return { startDate: toISO(new Date(y, m, 1)), endDate: toISO(new Date(y, m + 1, 0)) };
    }
    case "this_quarter": {
      const y = now.getFullYear();
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return { startDate: toISO(new Date(y, quarterStartMonth, 1)), endDate: toISO(new Date(y, quarterStartMonth + 3, 0)) };
    }
    case "this_year": {
      const y = now.getFullYear();
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    }
    case "all_time":
      return { startDate: "", endDate: "" };
  }
}

/** Default value every module should start from so "This week" reads the same everywhere. */
export const DEFAULT_DATE_RANGE_FILTER_VALUE: DateRangeFilterValue = {
  preset: "this_week",
  ...getDateRangePresetValue("this_week"),
};

/**
 * Standard Date Range Filter: preset trigger + dropdown with Quick Ranges,
 * By Period, and an expandable Custom range calendar. This is the ONE date
 * range UI for the whole app — reuse it instead of building a page-local
 * variant, so labels, presets, and date math stay consistent everywhere.
 */
export default function DateRangeFilter({ value, onChange, className = "" }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"list" | "custom">("list");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [activeTab, setActiveTab] = useState<"from" | "to">("from");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth0, setViewMonth0] = useState(() => new Date().getMonth());
  const containerRef = useRef<HTMLDivElement>(null);
  // The panel jumps from 230px (list) to 570px (custom range) wide and is
  // anchored left:0 by default — fine for a trigger with room to its right,
  // but on a trigger sitting near the right edge (e.g. the WhatsApp Marketing
  // dashboard header) that pushes the calendar off-screen. Flip to
  // right-aligned whenever the panel would overflow the viewport.
  //
  // This is computed from the trigger's position + the panel's intended
  // width, NOT by measuring the rendered panel itself — measuring the live
  // panel is self-referential (an already right-aligned panel measures as
  // "fits", flips back to left:0, and nothing re-checks it afterward since
  // alignEnd isn't a effect dependency), which is exactly what let the
  // custom-range calendar overflow after switching out of list mode.
  const [alignEnd, setAlignEnd] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) { setAlignEnd(false); return; }
    const PANEL_WIDTH = { list: 230, custom: 570 } as const;
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerLeft = container.getBoundingClientRect().left;
      setAlignEnd(containerLeft + PANEL_WIDTH[panelMode] > window.innerWidth - 8);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, panelMode]);

  const selectPreset = (preset: Exclude<DateRangePreset, "custom">) => {
    onChange({ preset, ...getDateRangePresetValue(preset) });
    setOpen(false);
  };

  const openCustomPanel = () => {
    if (panelMode === "custom") {
      setPanelMode("list");
      return;
    }
    const seedFrom = value.preset === "custom" ? value.startDate : "";
    const seedTo = value.preset === "custom" ? value.endDate : "";
    setDraftFrom(seedFrom);
    setDraftTo(seedTo);
    setActiveTab(seedFrom ? "to" : "from");
    const seedIso = seedFrom || seedTo || toISO(new Date());
    setViewYear(Number(seedIso.slice(0, 4)));
    setViewMonth0(Number(seedIso.slice(5, 7)) - 1);
    setPanelMode("custom");
  };

  const prevMonth = () => {
    if (viewMonth0 === 0) { setViewYear(y => y - 1); setViewMonth0(11); }
    else setViewMonth0(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth0 === 11) { setViewYear(y => y + 1); setViewMonth0(0); }
    else setViewMonth0(m => m + 1);
  };

  const pickDay = (day: string) => {
    if (activeTab === "from") {
      setDraftFrom(day);
      if (draftTo && day > draftTo) setDraftTo("");
      setActiveTab("to");
    } else if (draftFrom && day < draftFrom) {
      setDraftFrom(day);
      setDraftTo("");
      setActiveTab("to");
    } else {
      setDraftTo(day);
    }
  };

  const clearDraft = () => {
    setDraftFrom("");
    setDraftTo("");
    setActiveTab("from");
  };

  const applyCustom = () => {
    if (!draftFrom || !draftTo) return;
    onChange({ preset: "custom", startDate: draftFrom, endDate: draftTo });
    setOpen(false);
  };

  const triggerLabel = value.preset === "custom"
    ? (value.startDate && value.endDate ? `${fmtLabel(value.startDate)} – ${fmtLabel(value.endDate)}` : "Custom range")
    : DATE_RANGE_PRESET_LABELS[value.preset];

  const days = getMonthDays(viewYear, viewMonth0);
  const lo = draftFrom && draftTo ? (draftFrom < draftTo ? draftFrom : draftTo) : (draftFrom || draftTo);
  const hi = draftFrom && draftTo ? (draftFrom < draftTo ? draftTo : draftFrom) : (draftFrom || draftTo);

  return (
    <div className={`drf${className ? ` ${className}` : ""}`} ref={containerRef}>
      <button
        type="button"
        className={`drf-trigger${open ? " drf-trigger--open" : ""}`}
        onClick={() => {
          if (!open) setPanelMode("list");
          setOpen(v => !v);
        }}
      >
        <Calendar3 size={13} />
        <span>{triggerLabel}</span>
        <ChevronDown size={12} className={`drf-trigger__chevron${open ? " drf-trigger__chevron--open" : ""}`} />
      </button>

      {open && (
        <div
          className={`drf-panel${panelMode === "custom" ? " drf-panel--custom" : ""}${alignEnd ? " drf-panel--align-end" : ""}`}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="drf-list">
            <div className="drf-list__group-label">Quick ranges</div>
            {QUICK_RANGES.map(p => (
              <button
                type="button"
                key={p.key}
                className={`drf-list__row${value.preset === p.key ? " drf-list__row--selected" : ""}`}
                onClick={() => selectPreset(p.key as Exclude<DateRangePreset, "custom">)}
              >
                <span>{p.label}</span>
                {value.preset === p.key && <Check2 size={13} className="drf-list__check" />}
              </button>
            ))}
            <div className="drf-list__group-label">By period</div>
            {BY_PERIOD.map(p => (
              <button
                type="button"
                key={p.key}
                className={`drf-list__row${value.preset === p.key ? " drf-list__row--selected" : ""}`}
                onClick={() => selectPreset(p.key as Exclude<DateRangePreset, "custom">)}
              >
                <span>{p.label}</span>
                {value.preset === p.key && <Check2 size={13} className="drf-list__check" />}
              </button>
            ))}
            <div className="drf-list__divider" />
            <button
              type="button"
              className={`drf-list__row drf-list__custom-row${panelMode === "custom" ? " drf-list__row--active" : ""}`}
              onClick={openCustomPanel}
            >
              <span>Custom range</span>
              {value.preset === "custom" && panelMode !== "custom"
                ? <Check2 size={13} className="drf-list__check" />
                : (panelMode === "custom" ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
            </button>
          </div>

          {panelMode === "custom" && (
            <div className="drf-custom">
              <div className="drf-custom__title">Custom range</div>
              <div className="drf-custom__tabs">
                <button
                  type="button"
                  className={`drf-custom__tab${activeTab === "from" ? " drf-custom__tab--active" : ""}`}
                  onClick={() => setActiveTab("from")}
                >
                  <span className="drf-custom__tab-label">From</span>
                  <span className="drf-custom__tab-value">{draftFrom ? fmtLabel(draftFrom) : "Select date"}</span>
                </button>
                <button
                  type="button"
                  className={`drf-custom__tab${activeTab === "to" ? " drf-custom__tab--active" : ""}`}
                  onClick={() => setActiveTab("to")}
                >
                  <span className="drf-custom__tab-label">To</span>
                  <span className="drf-custom__tab-value">{draftTo ? fmtLabel(draftTo) : "Select date"}</span>
                </button>
              </div>

              <div className="drf-custom__nav">
                <button type="button" className="drf-custom__nav-btn" onClick={prevMonth}>‹</button>
                <span className="drf-custom__month-label">{MONTHS[viewMonth0]} {viewYear}</span>
                <button type="button" className="drf-custom__nav-btn" onClick={nextMonth}>›</button>
              </div>

              <div className="drf-custom__day-headers">
                {DAYS_ABBR.map(d => <div key={d} className="drf-custom__day-name">{d}</div>)}
              </div>
              <div className="drf-custom__day-grid">
                {days.map((day, i) => {
                  const isEmpty = !day;
                  const inRange = day && lo && hi && day >= lo && day <= hi;
                  const isEdge = day && (day === draftFrom || day === draftTo);
                  return (
                    <button
                      type="button"
                      key={i}
                      disabled={isEmpty}
                      className={[
                        "drf-custom__day-btn",
                        isEmpty ? "drf-custom__day-btn--empty" : "",
                        inRange ? "drf-custom__day-btn--in-range" : "",
                        isEdge ? "drf-custom__day-btn--edge" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => day && pickDay(day)}
                    >
                      {day ? Number(day.slice(8, 10)) : ""}
                    </button>
                  );
                })}
              </div>

              <div className="drf-custom__footer">
                <button type="button" className="drf-custom__clear" onClick={clearDraft}>Clear</button>
                <button type="button" className="drf-custom__apply" disabled={!draftFrom || !draftTo} onClick={applyCustom}>Apply</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
