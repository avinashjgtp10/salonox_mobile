import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface NameSelectOption {
  id: string | number;
  name: string;
}

interface NameSelectProps {
  value: string;
  options: NameSelectOption[];
  onChange: (option: NameSelectOption) => void;
  className?: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Placeholder for the in-dropdown filter box. */
  searchPlaceholder?: string;
}

const MAX_DROPDOWN_HEIGHT = 160; // caps the list at ~5 rows before it scrolls

// Same technique as TimeSelect.tsx: a native <select>'s popup is drawn by the
// browser/OS, so page CSS can't cap how many options show before scrolling —
// a long package/membership list would render as one giant native popup.
// This portal-positioned version computes its own placement, flips above
// when there isn't room below, and caps its own height with an internal
// scrollbar so only ~5 rows show before the list scrolls.
//
// It also carries its own filter box. Replacing the native <select> silently
// dropped that element's built-in type-ahead (typing a letter jumps to the
// matching option), leaving staff with a list they could only scroll — so the
// search is reimplemented here rather than left as a regression. Typing
// filters the list and always parks the highlight on the first match, so
// Enter selects it without touching the arrow keys.
const NameSelect: React.FC<NameSelectProps> = ({
  value,
  options,
  onChange,
  className = "form-select",
  placeholder,
  emptyText = "No options available.",
  disabled,
  searchPlaceholder = "Search…",
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Everything below indexes into `filtered`, never `options` — mixing the two
  // is how a highlight ends up pointing at a row that isn't on screen.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

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
      width: r.width,
      openUpward,
    });
  }

  function openDropdown() {
    if (disabled) return;
    computePosition();
    setQuery("");
    // Opens with the CURRENT selection highlighted, so reopening a row that
    // already has a package/membership starts where staff left it.
    setActiveIndex(Math.max(0, options.findIndex((o) => String(o.id) === String(value))));
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  function selectOption(option: NameSelectOption) {
    onChange(option);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onScrollOrResize() { computePosition(); }
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the filter box on open so staff can just start typing — the whole
  // point of restoring search is not having to reach for the mouse first.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Every keystroke re-parks the highlight on the first match. Without this the
  // index would keep pointing at whatever position it held against the OLD,
  // longer list — the reported bug: type a name, see nothing highlighted (or
  // the wrong row), press Enter, get the wrong item.
  useEffect(() => {
    if (!open) return;
    setActiveIndex(filtered.length > 0 ? 0 : -1);
    // Deliberately keyed on the query, not on `filtered`: re-running when the
    // options array merely re-identifies (a parent re-render) would stomp on
    // an arrow-key selection the user just made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  // Keep the active (highlighted) option scrolled into view as it changes.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    (el as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled || open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDropdown();
    }
  }

  // Arrow/Enter/Escape while typing in the filter box. Bounds are `filtered`,
  // so navigation can never land on a hidden option.
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length === 0 ? -1 : Math.min(filtered.length - 1, i + 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length === 0 ? -1 : Math.max(0, i - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) selectOption(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === "Tab") {
      // Tab must not leave a floating portal list behind over the next field.
      setOpen(false);
      setQuery("");
    }
  }

  const selectedLabel = options.find((o) => String(o.id) === String(value))?.name || "";
  const listboxId = "name-select-listbox";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={className}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          textAlign: "left",
          color: selectedLabel ? undefined : "#6b7280",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel || placeholder || " "}
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
              // maxHeight covers the filter box plus the list, so the combined
              // popup still can't overflow the viewport edge it flipped away from.
              ? { bottom: window.innerHeight - pos.top, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT + 40, pos.top - 8) }
              : { top: pos.top, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT + 40, window.innerHeight - pos.top - 8) }),
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 9999,
          }}
        >
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 && filtered[activeIndex]
                ? `name-select-option-${filtered[activeIndex].id}`
                : undefined
            }
            style={{
              flexShrink: 0,
              width: "100%",
              boxSizing: "border-box",
              padding: "7px 10px",
              fontSize: 13,
              border: "none",
              borderBottom: "1px solid #e5e7eb",
              borderRadius: "6px 6px 0 0",
              outline: "none",
            }}
          />
          <div role="listbox" id={listboxId} style={{ overflowY: "auto" }}>
            {filtered.length > 0 ? filtered.map((o, i) => {
              const isSelected = String(o.id) === String(value);
              const isActive = i === activeIndex;
              return (
                <div
                  key={o.id}
                  data-idx={i}
                  id={`name-select-option-${o.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => { e.preventDefault(); selectOption(o); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    padding: "7px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    background: isActive ? "#eff6ff" : "#fff",
                    color: isSelected ? "#2563eb" : "#111827",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {o.name}
                </div>
              );
            }) : (
              <div style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>
                {query.trim() ? `No match for “${query.trim()}”` : emptyText}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default NameSelect;
