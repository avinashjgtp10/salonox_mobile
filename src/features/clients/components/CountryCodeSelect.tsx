// Rich country-code picker for the Client form's "Phone"/"Additional mobile"
// fields — replaces the plain native <select> (which only showed the raw
// dial code, expanded to its full unbounded native list, and had no search)
// with a searchable, fixed-height dropdown showing flag + name + ISO code +
// dial code per row. Built on country-state-city (already a dependency, and
// already the source for the old <select>'s option list) rather than pulling
// in a new library — it already carries everything needed, including a
// ready-to-render emoji flag per country.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Country } from "country-state-city";
import { ChevronDown, Search } from "react-bootstrap-icons";
import "../styles/CountryCodeSelect.scss";

interface CountryOption {
  isoCode: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRY_OPTIONS: CountryOption[] = Country.getAllCountries()
  .map((c) => ({
    isoCode: c.isoCode,
    name: c.name,
    dialCode: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    flag: c.flag,
  }))
  // A handful of dial codes are shared by multiple territories (e.g. +1 for
  // both US and Canada) — first one wins, same as the old <select>'s implicit
  // behavior (whichever appeared first in the source list).
  .filter((v, i, a) => a.findIndex((t) => t.dialCode === v.dialCode) === i)
  .sort((a, b) => a.name.localeCompare(b.name));

interface Props {
  value: string;
  onChange: (dialCode: string) => void;
  disabled?: boolean;
  /** Applied to the trigger button — lets the caller reuse its existing
   *  invalid/error styling hook (e.g. cli-phone-group's error state). */
  className?: string;
}

export default function CountryCodeSelect({ value, onChange, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected =
    COUNTRY_OPTIONS.find((c) => c.dialCode === value) ??
    COUNTRY_OPTIONS.find((c) => c.dialCode === "+91");

  // Portaled to document.body with position:fixed (same reasoning as
  // ServicesPanel.tsx's product-search dropdown) so this can never get
  // clipped by a modal/card's own overflow:hidden, and recomputed on every
  // open/scroll/resize so it tracks the trigger instead of drifting.
  useEffect(() => {
    if (!open) return;
    function updatePos() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelHeight = 320;
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < panelHeight && r.top > spaceBelow;
      setPos({
        top: openUp ? r.top - panelHeight - 4 : r.bottom + 4,
        left: Math.min(r.left, window.innerWidth - 280 - 8),
        width: Math.max(r.width, 260),
      });
    }
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRY_OPTIONS;
    const qDigits = q.replace(/^\+/, "");
    return COUNTRY_OPTIONS.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.isoCode.toLowerCase().includes(q) ||
      (qDigits && c.dialCode.replace("+", "").includes(qDigits))
    );
  }, [search]);

  return (
    <div className="ccs-root" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`ccs-trigger ${className || ""}`}
        disabled={disabled}
        onClick={() => {
          if (!open) setSearch("");
          setOpen(!open);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ccs-trigger__flag">{selected?.flag}</span>
        <span className="ccs-trigger__code">{selected?.dialCode}</span>
        <ChevronDown size={10} className="ccs-trigger__chevron" />
      </button>

      {open && pos && createPortal(
        <div
          className="ccs-panel"
          ref={panelRef}
          role="listbox"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="ccs-search-wrap">
            <Search size={12} className="ccs-search-icon" />
            <input
              ref={searchRef}
              className="ccs-search"
              placeholder="Search country, ISO or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ccs-list">
            {filtered.length === 0 ? (
              <div className="ccs-empty">No countries found</div>
            ) : (
              filtered.map((c) => (
                <button
                  type="button"
                  key={c.isoCode}
                  className={`ccs-option${c.dialCode === selected?.dialCode ? " ccs-option--active" : ""}`}
                  role="option"
                  aria-selected={c.dialCode === selected?.dialCode}
                  onClick={() => { onChange(c.dialCode); setOpen(false); }}
                >
                  <span className="ccs-option__flag">{c.flag}</span>
                  <span className="ccs-option__name">{c.name}</span>
                  <span className="ccs-option__iso">{c.isoCode}</span>
                  <span className="ccs-option__dial">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
