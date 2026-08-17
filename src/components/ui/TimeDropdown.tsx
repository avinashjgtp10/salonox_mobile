import { useState, useRef, useEffect } from "react";
import "./TimeDropdown.scss";

// A native <select>'s dropdown is positioned by the browser/OS with no way for
// us to control it — with e.g. 60 minute options opened from a field near the
// bottom of a modal, it can flip upward and stretch almost the full screen
// height, off past the top of the viewport. This custom listbox is positioned
// from the trigger's own bounding rect, flips above/below based on actual
// available space, and is always height-capped with internal scroll — so it
// can never extend past the viewport. Originally built for the Attendance
// page's Check-in/Check-out time fields; kept fully generic (plain string
// options) so it also drives things like a deployment-duration picker.
const TIME_DD_MAX_HEIGHT = 200;

export interface TimeDropdownProps {
  value: string;
  options: string[];
  ariaLabel: string;
  onChange: (v: string) => void;
}

export default function TimeDropdown({ value, options, ariaLabel, onChange }: TimeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: TIME_DD_MAX_HEIGHT });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openDropdown = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    // The trigger itself can be quite narrow (fields squeezed side by side) —
    // clamp the panel to a legible minimum so two-digit values never
    // wrap/overflow and force scrollbars in both directions.
    const width = Math.max(rect.width, 64);
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < TIME_DD_MAX_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = Math.min(TIME_DD_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow);
    const top = openUp ? rect.top - maxHeight - 4 : rect.bottom + 4;
    const left = Math.min(rect.left, window.innerWidth - width - margin);
    setPos({ top, left: Math.max(margin, left), width, maxHeight });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });

    // Only resize invalidates the computed position — a plain "scroll"
    // listener here would also fire (and immediately close the dropdown)
    // from scrolling inside the list itself, since scroll events bubble
    // through window even in the capture phase.
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);

  return (
    <div className="at-time-dd">
      <button
        type="button"
        ref={triggerRef}
        className="at-time-dd__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        onClick={() => (open ? setOpen(false) : openDropdown())}
      >
        {value}
      </button>
      {open && (
        <>
          <div className="at-time-dd__backdrop" onClick={() => setOpen(false)} />
          <div
            ref={listRef}
            className="at-time-dd__list"
            role="listbox"
            aria-label={ariaLabel}
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
          >
            {options.map((opt) => (
              <div
                key={opt}
                role="option"
                aria-selected={opt === value}
                data-selected={opt === value}
                className={`at-time-dd__opt${opt === value ? " at-time-dd__opt--active" : ""}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
