import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Search, Award, X, ClockHistory,
} from "react-bootstrap-icons";
import { Button, Card, Pagination, Loader } from "../../../components/ui";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchClientMembershipsThunk,
  consumeSessionThunk,
  cancelClientMembershipThunk,
  fetchClientMembershipByIdThunk,
} from "../../../middleware/clientMembership/clientMembership.thunk";
import { clearError } from "../../../store/clientMembershipSlice";
import type { ClientMembership } from "../../../services/api/endpoints/clientMemberships.endpoints";
import api from "../../../services/api/axios";
import "../styles/MembershipsPage.scss";

function durationToExpiresAt(validFor: string): string | undefined {
  if (!validFor) return undefined;
  const now = new Date();
  const lower = validFor.toLowerCase().trim();
  const num = parseInt(lower) || 1;
  if (lower.includes("year"))       now.setFullYear(now.getFullYear() + num);
  else if (lower.includes("month")) now.setMonth(now.getMonth() + num);
  else if (lower.includes("week"))  now.setDate(now.getDate() + num * 7);
  else if (lower.includes("day"))   now.setDate(now.getDate() + num);
  else return undefined;
  return now.toISOString();
}

const SYNTH_CACHE_KEY = "synth_memberships_v4";

function loadLocalMemberships(salonId: string): ClientMembership[] {
  const prefix = `mem2:P:${salonId || "g"}:`;
  const result: ClientMembership[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const rec = JSON.parse(raw);
      const parts = key.split(":");
      const clientId = parts[3] || "";
      const ref      = parts[4] || "";
      result.push({
        id:                `ls-${clientId}-${ref}`,
        salonId:           salonId || "",
        clientId,
        clientName:        rec.clientName || "Client",
        mobile:            rec.mobile || "",
        email:             "",
        membershipId:      rec.membershipId || ref,
        membershipName:    rec.membershipName || "",
        colour:            rec.colour || "#1a1a2e",
        totalSessions:     0,
        usedSessions:      0,
        remainingSessions: 0,
        purchasedAt:       rec.purchasedAt || new Date().toISOString(),
        status:            "active",
        pricePaid:         rec.pricePaid || 0,
        membershipWalletBalance: rec.pricePaid || 0,
        usageLog:          [],
        createdAt:         rec.purchasedAt || new Date().toISOString(),
        updatedAt:         rec.purchasedAt || new Date().toISOString(),
      });
    }
  } catch {}
  return result;
}

