import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SearchableSelectProps<T> {
  value: string;
  onChange: (key: string) => void;
  options: T[];
  getKey: (opt: T) => string;
  getLabel: (opt: T) => string;
  /** Lowercase, space-joined text to match the search query against. */
  getSearchText: (opt: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

const MAX_DROPDOWN_HEIGHT = 240;

// Generic portal-positioned, type-to-filter dropdown — a native <select> with
// a long list only supports jump-to-first-letter typeahead, which can't
// filter down to e.g. "US Dollar" out of a dozen "U..." entries. Shared by
// CurrencySelect and CountrySelect (and anything else with a long list to
// pick from) instead of duplicating the same portal/search/keyboard-nav
// logic per list.
export function SearchableSelect<T>({
  value,
  onChange,
  options,
  getKey,
  getLabel,
  getSearchText,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className = "settings-select",
  disabled,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => getKey(o) === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => getSearchText(o).toLowerCase().includes(q));
  }, [options, query, getSearchText]);

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

  function selectValue(key: string) {
    onChange(key);
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
      if (filtered[activeIndex]) selectValue(getKey(filtered[activeIndex]));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const chevronStyle: React.CSSProperties = {
    flexShrink: 0,
    width: 16,
    height: 16,
    color: open ? "#6366f1" : "#9ca3af",
    transition: "transform 0.15s",
    transform: open ? "rotate(180deg)" : "rotate(0deg)",
  };

  return (
    <>
      {/* ── Trigger Button ── */}
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
          gap: 6,
          textAlign: "left",
          width: "100%",
          height: 38,
          padding: "0 10px",
          border: open ? "1.5px solid #6366f1" : "1px solid #e5e7eb",
          borderRadius: 8,
          background: disabled ? "#f9fafb" : "#fff",
          color: disabled ? "#9ca3af" : (selected ? "#111827" : "#9ca3af"),
          fontSize: 13,
          fontFamily: "inherit",
          fontWeight: selected ? 600 : 400,
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          outline: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        {/* Chevron icon */}
        <svg viewBox="0 0 20 20" fill="currentColor" style={chevronStyle}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ── Portal Dropdown ── */}
      {open && pos && createPortal(
        <div
          ref={listRef}
          style={{
            position: "fixed",
            left: pos.left,
            width: pos.width,
            ...(pos.openUpward
              ? { bottom: window.innerHeight - pos.top + 4, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, pos.top - 12) }
              : { top: pos.top + 4, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, window.innerHeight - pos.top - 16) }),
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 28px rgba(17,24,39,0.13), 0 1px 4px rgba(17,24,39,0.06)",
            zIndex: 99999,
            overflow: "hidden",
            animation: "ss-pop 0.15s ease",
          }}
        >
          {/* Search Input */}
          <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                outline: "none",
                background: "#f9fafb",
                color: "#111827",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Options List */}
          <div role="listbox" style={{ overflowY: "auto", overflowX: "hidden" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>No matches found</div>
            )}
            {filtered.map((o, i) => {
              const key = getKey(o);
              const isSelected = key === value;
              const isActive = i === activeIndex;
              return (
                <div
                  key={key}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => { e.preventDefault(); selectValue(key); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: isSelected
                      ? "#ede9fe"
                      : isActive
                      ? "#f5f3ff"
                      : "transparent",
                    color: isSelected ? "#5b21b6" : "#111827",
                    fontWeight: isSelected ? 700 : 400,
                    borderRadius: 6,
                    margin: "0 4px",
                    transition: "background 0.08s",
                  }}
                >
                  {isSelected && (
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, flexShrink: 0, color: "#7c3aed" }}>
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span style={{ marginLeft: isSelected ? 0 : 22 }}>{getLabel(o)}</span>
                </div>
              );
            })}
          </div>
          <style>{`@keyframes ss-pop{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        </div>,
        document.body
      )}
    </>
  );
}

export default SearchableSelect;
