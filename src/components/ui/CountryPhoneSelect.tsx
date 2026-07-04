import { useState, useEffect, useRef } from "react";
import { COUNTRIES } from "./countryData";
import "./styles/CountryPhoneSelect.scss";

export type { CountryOption } from "./countryData";

const DEFAULT_INDIA = COUNTRIES.find((c) => c.cca2 === "IN")!;

interface Props {
  /** ISO 3166-1 alpha-2 code (e.g. "IN", "US"). Dial codes aren't unique
   *  across countries (US/CA both use "+1"), so the selection is keyed by
   *  the country code rather than the dial code. */
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

  const selected = COUNTRIES.find((c) => c.cca2 === value) ?? DEFAULT_INDIA;
  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.cca2.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRIES;

  return (
    <div ref={wrapperRef} className="ui-country-select">
      {/* Trigger button */}
      <button type="button" className="ui-country-select__trigger" onClick={() => setOpen((v) => !v)}>
        <span className="ui-country-select__trigger-code">{selected.cca2}</span>
        <span className="ui-country-select__trigger-dial">{selected.dialCode}</span>
        <svg
          width="10" height="10"
          viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
          className={`ui-country-select__chevron${open ? " ui-country-select__chevron--open" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="ui-country-select__panel">
          {/* Search bar */}
          <div className="ui-country-select__search-bar">
            <div className="ui-country-select__search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="ui-country-select__search-icon">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                className="ui-country-select__search-input"
                placeholder="Search country or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="ui-country-select__clear-btn"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Country list */}
          <div ref={listRef} className="ui-country-select__list">
            {filtered.length === 0 && (
              <div className="ui-country-select__empty">
                No countries found for "{search}"
              </div>
            )}

            {filtered.map((c) => {
              const isSel = c.cca2 === selected.cca2;
              return (
                <button
                  key={c.cca2}
                  type="button"
                  data-selected={isSel}
                  className={`ui-country-select__option${isSel ? " ui-country-select__option--selected" : ""}`}
                  onClick={() => { onChange(c); setOpen(false); setSearch(""); }}
                >
                  <span className="ui-country-select__option-code">{c.cca2}</span>
                  <span className="ui-country-select__option-name">{c.name}</span>
                  <span className={`ui-country-select__option-dial${isSel ? " ui-country-select__option-dial--selected" : ""}`}>
                    {c.dialCode}
                  </span>
                  {isSel && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" className="ui-country-select__check-icon">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="ui-country-select__footer">
            {filtered.length} of {COUNTRIES.length} countries
          </div>
        </div>
      )}
    </div>
  );
}
