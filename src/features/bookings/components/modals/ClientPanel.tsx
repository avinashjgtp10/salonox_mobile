import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Client } from "../../types";
import type { ClientStats } from "../../types";
import { ClientStatCard } from "../shared/ClientStatCard";
import { useClientDetails } from "../../hooks/useClientDetails";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { selectBookings } from "../../../../store/selectors/scheduler.selectors";
import type { ClientPackage } from "../../../../services/api/endpoints/packages.endpoints";
import type { ClientMembership } from "../../../../services/api/endpoints/clientMemberships.endpoints";
import type { LoyaltyEligibility } from "../../../../services/api/endpoints/memberships.endpoints";
import api from "../../../../services/api/axios";
import { Button, DatePicker } from "../../../../components/ui";
import Skeleton from "../../../../components/ui/Skeleton";
import Dropdown from "../../../../components/ui/Dropdown";
import ClientHistoryModal from "../../../clients/components/ClientHistoryModal";
import QuickEditClientModal from "../../../clients/components/QuickEditClientModal";
import { maskMobile } from "../../../../utils/maskMobile";
import { toTitleCase } from "../../../../utils/titleCase";
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

// A typed/searched "karan raja" should prefill First=karan, Last=raja, not
// dump the whole string into First — same first-word/rest split AddClientPage
// already uses for its own prefill handoff.
function splitName(full: string): { first: string; last: string } {
  const trimmed = full.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { first: trimmed, last: "" };
  return { first: trimmed.slice(0, spaceIdx), last: trimmed.slice(spaceIdx + 1).trim() };
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
  // Bump this (e.g. after an external eWallet top-up) to force a refetch of
  // this client's stats without needing selectedClientId to change.
  refreshKey?: number;
  // Fired after a successful Quick Edit save — lets the parent bump its own
  // refreshKey so every other consumer of this client's data (membership
  // wallet, packages) picks up the change too, not just this panel.
  onClientUpdated?: () => void;
  // Fired when the user cancels the Add Client form without picking/creating
  // a client — lets the parent clear any "add client details" prompt it put
  // up (e.g. AppointmentModal's walk-in-before-payment error), which would
  // otherwise keep showing even though the form that triggered it is gone.
  onAddFormCancelled?: () => void;
  // Ratio for showing reward points' ₹ equivalent on the stat card — omit to
  // hide that info button entirely.
  rewardPointsConfig?: { redeem_points: number; redeem_value: number };
  // The client's active packages/memberships — fetched once by the parent
  // (AppointmentModal already needs these for package-coverage/membership-
  // wallet logic) and passed down here rather than this panel independently
  // re-fetching the same data a second time, which could leave the stat
  // card's Package/Membership cells out of sync with the rest of the modal
  // (e.g. the "Fully covered by active package" banner) even though both
  // ultimately read the same client.
  packages?: ClientPackage[];
  memberships?: ClientMembership[];
  // Loyalty plans are salon-wide and free — there's no per-client purchase
  // row for them (see ClientStatCard.tsx), so this live eligibility (part of
  // AppointmentModal's own useClientDetails response) is the only way the
  // stat card's Membership cell can know a client has unlocked one.
  loyaltyEligibility?: LoyaltyEligibility | null;
  // The parent (AppointmentModal) already calls useClientDetails for its own
  // package-coverage/membership-wallet/loyalty-discount logic — pass that
  // same result down so this panel's stat card reads it too, instead of
  // both components independently calling POST /clients/:id/details for the
  // exact same client. Falls back to its own fetch only if the caller
  // doesn't supply this (e.g. any other place ClientPanel might be reused).
  clientDetailsResult?: ReturnType<typeof useClientDetails>;
}

