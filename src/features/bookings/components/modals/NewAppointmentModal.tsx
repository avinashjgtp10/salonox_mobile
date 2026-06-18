import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Booking, ServiceItem, PackageItem, PaymentMode, DiscountType } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toApiStaffId(id?: string | null): string | undefined {
  return id && UUID_RE.test(id) ? id : undefined;
}
import toast from "react-hot-toast";
import api from "../../../../services/api/axios";
import { useAppDispatch, useAppSelector } from "../../../../hooks/useAppRedux";
import { createBookingThunk } from "../../../../middleware/booking/booking.thunk";
import { fetchClientsThunk } from "../../../../middleware/client/client.thunk";
import { fetchMembershipsThunk } from "../../../../middleware/membership/membership.thunk";
import { fetchProductsThunk } from "../../../../middleware/catalog/products.thunk";
import { computePointsEarned, computeEWalletCredit, EWALLET_REDEEM_MINIMUM, MEMBERSHIP_TIERS, replaceBookingId, updateBooking as updateBookingAction, deleteBooking as deleteBookingAction, patchPaymentStatus } from "../../../../store/schedulerSlice";
import { addMinutes } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import PaymentButton from "../shared/PaymentButton";
import ServiceRow from "./ServiceRow";
import TotalsPanel from "./TotalsPanel";
import Button from "../../../../components/ui/Button";
import Badge from "../../../../components/ui/Badge";
import Input from "../../../../components/ui/Input";
import ClientSearchInput from "../../../clients/components/ClientSearchInput";
import CountryPhoneSelect, { type CountryOption } from "../../../../components/ui/CountryPhoneSelect";
import "../../styles/NewAppointmentModal.scss";
import "../../styles/ClientFormUI.scss";
import {
  Lightning, FileText, BellFill, CreditCard2Front, CreditCard,
  LockFill, Cash, Phone, ExclamationTriangleFill, PencilFill, StarFill,
  Printer, Trash, ArrowRepeat, Scissors, Gift, CheckCircleFill, RecordCircle,
} from "react-bootstrap-icons";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Props { onClose: () => void; defaultStaffId?: string; defaultTime?: string; existingBooking?: Booking }
type TempService = ServiceItem & { tempId: string };
type TempPkg = PackageItem & { tempId: string; search: string; showDrop: boolean; discount?: number };
type TempProduct = { tempId: string; id: string; productName: string; price: number; qty: number; discount?: number; total: number; search: string; showDrop: boolean; stock?: number; };
type TempMembership = { tempId: string; name: string; duration: string; price: number; qty: number; discount?: number; total: number; search: string; showDrop: boolean };
type SingleMethod = "Cash" | "Card" | "UPI";
type SplitEntry = { method: SingleMethod; amount: string };
type ApptStatus = "NEW" | "UNPAID" | "PAID" | "CANCELLED";

const SINGLE_METHODS: SingleMethod[] = ["Cash", "Card", "UPI"];
const DURATIONS = ["1 Month", "3 Months", "6 Months", "1 Year"];
const REWARD_POINTS_OPTIONS = ["None", "Silver (50pts)", "Gold (100pts)", "Platinum (200pts)"];
import { Country } from "country-state-city";

