import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Client } from "../../types";
import type { ClientStats } from "../../types";
import { ClientStatCard } from "../shared/ClientStatCard";
import { useClientDetails } from "../../hooks/useClientDetails";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { selectBookings } from "../../../../store/selectors/scheduler.selectors";
import { useListClientPackagesQuery } from "../../../../services/api/endpoints/packages.endpoints";
import { useClientMembershipWallet } from "../../hooks/useClientMembershipWallet";
import api from "../../../../services/api/axios";
import "../../styles/AppointmentModal.scss";

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#84cc16",
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length];
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query || query.length < 3 || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="client-dropdown__highlight">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function highlightPhone(phone: string, query: string): React.ReactNode {
  if (!query || query.length < 3) return phone;
  const cleanQuery = query.replace(/[^\d+]/g, "");
  if (!cleanQuery) return phone;
  const idx = phone.indexOf(cleanQuery);
  if (idx === -1) return phone;
  return (
    <>
      {phone.slice(0, idx)}
      <span className="client-dropdown__highlight">{phone.slice(idx, idx + cleanQuery.length)}</span>
      {phone.slice(idx + cleanQuery.length)}
    </>
  );
}

interface Props {
  salonId?: string;
  calDate: string;
  onDateChange: (date: string) => void;
  selectedClientId: string | null;
  initialName?: string;
  fallbackUnpaidAmt?: number;
  onSelectClient: (client: Client) => void;
  onClearClient: () => void;
  onStatsLoaded?: (stats: ClientStats) => void;
  historyUrlBase?: string;
  error?: string;
  defaultName?: string;
  defaultPhone?: string;
  openAddForm?: boolean;
}