async function loadSynthMemberships(): Promise<ClientMembership[]> {
  // Fetch catalog + appointments in parallel
  const [catRes, apptRes] = await Promise.all([
    api.get("/api/v1/memberships?limit=200"),
    api.get("/api/v1/appointments?limit=500&page=1"),
  ]);

  const catalog: any[] = catRes.data?.data?.items ?? [];

  const rawData = apptRes.data?.data;
  const appts: any[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.items)
      ? rawData.items
      : Array.isArray(rawData?.data)
        ? rawData.data
        : [];

  const synth: ClientMembership[] = [];
  const seen = new Set<string>();

  for (const appt of appts) {
    const ps = (appt.paymentStatus || appt.payment_status || appt.status || "").toLowerCase();
    // Accept paid, partial, completed — skip only truly unpaid
    if (!ps.includes("paid") && !ps.includes("partial") && ps !== "completed") continue;

    const clientId: string = appt.clientId || appt.client_id || "";
    if (!clientId) continue;

    // Check all possible field names the backend might use for membership items
    const memItems: any[] = (
      appt.membershipItems ||
      appt.membership_items ||
      appt.memberships ||
      appt.membershipList ||
      []
    );
    for (const mi of memItems) {
      const name: string = mi.name || mi.membershipName || mi.membership_name || mi.membership || "";
      if (!name) continue;

      let membershipId: string = String(mi.membershipId || mi.membership_id || mi.membershipid || mi.id || "").trim();
      if (!membershipId || membershipId === "undefined" || membershipId === "null") {
        const found = catalog.find((c: any) => (c.name || "").toLowerCase() === name.toLowerCase());
        membershipId = found?.id ? String(found.id) : "";
      }

      const key = `${clientId}__${(membershipId || name)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const catMem = catalog.find((c: any) => String(c.id) === membershipId);
      const sessions: number = catMem?.numberOfSessions ?? catMem?.number_of_sessions ?? 0;
      const purchasedAt = appt.createdAt || appt.created_at || appt.scheduledAt || appt.scheduled_at || new Date().toISOString();

      synth.push({
        id:               `synth-${appt.id || Date.now()}-${membershipId || name}`,
        salonId:          "",
        clientId,
        clientName:       appt.clientName || appt.client_name || appt.customerName || "Client",
        mobile:           appt.mobile || appt.clientMobile || appt.client_mobile || "",
        email:            appt.email || appt.clientEmail || appt.client_email || "",
        membershipId:     membershipId || "",
        membershipName:   name,
        colour:           catMem?.colour || "#b8860b",
        totalSessions:    sessions,
        usedSessions:     0,
        remainingSessions: sessions,
        purchasedAt,
        expiresAt:        catMem?.validFor ? durationToExpiresAt(catMem.validFor) : undefined,
        status:           "active",
        pricePaid:        Number(mi.total || mi.price || mi.amount || 0) || catMem?.price || 0,
        membershipWalletBalance: Number(mi.total || mi.price || mi.amount || 0) || catMem?.price || 0,
        usageLog:         [],
        createdAt:        purchasedAt,
        updatedAt:        purchasedAt,
      });
    }
  }

  // ── Also scan mem_client_* localStorage keys ──────────────────────────────
  // Catches memberships assigned via CreateMembershipPage that predate the
  // mem2:P: write (older assignments only have this key, written by the drawer).
  try {
    for (let li = 0; li < localStorage.length; li++) {
      const lkey = localStorage.key(li);
      if (!lkey?.startsWith("mem_client_")) continue;
      const lraw = localStorage.getItem(lkey);
      if (!lraw) continue;
      const clientData = JSON.parse(lraw);
      const memId = lkey.replace("mem_client_", "");
      const catMem = catalog.find((c: any) => String(c.id) === memId);
      if (!catMem) continue;
      const cid = String(clientData.id || "");
      if (!cid) continue;
      const dkey = `${cid}__${memId}`;
      if (seen.has(dkey)) continue;
      seen.add(dkey);
      const sessions = catMem?.numberOfSessions ?? catMem?.number_of_sessions ?? 0;
      synth.push({
        id:                `mc-${memId}-${cid}`,
        salonId:           "",
        clientId:          cid,
        clientName:        clientData.name  || "Client",
        mobile:            clientData.phone || "",
        email:             "",
        membershipId:      memId,
        membershipName:    catMem.name  || "",
        colour:            catMem.colour || "#1a1a2e",
        totalSessions:     sessions,
        usedSessions:      0,
        remainingSessions: sessions,
        purchasedAt:       new Date().toISOString(),
        expiresAt:         catMem?.validFor ? durationToExpiresAt(catMem.validFor) : undefined,
        status:            "active",
        pricePaid:         Number(catMem.price) || 0,
        membershipWalletBalance: Number(catMem.price) || 0,
        usageLog:          [],
        createdAt:         new Date().toISOString(),
        updatedAt:         new Date().toISOString(),
      });
    }
  } catch {}

  try { sessionStorage.setItem(SYNTH_CACHE_KEY, JSON.stringify(synth)); } catch {}
  return synth;
}

const STATUS_OPTIONS = ["All", "Active", "Exhausted", "Expired", "Cancelled"];

const TIER_MAP: Record<string, string> = {
  "#1a1a2e": "Standard",
  "#b8860b": "Gold",
  "#4a90d9": "Diamond",
  "#16a34a": "Emerald",
  "#8b5cf6": "Platinum",
};

function statusBadgeClass(status: string) {
  const s = status?.toLowerCase();
  if (s === "active")    return "badge-active";
  if (s === "exhausted") return "badge-completed";
  if (s === "expired")   return "badge-expired";
  if (s === "cancelled") return "badge-inactive";
  return "badge-inactive";
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  item:       ClientMembership;
  consuming:  boolean;
  onConsume:  () => void;
  onCancel:   () => void;
  onClose:    () => void;
}

function computeBalance(item: ClientMembership) {
  const remaining = Number(item.membershipWalletBalance) || 0;
  const used = (item.usageLog ?? []).reduce((s, log) => s + (Number(log.amountDeducted) || 0), 0);
  return { total: remaining + used, used, remaining };
}

function DetailPanel({ item, consuming, onConsume, onCancel, onClose }: DetailPanelProps) {
  const color   = item.colour || "#1a1a2e";
  const tier    = TIER_MAP[color] ?? "Custom";
  const balance = computeBalance(item);
  const pct     = item.totalSessions > 0
    ? Math.min(100, Math.round((item.usedSessions / item.totalSessions) * 100))
    : 0;

  return (
    <aside className="pkg-sold-panel" role="complementary">
      {/* Header */}
      <div className="pkg-sold-panel__header">
        <div>
          <div className="pkg-sold-panel__header-title">Membership Details</div>
          <span className="pkg-sold-panel__mode-badge">{item.membershipName}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {item.status === "active" && (
            <>
              <button
                className="pkg-sold-panel__btn pkg-sold-panel__btn--save"
                onClick={onConsume}
                disabled={consuming}
              >
                {consuming ? <span className="pkg-sold-panel__spinner" /> : <ClockHistory size={13} />}
                {consuming ? "Processing…" : "Use session"}
              </button>
              <button
                className="pkg-sold-panel__btn pkg-sold-panel__btn--delete"
                onClick={onCancel}
                disabled={consuming}
              >
                Cancel
              </button>
            </>
          )}
          <button className="pkg-sold-panel__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="pkg-sold-panel__body">
        {/* Hero */}
        <div className="pkg-sold-panel__hero">
          <span
            style={{
              width: 12, height: 12, borderRadius: "50%",
              background: color, flexShrink: 0, display: "inline-block",
            }}
          />
          <div className="pkg-sold-panel__hero-name">{item.membershipName}</div>
          <span className={`memberships-status-badge ${statusBadgeClass(item.status)}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        </div>

        {/* Client */}
        <div className="pkg-sold-panel__section">
          <div className="pkg-sold-panel__section-title">Client</div>
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Name</span>
            <span className="pkg-sold-panel__value">{item.clientName}</span>
          </div>
          {item.mobile && (
            <div className="pkg-sold-panel__row">
              <span className="pkg-sold-panel__label">Mobile</span>
              <span className="pkg-sold-panel__value">{item.mobile}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="pkg-sold-panel__section">
          <div className="pkg-sold-panel__section-title">Details</div>
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Tier</span>
            <span className="pkg-sold-panel__value">{tier}</span>
          </div>
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Purchased</span>
            <span className="pkg-sold-panel__value">{formatDate(item.purchasedAt)}</span>
          </div>
          {item.expiresAt && (
            <div className="pkg-sold-panel__row">
              <span className="pkg-sold-panel__label">Expires</span>
              <span className="pkg-sold-panel__value">{formatDate(item.expiresAt)}</span>
            </div>
          )}
          {item.pricePaid != null && (
            <div className="pkg-sold-panel__row">
              <span className="pkg-sold-panel__label">Price paid</span>
              <span className="pkg-sold-panel__value">₹{Number(item.pricePaid).toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>

        {/* Monetary Balance */}
        {balance.total > 0 && (
          <div className="pkg-sold-panel__section">
            <div className="pkg-sold-panel__section-title">Membership Balance</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { label: "Total Balance", val: `₹${balance.total.toLocaleString("en-IN")}`, col: "#374151", bg: "#f9fafb" },
                { label: "Used",          val: `-₹${balance.used.toFixed(2)}`,              col: "#dc2626", bg: "#fef2f2" },
                { label: "Remaining",     val: `₹${balance.remaining.toFixed(2)}`,          col: "#16a34a", bg: "#f0fdf4" },
              ].map(({ label, val, col, bg }) => (
                <div key={label} style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: bg, borderRadius: 8, border: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: col }}>{val}</div>
                </div>
              ))}
            </div>
            {balance.total > 0 && (
              <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.round((balance.used / balance.total) * 100))}%`,
                  background: balance.used / balance.total >= 0.8 ? "#ef4444" : "#6366f1",
                  borderRadius: 3, transition: "width .3s",
                }} />
              </div>
            )}
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {Math.round((balance.used / balance.total) * 100)}% used
            </div>
          </div>
        )}

        {/* Sessions */}
        <div className="pkg-sold-panel__section">
          <div className="pkg-sold-panel__section-title">Sessions</div>
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Total</span>
            <span className="pkg-sold-panel__value">
              {item.totalSessions === 0 ? "Unlimited" : item.totalSessions}
            </span>
          </div>
          <div className="pkg-sold-panel__row">
            <span className="pkg-sold-panel__label">Used</span>
            <span className="pkg-sold-panel__value">{item.usedSessions}</span>
          </div>
          <div className="pkg-sold-panel__row pkg-sold-panel__row--total">
            <span className="pkg-sold-panel__label">Remaining</span>
            <span
              className="pkg-sold-panel__value pkg-sold-panel__value--total"
              style={{ color: item.remainingSessions === 0 && item.totalSessions > 0 ? "#dc2626" : "#7c3aed" }}
            >
              {item.totalSessions === 0 ? "∞" : item.remainingSessions}
            </span>
          </div>
          {item.totalSessions > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: pct >= 80 ? "#ef4444" : "#6366f1",
                  borderRadius: 3, transition: "width .3s",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{pct}% used</div>
            </div>
          )}
        </div>

        {/* Usage history */}
        {(item.usageLog?.length ?? 0) > 0 && (
          <div className="pkg-sold-panel__section">
            <div className="pkg-sold-panel__section-title">Usage history</div>
            <table className="pkg-sold-panel__svc-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...(item.usageLog ?? [])].reverse().map(e => {
                  const m   = String((e as any).notes ?? "").match(/covered:([\d.]+)/);
                  const amt = m ? parseFloat(m[1]) : 0;
                  return (
                    <tr key={e.id}>
                      <td>{e.serviceName || "Session"}</td>
                      <td style={{ fontWeight: 700, color: "#dc2626" }}>
                        {amt > 0 ? `-₹${amt.toFixed(2)}` : `${e.sessionsConsumed} session${e.sessionsConsumed !== 1 ? "s" : ""}`}
                      </td>
                      <td style={{ color: "#64748b", fontSize: 12 }}>{formatDate(e.usedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {(item.usageLog?.length ?? 0) === 0 && (
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>No usage recorded yet.</p>
        )}
      </div>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembershipsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { items, loading, submitting, error, selected } = useSelector(
    (s: RootState) => s.clientMemberships,
  );
  const salonId = useSelector((s: any) => s.salon?.currentSalon?.id);

  const [search,      setSearch]      = useState("");
  const [statusFilt,  setStatusFilt]  = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [syncing,     setSyncing]     = useState(false);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [errBanner,   setErrBanner]   = useState<string | null>(null);
  const [consuming,   setConsuming]   = useState(false);
  const [synthItems,  setSynthItems]  = useState<ClientMembership[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);

  const buildQuery = useCallback(() => ({
    search: undefined,
    status: undefined,
    page:   1,
    limit:  1000,
  }), []);

  const runSynthLoad = useCallback(() => {
    setSyncing(true);
    loadSynthMemberships()
      .then((synth) => { setSynthItems(synth); })
      .catch((e) => console.error("[MembershipsPage] synth load failed", e))
      .finally(() => setSyncing(false));
  }, []);

  // Auto-load on mount — show cached data instantly, refresh in background
  useEffect(() => {
    // 1. Show cached data immediately (instant render)
    try {
      const cached = sessionStorage.getItem(SYNTH_CACHE_KEY);
      if (cached) setSynthItems(JSON.parse(cached));
    } catch {}

    // 2. Fetch real ClientMembership records
    dispatch(fetchClientMembershipsThunk(buildQuery()));

    // 3. Fetch fresh synth data in background (updates if changed)
    let cancelled = false;
    loadSynthMemberships()
      .then((synth) => { if (!cancelled) setSynthItems(synth); })
      .catch((e) => console.error("[MembershipsPage] synth load failed", e));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilt]);
  useEffect(() => { if (error) { dispatch(clearError()); } }, [error, dispatch]);
  useEffect(() => {
    const isLocal = !selectedId || selectedId.startsWith("synth-") || selectedId.startsWith("ls-") || selectedId.startsWith("mc-");
    if (selectedId && !isLocal) {
      dispatch(fetchClientMembershipByIdThunk(selectedId));
    }
  }, [selectedId, dispatch]);

  // Merge real API records + localStorage records + synthesised appointment records
  // Priority: real API > localStorage > synth
  const allItems = useMemo(() => {
    const localItems = loadLocalMemberships(salonId);
    const realKeys = new Set(items.map((i) => `${i.clientId}__${i.membershipId}`));
    const uniqueLocal = localItems.filter(
      (ls) => !realKeys.has(`${ls.clientId}__${ls.membershipId}`)
    );
    const mergedKeys = new Set([
      ...Array.from(realKeys),
      ...uniqueLocal.map((ls) => `${ls.clientId}__${ls.membershipId}`),
    ]);
    const uniqueSynth = synthItems.filter(
      (s) => !mergedKeys.has(`${s.clientId}__${s.membershipId}`)
    );
    return [...items, ...uniqueLocal, ...uniqueSynth];
  }, [items, synthItems, salonId]);


  // Client-side filter + pagination over the merged list
  const filteredItems = useMemo(() => {
    let result = allItems;
    if (statusFilt !== "All") {
      result = result.filter((i) => i.status === statusFilt.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.clientName?.toLowerCase().includes(q) ||
        i.membershipName?.toLowerCase().includes(q) ||
        i.mobile?.includes(q)
      );
    }
    return result;
  }, [allItems, statusFilt, search]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const selectedItem: ClientMembership | null =
    (selected?.id === selectedId ? selected : null) ??
    (allItems.find((i) => i.id === selectedId) ?? null);

  const openPanel = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleConsume = useCallback(async () => {
    if (!selectedId) return;
    setConsuming(true);
    const res = await dispatch(consumeSessionThunk({ id: selectedId, dto: { sessionsToConsume: 1 } }));
    setConsuming(false);
    if (consumeSessionThunk.rejected.match(res)) {
      setErrBanner((res.payload as string) ?? "Failed to consume session");
    } else {
      dispatch(fetchClientMembershipByIdThunk(selectedId));
      dispatch(fetchClientMembershipsThunk(buildQuery()));
    }
  }, [selectedId, dispatch, buildQuery]);

  const handleCancel = useCallback(async () => {
    if (!selectedId || !window.confirm("Cancel this membership? This cannot be undone.")) return;
    const res = await dispatch(cancelClientMembershipThunk(selectedId));
    if (cancelClientMembershipThunk.rejected.match(res)) {
      setErrBanner((res.payload as string) ?? "Failed to cancel");
    } else {
      closePanel();
      dispatch(fetchClientMembershipsThunk(buildQuery()));
    }
  }, [selectedId, dispatch, buildQuery, closePanel]);

  return (
    <div className="memberships-page container-fluid" style={{ position: "relative" }}>

      {selectedId && <div className="pkg-sold-panel__backdrop" onClick={closePanel} aria-hidden="true" />}

      {/* ── HEADER ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1" style={{ color: "#11141a" }}>Memberships sold</h3>
          <p className="small mb-0" style={{ color: "#6b717e" }}>View and track memberships purchased by your clients.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button
            variant="outline-dark"
            pill
            onClick={() => { dispatch(fetchClientMembershipsThunk(buildQuery())); runSynthLoad(); }}
            disabled={loading || syncing}
          >
            {syncing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button variant="dark" pill className="px-4 fw-bold" onClick={() => navigate("/dashboard/catalog/memberships")}>
            Manage memberships
          </Button>
        </div>
      </div>

      {/* ── ERROR ── */}
      {errBanner && (
        <div
          className="memberships-status-badge badge-expired"
          style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderRadius: 10, marginBottom: 16, cursor: "pointer" }}
          onClick={() => setErrBanner(null)}
        >
          {errBanner} <X size={14} />
        </div>
      )}

      {/* ── FILTERS ── */}
      <div className="d-flex gap-3 align-items-center mb-4 flex-wrap">
        <div className="memberships-search" style={{ maxWidth: 320 }}>
          <Search size={14} className="memberships-search__icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by client or membership…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="memberships-search__input"
          />
        </div>
        <div className="d-flex gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              className={`memberships-page-btn${statusFilt === s ? " memberships-page-btn--active" : ""}`}
              onClick={() => setStatusFilt(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE ── */}
      {loading && allItems.length === 0 ? (
        <Card className="text-center py-5 border-0 rounded-4 shadow-sm" style={{ minHeight: 300 }}>
          <Loader message="Loading memberships…" className="py-5" />
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-4 empty-state-card">
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="d-flex align-items-center justify-content-center mb-3"
              style={{ width: 60, height: 60, borderRadius: 15, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <Award size={28} className="text-white" />
            </div>
            <h5 className="fw-bold mb-1 text-dark">
              {search || statusFilt !== "All" ? "No memberships found" : "No memberships sold yet"}
            </h5>
            <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 380, textAlign: "center" }}>
              {search || statusFilt !== "All"
                ? "Try adjusting your search or filter."
                : "Memberships appear here automatically when a payment is completed."}
            </p>
          </div>
        </Card>
      ) : (
        <Card noPadding className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 p-0">
          <table className="memberships-table w-100">
            <thead>
              <tr>
                <th>Client</th>
                <th>Membership</th>
                <th>Total Balance</th>
                <th>Used</th>
                <th>Remaining</th>
                <th>Purchased</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(item => {
                const color = item.colour || "#1a1a2e";
                const tier  = TIER_MAP[color] ?? "Custom";
                const bal   = computeBalance(item);
                const usedPct = bal.total > 0 ? Math.min(100, Math.round((bal.used / bal.total) * 100)) : 0;
                return (
                  <tr
                    key={item.id}
                    className={`memberships-table-row${selectedId === item.id ? " memberships-table-row--selected" : ""}`}
                    onClick={() => openPanel(item.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="fw-semibold" style={{ fontSize: 13 }}>{item.clientName}</div>
                      {item.mobile && <div className="text-muted" style={{ fontSize: 12 }}>{item.mobile}</div>}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                        <div>
                          <div className="fw-semibold" style={{ fontSize: 13 }}>{item.membershipName}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{tier}</div>
                        </div>
                      </div>
                    </td>
                    {/* Total Balance */}
                    <td>
                      <span className="fw-semibold" style={{ fontSize: 13 }}>
                        {bal.total > 0 ? `₹${bal.total.toLocaleString("en-IN")}` : "—"}
                      </span>
                    </td>
                    {/* Used */}
                    <td>
                      {bal.used > 0 ? (
                        <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>−₹{bal.used.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 12 }}>₹0</span>
                      )}
                    </td>
                    {/* Remaining */}
                    <td>
                      <div>
                        <div className="fw-bold" style={{ fontSize: 13, color: bal.remaining === 0 && bal.total > 0 ? "#ef4444" : "#16a34a" }}>
                          ₹{bal.remaining.toLocaleString("en-IN")}
                        </div>
                        {bal.total > 0 && (
                          <div style={{ width: 60, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden", marginTop: 3 }}>
                            <div style={{ height: "100%", width: `${usedPct}%`, background: usedPct >= 80 ? "#ef4444" : "#6366f1", borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td><span className="small text-muted">{formatDate(item.purchasedAt)}</span></td>
                    <td><span className="small text-muted">{item.expiresAt ? formatDate(item.expiresAt) : "—"}</span></td>
                    <td>
                      <span className={`memberships-status-badge ${statusBadgeClass(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── PAGINATION ── */}
      {filteredItems.length > pageSize && !loading && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={sz => { setPageSize(sz); setCurrentPage(1); }}
          className="mt-4 mb-4"
        />
      )}

      {/* ── DETAIL PANEL ── */}
      {selectedId && selectedItem && (
        <DetailPanel
          item={selectedItem}
          consuming={consuming || submitting}
          onConsume={handleConsume}
          onCancel={handleCancel}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
