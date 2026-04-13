import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Booking,
  ServiceItem,
  PackageItem,
  PaymentMode,
  DiscountType,
} from "../../types/scheduler-types";
import {
  CLIENT_LIST,
  CLIENT_STATS,
  REWARD_POINTS_OPTIONS,
  COUPON_CODES,
  STAFF_LIST,
  PACKAGES_LIST,
} from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { addMinutes } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import ServiceRow from "./ServiceRow";
import TotalsPanel from "./TotalsPanel";
import Button from "../../../../components/ui/Button";
import "../../styles/NewAppointmentModal.scss";

interface Props {
  onClose: () => void;
  defaultStaffId?: string;
  defaultTime?: string;
  existingBooking?: Booking;
}

type TempService = ServiceItem & { tempId: string };
type TempPkg = PackageItem & { tempId: string };
type TempProduct = {
  tempId: string;
  id: string;
  productName: string;
  price: number;
  qty: number;
  total: number;
};

function validateRows(
  serviceRows: TempService[],
  packageRows: TempPkg[],
  clientName: string,
  isWalkin: boolean,
  selectedClientId: string | null,
  payMode: PaymentMode | "",
): string[] {
  const errors: string[] = [];
  if (!clientName.trim() && !isWalkin && !selectedClientId)
    errors.push("client");
  const hasSomething =
    serviceRows.some((r) => r.service) || packageRows.length > 0;
  if (!hasSomething) errors.push("no_rows");
  if (!payMode) errors.push("paymode");
  serviceRows.forEach((r, i) => {
    if (!r.service) errors.push(`svc_${i}_service`);
    else if (!r.staffId) errors.push(`svc_${i}_staff`);
    else if (!r.price || r.price <= 0) errors.push(`svc_${i}_price`);
    else if (!r.qty || r.qty <= 0) errors.push(`svc_${i}_qty`);
  });
  return errors;
}