const COUNTRY_CODES = Country.getAllCountries().map((c) => ({
  code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
  label: `${c.isoCode} +${c.phonecode.replace("+", "")}`,
  isoCode: c.isoCode,
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getMembershipLabel(r: number) {
  if (r >= MEMBERSHIP_TIERS.Platinum) return "Platinum";
  if (r >= MEMBERSHIP_TIERS.Gold) return "Gold";
  if (r >= MEMBERSHIP_TIERS.Silver) return "Silver";
  return "NA";
}
function getMembershipColor(t: string) {
  if (t === "Platinum") return "#7c3aed";
  if (t === "Gold") return "#d97706";
  if (t === "Silver") return "#64748b";
  return "#9ca3af";
}
function getNextTier(rev: number): { name: string; remaining: number } | null {
  if (rev < MEMBERSHIP_TIERS.Silver) return { name: "Silver", remaining: MEMBERSHIP_TIERS.Silver - rev };
  if (rev < MEMBERSHIP_TIERS.Gold) return { name: "Gold", remaining: MEMBERSHIP_TIERS.Gold - rev };
  if (rev < MEMBERSHIP_TIERS.Platinum) return { name: "Platinum", remaining: MEMBERSHIP_TIERS.Platinum - rev };
  return null;
}

function printBill(
  booking: Booking,
  paidMethods: Record<string, number>,
  staffList: { id: string; name: string }[],
  salon?: { business_name?: string; phone?: string; email?: string; address?: string; website_url?: string } | null,
) {
  const salonName = salon?.business_name || "SalonOx";
  const salonPhone = salon?.phone || "";
  const salonEmail = salon?.email || "";
  const salonAddress = salon?.address || "";
  const salonWebsite = salon?.website_url || "";

  const staffName = staffList.find((s) => s.id === booking.staffId)?.name || "—";
  const receiptNo = `#${String(booking.id).slice(-6).toUpperCase()}`;
  const apptDate = booking.date
    ? new Date(booking.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const apptTime = booking.startTime || "—";
  const isPaid = booking.paymentStatus === "Paid";

  const svcRows = booking.services.map((s, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
    const disc = (s as any).discount ? `<div style="font-size:11px;color:#ef4444;margin-top:2px">Disc: -₹${(s as any).discount}</div>` : "";
    return `<tr style="background:${bg}">
      <td style="padding:10px 14px;vertical-align:top">
        <div style="font-weight:600;font-size:13px;color:#111">${s.service}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">by ${s.staff || staffName}</div>
      </td>
      <td style="padding:10px 14px;text-align:center;vertical-align:top;font-size:13px;color:#374151">${s.qty}</td>
      <td style="padding:10px 14px;text-align:right;vertical-align:top">
        <div style="font-size:13px;color:#6b7280">₹${(s.price || 0).toFixed(2)}</div>
        ${disc}
      </td>
      <td style="padding:10px 14px;text-align:right;vertical-align:top;font-weight:700;font-size:13px;color:#111">₹${(s.total || 0).toFixed(2)}</td>
    </tr>`;
  }).join("");

  const pkgRows = (booking.packageItems || []).map((p, i) => {
    const bg = (booking.services.length + i) % 2 === 0 ? "#ffffff" : "#f9fafb";
    return `<tr style="background:${bg}">
      <td style="padding:10px 14px;vertical-align:top">
        <div style="font-weight:600;font-size:13px;color:#111">${p.packageName}</div>
        <div style="font-size:11px;color:#f59e0b;margin-top:2px">Package</div>
      </td>
      <td style="padding:10px 14px;text-align:center;vertical-align:top;font-size:13px;color:#374151">${p.qty}</td>
      <td style="padding:10px 14px;text-align:right;vertical-align:top;font-size:13px;color:#6b7280">—</td>
      <td style="padding:10px 14px;text-align:right;vertical-align:top;font-weight:700;font-size:13px;color:#111">₹${(p.total || 0).toFixed(2)}</td>
    </tr>`;
  }).join("");

  const subtotal = [
    ...booking.services.map((s) => s.total || 0),
    ...(booking.packageItems || []).map((p) => p.total || 0),
  ].reduce((a, b) => a + b, 0);
  const grandTotal = booking.grandTotal || subtotal;
  const totalDiscount = subtotal - grandTotal > 0 ? subtotal - grandTotal : 0;

  const paymentRows = Object.entries(paidMethods)
    .filter(([, amt]) => amt > 0)
    .map(([method, amt]) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#374151;border-bottom:1px dashed #e5e7eb">
        <span style="display:flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6366f1"></span>${method}
        </span>
        <span style="font-weight:600">₹${amt.toFixed(2)}</span>
      </div>`).join("");

  const metaInfo = [
    salonAddress && `<span>${salonAddress}</span>`,
    salonPhone && `<span>📞 ${salonPhone}</span>`,
    salonEmail && `<span>✉ ${salonEmail}</span>`,
  ].filter(Boolean).join('<span style="margin:0 8px;color:#9ca3af">|</span>');

  const html = `<!DOCTYPE html>
<html><head><title>Receipt – ${salonName}</title>
<meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @media print{body{background:#fff}}
  .page{max-width:680px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}
  @media print{.page{box-shadow:none;margin:0;border-radius:0}}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER BAND -->
  <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 36px 24px;color:#fff;text-align:center">
    <div style="font-size:30px;font-weight:900;letter-spacing:1px;margin-bottom:4px">${salonName}</div>
    <div style="font-size:12px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px">Payment Receipt</div>
    ${metaInfo ? `<div style="font-size:11px;color:#cbd5e1;margin-top:8px;line-height:1.8">${metaInfo}</div>` : ""}
  </div>

  <!-- RECEIPT META -->
  <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 36px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
    <div>
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Receipt No.</div>
      <div style="font-size:14px;font-weight:700;color:#1e293b">${receiptNo}</div>
    </div>
    <div style="text-align:center">
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Date</div>
      <div style="font-size:13px;font-weight:600;color:#1e293b">${apptDate}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Time</div>
      <div style="font-size:13px;font-weight:600;color:#1e293b">${apptTime}</div>
    </div>
  </div>

  <!-- CLIENT INFO -->
  ${booking.clientName && booking.clientName !== "Walk-In" && booking.clientName !== "Walk-in" ? `
  <div style="padding:16px 36px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;gap:16px">
    <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">${(booking.clientName || "?")[0].toUpperCase()}</div>
    <div>
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Billed To</div>
      <div style="font-size:15px;font-weight:700;color:#1e293b">${booking.clientName}</div>
      ${booking.clientPhone ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">📞 ${booking.clientPhone}</div>` : ""}
    </div>
  </div>` : `
  <div style="padding:14px 36px;border-bottom:1px solid #e2e8f0;background:#fff">
    <span style="font-size:12px;color:#94a3b8;background:#f1f5f9;padding:4px 12px;border-radius:20px;border:1px solid #e2e8f0">Walk-In Customer</span>
  </div>`}

  <!-- SERVICES TABLE -->
  <div style="padding:20px 36px 0">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:10px">Services & Items</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Item / Staff</th>
        <th style="padding:10px 14px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Qty</th>
        <th style="padding:10px 14px;text-align:right;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Rate</th>
        <th style="padding:10px 14px;text-align:right;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Total</th>
      </tr>
    </thead>
    <tbody>${svcRows}${pkgRows}</tbody>
  </table>

  <!-- TOTALS -->
  <div style="padding:20px 36px;border-top:2px solid #e2e8f0;margin-top:4px">
    <div style="display:flex;justify-content:flex-end">
      <div style="width:280px">
        ${subtotal !== grandTotal ? `
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#6b7280">
          <span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#ef4444">
          <span>Discount</span><span>-₹${totalDiscount.toFixed(2)}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:10px 0 10px;font-size:17px;font-weight:800;color:#1e293b;border-top:2px solid #1e293b;margin-top:6px">
          <span>Grand Total</span><span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- PAYMENT BREAKDOWN -->
  ${Object.values(paidMethods).some((v) => v > 0) ? `
  <div style="padding:0 36px 20px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px">
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:10px">Payment Breakdown</div>
      ${paymentRows}
    </div>
  </div>` : ""}

  <!-- PAID BADGE -->
  <div style="padding:0 36px 28px;text-align:center">
    ${isPaid
      ? `<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:10px 32px;border-radius:50px;font-size:15px;font-weight:800;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(16,185,129,0.35)">
           ✓ &nbsp;PAID IN FULL
         </div>`
      : `<div style="display:inline-flex;align-items:center;gap:8px;background:#fef3c7;color:#b45309;padding:10px 32px;border-radius:50px;font-size:14px;font-weight:700;border:1.5px solid #fcd34d">
           ⏳ &nbsp;PAYMENT PENDING
         </div>`}
  </div>

  <!-- FOOTER -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;text-align:center">
    <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:4px">Thank you for choosing ${salonName}! ✨</div>
    <div style="font-size:11px;color:#9ca3af;margin-bottom:2px">We look forward to seeing you again.</div>
    ${salonWebsite ? `<div style="font-size:11px;color:#6366f1;margin-top:6px">${salonWebsite}</div>` : ""}
  </div>

</div>
</body></html>`;

  const win = window.open("", "_blank", "width=700,height=650");
  if (!win) { alert("Please allow popups."); return; }
  win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500);
}

function validateAll(svcRows: TempService[], pkgRows: TempPkg[], prodRows: TempProduct[], memRows: TempMembership[], clientName: string, isWalkin: boolean, selectedClientId: string | null, showAddClientForm: boolean, newClientName: string, newClientPhone: string) {
  const errors: string[] = [];
  if (!clientName.trim() && !isWalkin && !selectedClientId) errors.push("client");
  // Only validate form fields when creating a brand-new client (no existing selectedClientId).
  // When an existing client was selected via the search dropdown, the form opens for display
  // only — the client is already resolved so field-level validation must not block saving.
  if (showAddClientForm && !selectedClientId) {
    if (!newClientName.trim()) errors.push("new_client_name");
    if (!/^\d{10}$/.test(newClientPhone.trim())) errors.push("new_client_phone");
  }
  const activeSvcRows = svcRows.filter(r => r.service || (r as any).price > 0 || (r as any).staffId);
  const hasAnyItem = activeSvcRows.length > 0 || pkgRows.length > 0 || prodRows.length > 0 || memRows.length > 0;
  if (!hasAnyItem) errors.push("no_rows");
  svcRows.forEach((r, i) => {
    // If it's the only row, totally empty, and we have packages/products, ignore it
    if (!r.service && !r.staffId && !r.price && hasAnyItem && activeSvcRows.length === 0) return;

    // Only validate if it's active or if there are no other items
    if (activeSvcRows.length > 0 || !hasAnyItem || r.service || r.staffId || r.price) {
      if (!r.service) errors.push(`svc_${i}_service`);
      else if (!r.staffId) errors.push(`svc_${i}_staff`);
      else if (!r.price || r.price <= 0) errors.push(`svc_${i}_price`);
      else if (!r.qty || r.qty <= 0) errors.push(`svc_${i}_qty`);
    }
  });
  pkgRows.forEach((r, i) => { if (!r.packageName) errors.push(`pkg_${i}_name`); });
  prodRows.forEach((r, i) => { if (!r.productName) errors.push(`prod_${i}_name`); });
  memRows.forEach((r, i) => { if (!r.name) errors.push(`mem_${i}_name`); });
  return errors;
}

// ─── Inline searchable dropdown ────────────────────────────────────────────────
interface InlineDropItem { label: string; sub?: string; price: number; stockIndicator?: boolean; priceLabel?: React.ReactNode }
const InlineDrop: React.FC<{
  search: string; onSearchChange: (v: string) => void; showDrop: boolean; onFocus: () => void;
  items: InlineDropItem[]; onSelect: (item: InlineDropItem) => void;
  placeholder?: string; dropRef: React.RefObject<HTMLDivElement>; disabled?: boolean; hasError?: boolean;
  inputStyle?: React.CSSProperties;
}> = ({ search, onSearchChange, showDrop, onFocus, items, onSelect, placeholder = "Search…", dropRef, disabled, hasError, inputStyle }) => (
  <div ref={dropRef} className="position-relative flex-grow-1">
    <input
      disabled={disabled}
      className={`form-control form-control-sm${hasError ? " is-invalid" : ""}`}
      style={inputStyle}
      placeholder={placeholder}
      value={search}
      onChange={(e) => !disabled && onSearchChange(e.target.value)}
      onFocus={() => !disabled && onFocus()}
    />
    {showDrop && !disabled && items.length > 0 && (
      <div className="dropdown-menu show w-100 p-0" style={{ maxHeight: 200, overflowY: "auto", zIndex: 300 }}>
        {items.map((item, i) => (
          <button key={i} className="dropdown-item d-flex justify-content-between py-1" style={{ fontSize: 12 }} onMouseDown={() => onSelect(item)}>
            <div>
              <span className="fw-semibold" style={item.stockIndicator ? { color: "#dc2626" } : undefined}>
                {item.label} {item.stockIndicator && <span style={{ fontSize: 10, fontWeight: 600 }}>(Out of stock)</span>}
              </span>
              {item.sub && <div className="text-muted" style={{ fontSize: 10 }}>{item.sub}</div>}
            </div>
            <span className="text-muted small">{item.priceLabel ? item.priceLabel : `₹${item.price}`}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const NewAppointmentModal: React.FC<Props> = ({ onClose, defaultStaffId, defaultTime, existingBooking }) => {
  const { addBooking, updateBooking, currentDate, clientStats, deductEWallet, processPaymentRewards,
    staffList, clientsList, packagesList, membershipsList, productsList, blockedTimes } = useSchedulerContext();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id);
  const currentSalon = useAppSelector((s: any) => s.salon?.currentSalon);
  const clientsLoaded     = useAppSelector((s: any) => (s.client as any).items?.length > 0);
  const productsLoaded    = useAppSelector((s: any) => (s.products as any).items?.length > 0);
  const membershipsLoaded = useAppSelector((s: any) => (s.memberships as any).items?.length > 0);

  // Lazy-load clients, products, memberships only when the modal opens.
  // These are NOT fetched on calendar mount to keep initial load fast.
  useEffect(() => {
    if (!clientsLoaded)     dispatch(fetchClientsThunk());
    if (!productsLoaded)    dispatch(fetchProductsThunk());
    if (!membershipsLoaded) dispatch(fetchMembershipsThunk({}));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ FIX — read from both snake_case (DB) and camelCase (local state)
  const paymentState = (
    existingBooking?.payment_status ||
    existingBooking?.paymentStatus ||
    ""
  ).toLowerCase();
  const isActuallyPaid = paymentState === "paid";
  const isActuallyPartial = paymentState === "partial";
  const isCancelledBooking = (existingBooking?.status || "").toLowerCase() === "cancelled";
  const apptStatus: ApptStatus = !existingBooking ? "NEW"
    : isCancelledBooking ? "CANCELLED"
      : isActuallyPaid ? "PAID"
        : isActuallyPartial ? "UNPAID"  // treat partial as still needing payment
          : "UNPAID";
  const [isEditingState, setIsEditing] = useState(false);
  // ✅ Feature 2 — allow editing PAID appointments to add new services
  const isEditing = isEditingState && apptStatus !== "CANCELLED";
  const formFrozen = !!existingBooking && !isEditing;
  const clientFrozen = !!existingBooking;

  // 3-dot menu
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [paidMethodsSnap, setPaidMethodsSnap] = useState<Record<string, number>>({});
  const dotMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // Client details fetched from API
  const [selectedClientDetails, setSelectedClientDetails] = useState<any>(null);

  // Client
  const _isWalkinInit = !existingBooking?.clientId && !!existingBooking;
  const [clientSearch, setClientSearch] = useState(_isWalkinInit ? "Walk-in" : (existingBooking?.clientId ? existingBooking?.clientName || "" : ""));
  const [selectedClientId, setSelectedClientId] = useState<string | null>(existingBooking?.clientId || null);
  const [isWalkin, setIsWalkin] = useState(_isWalkinInit);
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [isClientSaved, setIsClientSaved] = useState(false);
  const [clientSearchKey, setClientSearchKey] = useState(0);
  const [newClientName, setNewClientName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientGender, setNewClientGender] = useState<"" | "Female" | "Male" | "Other">("");
  const [phoneDuplicate, setPhoneDuplicate] = useState(false);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");

  // Date
  const [calDate, setCalDate] = useState(existingBooking?.billDate || currentDate);
  const [showCal, setShowCal] = useState(false);

  // Rows
  const [serviceRows, setServiceRows] = useState<TempService[]>(
    (existingBooking?.services || []).length > 0 ? existingBooking!.services.map((s: any) => ({
      ...s,
      tempId: "sr_" + (s.id || "") + "_" + Math.random().toString(36).substring(2, 9),
      staffId: s.staffId || existingBooking?.staffId || defaultStaffId || "",
      staff: s.staff || (existingBooking as any)?.staffName || "",
    })) : [
      { tempId: "sr_" + Date.now(), id: "", service: "", staff: "", staffId: defaultStaffId || "", time: defaultTime || "10:00", price: 0, qty: 0, total: 0 },
    ],
  );
  const [packageRows, setPackageRows] = useState<TempPkg[]>((existingBooking?.packageItems || []).map((p: any) => ({ ...p, tempId: "pk_" + p.id, search: p.packageName, showDrop: false })));
  const [productRows, setProductRows] = useState<TempProduct[]>(((existingBooking as any)?.productItems || []).map((p: any) => ({ ...p, tempId: p.tempId || "pr_" + Date.now(), search: p.productName || "", showDrop: false })));
  const [membershipRows, setMembershipRows] = useState<TempMembership[]>(((existingBooking as any)?.membershipItems || []).map((m: any) => ({ ...m, tempId: m.tempId || "sub_" + Date.now(), qty: m.qty || 1, total: m.total || m.price || 0, search: m.name || "", showDrop: false })));

  const pkgDropRefs = useRef(new Map<string, React.RefObject<HTMLDivElement>>());
  const prodDropRefs = useRef(new Map<string, React.RefObject<HTMLDivElement>>());
  const memDropRefs = useRef(new Map<string, React.RefObject<HTMLDivElement>>());
  const getPkgRef = (id: string) => { if (!pkgDropRefs.current.has(id)) pkgDropRefs.current.set(id, React.createRef()); return pkgDropRefs.current.get(id)!; };
  const getProdRef = (id: string) => { if (!prodDropRefs.current.has(id)) prodDropRefs.current.set(id, React.createRef()); return prodDropRefs.current.get(id)!; };
  const getMemRef = (id: string) => { if (!memDropRefs.current.has(id)) memDropRefs.current.set(id, React.createRef()); return memDropRefs.current.get(id)!; };
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      setPackageRows((rows) => rows.map((r) => { const ref = pkgDropRefs.current.get(r.tempId); return ref?.current && !ref.current.contains(t) ? { ...r, showDrop: false } : r; }));
      setProductRows((rows) => rows.map((r) => { const ref = prodDropRefs.current.get(r.tempId); return ref?.current && !ref.current.contains(t) ? { ...r, showDrop: false } : r; }));
      setMembershipRows((rows) => rows.map((r) => { const ref = memDropRefs.current.get(r.tempId); return ref?.current && !ref.current.contains(t) ? { ...r, showDrop: false } : r; }));
    };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // Financials
  const [rewardPoints, setRewardPoints] = useState(existingBooking?.rewardPoints || "");
  const [exCharges, setExCharges] = useState(existingBooking?.exCharges || 0);
  const [tip, setTip] = useState<number>((existingBooking as any)?.tip || 0);
  const [discount, setDiscount] = useState(existingBooking?.discount || 0);
  const [discountType, setDiscountType] = useState<DiscountType>(existingBooking?.discountType || "Percentage (%)");
  const [gst] = useState(existingBooking?.gst || 0);
  const [notes, setNotes] = useState(existingBooking?.notes || "");
  const [staffAlert, setStaffAlert] = useState((existingBooking as any)?.staffAlert || "");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [blockTimeError, setBlockTimeError] = useState<string | null>(null);
  const hasErr = (k: string) => validationErrors.includes(k);

  // Payment
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [savedBookingRef, setSavedBookingRef] = useState<Booking | null>(null);
  const [apiAppointmentId, setApiAppointmentId] = useState<string | null>(
    existingBooking?.id && UUID_RE.test(String(existingBooking.id)) ? String(existingBooking.id) : null
  );
  const _pm = existingBooking?.paymentMode || "";
  const [paymentMode, setPaymentMode] = useState<"single" | "split">(_pm.includes("+") ? "split" : "single");
  const [singleMethod, setSingleMethod] = useState<SingleMethod | null>((_pm && !_pm.includes("+")) ? (_pm as SingleMethod) : null);
  const [payMethodError, setPayMethodError] = useState(false);
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([{ method: "Cash", amount: "" }, { method: "Card", amount: "" }]);
  const [couponInput, setCouponInput] = useState(existingBooking?.couponCode || "");
  const [couponDiscount, setCouponDiscount] = useState(existingBooking?.couponDiscount || 0);
  const [couponApplied, setCouponApplied] = useState(existingBooking?.couponCode || "");
  const [couponError, setCouponError] = useState("");
  const [useEWallet, setUseEWallet] = useState(false);
  const [eWalletAmt, setEWalletAmt] = useState(0);
  const isPaid = apptStatus === "PAID";
  // ✅ Feature 2 — the amount already paid on this appointment (don't re-charge it)
  const alreadyPaidAmount = (isPaid || isActuallyPartial) ? (existingBooking?.payingNow ?? existingBooking?.grandTotal ?? 0) : 0;
  const isPaymentFrozen = (isPaid || apptStatus === "CANCELLED") && !isEditing;
  const priceFrozen = formFrozen;
  const [_earnedPoints, setEarnedPoints] = useState(0);
  const [_earnedWallet, setEarnedWallet] = useState(0);
  const [_newMembership, setNewMembership] = useState("");
  const [printAfterPayment, setPrintAfterPayment] = useState(false);

  // Save / Cancel / Delete
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [cancelDeleteError, setCancelDeleteError] = useState("");

  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Fetch client details from API when a client is selected
  useEffect(() => {
    if (!selectedClientId) { setSelectedClientDetails(null); return; }
    api.get(`/api/v1/clients/${selectedClientId}`)
      .then((res) => setSelectedClientDetails(res.data?.data || null))
      .catch((err) => console.error("Failed to fetch client details:", err));
  }, [selectedClientId]);

  // Derived totals
  const safeClientFromDetails = selectedClientDetails ? {
    id: selectedClientDetails.id,
    name: selectedClientDetails.full_name || `${selectedClientDetails.first_name || ""} ${selectedClientDetails.last_name || ""}`.trim() || clientSearch,
    phone: selectedClientDetails.phone_number || "",
  } : null;
  const selectedClient = clientsList.find((c) => c.id === selectedClientId) || safeClientFromDetails;
  const selectedStats = selectedClientDetails ? {
    address: selectedClientDetails.address || "N/A",
    rewardPoints: selectedClientDetails.reward_points || selectedClientDetails.rewardPoints || "None",
    ewalletAmt: selectedClientDetails.wallet_balance ?? selectedClientDetails.eWallet ?? 0,
    unpaidAmt: selectedClientDetails.unpaid_amount ?? 0,
    assignDiscount: selectedClientDetails.assign_discount ?? 0,
    discountValidity: selectedClientDetails.discount_validity || "N/A",
    membership: selectedClientDetails.membership_tier || selectedClientDetails.membership || "NA",
    noShow: selectedClientDetails.no_show_count ?? 0,
    cancelled: selectedClientDetails.cancelled_count ?? 0,
    totalVisit: selectedClientDetails.total_visits ?? 0,
    lastVisit: selectedClientDetails.last_visit_date || "N/A",
    totalRevenue: selectedClientDetails.total_revenue ?? 0,
  } : null;
  const serviceTotal = serviceRows.reduce((a, r) => a + (r.total || 0), 0);
  const packageTotal = packageRows.reduce((a, r) => a + (r.total || 0), 0);
  const productTotal = productRows.reduce((a, r) => a + (r.total || 0), 0);
  const membershipTotal = membershipRows.reduce((a, r) => a + (r.total || r.price || 0), 0);
  const subtotal = serviceTotal + packageTotal + productTotal + membershipTotal;
  const discountVal = discountType === "Percentage (%)" ? (serviceTotal * discount) / 100 : discount;
  const actualDiscountVal = Math.min(discountVal, serviceTotal);
  const totalCategoryDisc = actualDiscountVal;
  const totalDisc = Math.min(totalCategoryDisc + couponDiscount, subtotal);
  const taxable = Math.max(0, subtotal - totalDisc);
  const grandTotal = taxable + (taxable * gst) / 100 + exCharges + tip;
  const effectiveTotal = Math.max(0, grandTotal - (useEWallet ? eWalletAmt : 0));

  // Loyalty
  const clientStat = clientStats.find((c) => c.clientId === selectedClientId);
  const eWalletBalance = clientStat?.ewalletAmt ?? 0;
  const currentRevenue = clientStat?.totalRevenue ?? 0;
  const currentPoints = clientStat?.rewardPointsTotal ?? 0;
  const currentMembership = clientStat?.membership ?? "NA";
  const canUseEWallet = eWalletBalance >= EWALLET_REDEEM_MINIMUM;
  const previewPoints = computePointsEarned(effectiveTotal);
  const previewWalletCred = computeEWalletCredit(previewPoints);
  const previewNewRevenue = currentRevenue + effectiveTotal;
  const previewNewMembership = getMembershipLabel(previewNewRevenue);
  const willUpgrade = previewNewMembership !== currentMembership && previewNewMembership !== "NA";
  const nextTier = getNextTier(currentRevenue);

  // Split
  // Fallback: if service prices weren't loaded (API gap), use the stored dueAmount directly
  const serviceHasPrices = serviceRows.some(r => (r.price || 0) > 0 || (r.total || 0) > 0);
  const storedDueAmount = Number((existingBooking as any)?.dueAmount ?? 0);
  const remainingDue = isActuallyPartial && !isEditing && !serviceHasPrices && storedDueAmount > 0
    ? storedDueAmount
    : Math.max(0, effectiveTotal - alreadyPaidAmount);
  const splitTotal = splitEntries.reduce((a, e) => a + (parseFloat(e.amount) || 0), 0);
  const splitValid = paymentMode === "single" || Math.abs(splitTotal - remainingDue) <= 0.01;
  const splitRemaining = remainingDue - splitTotal;

  function clearErr(...keys: string[]) { setValidationErrors((prev) => prev.filter((e) => !keys.includes(e))); }
  function clearErrPrefix(prefix: string) { setValidationErrors((prev) => prev.filter((e) => !e.startsWith(prefix))); }
  function handleServiceRowClearError(tempId: string, field: string) { const idx = serviceRows.findIndex((r) => r.tempId === tempId); if (idx >= 0) clearErr(`svc_${idx}_${field}`); }
  function posNum(val: string, setter: (n: number) => void) { const n = parseFloat(val); setter(isNaN(n) || n < 0 ? 0 : n); }

  function handleWalkinClick() {
    if (clientFrozen) return;
    setIsWalkin(true); setSelectedClientId(null); setClientSearch("Walk-in");
    setShowAddClientForm(false); clearErr("client");
  }

  async function handleSaveNewClient() {
    if (phoneDuplicate) return;
    const nameOk = newClientName.trim().length > 0;
    const lastNameOk = newClientLastName.trim().length > 0;
    const phoneOk = /^\d{10}$/.test(newClientPhone.trim());
    const genderOk = newClientGender !== "";
    const errs: string[] = [];
    if (!nameOk) errs.push("new_client_name");
    if (!lastNameOk) errs.push("new_client_last_name");
    if (!phoneOk) errs.push("new_client_phone");
    if (!genderOk) errs.push("new_client_gender");
    if (errs.length) { setValidationErrors((prev) => [...prev.filter((e) => !e.startsWith("new_client")), ...errs]); return; }

    // Capture name now — state cleared after await
    const savedName = `${newClientName.trim()} ${newClientLastName.trim()}`.trim();

    setIsClientSaved(true);

    try {
      const res = await api.post("/api/v1/clients", {
        first_name: newClientName.trim(),
        last_name: newClientLastName.trim(),
        phone_number: countryCode + newClientPhone.trim(),
        gender: newClientGender,
      });
      const createdId = res.data?.data?.id || res.data?.id || null;
      setSelectedClientId(createdId ? String(createdId) : null);
    } catch (err: any) {
      console.error("Failed to create client:", err);
      setIsClientSaved(false);
      return;
    }

    // Force-remount ClientSearchInput so it picks up the new name regardless
    // of what was previously typed in the search box
    setClientSearch(savedName);
    setClientSearchKey((k) => k + 1);
    setIsWalkin(false);
    setShowAddClientForm(false);
    clearErr("client", "new_client_name", "new_client_last_name", "new_client_phone", "new_client_gender");
    setNewClientName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
  }

  function updateServiceRow(id: string, field: string, value: string | number | boolean) {
    setServiceRows((rows) => {
      const updated = rows.map((r) => r.tempId !== id ? r : { ...r, [field]: value });
      if (field === "duration" || field === "time") {
        for (let i = 1; i < updated.length; i++) {
          const prev = updated[i - 1];
          updated[i] = { ...updated[i], time: addMinutes(prev.time, (prev as any).duration || 30) };
        }
      }
      return updated;
    });
  }
  function removeServiceRow(id: string) { setServiceRows((r) => r.filter((x) => x.tempId !== id)); }

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await api.post("/api/v1/coupons/validate", {
        code,
        orderAmount: grandTotal || 0,
      });
      const d = res.data?.data;
      const discount = d?.discountAmount ?? d?.discount ?? d?.value ?? d?.amount;
      if (discount !== undefined && discount !== null) {
        setCouponDiscount(Number(discount));
        setCouponApplied(d?.couponCode || code);
        setCouponError("");
      } else {
        setCouponDiscount(0); setCouponApplied(""); setCouponError("Invalid coupon code");
      }
    } catch (err: any) {
      setCouponDiscount(0); setCouponApplied("");
      setCouponError(err?.response?.data?.error?.message || "Invalid or expired coupon");
    }
  }

  function handleEWalletToggle(checked: boolean) {
    setUseEWallet(checked);
    setEWalletAmt(checked ? Math.min(eWalletBalance, Math.max(0, grandTotal - couponDiscount)) : 0);
  }

  function resolvedName() { return isWalkin ? "Walk-In" : selectedClient?.name || clientSearch || ""; }
  function resolvedPhone() { return isWalkin ? "" : selectedClient?.phone || existingBooking?.clientPhone || ""; }

  function buildPayload(paying: number, payStatus: "Paid" | "Partial" | "Unpaid"): Booking {
    const firstRow = serviceRows[0];
    const startTime = firstRow?.time || existingBooking?.startTime || defaultTime || "10:00";
    const serviceDuration = (firstRow as any)?.duration || 30;
    const endTime = addMinutes(startTime, serviceDuration);

    // ── Build combined title from all booking item types ──────────────────
    const appointmentTitle = [
      ...serviceRows.map((r) => r.service || (r as any).name).filter(Boolean),
      ...productRows.map((r) => r.productName || (r as any).name).filter(Boolean),
      ...packageRows.map((r) => r.packageName || (r as any).name).filter(Boolean),
      ...membershipRows.map((r) => r.name).filter(Boolean),
    ].filter(Boolean).join(", ");

    return {
      ...(existingBooking || {}),
      id: existingBooking?.id || "b_" + Date.now(),
      title: appointmentTitle,
      clientId: selectedClientId || undefined,
      clientName: resolvedName(),
      clientPhone: resolvedPhone(),
      staffId: firstRow?.staffId || existingBooking?.staffId || staffList[0]?.id || "",
      date: calDate, billDate: calDate, startTime, endTime,
      services: serviceRows.filter((r) => r.service).map((r) => ({
        id: r.id || "s_" + r.tempId, service: r.service,
        name: r.service,
        staff: staffList.find((s) => s.id === r.staffId)?.name || r.staff || "",
        staffId: r.staffId, time: r.time, price: r.price, qty: r.qty || 1, total: r.total,
        duration: (r as any).duration || 30,
      })),
      groupItems: [],
      packageItems: packageRows.map((r) => ({ id: r.id || "pk_" + r.tempId, packageId: r.packageId, packageName: r.packageName, name: r.packageName, price: r.price, qty: r.qty, total: r.total })),
      status: payStatus === "Paid" ? "Confirmed" : "Pending",
      paymentStatus: payStatus,
      payment_status: payStatus.toLowerCase() as any,
      paymentMode: (singleMethod || "Cash") as PaymentMode,
      rewardPoints, exCharges, discount, discountType, gst,
      couponCode: couponApplied, couponDiscount, subtotal,
      taxableAmount: taxable, grandTotal: effectiveTotal,
      payingNow: paying, dueAmount: Math.max(0, effectiveTotal - paying),
      notes: notes,
      staffAlert: staffAlert,
      tip: tip as any,
      productItems: productRows.map((r) => ({ ...r, name: r.productName || (r as any).name })),
      products: productRows.map((r) => ({ ...r, name: r.productName || (r as any).name })),
      packages: packageRows.map((r) => ({ id: r.id || "pk_" + r.tempId, packageId: r.packageId, packageName: r.packageName, name: r.packageName, price: r.price, qty: r.qty, total: r.total })),
      membershipItems: membershipRows.map((r) => ({ ...r })),
      memberships: membershipRows.map((r) => ({ ...r })),
    } as any;
  }

  function runValidation() {
    return validateAll(serviceRows, packageRows, productRows, membershipRows, resolvedName(), isWalkin, selectedClientId, showAddClientForm, newClientName, newClientPhone);
  }

  async function resolveClientId(): Promise<string | undefined> {
    if (selectedClientId) return selectedClientId;
    if (showAddClientForm && newClientName.trim() && newClientLastName.trim() && /^\d{10}$/.test(newClientPhone.trim()) && newClientGender) {
      try {
        const res = await api.post("/api/v1/clients", {
          first_name: newClientName.trim(),
          last_name: newClientLastName.trim(),
          phone_number: countryCode + newClientPhone.trim(),
          gender: newClientGender,
        });
        const createdId = res.data?.data?.id || res.data?.id || null;
        if (createdId) {
          const id = String(createdId);
          setSelectedClientId(id);
          setClientSearch(`${newClientName.trim()} ${newClientLastName.trim()}`.trim());
          setShowAddClientForm(false);
          setNewClientName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
          return id;
        }
      } catch (err: any) {
        console.error("Failed to create client:", err);
      }
    }
    return undefined;
  }

  function checkBlockedTimeOverlap(bookingDate: string, startTime: string, endTime: string, staffId: string): boolean {
    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const sStart = toMins(startTime);
    const sEnd = toMins(endTime || startTime);
    return blockedTimes.some((b) =>
      b.staffId === staffId &&
      b.date === bookingDate &&
      sStart < toMins(b.endTime) &&
      sEnd > toMins(b.startTime)
    );
  }


  async function handleSave() {
    const errors = runValidation();
    if (errors.length) { setValidationErrors(errors); return; }
    setValidationErrors([]);
    setBlockTimeError(null);

    // Check for blocked time overlaps on all service rows
    const bookingDate = calDate;
    for (const row of serviceRows) {
      if (!row.staffId) continue;
      const rowStart = row.time || (defaultTime ?? "10:00");
      const rowDuration = (row as any).duration || 30;
      const rowEnd = addMinutes(rowStart, rowDuration);
      if (checkBlockedTimeOverlap(bookingDate, rowStart, rowEnd, row.staffId)) {
        setBlockTimeError("This time slot is blocked for the selected staff.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const clientId = await resolveClientId();
      const b = buildPayload(0, "Unpaid");
      if (existingBooking) {
        updateBooking(b);
      } else {
        addBooking(b);
        const localId = String(b.id);
        const firstRow = b.services[0];
        const startTime = firstRow?.time || defaultTime || "10:00";
        const action: any = await dispatch(createBookingThunk({
            salon_id: salonId || undefined,
            client_id: clientId || undefined,
            staff_id: toApiStaffId(firstRow?.staffId) ?? toApiStaffId(staffList[0]?.id),
            service_id: toApiStaffId(firstRow?.id) || undefined,
            services: b.services.map((s: any) => {
              const svcLocal = s.time || startTime;
              const svcDt = new Date(`${calDate}T${svcLocal}:00`);
              const svcStartISO = svcDt.toISOString();
              const svcEndISO = new Date(svcDt.getTime() + (s.duration || 30) * 60000).toISOString();
              return {
                service_id: s.id,
                name: s.service,
                staff_id: toApiStaffId(s.staffId),
                start_time: svcStartISO,
                end_time: svcEndISO,
                price: s.price,
                qty: s.qty || 1,
                total: s.total,
              };
            }),
            package_items: (b.packageItems || []).map((p: any) => ({
              package_id: p.packageId || p.id || undefined,
              name: p.packageName || p.name || "",
              price: p.price || 0,
              quantity: p.qty || p.quantity || 1,
            })),
            product_items: ((b as any).productItems || []).map((p: any) => ({
              product_id: p.id || p.product_id || undefined,
              name: p.productName || p.name || "",
              price: p.price || 0,
              quantity: p.qty || p.quantity || 1,
            })),
            membership_items: ((b as any).membershipItems || []).map((m: any) => ({
              membership_id: m.membershipId || m.id || undefined,
              name: m.name || "",
              price: m.price || 0,
              quantity: m.qty || m.quantity || 1,
              duration: m.duration || undefined,
            })),
            scheduled_at: new Date(`${calDate}T${startTime}:00`).toISOString(),
            duration_minutes: b.services[0]?.duration || 30,
            status: "booked",
            notes: notes || undefined,
            staff_alert: staffAlert || undefined,
          }));

          if (createBookingThunk.rejected.match(action)) {
            dispatch(deleteBookingAction(b.id)); // Rollback optimistic add
            setBlockTimeError(action.payload as string || "Staff member already has an appointment at this time");
            return; // Keep modal open
          }

          // ✅ FIX — merge server response into the optimistic booking so the calendar
          // renders the correct date/time/staffId/color immediately, without waiting for
          // the full re-fetch that handleCloseAppt triggers after the modal closes.
          const apiBooking = action.payload as any;
          const realId = String(apiBooking?.id || "");
          if (realId) {
            dispatch(replaceBookingId({ localId, realId }));
            // Patch the now-id-corrected booking with any server-canonical fields
            dispatch(updateBookingAction({
              ...b,
              id: realId,
              // Prefer server date (already toLocalDateStr'd by mapBooking in the thunk)
              date: apiBooking?.date || b.date,
              startTime: apiBooking?.startTime || b.startTime,
              endTime: apiBooking?.endTime || b.endTime,
              staffId: apiBooking?.staffId || b.staffId,
              status: apiBooking?.status || b.status,
              paymentStatus: apiBooking?.paymentStatus || b.paymentStatus,
            } as any));
          }
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save appointment:", err);
      toast.error("Failed to save appointment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleContinueToPayment() {
    try {
      const errors = runValidation();
      console.log("📋 Validation errors:", errors);
      if (errors.length) { 
        console.warn("❌ Validation failed:", errors);
        setValidationErrors(errors); 
        return; 
      }
      setValidationErrors([]);
      setBlockTimeError(null);

      if (!existingBooking) {
        for (const row of serviceRows) {
          if (!row.staffId) continue;
          const rowStart = row.time || (defaultTime ?? "10:00");
          const rowDuration = (row as any).duration || 30;
          const rowEnd = addMinutes(rowStart, rowDuration);
          if (checkBlockedTimeOverlap(calDate, rowStart, rowEnd, row.staffId)) {
            setBlockTimeError("This time slot is blocked for the selected staff.");
            return;
          }
        }
      }

      console.log("✅ Validation passed, preparing payment...");
      const clientId = await resolveClientId();
      const b = buildPayload(0, "Unpaid");
      console.log("📦 Booking payload:", b);
      // For existing bookings: do NOT call updateBooking(b) — it replaces the full booking in
      // Redux with paymentStatus:"Unpaid" and sends a PATCH that can shift the card's time slot.
      // Just show the payment section; patchPaymentStatus updates the status after payment.
      if (!existingBooking) {
        addBooking(b);
        const localId = String(b.id);
        const firstRow = b.services[0];
        const startTime = firstRow?.time || defaultTime || "10:00";
        const action: any = await dispatch(createBookingThunk({
            salon_id: salonId || undefined,
            client_id: clientId || undefined,
            staff_id: toApiStaffId(firstRow?.staffId) ?? toApiStaffId(staffList[0]?.id),
            service_id: toApiStaffId(firstRow?.id) || undefined,
            services: b.services.map((s: any) => {
              const svcLocal = s.time || startTime;
              const svcDt = new Date(`${calDate}T${svcLocal}:00`);
              const svcStartISO = svcDt.toISOString();
              const svcEndISO = new Date(svcDt.getTime() + (s.duration || 30) * 60000).toISOString();
              return {
                service_id: s.id,
                name: s.service,
                staff_id: toApiStaffId(s.staffId),
                start_time: svcStartISO,
                end_time: svcEndISO,
                price: s.price,
                qty: s.qty || 1,
                total: s.total,
              };
            }),
            package_items: (b.packageItems || []).map((p: any) => ({
              package_id: p.packageId || p.id || undefined,
              name: p.packageName || p.name || "",
              price: p.price || 0,
              quantity: p.qty || p.quantity || 1,
            })),
            product_items: ((b as any).productItems || []).map((p: any) => ({
              product_id: p.id || p.product_id || undefined,
              name: p.productName || p.name || "",
              price: p.price || 0,
              quantity: p.qty || p.quantity || 1,
            })),
            membership_items: ((b as any).membershipItems || []).map((m: any) => ({
              membership_id: m.membershipId || m.id || undefined,
              name: m.name || "",
              price: m.price || 0,
              quantity: m.qty || m.quantity || 1,
              duration: m.duration || undefined,
            })),
            scheduled_at: new Date(`${calDate}T${startTime}:00`).toISOString(),
            duration_minutes: b.services[0]?.duration || 30,
            status: "booked",
            notes: notes || undefined,
            staff_alert: staffAlert || undefined,
          }));

        if (createBookingThunk.rejected.match(action)) {
          dispatch(deleteBookingAction(b.id)); // Rollback optimistic add
          setBlockTimeError(action.payload as string || "Staff member already has an appointment at this time");
          return; // Stop the flow
        }

        // ✅ FIX — merge server response into the optimistic booking immediately
        const apiBooking = action.payload as any;
        const realId = String(apiBooking?.id || "");
        if (realId) {
          dispatch(replaceBookingId({ localId, realId }));
          dispatch(updateBookingAction({
            ...b,
            id: realId,
            date: apiBooking?.date || b.date,
            startTime: apiBooking?.startTime || b.startTime,
            endTime: apiBooking?.endTime || b.endTime,
            staffId: apiBooking?.staffId || b.staffId,
            status: apiBooking?.status || b.status,
            paymentStatus: apiBooking?.paymentStatus || b.paymentStatus,
          } as any));
          setApiAppointmentId(realId);
        }
      }
      setSavedBookingRef(b);
      setShowPaymentSection(true);
      setTimeout(() => paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (err: any) {
      console.error("Failed to continue to payment:", err);
      toast.error("Unable to continue to payment. Please try again.");
    }
  }

  async function handleCompletePayment() {
    const errors = runValidation();
    if (errors.length) { setValidationErrors(errors); throw new Error("validation"); }
    setValidationErrors([]);
    const clientId = await resolveClientId();

    if (paymentMode === "single" && !singleMethod) { setPayMethodError(true); throw new Error("no_method"); }
    setPayMethodError(false);
    const methods: Record<string, number> = {};
    if (useEWallet && eWalletAmt > 0) methods["eWallet"] = eWalletAmt;
    // ✅ Feature 1 — allow partial: Paid only when totalPaid covers the REMAINING amount (after already-paid)
    const remainingDue = Math.max(0, effectiveTotal - alreadyPaidAmount);
    if (paymentMode === "split") {
      splitEntries.forEach((e) => { const a = parseFloat(e.amount) || 0; if (a > 0) methods[e.method] = (methods[e.method] || 0) + a; });
    } else { methods[singleMethod!] = remainingDue; }  // pay exactly the remaining balance
    const totalPaid = Object.values(methods).reduce((a, b) => a + b, 0);
    const chargeAmount = Math.min(totalPaid, remainingDue); // cap at what's actually due
    const newDue = Math.max(0, parseFloat((remainingDue - chargeAmount).toFixed(2)));
    const payStatus: "Paid" | "Partial" = newDue > 0 ? "Partial" : "Paid";

    // ✅ FIX — Build payload only for the receipt/print; do NOT call updateBooking() here
    // (updateBooking replaces the full booking object with recomputed startTime from serviceRows,
    //  which moves the calendar card. We only patch payment fields below.)
    const updated = buildPayload(totalPaid, payStatus);

    //Save payment to backend
    const _isRealId = (v: unknown) => !!v && !String(v).startsWith("b_");
    const existingApptUuid = existingBooking && _isRealId(existingBooking.id) ? existingBooking.id : null;
    const apptId = (_isRealId(apiAppointmentId) ? apiAppointmentId : null) || existingApptUuid;
    if (apptId) {
      const methodLabel = paymentMode === "split"
        ? Object.keys(methods).filter((k) => k !== "eWallet").join("+").toLowerCase()
        : (singleMethod || "cash").toLowerCase();

      // ── Call payment API ─────────────────────────────────────────────────────
      try {
        await api.post("/api/v1/payments", {
          salon_id: salonId || undefined,
          appointment_id: apptId,
          client_id: _isRealId(clientId) ? clientId : undefined,
          gross_amount: grandTotal,
          discount_amount: alreadyPaidAmount > 0 ? 0 : couponDiscount,
          ewallet_used: useEWallet ? eWalletAmt : 0,
          net_amount: effectiveTotal,
          paid_amount: chargeAmount,
          due_amount: newDue,
          coupon_code: alreadyPaidAmount > 0 ? undefined : (couponApplied || undefined),
          payment_method: methodLabel,
          split_details: paymentMode === "split" ? methods : { [singleMethod!]: chargeAmount },
          status: newDue > 0 ? "partial" : "completed",
        });
      } catch (err: any) {
        // "Appointment is already completed" means the appointment was already paid/checked-out
        // — treat this as a success state, not a blocking error.
        const msg: string = err?.message || err?.response?.data?.error?.message || "";
        const alreadyCompleted = msg.toLowerCase().includes("already completed");
        if (!alreadyCompleted) {
          toast.error(msg || "Payment failed. Please try again.");
          throw err; // re-throw so PaymentButton resets its loading/disabled state
        }
        // fall through — continue to patchPaymentStatus and onClose()
      }

      // ── Trigger appointment checkout ─────────────────────────────────────────
      try {
        const saleItems = [
          ...serviceRows.filter((r) => r.service).map((r) => ({
            item_type: "service",
            item_id: r.id || undefined,
            name: r.service,
            quantity: r.qty || 1,
            unit_price: r.price,
          })),
          ...packageRows.filter((r) => r.packageName).map((r) => ({
            item_type: "service",
            item_id: r.packageId || undefined,
            name: r.packageName,
            quantity: r.qty || 1,
            unit_price: r.price,
          })),
          ...productRows.filter((r) => r.productName).map((r) => ({
            item_type: "product",
            item_id: r.id || undefined,
            name: r.productName,
            quantity: r.qty || 1,
            unit_price: r.price,
          })),
          ...membershipRows.filter((r) => r.name).map((r) => ({
            item_type: "membership",
            item_id: undefined,
            name: r.name,
            quantity: r.qty || 1,
            unit_price: r.price,
          })),
        ];
        await api.post(`/api/v1/appointments/${apptId}/checkout`, {
          salon_id: salonId || undefined,
          items: saleItems,
          payment_method: methodLabel,
        });
      } catch {
        // Non-critical — payment already succeeded; ignore checkout errors
        // (e.g. "Appointment is already completed", "already has a linked sale")
      }

      // ── Patch Redux immediately so calendar chip color updates before onClose() ──
      const targetId = existingBooking?.id || apiAppointmentId || savedBookingRef?.id;
      if (targetId) {
        dispatch(patchPaymentStatus({
          id: String(targetId),
          paymentStatus: payStatus,
          payingNow: totalPaid,
          dueAmount: newDue,
          grandTotal: effectiveTotal,
        }));
      }
    }

    // ── Success: update local state, reward points, then close ──────────────
    if (useEWallet && eWalletAmt > 0 && clientId) deductEWallet(clientId, eWalletAmt);
    if (clientId && effectiveTotal > 0) {
      const pts = computePointsEarned(effectiveTotal);
      const wc = computeEWalletCredit(pts);
      const nt = getMembershipLabel(currentRevenue + effectiveTotal);
      setEarnedPoints(pts); setEarnedWallet(wc);
      setNewMembership(nt !== currentMembership ? nt : "");
      processPaymentRewards(clientId, effectiveTotal);
    }
    setPaidMethodsSnap(methods);
    setSavedBookingRef(updated);
    if (printAfterPayment) printBill(updated, methods, staffList, currentSalon);
    if (payStatus !== "Paid") {
      toast.success("Partial payment recorded.");
    }
    onClose();
  }

  const phoneValid = (p: string) => /^\d{10}$/.test(p.trim());

  async function checkPhoneExists(phone: string) {
    if (!phoneValid(phone)) return;
    setPhoneCheckLoading(true);
    try {
      const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(phone)}`);
      const raw = res.data?.data ?? res.data ?? [];
      const list: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
      const found = list.some((c: any) => {
        const stored = (c.phone_number ?? c.phone ?? "").replace(/\D/g, "");
        return stored.endsWith(phone);
      });
      setPhoneDuplicate(found);
    } catch {
      setPhoneDuplicate(false);
    } finally {
      setPhoneCheckLoading(false);
    }
  }

  async function handleCancelAppointment() {
    if (!existingBooking) return;
    const id = apiAppointmentId || (UUID_RE.test(String(existingBooking.id)) ? String(existingBooking.id) : null);
    if (!id) {
      alert("Appointment ID not found");
      return;
    }
    setIsCancelLoading(true);
    setCancelDeleteError("");
    try {
      // Backend route: POST /api/v1/appointments/:id/cancel
      await api.post(`/api/v1/appointments/${id}/cancel`);
      // Update Redux state optimistically (no second API call)
      dispatch(updateBookingAction({ ...existingBooking, status: "Cancelled" } as any));
      setShowDotMenu(false);
      setTimeout(() => onClose(), 300);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error?.message || "Failed to cancel appointment";
      setCancelDeleteError(errorMsg);
      console.error("Failed to cancel appointment:", err);
    } finally {
      setIsCancelLoading(false);
    }
  }

  async function handleDeleteAppointment() {
    if (!existingBooking) return;
    const id = apiAppointmentId || (UUID_RE.test(String(existingBooking.id)) ? String(existingBooking.id) : null);
    if (!id) {
      setCancelDeleteError("Appointment ID not found");
      return;
    }
    setIsDeleteLoading(true);
    setCancelDeleteError("");
    try {
      await api.delete(`/api/v1/appointments/${id}`);
      dispatch(deleteBookingAction(String(existingBooking.id)));
      setShowDeleteConfirmation(false);
      setShowDotMenu(false);
      setTimeout(() => onClose(), 300);
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.status === 404) {
        dispatch(deleteBookingAction(String(existingBooking.id)));
        setShowDeleteConfirmation(false);
        setShowDotMenu(false);
        setTimeout(() => onClose(), 300);
        return;
      }
      const errorMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "Failed to delete appointment";
      setCancelDeleteError(errorMsg);
      console.error("Failed to delete appointment:", err);
    } finally {
      setIsDeleteLoading(false);
    }
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="appt-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="appt-drawer-content">

        {/* HEADER */}
        <div className="appt-drawer-header" style={{ minWidth: 0 }}>
          <button className="btn-close-drawer btn btn-sm btn-link text-dark text-decoration-none fs-5 p-0" onClick={onClose}>✕</button>
          <h5 className="mb-0 fw-bold flex-grow-1" style={{ minWidth: 0 }}>
            {apptStatus === "NEW" ? "New Appointment" : !isEditing ? "View Appointment" : "Edit Appointment"}
          </h5>

          {isPaid && (
            <span className="appt-header-status-badge appt-header-status-badge--paid">✓ Paid</span>
          )}
          {existingBooking && (
            <div ref={dotMenuRef} className="position-relative flex-shrink-0">
              <button onClick={() => setShowDotMenu((v) => !v)}
                className={`btn btn-sm ${showDotMenu ? "btn-light" : "btn-outline-secondary"}`}
                style={{ width: 32, height: 32, fontSize: 20, lineHeight: 1 }} title="Actions">⋮</button>
              {showDotMenu && (
                <div className="dropdown-menu show end-0" style={{ minWidth: 200, zIndex: 9999, position: "absolute" }}>
                  {!isEditing && apptStatus !== "CANCELLED" && (
                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => { setIsEditing(true); setShowDotMenu(false); }}><PencilFill size={13} />Edit Appointment</button>
                  )}
                  {apptStatus !== "CANCELLED" && (
                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => { printBill((savedBookingRef || existingBooking)!, paidMethodsSnap, staffList, currentSalon); setShowDotMenu(false); }}><Printer size={13} />Print Receipt</button>
                  )}
                  <div className="dropdown-divider" style={{ margin: "4px 0" }}></div>
                  <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => handleCancelAppointment()} disabled={isCancelLoading || apptStatus === "CANCELLED"}>
                    {isCancelLoading ? <><ArrowRepeat size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Cancelling...</> : apptStatus === "CANCELLED" ? "✓ Already Cancelled" : "Cancel Appointment"}
                  </button>
                  <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => { setShowDeleteConfirmation(true); setShowDotMenu(false); }} disabled={isDeleteLoading}>
                    {isDeleteLoading ? <><ArrowRepeat size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Deleting...</> : <><Trash size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Delete Appointment</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONFLICT ERROR BANNER */}
        {blockTimeError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#fef2f2", borderBottom: "1px solid #fecaca", color: "#dc2626", fontSize: 13, fontWeight: 500 }}>
            <ExclamationTriangleFill size={13} style={{ flexShrink: 0 }} />
            {blockTimeError}
            <button onClick={() => setBlockTimeError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
          </div>
        )}

        {/* EDITING BANNER */}
        {isEditing && (
          <div className="d-flex align-items-center gap-2 px-3 py-2 bg-primary bg-opacity-10 border-bottom border-primary border-opacity-25 small text-primary">
            <PencilFill size={13} />
            <span>Editing mode — make changes then save.</span>
            <button onClick={() => { setIsEditing(false); setValidationErrors([]); }} className="btn btn-sm btn-link text-secondary ms-auto p-0 text-decoration-none fw-bold">Cancel Editing</button>
          </div>
        )}

        {/* BODY */}
        <div className="appt-drawer-body" style={{ pointerEvents: formFrozen ? "none" : "auto", userSelect: formFrozen ? "none" : "auto" }}>

          {/* ── CLIENT ── */}
          <div className="client-section-card">
            <div className="client-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Client
            </div>
            <div className="client-action-row">
              <div className="search-input-wrapper">
                <ClientSearchInput
                  key={clientSearchKey}
                  value={clientSearch}
                  onChange={(val) => {
                    setClientSearch(val);
                    if (val.trim()) clearErr("client");
                    if (isWalkin) setIsWalkin(false);
                    if (!val) {
                      setSelectedClientId(null);
                      setIsWalkin(false);
                      setShowAddClientForm(false);
                      setNewClientName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
                      return;
                    }
                    // Mirror phone digits typed in search bar → Mobile Number field
                    const digits = val.replace(/\D/g, "");
                    if (digits.length > 0 && /^[\d\s\-()+]+$/.test(val)) {
                      const phone10 = digits.slice(-10);
                      setNewClientPhone(phone10);
                      setPhoneDuplicate(false);
                      clearErr("new_client_phone");
                      if (!showAddClientForm) setShowAddClientForm(true);
                      setIsClientSaved(false);
                    }

                    // Mirror typed name → First Name / Last Name fields
                    // Activates when the query is 3+ chars and looks like a name (starts with a letter)
                    const trimmed = val.trim();
                    if (trimmed.length >= 3 && /^[a-zA-Z]/.test(trimmed)) {
                      const parts = trimmed.split(/\s+/);
                      setNewClientName(parts[0]);
                      if (parts.length > 1) {
                        setNewClientLastName(parts.slice(1).join(" "));
                        clearErr("new_client_last_name");
                      }
                      clearErr("new_client_name");
                      if (!showAddClientForm) setShowAddClientForm(true);
                      setIsClientSaved(false);
                    }
                  }}
                  onSelect={(client) => {
                    setSelectedClientId(String(client.id));
                    const fullName = `${client.first_name} ${client.last_name || ""}`.trim();
                    setClientSearch(fullName);
                    setIsWalkin(false);
                    clearErr("client");

                    // Auto-fill Add Client form with selected client's details
                    setNewClientName(client.first_name || "");
                    setNewClientLastName(client.last_name || "");
                    
                    let phoneStr = client.phone_number || "";
                    let matchedCountryCode = "+91";
                    const possibleCodes = COUNTRY_CODES.map(c => c.code).sort((a, b) => b.length - a.length);
                    for (const code of possibleCodes) {
                      if (phoneStr.startsWith(code)) {
                        matchedCountryCode = code;
                        phoneStr = phoneStr.substring(code.length);
                        break;
                      }
                    }
                    setCountryCode(matchedCountryCode);
                    setNewClientPhone(phoneStr.replace(/\D/g, "").slice(-10));
                    setNewClientGender((client as any).gender || "");

                    // Existing client selected — hide the registration form, show history only
                    setShowAddClientForm(false);
                    setIsClientSaved(true);
                  }}
                  disabled={clientFrozen}
                  hasError={hasErr("client")}
                />
                {hasErr("client") && <div className="text-danger mt-1 small">Please select a client or choose Walk-In</div>}
              </div>

              <button type="button" className={`client-action-btn ${isWalkin ? "active" : ""}`} onClick={handleWalkinClick} disabled={clientFrozen}>
                Walk-In
              </button>
              <button type="button" className="client-action-btn" onClick={() => {
                const willClose = showAddClientForm;
                setShowAddClientForm((v) => !v);
                setIsClientSaved(false);
                clearErr("new_client_name", "new_client_last_name", "new_client_phone", "new_client_gender");
                if (willClose) {
                  if (!selectedClientId) {
                    setNewClientName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
                  }
                }
              }}>
                {showAddClientForm ? "✕ Cancel" : "+ Add Client"}
              </button>

              <div className="date-input-wrapper">
                <input readOnly value={calDate} onClick={() => !formFrozen && setShowCal((v) => !v)} className="appt-date-input" />
                <svg className="calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {showCal && !formFrozen && (
                  <div className="position-absolute" style={{ top: "100%", right: 0, zIndex: 400 }}>
                    <MiniCalendar value={calDate} onChange={(d: string) => { setCalDate(d); setShowCal(false); }} onClose={() => setShowCal(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ADD CLIENT FORM */}
          {showAddClientForm && (
            <div className="client-form-card">
              <div className="client-form-row">

                {/* First Name */}
                <div className="client-form-col">
                  <label className="field-label">First Name <span className="req">*</span></label>
                  <input
                    className={`form-control-custom${hasErr("new_client_name") ? " is-invalid" : ""}`}
                    placeholder="e.g. Priya" value={newClientName}
                    onChange={(e) => { setNewClientName(e.target.value); clearErr("new_client_name"); }}
                    onBlur={() => { if (!newClientName.trim()) setValidationErrors((prev) => [...prev.filter((e) => e !== "new_client_name"), "new_client_name"]); }}
                  />
                  <div className="field-error-slot">
                    {hasErr("new_client_name") && <span>First name is required</span>}
                  </div>
                </div>

                {/* Last Name */}
                <div className="client-form-col">
                  <label className="field-label">Last Name <span className="req">*</span></label>
                  <input
                    className={`form-control-custom${hasErr("new_client_last_name") ? " is-invalid" : ""}`}
                    placeholder="e.g. Sharma" value={newClientLastName}
                    onChange={(e) => { setNewClientLastName(e.target.value); clearErr("new_client_last_name"); }}
                    onBlur={() => { if (!newClientLastName.trim()) setValidationErrors((prev) => [...prev.filter((e) => e !== "new_client_last_name"), "new_client_last_name"]); }}
                  />
                  <div className="field-error-slot">
                    {hasErr("new_client_last_name") && <span>Last name is required</span>}
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="client-form-col mobile-col">
                  <label className="field-label">Mobile Number <span className="req">*</span></label>
                  <div className={`mobile-input-group ${hasErr("new_client_phone") ? "is-invalid" : ""}`}>
                    <CountryPhoneSelect
                      value={countryCode}
                      onChange={(c: CountryOption) => setCountryCode(c.dialCode)}
                    />
                    <input
                      className="mobile-number-input"
                      placeholder="10-digit number" value={newClientPhone} maxLength={10}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setNewClientPhone(val);
                        if (phoneDuplicate) setPhoneDuplicate(false);
                        clearErr("new_client_phone");
                        if (phoneValid(val)) checkPhoneExists(val);
                      }}
                      onBlur={() => {
                        if (!newClientPhone.trim()) {
                          setValidationErrors((prev) => [...prev.filter((e) => e !== "new_client_phone"), "new_client_phone"]);
                        } else if (phoneValid(newClientPhone)) {
                          checkPhoneExists(newClientPhone);
                        } else {
                          setValidationErrors((prev) => [...prev.filter((e) => e !== "new_client_phone"), "new_client_phone"]);
                        }
                      }}
                    />
                  </div>
                  <div className="field-error-slot">
                    {hasErr("new_client_phone") && <span>{newClientPhone.length === 0 ? "Mobile number is required" : "Must be 10 digits"}</span>}
                    {!hasErr("new_client_phone") && phoneDuplicate && <span>Mobile number already exists</span>}
                    {!hasErr("new_client_phone") && !phoneDuplicate && phoneCheckLoading && <span style={{ color: "#6b7280" }}>Checking…</span>}
                  </div>
                </div>

                {/* Gender */}
                <div className="client-form-col gender-col">
                  <label className="field-label">Gender <span className="req">*</span></label>
                  <select className={`form-control-custom${hasErr("new_client_gender") ? " is-invalid" : ""}`} value={newClientGender}
                    onChange={(e) => { setNewClientGender(e.target.value as "Female" | "Male" | "Other"); clearErr("new_client_gender"); }}
                    onBlur={() => { if (!newClientGender) setValidationErrors((prev) => [...prev.filter((e) => e !== "new_client_gender"), "new_client_gender"]); }}>
                    <option value="">Select</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="field-error-slot">
                    {hasErr("new_client_gender") && <span>Gender is required</span>}
                  </div>
                </div>

                {/* Save Button — offset by label height via btn-col padding-top */}
                <div className="client-form-col btn-col">
                  <Button variant="dark" fullWidth
                    disabled={isClientSaved || phoneDuplicate || phoneCheckLoading}
                    onClick={handleSaveNewClient}>
                    {isClientSaved ? "Saved ✓" : "Save Client"}
                  </Button>
                  <div className="field-error-slot" />
                </div>

              </div>
            </div>
          )}

          {/* CLIENT STATS */}
          {selectedClientId && selectedStats && (
            <div className="client-stats-panel mt-3">
              <div className="client-stats-panel__header">
                <div className="avatar">{selectedClient!.name.charAt(0)}</div>
                <div className="info">
                  <div className="name">{selectedClient!.name}</div>
                  <div className="sub">{selectedClient!.phone} · {selectedStats.address}</div>
                </div>
                {selectedStats.membership !== "NA" && (
                  <Badge variant="warning"><StarFill size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />{selectedStats.membership}</Badge>
                )}
              </div>
              <div className="client-stats-panel__grid">
                {([
                  ["Reward Points", selectedStats.rewardPoints, ""],
                  ["Ewallet Amt", `₹${selectedStats.ewalletAmt}`, ""],
                  ["Unpaid Amt", `₹${selectedStats.unpaidAmt}`, selectedStats.unpaidAmt > 0 ? "danger" : ""],
                  ["Assign Discount", `${selectedStats.assignDiscount}%`, ""],
                  ["Disc. Validity", selectedStats.discountValidity, ""],
                  ["Membership", selectedStats.membership, ""],
                  ["Cancelled", selectedStats.cancelled, selectedStats.cancelled > 0 ? "danger" : ""],
                  ["Total Visits", selectedStats.totalVisit, ""],
                  ["Last Visit", selectedStats.lastVisit, ""],
                  ["Total Revenue", `₹${selectedStats.totalRevenue?.toLocaleString()}`, "info"],
                ] as [string, string | number, string][]).map(([l, v, c]) => (
                  <div key={l} className={`info-cell ${c}`}>
                    <span className="info-cell__label">{l}</span>
                    <span className="info-cell__value">{v}</span>
                  </div>
                ))}
                {/* View History — navigates to the client's profile page */}
                <div className="info-cell">
                  <span className="info-cell__label">View History</span>
                  <button
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "#111827",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "0.2px",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#374151")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#111827")}
                    onClick={() => {
                      onClose();
                      navigate(`/dashboard/clients/list`, { state: { openClientId: selectedClientId } });
                    }}
                  >
                    ↗ Click Here
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SERVICES & ITEMS ── */}
          <div className="appt-section">
            <div className="appt-section__title"><Scissors size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Services &amp; Items</div>
            {hasErr("no_rows") && <div className="alert alert-danger py-2 small">Add at least one service, package, product or membership before saving.</div>}

            {serviceRows.map((row, i) => (
              <ServiceRow key={row.tempId} row={row} onChange={updateServiceRow} onRemove={removeServiceRow} onClearError={handleServiceRowClearError}
                disabled={priceFrozen}
                hasError={!formFrozen && (hasErr(`svc_${i}_service`) || hasErr(`svc_${i}_staff`) || hasErr(`svc_${i}_price`) || hasErr(`svc_${i}_qty`))}
                errorFields={formFrozen ? {} : { service: hasErr(`svc_${i}_service`), staff: hasErr(`svc_${i}_staff`), price: hasErr(`svc_${i}_price`), qty: hasErr(`svc_${i}_qty`) }} />
            ))}

            {/* Package rows */}
            {packageRows.length > 0 && (<>
              <div className="table-header table-header--packages"><div>PACKAGE</div><div>PRICE</div><div>QTY</div><div>DISC (₹)</div><div>TOTAL</div><div /></div>
              {packageRows.map((row, i) => {
                const filtered = (packagesList || []).filter((p: any) => p.name.toLowerCase().includes(row.search.toLowerCase()));
                const hasRowErr = hasErr(`pkg_${i}_name`);
                return (
                  <div key={row.tempId} className="item-row-grid item-row-grid--pkg border-bottom">
                    <InlineDrop dropRef={getPkgRef(row.tempId)} search={row.search} showDrop={row.showDrop} placeholder="Search package…" disabled={priceFrozen} hasError={hasRowErr}
                      onFocus={() => setPackageRows((r) => r.map((x) => ({ ...x, showDrop: x.tempId === row.tempId })))}
                      onSearchChange={(v) => setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, search: v, showDrop: true } : x))}
                      items={filtered.map((p: any) => ({ label: p.name, sub: Array.isArray(p.services) ? p.services.join(", ") : "", price: p.price }))}
                      onSelect={(item) => { const pkg = (packagesList || []).find((p: any) => p.name === item.label) as any; if (!pkg) return; setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, packageId: pkg.id, packageName: pkg.name, price: pkg.price, qty: x.qty || 1, total: Math.max(0, pkg.price * (x.qty || 1) - (x.discount || 0)), search: pkg.name, showDrop: false } : x)); clearErrPrefix(`pkg_${i}_`); }} />
                    <input readOnly value={`₹${row.price}`} className="form-control form-control-sm bg-white" />
                    <input type="text" inputMode="numeric" placeholder="1" value={row.qty} disabled={priceFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ""); const num = parseFloat(val); setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty: val as any, total: (!isNaN(num) && num > 0) ? Math.max(0, x.price * num - (x.discount || 0)) : x.total } : x)); }}
                      onBlur={() => { const num = parseFloat(String(row.qty)); const clamped = !isNaN(num) && num >= 1 ? num : 1; setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty: clamped, total: Math.max(0, x.price * clamped - (x.discount || 0)) } : x)); }} />
                    <input type="text" inputMode="numeric" placeholder="0" value={row.discount || ""} disabled={priceFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const disc = Math.max(0, parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0); setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, discount: disc, total: Math.max(0, x.price * (x.qty || 1) - disc) } : x)); }} />
                    <input readOnly value={row.total ? row.total.toFixed(2) : "0.00"} className="form-control form-control-sm bg-light fw-semibold text-secondary" />
                    {!priceFrozen && <button onClick={() => { setPackageRows((r) => r.filter((x) => x.tempId !== row.tempId)); clearErrPrefix(`pkg_${i}_`); }} className="btn btn-sm btn-link text-danger p-0"><Trash size={14} /></button>}
                    {hasRowErr && <div className="text-danger col-span-all" style={{ fontSize: 10 }}>Please select a package</div>}
                  </div>
                );
              })}
            </>)}

            {/* Product rows */}
            {productRows.length > 0 && (<>
              <div className="table-header table-header--products"><div>PRODUCT</div><div>PRICE</div><div>QTY</div><div>DISC (₹)</div><div>TOTAL</div><div /></div>
              {productRows.map((row, i) => {
                const filtered = (productsList || []).filter((p: any) => p.name.toLowerCase().includes(row.search.toLowerCase()));
                const hasRowErr = hasErr(`prod_${i}_name`);
                return (
                  <div key={row.tempId} className="item-row-grid item-row-grid--prod border-bottom" style={{ position: "relative" }}>
                    {row.stock !== undefined && row.stock <= 0 && (
                      <div style={{ position: "absolute", top: "-10px", left: "10px", fontSize: "10px", color: "#dc2626", fontWeight: "bold", background: "#fee2e2", padding: "1px 4px", borderRadius: "4px", zIndex: 10 }}>
                        Out of stock
                      </div>
                    )}
                    <InlineDrop dropRef={getProdRef(row.tempId)} search={row.search} showDrop={row.showDrop} placeholder="Search product…" disabled={priceFrozen} hasError={hasRowErr}
                      inputStyle={row.stock !== undefined && row.stock <= 0 ? { color: "#dc2626", fontWeight: 600 } : undefined}
                      onFocus={() => setProductRows((r) => r.map((x) => ({ ...x, showDrop: x.tempId === row.tempId })))}
                      onSearchChange={(v) => setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, search: v, showDrop: true } : x))}
                      items={filtered.map((p: any) => ({
                        label: p.name,
                        price: p.price === null ? 0 : p.price,
                        stockIndicator: p.stock <= 0,
                        priceLabel: p.price === null ? <span style={{ fontSize: 10, color: "#6c757d", fontStyle: "italic" }}>Price not available</span> : undefined
                      }))}
                      onSelect={(item) => { const prod = (productsList || []).find((p: any) => p.name === item.label) as any; if (!prod) return; setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, id: prod.id, productName: prod.name, price: prod.price, total: Math.max(0, prod.price * (x.qty || 1) - (x.discount || 0)), search: prod.name, showDrop: false, stock: prod.stock } : x)); clearErrPrefix(`prod_${i}_`); }} />
                    <input readOnly value={`₹${row.price}`} className="form-control form-control-sm bg-white" />
                    <input type="text" inputMode="numeric" placeholder="1" value={row.qty} disabled={priceFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ""); const num = parseFloat(val); setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty: val as any, total: (!isNaN(num) && num > 0) ? Math.max(0, x.price * num - (x.discount || 0)) : x.total } : x)); }}
                      onBlur={() => { const num = parseFloat(String(row.qty)); const clamped = !isNaN(num) && num >= 1 ? num : 1; setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty: clamped, total: Math.max(0, x.price * clamped - (x.discount || 0)) } : x)); }} />
                    <input type="text" inputMode="numeric" placeholder="0" value={row.discount || ""} disabled={priceFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const disc = Math.max(0, parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0); setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, discount: disc, total: Math.max(0, x.price * (x.qty || 1) - disc) } : x)); }} />
                    <input readOnly value={row.total ? row.total.toFixed(2) : "0.00"} className="form-control form-control-sm bg-light fw-semibold text-secondary" />
                    {!priceFrozen && <button onClick={() => { setProductRows((r) => r.filter((x) => x.tempId !== row.tempId)); clearErrPrefix(`prod_${i}_`); }} className="btn btn-sm btn-link text-danger p-0"><Trash size={14} /></button>}
                    {hasRowErr && <div className="text-danger col-span-all" style={{ fontSize: 10 }}>Please select a product</div>}
                  </div>
                );
              })}
            </>)}

            {/* Membership rows */}
            {membershipRows.length > 0 && (<>
              <div className="table-header table-header--membership"><div>MEMBERSHIP</div><div>DURATION</div><div>PRICE</div><div>QTY</div><div>DISC (₹)</div><div>TOTAL</div><div /></div>
              {membershipRows.map((row, i) => {
                const filtered = (membershipsList || []).filter((m: any) => m.name.toLowerCase().includes(row.search.toLowerCase()));
                const hasRowErr = hasErr(`mem_${i}_name`);
                return (
                  <div key={row.tempId} className="item-row-grid item-row-grid--mem border-bottom">
                    <InlineDrop dropRef={getMemRef(row.tempId)} search={row.search} showDrop={row.showDrop} placeholder="Search membership…" disabled={priceFrozen} hasError={hasRowErr}
                      onFocus={() => setMembershipRows((r) => r.map((x) => ({ ...x, showDrop: x.tempId === row.tempId })))}
                      onSearchChange={(v) => setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, search: v, showDrop: true } : x))}
                      items={filtered.map((m: any) => ({ label: m.name, price: m.price }))}
                      onSelect={(item) => { const mem = (membershipsList || []).find((m: any) => m.name === item.label) as any; if (!mem) return; setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, name: mem.name, price: mem.price, qty: x.qty || 1, total: Math.max(0, mem.price * (x.qty || 1) - (x.discount || 0)), search: mem.name, showDrop: false } : x)); clearErrPrefix(`mem_${i}_`); }} />
                    <select value={row.duration} disabled={priceFrozen} className="form-select form-select-sm"
                      onChange={(e) => setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, duration: e.target.value } : x))}>
                      {DURATIONS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <input readOnly value={`₹${row.price}`} className="form-control form-control-sm bg-white" />
                    <input type="text" inputMode="numeric" placeholder="1" value={row.qty !== undefined ? row.qty : 1} disabled={priceFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ""); const num = parseFloat(val); setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty: val as any, total: (!isNaN(num) && num > 0) ? Math.max(0, x.price * num - (x.discount || 0)) : x.total } : x)); }}
                      onBlur={() => { const num = parseFloat(String(row.qty)); const clamped = !isNaN(num) && num >= 1 ? num : 1; setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty: clamped, total: Math.max(0, x.price * clamped - (x.discount || 0)) } : x)); }} />
                    <input type="text" inputMode="numeric" placeholder="0" value={row.discount || ""} disabled={priceFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const disc = Math.max(0, parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0); setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, discount: disc, total: Math.max(0, x.price * (x.qty || 1) - disc) } : x)); }} />
                    <input readOnly value={row.total ? row.total.toFixed(2) : "0.00"} className="form-control form-control-sm bg-light fw-semibold text-secondary" />
                    {!priceFrozen && <button onClick={() => { setMembershipRows((r) => r.filter((x) => x.tempId !== row.tempId)); clearErrPrefix(`mem_${i}_`); }} className="btn btn-sm btn-link text-danger p-0"><Trash size={14} /></button>}
                    {hasRowErr && <div className="text-danger col-span-all" style={{ fontSize: 10 }}>Please select a membership</div>}
                  </div>
                );
              })}
            </>)}

            {/* Add buttons */}
            {!priceFrozen && (
              <div className="appt-add-actions d-flex flex-wrap gap-2 mt-2">
                <Button variant="dark" size="sm" onClick={() => setServiceRows((r) => {
                  const last = r[r.length - 1];
                  const nextTime = last ? addMinutes(last.time, (last as any).duration || 30) : (defaultTime || "10:00");
                  return [...r, { tempId: "sr_" + Date.now(), id: "", service: "", staff: "", staffId: last?.staffId || defaultStaffId || "", time: nextTime, price: 0, qty: 0, total: 0 }];
                })}>+ Service</Button>
                <Button variant="dark" size="sm" onClick={() => setPackageRows((r) => [...r, { tempId: "pk_" + Date.now(), id: "", packageId: "", packageName: "", price: 0, qty: 1, total: 0, search: "", showDrop: true }])}>+ Package</Button>
                <Button variant="dark" size="sm" onClick={() => setProductRows((r) => [...r, { tempId: "pr_" + Date.now(), id: "", productName: "", price: 0, qty: 1, total: 0, search: "", showDrop: true }])}>+ Product</Button>
                <Button variant="dark" size="sm" onClick={() => setMembershipRows((r) => [...r, { tempId: "sub_" + Date.now(), name: "", duration: "1 Month", price: 0, qty: 1, total: 0, search: "", showDrop: true }])}>+ Membership</Button>
              </div>
            )}
          </div>

          {/* ── CHARGES & DISCOUNTS ── */}
          <div className="appt-section">
            <div className="appt-section__title"><Lightning size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Charges &amp; Discounts</div>
            <div className="charges-discounts-row">

              <div className="charges-field">
                <label>Reward Points {isPaid && <LockFill size={10} title="Frozen field" style={{ color: "#94a3b8" }} />}</label>
                <select className="form-select" value={rewardPoints} disabled={priceFrozen} onChange={(e) => setRewardPoints(e.target.value)}>
                  {REWARD_POINTS_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div className="charges-field">
                <label>Ex Charges {isPaid && <LockFill size={10} title="Frozen field" style={{ color: "#94a3b8" }} />}</label>
                <input type="text" inputMode="numeric" className="form-control" value={exCharges || ""} placeholder="0" disabled={priceFrozen} onChange={(e) => posNum(e.target.value.replace(/[^0-9.]/g, ""), setExCharges)} />
              </div>

              <div className="charges-field">
                <label>Tip {isPaid && <LockFill size={10} title="Frozen field" style={{ color: "#94a3b8" }} />}</label>
                <input type="text" inputMode="numeric" className="form-control" value={tip || ""} placeholder="0" disabled={priceFrozen} onChange={(e) => posNum(e.target.value.replace(/[^0-9.]/g, ""), setTip)} />
              </div>

              <div className="charges-field">
                <label>Svc Discount {isPaid && <LockFill size={10} title="Frozen field" style={{ color: "#94a3b8" }} />}</label>
                <input type="text" inputMode="numeric" className="form-control" value={discount || ""} placeholder="0" disabled={priceFrozen} onChange={(e) => posNum(e.target.value.replace(/[^0-9.]/g, ""), setDiscount)} />
              </div>

              <div className="charges-field">
                <label>Disc. Type {isPaid && <LockFill size={10} title="Frozen field" style={{ color: "#94a3b8" }} />}</label>
                <select className="form-select" value={discountType} disabled={priceFrozen} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                  <option>Percentage (%)</option><option>Flat (₹)</option>
                </select>
              </div>

            </div>
          </div>

          {/* ── PAYMENT & NOTES ── */}
          <div className="appt-section">
            <div className="appt-section__title"><FileText size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Payment &amp; Notes</div>
            <div className="row g-3">
              <div className="col-md-8">
                <div className="row g-3">
                  <div className="col-12">
                    <Input label={<><BellFill size={12} />Staff Alert</>} placeholder="e.g. Client has allergy to chemicals" value={staffAlert} disabled={formFrozen}
                      onChange={(e) => setStaffAlert((e.target as HTMLInputElement).value)} />
                  </div>
                  <div className="col-12">
                    <Input label="Notes" multiline rows={2} placeholder="Enter appointment notes" value={notes} disabled={formFrozen}
                      onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)} />
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <TotalsPanel subtotal={subtotal} serviceTotal={serviceTotal} packageTotal={packageTotal} productTotal={productTotal} membershipTotal={membershipTotal} exCharges={exCharges} discount={discount} discountType={discountType} totalDiscount={totalCategoryDisc} tip={tip} />
              </div>
            </div>
          </div>

          {/* ── PAYMENT SECTION ── */}
          {(showPaymentSection || isPaid) && (
            <div ref={paymentSectionRef} className="appt-section pay-section" style={{ borderColor: isPaymentFrozen ? "#cbd5e1" : "#d1fae5", background: isPaymentFrozen ? "#f8fafc" : "#f0fdf4", pointerEvents: isPaymentFrozen ? "none" : "auto", userSelect: "auto", opacity: isPaymentFrozen ? 0.9 : 1 }}>
              <div className="appt-section__title" style={{ color: isPaymentFrozen ? "#475569" : "#065f46" }}>
                {isPaymentFrozen ? <><CreditCard2Front size={14} style={{ marginRight: 5, verticalAlign: "middle" }} />Payment Information <LockFill size={11} style={{ marginLeft: 2, verticalAlign: "middle", color: "#94a3b8" }} /></> : <><CreditCard2Front size={14} style={{ marginRight: 5, verticalAlign: "middle" }} />Confirm &amp; Pay</>}
              </div>

              {/* Loyalty bar */}
              {clientStat && (
                <div className="d-flex border rounded-3 overflow-hidden mb-3 bg-white">
                  {[
                    { label: "Membership", value: currentMembership === "NA" ? "—" : currentMembership, color: getMembershipColor(currentMembership), star: currentMembership !== "NA" },
                    { label: "Points", value: `${currentPoints} pts`, color: "#111827" },
                    { label: "eWallet", value: `₹${eWalletBalance.toFixed(2)}`, color: "#111827" },
                    ...(nextTier ? [{ label: `→ ${nextTier.name}`, value: `₹${nextTier.remaining.toLocaleString()} more`, color: "#6b7280" }] : []),
                  ].map((item, i, arr) => (
                    <div key={item.label} className={`flex-fill d-flex flex-column align-items-center py-2 px-1${i < arr.length - 1 ? " border-end" : ""}`}>
                      <span className="text-uppercase fw-bold text-muted mb-1" style={{ fontSize: 9, letterSpacing: "0.04em" }}>{item.label}</span>
                      <span className="fw-bold" style={{ fontSize: 12, color: item.color }}>{(item as any).star && <StarFill size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />}{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bill preview */}
              <div className="card border rounded-3 overflow-hidden mb-3">
                {serviceRows.filter((s) => s.service).map((s) => (
                  <div key={s.tempId} className="d-flex justify-content-between px-3 py-2 border-bottom small">
                    <span>{s.service}{s.qty > 1 && <span className="text-muted"> ×{s.qty}</span>}<span className="text-muted fst-italic"> · {staffList.find((st) => st.id === s.staffId)?.name}</span></span>
                    <span className="fw-semibold">₹{(s.total || 0).toFixed(2)}</span>
                  </div>
                ))}
                {packageRows.filter((p) => p.packageName).map((p) => (
                  <div key={p.tempId} className="d-flex justify-content-between px-3 py-2 border-bottom small">
                    <span>{p.packageName} <Badge variant="warning">PKG</Badge></span>
                    <span className="fw-semibold">₹{p.total.toFixed(2)}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="d-flex justify-content-between px-3 py-2 border-bottom small text-danger">
                    <span>Discount</span><span className="fw-semibold">−₹{actualDiscountVal.toFixed(2)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="d-flex justify-content-between px-3 py-2 border-bottom small text-success">
                    <span>Coupon <Badge variant="success">{couponApplied}</Badge></span>
                    <span className="fw-semibold">−₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {useEWallet && eWalletAmt > 0 && (
                  <div className="d-flex justify-content-between px-3 py-2 border-bottom small text-primary">
                    <span>eWallet</span><span className="fw-semibold">−₹{eWalletAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between px-3 py-3 fw-bold" style={{ background: "#111827", color: "#fff" }}>
                  <span>Amount to Pay</span><span>₹{effectiveTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Rewards preview */}
              {effectiveTotal > 0 && (
                <div className="pay-rewards">
                  <Gift size={13} />
                  <span>Earn <strong>{previewPoints} pts</strong> → ₹{previewWalletCred.toFixed(2)} eWallet credit</span>
                  {willUpgrade && <span className="pay-rewards__upgrade" style={{ color: getMembershipColor(previewNewMembership) }}>· Upgrades to {previewNewMembership}!</span>}
                </div>
              )}

              {/* Coupon */}
              <div className="pay-coupon">
                <label className="pay-section__lbl">Coupon Code {isPaymentFrozen && <LockFill size={10} title="Frozen field" style={{ marginLeft: 3, verticalAlign: "middle", color: "#94a3b8" }} />}</label>
                <div className="pay-coupon__row">
                  <input disabled={isPaymentFrozen} placeholder="SAVE10, FLAT50, NEW20" value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && !isPaymentFrozen && handleApplyCoupon()} />
                  <button disabled={isPaymentFrozen} onClick={handleApplyCoupon}>Apply</button>
                </div>
                {couponApplied && <div className="pay-coupon__success">✓ "{couponApplied}" applied — ₹{couponDiscount} off</div>}
                {couponError && <div className="pay-coupon__error">{couponError}</div>}
              </div>

              {/* eWallet */}
              {eWalletBalance > 0 && (
                <div className={`rounded-3 p-3 border mb-3 ${canUseEWallet && !isPaymentFrozen ? "border-primary bg-light" : "bg-light"}`}>
                  {canUseEWallet ? (
                    <>
                      <div className="form-check">
                        <input type="checkbox" disabled={isPaymentFrozen} className="form-check-input" id="ew" checked={useEWallet} onChange={(e) => handleEWalletToggle(e.target.checked)} />
                        <label className="form-check-label fw-semibold text-primary" htmlFor="ew">Use eWallet (Available: ₹{eWalletBalance.toFixed(2)}) {isPaymentFrozen && <LockFill size={10} title="Frozen field" style={{ marginLeft: 3, verticalAlign: "middle", color: "#94a3b8" }} />}</label>
                      </div>
                      {useEWallet && <div className="text-primary small mt-1 fw-semibold">✓ Applying ₹{eWalletAmt.toFixed(2)} from eWallet</div>}
                    </>
                  ) : (
                    <div className="small text-muted"><LockFill size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />eWallet: ₹{eWalletBalance.toFixed(2)} — Redeemable at ₹{EWALLET_REDEEM_MINIMUM}</div>
                  )}
                </div>
              )}

              {/* --- Payment Form --- */}
              {alreadyPaidAmount > 0 && (
                <div className="alert alert-secondary d-flex justify-content-between align-items-center py-2 px-3 mb-3" style={{ fontSize: 13, border: "1px dashed #cbd5e1", background: "#f8fafc" }}>
                  <span className="fw-semibold text-secondary">Previously Paid: ₹{alreadyPaidAmount.toFixed(2)} ✓</span>
                  <span className="fw-bold text-dark">Balance Due: ₹{remainingDue.toFixed(2)}</span>
                </div>
              )}
              <div className="pay-method">
                <label className="pay-section__lbl">
                  Payment Method <span style={{ color: "#ef4444" }}>*</span> {isPaymentFrozen && <LockFill size={10} title="Frozen field" style={{ marginLeft: 3, verticalAlign: "middle", color: "#94a3b8" }} />}
                </label>
                <div className="pay-method__toggle">
                  {(["single", "split"] as const).map((mode) => (
                    <button key={mode} disabled={isPaymentFrozen} onClick={() => { setPaymentMode(mode); setPayMethodError(false); }} className={paymentMode === mode ? "active" : ""}>
                      {mode === "single" ? "Single" : "Split"}
                    </button>
                  ))}
                </div>
                {paymentMode === "single" ? (
                  <>
                    <div className="pay-method__options">
                      {SINGLE_METHODS.map((m) => (
                        <button key={m} disabled={isPaymentFrozen} onClick={() => { setSingleMethod(m); setPayMethodError(false); }}
                          className={`${singleMethod === m ? "active" : ""}${payMethodError ? " error" : ""}`}>
                          {m === "Cash" ? <Cash size={13} /> : m === "Card" ? <CreditCard size={13} /> : <Phone size={13} />}{m}
                        </button>
                      ))}
                    </div>
                    {payMethodError && (
                      <div className="pay-method__error"><ExclamationTriangleFill size={12} />Please select a payment method to continue.</div>
                    )}
                  </>
                ) : (
                  <div className="card border rounded-3 p-3">
                    {splitEntries.map((entry, idx) => (
                      <div key={idx} className="d-flex gap-2 align-items-center mb-2">
                        <div className="d-flex gap-1">
                          {SINGLE_METHODS.map((m) => {
                            const isUsedElsewhere = splitEntries.some((e, i) => i !== idx && e.method === m);
                            return (
                              <button key={m} disabled={isPaymentFrozen || isUsedElsewhere} onClick={() => setSplitEntries((entries) => entries.map((e, i) => i === idx ? { ...e, method: m, amount: e.amount || (splitRemaining > 0 ? splitRemaining.toFixed(2) : "") } : e))}
                                className={`btn btn-sm ${entry.method === m ? "btn-dark" : "btn-outline-secondary"}`} style={{ fontSize: 11 }}>
                                {m === "Cash" ? <Cash size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> : m === "Card" ? <CreditCard size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> : <Phone size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />}{m}
                              </button>
                            );
                          })}
                        </div>
                        <input type="text" disabled={isPaymentFrozen} inputMode="numeric" placeholder="₹ Amount" value={entry.amount} className="form-control form-control-sm" style={{ width: 100 }}
                          onChange={(e) => setSplitEntries((entries) => entries.map((en, i) => i === idx ? { ...en, amount: e.target.value.replace(/[^0-9.]/g, "") } : en))} />
                        {splitEntries.length > 1 && !isPaymentFrozen && (
                          <button onClick={() => setSplitEntries((e) => e.filter((_, i) => i !== idx))} className="btn btn-sm btn-link text-danger p-0">✕</button>
                        )}
                      </div>
                    ))}
                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small">
                      {splitEntries.length < SINGLE_METHODS.length && !isPaymentFrozen ? (
                        <button onClick={() => {
                          const nextUnused = SINGLE_METHODS.find(m => !splitEntries.some(e => e.method === m)) || SINGLE_METHODS[0];
                          setSplitEntries((e) => [...e, { method: nextUnused, amount: splitRemaining > 0 ? splitRemaining.toFixed(2) : "" }]);
                        }} className="btn btn-sm btn-link text-primary p-0 text-decoration-none fw-bold">+ Add Method</button>
                      ) : <div></div>}
                      <div className="fw-semibold">
                        Total: <span className={splitValid ? "" : "text-danger"}>₹{splitTotal.toFixed(2)}</span>
                        {!splitValid && splitRemaining > 0.01 && <span className="text-danger ms-1 small">₹{splitRemaining.toFixed(2)} remaining</span>}
                        {!splitValid && splitRemaining < -0.01 && <span className="text-danger ms-1 small">₹{Math.abs(splitRemaining).toFixed(2)} excess</span>}
                        {splitValid && <span className="text-success ms-1">✓</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Print toggle */}
              {!isPaymentFrozen && (
                <div className="pay-print-check">
                  <input type="checkbox" id="printToggle" checked={printAfterPayment} onChange={(e) => setPrintAfterPayment(e.target.checked)} />
                  <label htmlFor="printToggle">Print receipt after payment</label>
                </div>
              )}
            </div>
          )}

        </div>{/* end body */}

        {/* ── FOOTER ── */}
        {apptStatus === "NEW" && (
          <div className="appt-drawer-footer" style={{ marginTop: "8px" }}>
            <Button variant="dark" fullWidth onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Appointment"}
            </Button>
          </div>
        )}

        {apptStatus === "UNPAID" && !isPaid && (
          <div className="appt-drawer-footer" style={{ marginTop: "8px" }}>
            {cancelDeleteError && (
              <div className="alert alert-danger small py-2 w-100 mb-2" style={{ borderRadius: "6px" }}>{cancelDeleteError}</div>
            )}
            {!showPaymentSection ? (
              <>
                {isEditing ? (
                  <Button variant="dark" fullWidth onClick={handleSave}>Update Appointment</Button>
                ) : (
                  <Button variant="outline-secondary" fullWidth onClick={() => { setIsEditing(true); setShowDotMenu(false); }}><PencilFill size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />Update Appointment</Button>
                )}
                <Button fullWidth onClick={handleContinueToPayment} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", fontWeight: 700, boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
                  <CreditCard2Front size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Continue to Payment
                </Button>
              </>
            ) : (
              <>
                {isEditing ? (
                  <Button variant="dark" fullWidth onClick={handleSave}>Update Appointment</Button>
                ) : (
                  <Button variant="outline-secondary" fullWidth onClick={() => { setIsEditing(true); setShowDotMenu(false); }}><PencilFill size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />Update Appointment</Button>
                )}
                <PaymentButton
                  amount={paymentMode === "split" && splitTotal > 0 && splitTotal < remainingDue ? splitTotal : remainingDue}
                  isPartial={paymentMode === "split" && splitTotal > 0 && splitTotal < remainingDue}
                  disabled={(!existingBooking && !apiAppointmentId)}
                  label={
                    (!existingBooking && !apiAppointmentId)
                      ? <><ArrowRepeat size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Creating Booking...</>
                      : paymentMode === "split" && splitTotal > 0 && splitTotal < remainingDue
                        ? <><RecordCircle size={13} style={{ marginRight: 4, verticalAlign: "middle", color: "#7c3aed" }} />Confirm Partial — ₹{splitTotal.toFixed(2)} (₹{(remainingDue - splitTotal).toFixed(2)} due)</>
                        : <><CheckCircleFill size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Confirm &amp; Pay — ₹{remainingDue.toFixed(2)}</>
                  }
                  onClick={handleCompletePayment}
                />
              </>
            )}
          </div>
        )}

        {existingBooking && isEditing && apptStatus !== "UNPAID" && (
          <div className="appt-drawer-footer appt-drawer-footer--three-col">
            {/* Left: Cancel */}
            <Button variant="outline-secondary" onClick={() => { setIsEditing(false); setValidationErrors([]); }}>Cancel</Button>

            {/* Center: Payment summary */}
            {alreadyPaidAmount > 0 && effectiveTotal > alreadyPaidAmount ? (
              <div className="appt-drawer-footer__summary">
                Paid: ₹{alreadyPaidAmount.toFixed(2)} &nbsp;|&nbsp; Due: ₹{Math.max(0, effectiveTotal - alreadyPaidAmount).toFixed(2)}
              </div>
            ) : (
              <div className="appt-drawer-footer__summary" />
            )}

            {/* Right: Pay Balance */}
            <PaymentButton
              amount={Math.max(0, effectiveTotal - alreadyPaidAmount)}
              fullWidth={false}
              label={<><CheckCircleFill size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Pay Balance — ₹{Math.max(0, effectiveTotal - alreadyPaidAmount).toFixed(2)}</>}
              onClick={handleCompletePayment}
            />
          </div>
        )}

        {isPaid && !isEditing && (
          <div className="appt-drawer-footer" style={{ marginTop: "8px", justifyContent: "center", flexDirection: "column", gap: 8 }}>
            <div className="text-success fw-bold p-2 d-flex align-items-center justify-content-center w-100" style={{ background: "#f0fdf4", border: "1px solid #10b981", borderRadius: "8px", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Payment already completed
            </div>


          </div>
        )}

        {apptStatus === "CANCELLED" && !isEditing && (
          <div className="appt-drawer-footer" style={{ marginTop: "8px", justifyContent: "center" }}>
            {cancelDeleteError && (
              <div className="alert alert-danger small py-2 w-100 mb-2" style={{ borderRadius: "6px" }}>{cancelDeleteError}</div>
            )}
            <div className="fw-bold p-2 d-flex align-items-center justify-content-center w-100" style={{ background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", gap: "8px", color: "#dc2626" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              Appointment Cancelled
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }} onClick={(e) => e.target === e.currentTarget && !isDeleteLoading && setShowDeleteConfirmation(false)}>
            <div style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "400px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
            }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#1f2937" }}>Delete Appointment?</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
                  This action will permanently remove the appointment from the database. This cannot be undone.
                </p>
              </div>
              {isPaid && (
                <div style={{ marginBottom: "16px", padding: "10px 12px", background: "#fff7ed", border: "1px solid #f97316", borderRadius: "6px", fontSize: "13px", color: "#9a3412", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <ExclamationTriangleFill size={16} style={{ flexShrink: 0, color: "#f97316" }} />
                  <span>This appointment has already been paid. Deleting it will <strong>not</strong> process a refund automatically.</span>
                </div>
              )}
              {cancelDeleteError && (
                <div className="alert alert-danger small py-2" style={{ marginBottom: "16px" }}>
                  {cancelDeleteError}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={isDeleteLoading}
                  style={{ minWidth: "120px" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAppointment}
                  disabled={isDeleteLoading}
                  style={{ minWidth: "120px" }}
                >
                  {isDeleteLoading ? <><ArrowRepeat size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Deleting...</> : <><Trash size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />Delete</>}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NewAppointmentModal;