import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { generateTimeSlots, formatTime12 } from "../../utils/timeUtils";
import type { IntervalOption } from "../../types/scheduler-types";

interface TimeSelectProps {
  value: string;
  onChange: (val: string) => void;
  interval?: IntervalOption;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const MAX_DROPDOWN_HEIGHT = 260;

// Custom dropdown (not a native <select>) — a native select's popup is drawn
// by the browser/OS, not by CSS, so it can render outside the page's own
// viewport (even over the browser's own chrome) with no way for this app to
// constrain it. This portal-positioned version computes its own placement
// against the trigger's real position, flips above when there isn't room
// below, and caps its own height with an internal scrollbar — so it always
// stays fully on screen and fully reachable, matching every other custom
// dropdown already used elsewhere in this app (e.g. the product/package
// search lists).
const TimeSelect: React.FC<TimeSelectProps> = ({
  value,
  onChange,
  interval = "15 Mins",
  className = "form-select",
  placeholder,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const slots = useMemo(() => generateTimeSlots(interval), [interval]);
  // If the current value falls between slot boundaries (e.g. cascade produced "09:30"
  // but interval is "60 Mins"), inject it so the list doesn't silently omit it.
  // Guard: only inject if it's a valid HH:MM string to prevent ISO dates or other
  // garbage values from rendering as "--:--" in the dropdown.
  const isValidHhmm = /^\d{2}:\d{2}$/.test(value);
  const allSlots = useMemo(
    () => (value && isValidHhmm && !slots.includes(value) ? [...slots, value].sort() : slots),
    [slots, value, isValidHhmm]
  );

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
    setActiveIndex(Math.max(0, allSlots.indexOf(value)));
    setOpen(true);
  }

  function selectValue(v: string) {
    onChange(v);
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
      setActiveIndex((i) => Math.min(allSlots.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && allSlots[activeIndex]) selectValue(allSlots[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const displayLabel = value && isValidHhmm ? formatTime12(value) : (placeholder || "");

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
          color: value ? undefined : "#6b7280",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayLabel || " "}
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
          {allSlots.map((t, i) => {
            const isSelected = t === value;
            const isActive = i === activeIndex;
            return (
              <div
                key={t}
                data-idx={i}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => { e.preventDefault(); selectValue(t); }}
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
                {formatTime12(t)}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default TimeSelect;
