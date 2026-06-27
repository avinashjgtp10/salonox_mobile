import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Client } from "../../types";
import type { ClientStats } from "../../types";
import { ClientStatCard } from "../shared/ClientStatCard";
import { useClientDetails } from "../../hooks/useClientDetails";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { selectBookings } from "../../../../store/selectors/scheduler.selectors";
import api from "../../../../services/api/axios";
import "../../styles/AppointmentModal.scss";

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16",
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
}

export const ClientPanel: React.FC<Props> = ({
  salonId, calDate, onDateChange, selectedClientId,
  initialName, fallbackUnpaidAmt,
  onSelectClient, onClearClient, onStatsLoaded, error,
}) => {
  const navigate = useNavigate();
  const [search, setSearch]           = useState(initialName || "");
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [totalFound, setTotalFound]   = useState(0);
  const [showDrop, setShowDrop]       = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFirst, setAddFirst]       = useState("");
  const [addLast, setAddLast]         = useState("");
  const [addPhone, setAddPhone]       = useState("");
  const [addGender, setAddGender]     = useState("Female");
  const [addSaving, setAddSaving]     = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const { details, stats, loading: statsLoading } = useClientDetails(selectedClientId);
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

  // When details load for an existing client, update the search box with the canonical name
  useEffect(() => {
    if (!details || !selectedClientId || selectedClientId === "walk-in") return;
    const name = details.full_name || `${details.first_name || ""} ${details.last_name || ""}`.trim();
    if (name) setSearch(name);
  }, [details, selectedClientId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (search.length < 3) { setSuggestions([]); return; }
    if (search === "Walk In") return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(search)}&salon_id=${salonId || ""}`);
        const raw = res.data?.data ?? res.data ?? [];
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        setTotalFound(raw.total ?? items.length);
        setSuggestions(items.slice(0, 20).map((c: any): Client => ({
          id: String(c.id),
          name: c.full_name || c.fullName || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "",
          phone: (c.phone || c.phone_number || "").replace(/[^\d+]/g, ""),
          eWallet: c.wallet_balance || 0,
        })));
        setShowDrop(true);
      } catch {
        setSuggestions([]);
        setTotalFound(0);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, salonId]);

  function selectClient(c: Client) {
    onSelectClient(c);
    setSearch(c.name);
    setShowDrop(false);
    setSuggestions([]);
  }

  function handleWalkIn() {
    const walkIn: Client = { id: "walk-in", name: "Walk In", phone: "", eWallet: 0 };
    onSelectClient(walkIn);
    setSearch("Walk In");
    setShowDrop(false);
  }

  async function handleCreateClient() {
    if (!addFirst && !addPhone) return;
    setAddSaving(true);
    try {
      const res = await api.post("/api/v1/clients", {
        salon_id:   salonId,
        first_name: addFirst,
        last_name:  addLast,
        phone:      addPhone,
        gender:     addGender,
      });
      const c = res.data?.data ?? res.data;
      const newClient: Client = {
        id:      String(c?.id ?? ""),
        name:    `${addFirst} ${addLast}`.trim(),
        phone:   addPhone,
        eWallet: 0,
      };
      selectClient(newClient);
      setShowAddForm(false);
      setAddFirst(""); setAddLast(""); setAddPhone(""); setAddGender("Female");
    } catch { /* ignore */ } finally {
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
              onChange={(e) => { setSearch(e.target.value); if (!e.target.value) { onClearClient(); setTotalFound(0); } }}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            />
            {search && (
              <button
                className="client-search-clear"
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => { e.preventDefault(); setSearch(""); onClearClient(); setSuggestions([]); setTotalFound(0); setShowDrop(false); }}
              >×</button>
            )}
          </div>
          {error && <div className="client-field-error">{error}</div>}
          {showDrop && suggestions.length > 0 && (
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
                        <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"/>
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
            onClick={() => setShowAddForm((v) => !v)}
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

      {/* ── Add client form ── */}
      {showAddForm && (
        <div className="add-client-form">
          <input className="acf-input" placeholder="First name *" value={addFirst} onChange={(e) => setAddFirst(e.target.value)} />
          <input className="acf-input" placeholder="Last name" value={addLast} onChange={(e) => setAddLast(e.target.value)} />
          <input className="acf-input" placeholder="Phone *" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
          <select className="acf-input" value={addGender} onChange={(e) => setAddGender(e.target.value)}>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
          <button className="acf-btn acf-btn--primary" onClick={handleCreateClient} disabled={addSaving}>
            {addSaving ? "Saving…" : "Create"}
          </button>
          <button className="acf-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
        </div>
      )}

      {/* ── Stat card ── */}
      {selectedClientId && selectedClientId !== "walk-in" && details && stats && (
        <ClientStatCard
          name={details.full_name || `${details.first_name || ""} ${details.last_name || ""}`.trim() || search}
          phone={details.phone_number || ""}
          stats={{ ...stats, unpaidAmt }}
          onViewHistory={onViewHistory}
        />
      )}
      {statsLoading && <div style={{ padding: "8px 0", fontSize: 12, color: "#9ca3af" }}>Loading client details…</div>}
    </div>
  );
};

export default ClientPanel;