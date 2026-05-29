import { useState, useEffect, useRef } from "react";

export interface CountryOption {
  name: string;
  dialCode: string;
  cca2: string;
  flag: string;
}

interface Props {
  value: string;
  onChange: (country: CountryOption) => void;
}

function toFlagEmoji(cca2: string): string {
  return [...cca2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const DEFAULT_INDIA: CountryOption = {
  name: "India",
  dialCode: "+91",
  cca2: "IN",
  flag: "🇮🇳",
};

export default function CountryPhoneSelect({ value, onChange }: Props) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res  = await fetch("https://restcountries.com/v3.1/all?fields=name,idd,cca2,flags");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const raw: any[] = await res.json();
        const mapped: CountryOption[] = raw
          .filter((c) => c.idd?.root && Array.isArray(c.idd.suffixes) && c.idd.suffixes.length)
          .map((c) => ({
            name:     c.name.common as string,
            dialCode: c.idd.root + (c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : ""),
            cca2:     c.cca2 as string,
            flag:     toFlagEmoji(c.cca2 as string),
          }))
          .filter((c) => c.dialCode.length >= 2)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setCountries(mapped);
      } catch {
        if (!cancelled) setError("Failed to load countries.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

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

  const selected = countries.find((c) => c.dialCode === value) ?? DEFAULT_INDIA;
  const filtered = search.trim()
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.cca2.toLowerCase().includes(search.toLowerCase()),
      )
    : countries;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          height: "100%",
          padding: "0 8px 0 12px",
          border: "none",
          background: "transparent",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.5 : 1,
          minWidth: 82,
          fontSize: 13,
          fontWeight: 500,
          color: "#4b5563",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? (
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Loading…</span>
        ) : (
          <>
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
          </>
        )}
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
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, color: "#dc2626", background: "#fef2f2" }}>
                <svg width="15" height="15" fill="#dc2626" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
                {error}
              </div>
            )}

            {!error && filtered.length === 0 && (
              <div style={{ padding: "12px 16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                No countries found for "{search}"
              </div>
            )}

            {!error && filtered.map((c) => {
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
          {!error && countries.length > 0 && (
            <div style={{ padding: "5px 12px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", fontSize: 11, color: "#9ca3af", textAlign: "right" }}>
              {filtered.length} of {countries.length} countries
            </div>
          )}
        </div>
      )}
    </div>
  );
}
