import React, { useEffect, useRef, useState } from "react";
import "./Dropdown.scss";

export interface DropdownOption {
  id: string;
  name: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  onChange: (id: string) => void;
  onBlur?: () => void;
  allowNone?: boolean;
  disabled?: boolean;
  /** false = click-to-open list only, no typing/filtering (drop-in for a plain native <select>). Default true. */
  searchable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Reusable dropdown modeled on the Category/Brand picker from the Add Product
// form (src/features/catalog/components/form/SearchSelect.tsx) — same
// search-input + inline-positioned list interaction, generalized so any
// modal/page can adopt it instead of a native <select>. `searchable={false}`
// covers the plain single-select fields that don't need type-to-filter.
export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  placeholder,
  onChange,
  onBlur,
  allowNone,
  disabled,
  searchable = true,
  className,
  style,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const selected = options.find((o) => o.id === value);
  const displayValue = searchable
    ? (open ? query : (selected?.name ?? (value === "" && allowNone ? "None" : "")))
    : (selected?.name ?? (value === "" && allowNone ? "None" : ""));
  const filtered = searchable && query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;
  // "None" (when offered) occupies index 0 of the keyboard-navigable list,
  // ahead of every real option.
  const rowCount = filtered.length + (allowNone ? 1 : 0);

  // Reset the highlighted row whenever the option set changes (typing
  // narrows/widens `filtered`) — a stale index could otherwise point at a
  // row that's no longer there, or the wrong one.
  useEffect(() => { setActiveIndex(-1); }, [query, open]);

  // The dropdown scrolls (max-height + overflow-y: auto) but arrowing past
  // the visible rows never scrolled the highlighted one INTO view, so it
  // looked like the list just stopped responding once you went past row ~5.
  // "nearest" only scrolls the minimum needed, so it doesn't jump the list
  // around on every keypress.
  useEffect(() => {
    if (activeIndex < 0) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (rowCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      // Clamped, not wrapped — cycling back to row 1 after the last row
      // (or vice versa) reads as the list being stuck in a loop rather than
      // reaching the end.
      setActiveIndex((i) => Math.min(i + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex < 0) return;
      e.preventDefault();
      if (allowNone && activeIndex === 0) { pick(""); return; }
      const opt = filtered[activeIndex - (allowNone ? 1 : 0)];
      if (opt) pick(opt.id);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className={`ui-dropdown${disabled ? " ui-dropdown--disabled" : ""}`}>
      <input
        className={className}
        style={style}
        placeholder={placeholder}
        value={displayValue}
        readOnly={!searchable}
        disabled={disabled}
        onChange={(e) => { if (searchable) { setQuery(e.target.value); setOpen(true); } }}
        onFocus={() => { if (searchable) setQuery(""); setOpen(true); }}
        onClick={() => { if (!searchable) setOpen((o) => !o); }}
        onBlur={() => { setTimeout(() => { setOpen(false); onBlur?.(); }, 180); }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <div className="ui-dropdown__drop" role="listbox">
          {allowNone && (
            <div
              ref={(el) => { itemRefs.current[0] = el; }}
              className={`ui-dropdown__item${activeIndex === 0 ? " ui-dropdown__item--active" : ""}`}
              onMouseDown={() => pick("")}
              onMouseEnter={() => setActiveIndex(0)}
            >
              None
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="ui-dropdown__empty">No matches</div>
          ) : (
            filtered.map((o, i) => {
              const rowIndex = i + (allowNone ? 1 : 0);
              return (
                <div
                  key={o.id}
                  ref={(el) => { itemRefs.current[rowIndex] = el; }}
                  className={`ui-dropdown__item${activeIndex === rowIndex ? " ui-dropdown__item--active" : ""}${o.id === value ? " ui-dropdown__item--selected" : ""}`}
                  onMouseDown={() => pick(o.id)}
                  onMouseEnter={() => setActiveIndex(rowIndex)}
                >
                  {o.name}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
