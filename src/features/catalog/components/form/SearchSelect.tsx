import React, { useEffect, useRef, useState } from "react";

// Searchable dropdown for Category/Brand/Supplier — filters an already-loaded
// list client-side (no debounced API call needed, unlike a server-backed
// search, since these lists are small and already in Redux).
//
// Extracted from ProductFormPage so the Service form uses the SAME control
// rather than a lookalike — the two catalog forms are meant to be visually and
// behaviourally identical, and a copy would drift on the first fix to either.
// Styles live in ../../styles/ConsumableFormPage.scss (.cf-search-select*),
// which every catalog form already imports.
export const SearchSelect: React.FC<{
  value: string;
  options: { id: string; name: string }[];
  placeholder: string;
  onChange: (id: string) => void;
  onBlur?: () => void;
  allowNone?: boolean;
}> = ({ value, options, placeholder, onChange, onBlur, allowNone }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const selected = options.find((o) => o.id === value);
  const displayValue = open ? query : (selected?.name ?? (value === "" && allowNone ? "None" : ""));
  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;
  // "None" (when offered) occupies index 0 of the keyboard-navigable list,
  // ahead of every real option.
  const rowCount = filtered.length + (allowNone ? 1 : 0);

  // Reset the highlighted row whenever the option set changes (typing
  // narrows/widens `filtered`) — a stale index could otherwise point at a
  // row that's no longer there, or the wrong one.
  useEffect(() => { setActiveIndex(-1); }, [query, open]);

  // The dropdown scrolls (max-height + overflow-y: auto — see .cf-search-
  // select__drop) but arrowing past the visible rows never scrolled the
  // highlighted one INTO view, so it looked like the list just stopped
  // responding once you went past row ~5. "nearest" only scrolls the
  // minimum needed, so it doesn't jump the list around on every keypress.
  useEffect(() => {
    if (activeIndex < 0) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function pick(id: string, _name: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || rowCount === 0) return;
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
      if (allowNone && activeIndex === 0) { pick("", ""); return; }
      const opt = filtered[activeIndex - (allowNone ? 1 : 0)];
      if (opt) pick(opt.id, opt.name);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="cf-search-select">
      <input
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onBlur={() => { setTimeout(() => { setOpen(false); onBlur?.(); }, 180); }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <div className="cf-search-select__drop" role="listbox">
          {allowNone && (
            <div
              ref={(el) => { itemRefs.current[0] = el; }}
              className={`cf-search-select__item${activeIndex === 0 ? " cf-search-select__item--active" : ""}`}
              onMouseDown={() => pick("", "")}
              onMouseEnter={() => setActiveIndex(0)}
            >
              None
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="cf-search-select__empty">No matches</div>
          ) : (
            filtered.map((o, i) => {
              const rowIndex = i + (allowNone ? 1 : 0);
              return (
                <div
                  key={o.id}
                  ref={(el) => { itemRefs.current[rowIndex] = el; }}
                  className={`cf-search-select__item${activeIndex === rowIndex ? " cf-search-select__item--active" : ""}`}
                  onMouseDown={() => pick(o.id, o.name)}
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

export default SearchSelect;
