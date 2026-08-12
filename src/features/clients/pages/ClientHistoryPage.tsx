// src/features/clients/pages/ClientHistoryPage.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { Search, PersonCircle, Funnel, StarFill } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import ClientHistoryDetail from "../components/ClientHistoryDetail";
import Skeleton from "../../../components/ui/Skeleton";
import Dropdown from "../../../components/ui/Dropdown";
import "../styles/ClientHistoryPage.scss";

// ── Types (sidebar/list concerns only — the detail panel's own types live in
// ClientHistoryDetail.tsx now that it's shared with the popup version) ──────────
interface ClientListItem {
  id: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  phone_country_code: string | null;
  gender: string | null;
  is_active: boolean;
  total_sales: string;
  created_at: string;
  last_visit_at: string | null;
}

interface ServiceOption { id: string; name: string; }
interface StaffOption { id: string; full_name: string; }

// Filter types
type LastVisitFilter = "all" | "7" | "30" | "90" | "90plus";

interface Filters {
  lastVisit: LastVisitFilter;
  serviceId: string;
  staffId: string;
  gender: string;
}

const DEFAULT_FILTERS: Filters = {
  lastVisit: "all",
  serviceId: "all",
  staffId: "all",
  gender: "all",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// ── Component ─────────────────────────────────────────────────────────────────
export default function ClientHistoryPage() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const autoOpenHandled = useRef(false);

  // Client list — infinite scroll (not paged navigation): the sidebar list
  // is already its own scroll container, so a separate "page 2/3/4" control
  // at the bottom was redundant with scrolling further down the same list,
  // and doubled as a layout bug (it could get pushed below the fold with no
  // way to reach it but scrolling right past the list that made it
  // unnecessary in the first place).
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true); // initial/replace load
  const [loadingMore, setLoadingMore] = useState(false);       // appending next batch
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsPage, setClientsPage] = useState(1);
  const CLIENTS_PAGE_SIZE = 50;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filter dropdown data — read from Redux (same store the calendar uses)
  const reduxServices = useAppSelector((s: any) => s.services.items ?? []);
  const reduxStaff = useAppSelector((s: any) => s.staff.items ?? []);
  const services: ServiceOption[] = reduxServices.map((s: any) => ({ id: s.id, name: s.name }));
  const staffList: StaffOption[] = reduxStaff.map((s: any) => ({
    id: s.id,
    full_name: s.full_name || `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
  }));

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Which client's detail panel is open — ClientHistoryDetail owns all the
  // history-fetching/tab/filter state itself once given this id.
  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(null);
  // Bumped on every row click (including re-clicking the already-selected
  // client) and folded into ClientHistoryDetail's `key` below — without this,
  // re-clicking the same client is a no-op (id unchanged) and can't refresh
  // an already-stale panel the way opening it fresh always does.
  const [selectVersion, setSelectVersion] = useState(0);

  // Ensure services + staff are in Redux (calendar may have already loaded them)
  useEffect(() => {
    if (reduxServices.length === 0) dispatch(fetchServicesThunk({ isActive: true }));
    if (reduxStaff.length === 0) dispatch(fetchStaffThunk());
  }, []);

  // Debounce search input — avoids a request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetches one batch — `append: false` replaces the list (first load, or
  // filters/search changed), `append: true` adds the next batch onto the end
  // (scrolled near the bottom of the already-loaded list).
  const doFetch = useCallback(async (page: number, append: boolean) => {
    if (append) setLoadingMore(true); else setClientsLoading(true);

    const params: Record<string, string> = { page: String(page), limit: String(CLIENTS_PAGE_SIZE) };
    if (filters.serviceId !== "all") params.service_id = filters.serviceId;
    if (filters.staffId   !== "all") params.staff_id   = filters.staffId;
    if (filters.gender    !== "all") params.gender      = filters.gender;
    if (filters.lastVisit !== "all") params.last_visit  = filters.lastVisit;
    if (debouncedSearch.trim())      params.search      = debouncedSearch.trim();

    try {
      const res = await api.get("/api/v1/clients/with-history-stats", { params });
      const d = res.data?.data;
      const items: ClientListItem[] = d?.items ?? [];
      setClients((prev) => (append ? [...prev, ...items] : items));
      setClientsTotal(d?.total ?? d?.count ?? d?.total_count ?? 0);
      setClientsPage(page);
    } catch {
      if (!append) { setClients([]); setClientsTotal(0); }
    } finally {
      if (append) setLoadingMore(false); else setClientsLoading(false);
    }
  }, [filters, debouncedSearch]);

  // Reset to the first batch whenever filters or debounced search change
  useEffect(() => { doFetch(1, false); }, [doFetch]);

  // Fires when the list is scrolled near its bottom — loads the next batch
  // and appends it, rather than a page-number control.
  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (clientsLoading || loadingMore) return;
    if (clients.length >= clientsTotal) return; // everything already loaded
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      doFetch(clientsPage + 1, true);
    }
  }, [clientsLoading, loadingMore, clients.length, clientsTotal, clientsPage, doFetch]);

  // Auto-open a specific client when navigated from the appointment modal
  useEffect(() => {
    const openClientId = (location.state as any)?.openClientId;
    if (!openClientId || autoOpenHandled.current) return;
    autoOpenHandled.current = true;
    const existing = clients.find((c) => String(c.id) === String(openClientId));
    if (existing) {
      setSelectedClient(existing);
      window.history.replaceState({}, "");
      return;
    }
    api
      .get(`/api/v1/clients/${openClientId}`)
      .then((res) => {
        const c = res.data?.data || res.data || null;
        if (c?.id) setSelectedClient(c);
        window.history.replaceState({}, "");
      })
      .catch(console.error);
  }, [location.state, clients]);

  const activeFilterCount =
    (filters.lastVisit !== "all" ? 1 : 0) +
    (filters.serviceId !== "all" ? 1 : 0) +
    (filters.staffId !== "all" ? 1 : 0) +
    (filters.gender !== "all" ? 1 : 0);

  return (
    <div className="chp-root">

      {/* ══════════ LEFT: client list ══════════ */}
      <div className="chp-sidebar">
        <div className="chp-sidebar-head">
          <h2 className="chp-sidebar-title">Customers</h2>

          <div className="chp-search-wrap">
            <Search size={13} className="chp-search-icon" />
            <input
              className="chp-search-input"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className={`chp-filter-toggle ${showFilters ? "open" : ""} ${activeFilterCount > 0 ? "has-active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Funnel size={12} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="chp-filter-count">{activeFilterCount}</span>
            )}
          </button>

          {showFilters && (
            <div className="chp-filter-panel">
              {/* Last visit */}
              <div className="chp-filter-group">
                <label className="chp-filter-label">Last Visit</label>
                <Dropdown
                  searchable={false}
                  value={filters.lastVisit}
                  options={[
                    { id: "all", name: "All clients" },
                    { id: "7", name: "Within 7 days" },
                    { id: "30", name: "Within 30 days" },
                    { id: "90", name: "Within 90 days" },
                    { id: "90plus", name: "90+ days ago" },
                  ]}
                  onChange={(id) => setFilters({ ...filters, lastVisit: id as LastVisitFilter })}
                />
              </div>

              {/* Service */}
              <div className="chp-filter-group">
                <label className="chp-filter-label">Service Taken</label>
                <Dropdown
                  value={filters.serviceId}
                  options={[{ id: "all", name: "All services" }, ...services.map((s) => ({ id: s.id, name: s.name }))]}
                  onChange={(id) => setFilters({ ...filters, serviceId: id })}
                />
              </div>

              {/* Staff */}
              <div className="chp-filter-group">
                <label className="chp-filter-label">Attended by Staff</label>
                <Dropdown
                  value={filters.staffId}
                  options={[{ id: "all", name: "All staff" }, ...staffList.map((s) => ({ id: s.id, name: s.full_name }))]}
                  onChange={(id) => setFilters({ ...filters, staffId: id })}
                />
              </div>

              {/* Gender */}
              <div className="chp-filter-group">
                <label className="chp-filter-label">Gender</label>
                <Dropdown
                  searchable={false}
                  value={filters.gender}
                  options={[
                    { id: "all", name: "All" },
                    { id: "female", name: "Female" },
                    { id: "male", name: "Male" },
                    { id: "other", name: "Other" },
                  ]}
                  onChange={(id) => setFilters({ ...filters, gender: id })}
                />
              </div>

              {activeFilterCount > 0 && (
                <button
                  className="chp-clear-filters"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          <div className="chp-result-count">
            {(clientsTotal || clients.length).toLocaleString("en-IN")}{" "}
            {(clientsTotal || clients.length) === 1 ? "client" : "clients"}
            {clientsLoading && <span className="chp-count-loading" />}
          </div>
        </div>

        <div className="chp-client-list" onScroll={handleListScroll}>
          {clientsLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="chp-client-row" style={{ cursor: "default" }}>
                <Skeleton width={38} height={38} borderRadius="50%" />
                <div className="chp-row-info" style={{ flex: 1 }}>
                  <Skeleton width="65%" height={13} style={{ marginBottom: 6 }} />
                  <Skeleton width="45%" height={11} />
                </div>
              </div>
            ))
          ) : clients.length === 0 ? (
            <div className="chp-list-msg">No clients match these filters</div>
          ) : (
            <>
              {clients.map((c) => {
                const isSelected = selectedClient?.id === c.id;
                const isGold = parseFloat(c.total_sales) > 5000;
                return (
                  <div
                    key={c.id}
                    className={`chp-client-row ${isSelected ? "active" : ""}`}
                    onClick={() => { setSelectedClient(c); setSelectVersion((v) => v + 1); }}
                  >
                    <div className="chp-row-avatar">{getInitials(c.full_name)}</div>
                    <div className="chp-row-info">
                      <div className="chp-row-name">{c.full_name}</div>
                      <div className="chp-row-phone">
                        {c.phone_country_code} {c.phone_number}
                      </div>
                      {isGold && (
                        <div className="chp-row-meta">
                          <span className="chp-row-badge">
                            <StarFill size={8} /> Gold
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {loadingMore && (
                <div className="chp-list-loading-more">Loading more…</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══════════ RIGHT: detail panel ══════════ */}
      <div className="chp-detail">
        {!selectedClient ? (
          <div className="chp-idle">
            <PersonCircle size={52} />
            <p>Select a customer to view their history</p>
          </div>
        ) : (
          <ClientHistoryDetail
            key={`${selectedClient.id}-${selectVersion}`}
            clientId={selectedClient.id}
            onClose={() => setSelectedClient(null)}
          />
        )}
      </div>
    </div>
  );
}
