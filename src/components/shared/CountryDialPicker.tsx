import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { COUNTRIES } from "../ui/countryData";

export interface CountryOption {
  name: string;
  dialCode: string;
  cca2: string;
  flagUrl: string;
}

interface Props {
  value: CountryOption;
  onChange: (country: CountryOption) => void;
}

function toFlagUrl(cca2: string): string {
  return `https://flagcdn.com/w20/${cca2.toLowerCase()}.png`;
}

export const INDIA: CountryOption = {
  name: "India",
  dialCode: "+91",
  cca2: "IN",
  flagUrl: toFlagUrl("IN"),
};

export default function CountryDialPicker({ value, onChange }: Props) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  const countries = useMemo<CountryOption[]>(
    () => COUNTRIES.map((c) => ({ name: c.name, dialCode: c.dialCode, cca2: c.cca2, flagUrl: toFlagUrl(c.cca2) })),
    [],
  );

  function openDropdown() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropPos({
      top:  rect.bottom + window.scrollY + 4,
      left: rect.left   + window.scrollX,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropRef.current?.contains(target)
      ) return;
      setOpen(false);
      setSearch("");
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search)
  );

  return (
    <>
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        style={{
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          height: 38,
          minWidth: 82,
          padding: "0 10px",
          background: "#f9fafb",
          border: "none",
          borderRight: "1px solid #e5e7eb",
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontFamily: "inherit",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <img
          src={value.flagUrl}
          alt={value.name}
          width={20}
          height={14}
          style={{ display: "block", borderRadius: 2, flexShrink: 0, objectFit: "cover" }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", lineHeight: 1 }}>
          {value.dialCode}
        </span>
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none"
          stroke="#9ca3af" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
          style={{ display: "block", flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Dropdown via Portal (bypasses all overflow:hidden ancestors) ── */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: "absolute",
            top: dropPos.top,
            left: dropPos.left,
            zIndex: 99999,
            width: 280,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
            overflow: "hidden",
            fontFamily: "Inter, -apple-system, sans-serif",
          }}
        >
          {/* Search */}
          <div style={{ padding: "10px", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code…"
              style={{
                width: "100%",
                padding: "6px 12px",
                fontSize: 13,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                outline: "none",
                background: "#fff",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* List */}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <li style={{ padding: "14px 16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                No results found
              </li>
            ) : (
              filtered.map((c) => (
                <li
                  key={c.cca2}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(c);
                    setOpen(false);
                    setSearch("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    background: c.cca2 === value.cca2 ? "#eef2ff" : "#fff",
                    fontWeight: c.cca2 === value.cca2 ? 600 : 400,
                    borderBottom: "1px solid #f9fafb",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (c.cca2 !== value.cca2)
                      (e.currentTarget as HTMLLIElement).style.background = "#f5f7ff";
                  }}
                  onMouseLeave={(e) => {
                    if (c.cca2 !== value.cca2)
                      (e.currentTarget as HTMLLIElement).style.background = "#fff";
                  }}
                >
                  <img src={c.flagUrl} alt={c.name} width={22} height={16}
                    style={{ display: "block", borderRadius: 2, flexShrink: 0, objectFit: "cover" }}
                  />
                  <span style={{ flex: 1, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </span>
                  <span style={{ color: "#6366f1", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                    {c.dialCode}
                  </span>
                  {c.cca2 === value.cca2 && (
                    <span style={{ color: "#6366f1", fontSize: 11 }}>✓</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
