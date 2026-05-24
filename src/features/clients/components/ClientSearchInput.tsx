import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ClockHistory, PersonFill } from "react-bootstrap-icons";
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
}

const RECENT_KEY = "client_recent_searches";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 350;

// ── localStorage helpers ──────────────────────────────────────────────────────

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}
function saveRecent(name: string) {
  const next = [name, ...getRecent().filter((t) => t !== name)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
function removeRecent(name: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter((t) => t !== name)));
}

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
  placeholder = "Search client by 10 digit mobile number",
  highlight = true,
  value,
  onChange,
  disabled,
  hasError,
  onNoResults,
}: Props) {
  const [query, setQuery]       = useState(value ?? "");
  const [results, setResults]   = useState<ClientSearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false); // did we complete at least one search for current query?
  const [error, setError]       = useState<string | null>(null);
  const [touched, setTouched]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [recent, setRecent]     = useState<string[]>(getRecent());

  // userTypedRef is updated synchronously inside the onChange handler,
  // BEFORE React re-renders. This lets the value-sync effect distinguish
  // "parent echoing user's own keystroke" (skip) from "programmatic set" (suppress search).
  const userTypedRef   = useRef(value ?? "");
  const suppressRef    = useRef(false);       // set only on genuine programmatic value changes
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // ── Helpers: cancel pending work ───────────────────────────────────────────

  const cancelPending = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // ── Sync external (programmatic) value changes ─────────────────────────────
  // Only treats it as external when the incoming value differs from what the
  // user last typed. When the parent just echoes back the user's own keystroke,
  // value === userTypedRef.current, so we skip — preventing search suppression.

  useEffect(() => {
    if (value === undefined) return;
    if (value === userTypedRef.current) return; // parent echoing user keystroke — ignore

    // Genuine programmatic update (client created/selected from outside)
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
        cancelPending();           // stop any pending debounce so it can't reopen the dropdown
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
    // Guard: only search for exactly 10-digit mobile number
    if (term.length !== 10 || /^walk.?in$/i.test(term)) {
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
      // ↓ Full backend search: GET /api/v1/clients/search?q=<term>
      // Backend runs: LOWER(full_name) LIKE '%term%' OR LOWER(phone_number) LIKE '%term%'
      const res = await api.get(CLIENT.SEARCH(term), { signal: abortRef.current.signal });

      // Response shape: { data: ClientSearchResult[] }
      const raw = res.data?.data ?? res.data ?? [];
      const resultArray = Array.isArray(raw) ? raw : [];
      setResults(resultArray);
      setSearched(true);
      if (resultArray.length === 0) {
        onNoResults?.(term);
      }
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setError("Search failed. Check your connection and try again.");
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounce: fire search 350ms after query changes ────────────────────────

  useEffect(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }

    // Programmatic update: value effect already handled everything
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
    // Only trigger search when exactly 10 digits entered
    if (query.length !== 10) {
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
    saveRecent(name);
    setRecent(getRecent());
    userTypedRef.current = name;
    setQuery(name);
    setOpen(false);
    setResults([]);
    setSearched(false);
    onChange?.(name);   // update parent first, then notify select
    onSelect?.(client);
  };

  const handleRecentClick = (term: string) => {
    userTypedRef.current = term;
    setQuery(term);
    setOpen(true);
    onChange?.(term);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeRecent(term);
    setRecent(getRecent());
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

  // ── Dropdown visibility logic ──────────────────────────────────────────────
  // - open=true + query >= 2 chars: show search area (loading / results / empty)
  // - open=true + query empty + recent items exist: show recent list

  const showDropdown = open && (query.length === 10 || (query.length === 0 && recent.length > 0));

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
        style={{ padding: 0 }}
      >
        <Search
          size={15}
          className="search-icon"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          ref={inputRef}
          type="text"
          className="client-search-input"
          style={{ padding: "10px 14px 10px 36px", height: "100%", width: "100%", borderRadius: 10 }}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          id="client-search-field"
          onChange={(e) => {
            // restrict input: allow only digits, max 10
            let val = e.target.value.replace(/\D/g, "").slice(0, 10);
            userTypedRef.current = val;
            setQuery(val);
            setTouched(true);
            onChange?.(val);
            // Open dropdown only when 10 digits (search) or empty (recents)
            setOpen(val.length === 10 || val.length === 0);
            // clear validation error when full 10 digits entered
            if (val.length === 10) setError(null);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onBlur={() => {
            // Cancel pending debounce so search can't reopen dropdown after blur.
            // (onMouseDown+preventDefault on results keeps focus during selection,
            //  so onBlur only fires on genuine focus-away: Tab, click elsewhere.)
            cancelPending();
            // show validation if incomplete
            if (query.length > 0 && query.length < 10) setError("Please enter exactly 10 digits");
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
        {/* Inline validation error */}
        {error && (
          <div className="client-search-error">{error}</div>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div className="client-search-dropdown" role="listbox" aria-label="Client search results">

          {/* Recent searches — only when input is empty */}
          {query.length === 0 && recent.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Recent searches</div>
              {recent.map((term) => (
                <div
                  key={term}
                  className="search-result-item recent-item"
                  role="option"
                  onMouseDown={(e) => { e.preventDefault(); handleRecentClick(term); }}
                >
                  <ClockHistory size={14} className="result-icon recent-icon" />
                  <span className="result-name">{term}</span>
                  <button
                    type="button"
                    className="remove-recent-btn"
                    aria-label={`Remove ${term}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleRemoveRecent(e, term)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search results area */}
          {query.length >= 2 && (
            <>
              {/* Loading spinner */}
              {loading && (
                <div className="search-state-msg">
                  <div className="loading-dots"><span /><span /><span /></div>
                  <span>Searching backend…</span>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="search-state-msg search-error">{error}</div>
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
                      <div
                        key={client.id}
                        className="search-result-item"
                        role="option"
                        aria-selected="false"
                        // onMouseDown+preventDefault: keeps input focused so onBlur
                        // doesn't cancel the selection before handleSelect runs
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
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty — only shown AFTER search has completed, not during debounce wait */}
              {!loading && !error && searched && results.length === 0 && (
                <div className="search-state-msg search-empty">
                  <PersonFill size={28} className="empty-icon" />
                  <span>No clients found for "<strong>{query}</strong>"</span>
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  );
}
