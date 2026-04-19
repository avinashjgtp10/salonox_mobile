import React, { useState, useRef, useEffect } from "react";
import type { Booking, ServiceItem, PackageItem, PaymentMode, DiscountType } from "../../types/scheduler-types";
import { CLIENT_LIST, CLIENT_STATS, REWARD_POINTS_OPTIONS, COUPON_CODES, STAFF_LIST, PACKAGES_LIST } from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { computePointsEarned, computeEWalletCredit, EWALLET_REDEEM_MINIMUM, MEMBERSHIP_TIERS } from "../../../../store/schedulerSlice";
import { addMinutes } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import ServiceRow from "./ServiceRow";
import TotalsPanel from "./TotalsPanel";
import Button from "../../../../components/ui/Button";
import Badge from "../../../../components/ui/Badge";
import Input from "../../../../components/ui/Input";
import "../../styles/NewAppointmentModal.scss";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Props { onClose: () => void; defaultStaffId?: string; defaultTime?: string; existingBooking?: Booking }
type TempService    = ServiceItem & { tempId: string };
type TempPkg        = PackageItem & { tempId: string; search: string; showDrop: boolean };
type TempProduct    = { tempId: string; id: string; productName: string; price: number; qty: number; total: number; search: string; showDrop: boolean };
type TempMembership = { tempId: string; name: string; duration: string; price: number; qty: number; total: number; search: string; showDrop: boolean };
type SingleMethod   = "Cash" | "Card" | "UPI";
type SplitEntry     = { method: SingleMethod; amount: string };
type ApptStatus     = "NEW" | "UNPAID" | "PAID";

const SINGLE_METHODS: SingleMethod[] = ["Cash", "Card", "UPI"];
const DURATIONS = ["1 Month", "3 Months", "6 Months", "1 Year"];
const PRODUCTS_LIST = [
  { name: "Argan Shampoo", price: 450 }, { name: "Keratin Mask", price: 750 },
  { name: "Hair Serum", price: 600 },    { name: "Nail Polish Set", price: 350 },
  { name: "Body Lotion", price: 500 },   { name: "Face Cream", price: 800 },
];
const MEMBERSHIPS_LIST = [
  { name: "Silver Membership", price: 2000 }, { name: "Gold Membership", price: 5000 },
  { name: "Platinum Membership", price: 10000 }, { name: "Bridal Club", price: 15000 },
];
const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" }, { code: "+1",  label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" }, { code: "+61", label: "🇦🇺 +61" },
  { code: "+971",label: "🇦🇪 +971"},
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getMembershipLabel(r: number) {
  if (r >= MEMBERSHIP_TIERS.Platinum) return "Platinum";
  if (r >= MEMBERSHIP_TIERS.Gold)     return "Gold";
  if (r >= MEMBERSHIP_TIERS.Silver)   return "Silver";
  return "NA";
}
function getMembershipColor(t: string) {
  if (t === "Platinum") return "#7c3aed";
  if (t === "Gold")     return "#d97706";
  if (t === "Silver")   return "#64748b";
  return "#9ca3af";
}
function getNextTier(rev: number): { name: string; remaining: number } | null {
  if (rev < MEMBERSHIP_TIERS.Silver)   return { name: "Silver",   remaining: MEMBERSHIP_TIERS.Silver   - rev };
  if (rev < MEMBERSHIP_TIERS.Gold)     return { name: "Gold",     remaining: MEMBERSHIP_TIERS.Gold     - rev };
  if (rev < MEMBERSHIP_TIERS.Platinum) return { name: "Platinum", remaining: MEMBERSHIP_TIERS.Platinum - rev };
  return null;
}

