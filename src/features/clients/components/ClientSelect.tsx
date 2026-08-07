import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check } from "react-bootstrap-icons";
import "../styles/ClientSelect.scss";

export interface ClientSelectOption {
  value: string;
  label: string;
}

export type SelectOption = ClientSelectOption;

export interface ClientSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ClientSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

export const ClientSelect: React.FC<ClientSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  disabled = false,
  invalid = false,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Position calculation
  useEffect(() => {
    if (!open) return;
    function updatePos() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const spaceBelow = window.innerHeight - r.bottom - 12;
      const maxHeight = Math.max(140, Math.min(260, spaceBelow));
      setPos({
        top: r.bottom + 4,
        left: r.left,
        width: r.width,
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

  // Focus search input on open
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Click outside and escape handling
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
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
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  // Reset activeIndex on open or search change
  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, filtered, value]);

  // Auto-scroll active item into view
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
        onChange(filtered[activeIndex].value);
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
    <div className="cli-select-root" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        className={`cli-select-trigger ${invalid ? "cli-select-trigger--invalid" : ""} ${className}`}
        onClick={() => {
          if (!open) setSearch("");
          setOpen(!open);
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`cli-select-trigger__label ${!selectedOption ? "cli-select-trigger__placeholder" : ""}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={12} className={`cli-select-trigger__chevron ${open ? "cli-select-trigger__chevron--open" : ""}`} />
      </button>

      {open && pos && createPortal(
        <div
          className="cli-select-panel"
          ref={panelRef}
          role="listbox"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
          }}
        >
          <div className="cli-select-search-wrap">
            <Search size={12} className="cli-select-search-icon" />
            <input
              ref={searchRef}
              className="cli-select-search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <div className="cli-select-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="cli-select-empty">No options found</div>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                const isActive = i === activeIndex;
                return (
                  <button
                    type="button"
                    key={o.value}
                    data-idx={i}
                    className={`cli-select-option ${isSelected ? "cli-select-option--selected" : ""} ${isActive ? "cli-select-option--active" : ""}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span className="cli-select-option__label">{o.label}</span>
                    {isSelected && <Check size={14} className="cli-select-option__check" />}
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
};

export default ClientSelect;
