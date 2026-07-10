// src/features/clients/pages/ClientHistoryPage.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Printer,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { printReceipt, buildPrintableBooking } from "../../bookings/utils/receipt";
import Pagination from "../../../components/ui/Pagination";
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
  payment_method?: string | null;
  paymentMode?: string | null;
  payment_mode?: string | null;
  membership_wallet_used?: number;
  services: Array<{ name?: string; service_name?: string; price?: number }>;
  product_items: Array<{ name: string }>;
  package_items?: Array<{ name?: string; package_name?: string; price?: number; total?: number }>;
  staff_id?: string | null;
  staff?: { id: string; full_name?: string } | null;
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


// ── Component ─────────────────────────────────────────────────────────────────
export default function ClientHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const autoOpenHandled = useRef(false);

  // Client list
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsLoadingMore, setClientsLoadingMore] = useState(false);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsHasMore, setClientsHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filter dropdown data — read from Redux (same store the calendar uses)
  const reduxServices = useAppSelector((s: any) => s.services.items ?? []);
  const reduxStaff = useAppSelector((s: any) => s.staff.items ?? []);
  const currentSalon = useAppSelector((s: any) => s.salon.currentSalon);
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

  // History tab pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // Global right-panel filter — applies across all tabs
  const [showGlobalFilter, setShowGlobalFilter] = useState(false);
  const [globalDatePreset, setGlobalDatePreset] = useState("all");
  const [globalCalDay, setGlobalCalDay] = useState<string | null>(null);
  const [globalCalendarDate, setGlobalCalendarDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [globalServiceFilter, setGlobalServiceFilter] = useState("all");
  const [globalStaffFilter, setGlobalStaffFilter] = useState("all");
  const [showFilterCal, setShowFilterCal] = useState(false);

  // Jump back to page 1 whenever the global filter changes the underlying result set
  useEffect(() => {
    setHistoryPage(1);
  }, [globalDatePreset, globalCalDay, globalServiceFilter, globalStaffFilter]);

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

  // Core fetch function — replace=true resets the list (page 1), false appends (load more)
  const doFetch = useCallback(async (page: number, replace: boolean) => {
    if (replace) setClientsLoading(true);
    else setClientsLoadingMore(true);

    const params: Record<string, string> = { page: String(page), limit: "50" };
    if (filters.serviceId !== "all") params.service_id = filters.serviceId;
    if (filters.staffId   !== "all") params.staff_id   = filters.staffId;
    if (filters.gender    !== "all") params.gender      = filters.gender;
    if (filters.lastVisit !== "all") params.last_visit  = filters.lastVisit;
    if (debouncedSearch.trim())      params.search      = debouncedSearch.trim();

    try {
      const res = await api.get("/api/v1/clients/with-history-stats", { params });
      const d = res.data?.data;
      const newItems: ClientListItem[] = d?.items ?? [];
      setClients((prev) => replace ? newItems : [...prev, ...newItems]);
      setClientsTotal(d?.total ?? d?.count ?? d?.total_count ?? 0);
      setClientsHasMore(d?.hasMore ?? d?.has_more ?? false);
      setClientsPage(page);
    } catch {
      if (replace) { setClients([]); setClientsTotal(0); setClientsHasMore(false); }
    } finally {
      if (replace) setClientsLoading(false);
      else setClientsLoadingMore(false);
    }
  }, [filters, debouncedSearch]);

  // Refetch page 1 whenever filters or debounced search change
  useEffect(() => { doFetch(1, true); }, [doFetch]);

  const loadHistory = useCallback(async (c: ClientListItem) => {
    setSelectedClient(c);
    setData(null);
    setHistoryLoading(true);
    setActiveTab("history");
    setHistoryPage(1);
    setGlobalCalDay(null);
    setGlobalDatePreset("all");
    setGlobalServiceFilter("all");
    setGlobalStaffFilter("all");
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


  // Auto-open a specific client when navigated from the appointment modal
  useEffect(() => {
    const openClientId = (location.state as any)?.openClientId;
    if (!openClientId || autoOpenHandled.current) return;
    autoOpenHandled.current = true;
    const existing = clients.find((c) => String(c.id) === String(openClientId));
    if (existing) {
      loadHistory(existing);
      window.history.replaceState({}, "");
      return;
    }
    api
      .get(`/api/v1/clients/${openClientId}`)
      .then((res) => {
        const c = res.data?.data || res.data || null;
        if (c?.id) loadHistory(c);
        window.history.replaceState({}, "");
      })
      .catch(console.error);
  }, [location.state, clients, loadHistory]);

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

  const now = new Date();

  const completed = appointments.filter((a) => a.status === "completed");

  // Sort upcoming ascending → first element is the nearest future appointment
  const upcoming = [...appointments]
    .filter((a) => ["booked", "confirmed"].includes(a.status) && new Date(a.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Last visit = most recent completed appointment OR most recent completed sale only
  const lastCompletedDate = [...completed]
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0]?.scheduled_at;
  const lastCompletedSaleDate = [...sales]
    .filter((s) => s.status === "completed")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at;

  const lastVisit = !lastCompletedDate
    ? lastCompletedSaleDate
    : !lastCompletedSaleDate
      ? lastCompletedDate
      : new Date(lastCompletedDate) >= new Date(lastCompletedSaleDate)
        ? lastCompletedDate
        : lastCompletedSaleDate;

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

  // Packages from sale line items
  const packagesFromSales = sales.flatMap((s) =>
    (s.items ?? []).filter((it) => it.item_type === "package")
      .map((it) => ({ ...it, sale_date: s.created_at, sale_id: s.id }))
  );
  const salePackageNames = new Set(packagesFromSales.map((it) => it.name));

  // Packages booked directly inside appointments (package_items field)
  const packagesFromAppointments = appointments.flatMap((a) =>
    (a.package_items ?? [])
      .map((p) => ({ resolvedName: p.name || p.package_name || "", price: p.total ?? p.price ?? 0, appt: a }))
      .filter((p) => p.resolvedName && !salePackageNames.has(p.resolvedName))
      .map((p) => ({
        name: p.resolvedName,
        item_type: "package",
        quantity: 1,
        unit_price: String(p.price),
        total_price: String(p.price),
        sale_date: p.appt.scheduled_at,
        sale_id: p.appt.id,
      }))
  );
  const allPackageItems = [...packagesFromSales, ...packagesFromAppointments];
  const apptPackageNames = new Set(packagesFromAppointments.map((p) => p.name));

  // Services from appointments (not captured in sales items; exclude items that are actually packages)
  const saleServiceNames = new Set(servicesFromSales.map((it) => it.name));
  const servicesFromAppointments = appointments.flatMap((a) =>
    (a.services ?? [])
      .map((s) => ({ ...s, resolvedName: s.name || s.service_name || "" }))
      .filter((s) => s.resolvedName && !saleServiceNames.has(s.resolvedName) && !apptPackageNames.has(s.resolvedName))
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

  const completedSalesCount = sales.filter((s) => s.status === "completed").length;
  const avgTicket =
    completedSalesCount > 0
      ? Math.round(stats ? stats.lifetime_spend / completedSalesCount : 0)
      : 0;

  const isGoldMember = stats ? stats.lifetime_spend > 5000 : false;

  // appointment id → staff id (from the history API response)
  const appointmentStaffMap = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((a) => {
      const sid = a.staff_id ?? a.staff?.id;
      if (sid) map.set(a.id, sid);
    });
    return map;
  }, [appointments]);

  // appointment id → service names array
  const appointmentServicesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    appointments.forEach((a) => {
      const names = (a.services ?? [])
        .map((s) => s.name || s.service_name || "")
        .filter(Boolean);
      if (names.length) map.set(a.id, names);
    });
    return map;
  }, [appointments]);

  // Service names for the global filter dropdown — derived directly from allServices
  // so every option value is guaranteed to match an item in the Services tab data
  const uniqueServiceNames = useMemo(() => {
    const names = new Set<string>();
    allServices.forEach((it) => { if (it.name) names.add(it.name); });
    return [...names].sort();
  }, [allServices]);

  const globalFilterCount =
    (globalDatePreset !== "all" || globalCalDay !== null ? 1 : 0) +
    (globalServiceFilter !== "all" ? 1 : 0) +
    (globalStaffFilter !== "all" ? 1 : 0);

  const hasGlobalFilter = globalFilterCount > 0;

  // Apply global filters across all tab data at once
  const {
    visibleAppointments, visibleQuickSales, filteredAllServices,
    filteredProductsFromSales, filteredMembershipsFromSales, filteredPackages, filteredPackageItems, filteredSales,
  } = useMemo(() => {
    const matchDate = (dateStr: string): boolean => {
      if (globalCalDay) return dateStr.slice(0, 10) === globalCalDay;
      if (globalDatePreset === "all") return true;
      const cutoff = Date.now() - parseInt(globalDatePreset) * 24 * 60 * 60 * 1000;
      return new Date(dateStr).getTime() >= cutoff;
    };
    return {
      visibleAppointments: appointments.filter((a) => {
        if (!matchDate(a.scheduled_at)) return false;
        if (globalServiceFilter !== "all" && !(a.services ?? []).some((s) => (s.name || s.service_name) === globalServiceFilter)) return false;
        if (globalStaffFilter !== "all" && a.staff_id !== globalStaffFilter) return false;
        return true;
      }),
      visibleQuickSales: quickSales.filter((s) => {
        if (!matchDate(s.created_at)) return false;
        if (globalServiceFilter !== "all" && !(s.items ?? []).some((it) => it.item_type === "service" && it.name === globalServiceFilter)) return false;
        return true;
      }),
      filteredAllServices: allServices.filter((it) =>
        matchDate(it.sale_date) && (globalServiceFilter === "all" || it.name === globalServiceFilter)
      ),
      filteredProductsFromSales: productsFromSales.filter((it) => matchDate(it.sale_date)),
      filteredMembershipsFromSales: membershipsFromSales.filter((it) => matchDate(it.sale_date)),
      filteredPackages: packages.filter((pkg) => matchDate(pkg.created_date)),
      filteredPackageItems: allPackageItems.filter((it) => matchDate(it.sale_date)),
      filteredSales: sales.filter((s) => {
        if (!matchDate(s.created_at)) return false;
        if (globalServiceFilter !== "all") {
          const inItems = (s.items ?? []).some((it) => it.item_type === "service" && it.name === globalServiceFilter);
          const inAppt = s.appointment_id ? (appointmentServicesMap.get(s.appointment_id) ?? []).includes(globalServiceFilter) : false;
          if (!inItems && !inAppt) return false;
        }
        if (globalStaffFilter !== "all") {
          if (!s.appointment_id) return false;
          if (appointmentStaffMap.get(s.appointment_id) !== globalStaffFilter) return false;
        }
        return true;
      }),
    };
  }, [
    appointments, quickSales, allServices, productsFromSales, membershipsFromSales, packages, sales,
    globalCalDay, globalDatePreset, globalServiceFilter, globalStaffFilter,
    appointmentServicesMap, appointmentStaffMap,
  ]);

  // Calendar dot map — always built from full unfiltered data (the calendar IS the filter)
  const calendarDotMap = useMemo(() => {
    const map = new Map<string, "completed" | "booked">();
    const toKey = (d: string) => d.slice(0, 10);
    appointments.forEach((a) => {
      const key = toKey(a.scheduled_at);
      const existing = map.get(key);
      if (a.status === "completed") {
        map.set(key, "completed");
      } else if (["booked", "confirmed"].includes(a.status) && existing !== "completed") {
        map.set(key, "booked");
      }
    });
    quickSales.forEach((s) => {
      const key = toKey(s.created_at);
      if (!map.has(key)) map.set(key, "completed");
    });
    return map;
  }, [appointments, quickSales]);

  // A package purchase produces both a `sales` row and a `packages` (client-package)
  // row for the same event — match them by name/amount/time so a package entry can
  // reuse the sale's real invoice for printing, and any duplicate "Quick Sale" row for
  // it can be dropped from Visit History. Matched on name/amount/time rather than the
  // sale item's `item_type` field, since the backend sometimes mislabels a package
  // line item as "service".
  const packageSaleMatch = useMemo(() => {
    const usedSaleIds = new Set<string>();
    const map = new Map<string, SaleRecord>();
    packages.forEach((pkg) => {
      const pkgTime = new Date(pkg.created_date).getTime();
      const pkgAmount = Number(pkg.total_amount) || 0;
      const matchedSale = sales.find((sale) => {
        if (usedSaleIds.has(sale.id)) return false;
        const hasPkgItem = (sale.items ?? []).some((it) => it.name === pkg.package_name);
        if (!hasPkgItem) return false;
        if (Math.abs((Number(sale.total_amount) || 0) - pkgAmount) > 0.5) return false;
        return Math.abs(new Date(sale.created_at).getTime() - pkgTime) < 10 * 60 * 1000;
      });
      if (matchedSale) {
        usedSaleIds.add(matchedSale.id);
        map.set(pkg.id, matchedSale);
      }
    });
    return map;
  }, [packages, sales]);

  // Unified, date-sorted Visit History feed: appointments + quick sales + package purchases
  type VisitEntry =
    | { kind: "appointment"; date: string; appt: AppointmentRecord }
    | { kind: "quickSale"; date: string; sale: SaleRecord }
    | { kind: "package"; date: string; pkg: PackageRecord; sale?: SaleRecord };

  const visitHistoryEntries: VisitEntry[] = useMemo(() => {
    const packageEntries: VisitEntry[] = filteredPackages.map((pkg) => ({
      kind: "package" as const,
      date: pkg.created_date,
      pkg,
      sale: packageSaleMatch.get(pkg.id),
    }));
    const usedSaleIds = new Set(
      packageEntries.map((e) => (e.kind === "package" ? e.sale?.id : undefined)).filter(Boolean)
    );

    const entries: VisitEntry[] = [
      ...visibleAppointments.map((appt) => ({ kind: "appointment" as const, date: appt.scheduled_at, appt })),
      ...visibleQuickSales
        .filter((sale) => !usedSaleIds.has(sale.id))
        .map((sale) => ({ kind: "quickSale" as const, date: sale.created_at, sale })),
      ...packageEntries,
    ];
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visibleAppointments, visibleQuickSales, filteredPackages, packageSaleMatch]);

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

  // Reuses the same invoice template/print flow as the calendar (ViewBillModal's
  // printReceipt, via the shared buildPrintableBooking mapper) instead of
  // maintaining a second, simpler bill layout here — one invoice design across
  // the app instead of two diverging ones.
  const printStaffList = staffList.map((s) => ({ id: s.id, name: s.full_name }));
  const clientPhoneForPrint = [client?.phone_country_code, client?.phone_number].filter(Boolean).join(" ");

  const printAppointmentBill = (appt: AppointmentRecord, linkedSale: SaleRecord | undefined) => {
    const booking = buildPrintableBooking({
      id: appt.id,
      clientId: client?.id,
      clientName: client?.full_name,
      clientPhone: clientPhoneForPrint,
      clientEmail: client?.email,
      staffId: appointmentStaffMap.get(appt.id),
      dateIso: appt.scheduled_at,
      items: linkedSale?.items ?? [],
      extraServices: (appt.services ?? []).map((s) => ({ name: s.name || s.service_name || "", price: s.price ?? 0 })),
      status: appt.status,
      rawPaymentStatus: linkedSale?.status ?? appt.payment_status,
      paymentMethod: linkedSale?.payment_method ?? (appt as any).payment_method,
      invoiceNumber: linkedSale?.invoice_number,
      grandTotalOverride: linkedSale ? Number(linkedSale.total_amount) : Number(appt.amount_paid || 0),
      notes: appt.notes,
    });
    printReceipt(booking, printStaffList, currentSalon, { phone: clientPhoneForPrint, email: client?.email, referralCode: (client as any)?.referral_code ?? null });
  };

  const printSaleBill = (s: SaleRecord) => {
    const booking = buildPrintableBooking({
      id: s.id,
      clientId: client?.id,
      clientName: client?.full_name,
      clientPhone: clientPhoneForPrint,
      clientEmail: client?.email,
      dateIso: s.created_at,
      items: s.items ?? [],
      status: s.status,
      rawPaymentStatus: s.status,
      paymentMethod: s.payment_method,
      invoiceNumber: s.invoice_number,
      grandTotalOverride: Number(s.total_amount) || 0,
    });
    printReceipt(booking, printStaffList, currentSalon, { phone: clientPhoneForPrint, email: client?.email, referralCode: (client as any)?.referral_code ?? null });
  };

  const printPackageBill = (pkg: PackageRecord, matchedSale: SaleRecord | undefined) => {
    // The backend's sale-row materializer sometimes mislabels the package's own line
    // item as item_type "service" — force it back to "package" here so the printed
    // invoice always badges it correctly, regardless of the matched sale's raw data.
    const items = matchedSale
      ? (matchedSale.items ?? []).map((it) =>
          it.name === pkg.package_name ? { ...it, item_type: "package" } : it
        )
      : [{
          name: pkg.package_name,
          item_type: "package",
          quantity: 1,
          unit_price: pkg.total_amount,
          total_price: pkg.total_amount,
        }];
    const booking = buildPrintableBooking({
      id: matchedSale?.id ?? pkg.id,
      clientId: client?.id,
      clientName: client?.full_name,
      clientPhone: clientPhoneForPrint,
      clientEmail: client?.email,
      dateIso: matchedSale?.created_at ?? pkg.created_date,
      items,
      status: matchedSale?.status ?? pkg.status,
      rawPaymentStatus: matchedSale?.status ?? pkg.payment_status,
      paymentMethod: matchedSale?.payment_method ?? null,
      invoiceNumber: matchedSale?.invoice_number,
      grandTotalOverride: matchedSale ? Number(matchedSale.total_amount) : (Number(pkg.total_amount) || 0),
    });
    printReceipt(booking, printStaffList, currentSalon, { phone: clientPhoneForPrint, email: client?.email });
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
            <div className="chp-list-msg">Loading clients...</div>
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
                  onClick={() => loadHistory(c)}
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
          {clientsHasMore && (
            <button
              className="chp-load-more-btn"
              onClick={() => doFetch(clientsPage + 1, false)}
              disabled={clientsLoadingMore}
            >
              {clientsLoadingMore ? "Loading..." : `Load more (${clientsTotal - clients.length} remaining)`}
            </button>
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
                    <div className="chp-stat-val">{stats.completed_appointments + quickSales.length}</div>
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
            <div className="chp-tab-bar-row">
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

              {/* Global filter toggle — always visible, affects all tabs */}
              <button
                className={`chp-tab chp-tab--filter ${showGlobalFilter ? "filter-open" : ""} ${globalFilterCount > 0 ? "filter-active" : ""}`}
                onClick={() => setShowGlobalFilter((v) => !v)}
              >
                <Funnel size={11} />
                <span>Filter</span>
                {globalFilterCount > 0 && (
                  <span className="chp-tab-filter-badge">{globalFilterCount}</span>
                )}
              </button>
            </div>

            {/* ── Body row: tab content + global filter panel ── */}
            <div className="chp-body-row">
              <div className="chp-tab-content">

              {/* HISTORY tab */}
              {activeTab === "history" && (
                <div className="chp-card">
                  <div className="chp-card-header">
                    <span className="chp-card-title">
                      Visit History{hasGlobalFilter ? ` (${visitHistoryEntries.length} filtered)` : ""}
                    </span>
                  </div>

                    {appointments.length === 0 && quickSales.length === 0 && packages.length === 0 ? (
                      <div className="chp-no-data">No visits found</div>
                    ) : visitHistoryEntries.length === 0 ? (
                      <div className="chp-no-data">No visits match the current filter</div>
                    ) : (
                      <div className="chp-visit-list">
                        {visitHistoryEntries
                          .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                          .map((entry) => {
                          if (entry.kind === "package") {
                            const pkg = entry.pkg;
                            const isPkgPaid = pkg.payment_status === "paid";
                            const d = fmtDate(pkg.created_date);
                            return (
                              <div key={`pkg-${pkg.id}`} className="chp-visit-row">
                                <div className="chp-visit-dot" style={{ background: "#7c3aed" }} />
                                <div className="chp-visit-date">
                                  <div className="chp-visit-day">{d.day}</div>
                                  <div className="chp-visit-mon">{d.month}</div>
                                  <div className="chp-visit-yr">{d.year}</div>
                                </div>
                                <div className="chp-visit-info">
                                  <div className="chp-visit-name">{pkg.package_name}</div>
                                  <div className="chp-visit-staff">Package Sold</div>
                                  <div className="chp-visit-time">
                                    <Clock size={10} /> {d.time}
                                  </div>
                                </div>
                                <div className="chp-visit-right">
                                  <div className="chp-visit-amount">{fmtRupees(pkg.total_amount)}</div>
                                  <div className={`chp-visit-badge ${isPkgPaid ? "paid" : "unpaid"}`}>
                                    {isPkgPaid ? "Paid" : pkg.payment_status || "Unpaid"}
                                  </div>
                                </div>
                                <button
                                  className="chp-print-btn"
                                  title="Print bill"
                                  onClick={(e) => { e.stopPropagation(); printPackageBill(pkg, entry.sale); }}
                                >
                                  <Printer size={13} />
                                </button>
                              </div>
                            );
                          }
                          if (entry.kind === "quickSale") {
                            const s = entry.sale;
                            const d = fmtDate(s.created_at);
                            const firstName = (s.items ?? []).find((it) => it.item_type === "service")?.name
                              || (s.items ?? [])[0]?.name
                              || "Quick Sale";
                            const extraItems = (s.items?.length ?? 0) - 1;
                            const isSalePackagePaid = (s.payment_method || "").toLowerCase() === "package";
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
                                  {s.status === "completed" && isSalePackagePaid && (
                                    <div className="chp-visit-package-tag">via Package</div>
                                  )}
                                </div>
                                <button
                                  className="chp-print-btn"
                                  title="Print bill"
                                  onClick={(e) => { e.stopPropagation(); printSaleBill(s); }}
                                >
                                  <Printer size={13} />
                                </button>
                              </div>
                            );
                          }
                          const appt = entry.appt;
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
                          const isPackagePaid = linkedSale
                            ? (linkedSale.payment_method || "").toLowerCase() === "package"
                            : (appt.payment_method || appt.paymentMode || appt.payment_mode || "").toLowerCase() === "package";
                          const isMembershipPaid = Number(appt.membership_wallet_used) > 0;
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
                                {isPaid && isPackagePaid && (
                                  <div className="chp-visit-package-tag">via Package</div>
                                )}
                                {isPaid && isMembershipPaid && (
                                  <div className="chp-visit-package-tag chp-visit-package-tag--membership">via Membership</div>
                                )}
                              </div>
                              <button
                                className="chp-print-btn"
                                title="Print bill"
                                onClick={(e) => { e.stopPropagation(); printAppointmentBill(appt, linkedSale); }}
                              >
                                <Printer size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {visitHistoryEntries.length > 0 && (
                      <Pagination
                        currentPage={historyPage}
                        pageSize={historyPageSize}
                        totalItems={visitHistoryEntries.length}
                        onPageChange={setHistoryPage}
                        onPageSizeChange={(sz) => { setHistoryPageSize(sz); setHistoryPage(1); }}
                        pageSizeOptions={[10, 25, 50, 100]}
                      />
                    )}
                </div>
              )}

              {/* SERVICES tab */}
              {activeTab === "services" && (
                <div className="chp-card">
                  <div className="chp-card-header">
                    <span className="chp-card-title">
                      Services availed ({filteredAllServices.length}{hasGlobalFilter && filteredAllServices.length !== allServices.length ? ` of ${allServices.length}` : ""})
                    </span>
                  </div>
                  {filteredAllServices.length === 0 ? (
                    <div className="chp-no-data">{allServices.length === 0 ? "No services availed yet" : "No services match the current filter"}</div>
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
                        {filteredAllServices.map((it, i) => (
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
                    <span className="chp-card-title">
                      Memberships purchased ({filteredMembershipsFromSales.length}{hasGlobalFilter && filteredMembershipsFromSales.length !== membershipsFromSales.length ? ` of ${membershipsFromSales.length}` : ""})
                    </span>
                  </div>
                  {filteredMembershipsFromSales.length === 0 ? (
                    <div className="chp-no-data">{membershipsFromSales.length === 0 ? "No memberships purchased yet" : "No memberships match the current filter"}</div>
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
                        {filteredMembershipsFromSales.map((it, i) => (
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
                  {/* One-time package bookings from appointments */}
                  {filteredPackageItems.length > 0 && (
                    <div className="chp-card" style={{ gridColumn: "1 / -1" }}>
                      <div className="chp-card-header">
                        <span className="chp-card-title">Package bookings ({filteredPackageItems.length})</span>
                      </div>
                      <table className="chp-table">
                        <thead><tr><th>Package</th><th>Date</th><th>Amount</th></tr></thead>
                        <tbody>
                          {filteredPackageItems.map((it, i) => (
                            <tr key={i}>
                              <td>{it.name}</td>
                              <td>{fmtDateShort(it.sale_date)}</td>
                              <td>₹{Number(it.total_price || 0).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredPackages.length === 0 && filteredPackageItems.length === 0 ? (
                    <div className="chp-no-data">No packages found</div>
                  ) : filteredPackages.length === 0 ? null : (
                    filteredPackages.map((pkg) => {
                      const isExpired = pkg.expiry_date && new Date(pkg.expiry_date) < new Date();
                      const displayStatus = isExpired ? "expired" : pkg.status;
                      return (
                        <div key={pkg.id} className="chp-pkg-card">
                          <div className="chp-pkg-top">
                            <div className="chp-pkg-name">{pkg.package_name}</div>
                            <span className={`chp-status-badge chp-status-badge--${displayStatus}`}>
                              {displayStatus}
                            </span>
                          </div>
                          <div className="chp-pkg-meta">
                            Purchased {fmtDateShort(pkg.created_date)} · Expires {fmtDateShort(pkg.expiry_date)}
                          </div>
                          {(pkg.services ?? []).map((svc, i) => {
                            const pct = svc.total_sessions > 0
                              ? Math.round((svc.completed_sessions / svc.total_sessions) * 100)
                              : 0;
                            return (
                              <div key={i} className="chp-pkg-svc">
                                <div className="chp-pkg-svc-row">
                                  <span>{svc.service_name}</span>
                                  <span>{svc.completed_sessions}/{svc.total_sessions}</span>
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
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className="chp-pkg-amount">
                                ₹{Number(pkg.total_amount).toLocaleString("en-IN")}
                              </span>
                              <button
                                className="chp-print-btn"
                                title="Print bill"
                                onClick={(e) => { e.stopPropagation(); printPackageBill(pkg, packageSaleMatch.get(pkg.id)); }}
                              >
                                <Printer size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* PRODUCTS tab */}
              {activeTab === "products" && (
                <div className="chp-card">
                  <div className="chp-card-header">
                    <span className="chp-card-title">
                      Products purchased ({filteredProductsFromSales.length}{hasGlobalFilter && filteredProductsFromSales.length !== productsFromSales.length ? ` of ${productsFromSales.length}` : ""})
                    </span>
                  </div>
                  {filteredProductsFromSales.length === 0 ? (
                    <div className="chp-no-data">{productsFromSales.length === 0 ? "No products purchased yet" : "No products match the current filter"}</div>
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
                        {filteredProductsFromSales.map((it, i) => (
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
                    <span className="chp-card-title">
                      Payment history ({filteredSales.length}{filteredSales.length !== sales.length ? ` of ${sales.length}` : ""})
                    </span>
                  </div>
                  {filteredSales.length === 0 ? (
                    <div className="chp-no-data">
                      {sales.length === 0 ? "No payments found" : "No payments match these filters"}
                    </div>
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
                        {filteredSales.map((s) => (
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

              </div>{/* end chp-tab-content */}

              {/* ── Global filter panel (right column) ── */}
              {showGlobalFilter && (
                <div className="chp-global-filter">
                  <div className="chp-global-filter-header">
                    <span className="chp-global-filter-title">Filter</span>
                    <button className="chp-icon-btn" onClick={() => setShowGlobalFilter(false)}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Mini calendar — collapsible */}
                  <button
                    className="chp-filter-cal-toggle"
                    onClick={() => setShowFilterCal((v) => !v)}
                  >
                    <span>Pick a date</span>
                    <span>{showFilterCal ? "▲" : "▼"}</span>
                  </button>
                  {showFilterCal && ((() => {
                    const year = globalCalendarDate.getFullYear();
                    const month = globalCalendarDate.getMonth();
                    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const today = new Date();
                    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
                    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];
                    while (cells.length % 7 !== 0) cells.push(null);
                    return (
                      <div className="chp-mini-cal">
                        <div className="chp-mini-cal-header">
                          <button className="chp-mini-cal-nav" onClick={() => setGlobalCalendarDate(new Date(year, month - 1, 1))}>&#8249;</button>
                          <span className="chp-mini-cal-title">{monthNames[month]} {year}</span>
                          <button className="chp-mini-cal-nav" onClick={() => setGlobalCalendarDate(new Date(year, month + 1, 1))}>&#8250;</button>
                        </div>
                        <div className="chp-mini-cal-grid">
                          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                            <div key={d} className="chp-mini-cal-dow">{d}</div>
                          ))}
                          {cells.map((day, i) => {
                            if (!day) return <div key={i} className="chp-mini-cal-cell chp-mini-cal-cell--empty" />;
                            const key = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                            const dot = calendarDotMap.get(key);
                            const isToday = key === todayKey;
                            const isSelected = globalCalDay === key;
                            return (
                              <div
                                key={i}
                                className={`chp-mini-cal-cell${isToday ? " chp-mini-cal-cell--today" : ""}${isSelected ? " chp-mini-cal-cell--selected" : ""}${dot ? " chp-mini-cal-cell--has-event" : ""}`}
                                onClick={() => { setGlobalCalDay(isSelected ? null : key); if (!isSelected) setGlobalDatePreset("all"); }}
                              >
                                <span>{day}</span>
                                {dot && <div className={`chp-mini-cal-dot chp-mini-cal-dot--${dot}`} />}
                              </div>
                            );
                          })}
                        </div>
                        {globalCalDay && (
                          <div className="chp-mini-cal-legend">
                            Showing: {globalCalDay}
                            <button className="chp-mini-cal-clear" onClick={() => setGlobalCalDay(null)}>✕ Clear</button>
                          </div>
                        )}
                        <div className="chp-mini-cal-key">
                          <span><span className="chp-mini-cal-dot chp-mini-cal-dot--completed" />Completed</span>
                          <span><span className="chp-mini-cal-dot chp-mini-cal-dot--booked" />Upcoming</span>
                        </div>
                      </div>
                    );
                  })())}

                  <div className="chp-global-filter-sep">— or filter by period —</div>

                  <div className="chp-filter-group">
                    <label className="chp-filter-label">Date Range</label>
                    <select
                      value={globalCalDay ? "" : globalDatePreset}
                      onChange={(e) => { setGlobalDatePreset(e.target.value); setGlobalCalDay(null); }}
                    >
                      <option value="all">All time</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 3 months</option>
                      <option value="180">Last 6 months</option>
                      <option value="365">Last year</option>
                    </select>
                  </div>

                  <div className="chp-filter-group">
                    <label className="chp-filter-label">Service</label>
                    <select value={globalServiceFilter} onChange={(e) => setGlobalServiceFilter(e.target.value)}>
                      <option value="all">All services</option>
                      {uniqueServiceNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="chp-filter-group">
                    <label className="chp-filter-label">Staff</label>
                    <select value={globalStaffFilter} onChange={(e) => setGlobalStaffFilter(e.target.value)}>
                      <option value="all">All staff</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  {globalFilterCount > 0 && (
                    <button
                      className="chp-clear-filters"
                      onClick={() => { setGlobalDatePreset("all"); setGlobalCalDay(null); setGlobalServiceFilter("all"); setGlobalStaffFilter("all"); }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>{/* end chp-body-row */}
          </div>
        )}
      </div>
    </div>
  );
}