import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "react-bootstrap-icons";
import "./MultiSelectCheckbox.scss";

export interface FilterOption { id: string; label: string; }

interface MultiSelectCheckboxProps {
  label?: React.ReactNode;
  options: FilterOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  containerClass?: string;
  placeholder?: string;
}

// Rough per-row height used to estimate the dropdown's rendered height before
// it's actually in the DOM (can't measure a closed dropdown), so the flip
// decision below can run synchronously in the same click that opens it
// rather than flickering open-then-flip a frame later.
const OPTION_ROW_HEIGHT = 32;
const DROPDOWN_CHROME = 20; // border + margin from the trigger
const DROPDOWN_MAX_HEIGHT = 200;

const MultiSelectCheckbox: React.FC<MultiSelectCheckboxProps> = ({
  label, options, selected, onChange, containerClass = "", placeholder = "All",
}) => {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const handleTriggerClick = () => {
    setOpen(v => {
      const next = !v;
      if (next && triggerRef.current) {
        const estimatedHeight = Math.min(DROPDOWN_MAX_HEIGHT, options.length * OPTION_ROW_HEIGHT) + DROPDOWN_CHROME;
        const { top, bottom } = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - bottom;
        const spaceAbove = top;
        // Prefer opening downward (its usual position); only flip up when
        // there isn't room below AND there's actually more room above —
        // otherwise a very short viewport would flip it up into no space too.
        setOpenUpward(spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
      }
      return next;
    });
  };

  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? (options.find(o => o.id === selected[0])?.label ?? "1 selected")
      : `${selected.length} selected`;

  return (
    <div className={`msc-field ${containerClass}`} ref={rootRef}>
      {label && (
        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
          {label}
        </label>
      )}
      <button type="button" ref={triggerRef} className="msc-trigger" onClick={handleTriggerClick}>
        <span>{summary}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className={`msc-dropdown${openUpward ? " msc-dropdown--up" : ""}`}>
          {options.length === 0 ? (
            <div className="msc-empty">No options</div>
          ) : options.map(o => (
            <label key={o.id} className="msc-option">
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectCheckbox;
