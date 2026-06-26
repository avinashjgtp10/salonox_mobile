import { useState, useEffect, useRef } from "react";
import { COUNTRIES } from "./countryData";

export type { CountryOption } from "./countryData";

const DEFAULT_INDIA = COUNTRIES.find((c) => c.cca2 === "IN")!;

interface Props {
  value: string;
  onChange: (country: import("./countryData").CountryOption) => void;
}

export default function CountryPhoneSelect({ value, onChange }: Props) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
      const selected = listRef.current?.querySelector("[data-selected='true']");
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  const selected = COUNTRIES.find((c) => c.dialCode === value) ?? DEFAULT_INDIA;
  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.cca2.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRIES;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          height: "100%",
          padding: "0 8px 0 12px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          minWidth: 82,
          fontSize: 13,
          fontWeight: 500,
          color: "#4b5563",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#4b5563" }}>
          {selected.cca2}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: "#374151" }}>
          {selected.dialCode}
        </span>
        <svg
          width="10" height="10"
          viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
          style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute",
          left: 0,
          top: "calc(100% + 4px)",
          zIndex: 9999,
          width: 288,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}>
          {/* Search bar */}
          <div style={{ padding: 8, borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: "#111827",
                }}
                placeholder="Search country or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Country list */}
          <div ref={listRef} style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "12px 16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                No countries found for "{search}"
              </div>
            )}

            {filtered.map((c) => {
              const isSel = c.dialCode === value && c.cca2 === selected.cca2;
              return (
                <button
                  key={c.cca2}
                  type="button"
                  data-selected={isSel}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 14px",
                    border: "none",
                    borderBottom: "1px solid #f9fafb",
                    background: isSel ? "#eff6ff" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: isSel ? "#1d4ed8" : "#1f2937",
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "#f9fafb"; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                  onClick={() => { onChange(c); setOpen(false); setSearch(""); }}
                >
                  <span style={{ width: 28, textAlign: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.05em" }}>
                    {c.cca2}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: isSel ? "#2563eb" : "#6b7280" }}>
                    {c.dialCode}
                  </span>
                  {isSel && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "5px 12px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", fontSize: 11, color: "#9ca3af", textAlign: "right" }}>
            {filtered.length} of {COUNTRIES.length} countries
          </div>
        </div>
      )}
    </div>
  );
}
