import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, PersonFill } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import "../styles/ClientSearchInput.scss";

export interface ClientSearchResult {
  id: number | string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
}

interface Props {
  onSelect?: (client: ClientSearchResult) => void;
  placeholder?: string;
  highlight?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  onNoResults?: (query: string) => void;
  /** Suppress the floating results dropdown — use when the caller filters
   *  its own list (e.g. a table) from `onChange` instead of picking from here. */
  hideDropdown?: boolean;
}

const DEBOUNCE_MS = 350;

// ── Highlight matching substring ──────────────────────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="search-highlight">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientSearchInput({
  onSelect,
  placeholder = "Search client by name or mobile number",
  highlight = true,
  value,
  onChange,
  disabled,
  hasError,
  onNoResults,
  hideDropdown,
}: Props) {
  const [query, setQuery]       = useState(value ?? "");
  const [results, setResults]   = useState<ClientSearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [open, setOpen]         = useState(false);

  const userTypedRef    = useRef(value ?? "");
  const suppressRef     = useRef(false);
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef        = useRef<AbortController | null>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const onNoResultsRef  = useRef(onNoResults);
  useEffect(() => { onNoResultsRef.current = onNoResults; }, [onNoResults]);

  // ── Helpers: cancel pending work ───────────────────────────────────────────

  const cancelPending = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // ── Sync external (programmatic) value changes ─────────────────────────────

  useEffect(() => {
    if (value === undefined) return;
    if (value === userTypedRef.current) return;

    suppressRef.current = true;
    userTypedRef.current = value;
    cancelPending();
    setQuery(value);
    setOpen(false);
    setResults([]);
    setSearched(false);
    setError(null);
  }, [value, cancelPending]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close dropdown on outside click / touch ────────────────────────────────

  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        cancelPending();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [cancelPending]);

  // ── Backend search ─────────────────────────────────────────────────────────

  const search = useCallback(async (term: string) => {
    if (hideDropdown) return;
    if (term.length < 3 || /^walk.?in$/i.test(term)) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setSearched(false);
    setError(null);

    try {
      const res = await api.get(CLIENT.SEARCH(term), { signal: abortRef.current.signal });
      const raw = res.data?.data ?? res.data ?? [];
      const resultArray = Array.isArray(raw) ? raw : [];
      setResults(resultArray);
      setSearched(true);
      if (resultArray.length === 0) {
        onNoResultsRef.current?.(term);
      }
    } catch (err: any) {
      if (
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        err?.code === "ERR_CANCELED" ||
        err?.message === "canceled"
      ) return;
      setError("Search failed. Check your connection and try again.");
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [hideDropdown]);

  // ── Cancel pending work on unmount ─────────────────────────────────────────
  useEffect(() => () => cancelPending(), [cancelPending]);

  // ── Debounce: fire search 350ms after query changes ────────────────────────

  useEffect(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }

    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }

    setSearched(false);

    if (query.length === 0) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (query.length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    };
  }, [query, search]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelect = (client: ClientSearchResult) => {
    cancelPending();
    const name = `${client.first_name} ${client.last_name ?? ""}`.trim();
    userTypedRef.current = name;
    setQuery(name);
    setOpen(false);
    setResults([]);
    setSearched(false);
    onChange?.(name);
    onSelect?.(client);
  };

  const handleClear = () => {
    if (disabled) return;
    cancelPending();
    userTypedRef.current = "";
    setQuery("");
    setResults([]);
    setSearched(false);
    setError(null);
    setOpen(false);
    onChange?.("");
    inputRef.current?.focus();
  };

  const showDropdown = !hideDropdown && open && query.length >= 3;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="client-search-wrapper" ref={containerRef}>

      {/* ── Input box ── */}
      <div
        className={[
          "client-search-input-box",
          open      ? "focused"   : "",
          hasError  ? "has-error" : "",
          disabled  ? "disabled"  : "",
        ].filter(Boolean).join(" ")}
      >
        <Search
          size={15}
          className="search-icon"
        />
        <input
          ref={inputRef}
          type="text"
          className="client-search-input"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          id="client-search-field"
          onChange={(e) => {
            let val = e.target.value;
            const isPhoneInput = /^\d+$/.test(val);
            if (isPhoneInput && val.length > 10) return;
            userTypedRef.current = val;
            setQuery(val);
            onChange?.(val);
            setOpen(val.length >= 3);
            if (val.length >= 3) setError(null);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onBlur={() => {
            cancelPending();
            if (query.length > 0 && query.length < 3) setError("Please enter at least 3 characters");
          }}
        />

        {loading && (
          <span className="search-spinner" aria-label="Searching…">
            <span className="spinner-dot" />
          </span>
        )}

        {query && !loading && (
          <button className="search-clear-btn" type="button" aria-label="Clear" onClick={handleClear}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Error below input ── */}
      {error && (
        <div className="client-search-error">{error}</div>
      )}

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div className="client-search-dropdown" aria-label="Client search results">

          {/* Loading spinner */}
          {loading && (
            <div className="search-state-msg">
              <div className="loading-dots"><span /><span /><span /></div>
              <span>Searching backend…</span>
            </div>
          )}

          {/* Results */}
          {!loading && !error && searched && results.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">
                {results.length} client{results.length !== 1 ? "s" : ""} found
              </div>
              {results.map((client) => {
                const fullName = `${client.first_name} ${client.last_name ?? ""}`.trim();
                return (
                  <button
                    key={client.id}
                    type="button"
                    className="search-result-item"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(client); }}
                  >
                    <div className="result-avatar">
                      {(client.first_name?.[0] ?? "C").toUpperCase()}
                    </div>
                    <div className="result-details">
                      <div className="result-name">
                        {highlight
                          ? <HighlightText text={fullName} query={query} />
                          : fullName}
                      </div>
                      <div className="result-meta">
                        {client.phone_number && (
                          <span className="result-phone">
                            {highlight
                              ? <HighlightText text={client.phone_number} query={query} />
                              : client.phone_number}
                          </span>
                        )}
                        {client.email && (
                          <span className="result-email">{client.email}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && searched && results.length === 0 && (
            <div className="search-state-msg search-empty">
              <PersonFill size={28} className="empty-icon" />
              <span>
                No clients found for{" "}
                <strong
                  className="search-empty-query"
                  title="Click to use this number"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onNoResultsRef.current?.(query);
                    setOpen(false);
                  }}
                >
                  "{query}"
                </strong>
              </span>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