export const ClientPanel: React.FC<Props> = ({
  salonId, calDate, onDateChange, selectedClientId,
  fallbackUnpaidAmt,
  onSelectClient, onClearClient, onStatsLoaded, error, defaultName, defaultPhone, openAddForm,
  refreshKey, rewardPointsConfig, onClientUpdated, onAddFormCancelled,
  packages, memberships, loyaltyEligibility,
  clientDetailsResult,
}) => {
  const [search, setSearch] = useState(selectedClientId === "walk-in" ? "Walk In" : "");
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [showDrop, setShowDrop] = useState(false);
  const [showAddForm, setShowAddForm] = useState(!!defaultName || !!defaultPhone);
  const defaultNameSplit = splitName(defaultName ?? "");
  const [addFirst, setAddFirst] = useState(defaultNameSplit.first);
  const [addLast, setAddLast] = useState(defaultNameSplit.last);
  const [addPhone, setAddPhone] = useState(defaultPhone ?? "");
  const [addGender, setAddGender] = useState("");
  const [addReferredBy, setAddReferredBy] = useState("");
  const [addErrors, setAddErrors] = useState<{ first?: string; phone?: string; gender?: string }>({});
  const [noResults, setNoResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const skipNextClear = useRef(false);
  // Prevents the initial search effect from clearing the defaultName/defaultPhone pre-fill on mount
  const skipInitialClear = useRef(!!defaultName || !!defaultPhone);

  useEffect(() => { if (openAddForm) setShowAddForm(true); }, [openAddForm]);

  // Skip this panel's own fetch when the parent already supplied a result
  // (pass a null clientId so the hook's effect never fires a request) —
  // otherwise fall back to fetching independently.
  const ownFetch = useClientDetails(clientDetailsResult ? null : selectedClientId, refreshKey);
  const { details, stats, loading: statsLoading, historyLoading } = clientDetailsResult ?? ownFetch;
  const allBookings = useAppSelector(selectBookings);

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
        // salon_id omitted — the backend derives it from the JWT
        // (getSalonId(req)) and never reads a salon_id query param here.
        const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(search)}`);
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
          const { first, last } = isPhone ? { first: "", last: "" } : splitName(search);
          setAddPhone(isPhone ? search : "");
          setAddFirst(first);
          setAddLast(last);
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

  // Reset the keyboard-highlighted row whenever the result set changes, so a
  // stale index from a previous search never lands on the wrong client.
  useEffect(() => { setActiveIndex(-1); }, [suggestions]);

  // Keep the highlighted row visible — without this, arrowing past the
  // bottom of the scroll container moves the highlight out of sight.
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    if (activeIndex >= 0) itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Enter with zero matches ("no clients found for X") used to just do
  // nothing — same action as clicking the "No clients found" prompt: reveal
  // the Add Client form below, already prefilled with whatever was typed
  // (the search effect above fills addFirst/addPhone as soon as noResults
  // goes true), instead of silently swallowing the keystroke.
  function openAddFormFromSearch() {
    skipNextClear.current = true;
    setSearch("");
    setShowDrop(false);
    setNoResults(false);
    setShowAddForm(true);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDrop) return;
    if (e.key === "Enter" && noResults) {
      e.preventDefault();
      openAddFormFromSearch();
      return;
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      // Clamped, not wrapped — jumping back to the first row after the last
      // reads as the list being stuck in a loop rather than reaching the end.
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        selectClient(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      // Close the suggestion list first; only closes the whole modal (via the
      // drawer's own Escape handler) on a second press once the dropdown's gone.
      e.stopPropagation();
      setShowDrop(false);
    }
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
    else if (addPhone.trim().length !== 10) errors.phone = "Please enter 10 digit number";
    if (!addGender) errors.gender = "Gender is required";
    if (Object.keys(errors).length) {
      setAddErrors(errors);
      throw new Error("validation_failed");
    }

    // Check if phone already exists before creating
    if (addPhone) {
      let duplicate: any = null;
      try {
        // salon_id omitted — same reasoning as the main search call above.
        const checkRes = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(addPhone)}`);
        const raw = checkRes.data?.data ?? checkRes.data ?? [];
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        duplicate = items.find((c: any) => {
          const phone = (c.phone || c.phone_number || "").replace(/\D/g, "");
          return phone === addPhone || phone.endsWith(addPhone);
        });
      } catch { /* search failed — proceed to create */ }
      if (duplicate) {
        setAddErrors((prev) => ({ ...prev, phone: "Mobile number already exists" }));
        throw new Error("duplicate_phone");
      }
    }

    setAddErrors({});
    try {
      // salon_id omitted from the body — clients.controller.ts's create
      // handler ignores it and always derives salonId from the JWT.
      const res = await api.post("/api/v1/clients", {
        first_name: addFirst,
        last_name: addLast,
        phone_number: addPhone,
        phone_country_code: "+91",
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
      throw err;
    }
  }

  // Opens as a popup over the calendar instead of navigating away to the
  // clients section — staff stay on the appointment they were working on.
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const onViewHistory = (selectedClientId && selectedClientId !== "walk-in")
    ? () => setShowHistoryModal(true)
    : undefined;

  // Same "popup over the calendar" reasoning as history — a typo fix
  // shouldn't cost staff the appointment they were already building.
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const onEditClient = (selectedClientId && selectedClientId !== "walk-in")
    ? () => setShowQuickEditModal(true)
    : undefined;

  function handleClientUpdated(updated: { id: string; name: string; phone: string }) {
    selectClient({ id: updated.id, name: updated.name, phone: updated.phone, eWallet: stats?.ewalletAmt ?? 0 });
    onClientUpdated?.();
  }

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
              onKeyDownCapture={handleSearchKeyDown}
              role="combobox"
              aria-expanded={showDrop && suggestions.length > 0}
              aria-haspopup="listbox"
              aria-controls="client-suggestions-listbox"
              aria-activedescendant={activeIndex >= 0 ? `client-option-${suggestions[activeIndex]?.id}` : undefined}
            />
            {searching ? (
              <span className="client-search-spinner" />
            ) : showDrop && (suggestions.length > 0 || noResults) ? (
              // Staff kept typing a name and clicking elsewhere instead of
              // pressing Enter/clicking a result, leaving no client selected
              // with no indication why — same "Ctrl + /" badge treatment as
              // ReportsPage.tsx's search box, so the required action is
              // visible instead of relying on staff already knowing it.
              // Also shown when noResults — Enter there opens the pre-filled
              // Add Client form (see handleSearchKeyDown), a genuinely new
              // client, not just an existing one to pick.
              // Takes over the clear button's spot while a result is
              // selectable — clearing via backspace still works.
              <span className="client-search-kbd">Enter</span>
            ) : (
              (search || selectedClientId) && (
                <button
                  className="client-search-clear"
                  type="button"
                  aria-label="Clear client search"
                  onMouseDown={(e) => { e.preventDefault(); setSearch(""); onClearClient(); setSuggestions([]); setTotalFound(0); setShowDrop(false); setNoResults(false); clearPrefill(); }}
                >×</button>
              )
            )}
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
                  openAddFormFromSearch();
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
            <div className="client-dropdown" role="listbox" id="client-suggestions-listbox">
              <div className="client-dropdown__count">
                {totalFound} CLIENT{totalFound !== 1 ? "S" : ""} FOUND
              </div>
              {suggestions.map((c, i) => (
                <div
                  key={c.id}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  id={`client-option-${c.id}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`client-dropdown__item${i === activeIndex ? " client-dropdown__item--active" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); selectClient(c); }}
                  onMouseEnter={() => setActiveIndex(i)}
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
                      {maskMobile(c.phone)}
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
              // The search effect above only prefills addFirst/addPhone when
              // there are literally ZERO matches — a search like "Ram" that
              // partially matches an unrelated client ("VikRAM Nair") still
              // shows a result, so that auto-prefill never ran. If staff
              // clicks Add Client anyway (none of the shown matches is who
              // they meant), still carry over what they already typed rather
              // than dropping it on the floor.
              if (!addFirst && !addPhone && search.trim()) {
                const isPhone = /^\d+$/.test(search.trim());
                if (isPhone) {
                  setAddPhone(search.trim());
                } else {
                  const { first, last } = splitName(search);
                  setAddFirst(first);
                  setAddLast(last);
                }
              }
              skipNextClear.current = true;
              setSearch("");
              setShowDrop(false);
              setNoResults(false);
              setShowAddForm(true);
            }}
          >
            + Add Client
          </button>
          <DatePicker value={calDate} onChange={onDateChange} />
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
                if (val.length === 10) setAddErrors((prev) => ({ ...prev, phone: undefined }));
              }}
            />
            {addErrors.phone && <span className="acf-error">{addErrors.phone}</span>}
          </div>
          <div className="acf-required-wrapper">
            {!addGender && <span className="acf-label-overlay">Gender<span className="acf-req-star">*</span></span>}
            <Dropdown
              className={`acf-input${addErrors.gender ? " acf-input--error" : ""}`}
              searchable={false}
              value={addGender}
              options={[
                { id: "Female", name: "Female" },
                { id: "Male", name: "Male" },
                { id: "Other", name: "Other" },
              ]}
              onChange={(id) => {
                setAddGender(id);
                if (id) setAddErrors((prev) => ({ ...prev, gender: undefined }));
              }}
            />
            {addErrors.gender && <span className="acf-error">{addErrors.gender}</span>}
          </div>
          <Button
            type="button"
            variant="dark"
            autoDisable
            successLabel="Save"
            onClick={handleCreateClient}
            className="acf-btn acf-btn--primary"
            style={{ height: 34, padding: "0 14px", fontSize: 12, fontWeight: 600, borderRadius: 6 }}
          >
            Save
          </Button>
          <button className="acf-btn" onClick={() => { setShowAddForm(false); setAddErrors({}); onAddFormCancelled?.(); }}>Cancel</button>
        </div>
      )}

      {/* ── Stat card ── */}
      {selectedClientId && selectedClientId !== "walk-in" && (
        statsLoading || !details || !stats ? (
          <div className="client-stats-panel mt-3">
            <div className="client-stats-panel__header">
              <Skeleton width={42} height={42} borderRadius={10} />
              <div className="info" style={{ flex: 1 }}>
                <Skeleton width="40%" height={15} style={{ marginBottom: 6 }} />
                <Skeleton width="30%" height={12} />
              </div>
            </div>
            <div className="client-stats-panel__grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="info-cell">
                  <Skeleton width="60%" height={10} style={{ marginBottom: 5 }} />
                  <Skeleton width="45%" height={14} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ClientStatCard
            name={toTitleCase(details.full_name || `${details.first_name || ""} ${details.last_name || ""}`.trim() || search)}
            phone={details.phone_number || details.phone || ""}
            stats={{ ...stats, unpaidAmt }}
            packages={packages ?? []}
            memberships={memberships ?? []}
            loyaltyEligibility={loyaltyEligibility}
            onViewHistory={onViewHistory}
            historyLoading={historyLoading}
            rewardPointsConfig={rewardPointsConfig}
            onEdit={onEditClient}
          />
        )
      )}

      {showHistoryModal && selectedClientId && selectedClientId !== "walk-in" && (
        <ClientHistoryModal
          clientId={selectedClientId}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showQuickEditModal && selectedClientId && selectedClientId !== "walk-in" && (
        <QuickEditClientModal
          clientId={selectedClientId}
          onClose={() => setShowQuickEditModal(false)}
          onSaved={handleClientUpdated}
          client={details}
        />
      )}
    </div>
  );
};

export default ClientPanel;