export const ClientPanel: React.FC<Props> = ({
  salonId, calDate, onDateChange, selectedClientId,
  fallbackUnpaidAmt,
  onSelectClient, onClearClient, onStatsLoaded, error, defaultName, defaultPhone, openAddForm,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState(selectedClientId === "walk-in" ? "Walk In" : "");
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [showDrop, setShowDrop] = useState(false);
  const [showAddForm, setShowAddForm] = useState(!!defaultName || !!defaultPhone);
  const [addFirst, setAddFirst] = useState(defaultName ?? "");
  const [addLast, setAddLast] = useState("");
  const [addPhone, setAddPhone] = useState(defaultPhone ?? "");
  const [addGender, setAddGender] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addErrors, setAddErrors] = useState<{ first?: string; phone?: string; gender?: string }>({});
  const [noResults, setNoResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const skipNextClear = useRef(false);
  // Prevents the initial search effect from clearing the defaultName/defaultPhone pre-fill on mount
  const skipInitialClear = useRef(!!defaultName || !!defaultPhone);

  useEffect(() => { if (openAddForm) setShowAddForm(true); }, [openAddForm]);

  const { details, stats, loading: statsLoading } = useClientDetails(selectedClientId);
  const allBookings = useAppSelector(selectBookings);

  const clientIdForPkg = selectedClientId && selectedClientId !== "walk-in" ? selectedClientId : undefined;
  const { data: clientPkgsData } = useListClientPackagesQuery(
    { clientId: clientIdForPkg, status: "Active", limit: 50 },
    { skip: !clientIdForPkg },
  );

  const { memberships: clientMemberships } = useClientMembershipWallet(clientIdForPkg);

  // Calculate real unpaid amount from Redux — API always returns 0.
  // Falls back to the existingBooking's dueAmount when Redux doesn't have the booking yet.
  const unpaidAmt = useMemo(() => {
    if (!selectedClientId || selectedClientId === "walk-in") return 0;
    const reduxTotal = allBookings
      .filter((b) => {
        const bid = String(b.clientId || (b as any).client_id || "");
        return bid && bid === String(selectedClientId) && Number(b.dueAmount) >= 1;
      })
      .reduce((sum, b) => sum + Number(b.dueAmount), 0);
    return reduxTotal > 0 ? reduxTotal : (fallbackUnpaidAmt ?? 0);
  }, [allBookings, selectedClientId, fallbackUnpaidAmt]);

  useEffect(() => {
    if (stats) onStatsLoaded?.({ ...stats, unpaidAmt });
  }, [stats, unpaidAmt, onStatsLoaded]);


  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function clearPrefill() {
    setAddFirst(""); setAddPhone(""); setAddLast(""); setAddGender(""); setAddErrors({});
  }

  useEffect(() => {
    if (search.length < 3) {
      setSuggestions([]); setNoResults(false); setSearching(false);
      if (skipInitialClear.current) {
        skipInitialClear.current = false;
      } else if (skipNextClear.current) {
        skipNextClear.current = false;
      } else {
        clearPrefill();
      }
      return;
    }
    if (search === "Walk In") return;
    let cancelled = false;
    if (skipNextSearch.current) { skipNextSearch.current = false; return; }
    setSearching(true);
    setShowDrop(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(search)}&salon_id=${salonId || ""}`);
        if (cancelled) return;
        const raw = res.data?.data ?? res.data ?? [];
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        setTotalFound(raw.total ?? items.length);
        setSuggestions(items.slice(0, 20).map((c: any): Client => ({
          id: String(c.id),
          name: c.full_name || c.fullName || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "",
          phone: (c.phone || c.phone_number || "").replace(/[^\d+]/g, ""),
          eWallet: c.wallet_balance || 0,
        })));
        if (items.length === 0) {
          setNoResults(true);
          const isPhone = /^\d+$/.test(search);
          setAddPhone(isPhone ? search : "");
          setAddFirst(!isPhone ? search : "");
          setAddLast("");
          setAddGender("");
          setAddErrors({});
        } else {
          setNoResults(false);
          setShowAddForm(false);
        }
        setSearching(false);
      } catch {
        if (!cancelled) { setSuggestions([]); setTotalFound(0); setNoResults(false); setSearching(false); }
      }
    }, 250);
    return () => { clearTimeout(t); cancelled = true; setSearching(false); };
  }, [search, salonId]);

  function selectClient(c: Client) {
    onSelectClient(c);
    setSearch("");
    setShowDrop(false);
    setSuggestions([]);
  }

  function handleWalkIn() {
    const walkIn: Client = { id: "walk-in", name: "Walk In", phone: "", eWallet: 0 };
    onSelectClient(walkIn);
    setSearch("Walk In");
    setShowDrop(false);
    setShowAddForm(false);
    setNoResults(false);
    clearPrefill();
  }

  async function handleCreateClient() {
    const errors: { first?: string; phone?: string; gender?: string } = {};
    if (!addFirst.trim()) errors.first = "First name is required";
    if (!addPhone.trim()) errors.phone = "Phone is required";
    if (!addGender) errors.gender = "Gender is required";
    if (Object.keys(errors).length) { setAddErrors(errors); return; }

    // Check if phone already exists before creating
    if (addPhone) {
      try {
        const checkRes = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(addPhone)}&salon_id=${salonId || ""}`);
        const raw = checkRes.data?.data ?? checkRes.data ?? [];
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        const duplicate = items.find((c: any) => {
          const phone = (c.phone || c.phone_number || "").replace(/\D/g, "");
          return phone === addPhone || phone.endsWith(addPhone);
        });
        if (duplicate) {
          setAddErrors((prev) => ({ ...prev, phone: "Mobile number already exists" }));
          return;
        }
      } catch { /* proceed to create */ }
    }

    setAddErrors({});
    setAddSaving(true);
    try {
      const res = await api.post("/api/v1/clients", {
        salon_id: salonId,
        first_name: addFirst,
        last_name: addLast,
        phone_number: addPhone,
        gender: addGender,
      });
      const c = res.data?.data ?? res.data;
      const newClient: Client = {
        id: String(c?.id ?? ""),
        name: `${addFirst} ${addLast}`.trim(),
        phone: addPhone,
        eWallet: 0,
      };
      selectClient(newClient);
      setShowAddForm(false);
      setAddFirst(""); setAddLast(""); setAddPhone(""); setAddGender(""); setAddErrors({});
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || err?.response?.data?.error || "";
      if (err?.response?.status === 409 || /phone|mobile|already/i.test(msg)) {
        setAddErrors((prev) => ({ ...prev, phone: "Mobile number already exists" }));
      }
    } finally {
      setAddSaving(false);
    }
  }

  const onViewHistory = (selectedClientId && selectedClientId !== "walk-in")
    ? () => navigate("/dashboard/clients/history", { state: { openClientId: selectedClientId } })
    : undefined;

  return (
    <div className="client-panel">
      {/* ── Toolbar: search + actions + date ── */}
      <div className="client-panel__toolbar">
        <div className="client-panel__search" ref={dropRef} style={{ flex: 1, position: "relative" }}>
          <div className="client-search-wrap">
            <input
              className={`client-search-input${error ? " client-search-input--error" : ""}`}
              placeholder="Search client by name or mobile number…"
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                const sanitized = /^\d*$/.test(val) ? val.slice(0, 10) : val;
                setSearch(sanitized);
                if (!sanitized) { onClearClient(); setTotalFound(0); setNoResults(false); clearPrefill(); }
              }}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            />
            {searching
              ? <span className="client-search-spinner" />
              : (search || selectedClientId) && (
                  <button
                    className="client-search-clear"
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => { e.preventDefault(); setSearch(""); onClearClient(); setSuggestions([]); setTotalFound(0); setShowDrop(false); setNoResults(false); clearPrefill(); }}
                  >×</button>
                )
            }
          </div>
          {showDrop && searching && (
            <div className="client-dropdown">
              <div className="client-dropdown__searching">
                <span className="client-dropdown__searching-dot" />
                Searching…
              </div>
            </div>
          )}
          {showDrop && !searching && noResults && (
            <div className="client-dropdown">
              <div
                className="client-dropdown__no-results"
                onMouseDown={(e) => {
                  e.preventDefault();
                  skipNextClear.current = true;
                  setSearch("");
                  setShowDrop(false);
                  setNoResults(false);
                  setShowAddForm(true);
                }}
              >
                <svg className="client-dropdown__no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <span>
                  No clients found for{" "}
                  <span className="client-dropdown__no-results-keyword">
                    <span className="client-dropdown__no-results-keyword-text">"{search}"</span>
                    <span className="client-dropdown__no-results-keyword-line" />
                  </span>
                </span>
              </div>
            </div>
          )}
          {showDrop && !searching && suggestions.length > 0 && (
            <div className="client-dropdown">
              <div className="client-dropdown__count">
                {totalFound} CLIENT{totalFound !== 1 ? "S" : ""} FOUND
              </div>
              {suggestions.map((c) => (
                <div
                  key={c.id}
                  className="client-dropdown__item"
                  onMouseDown={(e) => { e.preventDefault(); selectClient(c); }}
                >
                  <span
                    className="client-dropdown__avatar"
                    style={{ background: avatarColor(c.name) }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="client-dropdown__info">
                    <span className="client-dropdown__name">{highlight(c.name.toUpperCase(), search.toUpperCase())}</span>
                    <span className="client-dropdown__phone">
                      <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                        <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z" />
                      </svg>
                      {highlightPhone(c.phone, search)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="client-panel__actions">
          <button className="client-action-btn" onClick={handleWalkIn} type="button">Walk-In</button>
          <button
            className="client-action-btn client-action-btn--primary"
            type="button"
            onClick={() => {
              setNoResults(false);
              setShowAddForm(true);
            }}
          >
            + Add Client
          </button>
          <input
            type="date"
            className="client-date-input"
            value={calDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      </div>

      {/* Error banner — rendered outside the toolbar so it never breaks the flex row */}
      {error && (
        <div className="client-error-banner">
          <span className="client-error-banner__icon">⚠</span>
          {error}
        </div>
      )}

      {/* ── Add client form ── */}
      {showAddForm && (
        <div className="add-client-form">
          <div className="acf-required-wrapper">
            {!addFirst && <span className="acf-label-overlay">First name<span className="acf-req-star">*</span></span>}
            <input
              className={`acf-input${addErrors.first ? " acf-input--error" : ""}`}
              placeholder=""
              value={addFirst}
              maxLength={20}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 20);
                setAddFirst(val);
                if (val.trim()) setAddErrors((prev) => ({ ...prev, first: undefined }));
              }}
            />
            {addErrors.first && <span className="acf-error">{addErrors.first}</span>}
          </div>
          <input
            className="acf-input"
            placeholder="Last name"
            value={addLast}
            maxLength={20}
            onChange={(e) => setAddLast(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 20))}
          />
          <div className="acf-required-wrapper">
            {!addPhone && <span className="acf-label-overlay">Phone<span className="acf-req-star">*</span></span>}
            <input
              className={`acf-input${addErrors.phone ? " acf-input--error" : ""}`}
              placeholder=""
              value={addPhone}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setAddPhone(val);
                if (val.trim()) setAddErrors((prev) => ({ ...prev, phone: undefined }));
              }}
            />
            {addErrors.phone && <span className="acf-error">{addErrors.phone}</span>}
          </div>
          <div className="acf-required-wrapper">
            {!addGender && <span className="acf-label-overlay">Gender<span className="acf-req-star">*</span></span>}
            <select
              className={`acf-input${addErrors.gender ? " acf-input--error" : ""}`}
              value={addGender}
              onChange={(e) => {
                setAddGender(e.target.value);
                if (e.target.value) setAddErrors((prev) => ({ ...prev, gender: undefined }));
              }}
            >
              <option value="" disabled hidden> </option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
            {addErrors.gender && <span className="acf-error">{addErrors.gender}</span>}
          </div>
          <button className="acf-btn acf-btn--primary" onClick={handleCreateClient} disabled={addSaving}>
            {addSaving ? "Saving…" : "Save"}
          </button>
          <button className="acf-btn" onClick={() => { setShowAddForm(false); setAddErrors({}); }}>Cancel</button>
        </div>
      )}

      {/* ── Stat card ── */}
      {selectedClientId && selectedClientId !== "walk-in" && details && stats && (
        <ClientStatCard
          name={details.full_name || `${details.first_name || ""} ${details.last_name || ""}`.trim() || search}
          phone={details.phone_number || details.phone || ""}
          stats={{ ...stats, unpaidAmt }}
          packages={clientPkgsData?.items ?? []}
          memberships={clientMemberships}
          onViewHistory={onViewHistory}
        />
      )}
      {statsLoading && <div style={{ padding: "8px 0", fontSize: 12, color: "#9ca3af" }}>Loading client details…</div>}
    </div>
  );
};

export default ClientPanel;