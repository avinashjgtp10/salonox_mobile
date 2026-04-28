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
  /** Highlight matching text in results */
  highlight?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const RECENT_SEARCHES_KEY = "client_recent_searches";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  const prev = getRecent().filter((t) => t !== term);
  const next = [term, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

function removeRecent(term: string) {
  const next = getRecent().filter((t) => t !== term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function ClientSearchInput({
  onSelect,
  placeholder = "Search by Name / Phone (min 2 chars)",
  highlight = true,
  value,
  onChange,
  disabled,
  hasError,
}: Props) {
  const [query, setQuery] = useState(value || "");

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ─── Close on outside click ─────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─── Debounced search ───────────────────────────────── */
  const search = useCallback(async (term: string) => {
    if (term.length < 2 || term.toLowerCase() === "walk-in" || term.toLowerCase() === "walk in") {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setOpen(true);

    try {
      const res = await api.get(CLIENT.SEARCH(term), {
        signal: abortRef.current.signal,
      });

      const data: ClientSearchResult[] = res.data?.data || res.data || [];
      setResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setError("Failed to fetch results. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─── Wire debounce to query changes ────────────────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length === 0) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => search(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  /* ─── Handlers ───────────────────────────────────────── */
  const handleSelect = (client: ClientSearchResult) => {
    onSelect?.(client);
    const name = `${client.first_name} ${client.last_name || ""}`.trim();
    saveRecent(name);
    setRecentSearches(getRecent());
    setQuery(name);
    onChange?.(name);
    setOpen(false);
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    onChange?.(term);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeRecent(term);
    setRecentSearches(getRecent());
  };

  const handleClear = () => {
    if (disabled) return;
    setQuery("");
    onChange?.("");
    setResults([]);
    setError(null);
    setOpen(false);
    abortRef.current?.abort();
    inputRef.current?.focus();
  };

  const showDropdown =
    open && (query.length >= 2 || (query.length === 0 && recentSearches.length > 0));

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div className="client-search-wrapper" ref={containerRef} style={{ position: "relative" }}>
      {/* Input */}
      <div className={`client-search-input-box ${open ? "focused" : ""} ${hasError ? "has-error" : ""} ${disabled ? "disabled" : ""}`} style={{ padding: 0 }}>
        <Search size={15} className="search-icon" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
        <input
          ref={inputRef}
          type="text"
          className="client-search-input"
          style={{ padding: "10px 14px 10px 36px", height: "100%", width: "100%", borderRadius: "10px" }}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange?.(e.target.value);
            if (e.target.value.length >= 2 || e.target.value.length === 0) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          autoComplete="off"
          spellCheck={false}
          id="client-search-field"
        />
        {loading && (
          <span className="search-spinner" aria-label="Searching…">
            <span className="spinner-dot" />
          </span>
        )}
        {query && !loading && (
          <button
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="client-search-dropdown" role="listbox" aria-label="Search results">
          {/* Recent searches (only when field is empty) */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Recent searches</div>
              {recentSearches.map((term) => (
                <div
                  key={term}
                  className="search-result-item recent-item"
                  onClick={() => handleRecentClick(term)}
                  role="option"
                >
                  <ClockHistory size={14} className="result-icon recent-icon" />
                  <span className="result-name">{term}</span>
                  <button
                    className="remove-recent-btn"
                    onClick={(e) => handleRemoveRecent(e, term)}
                    aria-label={`Remove ${term} from recent`}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {query.length >= 2 && (
            <>
              {loading && (
                <div className="search-state-msg">
                  <div className="loading-dots">
                    <span /><span /><span />
                  </div>
                  <span>Searching…</span>
                </div>
              )}

              {!loading && error && (
                <div className="search-state-msg search-error">{error}</div>
              )}

              {!loading && !error && results.length === 0 && (
                <div className="search-state-msg search-empty">
                  <PersonFill size={28} className="empty-icon" />
                  <span>No clients found for "<strong>{query}</strong>"</span>
                </div>
              )}

              {!loading && !error && results.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </div>
                  {results.map((client) => {
                    const fullName = `${client.first_name} ${client.last_name || ""}`.trim();
                    return (
                      <div
                        key={client.id}
                        className="search-result-item"
                        onClick={() => handleSelect(client)}
                        role="option"
                        aria-selected="false"
                      >
                        <div className="result-avatar">
                          {(client.first_name?.[0] || "C").toUpperCase()}
                        </div>
                        <div className="result-details">
                          <div className="result-name">
                            {highlight ? (
                              <HighlightText text={fullName} query={query} />
                            ) : (
                              fullName
                            )}
                          </div>
                          <div className="result-meta">
                            {client.phone_number && (
                              <span className="result-phone">
                                {highlight ? (
                                  <HighlightText text={client.phone_number} query={query} />
                                ) : (
                                  client.phone_number
                                )}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