function printReceipt(booking: Booking) {
  const staffName =
    STAFF_LIST.find((s) => s.id === booking.staffId)?.name || booking.staffId;
  const generatedAt = new Date().toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const serviceRows = booking.services
    .map(
      (s) =>
        `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${s.service}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${s.staff || staffName}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${s.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right">₹${(s.total || 0).toFixed(2)}</td></tr>`,
    )
    .join("");
  const pkgRows = (booking.packageItems || [])
    .map(
      (p) =>
        `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${p.packageName} <span style="font-size:10px;color:#f59e0b">[Package]</span></td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">—</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${p.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right">₹${(p.total || 0).toFixed(2)}</td></tr>`,
    )
    .join("");
  const payStatusColor =
    booking.paymentStatus === "Paid"
      ? "#22c55e"
      : booking.paymentStatus === "Partial"
        ? "#f59e0b"
        : "#ef4444";
  const html = `<!DOCTYPE html><html><head><title>Receipt — ${booking.clientName}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#111;max-width:600px;margin:0 auto}@media print{body{padding:16px}}</style></head><body>
  <div style="text-align:center;margin-bottom:24px"><div style="font-size:26px;font-weight:800">SalonOx</div><div style="font-size:13px;color:#6b7280;margin-top:4px">Appointment Receipt</div><div style="font-size:11px;color:#9ca3af;margin-top:2px">${generatedAt}</div></div>
  <div style="display:flex;justify-content:space-between;background:#f9fafb;border-radius:8px;padding:14px 18px;margin-bottom:20px;gap:12px;flex-wrap:wrap">
    <div><div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Client</div><div style="font-size:15px;font-weight:700;margin-top:2px">${booking.clientName}</div>${booking.clientPhone ? `<div style="font-size:12px;color:#6b7280">${booking.clientPhone}</div>` : ""}</div>
    <div><div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Staff</div><div style="font-size:14px;font-weight:600;margin-top:2px">${staffName}</div></div>
    <div><div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Date</div><div style="font-size:14px;font-weight:600;margin-top:2px">${booking.billDate || booking.date}</div></div>
    <div><div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Payment</div><div style="margin-top:4px"><span style="background:${payStatusColor}22;color:${payStatusColor};border:1px solid ${payStatusColor};border-radius:4px;padding:2px 10px;font-size:12px;font-weight:700">${booking.paymentStatus}</span></div></div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px"><thead><tr style="background:#1f2937;color:#fff"><th style="padding:9px 10px;text-align:left">Service / Package</th><th style="padding:9px 10px;text-align:left">Staff</th><th style="padding:9px 10px;text-align:center">Qty</th><th style="padding:9px 10px;text-align:right">Amount</th></tr></thead><tbody>${serviceRows}${pkgRows}</tbody></table>
  <div style="display:flex;justify-content:flex-end"><div style="width:240px">
    ${booking.discount ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px"><span>Subtotal</span><span>₹${(booking.subtotal || 0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:#ef4444;margin-bottom:5px"><span>Discount</span><span>-₹${((booking.subtotal || 0) - (booking.taxableAmount || 0)).toFixed(2)}</span></div>` : ""}
    ${booking.couponDiscount ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;margin-bottom:5px"><span>Coupon (${booking.couponCode})</span><span>-₹${booking.couponDiscount.toFixed(2)}</span></div>` : ""}
    ${booking.gst ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px"><span>GST (${booking.gst}%)</span><span>₹${((booking.grandTotal || 0) - (booking.taxableAmount || 0) - (booking.exCharges || 0)).toFixed(2)}</span></div>` : ""}
    ${booking.exCharges ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px"><span>Extra Charges</span><span>₹${booking.exCharges.toFixed(2)}</span></div>` : ""}
    ${(booking as any).tip ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px"><span>Tip</span><span>₹${(booking as any).tip.toFixed(2)}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-top:2px solid #1f2937;padding-top:8px;margin-top:4px"><span>Grand Total</span><span>₹${(booking.grandTotal || 0).toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;margin-top:6px"><span>Paid</span><span>₹${(booking.payingNow || 0).toFixed(2)}</span></div>
    ${(booking.dueAmount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#ef4444;margin-top:4px"><span>Balance Due</span><span>₹${(booking.dueAmount || 0).toFixed(2)}</span></div>` : ""}
  </div></div>
  ${booking.notes ? `<div style="margin-top:20px;padding:10px 14px;background:#f9fafb;border-radius:6px;border-left:3px solid #1f2937"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Notes</div><div style="font-size:12px;color:#374151">${booking.notes}</div></div>` : ""}
  <div style="text-align:center;margin-top:28px;font-size:11px;color:#9ca3af">Thank you for visiting! · SalonOx</div>
  </body></html>`;
  const win = window.open("", "_blank", "width=700,height=600");
  if (!win) { alert("Please allow popups to print."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

const NewAppointmentModal: React.FC<Props> = ({
  onClose,
  defaultStaffId,
  defaultTime,
  existingBooking,
}) => {
  const { addBooking, updateBooking, currentDate } = useSchedulerContext();
  const isEditMode = !!existingBooking;

  const [clientSearch, setClientSearch] = useState(existingBooking?.clientName || "");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(existingBooking?.clientId || null);
  const [isWalkin, setIsWalkin] = useState(!existingBooking?.clientId && !!existingBooking);
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [calDate, setCalDate] = useState(existingBooking?.billDate || currentDate);
  const [showCal, setShowCal] = useState(false);
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);

  const [serviceRows, setServiceRows] = useState<TempService[]>(
    existingBooking?.services.map((s) => ({ ...s, tempId: "sr_" + s.id })) || [
      {
        tempId: "sr_" + Date.now(),
        id: "",
        service: "",
        staff: "",
        staffId: defaultStaffId || "",
        time: defaultTime || "10:00",
        price: 0,
        qty: 0,
        total: 0,
      },
    ],
  );
  const [packageRows, setPackageRows] = useState<TempPkg[]>(
    existingBooking?.packageItems?.map((p) => ({ ...p, tempId: "pk_" + p.id })) || [],
  );
  const [productRows, setProductRows] = useState<TempProduct[]>([]);

  const [rewardPoints, setRewardPoints] = useState(existingBooking?.rewardPoints || "");
  const [exCharges, setExCharges] = useState(existingBooking?.exCharges || 0);
  const [tip, setTip] = useState<number>(0);
  const [discount, setDiscount] = useState(existingBooking?.discount || 0);
  const [discountType, setDiscountType] = useState<DiscountType>(existingBooking?.discountType || "Percentage (%)");
  const [gst, setGst] = useState(existingBooking?.gst || 0);
  const [payMode, setPayMode] = useState<PaymentMode | "">(existingBooking?.paymentMode || "");
  const [adjustPayment, setAdjustPayment] = useState(existingBooking?.payingNow || 0);
  const [couponInput, setCouponInput] = useState(existingBooking?.couponCode || "");
  const [couponDiscount, setCouponDiscount] = useState(existingBooking?.couponDiscount || 0);
  const [couponApplied, setCouponApplied] = useState(existingBooking?.couponCode || "");
  const [couponError, setCouponError] = useState("");
  const [notes, setNotes] = useState(existingBooking?.notes || "");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const hasErr = (key: string) => validationErrors.includes(key);

  const selectedClient = CLIENT_LIST.find((c) => c.id === selectedClientId);
  const selectedStats = CLIENT_STATS?.find?.((c: any) => c.clientId === selectedClientId) as any;
  const filteredClients = CLIENT_LIST.filter(
    (c) =>
      clientSearch.length >= 2 &&
      (c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)),
  );

  const subtotal = [...serviceRows, ...packageRows, ...productRows].reduce(
    (a, r) => a + (r.total || 0), 0,
  );
  const discountVal =
    discountType === "Percentage (%)" ? (subtotal * discount) / 100 : discount;
  const totalDisc = Math.min(discountVal + couponDiscount, subtotal);
  const taxable = Math.max(0, subtotal - totalDisc);
  const grandTotal = taxable + (taxable * gst) / 100 + exCharges + tip;
  const dueAmount = Math.max(0, grandTotal - adjustPayment);

  function getPaymentStatus(paying: number, total: number) {
    if (paying >= total && total > 0) return "Paid" as const;
    if (paying > 0) return "Partial" as const;
    return "Unpaid" as const;
  }

  function handleWalkinClick() {
    setIsWalkin(true);
    setSelectedClientId(null);
    setClientSearch("Walk-In");
    setShowClientDrop(false);
    setValidationErrors((e) => e.filter((x) => x !== "client"));
  }

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (COUPON_CODES[code] !== undefined) {
      setCouponDiscount(COUPON_CODES[code]);
      setCouponApplied(code);
      setCouponError("");
    } else {
      setCouponDiscount(0);
      setCouponApplied("");
      setCouponError("Invalid coupon code");
    }
  }

  function updateServiceRow(id: string, field: string, value: string | number | boolean) {
    setServiceRows((rows) =>
      rows.map((r) => (r.tempId !== id ? r : { ...r, [field]: value })),
    );
  }
  function removeServiceRow(id: string) {
    setServiceRows((rows) => rows.filter((r) => r.tempId !== id));
  }
  function addPackage(pkg: (typeof PACKAGES_LIST)[0]) {
    setPackageRows((r) => [
      ...r,
      {
        tempId: "pk_" + Date.now(),
        id: "",
        packageId: pkg.id,
        packageName: pkg.name,
        price: pkg.price,
        qty: 1,
        total: pkg.price,
      },
    ]);
    setShowPkgModal(false);
  }

  function posNum(val: string, setter: (n: number) => void) {
    const n = parseFloat(val);
    setter(isNaN(n) || n < 0 ? 0 : n);
  }

  function handleSave() {
    const resolvedClientName = isWalkin
      ? "Walk-In"
      : selectedClient?.name || clientSearch || "";
    const resolvedClientPhone = isWalkin
      ? ""
      : selectedClient?.phone || existingBooking?.clientPhone || "";
    const errors = validateRows(
      serviceRows, packageRows, resolvedClientName,
      isWalkin, selectedClientId, payMode,
    );
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setValidationErrors([]);

    const paymentStatus = getPaymentStatus(adjustPayment, grandTotal);
    const appointmentStatus =
      paymentStatus === "Paid" ? ("Confirmed" as const) : ("Pending" as const);

    if (isEditMode) {
      const firstRow = serviceRows[0];
      const startTime = firstRow?.time || existingBooking?.startTime || "10:00";
      const endTime = addMinutes(startTime, 30);
      const updated: Booking = {
        ...existingBooking!,
        clientId: selectedClientId || undefined,
        clientName: resolvedClientName,
        clientPhone: resolvedClientPhone,
        startTime,
        endTime,
        staffId: firstRow?.staffId || existingBooking?.staffId || STAFF_LIST[0].id,
        billDate: calDate,
        services: serviceRows.map((r) => ({
          id: r.id || "s_" + r.tempId,
          service: r.service,
          staff: STAFF_LIST.find((s) => s.id === r.staffId)?.name || r.staff || "",
          staffId: r.staffId,
          time: r.time,
          price: r.price,
          qty: r.qty || 1,
          total: r.total,
        })),
        groupItems: [],
        packageItems: packageRows.map((r) => ({
          id: r.id || "pk_" + r.tempId,
          packageId: r.packageId,
          packageName: r.packageName,
          price: r.price,
          qty: r.qty,
          total: r.total,
        })),
        paymentMode: payMode as PaymentMode,
        rewardPoints,
        exCharges,
        discount,
        discountType,
        gst,
        couponCode: couponApplied,
        couponDiscount,
        subtotal,
        taxableAmount: taxable,
        grandTotal,
        payingNow: adjustPayment,
        dueAmount,
        notes,
        status: appointmentStatus,
        paymentStatus,
      } as any;
      (updated as any).tip = tip;
      updateBooking(updated);
      if (paymentStatus === "Paid" || paymentStatus === "Partial") setSavedBooking(updated);
      else onClose();
      return;
    }

    const staffServiceMap: Record<string, TempService[]> = {};
    serviceRows.forEach((r) => {
      const sid = r.staffId || defaultStaffId || STAFF_LIST[0].id;
      if (!staffServiceMap[sid]) staffServiceMap[sid] = [];
      staffServiceMap[sid].push(r);
    });
    const primaryStaffId = serviceRows[0]?.staffId || defaultStaffId || STAFF_LIST[0].id;
    const staffIds = Object.keys(staffServiceMap);
    const hasServiceRows = serviceRows.some((r) => r.service);

    if (!hasServiceRows || staffIds.length <= 1) {
      const startTime = serviceRows[0]?.time || defaultTime || "10:00";
      const endTime = addMinutes(startTime, 30);
      const newBooking: Booking = {
        id: "b_" + Date.now(),
        clientId: selectedClientId || undefined,
        clientName: resolvedClientName,
        clientPhone: resolvedClientPhone,
        staffId: primaryStaffId,
        date: currentDate,
        billDate: calDate,
        startTime,
        endTime,
        services: serviceRows
          .filter((r) => r.service)
          .map((r) => ({
            id: "s_" + r.tempId,
            service: r.service,
            staff: STAFF_LIST.find((s) => s.id === r.staffId)?.name || r.staff || "",
            staffId: r.staffId,
            time: r.time,
            price: r.price,
            qty: r.qty || 1,
            total: r.total,
          })),
        groupItems: [],
        packageItems: packageRows.map((r) => ({
          id: "pk_" + r.tempId,
          packageId: r.packageId,
          packageName: r.packageName,
          price: r.price,
          qty: r.qty,
          total: r.total,
        })),
        status: appointmentStatus,
        paymentStatus,
        paymentMode: payMode as PaymentMode,
        rewardPoints,
        exCharges,
        discount,
        discountType,
        gst,
        couponCode: couponApplied,
        couponDiscount,
        subtotal,
        taxableAmount: taxable,
        grandTotal,
        payingNow: adjustPayment,
        dueAmount,
        notes,
      } as any;
      (newBooking as any).tip = tip;
      addBooking(newBooking);
      if (paymentStatus === "Paid" || paymentStatus === "Partial") setSavedBooking(newBooking);
      else onClose();
    } else {
      staffIds.forEach((staffId, index) => {
        const staffServices = staffServiceMap[staffId];
        const firstRow = staffServices[0];
        const startTime = firstRow?.time || defaultTime || "10:00";
        const endTime = addMinutes(startTime, 30);
        const staffSubtotal = staffServices.reduce((a, r) => a + (r.total || 0), 0);
        const staffPayStatus = index === 0 ? paymentStatus : ("Unpaid" as const);
        const staffApptStatus =
          staffPayStatus === "Paid" ? ("Confirmed" as const) : ("Pending" as const);
        addBooking({
          id: "b_" + Date.now() + "_" + index,
          clientId: selectedClientId || undefined,
          clientName: resolvedClientName,
          clientPhone: resolvedClientPhone,
          staffId,
          date: currentDate,
          billDate: calDate,
          startTime,
          endTime,
          services: staffServices.map((r) => ({
            id: "s_" + r.tempId,
            service: r.service,
            staff: STAFF_LIST.find((s) => s.id === r.staffId)?.name || r.staff || "",
            staffId: r.staffId,
            time: r.time,
            price: r.price,
            qty: r.qty || 1,
            total: r.total,
          })),
          groupItems: [],
          packageItems:
            index === 0
              ? packageRows.map((r) => ({
                  id: "pk_" + r.tempId,
                  packageId: r.packageId,
                  packageName: r.packageName,
                  price: r.price,
                  qty: r.qty,
                  total: r.total,
                }))
              : [],
          status: staffApptStatus,
          paymentStatus: staffPayStatus,
          paymentMode: payMode as PaymentMode,
          rewardPoints: index === 0 ? rewardPoints : "",
          exCharges: index === 0 ? exCharges : 0,
          discount: index === 0 ? discount : 0,
          discountType,
          gst: index === 0 ? gst : 0,
          couponCode: index === 0 ? couponApplied : "",
          couponDiscount: index === 0 ? couponDiscount : 0,
          subtotal: staffSubtotal,
          taxableAmount: staffSubtotal,
          grandTotal: staffSubtotal,
          payingNow: index === 0 ? adjustPayment : 0,
          dueAmount: staffSubtotal,
          notes,
        } as any);
      });
      onClose();
    }
  }

  const navigate = useNavigate();

  // ── Success screen ────────────────────────────────────────────────────────
  if (savedBooking) {
    const isPaid = savedBooking.paymentStatus === "Paid";
    const isPartial = savedBooking.paymentStatus === "Partial";
    return (
      <div className="appt-drawer-overlay">
        <div className="appt-drawer-content appt-drawer-content--success">
          <div className={`success-icon-wrap success-icon-wrap--${isPaid ? "paid" : "partial"}`}>
            {isPaid ? "✅" : "⚠️"}
          </div>
          <div className="success-info">
            <div className="success-info__title">
              {isPaid ? "Payment Confirmed!" : "Appointment Saved"}
            </div>
            <div className="success-info__sub">
              {savedBooking.clientName} · {savedBooking.services[0]?.service}
            </div>
            <div className="success-badges">
              <span className={`success-badge success-badge--${isPaid ? "paid" : "partial"}`}>
                {savedBooking.paymentStatus}
              </span>
              <span className="success-badge success-badge--neutral">
                ₹{(savedBooking.payingNow || 0).toFixed(2)} paid
              </span>
              {isPartial && (
                <span className="success-badge success-badge--due">
                  ₹{(savedBooking.dueAmount || 0).toFixed(2)} due
                </span>
              )}
            </div>
          </div>
          <div className="success-actions">
            <Button
              variant="dark"
              iconLeft={<span>🖨️</span>}
              onClick={() => printReceipt(savedBooking)}
            >
              Print Receipt
            </Button>
            <Button variant="outline-secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="appt-drawer-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="appt-drawer-content">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="appt-drawer-header">
          <button className="btn-close-drawer" onClick={onClose}>✕</button>
          <h2>{isEditMode ? "Edit Appointment" : "New Appointment"}</h2>
          {isEditMode && (
            <span className="edit-badge">Editing #{existingBooking.id}</span>
          )}
        </div>

        <div className="appt-drawer-body">

          {/* ── Client row ──────────────────────────────────────────────── */}
          <div className="client-row">
            <div className="client-row__search-wrap">
              <input
                className={`form-input${hasErr("client") ? " input-error" : ""}`}
                placeholder="Search by Name / Phone (min 2 chars)"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDrop(true);
                  setIsWalkin(false);
                  setSelectedClientId(null);
                  setValidationErrors((ev) => ev.filter((x) => x !== "client"));
                }}
                onFocus={() => clientSearch.length >= 2 && setShowClientDrop(true)}
              />
              {hasErr("client") && (
                <span className="err-text">Please select a client or choose Walk-In</span>
              )}
              {showClientDrop && filteredClients.length > 0 && (
                <div className="client-dropdown">
                  {filteredClients.map((c) => (
                    <div
                      key={c.id}
                      className="client-dropdown__item"
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientSearch(c.name);
                        setShowClientDrop(false);
                        setIsWalkin(false);
                        setValidationErrors((ev) => ev.filter((x) => x !== "client"));
                      }}
                    >
                      <div className="client-dropdown__name">{c.name}</div>
                      <div className="client-dropdown__phone">{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant={isWalkin ? "dark" : "secondary"}
              size="sm"
              onClick={handleWalkinClick}
            >
              {isWalkin ? "✓ Walk-In" : "Walk-In"}
            </Button>

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => { onClose(); navigate("/dashboard/clients/add"); }}
            >
              + Add Client
            </Button>

            <div className="client-row__date-wrap">
              <input
                readOnly
                value={calDate}
                onClick={() => setShowCal((v) => !v)}
                className="form-input client-row__date-input"
              />
              {showCal && (
                <div className="client-row__cal-popup">
                  <MiniCalendar
                    value={calDate}
                    onChange={(d: string) => { setCalDate(d); setShowCal(false); }}
                    onClose={() => setShowCal(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Client stats panel ──────────────────────────────────────── */}
          {selectedClientId && selectedStats && (
            <div className="client-stats-panel">
              <div className="client-stats-panel__header">
                <div className="avatar">{selectedClient!.name.charAt(0)}</div>
                <div className="info">
                  <div className="name">{selectedClient!.name}</div>
                  <div className="sub">
                    {selectedClient!.phone} &nbsp;·&nbsp; {selectedStats.address}
                  </div>
                </div>
                {selectedStats.membership !== "NA" && (
                  <span className={`membership-badge ${selectedStats.membership.toLowerCase()}`}>
                    ⭐ {selectedStats.membership}
                  </span>
                )}
              </div>
              <div className="client-stats-panel__grid">
                {(
                  [
                    ["Reward Points", selectedStats.rewardPoints, ""],
                    ["Ewallet Amt", `₹${selectedStats.ewalletAmt}`, ""],
                    ["Unpaid Amt", `₹${selectedStats.unpaidAmt}`, selectedStats.unpaidAmt > 0 ? "danger" : ""],
                    ["Assign Discount", `${selectedStats.assignDiscount}%`, ""],
                    ["Disc. Validity", selectedStats.discountValidity, ""],
                    ["Membership", selectedStats.membership, ""],
                    ["No Show", selectedStats.noShow, selectedStats.noShow > 0 ? "danger" : ""],
                    ["Cancelled", selectedStats.cancelled, selectedStats.cancelled > 0 ? "danger" : ""],
                    ["Total Visits", selectedStats.totalVisit, ""],
                    ["Last Visit", selectedStats.lastVisit, ""],
                    ["Total Revenue", `₹${selectedStats.totalRevenue?.toLocaleString()}`, "info"],
                    ["View History", "Click Here", "link"],
                  ] as [string, string | number, string][]
                ).map(([label, value, cls]) => (
                  <div key={label} className={`info-cell ${cls}`}>
                    <span className="info-cell__label">{label}</span>
                    <span className="info-cell__value">{value}</span>
                  </div>
                ))}
              </div>
              {(selectedStats.notes || selectedStats.staffAlert) && (
                <div className="client-stats-panel__notes-row">
                  {selectedStats.notes && (
                    <div>
                      <div className="info-cell__label">📝 Notes</div>
                      <div className="stats-note-text">{selectedStats.notes}</div>
                    </div>
                  )}
                  {selectedStats.staffAlert && (
                    <div>
                      <div className="info-cell__label info-cell__label--alert">🔔 Staff Alert</div>
                      <div className="stats-alert-text">{selectedStats.staffAlert}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── No rows error ────────────────────────────────────────────── */}
          {hasErr("no_rows") && (
            <div className="no-rows-error">
              ⚠️ Add at least one service or package before saving.
            </div>
          )}

          {/* ── Services table header ────────────────────────────────────── */}
          <div className="table-header table-header--services">
            <div>SERVICE</div>
            <div>STAFF</div>
            <div>TIME</div>
            <div>PRICE</div>
            <div>QTY</div>
            <div>TOTAL</div>
            <div />
          </div>

          {serviceRows.map((row, i) => (
            <ServiceRow
              key={row.tempId}
              row={row}
              onChange={updateServiceRow}
              onRemove={removeServiceRow}
              hasError={
                hasErr(`svc_${i}_service`) ||
                hasErr(`svc_${i}_staff`) ||
                hasErr(`svc_${i}_price`) ||
                hasErr(`svc_${i}_qty`)
              }
              errorFields={{
                service: hasErr(`svc_${i}_service`),
                staff:   hasErr(`svc_${i}_staff`),
                price:   hasErr(`svc_${i}_price`),
                qty:     hasErr(`svc_${i}_qty`),
              }}
            />
          ))}

          {/* ── Packages table ───────────────────────────────────────────── */}
          {packageRows.length > 0 && (
            <>
              <div className="table-header table-header--packages">
                <div>PACKAGE</div>
                <div>PRICE</div>
                <div>QTY</div>
                <div>TOTAL</div>
                <div />
              </div>
              {packageRows.map((row) => (
                <div key={row.tempId} className="pkg-row">
                  <div className="pkg-row__name">{row.packageName}</div>
                  <input
                    readOnly
                    value={row.price}
                    className="form-input form-input--sm form-input--readonly"
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.qty}
                    className="form-input form-input--sm"
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setPackageRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId ? { ...r, qty, total: r.price * qty } : r,
                        ),
                      );
                    }}
                  />
                  <input
                    readOnly
                    value={row.total}
                    className="form-input form-input--sm form-input--readonly"
                  />
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() =>
                      setPackageRows((r) => r.filter((x) => x.tempId !== row.tempId))
                    }
                  >
                    🗑
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Products table ───────────────────────────────────────────── */}
          {productRows.length > 0 && (
            <>
              <div className="table-header table-header--products">
                <div>PRODUCT</div>
                <div>PRICE</div>
                <div>QTY</div>
                <div>TOTAL</div>
                <div />
              </div>
              {productRows.map((row) => (
                <div key={row.tempId} className="product-row">
                  <input
                    placeholder="Product name"
                    value={row.productName}
                    className="form-input form-input--sm"
                    onChange={(e) =>
                      setProductRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId ? { ...r, productName: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.price || ""}
                    placeholder="0"
                    className="form-input form-input--sm"
                    onChange={(e) => {
                      const price = Math.max(0, parseFloat(e.target.value) || 0);
                      setProductRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId ? { ...r, price, total: price * r.qty } : r,
                        ),
                      );
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.qty}
                    className="form-input form-input--sm"
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setProductRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId ? { ...r, qty, total: r.price * qty } : r,
                        ),
                      );
                    }}
                  />
                  <input
                    readOnly
                    value={row.total.toFixed(2)}
                    className="form-input form-input--sm form-input--readonly"
                  />
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() =>
                      setProductRows((r) => r.filter((x) => x.tempId !== row.tempId))
                    }
                  >
                    🗑
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Action buttons ───────────────────────────────────────────── */}
          <div className="appt-add-actions">
            <Button
              variant="dark"
              size="sm"
              onClick={() =>
                setServiceRows((r) => [
                  ...r,
                  {
                    tempId: "sr_" + Date.now(),
                    id: "",
                    service: "",
                    staff: "",
                    staffId: defaultStaffId || "",
                    time: defaultTime || "10:00",
                    price: 0,
                    qty: 0,
                    total: 0,
                  },
                ])
              }
            >
              + Add Service
            </Button>
            <Button variant="dark" size="sm" onClick={() => setShowPkgModal(true)}>
              + Add Package
            </Button>
            <Button
              variant="dark"
              size="sm"
              onClick={() =>
                setProductRows((r) => [
                  ...r,
                  { tempId: "pr_" + Date.now(), id: "", productName: "", price: 0, qty: 1, total: 0 },
                ])
              }
            >
              + Add Product
            </Button>
          </div>

          {/* ── Extras grid ──────────────────────────────────────────────── */}
          <div className="extras-grid">
            {[
              {
                label: "Reward Points",
                el: (
                  <select
                    className="form-input form-input--sm"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(e.target.value)}
                  >
                    {REWARD_POINTS_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                ),
              },
              {
                label: "Ex Charges",
                el: (
                  <input
                    type="number" min={0}
                    className="form-input form-input--sm"
                    value={exCharges || ""} placeholder="0"
                    onChange={(e) => posNum(e.target.value, setExCharges)}
                  />
                ),
              },
              {
                label: "Tip",
                el: (
                  <input
                    type="number" min={0}
                    className="form-input form-input--sm"
                    value={tip || ""} placeholder="0"
                    onChange={(e) => posNum(e.target.value, setTip)}
                  />
                ),
              },
              {
                label: "Discount",
                el: (
                  <input
                    type="number" min={0}
                    className="form-input form-input--sm"
                    value={discount || ""} placeholder="0"
                    onChange={(e) => posNum(e.target.value, setDiscount)}
                  />
                ),
              },
              {
                label: "Discount Type",
                el: (
                  <select
                    className="form-input form-input--sm"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  >
                    <option>Percentage (%)</option>
                    <option>Flat (₹)</option>
                  </select>
                ),
              },
              {
                label: "GST %",
                el: (
                  <input
                    type="number" min={0}
                    className="form-input form-input--sm"
                    value={gst || ""} placeholder="0"
                    onChange={(e) => posNum(e.target.value, setGst)}
                  />
                ),
              },
            ].map(({ label, el }) => (
              <div key={label} className="extras-grid__field">
                <label className="field-label">{label}</label>
                {el}
              </div>
            ))}
          </div>

          {/* ── Payment + Totals ─────────────────────────────────────────── */}
          <div className="payment-totals-row">
            <div className="payment-left">

              {/* Row 1: Payment Method + Adjust Payment */}
              <div className="payment-grid">
                <div className="payment-section">
                  <label className="field-label">Payment Method</label>
                  <div className="pay-method-btns">
                    {(["Cash", "Card", "UPI"] as PaymentMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`pay-method-btn${payMode === m ? " pay-method-btn--active" : ""}`}
                        onClick={() => {
                          setPayMode(m);
                          setValidationErrors((ev) => ev.filter((x) => x !== "paymode"));
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {hasErr("paymode") && (
                    <span className="err-text">Please select a payment method</span>
                  )}
                </div>

                <div className="payment-section">
                  <label className="field-label">Adjust Payment</label>
                  <input
                    type="number" min={0}
                    className="form-input form-input--sm"
                    value={adjustPayment || ""} placeholder="0"
                    onChange={(e) => posNum(e.target.value, setAdjustPayment)}
                  />
                </div>
              </div>

              {/* Row 2: Coupon Code + Notes */}
              <div className="payment-grid">
                <div className="payment-section">
                  <label className="field-label">Coupon Code</label>
                  <div className="coupon-row">
                    <input
                      className="form-input form-input--sm"
                      placeholder="SAVE10, FLAT50, NEW20"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    />
                    <Button variant="dark" size="sm" onClick={handleApplyCoupon}>
                      Apply
                    </Button>
                  </div>
                  {couponApplied && (
                    <span className="coupon-success">
                      ✓ "{couponApplied}" — ₹{couponDiscount} off
                    </span>
                  )}
                  {couponError && <span className="err-text">{couponError}</span>}
                </div>

                <div className="payment-section">
                  <label className="field-label">Notes</label>
                  <textarea
                    className="form-textarea form-textarea--sm"
                    placeholder="Enter Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

            </div>

            <TotalsPanel
              subtotal={subtotal}
              exCharges={exCharges}
              discount={discount}
              discountType={discountType}
              gst={gst}
              adjustPayment={adjustPayment}
              couponDiscount={couponDiscount}
              tip={tip}
            />
          </div>

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="appt-drawer-footer">
          <Button variant="dark" fullWidth onClick={handleSave}>
            {isEditMode ? "Update Appointment" : "Save Appointment"}
          </Button>
        </div>

      </div>

      {/* ── Package picker modal ─────────────────────────────────────────── */}
      {showPkgModal && (
        <div className="pkg-picker-overlay" onClick={() => setShowPkgModal(false)}>
          <div className="pkg-picker-content" onClick={(e) => e.stopPropagation()}>
            <div className="pkg-picker-content__header">
              <h3>Select Package</h3>
              <button onClick={() => setShowPkgModal(false)} className="btn-close">✕</button>
            </div>
            {PACKAGES_LIST.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => addPackage(pkg)}
                className="pkg-picker-content__item"
              >
                <div className="pkg-info">
                  <div className="pkg-name">{pkg.name}</div>
                  <div className="pkg-services">{pkg.services.join(", ")}</div>
                </div>
                <div className="pkg-price">₹{pkg.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewAppointmentModal;