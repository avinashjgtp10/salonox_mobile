// src/features/clients/pages/ClientHistoryPage.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  Search,
  X,
  Telephone,
  Whatsapp,
  Envelope,
  PencilSquare,
  CalendarPlus,
  Clock,
  StarFill,
  PersonCircle,
  Funnel,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import "../styles/ClientHistoryPage.scss";

// ── Types ──────────────────────────────────────────────────────────────────────
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

interface AppointmentRecord {
  id: string;
  scheduled_at: string;
  status: string;
  payment_status: string;
  duration_minutes: number;
  notes: string | null;
  cancel_reason: string | null;
  amount_paid: number;
  services: Array<{ name?: string; service_name?: string; price?: number }>;
  product_items: Array<{ name: string }>;
}

interface SaleItem {
  name: string;
  item_type: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}
interface SaleRecord {
  id: string;
  invoice_number: string | null;
  status: string;
  total_amount: string;
  payment_method: string | null;
  created_at: string;
  appointment_id: string | null;
  items: SaleItem[] | null;
}

interface PackageService {
  service_name: string;
  total_sessions: number;
  completed_sessions: number;
}
interface PackageRecord {
  id: string;
  package_name: string;
  status: string;
  total_amount: string;
  pending_amount: string;
  payment_status: string;
  expiry_date: string;
  created_date: string;
  services: PackageService[] | null;
}

interface HistoryStats {
  total_appointments: number;
  completed_appointments: number;
  no_shows: number;
  cancellations: number;
  lifetime_spend: number;
  total_sales: number;
  active_packages: number;
}

interface ClientInfo {
  id: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  phone_country_code: string | null;
  is_active: boolean;
  created_at: string;
  avatar_url: string | null;
}

interface HistoryData {
  client: ClientInfo;
  stats: HistoryStats;
  appointments: AppointmentRecord[];
  sales: SaleRecord[];
  packages: PackageRecord[];
}

type TabKey =
  | "history"
  | "services"
  | "memberships"
  | "packages"
  | "products"
  | "payments";

// Filter types
type LastVisitFilter = "all" | "7" | "30" | "60" | "90plus" | "never";

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

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return {
    day: d.getDate().toString().padStart(2, "0"),
    month: d.toLocaleString("en-IN", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
};

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

const fmtRupees = (v: number | string) =>
  "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const buildWaLink = (country_code: string | null, phone: string | null) => {
  if (!phone) return null;
  const pn = phone.replace(/[^0-9]/g, "");
  if (!pn) return null;
  let cc = (country_code ?? "").replace(/[^0-9]/g, "");
  if (!cc) cc = "91";
  return `https://wa.me/${cc}${pn}`;
};

