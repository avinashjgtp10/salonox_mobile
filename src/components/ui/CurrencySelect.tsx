import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SUPPORTED_CURRENCIES, type CurrencyDef } from "../../config/currencies";

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

const MAX_DROPDOWN_HEIGHT = 280;

// Custom searchable dropdown — a native <select> with ~180 currencies only
// supports jump-to-first-letter typeahead (typing "u" jumps to the first
// "U..." option, it can't filter down to "US Dollar" out of a dozen "U"
// entries). This is a real type-to-filter search across code, name, and
// symbol instead, portal-positioned the same way TimeSelect.tsx already does
// elsewhere in this app so it can't get clipped by an ancestor's overflow.
const CurrencySelect: React.FC<CurrencySelectProps> = ({
  value,
  onChange,
  className = "settings-select",
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = SUPPORTED_CURRENCIES.find((c) => c.code === value);

  const filtered = useMemo<CurrencyDef[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  function computePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUpward = spaceBelow < MAX_DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
    setPos({
      top: openUpward ? r.top - 2 : r.bottom + 2,
      left: r.left,
      width: Math.max(r.width, 260),
      openUpward,
    });
  }

  function openDropdown() {
    if (disabled) return;
    computePosition();
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function selectValue(code: string) {
    onChange(code);
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onScrollOrResize() { computePosition(); }
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  // Reset the highlighted row whenever the filtered list changes so it never
  // points past the end (or at a row that filtered itself away).
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    (el as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) selectValue(filtered[activeIndex].code);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={className}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          textAlign: "left",
          width: "100%",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? `${selected.label} (${selected.symbol}) — ${selected.code}` : "Select currency"}
        </span>
      </button>

      {open && pos && createPortal(
        <div
          ref={listRef}
          style={{
            position: "fixed",
            left: pos.left,
            width: pos.width,
            ...(pos.openUpward
              ? { bottom: window.innerHeight - pos.top, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, pos.top - 8) }
              : { top: pos.top, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, window.innerHeight - pos.top - 8) }),
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search currency or code…"
            style={{
              border: "none",
              borderBottom: "1px solid #e5e7eb",
              padding: "8px 12px",
              fontSize: 13,
              outline: "none",
              flexShrink: 0,
            }}
          />
          <div role="listbox" style={{ overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 13, color: "#9ca3af" }}>No currency matches.</div>
            )}
            {filtered.map((c, i) => {
              const isSelected = c.code === value;
              const isActive = i === activeIndex;
              return (
                <div
                  key={c.code}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => { e.preventDefault(); selectValue(c.code); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    padding: "7px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    background: isActive ? "#eff6ff" : "#fff",
                    color: isSelected ? "#2563eb" : "#111827",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {c.label} ({c.symbol}) — {c.code}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CurrencySelect;
