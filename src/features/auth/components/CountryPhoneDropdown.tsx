import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Country } from "country-state-city";

interface CountryInfo {
  name: string;
  code: string;
  dialCode: string;
}

interface Props {
  country: string;
  countryName: string;
  countryCode: string;
  phone: string;
  onChange: (data: { country: string; countryName: string; countryCode: string; phone: string }) => void;
  error?: string;
  onBlur?: () => void;
}

// Bundled dataset (no network call) — this used to fetch from
// restcountries.com on every page load, which is a third-party service with
// no SLA; any outage/rate-limit/CORS block there showed "Failed to load
// countries" on Register with no way to recover short of a retry. Same
// package AddClientPage.tsx already uses for its own country/phone-code list.
const COUNTRIES: CountryInfo[] = Country.getAllCountries()
  .map((c) => ({
    name: c.name,
    code: c.isoCode,
    dialCode: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
  }))
  .filter((c) => c.dialCode && c.code)
  .sort((a, b) => a.name.localeCompare(b.name));

const flagUrl = (code: string) =>
  `https://flagcdn.com/20x15/${code.toLowerCase()}.png`;

export default function CountryPhoneDropdown({
  country,
  countryName,
  countryCode,
  phone,
  onChange,
  error,
  onBlur,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const panel = document.getElementById("cpd-panel");
      const trigger = triggerRef.current;
      if (panel && !panel.contains(target) && trigger && !trigger.contains(target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const selected = COUNTRIES.find((c) => c.code === country);

  const handleSelect = (c: CountryInfo) => {
    onChange({ country: c.code, countryName: c.name, countryCode: c.dialCode, phone });
    setOpen(false);
    setSearch("");
  };

  const dropdown = open && createPortal(
    <div
      id="cpd-panel"
      style={{
        position: "absolute",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        minWidth: "260px",
        background: "#fff",
        border: "1.5px solid #E8E4DE",
        borderRadius: "10px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
        zIndex: 999999,
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <div style={{ padding: "8px", borderBottom: "1px solid #F3F4F6" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: "#F9F8F6",
            border: "1px solid #E8E4DE",
            borderRadius: "7px",
            padding: "6px 10px",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#9CA3AF" strokeWidth="1.4" />
            <line x1="9.5" y1="9.5" x2="12" y2="12" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search country or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              fontSize: "13px",
              color: "#374151",
              background: "transparent",
              border: "none",
              outline: "none",
              minWidth: 0,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "#9CA3AF",
                fontSize: "16px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Country list */}
      <div style={{ maxHeight: "220px", overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <p style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
            No results found
          </p>
        ) : (
          filtered.map((c) => {
            const isSelected = c.code === country;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelect(c)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  background: isSelected ? "#F9F8F6" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#F3F4F6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = isSelected ? "#F9F8F6" : "transparent";
                }}
              >
                <img
                  src={flagUrl(c.code)}
                  alt={c.name}
                  width={20}
                  height={15}
                  style={{ borderRadius: "2px", flexShrink: 0, objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span style={{ flex: 1, fontSize: "13px", color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </span>
                <span style={{ fontSize: "12px", color: "#9CA3AF", flexShrink: 0 }}>
                  {c.dialCode}
                </span>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <polyline points="2,6 5,9 10,3" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* ── Trigger row ── */}
      <div
        ref={triggerRef}
        style={{
          display: "flex",
          alignItems: "center",
          border: `1.5px solid ${error ? "#E05C5C" : "#E8E4DE"}`,
          borderRadius: "8px",
          background: "#fff",
          height: "44px",
          overflow: "hidden",
        }}
      >
        {/* Country selector button */}
        <button
          type="button"
          onClick={() => (open ? (setOpen(false), setSearch("")) : openDropdown())}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 10px",
            height: "100%",
            background: "#F9F8F6",
            border: "none",
            borderRight: "1.5px solid #E8E4DE",
            cursor: "pointer",
            flexShrink: 0,
            outline: "none",
            minWidth: "88px",
          }}
        >
          <img
            src={flagUrl(selected?.code ?? country)}
            alt={selected?.name ?? countryName}
            width={20}
            height={15}
            style={{ borderRadius: "2px", flexShrink: 0, objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
            {selected?.dialCode ?? countryCode}
          </span>
          <svg
            width="9"
            height="5"
            viewBox="0 0 9 5"
            fill="none"
            style={{
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.18s ease",
            }}
          >
            <path d="M1 1l3.5 3L8 1" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Phone input */}
        <input
          id="rp-phone"
          type="tel"
          placeholder="Mobile number"
          value={phone}
          minLength={5}
          maxLength={11}
          onBlur={onBlur}
          name="phone"
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onChange({ country, countryName, countryCode, phone: digits });
          }}
          style={{
            flex: 1,
            height: "100%",
            padding: "0 12px",
            fontSize: "14px",
            color: "#1F2937",
            background: "transparent",
            border: "none",
            outline: "none",
          }}
        />
      </div>

      {dropdown}
    </div>
  );
}
