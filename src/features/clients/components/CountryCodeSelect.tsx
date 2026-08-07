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
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
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
      // Always opens downward — clamp the height to whatever viewport space
      // remains below the trigger instead of flipping above it, so the panel
      // never covers the field the user just clicked.
      const maxHeight = Math.max(160, Math.min(320, window.innerHeight - r.bottom - 12));
      setPos({
        top: r.bottom + 4,
        left: Math.min(r.left, window.innerWidth - 280 - 8),
        width: Math.max(r.width, 260),
        maxHeight,
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
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
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

  // Sync activeIndex to the selected item when opened or search changes
  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex((c) => c.dialCode === selected?.dialCode);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, filtered, selected?.dialCode]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-idx="${activeIndex}"]`);
    if (item) {
      (item as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(filtered.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        onChange(filtered[activeIndex].dialCode);
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      if (!open) {
        e.preventDefault();
        setSearch("");
        setOpen(true);
      }
    }
  };

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
        onKeyDown={handleTriggerKeyDown}
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
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
        >
          <div className="ccs-search-wrap">
            <Search size={12} className="ccs-search-icon" />
            <input
              ref={searchRef}
              className="ccs-search"
              placeholder="Search country, ISO or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <div className="ccs-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="ccs-empty">No countries found</div>
            ) : (
              filtered.map((c, i) => {
                const isSelected = c.dialCode === selected?.dialCode;
                const isActive = i === activeIndex;
                return (
                  <button
                    type="button"
                    key={c.isoCode}
                    data-idx={i}
                    className={`ccs-option${isSelected ? " ccs-option--selected" : ""}${isActive ? " ccs-option--active" : ""}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => { onChange(c.dialCode); setOpen(false); triggerRef.current?.focus(); }}
                  >
                    <span className="ccs-option__flag">{c.flag}</span>
                    <span className="ccs-option__name">{c.name}</span>
                    <span className="ccs-option__iso">{c.isoCode}</span>
                    <span className="ccs-option__dial">{c.dialCode}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
