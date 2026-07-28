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
import Pagination from "../../../components/ui/Pagination";
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

  // Client list
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsPageSize, setClientsPageSize] = useState(50);
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

  // Fetches a single page, replacing whatever was showing — paged navigation
  // via the shared Pagination component, not the old "load more"/append style.
  const doFetch = useCallback(async (page: number, pageSize: number) => {
    setClientsLoading(true);

    const params: Record<string, string> = { page: String(page), limit: String(pageSize) };
    if (filters.serviceId !== "all") params.service_id = filters.serviceId;
    if (filters.staffId   !== "all") params.staff_id   = filters.staffId;
    if (filters.gender    !== "all") params.gender      = filters.gender;
    if (filters.lastVisit !== "all") params.last_visit  = filters.lastVisit;
    if (debouncedSearch.trim())      params.search      = debouncedSearch.trim();

    try {
      const res = await api.get("/api/v1/clients/with-history-stats", { params });
      const d = res.data?.data;
      setClients(d?.items ?? []);
      setClientsTotal(d?.total ?? d?.count ?? d?.total_count ?? 0);
      setClientsPage(page);
    } catch {
      setClients([]); setClientsTotal(0);
    } finally {
      setClientsLoading(false);
    }
  }, [filters, debouncedSearch]);

  // Refetch page 1 whenever filters, page size, or debounced search change
  useEffect(() => { doFetch(1, clientsPageSize); }, [doFetch, clientsPageSize]);

  const handleClientsPageChange = useCallback((page: number) => {
    doFetch(page, clientsPageSize);
  }, [doFetch, clientsPageSize]);

  const handleClientsPageSizeChange = useCallback((size: number) => {
    setClientsPageSize(size);
  }, []);

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
                <select
                  value={filters.lastVisit}
                  onChange={(e) =>
                    setFilters({ ...filters, lastVisit: e.target.value as LastVisitFilter })
                  }
                >
                  <option value="all">All clients</option>
                  <option value="7">Within 7 days</option>
                  <option value="30">Within 30 days</option>
                  <option value="90">Within 90 days</option>
                  <option value="90plus">90+ days ago</option>
                </select>
              </div>

              {/* Service */}
              <div className="chp-filter-group">
                <label className="chp-filter-label">Service Taken</label>
                <select
                  value={filters.serviceId}
                  onChange={(e) => setFilters({ ...filters, serviceId: e.target.value })}
                >
                  <option value="all">All services</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Staff */}
              <div className="chp-filter-group">
                <label className="chp-filter-label">Attended by Staff</label>
                <select
                  value={filters.staffId}
                  onChange={(e) => setFilters({ ...filters, staffId: e.target.value })}
                >
                  <option value="all">All staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div className="chp-filter-group">
                <label className="chp-filter-label">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                >
                  <option value="all">All</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
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

        <div className="chp-client-list">
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
            clients.map((c) => {
              const isSelected = selectedClient?.id === c.id;
              const isGold = parseFloat(c.total_sales) > 5000;
              return (
                <div
                  key={c.id}
                  className={`chp-client-row ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedClient(c)}
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
            })
          )}
        </div>

        <Pagination
          currentPage={clientsPage}
          pageSize={clientsPageSize}
          totalItems={clientsTotal}
          onPageChange={handleClientsPageChange}
          onPageSizeChange={handleClientsPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          className="chp-pagination"
        />
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
            key={selectedClient.id}
            clientId={selectedClient.id}
            onClose={() => setSelectedClient(null)}
          />
        )}
      </div>
    </div>
  );
}