function printBill(booking: Booking, paidMethods: Record<string, number>) {
  const staffName = STAFF_LIST.find((s) => s.id === booking.staffId)?.name || "—";
  const methodStr = Object.entries(paidMethods).map(([m, a]) => `${m}: ₹${a.toFixed(2)}`).join(", ");
  const svcRows = booking.services.map((s) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${s.service}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">${s.staff || staffName}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${s.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(s.total || 0).toFixed(2)}</td></tr>`).join("");
  const pkgRows = (booking.packageItems || []).map((p) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${p.packageName} <span style="color:#f59e0b">[PKG]</span></td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">—</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${p.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(p.total || 0).toFixed(2)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><title>Receipt</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#111;max-width:600px;margin:0 auto}</style></head><body><div style="text-align:center;margin-bottom:24px"><div style="font-size:26px;font-weight:800">SalonOx</div><div style="font-size:13px;color:#6b7280">Payment Receipt</div></div><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px"><thead><tr style="background:#1f2937;color:#fff"><th style="padding:9px 10px;text-align:left">Item</th><th style="padding:9px 10px;text-align:left">Staff</th><th style="padding:9px 10px;text-align:center">Qty</th><th style="padding:9px 10px;text-align:right">Amount</th></tr></thead><tbody>${svcRows}${pkgRows}</tbody></table><div style="display:flex;justify-content:flex-end"><div style="width:260px"><div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;border-top:2px solid #1f2937;padding-top:10px">Grand Total<span>₹${(booking.grandTotal || 0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;margin-top:6px;font-weight:600">Payment<span>${methodStr}</span></div><div style="background:#22c55e;color:#fff;text-align:center;padding:6px;border-radius:6px;margin-top:10px;font-weight:700">✓ PAID</div></div></div><div style="text-align:center;margin-top:28px;font-size:11px;color:#9ca3af">Thank you for visiting SalonOx! 🌸</div></body></html>`;
  const win = window.open("", "_blank", "width=700,height=650");
  if (!win) { alert("Please allow popups."); return; }
  win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500);
}

function validateAll(svcRows: TempService[], pkgRows: TempPkg[], prodRows: TempProduct[], memRows: TempMembership[], clientName: string, isWalkin: boolean, selectedClientId: string | null, showAddClientForm: boolean, newClientName: string, newClientPhone: string) {
  const errors: string[] = [];
  if (!clientName.trim() && !isWalkin && !selectedClientId) errors.push("client");
  if (showAddClientForm) {
    if (!newClientName.trim()) errors.push("new_client_name");
    if (!/^\d{10}$/.test(newClientPhone.trim())) errors.push("new_client_phone");
  }
  const hasAnyItem = svcRows.some((r) => r.service) || pkgRows.length > 0 || prodRows.length > 0 || memRows.length > 0;
  if (!hasAnyItem) errors.push("no_rows");
  svcRows.forEach((r, i) => {
    if (!r.service) errors.push(`svc_${i}_service`);
    else if (!r.staffId) errors.push(`svc_${i}_staff`);
    else if (!r.price || r.price <= 0) errors.push(`svc_${i}_price`);
    else if (!r.qty   || r.qty   <= 0) errors.push(`svc_${i}_qty`);
  });
  pkgRows.forEach((r, i) => { if (!r.packageName) errors.push(`pkg_${i}_name`); });
  prodRows.forEach((r, i) => { if (!r.productName) errors.push(`prod_${i}_name`); });
  memRows.forEach((r, i) => { if (!r.name) errors.push(`mem_${i}_name`); });
  return errors;
}

// ─── Inline searchable dropdown ────────────────────────────────────────────────
interface InlineDropItem { label: string; sub?: string; price: number }
const InlineDrop: React.FC<{
  search: string; onSearchChange: (v: string) => void; showDrop: boolean; onFocus: () => void;
  items: InlineDropItem[]; onSelect: (item: InlineDropItem) => void;
  placeholder?: string; dropRef: React.RefObject<HTMLDivElement | null>; disabled?: boolean; hasError?: boolean;
}> = ({ search, onSearchChange, showDrop, onFocus, items, onSelect, placeholder = "Search…", dropRef, disabled, hasError }) => (
  <div ref={dropRef} className="position-relative flex-grow-1">
    <input
      disabled={disabled}
      className={`form-control form-control-sm${hasError ? " is-invalid" : ""}`}
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
              <span className="fw-semibold">{item.label}</span>
              {item.sub && <div className="text-muted" style={{ fontSize: 10 }}>{item.sub}</div>}
            </div>
            <span className="text-muted small">₹{item.price}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const NewAppointmentModal: React.FC<Props> = ({ onClose, defaultStaffId, defaultTime, existingBooking }) => {
  const { addBooking, updateBooking, currentDate, clientStats, deductEWallet, processPaymentRewards } = useSchedulerContext();

  const apptStatus: ApptStatus = !existingBooking ? "NEW" : existingBooking.paymentStatus === "Paid" ? "PAID" : "UNPAID";
  const [isEditing, setIsEditing]               = useState(false);
  const formFrozen = apptStatus === "PAID" && !isEditing;

  // 3-dot menu
  const [showDotMenu, setShowDotMenu]           = useState(false);
  const [paidMethodsSnap, setPaidMethodsSnap]   = useState<Record<string, number>>({});
  const dotMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // Client
  const [clientSearch,      setClientSearch]      = useState(existingBooking?.clientName || "");
  const [selectedClientId,  setSelectedClientId]  = useState<string | null>(existingBooking?.clientId || null);
  const [isWalkin,          setIsWalkin]          = useState(!existingBooking?.clientId && !!existingBooking);
  const [showClientDrop,    setShowClientDrop]    = useState(false);
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [newClientName,     setNewClientName]     = useState("");
  const [newClientPhone,    setNewClientPhone]    = useState("");
  const [newClientGender,   setNewClientGender]   = useState<""|"Female"|"Male"|"Other">("");
  const [countryCode,       setCountryCode]       = useState("+91");

  // Date
  const [calDate, setCalDate] = useState(existingBooking?.billDate || currentDate);
  const [showCal, setShowCal] = useState(false);

  // Rows
  const [serviceRows, setServiceRows] = useState<TempService[]>(
    existingBooking?.services.map((s) => ({ ...s, tempId: "sr_" + s.id })) || [
      { tempId: "sr_" + Date.now(), id: "", service: "", staff: "", staffId: defaultStaffId || "", time: defaultTime || "10:00", price: 0, qty: 0, total: 0 },
    ],
  );
  const [packageRows,    setPackageRows]    = useState<TempPkg[]>(existingBooking?.packageItems?.map((p) => ({ ...p, tempId: "pk_" + p.id, search: p.packageName, showDrop: false })) || []);
  const [productRows,    setProductRows]    = useState<TempProduct[]>(((existingBooking as any)?.productItems || []).map((p: any) => ({ ...p, tempId: p.tempId || "pr_" + Date.now(), search: p.productName || "", showDrop: false })));
  const [membershipRows, setMembershipRows] = useState<TempMembership[]>(((existingBooking as any)?.membershipItems || []).map((m: any) => ({ ...m, tempId: m.tempId || "sub_" + Date.now(), qty: m.qty || 1, total: m.total || m.price || 0, search: m.name || "", showDrop: false })));

  const pkgDropRefs  = useRef(new Map<string, React.RefObject<HTMLDivElement | null>>());
  const prodDropRefs = useRef(new Map<string, React.RefObject<HTMLDivElement | null>>());
  const memDropRefs  = useRef(new Map<string, React.RefObject<HTMLDivElement | null>>());
  const getPkgRef  = (id: string) => { if (!pkgDropRefs.current.has(id))  pkgDropRefs.current.set(id,  React.createRef()); return pkgDropRefs.current.get(id)!; };
  const getProdRef = (id: string) => { if (!prodDropRefs.current.has(id)) prodDropRefs.current.set(id, React.createRef()); return prodDropRefs.current.get(id)!; };
  const getMemRef  = (id: string) => { if (!memDropRefs.current.has(id))  memDropRefs.current.set(id,  React.createRef()); return memDropRefs.current.get(id)!; };
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      setPackageRows(   (rows) => rows.map((r) => { const ref = pkgDropRefs.current.get(r.tempId);  return ref?.current && !ref.current.contains(t) ? { ...r, showDrop: false } : r; }));
      setProductRows(   (rows) => rows.map((r) => { const ref = prodDropRefs.current.get(r.tempId); return ref?.current && !ref.current.contains(t) ? { ...r, showDrop: false } : r; }));
      setMembershipRows((rows) => rows.map((r) => { const ref = memDropRefs.current.get(r.tempId);  return ref?.current && !ref.current.contains(t) ? { ...r, showDrop: false } : r; }));
    };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // Financials
  const [rewardPoints, setRewardPoints] = useState(existingBooking?.rewardPoints || "");
  const [exCharges,    setExCharges]    = useState(existingBooking?.exCharges    || 0);
  const [tip,          setTip]          = useState<number>((existingBooking as any)?.tip || 0);
  const [discount,     setDiscount]     = useState(existingBooking?.discount     || 0);
  const [discountType, setDiscountType] = useState<DiscountType>(existingBooking?.discountType || "Percentage (%)");
  const [gst]                           = useState(existingBooking?.gst          || 0);
  const [notes,        setNotes]        = useState(existingBooking?.notes || "");
  const [staffAlert,   setStaffAlert]   = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const hasErr = (k: string) => validationErrors.includes(k);

  // Payment
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [savedBookingRef,    setSavedBookingRef]    = useState<Booking | null>(null);
  const [paymentMode,  setPaymentMode]  = useState<"single"|"split">("single");
  const [singleMethod, setSingleMethod] = useState<SingleMethod | null>(null);
  const [payMethodError, setPayMethodError] = useState(false);
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([{ method: "Cash", amount: "" }, { method: "Card", amount: "" }]);
  const [couponInput,    setCouponInput]    = useState(existingBooking?.couponCode || "");
  const [couponDiscount, setCouponDiscount] = useState(existingBooking?.couponDiscount || 0);
  const [couponApplied,  setCouponApplied]  = useState(existingBooking?.couponCode || "");
  const [couponError,    setCouponError]    = useState("");
  const [useEWallet, setUseEWallet] = useState(false);
  const [eWalletAmt, setEWalletAmt] = useState(0);
  const [isPaid]     = useState(apptStatus === "PAID");
  const [_earnedPoints,  setEarnedPoints]  = useState(0);
  const [_earnedWallet,  setEarnedWallet]  = useState(0);
  const [_newMembership, setNewMembership] = useState("");
  const [printAfterPayment, setPrintAfterPayment] = useState(false);

  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Derived totals
  const selectedClient  = CLIENT_LIST.find((c) => c.id === selectedClientId);
  const selectedStats   = (CLIENT_STATS as any[])?.find?.((c: any) => c.clientId === selectedClientId);
  const filteredClients = CLIENT_LIST.filter((c) => clientSearch.length >= 2 && (c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)));
  const serviceTotal    = serviceRows.reduce((a, r)    => a + (r.total || 0), 0);
  const packageTotal    = packageRows.reduce((a, r)    => a + (r.total || 0), 0);
  const productTotal    = productRows.reduce((a, r)    => a + (r.total || 0), 0);
  const membershipTotal = membershipRows.reduce((a, r) => a + (r.total || r.price || 0), 0);
  const subtotal        = serviceTotal + packageTotal + productTotal + membershipTotal;
  const discountVal     = discountType === "Percentage (%)" ? (subtotal * discount) / 100 : discount;
  const totalDisc       = Math.min(discountVal + couponDiscount, subtotal);
  const taxable         = Math.max(0, subtotal - totalDisc);
  const grandTotal      = taxable + (taxable * gst) / 100 + exCharges + tip;
  const effectiveTotal  = Math.max(0, grandTotal - (useEWallet ? eWalletAmt : 0));

  // Loyalty
  const clientStat           = clientStats.find((c) => c.clientId === selectedClientId);
  const eWalletBalance       = clientStat?.ewalletAmt       ?? 0;
  const currentRevenue       = clientStat?.totalRevenue      ?? 0;
  const currentPoints        = clientStat?.rewardPointsTotal ?? 0;
  const currentMembership    = clientStat?.membership        ?? "NA";
  const canUseEWallet        = eWalletBalance >= EWALLET_REDEEM_MINIMUM;
  const previewPoints        = computePointsEarned(effectiveTotal);
  const previewWalletCred    = computeEWalletCredit(previewPoints);
  const previewNewRevenue    = currentRevenue + effectiveTotal;
  const previewNewMembership = getMembershipLabel(previewNewRevenue);
  const willUpgrade          = previewNewMembership !== currentMembership && previewNewMembership !== "NA";
  const nextTier             = getNextTier(currentRevenue);

  // Split
  const splitTotal = splitEntries.reduce((a, e) => a + (parseFloat(e.amount) || 0), 0);
  const splitValid = paymentMode === "single" || Math.abs(splitTotal - effectiveTotal) <= 0.01;
  const splitRemaining = effectiveTotal - splitTotal;

  function clearErr(...keys: string[])         { setValidationErrors((prev) => prev.filter((e) => !keys.includes(e))); }
  function clearErrPrefix(prefix: string)      { setValidationErrors((prev) => prev.filter((e) => !e.startsWith(prefix))); }
  function handleServiceRowClearError(tempId: string, field: string) { const idx = serviceRows.findIndex((r) => r.tempId === tempId); if (idx >= 0) clearErr(`svc_${idx}_${field}`); }
  function posNum(val: string, setter: (n: number) => void) { const n = parseFloat(val); setter(isNaN(n) || n < 0 ? 0 : n); }

  function handleWalkinClick() {
    if (formFrozen) return;
    setIsWalkin(true); setSelectedClientId(null); setClientSearch("Walk-In");
    setShowClientDrop(false); setShowAddClientForm(false); clearErr("client");
  }

  function handleSaveNewClient() {
    const nameOk  = newClientName.trim().length > 0;
    const phoneOk = /^\d{10}$/.test(newClientPhone.trim());
    const genderOk = newClientGender !== "";
    const errs: string[] = [];
    if (!nameOk)  errs.push("new_client_name");
    if (!phoneOk) errs.push("new_client_phone");
    if (!genderOk) errs.push("new_client_gender");
    if (errs.length) { setValidationErrors((prev) => [...prev.filter((e) => !e.startsWith("new_client")), ...errs]); return; }
    setClientSearch(newClientName.trim()); setSelectedClientId(null); setIsWalkin(false);
    setShowAddClientForm(false); clearErr("client", "new_client_name", "new_client_phone", "new_client_gender");
    setNewClientName(""); setNewClientPhone(""); setNewClientGender("");
  }

  function updateServiceRow(id: string, field: string, value: string | number | boolean) { setServiceRows((rows) => rows.map((r) => r.tempId !== id ? r : { ...r, [field]: value })); }
  function removeServiceRow(id: string) { setServiceRows((r) => r.filter((x) => x.tempId !== id)); }

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (COUPON_CODES[code] !== undefined) { setCouponDiscount(COUPON_CODES[code]); setCouponApplied(code); setCouponError(""); }
    else { setCouponDiscount(0); setCouponApplied(""); setCouponError("Invalid coupon code"); }
  }

  function handleEWalletToggle(checked: boolean) {
    setUseEWallet(checked);
    setEWalletAmt(checked ? Math.min(eWalletBalance, Math.max(0, grandTotal - couponDiscount)) : 0);
  }

  function resolvedName()  { return isWalkin ? "Walk-In" : selectedClient?.name  || clientSearch || ""; }
  function resolvedPhone() { return isWalkin ? ""         : selectedClient?.phone || existingBooking?.clientPhone || ""; }

  function buildPayload(paying: number, payStatus: "Paid"|"Partial"|"Unpaid"): Booking {
    const firstRow  = serviceRows[0];
    const startTime = firstRow?.time || existingBooking?.startTime || defaultTime || "10:00";
    const endTime   = addMinutes(startTime, 30);
    return {
      ...(existingBooking || {}),
      id:          existingBooking?.id || "b_" + Date.now(),
      clientId:    selectedClientId || undefined,
      clientName:  resolvedName(),
      clientPhone: resolvedPhone(),
      staffId:     firstRow?.staffId || existingBooking?.staffId || STAFF_LIST[0].id,
      date: currentDate, billDate: calDate, startTime, endTime,
      services: serviceRows.filter((r) => r.service).map((r) => ({
        id: r.id || "s_" + r.tempId, service: r.service,
        staff: STAFF_LIST.find((s) => s.id === r.staffId)?.name || r.staff || "",
        staffId: r.staffId, time: r.time, price: r.price, qty: r.qty || 1, total: r.total,
      })),
      groupItems: [],
      packageItems: packageRows.map((r) => ({ id: r.id || "pk_" + r.tempId, packageId: r.packageId, packageName: r.packageName, price: r.price, qty: r.qty, total: r.total })),
      status: payStatus === "Paid" ? "Confirmed" : "Pending",
      paymentStatus: payStatus, paymentMode: (singleMethod || "Cash") as PaymentMode,
      rewardPoints, exCharges, discount, discountType, gst,
      couponCode: couponApplied, couponDiscount, subtotal,
      taxableAmount: taxable, grandTotal: effectiveTotal,
      payingNow: paying, dueAmount: Math.max(0, effectiveTotal - paying),
      notes: notes + (staffAlert ? `\n Staff Alert: ${staffAlert}` : ""),
      tip: tip as any, productItems: productRows as any, membershipItems: membershipRows as any,
    } as any;
  }

  function runValidation() {
    return validateAll(serviceRows, packageRows, productRows, membershipRows, resolvedName(), isWalkin, selectedClientId, showAddClientForm, newClientName, newClientPhone);
  }

  function handleSave() {
    const errors = runValidation();
    if (errors.length) { setValidationErrors(errors); return; }
    setValidationErrors([]);
    const b = buildPayload(0, "Unpaid");
    if (existingBooking) updateBooking(b); else addBooking(b);
    onClose();
  }

  function handleContinueToPayment() {
    const errors = runValidation();
    if (errors.length) { setValidationErrors(errors); return; }
    setValidationErrors([]);
    const b = buildPayload(0, "Unpaid");
    if (existingBooking) updateBooking(b); else addBooking(b);
    setSavedBookingRef(b);
    setShowPaymentSection(true);
    setTimeout(() => paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function handleCompletePayment() {
    if (paymentMode === "single" && !singleMethod) { setPayMethodError(true); return; }
    setPayMethodError(false);
    const methods: Record<string, number> = {};
    if (useEWallet && eWalletAmt > 0) methods["eWallet"] = eWalletAmt;
    if (paymentMode === "split") {
      splitEntries.forEach((e) => { const a = parseFloat(e.amount) || 0; if (a > 0) methods[e.method] = (methods[e.method] || 0) + a; });
    } else { methods[singleMethod!] = effectiveTotal; }
    const totalPaid  = Object.values(methods).reduce((a, b) => a + b, 0);
    const payStatus: "Paid"|"Partial" = totalPaid >= effectiveTotal ? "Paid" : "Partial";
    const updated    = buildPayload(totalPaid, payStatus);
    updateBooking(updated);
    if (useEWallet && eWalletAmt > 0 && selectedClientId) deductEWallet(selectedClientId, eWalletAmt);
    if (selectedClientId && effectiveTotal > 0) {
      const pts = computePointsEarned(effectiveTotal);
      const wc  = computeEWalletCredit(pts);
      const nt  = getMembershipLabel(currentRevenue + effectiveTotal);
      setEarnedPoints(pts); setEarnedWallet(wc); // stored for future post-payment summary
      setNewMembership(nt !== currentMembership ? nt : "");
      processPaymentRewards(selectedClientId, effectiveTotal);
    }
    setPaidMethodsSnap(methods);
    setSavedBookingRef(updated);
    if (printAfterPayment) printBill(updated, methods);
    onClose();
  }

  const phoneValid = (p: string) => /^\d{10}$/.test(p.trim());

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="appt-drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="appt-drawer-content">

        {/* HEADER */}
        <div className="appt-drawer-header d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
          <button className="btn-close-drawer btn btn-sm btn-link text-dark text-decoration-none fs-5 p-0" onClick={onClose}>✕</button>
          <h5 className="mb-0 fw-bold flex-grow-1" style={{ minWidth: 0 }}>
            {apptStatus === "NEW" ? "New Appointment" : isPaid && !isEditing ? "View Appointment" : "Edit Appointment"}
          </h5>
          {existingBooking && (
            <Badge variant="primary" className="text-truncate" style={{ maxWidth: 90, fontSize: 11 }}>#{existingBooking.id.slice(-8)}</Badge>
          )}
          {isPaid && (
            <Badge variant="success">✓ Paid</Badge>
          )}
          {isPaid && (
            <div ref={dotMenuRef} className="position-relative flex-shrink-0">
              <button onClick={() => setShowDotMenu((v) => !v)}
                className={`btn btn-sm ${showDotMenu ? "btn-light" : "btn-outline-secondary"}`}
                style={{ width: 32, height: 32, fontSize: 20, lineHeight: 1 }} title="Actions">⋮</button>
              {showDotMenu && (
                <div className="dropdown-menu show end-0" style={{ minWidth: 200, zIndex: 9999, position: "absolute" }}>
                  <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => { setIsEditing(true); setShowDotMenu(false); }}>✏️ Edit Appointment</button>
                  <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => { printBill((savedBookingRef || existingBooking)!, paidMethodsSnap); setShowDotMenu(false); }}>🖨️ Print Receipt</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* EDITING BANNER */}
        {isEditing && (
          <div className="d-flex align-items-center gap-2 px-3 py-2 bg-primary bg-opacity-10 border-bottom border-primary border-opacity-25 small text-primary">
            <span>✏️</span>
            <span>Editing mode — make changes then save.</span>
            <button onClick={() => setIsEditing(false)} className="btn btn-sm btn-link text-secondary ms-auto p-0 text-decoration-none fw-bold">Cancel Editing</button>
          </div>
        )}

        {/* BODY */}
        <div className="appt-drawer-body" style={{ pointerEvents: formFrozen ? "none" : "auto", userSelect: formFrozen ? "none" : "auto" }}>

          {/* ── CLIENT ── */}
          <div className="appt-section">
            <div className="appt-section__title">👤 Client</div>
            <div className="d-flex flex-wrap gap-2 align-items-start">
              <div className="position-relative flex-grow-1" style={{ minWidth: 200 }}>
                <input
                  className={`form-control form-control-sm${hasErr("client") ? " is-invalid" : ""}`}
                  placeholder="Search by Name / Phone (min 2 chars)"
                  value={clientSearch}
                  disabled={formFrozen}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDrop(true); setIsWalkin(false); setSelectedClientId(null); setShowAddClientForm(false); if (e.target.value.trim()) clearErr("client"); }}
                  onFocus={() => clientSearch.length >= 2 && setShowClientDrop(true)}
                />
                {hasErr("client") && <div className="invalid-feedback d-block">Please select a client or choose Walk-In</div>}
                {showClientDrop && filteredClients.length > 0 && !formFrozen && (
                  <div className="dropdown-menu show w-100 p-0" style={{ zIndex: 200 }}>
                    {filteredClients.map((c) => (
                      <button key={c.id} className="dropdown-item" onClick={() => { setSelectedClientId(c.id); setClientSearch(c.name); setShowClientDrop(false); setIsWalkin(false); setShowAddClientForm(false); clearErr("client"); }}>
                        <div className="fw-semibold small">{c.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{c.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button variant={isWalkin ? "dark" : "outline-secondary"} size="sm" onClick={handleWalkinClick} disabled={formFrozen}>
                {isWalkin ? "✓ Walk-In" : "Walk-In"}
              </Button>
              <Button variant="outline-secondary" size="sm" disabled={formFrozen} onClick={() => { setShowAddClientForm((v) => !v); setShowClientDrop(false); }}>
                {showAddClientForm ? "✕ Cancel" : "+ Add Client"}
              </Button>
              <div className="position-relative">
                <input readOnly={formFrozen} value={calDate} onClick={() => !formFrozen && setShowCal((v) => !v)}
                  className="form-control form-control-sm" style={{ cursor: formFrozen ? "not-allowed" : "pointer", width: 120 }} />
                {showCal && !formFrozen && (
                  <div className="position-absolute" style={{ top: "100%", right: 0, zIndex: 400 }}>
                    <MiniCalendar value={calDate} onChange={(d: string) => { setCalDate(d); setShowCal(false); }} onClose={() => setShowCal(false)} />
                  </div>
                )}
              </div>
            </div>

            {/* ADD CLIENT FORM */}
            {showAddClientForm && !formFrozen && (
              <div className="card border rounded-3 p-3 mt-3">
                <div className="row g-2">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: 13 }}>Full Name *</label>
                    <input
                      className={`form-control form-control-sm${hasErr("new_client_name") ? " is-invalid" : ""}`}
                      placeholder="e.g. Priya Sharma" value={newClientName}
                      onChange={(e) => { setNewClientName(e.target.value); if (e.target.value.trim()) clearErr("new_client_name"); }}
                    />
                    {hasErr("new_client_name") && <div className="invalid-feedback d-block" style={{ fontSize: 11 }}>Full name is required</div>}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: 13 }}>Mobile Number *</label>
                    <div className="input-group input-group-sm">
                      <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="form-select" style={{ maxWidth: 100, flexShrink: 0 }}>
                        {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                      <input
                        className={`form-control${hasErr("new_client_phone") ? " is-invalid" : ""}`}
                        placeholder="10-digit number" value={newClientPhone} maxLength={10}
                        onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 10); setNewClientPhone(val); if (phoneValid(val)) clearErr("new_client_phone"); }}
                      />
                      {hasErr("new_client_phone") && <div className="invalid-feedback">{newClientPhone.length === 0 ? "Required" : "Must be 10 digits"}</div>}
                    </div>
                    {hasErr("new_client_phone") && <div className="text-danger d-block" style={{ fontSize: 11, marginTop: 2 }}>{newClientPhone.length === 0 ? "Required" : "Must be 10 digits"}</div>}
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: 13 }}>Gender *</label>
                    <select className={`form-select form-select-sm${hasErr("new_client_gender") ? " is-invalid" : ""}`} value={newClientGender}
                      onChange={(e) => { setNewClientGender(e.target.value as "Female" | "Male" | "Other"); clearErr("new_client_gender"); }}>
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                    {hasErr("new_client_gender") && <div className="text-danger d-block" style={{ fontSize: 11, marginTop: 2 }}>Required</div>}
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold mb-1 invisible" style={{ fontSize: 13 }}>_</label>
                    <Button variant="dark" size="sm" fullWidth onClick={handleSaveNewClient}>Save Client</Button>
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
                    <Badge variant="warning">⭐ {selectedStats.membership}</Badge>
                  )}
                </div>
                <div className="client-stats-panel__grid">
                  {([
                    ["Reward Points", selectedStats.rewardPoints, ""],
                    ["Ewallet Amt",   `₹${selectedStats.ewalletAmt}`, ""],
                    ["Unpaid Amt",    `₹${selectedStats.unpaidAmt}`, selectedStats.unpaidAmt > 0 ? "danger" : ""],
                    ["Assign Discount", `${selectedStats.assignDiscount}%`, ""],
                    ["Disc. Validity", selectedStats.discountValidity, ""],
                    ["Membership",    selectedStats.membership, ""],
                    ["Cancelled",     selectedStats.cancelled, selectedStats.cancelled > 0 ? "danger" : ""],
                    ["Total Visits",  selectedStats.totalVisit, ""],
                    ["Last Visit",    selectedStats.lastVisit, ""],
                    ["Total Revenue", `₹${selectedStats.totalRevenue?.toLocaleString()}`, "info"],
                    ["View History",  "Click Here", "link"],
                  ] as [string, string|number, string][]).map(([l, v, c]) => (
                    <div key={l} className={`info-cell ${c}`}>
                      <span className="info-cell__label">{l}</span>
                      <span className="info-cell__value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── SERVICES & ITEMS ── */}
          <div className="appt-section">
            <div className="appt-section__title">✂️ Services &amp; Items</div>
            {hasErr("no_rows") && <div className="alert alert-danger py-2 small">Add at least one service, package, product or membership before saving.</div>}

            <div className="table-header table-header--services">
              <div>SERVICE</div><div>STAFF</div><div>TIME</div><div>PRICE</div><div>QTY</div><div>TOTAL</div><div />
            </div>
            {serviceRows.map((row, i) => (
              <ServiceRow key={row.tempId} row={row} onChange={updateServiceRow} onRemove={removeServiceRow} onClearError={handleServiceRowClearError}
                hasError={hasErr(`svc_${i}_service`) || hasErr(`svc_${i}_staff`) || hasErr(`svc_${i}_price`) || hasErr(`svc_${i}_qty`)}
                errorFields={{ service: hasErr(`svc_${i}_service`), staff: hasErr(`svc_${i}_staff`), price: hasErr(`svc_${i}_price`), qty: hasErr(`svc_${i}_qty`) }} />
            ))}

            {/* Package rows */}
            {packageRows.length > 0 && (<>
              <div className="table-header table-header--packages"><div>PACKAGE</div><div>PRICE</div><div>QTY</div><div>TOTAL</div><div /></div>
              {packageRows.map((row, i) => {
                const filtered = PACKAGES_LIST.filter((p) => p.name.toLowerCase().includes(row.search.toLowerCase()));
                const hasRowErr = hasErr(`pkg_${i}_name`);
                return (
                  <div key={row.tempId} className="item-row-grid item-row-grid--pkg border-bottom">
                    <InlineDrop dropRef={getPkgRef(row.tempId)} search={row.search} showDrop={row.showDrop} placeholder="Search package…" disabled={formFrozen} hasError={hasRowErr}
                      onFocus={() => setPackageRows((r) => r.map((x) => ({ ...x, showDrop: x.tempId === row.tempId })))}
                      onSearchChange={(v) => setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, search: v, showDrop: true } : x))}
                      items={filtered.map((p) => ({ label: p.name, sub: p.services.join(", "), price: p.price }))}
                      onSelect={(item) => { const pkg = PACKAGES_LIST.find((p) => p.name === item.label)!; setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, packageId: pkg.id, packageName: pkg.name, price: pkg.price, qty: x.qty || 1, total: pkg.price * (x.qty || 1), search: pkg.name, showDrop: false } : x)); clearErrPrefix(`pkg_${i}_`); }} />
                    <input readOnly value={`₹${row.price}`} className="form-control form-control-sm bg-white" />
                    <input type="text" inputMode="numeric" min={1} value={row.qty} disabled={formFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const qty = Math.max(1, parseInt(e.target.value) || 1); setPackageRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty, total: x.price * qty } : x)); }} />
                    <input readOnly value={(row.price * (row.qty || 1)).toFixed(2)} className="form-control form-control-sm bg-light fw-semibold" />
                    {!formFrozen && <button onClick={() => { setPackageRows((r) => r.filter((x) => x.tempId !== row.tempId)); clearErrPrefix(`pkg_${i}_`); }} className="btn btn-sm btn-link text-danger p-0" style={{ fontSize: 16 }}>🗑</button>}
                    {hasRowErr && <div className="text-danger col-span-all" style={{ fontSize: 10 }}>Please select a package</div>}
                  </div>
                );
              })}
            </>)}

            {/* Product rows */}
            {productRows.length > 0 && (<>
              <div className="table-header table-header--products"><div>PRODUCT</div><div>PRICE</div><div>QTY</div><div>TOTAL</div><div /></div>
              {productRows.map((row, i) => {
                const filtered = PRODUCTS_LIST.filter((p) => p.name.toLowerCase().includes(row.search.toLowerCase()));
                const hasRowErr = hasErr(`prod_${i}_name`);
                return (
                  <div key={row.tempId} className="item-row-grid item-row-grid--prod border-bottom">
                    <InlineDrop dropRef={getProdRef(row.tempId)} search={row.search} showDrop={row.showDrop} placeholder="Search product…" disabled={formFrozen} hasError={hasRowErr}
                      onFocus={() => setProductRows((r) => r.map((x) => ({ ...x, showDrop: x.tempId === row.tempId })))}
                      onSearchChange={(v) => setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, search: v, showDrop: true } : x))}
                      items={filtered.map((p) => ({ label: p.name, price: p.price }))}
                      onSelect={(item) => { const prod = PRODUCTS_LIST.find((p) => p.name === item.label)!; setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, productName: prod.name, price: prod.price, total: prod.price * (x.qty || 1), search: prod.name, showDrop: false } : x)); clearErrPrefix(`prod_${i}_`); }} />
                    <input readOnly value={`₹${row.price}`} className="form-control form-control-sm bg-white" />
                    <input type="text" inputMode="numeric" min={1} value={row.qty} disabled={formFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const qty = Math.max(1, parseInt(e.target.value) || 1); setProductRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty, total: x.price * qty } : x)); }} />
                    <input readOnly value={(row.price * (row.qty || 1)).toFixed(2)} className="form-control form-control-sm bg-light fw-semibold" />
                    {!formFrozen && <button onClick={() => { setProductRows((r) => r.filter((x) => x.tempId !== row.tempId)); clearErrPrefix(`prod_${i}_`); }} className="btn btn-sm btn-link text-danger p-0" style={{ fontSize: 16 }}>🗑</button>}
                    {hasRowErr && <div className="text-danger col-span-all" style={{ fontSize: 10 }}>Please select a product</div>}
                  </div>
                );
              })}
            </>)}

            {/* Membership rows */}
            {membershipRows.length > 0 && (<>
              <div className="table-header table-header--membership"><div>MEMBERSHIP</div><div>DURATION</div><div>PRICE</div><div>QTY</div><div>TOTAL</div><div /></div>
              {membershipRows.map((row, i) => {
                const filtered = MEMBERSHIPS_LIST.filter((m) => m.name.toLowerCase().includes(row.search.toLowerCase()));
                const hasRowErr = hasErr(`mem_${i}_name`);
                return (
                  <div key={row.tempId} className="item-row-grid item-row-grid--mem border-bottom">
                    <InlineDrop dropRef={getMemRef(row.tempId)} search={row.search} showDrop={row.showDrop} placeholder="Search membership…" disabled={formFrozen} hasError={hasRowErr}
                      onFocus={() => setMembershipRows((r) => r.map((x) => ({ ...x, showDrop: x.tempId === row.tempId })))}
                      onSearchChange={(v) => setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, search: v, showDrop: true } : x))}
                      items={filtered.map((m) => ({ label: m.name, price: m.price }))}
                      onSelect={(item) => { const mem = MEMBERSHIPS_LIST.find((m) => m.name === item.label)!; setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, name: mem.name, price: mem.price, qty: x.qty || 1, total: mem.price * (x.qty || 1), search: mem.name, showDrop: false } : x)); clearErrPrefix(`mem_${i}_`); }} />
                    <select value={row.duration} disabled={formFrozen} className="form-select form-select-sm"
                      onChange={(e) => setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, duration: e.target.value } : x))}>
                      {DURATIONS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <input readOnly value={`₹${row.price}`} className="form-control form-control-sm bg-white" />
                    <input type="text" inputMode="numeric" min={1} value={row.qty || 1} disabled={formFrozen} className="form-control form-control-sm"
                      onChange={(e) => { const qty = Math.max(1, parseInt(e.target.value) || 1); setMembershipRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, qty, total: x.price * qty } : x)); }} />
                    <input readOnly value={(row.price * (row.qty || 1)).toFixed(2)} className="form-control form-control-sm bg-light fw-semibold" />
                    {!formFrozen && <button onClick={() => { setMembershipRows((r) => r.filter((x) => x.tempId !== row.tempId)); clearErrPrefix(`mem_${i}_`); }} className="btn btn-sm btn-link text-danger p-0" style={{ fontSize: 16 }}>🗑</button>}
                    {hasRowErr && <div className="text-danger col-span-all" style={{ fontSize: 10 }}>Please select a membership</div>}
                  </div>
                );
              })}
            </>)}

            {/* Add buttons */}
            {!formFrozen && (
              <div className="appt-add-actions d-flex flex-wrap gap-2 mt-2">
                <Button variant="dark" size="sm" onClick={() => setServiceRows((r) => [...r, { tempId: "sr_"+Date.now(), id: "", service: "", staff: "", staffId: defaultStaffId||"", time: defaultTime||"10:00", price: 0, qty: 0, total: 0 }])}>+ Service</Button>
                <Button variant="dark" size="sm" onClick={() => setPackageRows((r) => [...r, { tempId: "pk_"+Date.now(), id: "", packageId: "", packageName: "", price: 0, qty: 1, total: 0, search: "", showDrop: true }])}>+ Package</Button>
                <Button variant="dark" size="sm" onClick={() => setProductRows((r) => [...r, { tempId: "pr_"+Date.now(), id: "", productName: "", price: 0, qty: 1, total: 0, search: "", showDrop: true }])}>+ Product</Button>
                <Button variant="dark" size="sm" onClick={() => setMembershipRows((r) => [...r, { tempId: "sub_"+Date.now(), name: "", duration: "1 Month", price: 0, qty: 1, total: 0, search: "", showDrop: true }])}>+ Membership</Button>
              </div>
            )}
          </div>

          {/* ── CHARGES & DISCOUNTS ── */}
          <div className="appt-section">
            <div className="appt-section__title">⚡ Charges &amp; Discounts</div>
            <div className="row g-3">
              <div className="col">
                <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Reward Points</label>
                <select className="form-select form-select-sm" value={rewardPoints} disabled={formFrozen} onChange={(e) => setRewardPoints(e.target.value)}>
                  {REWARD_POINTS_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="col">
                <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Ex Charges</label>
                <input type="text" inputMode="numeric" className="form-control form-control-sm" value={exCharges||""} placeholder="0" disabled={formFrozen} onChange={(e) => posNum(e.target.value.replace(/[^0-9.]/g,""), setExCharges)} />
              </div>
              <div className="col">
                <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Tip</label>
                <input type="text" inputMode="numeric" className="form-control form-control-sm" value={tip||""} placeholder="0" disabled={formFrozen} onChange={(e) => posNum(e.target.value.replace(/[^0-9.]/g,""), setTip)} />
              </div>
              <div className="col">
                <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Discount</label>
                <input type="text" inputMode="numeric" className="form-control form-control-sm" value={discount||""} placeholder="0" disabled={formFrozen} onChange={(e) => posNum(e.target.value.replace(/[^0-9.]/g,""), setDiscount)} />
              </div>
              <div className="col">
                <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Discount Type</label>
                <select className="form-select form-select-sm" value={discountType} disabled={formFrozen} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                  <option>Percentage (%)</option><option>Flat (₹)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── PAYMENT & NOTES ── */}
          <div className="appt-section">
            <div className="appt-section__title">📋 Payment &amp; Notes</div>
            <div className="row g-3">
              <div className="col-md-8">
                <div className="row g-3">
                  <div className="col-12">
                    <Input label="🔔 Staff Alert" placeholder="e.g. Client has allergy to chemicals" value={staffAlert} disabled={formFrozen}
                      onChange={(e) => setStaffAlert((e.target as HTMLInputElement).value)} />
                  </div>
                  <div className="col-12">
                    <Input label="Notes" multiline rows={2} placeholder="Enter appointment notes" value={notes} disabled={formFrozen}
                      onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)} />
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <TotalsPanel subtotal={subtotal} serviceTotal={serviceTotal} packageTotal={packageTotal} productTotal={productTotal} membershipTotal={membershipTotal} exCharges={exCharges} discount={discount} discountType={discountType} tip={tip} />
              </div>
            </div>
          </div>

          {/* ── PAYMENT SECTION ── */}
          {showPaymentSection && apptStatus !== "PAID" && !formFrozen && (
            <div ref={paymentSectionRef} className="appt-section" style={{ borderColor: "#d1fae5", background: "#f0fdf4" }}>
              <div className="appt-section__title" style={{ color: "#065f46" }}>💳 Confirm &amp; Pay</div>

              {/* Loyalty bar */}
              {clientStat && (
                <div className="d-flex border rounded-3 overflow-hidden mb-3 bg-white">
                  {[
                    { label: "Membership", value: currentMembership === "NA" ? "—" : `⭐ ${currentMembership}`, color: getMembershipColor(currentMembership) },
                    { label: "Points",     value: `${currentPoints} pts`,         color: "#111827" },
                    { label: "eWallet",    value: `₹${eWalletBalance.toFixed(2)}`, color: "#111827" },
                    ...(nextTier ? [{ label: `→ ${nextTier.name}`, value: `₹${nextTier.remaining.toLocaleString()} more`, color: "#6b7280" }] : []),
                  ].map((item, i, arr) => (
                    <div key={item.label} className={`flex-fill d-flex flex-column align-items-center py-2 px-1${i < arr.length - 1 ? " border-end" : ""}`}>
                      <span className="text-uppercase fw-bold text-muted mb-1" style={{ fontSize: 9, letterSpacing: "0.04em" }}>{item.label}</span>
                      <span className="fw-bold" style={{ fontSize: 12, color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bill preview */}
              <div className="card border rounded-3 overflow-hidden mb-3">
                {serviceRows.filter((s) => s.service).map((s) => (
                  <div key={s.tempId} className="d-flex justify-content-between px-3 py-2 border-bottom small">
                    <span>{s.service}{s.qty > 1 && <span className="text-muted"> ×{s.qty}</span>}<span className="text-muted fst-italic"> · {STAFF_LIST.find((st) => st.id === s.staffId)?.name}</span></span>
                    <span className="fw-semibold">₹{(s.total||0).toFixed(2)}</span>
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
                    <span>Discount</span><span className="fw-semibold">−₹{totalDisc.toFixed(2)}</span>
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
                <div className="alert alert-warning py-2 px-3 mb-3 small">
                  🎁 Earn <strong>{previewPoints} pts</strong> → ₹{previewWalletCred.toFixed(2)} eWallet credit
                  {willUpgrade && <span className="fw-bold ms-1" style={{ color: getMembershipColor(previewNewMembership) }}>· Upgrades to {previewNewMembership}!</span>}
                </div>
              )}

              {/* Coupon */}
              <div className="mb-3">
                <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Coupon Code</label>
                <div className="input-group input-group-sm">
                  <input className="form-control" placeholder="SAVE10, FLAT50, NEW20" value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()} />
                  <Button variant="dark" size="sm" onClick={handleApplyCoupon}>Apply</Button>
                </div>
                {couponApplied && <div className="text-success small mt-1 fw-semibold">✓ "{couponApplied}" applied — ₹{couponDiscount} off</div>}
                {couponError  && <div className="text-danger small mt-1">{couponError}</div>}
              </div>

              {/* eWallet */}
              {eWalletBalance > 0 && (
                <div className={`rounded-3 p-3 border mb-3 ${canUseEWallet ? "border-primary bg-light" : "bg-light"}`}>
                  {canUseEWallet ? (
                    <>
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="ew" checked={useEWallet} onChange={(e) => handleEWalletToggle(e.target.checked)} />
                        <label className="form-check-label fw-semibold text-primary" htmlFor="ew">Use eWallet (Available: ₹{eWalletBalance.toFixed(2)})</label>
                      </div>
                      {useEWallet && <div className="text-primary small mt-1 fw-semibold">✓ Applying ₹{eWalletAmt.toFixed(2)} from eWallet</div>}
                    </>
                  ) : (
                    <div className="small text-muted">🔒 eWallet: ₹{eWalletBalance.toFixed(2)} — Redeemable at ₹{EWALLET_REDEEM_MINIMUM}</div>
                  )}
                </div>
              )}

              {/* Payment method */}
              <div className="mb-3">
                <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>
                  Payment Method <span className="text-danger">*</span>
                </label>
                <div className="d-flex gap-2 mb-3">
                  {(["single","split"] as const).map((mode) => (
                    <button key={mode} onClick={() => { setPaymentMode(mode); setPayMethodError(false); }} className={`btn btn-sm ${paymentMode === mode ? "btn-dark" : "btn-outline-secondary"}`}>
                      {mode === "single" ? "Single" : "Split"}
                    </button>
                  ))}
                </div>
                {paymentMode === "single" ? (
                  <>
                    <div className="d-flex flex-wrap gap-2">
                      {SINGLE_METHODS.map((m) => (
                        <button key={m} onClick={() => { setSingleMethod(m); setPayMethodError(false); }}
                          className={`btn btn-sm ${singleMethod === m ? "btn-dark" : "btn-outline-secondary"}${payMethodError ? " border-danger" : ""}`}>
                          {m === "Cash" ? "💵" : m === "Card" ? "💳" : "📱"} {m}
                        </button>
                      ))}
                    </div>
                    {payMethodError && (
                      <div className="text-danger small mt-1 fw-semibold">⚠ Please select a payment method to continue.</div>
                    )}
                  </>
                ) : (
                  <div className="card border rounded-3 p-3">
                    {splitEntries.map((entry, idx) => (
                      <div key={idx} className="d-flex gap-2 align-items-center mb-2">
                        <div className="d-flex gap-1">
                          {SINGLE_METHODS.map((m) => (
                            <button key={m} onClick={() => setSplitEntries((entries) => entries.map((e, i) => i === idx ? { ...e, method: m } : e))}
                              className={`btn btn-sm ${entry.method === m ? "btn-dark" : "btn-outline-secondary"}`} style={{ fontSize: 11 }}>
                              {m === "Cash" ? "💵" : m === "Card" ? "💳" : "📱"} {m}
                            </button>
                          ))}
                        </div>
                        <input type="text" inputMode="numeric" placeholder="₹ Amount" value={entry.amount} className="form-control form-control-sm" style={{ width: 100 }}
                          onChange={(e) => setSplitEntries((entries) => entries.map((en, i) => i === idx ? { ...en, amount: e.target.value.replace(/[^0-9.]/g,"") } : en))} />
                        {splitEntries.length > 2 && (
                          <button onClick={() => setSplitEntries((e) => e.filter((_, i) => i !== idx))} className="btn btn-sm btn-link text-danger p-0">✕</button>
                        )}
                      </div>
                    ))}
                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small">
                      <button onClick={() => setSplitEntries((e) => [...e, { method: "Cash", amount: "" }])} className="btn btn-sm btn-link text-primary p-0 text-decoration-none fw-bold">+ Add Method</button>
                      <div className="fw-semibold">
                        Total: <span className={splitValid ? "" : "text-danger"}>₹{splitTotal.toFixed(2)}</span>
                        {!splitValid && splitRemaining > 0.01  && <span className="text-danger ms-1 small">₹{splitRemaining.toFixed(2)} remaining</span>}
                        {!splitValid && splitRemaining < -0.01 && <span className="text-danger ms-1 small">₹{Math.abs(splitRemaining).toFixed(2)} excess</span>}
                        {splitValid && <span className="text-success ms-1">✓</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Print toggle */}
              <div className="form-check mb-2">
                <input type="checkbox" className="form-check-input" id="printToggle" checked={printAfterPayment} onChange={(e) => setPrintAfterPayment(e.target.checked)} />
                <label className="form-check-label small text-muted" htmlFor="printToggle">Print receipt after payment</label>
              </div>
            </div>
          )}

        </div>{/* end body */}

        {/* ── FOOTER ── */}
        {apptStatus === "NEW" && (
          <div className="appt-drawer-footer">
            <Button variant="dark" fullWidth onClick={handleSave}>Save Appointment</Button>
          </div>
        )}

        {apptStatus === "UNPAID" && !isEditing && !isPaid && (
          <div className="appt-drawer-footer">
            {!showPaymentSection ? (
              <>
                <Button variant="dark" fullWidth onClick={handleSave}>Update Appointment</Button>
                <Button fullWidth onClick={handleContinueToPayment} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", fontWeight: 700, boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
                  💳 Continue to Payment
                </Button>
              </>
            ) : (
              <>
                <Button variant="dark" fullWidth onClick={handleSave}>Update Appointment</Button>
                <Button fullWidth onClick={handleCompletePayment} disabled={!splitValid || (paymentMode === "single" && !singleMethod)}
                  style={{ background: (splitValid && (paymentMode !== "single" || singleMethod)) ? "linear-gradient(135deg,#10b981,#059669)" : "#d1d5db", color: "#fff", border: "none", fontWeight: 700, opacity: (splitValid && (paymentMode !== "single" || singleMethod)) ? 1 : 0.6, boxShadow: (splitValid && (paymentMode !== "single" || singleMethod)) ? "0 4px 14px rgba(16,185,129,0.35)" : "none" }}>
                  ✅ Confirm &amp; Pay — ₹{effectiveTotal.toFixed(2)}
                </Button>
              </>
            )}
          </div>
        )}

        {isPaid && isEditing && (
          <div className="appt-drawer-footer">
            <Button variant="outline-secondary" fullWidth onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button variant="dark" fullWidth onClick={handleSave}>Save Changes</Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default NewAppointmentModal;