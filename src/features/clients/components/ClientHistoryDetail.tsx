// src/features/clients/components/ClientHistoryDetail.tsx
//
// The client "profile + stats + History/Services/Memberships/Packages/Products/
// Payments tabs" view — extracted out of ClientHistoryPage so it can be reused
// both as that page's right-hand detail panel AND inside a standalone popup
// (see ClientHistoryModal.tsx) opened straight from the calendar's "View
// History" button, instead of navigating away from the calendar entirely.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useCurrency } from "../../../hooks/useCurrency";
import { fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import { getTaxModuleConfig } from "../../settings/utils/taxModuleSettings";
import {
  Telephone,
  Whatsapp,
  Envelope,
  PencilSquare,
  CalendarPlus,
  Clock,
  StarFill,
  Funnel,
  Printer,
  Receipt,
  X,
  Trash,
  Check2,
  XLg,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { formatPaymentMode, isPackageCoveredSale } from "../../../utils/paymentMode";
import { printReceipt, buildPrintableBooking } from "../../bookings/utils/receipt";
import Dropdown from "../../../components/ui/Dropdown";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { getPackageExpiryStatus } from "../../bookings/utils/packageStatus";
import Pagination from "../../../components/ui/Pagination";
import Skeleton from "../../../components/ui/Skeleton";
import PlainStatCard from "./PlainStatCard";
import TabToolbar from "./TabToolbar";
import EwalletTab from "./EwalletTab";
import ReferralsRewardsTab from "./ReferralsRewardsTab";
import CommunicationTab from "./CommunicationTab";
import { useTableSearchSort } from "../hooks/useTableSearchSort";
import "../styles/ClientHistoryPage.scss";

// ── Types ──────────────────────────────────────────────────────────────────────
interface StaffOption { id: string; full_name: string; }

interface AppointmentRecord {
  id: string;
  scheduled_at: string;
  status: string;
  payment_status: string;
  duration_minutes: number;
  notes: string | null;
  staff_alert: string | null;
  cancel_reason: string | null;
  amount_paid: number;
  // Authoritative remaining balance for this appointment (already net of
  // discount/eWallet/membership-wallet — see payments.service.ts) — 0 for a
  // fully-paid appointment, the real outstanding amount for a partial one.
  due_amount?: number;
  payment_method?: string | null;
  paymentMode?: string | null;
  payment_mode?: string | null;
  membership_wallet_used?: number;
  ewallet_used?: number;
  // Actual net bill for a completed appointment (post discount/eWallet/
  // membership-wallet) — null until a completed payment exists.
  net_amount?: number | null;
  // Backfill name from the linked client_memberships/client_packages record
  // (same appointment_id) — used when this appointment's own
  // membership_items/package_items entry came through with no name.
  linked_membership_name?: string | null;
  linked_package_name?: string | null;
  services: Array<{ name?: string; service_name?: string; price?: number }>;
  product_items: Array<{ name: string }>;
  package_items?: Array<{ name?: string; package_name?: string; price?: number; total?: number }>;
  membership_items?: Array<{ name?: string; price?: number; total?: number }>;
  staff_id?: string | null;
  staff?: { id: string; full_name?: string } | null;
}

interface SaleItem {
  name: string;
  item_type: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  discount_amount?: string;
  tax_amount?: string;
  staff_id?: string | null;
}
interface SaleRecord {
  id: string;
  invoice_number: string | null;
  status: string;
  total_amount: string;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
  appointment_id: string | null;
  coupon_code: string | null;
  manual_discount_amount: string | null;
  coupon_discount_amount: string | null;
  referral_discount_amount: string | null;
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
  staff_id?: string | null;
  sale_id?: string | null;
  appointment_id?: string | null;
  services: PackageService[] | null;
}

interface MembershipRecord {
  id: string;
  membership_name: string;
  status: string;
  price_paid: string;
  expires_at: string | null;
  purchased_at: string;
  total_sessions: number;
  used_sessions: number;
  membership_wallet_balance: string;
  staff_id?: string | null;
  discount_balance_remaining?: string | null;
  sale_id?: string | null;
  appointment_id?: string | null;
}

interface ClientNoteRecord {
  id: string;
  staff_name: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

// Shared shape across the E-Wallet / Reward Points / Referral Credit ledgers —
// all three backend tables (ewallet_ledger, reward_points_ledger, referral_ledger)
// use the identical earn/redeem/adjust + balance_after convention.
interface LedgerEntry {
  id: string;
  type: string; // 'credit'|'debit' (e-wallet) or 'earn'|'redeem'|'adjust' (points/referral)
  amount?: number;   // e-wallet field name
  points?: number;   // reward-points field name
  balance_after: number;
  source_type: string | null;
  source_id: string | null;
  note: string | null;
  created_at: string;
}

interface CommunicationEntry {
  channel: "whatsapp";
  source: "automation" | "campaign";
  label: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

interface HistoryStats {
  total_appointments: number;
  completed_appointments: number;
  no_shows: number;
  cancellations: number;
  lifetime_spend: number;
  total_sales: number;
  active_packages: number;
  active_memberships: number;
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
  gender: string | null;
  wallet_balance: number;
  reward_points_balance: number;
  referral_balance: number;
  referral_code: string | null;
  total_referral_earnings: number;
  total_successful_referrals: number;
  client_source: string | null;
  birthday_day_month: string | null; // "MM-DD"
  birthday_year: number | null;
  referred_by: { id: string; full_name: string } | null;
}

interface HistoryData {
  client: ClientInfo;
  stats: HistoryStats;
  appointments: AppointmentRecord[];
  sales: SaleRecord[];
  packages: PackageRecord[];
  memberships: MembershipRecord[];
}

export type TabKey =
  | "overview"
  | "history"
  | "services"
  | "memberships"
  | "packages"
  | "products"
  | "payments"
  | "notes"
  | "ewallet"
  | "referrals"
  | "communication";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (iso: string, durationMinutes?: number) => {
  const d = new Date(iso);
  const endTime = durationMinutes
    ? new Date(d.getTime() + durationMinutes * 60000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : undefined;
  return {
    day: d.getDate().toString().padStart(2, "0"),
    month: d.toLocaleString("en-IN", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    endTime,
  };
};

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

// dd/MM/yyyy — the app's standard date format (matches DateRangePicker.tsx's
// own label formatter), used across the new Overview/Notes/E-Wallet/
// Referrals & Rewards/Communication tabs and their exports.
const fmtDMY = (iso: string | null | undefined) => {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const fmtDMYTime = (iso: string | null | undefined) => {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "–";
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${fmtDMY(iso)} ${time}`;
};

// Birthday is stored split as "MM-DD" + an optional year (a birthday may have
// no year on file) — same convention/format as ClientDetailsDrawer.tsx's
// formatBirthday, just dd/MM/yyyy here to match this page's date format.
const fmtBirthday = (dayMonth: string | null, year: number | null) => {
  if (!dayMonth) return "–";
  const [mm, dd] = dayMonth.split("-");
  if (!mm || !dd) return "–";
  return year ? `${dd}/${mm}/${year}` : `${dd}/${mm}`;
};

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

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
  { key: "services", label: "Services" },
  { key: "memberships", label: "Memberships" },
  { key: "packages", label: "Packages" },
  { key: "products", label: "Products" },
  { key: "payments", label: "Payments" },
  { key: "notes", label: "Notes" },
  { key: "ewallet", label: "E-Wallet" },
  { key: "referrals", label: "Referrals & Rewards" },
  { key: "communication", label: "Communication" },
];

export interface ClientHistoryDetailProps {
  clientId: string;
  // Rendered as the "✕" button in the profile header. In the full page this
  // deselects the client (back to the idle "select a customer" state); in the
  // modal this closes the popup.
  onClose: () => void;
  /** Which tab to land on when first opened — defaults to "history" (Visit History).
   *  Only applied on the very first load; switching clientId afterwards still resets to "history". */
  initialTab?: TabKey;
}

export default function ClientHistoryDetail({ clientId, onClose, initialTab }: ClientHistoryDetailProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const fmtRupees = (v: number | string) => formatAmount(Number(v));
  const currentSalon = useAppSelector((s: any) => s.salon.currentSalon);
  const currentUserProfile = useAppSelector((s: any) => s.user.profile);
  const reduxStaff = useAppSelector((s: any) => s.staff.items ?? []);
  const settingItems = useAppSelector((s: any) => s.setting.items);
  useEffect(() => { dispatch(fetchSettingsThunk()); }, [dispatch]);
  const showTaxBreakupOnInvoice = useMemo(() => getTaxModuleConfig(settingItems).show_breakup_on_invoice, [settingItems]);
  const staffList: StaffOption[] = reduxStaff.map((s: any) => ({
    id: s.id,
    full_name: s.full_name || `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
  }));

  const [data, setData] = useState<HistoryData | null>(null);
  // Standalone (no linked appointment) package/membership purchase revenue —
  // fetched separately from /history's own packages/memberships arrays,
  // which don't select appointment_id and so can't distinguish "sold on its
  // own" from "sold as a line item on an appointment" (that case is already
  // counted via the appointment's own total below). Same two endpoints and
  // same standalone filter useClientDetails.ts uses for the Calendar/Sale
  // Client Information panel's Total Revenue, so this screen's Total Spend
  // matches it instead of silently under-counting a purchase whose
  // background sales-mirror row failed to get created.
  const [standalonePkgRevenue, setStandalonePkgRevenue] = useState(0);
  const [standaloneMemRevenue, setStandaloneMemRevenue] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "overview");
  // loadHistory() unconditionally lands on "history" — that's the right default when the
  // full Client History page switches between clients, but the very first load should
  // honor initialTab (e.g. a report deep-linking straight into the Products tab).
  const initialTabAppliedRef = useRef(false);

  // Appointment id currently open in the reusable View Bill drawer (Visit
  // History rows only — quick sales/packages aren't appointments, they keep
  // their print-only action).
  const [viewBillApptId, setViewBillApptId] = useState<string | null>(null);

  // History tab pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // Services/Memberships/Products/Payments tabs — each paginated independently.
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesPageSize, setServicesPageSize] = useState(10);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPageSize, setProductsPageSize] = useState(10);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(10);
  const [membershipsPage, setMembershipsPage] = useState(1);
  const [membershipsPageSize, setMembershipsPageSize] = useState(10);
  const [packagesPage, setPackagesPage] = useState(1);
  const [packagesPageSize, setPackagesPageSize] = useState(10);

  // New tabs (Notes/E-Wallet/Referrals & Rewards/Communication) — each
  // paginated independently, same convention as the tabs above.
  const [notesPage, setNotesPage] = useState(1);
  const [notesPageSize, setNotesPageSize] = useState(10);
  const [ewalletPage, setEwalletPage] = useState(1);
  const [ewalletPageSize, setEwalletPageSize] = useState(10);
  const [rewardsPage, setRewardsPage] = useState(1);
  const [rewardsPageSize, setRewardsPageSize] = useState(10);
  const [referralLedgerPage, setReferralLedgerPage] = useState(1);
  const [referralLedgerPageSize, setReferralLedgerPageSize] = useState(10);
  const [commPage, setCommPage] = useState(1);
  const [commPageSize, setCommPageSize] = useState(10);

  // Lazy-fetched per-tab data — each only loads the first time its own tab is
  // opened (not on initial mount), so viewing a client's history doesn't
  // always pay for 4 extra API calls it may never need.
  const [notes, setNotes] = useState<ClientNoteRecord[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [ewalletLedger, setEwalletLedger] = useState<LedgerEntry[]>([]);
  const [ewalletLoaded, setEwalletLoaded] = useState(false);

  const [rewardLedger, setRewardLedger] = useState<LedgerEntry[]>([]);
  const [rewardLoaded, setRewardLoaded] = useState(false);
  const [referralLedger, setReferralLedger] = useState<LedgerEntry[]>([]);
  const [referralLoaded, setReferralLoaded] = useState(false);

  const [communications, setCommunications] = useState<CommunicationEntry[]>([]);
  const [commLoaded, setCommLoaded] = useState(false);

  // Global filter — applies across all tabs
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
    setServicesPage(1);
    setProductsPage(1);
    setPaymentsPage(1);
    setMembershipsPage(1);
    setPackagesPage(1);
  }, [globalDatePreset, globalCalDay, globalServiceFilter, globalStaffFilter]);

  // Same standalone-purchase revenue useClientDetails.ts computes from these
  // same two endpoints — see the standalonePkgRevenue/standaloneMemRevenue
  // state comment above.
  const fetchStandaloneRevenue = useCallback(async (id: string) => {
    const [pkgRes, memRes] = await Promise.all([
      api.get(`/api/v1/client-packages?clientId=${id}&limit=500`).catch(() => ({ data: null })),
      api.get(`/api/v1/client-memberships?clientId=${id}&limit=200`).catch(() => ({ data: null })),
    ]);
    const pkgItems: any[] = pkgRes.data?.data?.items ?? pkgRes.data?.items ?? pkgRes.data?.data ?? [];
    const pkgRevenue = Array.isArray(pkgItems)
      ? pkgItems
          .filter((p: any) => !(p.appointmentId ?? p.appointment_id))
          .reduce((sum: number, p: any) => sum + Number(p.paidAmount ?? p.paid_amount ?? p.totalAmount ?? p.total_amount ?? 0), 0)
      : 0;
    const memItems: any[] = memRes.data?.data?.items ?? memRes.data?.items ?? [];
    const memRevenue = Array.isArray(memItems)
      ? memItems
          .filter((m: any) => !(m.appointmentId ?? m.appointment_id))
          .reduce((sum: number, m: any) => sum + Number(m.pricePaid ?? m.price_paid ?? 0), 0)
      : 0;
    setStandalonePkgRevenue(pkgRevenue);
    setStandaloneMemRevenue(memRevenue);
  }, []);

  const loadHistory = useCallback(async (id: string) => {
    setData(null);
    setHistoryLoading(true);
    if (initialTabAppliedRef.current) {
      setActiveTab("overview");
    } else {
      setActiveTab(initialTab ?? "overview");
      initialTabAppliedRef.current = true;
    }
    setHistoryPage(1);
    setServicesPage(1);
    setProductsPage(1);
    setPaymentsPage(1);
    setMembershipsPage(1);
    setPackagesPage(1);
    setNotesPage(1);
    setEwalletPage(1);
    setRewardsPage(1);
    setReferralLedgerPage(1);
    setCommPage(1);
    // Switching clients invalidates every lazy-loaded tab's cached data —
    // each tab's own effect (below) re-fetches the next time it's opened.
    setNotesLoaded(false);
    setEwalletLoaded(false);
    setRewardLoaded(false);
    setReferralLoaded(false);
    setCommLoaded(false);
    setGlobalCalDay(null);
    setGlobalDatePreset("all");
    setGlobalServiceFilter("all");
    setGlobalStaffFilter("all");
    window.dispatchEvent(new CustomEvent("chp:closeSubSidebar"));
    try {
      const res = await api.get(`/api/v1/clients/${id}/history`);
      setData(res.data?.data ?? null);
    } catch {
      setData(null);
    } finally {
      setHistoryLoading(false);
    }
    fetchStandaloneRevenue(id).catch(() => {});
  }, [initialTab, fetchStandaloneRevenue]);

  useEffect(() => { loadHistory(clientId); }, [clientId, loadHistory]);

  // Lazy-load each new tab's own data the first time it's opened for this
  // client — avoids adding 4 mandatory API calls to every single Client
  // History open when most visits only ever look at a couple of tabs.
  useEffect(() => {
    if (activeTab === "notes" && !notesLoaded) {
      setNotesLoaded(true);
      api.get(`/api/v1/clients/${clientId}/notes`)
        .then((res) => setNotes(res.data?.data ?? []))
        .catch(() => setNotes([]));
    }
    if (activeTab === "ewallet" && !ewalletLoaded) {
      setEwalletLoaded(true);
      api.get(`/api/v1/ewallet/${clientId}/ledger`)
        .then((res) => setEwalletLedger(res.data?.data ?? []))
        .catch(() => setEwalletLedger([]));
    }
    if (activeTab === "referrals") {
      if (!rewardLoaded) {
        setRewardLoaded(true);
        api.get(`/api/v1/reward-points/${clientId}/ledger`)
          .then((res) => setRewardLedger(res.data?.data ?? []))
          .catch(() => setRewardLedger([]));
      }
      if (!referralLoaded) {
        setReferralLoaded(true);
        api.get(`/api/v1/referral/${clientId}/ledger`)
          .then((res) => setReferralLedger(res.data?.data ?? []))
          .catch(() => setReferralLedger([]));
      }
    }
    if (activeTab === "communication" && !commLoaded) {
      setCommLoaded(true);
      api.get(`/api/v1/clients/${clientId}/communications`)
        .then((res) => setCommunications(res.data?.data ?? []))
        .catch(() => setCommunications([]));
    }
  }, [activeTab, clientId, notesLoaded, ewalletLoaded, rewardLoaded, referralLoaded, commLoaded]);

  // ── Notes CRUD ─────────────────────────────────────────────────────────────
  const refetchNotes = useCallback(() => {
    api.get(`/api/v1/clients/${clientId}/notes`)
      .then((res) => setNotes(res.data?.data ?? []))
      .catch(() => {});
  }, [clientId]);

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim() || savingNote) return;
    setSavingNote(true);
    try {
      await api.post(`/api/v1/clients/${clientId}/notes`, {
        note: noteText.trim(),
        staff_name: currentUserProfile?.fullName || undefined,
      });
      setNoteText("");
      refetchNotes();
    } catch {
      // Best-effort — the form simply stays filled in so staff can retry.
    } finally {
      setSavingNote(false);
    }
  }, [clientId, noteText, savingNote, currentUserProfile, refetchNotes]);

  const handleSaveEditNote = useCallback(async (id: string) => {
    if (!editingNoteText.trim()) return;
    try {
      await api.patch(`/api/v1/clients/${clientId}/notes/${id}`, { note: editingNoteText.trim() });
      setEditingNoteId(null);
      refetchNotes();
    } catch {
      // Keep the row in edit mode so staff can retry.
    }
  }, [clientId, editingNoteText, refetchNotes]);

  const handleDeleteNote = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/v1/clients/${clientId}/notes/${id}`);
      refetchNotes();
    } catch {
      // Best-effort — note stays visible if the delete failed.
    }
  }, [clientId, refetchNotes]);

  // Unlike ClientHistoryModal (which fully unmounts/remounts on every open,
  // so it always gets a fresh fetch), this component mounts once per
  // selected client and never re-fetches on its own — a sale/payment made
  // elsewhere (e.g. the Calendar, in another tab) while this panel stays
  // mounted left it showing an arbitrarily stale Total Spend/Visits snapshot
  // indefinitely. Silently re-fetch (no tab/filter/page reset, unlike
  // loadHistory) whenever this tab regains focus, so re-checking a client
  // already on screen picks up anything that changed while it was stale.
  useEffect(() => {
    async function silentRefresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await api.get(`/api/v1/clients/${clientId}/history`);
        setData(res.data?.data ?? null);
        fetchStandaloneRevenue(clientId).catch(() => {});
      } catch {
        // Keep showing the last-good snapshot rather than blanking the
        // panel over a transient network blip from a background refresh.
      }
    }
    window.addEventListener("focus", silentRefresh);
    document.addEventListener("visibilitychange", silentRefresh);
    return () => {
      window.removeEventListener("focus", silentRefresh);
      document.removeEventListener("visibilitychange", silentRefresh);
    };
  }, [clientId, fetchStandaloneRevenue]);

  const client = data?.client;
  const stats = data?.stats;
  const appointments = data?.appointments ?? [];
  const sales = data?.sales ?? [];
  const packages = data?.packages ?? [];
  const realMemberships = data?.memberships ?? [];

  // Notes tab shows more than just the manually-added client_notes rows —
  // staff also enter "Notes" and "Staff Alert" text directly on a booking
  // (Quick Sale / AppointmentModal's "Payment & Notes" section, persisted to
  // appointments.notes/staff_alert), and that's exactly what staff expect to
  // see here too, not just notes added from this tab's own form. Merged in
  // as read-only rows (editing/deleting a booking's own note belongs on the
  // booking, not here) tagged by source so it's clear where each came from.
  const combinedNotes = useMemo(() => {
    const manual = notes.map((n) => ({
      id: n.id, date: n.created_at, staffName: n.staff_name, text: n.note,
      source: "manual" as const,
    }));
    const bookingNotes = appointments.flatMap((a) => {
      const staffMember = staffList.find((st) => st.id === (a.staff_id ?? a.staff?.id));
      const staffName = staffMember?.full_name || a.staff?.full_name || null;
      const rows: typeof manual = [];
      if (a.staff_alert?.trim()) {
        rows.push({ id: `alert-${a.id}`, date: a.scheduled_at, staffName, text: a.staff_alert, source: "staffAlert" as any });
      }
      if (a.notes?.trim()) {
        rows.push({ id: `booking-${a.id}`, date: a.scheduled_at, staffName, text: a.notes, source: "bookingNote" as any });
      }
      return rows;
    });
    return [...manual, ...bookingNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, appointments, staffList]);

  const notesSearch = useTableSearchSort<typeof combinedNotes[number]>({
    rows: combinedNotes, searchFields: ["text", "staffName"], defaultSortKey: "date",
  });

  const now = new Date();

  const completed = appointments.filter((a) => a.status === "paid");

  // Sort upcoming ascending → first element is the nearest future appointment
  const upcoming = [...appointments]
    .filter((a) => ["booked", "partial"].includes(a.status) && new Date(a.scheduled_at) >= now)
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

  // An appointment only counts as paid if its linked sale is completed, or —
  // when there's no linked sale — its own payment fields say so. Shared by every
  // tab (History, Services, Products, Memberships) so unpaid visits stay hidden
  // consistently everywhere, not just in the Visit History feed.
  const isApptPaid = (appt: AppointmentRecord) => {
    const linkedSale = saleByAppointmentId.get(appt.id);
    return linkedSale
      ? linkedSale.status === "completed"
      : appt.payment_status === "paid" || Number(appt.amount_paid) > 0;
  };

  // Visit History shows both fully-paid AND partially-paid appointments
  // (SCRUM-1091) — a partial visit still happened. isApptPaid alone dropped any
  // appointment whose linked sale was "partial" (not yet "completed"), hiding
  // real partial-payment visits from the feed.
  const isApptPaidOrPartial = (appt: AppointmentRecord) => {
    const linkedSale = saleByAppointmentId.get(appt.id);
    return linkedSale
      ? linkedSale.status === "completed" || linkedSale.status === "partial"
      : appt.payment_status === "paid" || appt.payment_status === "partial" || Number(appt.amount_paid) > 0;
  };

  // Quick Sell entries: sales with no linked appointment
  const quickSales = sales.filter((s) => !s.appointment_id);

  // Same formula as useClientDetails.ts (the Calendar/Sale Client Information
  // panel's Total Revenue) — kept identical on purpose so this screen and
  // that panel never disagree on the same client's total again. Previously
  // this summed every completed sale's total_amount (which double-counts
  // eWallet-covered spend as new revenue, drops partial payments to ₹0, and
  // silently misses a standalone package/membership sale whenever its
  // background sales-row mirror failed) — see standalonePkgRevenue/
  // standaloneMemRevenue's declaration above for the package/membership half.
  const paidRevenue = appointments
    .filter((a) => a.status === "paid")
    .reduce((sum, a) => {
      const net = a.net_amount;
      // Falls back to amount_paid (not the full catalog total) on the rare
      // paid appointment with no net_amount yet — a "paid" status normally
      // implies a completed payment already populated it.
      return sum + ((net !== null && net !== undefined) ? Number(net) : Number(a.amount_paid ?? 0));
    }, 0);
  // amount_paid intentionally includes eWallet/membership-wallet money (it
  // represents "how much of this bill is settled") — subtract those back out
  // here since neither is new money for the salon, same reasoning as paidRevenue.
  const partialRevenue = appointments
    .filter((a) => a.status === "partial")
    .reduce((sum, a) => {
      const collected = Number(a.amount_paid ?? 0);
      const walletPortion = Number(a.ewallet_used ?? 0) + Number(a.membership_wallet_used ?? 0);
      return sum + Math.max(0, collected - walletPortion);
    }, 0);
  const computedLifetimeSpend = paidRevenue + partialRevenue + standalonePkgRevenue + standaloneMemRevenue;

  const servicesFromSales = sales
    .filter((s) => s.status === "completed")
    .flatMap((s) =>
      (s.items ?? []).filter((it) => it.item_type === "service")
        // Already filtered to s.status === "completed" above, so every row
        // reaching the Services tab genuinely is a completed visit — same
        // reasoning as servicesFromAppointments' isApptPaid filter below.
        .map((it) => ({ ...it, sale_date: s.created_at, sale_id: s.id, invoice_number: s.invoice_number, status: "completed" as const }))
    );

  // A package purchase produces both a `sales` row and a `packages` (client-package)
  // row for the same event — match them by name/amount/time so a package entry can
  // reuse the sale's real invoice for printing, any duplicate "Quick Sale" row for it
  // can be dropped from Visit History, and (below) its sale-line-item mirror can be
  // excluded from the Packages tab's own count. Matched on name/amount/time rather
  // than the sale item's `item_type` field, since the backend sometimes mislabels a
  // package line item as "service".
  const packageSaleMatch = useMemo(() => {
    const usedSaleIds = new Set<string>();
    const map = new Map<string, SaleRecord>();
    const salesById = new Map(sales.map((s) => [s.id, s]));
    packages.forEach((pkg) => {
      // Prefer the real client_packages.sale_id link — the package's own
      // total_amount only ever matches a bundled sale's total_amount by
      // coincidence (a sale can legitimately include other items/tax
      // alongside the package, e.g. a membership discount balance line),
      // which is exactly what made the amount-tolerance fallback below
      // silently fail to match and show this package as two Visit History
      // entries (its own "Package Sold" row AND the underlying sale/
      // appointment row, unmatched and therefore not excluded from either).
      const linkedSale = pkg.sale_id ? salesById.get(pkg.sale_id) : undefined;
      if (linkedSale && !usedSaleIds.has(linkedSale.id)) {
        usedSaleIds.add(linkedSale.id);
        map.set(pkg.id, linkedSale);
        return;
      }

      // Fallback for packages predating the sale_id column being populated —
      // match against the package's own line item price, not the sale's
      // total (same bundling reason as above).
      const pkgTime = new Date(pkg.created_date).getTime();
      const pkgAmount = Number(pkg.total_amount) || 0;
      const matchedSale = sales.find((sale) => {
        if (usedSaleIds.has(sale.id)) return false;
        const pkgItem = (sale.items ?? []).find((it) => it.name === pkg.package_name && it.item_type === "package");
        if (!pkgItem) return false;
        if (Math.abs((Number(pkgItem.total_price) || 0) - pkgAmount) > 0.5) return false;
        return Math.abs(new Date(sale.created_at).getTime() - pkgTime) < 24 * 60 * 60 * 1000;
      });
      if (matchedSale) {
        usedSaleIds.add(matchedSale.id);
        map.set(pkg.id, matchedSale);
      }
    });
    return map;
  }, [packages, sales]);

  // Resolves each membership purchase's real invoice number for the
  // Memberships tab — same sale_id-first, appointment_id-fallback pattern as
  // packageSaleMatch above, just without that one's dedup/exclusion bookkeeping
  // (there's no separate "memberships from sale line items" view to keep in sync with).
  const membershipSaleMatch = useMemo(() => {
    const map = new Map<string, SaleRecord>();
    const salesById = new Map(sales.map((s) => [s.id, s]));
    realMemberships.forEach((m) => {
      const linkedSale = m.sale_id ? salesById.get(m.sale_id) : undefined;
      if (linkedSale) { map.set(m.id, linkedSale); return; }
      const apptSale = m.appointment_id ? sales.find((s) => s.appointment_id === m.appointment_id) : undefined;
      if (apptSale) map.set(m.id, apptSale);
    });
    return map;
  }, [realMemberships, sales]);

  // Sale ids already accounted for by a real `packages` (client_packages) purchase
  // record — excludes a package purchase's sale-line-item mirror below (Packages
  // tab), AND excludes it from the walk-in visit count further down (SCRUM-1109) —
  // one canonical set, reused by both, instead of two independent computations
  // that could silently drift apart.
  const packageSaleIds = new Set([...packageSaleMatch.values()].map((s) => s.id));

  // Packages from sale line items — excludes any sale already matched to a real
  // client_packages purchase row above (see packageSaleIds), so a package purchase
  // shows up exactly once in this tab, not once per record that happens to exist for it.
  const packagesFromSales = sales
    .filter((s) => !packageSaleIds.has(s.id))
    .flatMap((s) =>
      (s.items ?? []).filter((it) => it.item_type === "package")
        .map((it) => ({ ...it, sale_date: s.created_at, sale_id: s.id, invoice_number: s.invoice_number }))
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
  const apptPackageNames = new Set(packagesFromAppointments.map((p) => p.name));

  // Services from appointments (not captured in sales items; exclude items that are actually packages)
  const saleServiceNames = new Set(servicesFromSales.map((it) => it.name));
  const servicesFromAppointments = appointments.filter(isApptPaid).flatMap((a) =>
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
        // Appointment-derived (not from a `sales` row), so there's no
        // invoice — kept explicit (not omitted) so this matches
        // servicesFromSales's shape and the two can share one array type.
        invoice_number: null as string | null,
        // No sale_items row backs this entry, so no real per-item
        // discount/tax figure exists for it — left undefined (rendered as
        // "–") rather than a misleading 0, same convention as invoice_number.
        discount_amount: undefined as string | undefined,
        tax_amount: undefined as string | undefined,
        // isApptPaid already filtered this appointment to a genuinely paid
        // visit — same "completed" convention as servicesFromSales above.
        status: "completed" as const,
      }))
  );

  const allServices = [...servicesFromSales, ...servicesFromAppointments];
  const productsFromSales = sales.flatMap((s) =>
    (s.items ?? []).filter((it) => it.item_type === "product")
      .map((it) => ({ ...it, sale_date: s.created_at, sale_id: s.id, invoice_number: s.invoice_number }))
  );

  // ── Overview tab's revenue-by-category cards ────────────────────────────
  // Reuses the same already-deduplicated arrays the Services/Products tabs
  // display (allServices, productsFromSales) rather than re-deriving from
  // raw appointments/sales — keeps this screen's category breakdown exactly
  // consistent with what those tabs individually show, including the
  // package/membership de-dup already applied above (packageSaleMatch etc.),
  // so a package sold as a line item never double-counts against a real
  // client_packages row like the SCRUM package-duplicate bug did before.
  const serviceRevenue = allServices.reduce((sum, it) => sum + (Number((it as any).total_price ?? (it as any).price) || 0), 0);
  const productRevenue = productsFromSales.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0);
  // Package/Membership revenue comes from the real client_packages/
  // client_memberships purchase records (`packages`/`realMemberships`) —
  // the canonical source the Packages/Memberships tabs themselves total up,
  // not packagesFromSales/packagesFromAppointments (those exist only to
  // display a package sale that never got matched to a real purchase row,
  // an edge case, not the common one this card is meant to represent).
  const packageRevenueTotal = packages.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
  const membershipRevenueTotal = realMemberships.reduce((sum, m) => sum + (Number(m.price_paid) || 0), 0);

  const displayPkgStatus = (p: { status: string; expiry_date?: string | null }) => {
    const expiryStatus = getPackageExpiryStatus(p.expiry_date);
    return (expiryStatus === "active" ? p.status : expiryStatus) || "";
  };
  const activePackageCount = packages.filter((p) => displayPkgStatus(p).toLowerCase() === "active").length;
  const activeMembership = realMemberships.find(
    (m) => displayPkgStatus({ status: m.status, expiry_date: m.expires_at }).toLowerCase() === "active"
  );

  const isGoldMember = computedLifetimeSpend > 5000;

  const appointmentsById = useMemo(() => new Map(appointments.map((a) => [a.id, a])), [appointments]);

  // Payments tab's real per-invoice status — a sale's own `status` can say
  // "completed" (the invoice is finalized) even while its linked appointment
  // is still genuinely only partially paid (same mismatch fixed for the
  // Visit History Paid/Due badge above — appt.status is the authoritative
  // payment state). Standalone sales with no appointment_id (quick sales,
  // package/membership purchases) have no such split source, so their own
  // sale status is already the ground truth for them.
  const resolveSaleStatus = (s: SaleRecord): string => {
    const linkedAppt = s.appointment_id ? appointmentsById.get(s.appointment_id) : undefined;
    if (!linkedAppt) return s.status;
    if (linkedAppt.status === "paid") return "completed";
    if (linkedAppt.status === "partial") return "partial";
    return linkedAppt.status;
  };

  // Balance still owed on a partial invoice — same due_amount field the
  // appointment's own drawer (ViewBillModal) already shows, 0/undefined for
  // anything not genuinely partial.
  const resolveSaleDue = (s: SaleRecord): number => {
    const linkedAppt = s.appointment_id ? appointmentsById.get(s.appointment_id) : undefined;
    if (!linkedAppt || linkedAppt.status !== "partial") return 0;
    return linkedAppt.due_amount ?? Math.max(0, Number(s.total_amount) - Number(linkedAppt.amount_paid || 0));
  };

  // appointment id → staff id (from the history API response)
  const appointmentStaffMap = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((a) => {
      const sid = a.staff_id ?? a.staff?.id;
      if (sid) map.set(a.id, sid);
    });
    return map;
  }, [appointments]);

  // Resolves a display name for whichever staff handled a row — direct
  // staff_id when the row carries one (sales/client_packages/client_memberships
  // rows), falling back to the parent appointment's staff for appointment-
  // derived rows (sale_id holds the appointment id in that case).
  const resolveStaffName = (row: { staff_id?: string | null; sale_id?: string }) => {
    const sid = row.staff_id ?? (row.sale_id ? appointmentStaffMap.get(row.sale_id) : undefined);
    if (!sid) return "–";
    return staffList.find((st) => st.id === sid)?.full_name || "–";
  };

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
    filteredProductsFromSales, filteredPackages, filteredRealMemberships, filteredSales,
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
      filteredPackages: packages.filter((pkg) => matchDate(pkg.created_date)),
      filteredRealMemberships: realMemberships.filter((m) => matchDate(m.purchased_at)),
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
    appointments, quickSales, allServices, productsFromSales, packages, realMemberships, sales,
    globalCalDay, globalDatePreset, globalServiceFilter, globalStaffFilter,
    appointmentServicesMap, appointmentStaffMap,
  ]);

  // Per-tab search+sort for the tabs that already existed before this
  // redesign — layered on top of the existing global-date/service/staff
  // filter above (matchDate etc.), not replacing it. Kept as a thin
  // additional narrowing so the already-working filter/pagination logic for
  // these tabs stays untouched.
  const servicesSearch = useTableSearchSort<typeof filteredAllServices[number]>({
    rows: filteredAllServices, searchFields: ["name", "invoice_number"], defaultSortKey: "sale_date",
  });
  const productsSearch = useTableSearchSort<typeof filteredProductsFromSales[number]>({
    rows: filteredProductsFromSales, searchFields: ["name", "invoice_number"], defaultSortKey: "sale_date",
  });
  const membershipsSearch = useTableSearchSort<typeof filteredRealMemberships[number]>({
    rows: filteredRealMemberships, searchFields: ["membership_name", "status"], defaultSortKey: "purchased_at",
  });
  const packagesSearch = useTableSearchSort<typeof filteredPackages[number]>({
    rows: filteredPackages, searchFields: ["package_name", "status"], defaultSortKey: "created_date",
  });
  const paymentsSearch = useTableSearchSort<typeof filteredSales[number]>({
    rows: filteredSales, searchFields: ["invoice_number", "payment_method", "status"], defaultSortKey: "created_at",
  });

  // Calendar dot map — always built from full unfiltered data (the calendar IS the filter)
  const calendarDotMap = useMemo(() => {
    const map = new Map<string, "completed" | "booked">();
    const toKey = (d: string) => d.slice(0, 10);
    appointments.forEach((a) => {
      const key = toKey(a.scheduled_at);
      const existing = map.get(key);
      if (a.status === "paid") {
        map.set(key, "completed");
      } else if (["booked", "partial"].includes(a.status) && existing !== "completed") {
        map.set(key, "booked");
      }
    });
    quickSales.forEach((s) => {
      const key = toKey(s.created_at);
      if (!map.has(key)) map.set(key, "completed");
    });
    return map;
  }, [appointments, quickSales]);

  // Unified, date-sorted Visit History feed: appointments + quick sales + package purchases
  type VisitEntry =
    | { kind: "appointment"; date: string; appt: AppointmentRecord }
    | { kind: "quickSale"; date: string; sale: SaleRecord }
    | { kind: "package"; date: string; pkg: PackageRecord; sale?: SaleRecord };

  const visitHistoryEntries: VisitEntry[] = useMemo(() => {
    const packageEntries: VisitEntry[] = filteredPackages
      // Backend returns the raw DB value ("Paid", capital P) — comparing
      // against the lowercase literal always failed, silently dropping every
      // fully-paid package purchase out of Visit History (and the total count
      // it drives), even though the package genuinely was paid in full.
      .filter((pkg) => (pkg.payment_status || "").toLowerCase() === "paid")
      .map((pkg) => ({
        kind: "package" as const,
        date: pkg.created_date,
        pkg,
        sale: packageSaleMatch.get(pkg.id),
      }));
    const usedSaleIds = new Set(
      packageEntries.map((e) => (e.kind === "package" ? e.sale?.id : undefined)).filter(Boolean)
    );

    const entries: VisitEntry[] = [
      ...visibleAppointments
        .filter(isApptPaidOrPartial)
        // Same exclusion as visibleQuickSales below, just reached through the
        // appointment's linked sale instead of the sale's own id directly —
        // a package sold as a line item on an appointment (not a standalone
        // Quick Sale) produces both an appointment record AND a matching
        // client_packages purchase row for the exact same event; without
        // this, packageEntries already shows it once and this appointment
        // showed it again, so a single package purchase appeared twice in
        // Visit History with two different amounts (the package's own price
        // vs the linked sale's full total).
        .filter((appt) => {
          const linkedSale = saleByAppointmentId.get(appt.id);
          return !(linkedSale && usedSaleIds.has(linkedSale.id));
        })
        .map((appt) => ({ kind: "appointment" as const, date: appt.scheduled_at, appt })),
      ...visibleQuickSales
        .filter((sale) => !usedSaleIds.has(sale.id) && sale.status === "completed")
        .map((sale) => ({ kind: "quickSale" as const, date: sale.created_at, sale })),
      ...packageEntries,
    ];
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visibleAppointments, visibleQuickSales, filteredPackages, packageSaleMatch, saleByAppointmentId]);

  // Flattened, searchable/exportable view of visitHistoryEntries — one row
  // shape across all 3 entry kinds (appointment/quickSale/package), so the
  // shared search+export toolbar can work generically. The rich per-kind
  // JSX below still renders from `entry` (kept on each row) — this is only
  // for filtering/sorting/export, not a replacement for that render logic.
  const historyRows = useMemo(() => visitHistoryEntries.map((entry) => {
    if (entry.kind === "package") {
      const pkg = entry.pkg;
      return {
        id: `pkg-${pkg.id}`, entry,
        name: pkg.package_name, date: pkg.created_date,
        staff: "Package Sold",
        status: (pkg.payment_status || "").toLowerCase() === "paid" ? "Paid" : (pkg.payment_status || "Unpaid"),
        amount: Number(pkg.total_amount) || 0,
        invoice: entry.sale?.invoice_number ?? "–",
      };
    }
    if (entry.kind === "quickSale") {
      const s = entry.sale;
      const firstName = (s.items ?? []).find((it) => it.item_type === "service")?.name || (s.items ?? [])[0]?.name || "Quick Sale";
      return {
        id: s.id, entry,
        name: firstName, date: s.created_at,
        staff: "Quick Sale",
        status: s.status === "completed" ? "Paid" : s.status,
        amount: Number(s.total_amount) || 0,
        invoice: s.invoice_number ?? "–",
      };
    }
    const appt = entry.appt;
    const linkedSale = saleByAppointmentId.get(appt.id);
    // Same fix as the card render below: appt.status is authoritative, a
    // linked sale's own "completed" status doesn't mean the appointment
    // itself is fully paid (see the isPaid comment further down this file).
    const isPaid = appt.status === "paid";
    const isPartial = appt.status === "partial";
    const svcName =
      appt.services?.[0]?.name || appt.services?.[0]?.service_name ||
      appt.product_items?.[0]?.name || appt.package_items?.[0]?.name || appt.package_items?.[0]?.package_name ||
      appt.membership_items?.[0]?.name || appt.linked_package_name || appt.linked_membership_name || "Appointment";
    const staffMember = staffList.find((st) => st.id === (appt.staff_id ?? appt.staff?.id));
    return {
      id: appt.id, entry,
      name: svcName, date: appt.scheduled_at,
      staff: staffMember?.full_name || appt.staff?.full_name || "–",
      status: isPaid ? "Paid" : isPartial ? "Partial" : (appt.payment_status || "Unpaid"),
      amount: linkedSale ? Number(linkedSale.total_amount) : Number(appt.amount_paid) || 0,
      invoice: linkedSale?.invoice_number ?? "–",
    };
  }), [visitHistoryEntries, saleByAppointmentId, staffList]);

  const historySearch = useTableSearchSort<typeof historyRows[number]>({
    rows: historyRows, searchFields: ["name", "staff", "status", "invoice"], defaultSortKey: "date",
  });

  // Total Visits = paid/partial appointments (from the backend stat) + genuine
  // walk-in quick sales. The old count used quickSales.length, which counted
  // EVERY sale with no appointment — including the sale rows that back a
  // package/membership purchase and any non-completed sale — inflating the
  // number (SCRUM-1109). Exclude package-purchase sale rows (they already show
  // as a package) and keep only completed walk-ins. packageSaleIds is declared
  // earlier (shared with the Packages tab's own dedup — see its comment there).
  const walkInVisitCount = quickSales.filter(
    (s) => s.status === "completed" && !packageSaleIds.has(s.id),
  ).length;

  // Same "Total Visits" figure shown in the stat bar below — keeps Avg
  // Ticket = Total Spend / Total Visits internally consistent instead of
  // dividing by a completed-sales count that no longer matches what's in
  // the numerator (computedLifetimeSpend now includes partial appointments
  // and standalone package/membership purchases too, not just sales rows).
  const totalVisitsCount = (stats?.completed_appointments ?? 0) + walkInVisitCount;
  const avgTicket = totalVisitsCount > 0 ? Math.round(computedLifetimeSpend / totalVisitsCount) : 0;

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
      durationMinutes: appt.duration_minutes,
      items: linkedSale?.items ?? [],
      extraServices: (appt.services ?? []).map((s) => ({ name: s.name || s.service_name || "", price: s.price ?? 0 })),
      status: appt.status,
      rawPaymentStatus: linkedSale?.status ?? appt.payment_status,
      paymentMethod: linkedSale
        ? formatPaymentMode(linkedSale.payment_method, linkedSale.payment_reference)
        : (appt as any).payment_method,
      invoiceNumber: linkedSale?.invoice_number,
      // No linked sale yet means this appointment isn't fully settled (a sale
      // row is only auto-created once a payment completes it) — that's
      // exactly the partial-payment case, so the real bill total is what's
      // been paid PLUS what's still due, not amount_paid alone (which used
      // to get passed off as the entire grand total, making a partially
      // paid ₹1050 bill print as a fully-settled ₹300 one).
      grandTotalOverride: linkedSale
        ? Number(linkedSale.total_amount)
        : Number(appt.amount_paid || 0) + Number(appt.due_amount || 0),
      // Lets buildPrintableBooking print the real Paid/Due split for a
      // partial appointment instead of assuming binary paid-or-not.
      amountPaidOverride: linkedSale ? undefined : Number(appt.amount_paid || 0),
      notes: appt.notes,
      ewalletUsed: appt.ewallet_used,
      membershipWalletUsed: appt.membership_wallet_used,
      rewardPointsValue: (appt as any).reward_points_value,
      referralCreditUsed: (appt as any).referral_credit_used,
      // Sourced from the linked sale's own saved record (never live checkout
      // state) — so reprinting from Client History shows the same coupon/
      // referral figures the client actually saw, instead of them
      // disappearing after the original checkout session ended.
      manualDiscount: Number(linkedSale?.manual_discount_amount) || 0,
      couponDiscount: Number(linkedSale?.coupon_discount_amount) || 0,
      couponCode: linkedSale?.coupon_code,
      referralDiscount: Number(linkedSale?.referral_discount_amount) || 0,
    });
    printReceipt(booking, printStaffList, currentSalon, { phone: clientPhoneForPrint, email: client?.email, referralCode: (client as any)?.referral_code ?? null }, { showTaxBreakup: showTaxBreakupOnInvoice, formatAmount });
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
      paymentMethod: formatPaymentMode(s.payment_method, s.payment_reference),
      invoiceNumber: s.invoice_number,
      grandTotalOverride: Number(s.total_amount) || 0,
      manualDiscount: Number(s.manual_discount_amount) || 0,
      couponDiscount: Number(s.coupon_discount_amount) || 0,
      couponCode: s.coupon_code,
      referralDiscount: Number(s.referral_discount_amount) || 0,
    });
    printReceipt(booking, printStaffList, currentSalon, { phone: clientPhoneForPrint, email: client?.email, referralCode: (client as any)?.referral_code ?? null }, { showTaxBreakup: showTaxBreakupOnInvoice, formatAmount });
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
      staffId: pkg.staff_id,
      dateIso: matchedSale?.created_at ?? pkg.created_date,
      items,
      status: matchedSale?.status ?? pkg.status,
      rawPaymentStatus: matchedSale?.status ?? pkg.payment_status,
      paymentMethod: matchedSale ? formatPaymentMode(matchedSale.payment_method, matchedSale.payment_reference) : null,
      invoiceNumber: matchedSale?.invoice_number,
      grandTotalOverride: matchedSale ? Number(matchedSale.total_amount) : (Number(pkg.total_amount) || 0),
      manualDiscount: Number(matchedSale?.manual_discount_amount) || 0,
      couponDiscount: Number(matchedSale?.coupon_discount_amount) || 0,
      couponCode: matchedSale?.coupon_code,
      referralDiscount: Number(matchedSale?.referral_discount_amount) || 0,
    });
    printReceipt(booking, printStaffList, currentSalon, { phone: clientPhoneForPrint, email: client?.email }, { showTaxBreakup: showTaxBreakupOnInvoice, formatAmount });
  };

  if (historyLoading) {
    return (
      <div className="chp-content-wrap">
        <div className="chp-profile-header">
          <div className="chp-profile-left">
            <Skeleton width={56} height={56} borderRadius="50%" />
            <div className="chp-profile-info" style={{ flex: 1 }}>
              <Skeleton width="35%" height={18} style={{ marginBottom: 8 }} />
              <Skeleton width="45%" height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="30%" height={11} />
            </div>
          </div>
          <div className="chp-profile-right">
            <div className="chp-actions">
              <Skeleton width={130} height={32} borderRadius={8} />
              <Skeleton width={130} height={32} borderRadius={8} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ flex: 1 }}>
              <Skeleton width="60%" height={10} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={16} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, padding: "12px 24px", borderBottom: "1px solid #f1f5f9" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width={70} height={14} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 24px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Skeleton width={40} height={40} borderRadius={8} />
              <div style={{ flex: 1 }}>
                <Skeleton width="40%" height={13} style={{ marginBottom: 6 }} />
                <Skeleton width="25%" height={11} />
              </div>
              <Skeleton width={70} height={13} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!client || !stats) {
    return (
      <div className="chp-idle">
        <p>Couldn't load this client's history.</p>
      </div>
    );
  }

  return (
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
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>

          <div className="chp-stat-bar">
            <div className="chp-stat-item">
              <div className="chp-stat-val">{stats.completed_appointments + walkInVisitCount}</div>
              <div className="chp-stat-lbl">Total Visits</div>
            </div>
            <div className="chp-stat-item">
              <div className="chp-stat-val">{fmtRupees(computedLifetimeSpend)}</div>
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

        {/* OVERVIEW tab (default) */}
        {activeTab === "overview" && client && (
          <div className="chp-overview">
            <div className="chp-overview__stats">
              <PlainStatCard label="Total Visits" value={totalVisitsCount} />
              <PlainStatCard label="Total Revenue" value={fmtRupees(computedLifetimeSpend)} />
              <PlainStatCard label="Avg. Ticket Size" value={fmtRupees(avgTicket)} />
              <PlainStatCard label="E-Wallet Balance" value={fmtRupees(client.wallet_balance)} />
              <PlainStatCard label="Reward Points Balance" value={client.reward_points_balance} />
              {client.referral_code && (
                <PlainStatCard label="Referral Balance" value={fmtRupees(client.referral_balance)} />
              )}
            </div>

            {/* Revenue-by-category breakdown — reuses the same de-duplicated
                arrays the Services/Products/Packages/Memberships tabs each
                display, so this never drifts from what those tabs show. */}
            <div className="chp-overview__stats">
              <PlainStatCard
                label="Service Revenue"
                value={fmtRupees(serviceRevenue)}
                sub={`${allServices.length} service${allServices.length !== 1 ? "s" : ""}`}
              />
              <PlainStatCard
                label="Product Revenue"
                value={fmtRupees(productRevenue)}
                sub={`${productsFromSales.length} product${productsFromSales.length !== 1 ? "s" : ""}`}
              />
              <PlainStatCard
                label="Package Revenue"
                value={fmtRupees(packageRevenueTotal)}
                sub={`${activePackageCount} active of ${packages.length}`}
              />
              <PlainStatCard
                label="Membership Revenue"
                value={fmtRupees(membershipRevenueTotal)}
                sub={activeMembership
                  ? `Active · ${activeMembership.membership_name}${activeMembership.expires_at ? ` · expires ${fmtDMY(activeMembership.expires_at)}` : ""}`
                  : "No active membership"}
              />
            </div>

            <div className="chp-overview__info">
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Client Name</span>
                <span className="chp-overview-row__value">{client.full_name}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Mobile Number</span>
                <span className="chp-overview-row__value">
                  {client.phone_number ? `${client.phone_country_code ?? ""} ${client.phone_number}` : "–"}
                </span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Email</span>
                <span className="chp-overview-row__value">{client.email || "–"}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Gender</span>
                <span className="chp-overview-row__value">{client.gender || "–"}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Birth Date</span>
                <span className="chp-overview-row__value">{fmtBirthday(client.birthday_day_month, client.birthday_year)}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Member Since</span>
                <span className="chp-overview-row__value">{fmtDMY(client.created_at)}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Last Visit</span>
                <span className="chp-overview-row__value">{lastVisit ? fmtDMY(lastVisit) : "–"}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Next Appointment</span>
                <span className="chp-overview-row__value">{nextAppt ? fmtDMY(nextAppt) : "–"}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Active Memberships</span>
                <span className="chp-overview-row__value">{stats?.active_memberships ?? 0}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Active Packages</span>
                <span className="chp-overview-row__value">{stats?.active_packages ?? 0}</span>
              </div>
              <div className="chp-overview-row">
                <span className="chp-overview-row__label">Source</span>
                <span className="chp-overview-row__value">{client.client_source || "–"}</span>
              </div>
              {client.referred_by && (
                <div className="chp-overview-row">
                  <span className="chp-overview-row__label">Referred By</span>
                  <span className="chp-overview-row__value">{client.referred_by.full_name}</span>
                </div>
              )}
              {client.referral_code && (
                <div className="chp-overview-row">
                  <span className="chp-overview-row__label">Referral Code</span>
                  <span className="chp-overview-row__value">{client.referral_code}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY tab */}
        {activeTab === "history" && (
          <div className="chp-card">
            <div className="chp-card-header">
              <span className="chp-card-title">
                Visit History{hasGlobalFilter ? ` (${historySearch.filteredSortedRows.length} filtered)` : ""}
              </span>
            </div>
            <TabToolbar
              searchValue={historySearch.search}
              onSearchChange={historySearch.setSearch}
              searchPlaceholder="Search visit history..."
              exportConfig={{
                title: "Visit History",
                headers: ["Invoice Number", "Visit Date", "Staff", "Status", "Bill Amount"],
                rows: () => historySearch.filteredSortedRows.map((r) => [r.invoice, fmtDMY(r.date), r.staff, r.status, fmtRupees(r.amount)]),
                filename: "visit-history",
              }}
            />

              {appointments.length === 0 && quickSales.length === 0 && packages.length === 0 ? (
                <div className="chp-no-data">No visits found</div>
              ) : historySearch.filteredSortedRows.length === 0 ? (
                <div className="chp-no-data">No visits match the current filter</div>
              ) : (
                <div className="chp-visit-list">
                  {historySearch.filteredSortedRows
                    .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                    .map((row) => {
                    const entry = row.entry;
                    if (entry.kind === "package") {
                      const pkg = entry.pkg;
                      const isPkgPaid = (pkg.payment_status || "").toLowerCase() === "paid";
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
                      const isSalePackagePaid = isPackageCoveredSale(s.payment_method, s.payment_reference);
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
                    const d = fmtDate(appt.scheduled_at, appt.duration_minutes);
                    const linkedSale = saleByAppointmentId.get(appt.id);
                    const displayAmount = linkedSale
                      ? Number(linkedSale.total_amount)
                      : appt.amount_paid;
                    const svcName =
                      appt.services?.[0]?.name ||
                      appt.services?.[0]?.service_name ||
                      appt.product_items?.[0]?.name ||
                      appt.package_items?.[0]?.name ||
                      appt.package_items?.[0]?.package_name ||
                      appt.membership_items?.[0]?.name ||
                      // Falls back to the linked client_packages/client_memberships
                      // record's own name when this appointment's own item entry
                      // came through with no name (see linked_package_name/
                      // linked_membership_name on the /history response).
                      appt.linked_package_name ||
                      appt.linked_membership_name ||
                      "Appointment";
                    // Was services.length - 1 — a bill can bundle a service
                    // AND a package AND a product AND a membership in one
                    // appointment, but only the "extra" count within the
                    // service list got tallied. A row showing 4 different item
                    // types billed together displayed as if it were a single
                    // plain service, with no "+N more" hint that anything else
                    // was on that same sale. Now counts everything on the bill.
                    const totalItemCount =
                      (appt.services?.length ?? 0) +
                      (appt.package_items?.length ?? 0) +
                      (appt.product_items?.length ?? 0) +
                      (appt.membership_items?.length ?? 0);
                    const extraSvcs = Math.max(0, totalItemCount - 1);
                    // appt.status is the authoritative payment state (backend comment on
                    // the /history query: "a.status IS the payment state now"). A sale's
                    // own status can say "completed" (the invoice is finalized) even while
                    // its appointment is still genuinely partial — deferring to linkedSale
                    // here previously showed a ₹631-of-₹1631-paid visit as fully "Paid".
                    const isPaid = appt.status === "paid";
                    const isPartial = appt.status === "partial";
                    const isPackagePaid = linkedSale
                      ? isPackageCoveredSale(linkedSale.payment_method, linkedSale.payment_reference)
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
                            <Clock size={10} /> {d.time}{d.endTime ? ` – ${d.endTime}` : ""}
                          </div>
                        </div>
                        <div className="chp-visit-right">
                          <div className="chp-visit-amount">{fmtRupees(displayAmount)}</div>
                          <div className={`chp-visit-badge ${isPaid ? "paid" : isPartial ? "partial" : "unpaid"}`}>
                            {isPaid ? "Paid" : isPartial ? "Partial" : appt.payment_status || "Unpaid"}
                          </div>
                          {isPartial && (
                            <div className="chp-visit-package-tag chp-visit-package-tag--due">
                              Due {fmtRupees(appt.due_amount ?? Math.max(0, Number(displayAmount) - Number(appt.amount_paid || 0)))}
                            </div>
                          )}
                          {isPaid && isPackagePaid && (
                            <div className="chp-visit-package-tag">via Package</div>
                          )}
                          {isPaid && isMembershipPaid && (
                            <div className="chp-visit-package-tag chp-visit-package-tag--membership">via Membership</div>
                          )}
                        </div>
                        <button
                          className="chp-print-btn"
                          title="View bill"
                          onClick={(e) => { e.stopPropagation(); setViewBillApptId(appt.id); }}
                        >
                          <Receipt size={13} />
                        </button>
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
              {historySearch.filteredSortedRows.length > 0 && (
                <Pagination
                  currentPage={historyPage}
                  pageSize={historyPageSize}
                  totalItems={historySearch.filteredSortedRows.length}
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
                Services availed ({servicesSearch.filteredSortedRows.length}{hasGlobalFilter && filteredAllServices.length !== allServices.length ? ` of ${allServices.length}` : ""})
              </span>
            </div>
            <TabToolbar
              searchValue={servicesSearch.search}
              onSearchChange={servicesSearch.setSearch}
              searchPlaceholder="Search services..."
              exportConfig={{
                title: "Services Availed",
                headers: ["Invoice", "Date", "Service", "Staff", "Status"],
                rows: () => servicesSearch.filteredSortedRows.map((it) => [
                  it.invoice_number || "–", fmtDMY(it.sale_date), it.name, resolveStaffName(it), "Completed",
                ]),
                filename: "services-availed",
              }}
            />
            {servicesSearch.filteredSortedRows.length === 0 ? (
              <div className="chp-no-data">{allServices.length === 0 ? "No services availed yet" : "No services match the current filter"}</div>
            ) : (
              <table className="chp-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th onClick={() => servicesSearch.toggleSort("sale_date")} style={{ cursor: "pointer" }}>Date</th>
                    <th onClick={() => servicesSearch.toggleSort("name")} style={{ cursor: "pointer" }}>Service</th>
                    <th>Staff</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {servicesSearch.filteredSortedRows
                    .slice((servicesPage - 1) * servicesPageSize, servicesPage * servicesPageSize)
                    .map((it, i) => (
                    <tr key={i}>
                      <td className="chp-inv">{it.invoice_number || "–"}</td>
                      <td>{fmtDateShort(it.sale_date)}</td>
                      <td>{it.name}</td>
                      <td>{resolveStaffName(it)}</td>
                      <td>
                        <span className="chp-status-badge chp-status-badge--completed">Completed</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {servicesSearch.filteredSortedRows.length > 0 && (
              <Pagination
                currentPage={servicesPage}
                pageSize={servicesPageSize}
                totalItems={servicesSearch.filteredSortedRows.length}
                onPageChange={setServicesPage}
                onPageSizeChange={(sz) => { setServicesPageSize(sz); setServicesPage(1); }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
        )}

        {/* MEMBERSHIPS tab */}
        {activeTab === "memberships" && (
          <div className="chp-card">
            <div className="chp-card-header">
              <span className="chp-card-title">Memberships purchased ({membershipsSearch.filteredSortedRows.length})</span>
            </div>
            <TabToolbar
              searchValue={membershipsSearch.search}
              onSearchChange={membershipsSearch.setSearch}
              searchPlaceholder="Search memberships..."
              exportConfig={{
                title: "Memberships",
                headers: ["Membership", "Purchased On", "Valid Until", "Balance", "Status", "Invoice"],
                rows: () => membershipsSearch.filteredSortedRows.map((m) => {
                  const expiryStatus = getPackageExpiryStatus(m.expires_at);
                  const displayStatus = expiryStatus === "active" ? m.status : expiryStatus;
                  return [
                    m.membership_name, fmtDMY(m.purchased_at), m.expires_at ? fmtDMY(m.expires_at) : "–",
                    formatAmount(Number(m.membership_wallet_balance)),
                    displayStatus === "expiring-soon" ? "Expiring Soon" : displayStatus,
                    membershipSaleMatch.get(m.id)?.invoice_number || "–",
                  ];
                }),
                filename: "memberships",
              }}
            />
            {membershipsSearch.filteredSortedRows.length === 0 ? (
              <div className="chp-no-data">No memberships purchased yet</div>
            ) : (
              <table className="chp-table">
                <thead>
                  <tr>
                    <th onClick={() => membershipsSearch.toggleSort("membership_name")} style={{ cursor: "pointer" }}>Membership</th>
                    <th onClick={() => membershipsSearch.toggleSort("purchased_at")} style={{ cursor: "pointer" }}>Purchased On</th>
                    <th>Valid Until</th>
                    <th style={{ textAlign: "right" }}>Balance</th>
                    <th>Status</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {membershipsSearch.filteredSortedRows
                    .slice((membershipsPage - 1) * membershipsPageSize, membershipsPage * membershipsPageSize)
                    .map((m) => {
                      const expiryStatus = getPackageExpiryStatus(m.expires_at);
                      const displayStatus = expiryStatus === "active" ? m.status : expiryStatus;
                      return (
                        <tr key={m.id}>
                          <td className="chp-inv">{m.membership_name}</td>
                          <td>{fmtDateShort(m.purchased_at)}</td>
                          <td>{m.expires_at ? fmtDateShort(m.expires_at) : "No expiry"}</td>
                          <td style={{ textAlign: "right" }}>{formatAmount(Number(m.membership_wallet_balance))}</td>
                          <td>
                            <span className={`chp-status-badge chp-status-badge--${displayStatus}`}>
                              {displayStatus === "expiring-soon" ? "Expiring Soon" : displayStatus}
                            </span>
                          </td>
                          <td>{membershipSaleMatch.get(m.id)?.invoice_number || "–"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
            {membershipsSearch.filteredSortedRows.length > 0 && (
              <Pagination
                currentPage={membershipsPage}
                pageSize={membershipsPageSize}
                totalItems={membershipsSearch.filteredSortedRows.length}
                onPageChange={setMembershipsPage}
                onPageSizeChange={(sz) => { setMembershipsPageSize(sz); setMembershipsPage(1); }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
        )}

        {/* PACKAGES tab */}
        {activeTab === "packages" && (
          <div className="chp-card">
            <div className="chp-card-header">
              <span className="chp-card-title">Packages purchased ({packagesSearch.filteredSortedRows.length})</span>
            </div>
            <TabToolbar
              searchValue={packagesSearch.search}
              onSearchChange={packagesSearch.setSearch}
              searchPlaceholder="Search packages..."
              exportConfig={{
                title: "Packages Purchased",
                headers: ["Package", "Purchased On", "Valid Until", "Sessions Left", "Status", "Invoice"],
                rows: () => packagesSearch.filteredSortedRows.map((pkg) => {
                  const totalSessions = (pkg.services ?? []).reduce((s, sv) => s + sv.total_sessions, 0);
                  const usedSessions = (pkg.services ?? []).reduce((s, sv) => s + sv.completed_sessions, 0);
                  const expiryStatus = getPackageExpiryStatus(pkg.expiry_date);
                  const displayStatus = expiryStatus === "active" ? pkg.status : expiryStatus;
                  return [
                    pkg.package_name, fmtDMY(pkg.created_date), fmtDMY(pkg.expiry_date),
                    `${totalSessions - usedSessions} / ${totalSessions}`,
                    displayStatus === "expiring-soon" ? "Expiring Soon" : displayStatus,
                    packageSaleMatch.get(pkg.id)?.invoice_number || "–",
                  ];
                }),
                filename: "packages-purchased",
              }}
            />
            {packagesSearch.filteredSortedRows.length === 0 ? (
              <div className="chp-no-data">No packages purchased yet</div>
            ) : (
              <table className="chp-table">
                <thead>
                  <tr>
                    <th onClick={() => packagesSearch.toggleSort("package_name")} style={{ cursor: "pointer" }}>Package</th>
                    <th onClick={() => packagesSearch.toggleSort("created_date")} style={{ cursor: "pointer" }}>Purchased On</th>
                    <th>Valid Until</th>
                    <th>Sessions Left</th>
                    <th>Status</th>
                    <th>Invoice</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {packagesSearch.filteredSortedRows
                    .slice((packagesPage - 1) * packagesPageSize, packagesPage * packagesPageSize)
                    .map((pkg) => {
                      const expiryStatus = getPackageExpiryStatus(pkg.expiry_date);
                      const displayStatus = expiryStatus === "active" ? pkg.status : expiryStatus;
                      const totalSessions = (pkg.services ?? []).reduce((s, sv) => s + sv.total_sessions, 0);
                      const usedSessions = (pkg.services ?? []).reduce((s, sv) => s + sv.completed_sessions, 0);
                      return (
                        <tr key={pkg.id}>
                          <td className="chp-inv">{pkg.package_name}</td>
                          <td>{fmtDateShort(pkg.created_date)}</td>
                          <td>{fmtDateShort(pkg.expiry_date)}</td>
                          <td>{totalSessions - usedSessions} / {totalSessions}</td>
                          <td>
                            <span className={`chp-status-badge chp-status-badge--${displayStatus}`}>
                              {displayStatus === "expiring-soon" ? "Expiring Soon" : displayStatus}
                            </span>
                          </td>
                          <td>{packageSaleMatch.get(pkg.id)?.invoice_number || "–"}</td>
                          <td>
                            <button
                              className="chp-print-btn"
                              title="Print bill"
                              onClick={(e) => { e.stopPropagation(); printPackageBill(pkg, packageSaleMatch.get(pkg.id)); }}
                            >
                              <Printer size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
            {packagesSearch.filteredSortedRows.length > 0 && (
              <Pagination
                currentPage={packagesPage}
                pageSize={packagesPageSize}
                totalItems={packagesSearch.filteredSortedRows.length}
                onPageChange={setPackagesPage}
                onPageSizeChange={(sz) => { setPackagesPageSize(sz); setPackagesPage(1); }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
        )}

        {/* PRODUCTS tab */}
        {activeTab === "products" && (
          <div className="chp-card">
            <div className="chp-card-header">
              <span className="chp-card-title">
                Products purchased ({productsSearch.filteredSortedRows.length}{hasGlobalFilter && filteredProductsFromSales.length !== productsFromSales.length ? ` of ${productsFromSales.length}` : ""})
              </span>
            </div>
            <TabToolbar
              searchValue={productsSearch.search}
              onSearchChange={productsSearch.setSearch}
              searchPlaceholder="Search products..."
              exportConfig={{
                title: "Products Purchased",
                headers: ["Invoice", "Date", "Product", "Staff", "Qty"],
                rows: () => productsSearch.filteredSortedRows.map((it) => [
                  it.invoice_number || "–", fmtDMY(it.sale_date), it.name, resolveStaffName(it), it.quantity,
                ]),
                filename: "products-purchased",
              }}
            />
            {productsSearch.filteredSortedRows.length === 0 ? (
              <div className="chp-no-data">{productsFromSales.length === 0 ? "No products purchased yet" : "No products match the current filter"}</div>
            ) : (
              <table className="chp-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th onClick={() => productsSearch.toggleSort("sale_date")} style={{ cursor: "pointer" }}>Date</th>
                    <th onClick={() => productsSearch.toggleSort("name")} style={{ cursor: "pointer" }}>Product</th>
                    <th>Staff</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {productsSearch.filteredSortedRows
                    .slice((productsPage - 1) * productsPageSize, productsPage * productsPageSize)
                    .map((it, i) => (
                    <tr key={i}>
                      <td className="chp-inv">{it.invoice_number || "–"}</td>
                      <td>{fmtDateShort(it.sale_date)}</td>
                      <td>{it.name}</td>
                      <td>{resolveStaffName(it)}</td>
                      <td style={{ textAlign: "center" }}>{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {productsSearch.filteredSortedRows.length > 0 && (
              <Pagination
                currentPage={productsPage}
                pageSize={productsPageSize}
                totalItems={productsSearch.filteredSortedRows.length}
                onPageChange={setProductsPage}
                onPageSizeChange={(sz) => { setProductsPageSize(sz); setProductsPage(1); }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
        )}

        {/* PAYMENTS tab */}
        {activeTab === "payments" && (
          <div className="chp-card">
            <div className="chp-card-header">
              <span className="chp-card-title">
                Payment history ({paymentsSearch.filteredSortedRows.length}{filteredSales.length !== sales.length ? ` of ${sales.length}` : ""})
              </span>
            </div>
            <TabToolbar
              searchValue={paymentsSearch.search}
              onSearchChange={paymentsSearch.setSearch}
              searchPlaceholder="Search payments..."
              exportConfig={{
                title: "Payment History",
                headers: ["Invoice", "Date", "Items", "Method", "Coupon Code", "Coupon Discount", "Referral Discount", "Status", "Amount", "Due"],
                rows: () => paymentsSearch.filteredSortedRows.map((s) => [
                  s.invoice_number ?? `#${s.id.slice(-6).toUpperCase()}`,
                  fmtDMY(s.created_at),
                  (s.items ?? []).map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}`).join(", "),
                  formatPaymentMode(s.payment_method, s.payment_reference),
                  s.coupon_code ?? "",
                  Number(s.coupon_discount_amount) > 0 ? formatAmount(Number(s.coupon_discount_amount)) : "",
                  Number(s.referral_discount_amount) > 0 ? formatAmount(Number(s.referral_discount_amount)) : "",
                  resolveSaleStatus(s),
                  formatAmount(Number(s.total_amount)),
                  resolveSaleDue(s) > 0 ? formatAmount(resolveSaleDue(s)) : "",
                ]),
                filename: "payment-history",
              }}
            />
            {paymentsSearch.filteredSortedRows.length === 0 ? (
              <div className="chp-no-data">
                {sales.length === 0 ? "No payments found" : "No payments match these filters"}
              </div>
            ) : (
              <table className="chp-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th onClick={() => paymentsSearch.toggleSort("created_at")} style={{ cursor: "pointer" }}>Date</th>
                    <th>Items</th>
                    <th>Method</th>
                    <th>Discount</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsSearch.filteredSortedRows
                    .slice((paymentsPage - 1) * paymentsPageSize, paymentsPage * paymentsPageSize)
                    .map((s) => (
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
                      <td>{formatPaymentMode(s.payment_method, s.payment_reference)}</td>
                      <td>
                        {/* Coupon Code / Coupon Discount / Referral Discount —
                            all sourced from the saved sale record. */}
                        {(Number(s.coupon_discount_amount) > 0 || Number(s.referral_discount_amount) > 0) ? (
                          <div className="chp-chips">
                            {Number(s.coupon_discount_amount) > 0 && (
                              <span className="chp-chip" title={s.coupon_code ? `Coupon ${s.coupon_code}` : "Coupon"}>
                                {s.coupon_code ? `${s.coupon_code} ` : "Coupon "}-{formatAmount(Number(s.coupon_discount_amount))}
                              </span>
                            )}
                            {Number(s.referral_discount_amount) > 0 && (
                              <span className="chp-chip">Referral -{formatAmount(Number(s.referral_discount_amount))}</span>
                            )}
                          </div>
                        ) : "—"}
                      </td>
                      <td>
                        {(() => {
                          const displayStatus = resolveSaleStatus(s);
                          return (
                            <span className={`chp-status-badge chp-status-badge--${displayStatus}`}>
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>{formatAmount(Number(s.total_amount))}</div>
                        {resolveSaleDue(s) > 0 && (
                          <div className="chp-visit-package-tag chp-visit-package-tag--due" style={{ marginTop: 4, display: "inline-block" }}>
                            Due {formatAmount(resolveSaleDue(s))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {paymentsSearch.filteredSortedRows.length > 0 && (
              <Pagination
                currentPage={paymentsPage}
                pageSize={paymentsPageSize}
                totalItems={paymentsSearch.filteredSortedRows.length}
                onPageChange={setPaymentsPage}
                onPageSizeChange={(sz) => { setPaymentsPageSize(sz); setPaymentsPage(1); }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
        )}

        {/* NOTES tab */}
        {activeTab === "notes" && (
          <div className="chp-card chp-notes">
            <div className="chp-card-header">
              <span className="chp-card-title">Notes ({combinedNotes.length})</span>
            </div>
            <div className="chp-notes__form">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about this client..."
              />
              <div className="chp-notes__form-actions">
                <button
                  className="chp-btn chp-btn--purple"
                  disabled={!noteText.trim() || savingNote}
                  onClick={handleAddNote}
                >
                  {savingNote ? "Saving…" : "Add Note"}
                </button>
              </div>
            </div>
            <TabToolbar
              searchValue={notesSearch.search}
              onSearchChange={notesSearch.setSearch}
              searchPlaceholder="Search notes..."
              exportConfig={{
                title: "Client Notes",
                headers: ["Date", "Staff", "Source", "Note"],
                rows: () => notesSearch.filteredSortedRows.map((n) => [
                  fmtDMYTime(n.date), n.staffName || "Staff",
                  n.source === "manual" ? "Manual" : n.source === "staffAlert" ? "Staff Alert" : "Booking Note",
                  n.text,
                ]),
                filename: "client-notes",
              }}
            />
            {notesSearch.filteredSortedRows.length === 0 ? (
              <div className="chp-no-data">No notes yet</div>
            ) : (
              notesSearch.filteredSortedRows
                .slice((notesPage - 1) * notesPageSize, notesPage * notesPageSize)
                .map((n) => (
                  <div key={n.id} className="chp-notes__item">
                    <div className="chp-notes__item-head">
                      <span className="chp-notes__item-staff">
                        {n.staffName || "Staff"}
                        {n.source !== "manual" && (
                          <span className={`chp-notes__item-source-tag${n.source === "staffAlert" ? " chp-notes__item-source-tag--alert" : ""}`}>
                            {n.source === "staffAlert" ? "Staff Alert" : "Booking Note"}
                          </span>
                        )}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span>{fmtDMYTime(n.date)}</span>
                        {n.source === "manual" && (
                          editingNoteId === n.id ? (
                            <div className="chp-notes__item-actions">
                              <button onClick={() => handleSaveEditNote(n.id)} title="Save"><Check2 size={14} /></button>
                              <button onClick={() => setEditingNoteId(null)} title="Cancel"><XLg size={12} /></button>
                            </div>
                          ) : (
                            <div className="chp-notes__item-actions">
                              <button
                                onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.text); }}
                                title="Edit"
                              >
                                <PencilSquare size={13} />
                              </button>
                              <button className="danger" onClick={() => handleDeleteNote(n.id)} title="Delete">
                                <Trash size={13} />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    {n.source === "manual" && editingNoteId === n.id ? (
                      <textarea
                        className="chp-notes__form textarea"
                        style={{ width: "100%" }}
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                      />
                    ) : (
                      <div className="chp-notes__item-body">{n.text}</div>
                    )}
                  </div>
                ))
            )}
            {notesSearch.filteredSortedRows.length > 0 && (
              <Pagination
                currentPage={notesPage}
                pageSize={notesPageSize}
                totalItems={notesSearch.filteredSortedRows.length}
                onPageChange={setNotesPage}
                onPageSizeChange={(sz) => { setNotesPageSize(sz); setNotesPage(1); }}
              />
            )}
          </div>
        )}

        {/* E-WALLET tab */}
        {activeTab === "ewallet" && client && (
          <EwalletTab
            balance={client.wallet_balance}
            ledger={ewalletLedger}
            formatAmount={formatAmount}
            page={ewalletPage} pageSize={ewalletPageSize}
            onPageChange={setEwalletPage}
            onPageSizeChange={(sz) => { setEwalletPageSize(sz); setEwalletPage(1); }}
          />
        )}

        {/* REFERRALS & REWARDS tab */}
        {activeTab === "referrals" && client && (
          <ReferralsRewardsTab
            client={client}
            rewardLedger={rewardLedger}
            referralLedger={referralLedger}
            formatAmount={formatAmount}
            rewardsPage={rewardsPage} rewardsPageSize={rewardsPageSize}
            onRewardsPageChange={setRewardsPage}
            onRewardsPageSizeChange={(sz) => { setRewardsPageSize(sz); setRewardsPage(1); }}
            referralPage={referralLedgerPage} referralPageSize={referralLedgerPageSize}
            onReferralPageChange={setReferralLedgerPage}
            onReferralPageSizeChange={(sz) => { setReferralLedgerPageSize(sz); setReferralLedgerPage(1); }}
          />
        )}

        {/* COMMUNICATION tab */}
        {activeTab === "communication" && (
          <CommunicationTab
            entries={communications}
            page={commPage} pageSize={commPageSize}
            onPageChange={setCommPage}
            onPageSizeChange={(sz) => { setCommPageSize(sz); setCommPage(1); }}
          />
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
              <Dropdown
                searchable={false}
                value={globalCalDay ? "" : globalDatePreset}
                options={[
                  { id: "all", name: "All time" },
                  { id: "7", name: "Last 7 days" },
                  { id: "30", name: "Last 30 days" },
                  { id: "90", name: "Last 3 months" },
                  { id: "180", name: "Last 6 months" },
                  { id: "365", name: "Last year" },
                ]}
                onChange={(id) => { setGlobalDatePreset(id); setGlobalCalDay(null); }}
              />
            </div>

            <div className="chp-filter-group">
              <label className="chp-filter-label">Service</label>
              <Dropdown
                value={globalServiceFilter}
                options={[{ id: "all", name: "All services" }, ...uniqueServiceNames.map((name) => ({ id: name, name }))]}
                onChange={setGlobalServiceFilter}
              />
            </div>

            <div className="chp-filter-group">
              <label className="chp-filter-label">Staff</label>
              <Dropdown
                value={globalStaffFilter}
                options={[{ id: "all", name: "All staff" }, ...staffList.map((s) => ({ id: s.id, name: s.full_name }))]}
                onChange={setGlobalStaffFilter}
              />
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

      {viewBillApptId && (
        <AppointmentDetailModal
          appointmentId={viewBillApptId}
          onClose={() => setViewBillApptId(null)}
          onChanged={() => loadHistory(clientId)}
        />
      )}
    </div>
  );
}