const openWhatsApp = (country_code: string | null, phone: string | null) => {
  const url = buildWaLink(country_code, phone);
  if (!url) {
    alert("This client has no phone number on file.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

// Calculate days since a date
const daysSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
};

// Apply last-visit filter
const matchesLastVisit = (lastVisitAt: string | null, filter: LastVisitFilter): boolean => {
  if (filter === "all") return true;
  const days = daysSince(lastVisitAt);
  if (filter === "never") return days === null;
  if (days === null) return false;
  if (filter === "7") return days <= 7;
  if (filter === "30") return days <= 30;
  if (filter === "60") return days > 30 && days <= 60;
  if (filter === "90plus") return days > 90;
  return true;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ClientHistoryPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Client list
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  // Selected client history
  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(null);
  const [data, setData] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("history");

  // Ensure services + staff are in Redux (calendar may have already loaded them)
  useEffect(() => {
    if (reduxServices.length === 0) dispatch(fetchServicesThunk({ isActive: true }));
    if (reduxStaff.length === 0) dispatch(fetchStaffThunk());
  }, []);

  // Reload client list whenever service or staff filter changes (server-side filtering)
  useEffect(() => {
    setClientsLoading(true);
    const params: Record<string, string> = {};
    if (filters.serviceId !== "all") params.service_id = filters.serviceId;
    if (filters.staffId !== "all") params.staff_id = filters.staffId;
    api.get("/api/v1/clients/with-history-stats", { params })
      .then((res) => setClients(res.data?.data?.items ?? []))
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, [filters.serviceId, filters.staffId]);

  const loadHistory = useCallback(async (c: ClientListItem) => {
    setSelectedClient(c);
    setData(null);
    setHistoryLoading(true);
    setActiveTab("history");
    window.dispatchEvent(new CustomEvent("chp:closeSubSidebar"));
    try {
      const res = await api.get(`/api/v1/clients/${c.id}/history`);
      setData(res.data?.data ?? null);
    } catch {
      setData(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── Combined search + filter ──
  const filtered = useMemo(() => {
    let list = clients;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone_number?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }

    // Last visit
    if (filters.lastVisit !== "all") {
      list = list.filter((c) => matchesLastVisit(c.last_visit_at, filters.lastVisit));
    }

    // Gender
    if (filters.gender !== "all") {
      list = list.filter((c) =>
        (c.gender ?? "").toLowerCase() === filters.gender.toLowerCase()
      );
    }

    return list;
  }, [clients, search, filters]);

  const activeFilterCount =
    (filters.lastVisit !== "all" ? 1 : 0) +
    (filters.serviceId !== "all" ? 1 : 0) +
    (filters.staffId !== "all" ? 1 : 0) +
    (filters.gender !== "all" ? 1 : 0);

  // ── Detail-panel derived data ──
  const client = data?.client;
  const stats = data?.stats;
  const appointments = data?.appointments ?? [];
  const sales = data?.sales ?? [];
  const packages = data?.packages ?? [];

  const completed = appointments.filter((a) => a.status === "completed");
  const upcoming = appointments.filter((a) =>
    ["booked", "confirmed"].includes(a.status)
  );
  const lastVisit = completed[0]?.scheduled_at;
  const nextAppt = upcoming[0]?.scheduled_at;

  // Map appointment_id → sale so we can show the real billed amount per visit
  const saleByAppointmentId = new Map<string, SaleRecord>();
  sales.forEach((s) => { if (s.appointment_id) saleByAppointmentId.set(s.appointment_id, s); });

  // Quick Sell entries: sales with no linked appointment
  const quickSales = sales.filter((s) => !s.appointment_id);

  const servicesFromSales = sales.flatMap((s) =>
    (s.items ?? []).filter((it) => it.item_type === "service")
      .map((it) => ({ ...it, sale_date: s.created_at, sale_id: s.id }))
  );

  // Services from appointments (not captured in sales items)
  const saleServiceNames = new Set(servicesFromSales.map((it) => it.name));
  const servicesFromAppointments = appointments.flatMap((a) =>
    (a.services ?? [])
      .map((s) => ({ ...s, resolvedName: s.name || s.service_name || "" }))
      .filter((s) => s.resolvedName && !saleServiceNames.has(s.resolvedName))
      .map((s) => ({
        name: s.resolvedName,
        item_type: "service",
        quantity: 1,
        unit_price: String(s.price ?? 0),
        total_price: String(s.price ?? 0),
        sale_date: a.scheduled_at,
        sale_id: a.id,
      }))
  );

  const allServices = [...servicesFromSales, ...servicesFromAppointments];
  const productsFromSales = sales.flatMap((s) =>
    (s.items ?? []).filter((it) => it.item_type === "product")
      .map((it) => ({ ...it, sale_date: s.created_at, sale_id: s.id }))
  );
  const membershipsFromSales = sales.flatMap((s) =>
    (s.items ?? []).filter((it) => it.item_type === "membership")
      .map((it) => ({ ...it, sale_date: s.created_at, sale_id: s.id }))
  );

  const avgTicket =
    stats && stats.total_sales > 0
      ? Math.round(stats.lifetime_spend / stats.total_sales)
      : 0;

  const isGoldMember = stats ? stats.lifetime_spend > 5000 : false;

  const TABS: { key: TabKey; label: string }[] = [
    { key: "history", label: "History" },
    { key: "services", label: "Services" },
    { key: "memberships", label: "Memberships" },
    { key: "packages", label: "Packages" },
    { key: "products", label: "Products" },
    { key: "payments", label: "Payments" },
  ];

  const handleBookAppointment = () => {
    if (!client) return;
    navigate("/dashboard/calendar", { state: { prefillClientId: client.id } });
  };

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
                  <option value="60">30 to 60 days ago</option>
                  <option value="90plus">90+ days ago</option>
                  <option value="never">Never visited</option>
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
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
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
            {filtered.length} {filtered.length === 1 ? "client" : "clients"}
          </div>
        </div>

        <div className="chp-client-list">
          {clientsLoading ? (
            <div className="chp-list-msg">Loading clients...</div>
          ) : filtered.length === 0 ? (
            <div className="chp-list-msg">No clients match these filters</div>
          ) : (
            filtered.map((c) => {
              const isSelected = selectedClient?.id === c.id;
              const isGold = parseFloat(c.total_sales) > 5000;
              const days = daysSince(c.last_visit_at);
              return (
                <div
                  key={c.id}
                  className={`chp-client-row ${isSelected ? "active" : ""}`}
                  onClick={() => loadHistory(c)}
                >
                  <div className="chp-row-avatar">{getInitials(c.full_name)}</div>
                  <div className="chp-row-info">
                    <div className="chp-row-name">{c.full_name}</div>
                    <div className="chp-row-phone">
                      {c.phone_country_code} {c.phone_number}
                    </div>
                    <div className="chp-row-meta">
                      {isGold && (
                        <span className="chp-row-badge">
                          <StarFill size={8} /> Gold
                        </span>
                      )}
                      <span className="chp-row-last-visit">
                        {days === null
                          ? "Never visited"
                          : days === 0
                            ? "Today"
                            : `${days}d ago`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════ RIGHT: detail panel ══════════ */}
      <div className="chp-detail">

        {!selectedClient && !historyLoading && (
          <div className="chp-idle">
            <PersonCircle size={52} />
            <p>Select a customer to view their history</p>
          </div>
        )}

        {historyLoading && (
          <div className="chp-idle">
            <div className="chp-spinner" />
            <p>Loading...</p>
          </div>
        )}

        {!historyLoading && client && stats && (
          <div className="chp-content-wrap">

            {/* ── Profile header ── */}
            <div className="chp-profile-header">

              <div className="chp-profile-left">
                <div className="chp-profile-avatar">
                  {getInitials(client.full_name)}
                </div>
                <div className="chp-profile-info">
                  <div className="chp-name-row">
                    <h2 className="chp-client-name">{client.full_name}</h2>
                    {isGoldMember && (
                      <span className="chp-gold-badge">
                        <StarFill size={10} /> Gold Member
                      </span>
                    )}
                    <button
                      className="chp-icon-btn"
                      onClick={() => navigate(`/dashboard/clients/edit/${client.id}`)}
                      title="Edit client"
                    >
                      <PencilSquare size={13} />
                    </button>
                  </div>

                  {client.phone_number && (
                    <div className="chp-contact-row">
                      <Telephone size={11} />
                      <span>
                        {client.phone_country_code} {client.phone_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(client.phone_country_code, client.phone_number)}
                        className="chp-wa-link"
                        title="Open WhatsApp"
                      >
                        <Whatsapp size={14} />
                      </button>
                    </div>
                  )}

                  {client.email && (
                    <div className="chp-contact-row">
                      <Envelope size={11} />
                      <span>{client.email}</span>
                    </div>
                  )}

                  <div className="chp-since">
                    Customer Since: {fmtDateShort(client.created_at)}
                  </div>
                </div>
              </div>

              <div className="chp-profile-right">
                <div className="chp-actions">
                  <button
                    className="chp-btn chp-btn--purple"
                    onClick={handleBookAppointment}
                  >
                    <CalendarPlus size={13} /> Book Appointment
                  </button>
                  <button
                    type="button"
                    className="chp-btn chp-btn--green"
                    onClick={() => openWhatsApp(client.phone_country_code, client.phone_number)}
                  >
                    <Whatsapp size={13} /> Send WhatsApp
                  </button>
                  <button
                    className="chp-icon-btn chp-icon-btn--close"
                    onClick={() => { setSelectedClient(null); setData(null); }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="chp-stat-bar">
                  <div className="chp-stat-item">
                    <div className="chp-stat-val">{stats.total_appointments}</div>
                    <div className="chp-stat-lbl">Total Visits</div>
                  </div>
                  <div className="chp-stat-item">
                    <div className="chp-stat-val">{fmtRupees(stats.lifetime_spend)}</div>
                    <div className="chp-stat-lbl">Total Spend</div>
                  </div>
                  <div className="chp-stat-item">
                    <div className="chp-stat-val">{fmtRupees(avgTicket)}</div>
                    <div className="chp-stat-lbl">Avg. Ticket Size</div>
                  </div>
                  <div className="chp-stat-item">
                    <div className="chp-stat-val">{lastVisit ? fmtDateShort(lastVisit) : "—"}</div>
                    <div className="chp-stat-lbl">Last Visit</div>
                  </div>
                  <div className="chp-stat-item">
                    <div className="chp-stat-val">{nextAppt ? fmtDateShort(nextAppt) : "—"}</div>
                    <div className="chp-stat-lbl">Next Appointment</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="chp-tab-bar">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`chp-tab ${activeTab === t.key ? "active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="chp-tab-content">

              {/* HISTORY tab */}
              {activeTab === "history" && (
                <div className="chp-history-grid">

                  <div className="chp-card">
                    <div className="chp-card-header">
                      <span className="chp-card-title">Visit History</span>
                    </div>

                    {appointments.length === 0 && quickSales.length === 0 ? (
                      <div className="chp-no-data">No visits found</div>
                    ) : (
                      <div className="chp-visit-list">
                        {appointments.slice(0, 10).map((appt) => {
                          const d = fmtDate(appt.scheduled_at);
                          const linkedSale = saleByAppointmentId.get(appt.id);
                          const displayAmount = linkedSale
                            ? Number(linkedSale.total_amount)
                            : appt.amount_paid;
                          const svcName =
                            appt.services?.[0]?.name ||
                            appt.services?.[0]?.service_name ||
                            appt.product_items?.[0]?.name ||
                            "Appointment";
                          const extraSvcs = (appt.services?.length ?? 0) - 1;
                          const isPaid = linkedSale
                            ? linkedSale.status === "completed"
                            : appt.payment_status === "paid" || Number(appt.amount_paid) > 0;
                          return (
                            <div key={appt.id} className="chp-visit-row">
                              <div className="chp-visit-dot" />
                              <div className="chp-visit-date">
                                <div className="chp-visit-day">{d.day}</div>
                                <div className="chp-visit-mon">{d.month}</div>
                                <div className="chp-visit-yr">{d.year}</div>
                              </div>
                              <div className="chp-visit-info">
                                <div className="chp-visit-name">
                                  {svcName}{extraSvcs > 0 ? ` +${extraSvcs} more` : ""}
                                </div>
                                <div className="chp-visit-staff">Status: {appt.status}</div>
                                <div className="chp-visit-time">
                                  <Clock size={10} /> {d.time}
                                </div>
                              </div>
                              <div className="chp-visit-right">
                                <div className="chp-visit-amount">{fmtRupees(displayAmount)}</div>
                                <div className={`chp-visit-badge ${isPaid ? "paid" : "unpaid"}`}>
                                  {isPaid ? "Paid" : appt.payment_status || "Unpaid"}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Quick Sell entries (no linked appointment) */}
                        {quickSales.slice(0, 5).map((s) => {
                          const d = fmtDate(s.created_at);
                          const firstName = (s.items ?? []).find((it) => it.item_type === "service")?.name
                            || (s.items ?? [])[0]?.name
                            || "Quick Sale";
                          const extraItems = (s.items?.length ?? 0) - 1;
                          return (
                            <div key={s.id} className="chp-visit-row">
                              <div className="chp-visit-dot" style={{ background: "#a78bfa" }} />
                              <div className="chp-visit-date">
                                <div className="chp-visit-day">{d.day}</div>
                                <div className="chp-visit-mon">{d.month}</div>
                                <div className="chp-visit-yr">{d.year}</div>
                              </div>
                              <div className="chp-visit-info">
                                <div className="chp-visit-name">
                                  {firstName}{extraItems > 0 ? ` +${extraItems} more` : ""}
                                </div>
                                <div className="chp-visit-staff">Quick Sale</div>
                                <div className="chp-visit-time">
                                  <Clock size={10} /> {d.time}
                                </div>
                              </div>
                              <div className="chp-visit-right">
                                <div className="chp-visit-amount">{fmtRupees(s.total_amount)}</div>
                                <div className={`chp-visit-badge ${s.status === "completed" ? "paid" : "unpaid"}`}>
                                  {s.status === "completed" ? "Paid" : s.status}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* SERVICES tab */}
              {activeTab === "services" && (
                <div className="chp-card">
                  <div className="chp-card-header">
                    <span className="chp-card-title">Services availed ({allServices.length})</span>
                  </div>
                  {allServices.length === 0 ? (
                    <div className="chp-no-data">No services availed yet</div>
                  ) : (
                    <table className="chp-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Date</th>
                          <th style={{ textAlign: "center" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Unit Price</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allServices.map((it, i) => (
                          <tr key={i}>
                            <td className="chp-inv">{it.name}</td>
                            <td>{fmtDateShort(it.sale_date)}</td>
                            <td style={{ textAlign: "center" }}>{it.quantity}</td>
                            <td style={{ textAlign: "right" }}>{fmtRupees(it.unit_price)}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtRupees(it.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* MEMBERSHIPS tab */}
              {activeTab === "memberships" && (
                <div className="chp-card">
                  <div className="chp-card-header">
                    <span className="chp-card-title">Memberships purchased ({membershipsFromSales.length})</span>
                  </div>
                  {membershipsFromSales.length === 0 ? (
                    <div className="chp-no-data">No memberships purchased yet</div>
                  ) : (
                    <table className="chp-table">
                      <thead>
                        <tr>
                          <th>Membership</th>
                          <th>Purchased</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {membershipsFromSales.map((it, i) => (
                          <tr key={i}>
                            <td className="chp-inv">{it.name}</td>
                            <td>{fmtDateShort(it.sale_date)}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtRupees(it.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* PACKAGES tab */}
              {activeTab === "packages" && (
                <div className="chp-pkg-grid">
                  {packages.length === 0 ? (
                    <div className="chp-no-data">No packages found</div>
                  ) : (
                    packages.map((pkg) => (
                      <div key={pkg.id} className="chp-pkg-card">
                        <div className="chp-pkg-top">
                          <div className="chp-pkg-name">{pkg.package_name}</div>
                          <span className={`chp-status-badge chp-status-badge--${pkg.status}`}>
                            {pkg.status}
                          </span>
                        </div>
                        <div className="chp-pkg-meta">
                          Purchased {fmtDateShort(pkg.created_date)} · Expires{" "}
                          {fmtDateShort(pkg.expiry_date)}
                        </div>
                        {(pkg.services ?? []).map((svc, i) => {
                          const pct = svc.total_sessions > 0
                            ? Math.round((svc.completed_sessions / svc.total_sessions) * 100)
                            : 0;
                          return (
                            <div key={i} className="chp-pkg-svc">
                              <div className="chp-pkg-svc-row">
                                <span>{svc.service_name}</span>
                                <span>
                                  {svc.completed_sessions}/{svc.total_sessions}
                                </span>
                              </div>
                              <div className="chp-progress-bar">
                                <div className="chp-progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        <div className="chp-pkg-footer">
                          <span className={`chp-status-badge chp-status-badge--${pkg.payment_status}`}>
                            {pkg.payment_status}
                          </span>
                          <span className="chp-pkg-amount">
                            ₹{Number(pkg.total_amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* PRODUCTS tab */}
              {activeTab === "products" && (
                <div className="chp-card">
                  <div className="chp-card-header">
                    <span className="chp-card-title">Products purchased ({productsFromSales.length})</span>
                  </div>
                  {productsFromSales.length === 0 ? (
                    <div className="chp-no-data">No products purchased yet</div>
                  ) : (
                    <table className="chp-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Date</th>
                          <th style={{ textAlign: "center" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Unit Price</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsFromSales.map((it, i) => (
                          <tr key={i}>
                            <td className="chp-inv">{it.name}</td>
                            <td>{fmtDateShort(it.sale_date)}</td>
                            <td style={{ textAlign: "center" }}>{it.quantity}</td>
                            <td style={{ textAlign: "right" }}>{fmtRupees(it.unit_price)}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtRupees(it.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* PAYMENTS tab */}
              {activeTab === "payments" && (
                <div className="chp-card">
                  <div className="chp-card-header">
                    <span className="chp-card-title">Payment history ({sales.length})</span>
                  </div>
                  {sales.length === 0 ? (
                    <div className="chp-no-data">No payments found</div>
                  ) : (
                    <table className="chp-table">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Date</th>
                          <th>Items</th>
                          <th>Method</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s) => (
                          <tr key={s.id}>
                            <td className="chp-inv">
                              {s.invoice_number ?? `#${s.id.slice(-6).toUpperCase()}`}
                            </td>
                            <td>{fmtDateShort(s.created_at)}</td>
                            <td>
                              <div className="chp-chips">
                                {(s.items ?? []).map((it, i) => (
                                  <span key={i} className="chp-chip">
                                    {it.quantity > 1 ? `${it.quantity}× ` : ""}{it.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>{s.payment_method ?? "—"}</td>
                            <td>
                              <span className={`chp-status-badge chp-status-badge--${s.status}`}>
                                {s.status}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              ₹{Number(s.total_amount).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}