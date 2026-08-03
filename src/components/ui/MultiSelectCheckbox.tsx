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

const MultiSelectCheckbox: React.FC<MultiSelectCheckboxProps> = ({
  label, options, selected, onChange, containerClass = "", placeholder = "All",
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
      <button type="button" className="msc-trigger" onClick={() => setOpen(v => !v)}>
        <span>{summary}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="msc-dropdown">
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
