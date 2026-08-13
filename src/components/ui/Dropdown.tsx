import React, { useEffect, useRef, useState } from "react";
import "./Dropdown.scss";

export interface DropdownOption {
  id: string;
  name: string;
}

interface DropdownProps {
  /** Selected id — or, in `multiple` mode, the array of selected ids. */
  value: string | string[];
  options: DropdownOption[];
  placeholder?: string;
  /** Receives the picked id. In `multiple` mode this is the id that was
   *  TOGGLED: the parent owns the array and adds/removes it itself, matching
   *  how the existing checkbox-list pickers already track their selection. */
  onChange: (id: string) => void;
  onBlur?: () => void;
  allowNone?: boolean;
  disabled?: boolean;
  /** false = click-to-open list only, no typing/filtering (drop-in for a plain native <select>). Default true. */
  searchable?: boolean;
  /** Multi-select: rows show a checkbox, picking one keeps the list open
   *  (and keeps any active filter), and the closed field summarises the
   *  selection. Default false — single-select, unchanged. */
  multiple?: boolean;
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
  multiple = false,
  className,
  style,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  // `value` is a string for every single-select caller and an array only in
  // multiple mode — normalise both ways up front so the rest of the component
  // never has to re-check which shape it got.
  const selectedIds = multiple ? (Array.isArray(value) ? value : []) : [];
  const singleValue = Array.isArray(value) ? "" : value;
  const selected = options.find((o) => o.id === singleValue);
  // Naming a couple of picks is more useful than a bare count, but a long
  // list would overflow the field — so summarise past two.
  const multiLabel = selectedIds.length === 0
    ? ""
    : selectedIds.length <= 2
      ? options.filter((o) => selectedIds.includes(o.id)).map((o) => o.name).join(", ")
      : `${selectedIds.length} selected`;
  const closedLabel = multiple
    ? multiLabel
    : (selected?.name ?? (singleValue === "" && allowNone ? "None" : ""));
  const displayValue = searchable && open ? query : closedLabel;
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
    // Multi-select stays open so several can be ticked in one go, and keeps
    // the current filter text so a search like "sha" isn't retyped between
    // picks. Single-select is unchanged: commit and close.
    if (multiple) return;
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
    <div className={`ui-dropdown${disabled ? " ui-dropdown--disabled" : ""}${searchable ? "" : " ui-dropdown--plain"}`}>
      <input
        className={className}
        style={style}
        placeholder={placeholder}
        value={displayValue}
        readOnly={!searchable}
        disabled={disabled}
        onChange={(e) => { if (searchable) { setQuery(e.target.value); setOpen(true); } }}
        // Opening on focus applies to the searchable variant only. A pointer
        // press fires focus BEFORE click, so when the field was click-to-
        // toggle (searchable={false}) the first click on an unfocused field
        // ran both handlers: focus opened the list, then click toggled it
        // straight back shut. That read as the menu flashing open and
        // vanishing, needing a second click — every click-only dropdown in
        // the app behaved this way. Click alone owns the toggle now;
        // keyboard users still open it with ArrowDown/Enter (see
        // handleKeyDown), so nothing is lost.
        onFocus={() => { if (searchable) { setQuery(""); setOpen(true); } }}
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
              const isSelected = multiple ? selectedIds.includes(o.id) : o.id === singleValue;
              return (
                <div
                  key={o.id}
                  ref={(el) => { itemRefs.current[rowIndex] = el; }}
                  className={`ui-dropdown__item${activeIndex === rowIndex ? " ui-dropdown__item--active" : ""}${isSelected ? " ui-dropdown__item--selected" : ""}`}
                  // preventDefault keeps focus on the input. Without it the
                  // mousedown blurs the field, and the blur handler's timeout
                  // closes the list — which single-select doesn't notice
                  // (it closes anyway) but would shut multi-select after
                  // every single tick.
                  onMouseDown={(e) => { if (multiple) e.preventDefault(); pick(o.id); }}
                  onMouseEnter={() => setActiveIndex(rowIndex)}
                  role="option"
                  aria-selected={isSelected}
                >
                  {multiple && (
                    <span className={`ui-dropdown__check${isSelected ? " ui-dropdown__check--on" : ""}`} aria-hidden>
                      {isSelected ? "✓" : ""}
                    </span>
                  )}
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
