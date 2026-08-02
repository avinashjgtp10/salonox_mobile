import React, { useEffect, useRef, useState } from "react";
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
}

const MAX_DROPDOWN_HEIGHT = 160; // caps the list at ~5 rows before it scrolls

// Same technique as TimeSelect.tsx: a native <select>'s popup is drawn by the
// browser/OS, so page CSS can't cap how many options show before scrolling —
// a long package/membership list would render as one giant native popup.
// This portal-positioned version computes its own placement, flips above
// when there isn't room below, and caps its own height with an internal
// scrollbar so only ~5 rows show before the list scrolls.
const NameSelect: React.FC<NameSelectProps> = ({
  value,
  options,
  onChange,
  className = "form-select",
  placeholder,
  emptyText = "No options available.",
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    setActiveIndex(Math.max(0, options.findIndex((o) => String(o.id) === String(value))));
    setOpen(true);
  }

  function selectOption(option: NameSelectOption) {
    onChange(option);
    setOpen(false);
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

  // Keep the active (highlighted) option scrolled into view as it changes.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    (el as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openDropdown();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && options[activeIndex]) selectOption(options[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const selectedLabel = options.find((o) => String(o.id) === String(value))?.name || "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={className}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        role="combobox"
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
          role="listbox"
          style={{
            position: "fixed",
            left: pos.left,
            width: pos.width,
            ...(pos.openUpward
              ? { bottom: window.innerHeight - pos.top, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, pos.top - 8) }
              : { top: pos.top, maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, window.innerHeight - pos.top - 8) }),
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 9999,
          }}
        >
          {options.length > 0 ? options.map((o, i) => {
            const isSelected = String(o.id) === String(value);
            const isActive = i === activeIndex;
            return (
              <div
                key={o.id}
                data-idx={i}
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
            <div style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{emptyText}</div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default NameSelect;
