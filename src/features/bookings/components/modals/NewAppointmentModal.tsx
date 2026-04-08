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
  if (!win) {
    alert("Please allow popups to print.");
    return;
  }
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

  const [clientSearch, setClientSearch] = useState(
    existingBooking?.clientName || "",
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    existingBooking?.clientId || null,
  );
  const [isWalkin, setIsWalkin] = useState(
    !existingBooking?.clientId && !!existingBooking,
  );
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [calDate, setCalDate] = useState(
    existingBooking?.billDate || currentDate,
  );
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
    existingBooking?.packageItems?.map((p) => ({
      ...p,
      tempId: "pk_" + p.id,
    })) || [],
  );
  const [productRows, setProductRows] = useState<TempProduct[]>([]);

  const [rewardPoints, setRewardPoints] = useState(
    existingBooking?.rewardPoints || "",
  );
  const [exCharges, setExCharges] = useState(existingBooking?.exCharges || 0);
  const [tip, setTip] = useState<number>(0);
  const [discount, setDiscount] = useState(existingBooking?.discount || 0);
  const [discountType, setDiscountType] = useState<DiscountType>(
    existingBooking?.discountType || "Percentage (%)",
  );
  const [gst, setGst] = useState(existingBooking?.gst || 0);
  const [payMode, setPayMode] = useState<PaymentMode | "">(
    existingBooking?.paymentMode || "",
  );
  const [adjustPayment, setAdjustPayment] = useState(
    existingBooking?.payingNow || 0,
  );
  const [couponInput, setCouponInput] = useState(
    existingBooking?.couponCode || "",
  );
  const [couponDiscount, setCouponDiscount] = useState(
    existingBooking?.couponDiscount || 0,
  );
  const [couponApplied, setCouponApplied] = useState(
    existingBooking?.couponCode || "",
  );
  const [couponError, setCouponError] = useState("");
  const [notes, setNotes] = useState(existingBooking?.notes || "");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const hasErr = (key: string) => validationErrors.includes(key);

  const selectedClient = CLIENT_LIST.find((c) => c.id === selectedClientId);
  const selectedStats = CLIENT_STATS?.find?.(
    (c: any) => c.clientId === selectedClientId,
  ) as any;
  const filteredClients = CLIENT_LIST.filter(
    (c) =>
      clientSearch.length >= 2 &&
      (c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)),
  );

  const subtotal = [...serviceRows, ...packageRows, ...productRows].reduce(
    (a, r) => a + (r.total || 0),
    0,
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

  function updateServiceRow(
    id: string,
    field: string,
    value: string | number | boolean,
  ) {
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
      serviceRows,
      packageRows,
      resolvedClientName,
      isWalkin,
      selectedClientId,
      payMode,
    );
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
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
        staffId:
          firstRow?.staffId || existingBooking?.staffId || STAFF_LIST[0].id,
        billDate: calDate,
        services: serviceRows.map((r) => ({
          id: r.id || "s_" + r.tempId,
          service: r.service,
          staff:
            STAFF_LIST.find((s) => s.id === r.staffId)?.name || r.staff || "",
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
      if (paymentStatus === "Paid" || paymentStatus === "Partial") {
        setSavedBooking(updated);
      } else {
        onClose();
      }
      return;
    }

    const staffServiceMap: Record<string, TempService[]> = {};
    serviceRows.forEach((r) => {
      const sid = r.staffId || defaultStaffId || STAFF_LIST[0].id;
      if (!staffServiceMap[sid]) staffServiceMap[sid] = [];
      staffServiceMap[sid].push(r);
    });
    const primaryStaffId =
      serviceRows[0]?.staffId || defaultStaffId || STAFF_LIST[0].id;
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
            staff:
              STAFF_LIST.find((s) => s.id === r.staffId)?.name || r.staff || "",
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
      if (paymentStatus === "Paid" || paymentStatus === "Partial") {
        setSavedBooking(newBooking);
      } else {
        onClose();
      }
    } else {
      staffIds.forEach((staffId, index) => {
        const staffServices = staffServiceMap[staffId];
        const firstRow = staffServices[0];
        const startTime = firstRow?.time || defaultTime || "10:00";
        const endTime = addMinutes(startTime, 30);
        const staffSubtotal = staffServices.reduce(
          (a, r) => a + (r.total || 0),
          0,
        );
        const staffPayStatus =
          index === 0 ? paymentStatus : ("Unpaid" as const);
        const staffApptStatus =
          staffPayStatus === "Paid"
            ? ("Confirmed" as const)
            : ("Pending" as const);
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
            staff:
              STAFF_LIST.find((s) => s.id === r.staffId)?.name || r.staff || "",
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

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    display: "block",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  };
  const formInput: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    fontSize: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  const errText: React.CSSProperties = {
    fontSize: 10,
    color: "#ef4444",
    marginTop: 2,
    display: "block",
  };

  // ── Success / print screen ────────────────────────────────────────────────
  if (savedBooking) {
    const isPaid = savedBooking.paymentStatus === "Paid";
    const isPartial = savedBooking.paymentStatus === "Partial";
    return (
      <div className="appt-drawer-overlay">
        <div
          className="appt-drawer-content"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: 40,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: isPaid ? "#dcfce7" : "#fef9c3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}
          >
            {isPaid ? "✅" : "⚠️"}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>
              {isPaid ? "Payment Confirmed!" : "Appointment Saved"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              {savedBooking.clientName} · {savedBooking.services[0]?.service}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  background: isPaid ? "#22c55e22" : "#f59e0b22",
                  color: isPaid ? "#16a34a" : "#b45309",
                  border: `1px solid ${isPaid ? "#22c55e" : "#f59e0b"}`,
                  borderRadius: 6,
                  padding: "3px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {savedBooking.paymentStatus}
              </span>
              <span
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  borderRadius: 6,
                  padding: "3px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ₹{(savedBooking.payingNow || 0).toFixed(2)} paid
              </span>
              {isPartial && (
                <span
                  style={{
                    background: "#fef2f2",
                    color: "#ef4444",
                    border: "1px solid #ef4444",
                    borderRadius: 6,
                    padding: "3px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ₹{(savedBooking.dueAmount || 0).toFixed(2)} due
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
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
        <div className="appt-drawer-header">
          <button className="btn-close-drawer" onClick={onClose}>
            ✕
          </button>
          <h2>{isEditMode ? "Edit Appointment" : "New Appointment"}</h2>
          {isEditMode && (
            <span className="edit-badge">Editing #{existingBooking.id}</span>
          )}
        </div>

        <div className="appt-drawer-body">
          {/* ── Client row ────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <input
                style={{
                  ...formInput,
                  borderColor: hasErr("client") ? "#ef4444" : "#e5e7eb",
                  background: hasErr("client") ? "#fff5f5" : "#fff",
                }}
                placeholder="Search by Name / Phone (min 2 chars)"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDrop(true);
                  setIsWalkin(false);
                  setSelectedClientId(null);
                  setValidationErrors((ev) => ev.filter((x) => x !== "client"));
                }}
                onFocus={() =>
                  clientSearch.length >= 2 && setShowClientDrop(true)
                }
              />
              {hasErr("client") && (
                <span style={errText}>
                  Please select a client or choose Walk-In
                </span>
              )}
              {showClientDrop && filteredClients.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 300,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,.1)",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {filteredClients.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f4f6",
                        fontSize: 12,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f9fafb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "")
                      }
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientSearch(c.name);
                        setShowClientDrop(false);
                        setIsWalkin(false);
                        setValidationErrors((ev) =>
                          ev.filter((x) => x !== "client"),
                        );
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ color: "#6b7280", fontSize: 11 }}>
                        {c.phone}
                      </div>
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
              onClick={() => {
                onClose();
                navigate("/dashboard/clients/add");
              }}
            >
              + Add Client
            </Button>

            <div style={{ position: "relative" }}>
              <input
                readOnly
                value={calDate}
                onClick={() => setShowCal((v) => !v)}
                style={{
                  ...formInput,
                  width: 120,
                  cursor: "pointer",
                  paddingLeft: 28,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "8px center",
                }}
              />
              {showCal && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    zIndex: 400,
                  }}
                >
                  <MiniCalendar
                    value={calDate}
                    onChange={(d: string) => {
                      setCalDate(d);
                      setShowCal(false);
                    }}
                    onClose={() => setShowCal(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Client stats panel ────────────────────────────────────────── */}
          {selectedClientId && selectedStats && (
            <div className="client-stats-panel">
              <div className="client-stats-panel__header">
                <div className="avatar">{selectedClient!.name.charAt(0)}</div>
                <div className="info">
                  <div className="name">{selectedClient!.name}</div>
                  <div className="sub">
                    {selectedClient!.phone} &nbsp;·&nbsp;{" "}
                    {selectedStats.address}
                  </div>
                </div>
                {selectedStats.membership !== "NA" && (
                  <span
                    className={`membership-badge ${selectedStats.membership.toLowerCase()}`}
                  >
                    ⭐ {selectedStats.membership}
                  </span>
                )}
              </div>
              <div className="client-stats-panel__grid">
                {(
                  [
                    ["Reward Points", selectedStats.rewardPoints, ""],
                    ["Ewallet Amt", `₹${selectedStats.ewalletAmt}`, ""],
                    [
                      "Unpaid Amt",
                      `₹${selectedStats.unpaidAmt}`,
                      selectedStats.unpaidAmt > 0 ? "danger" : "",
                    ],
                    ["Assign Discount", `${selectedStats.assignDiscount}%`, ""],
                    ["Disc. Validity", selectedStats.discountValidity, ""],
                    ["Membership", selectedStats.membership, ""],
                    [
                      "No Show",
                      selectedStats.noShow,
                      selectedStats.noShow > 0 ? "danger" : "",
                    ],
                    [
                      "Cancelled",
                      selectedStats.cancelled,
                      selectedStats.cancelled > 0 ? "danger" : "",
                    ],
                    ["Total Visits", selectedStats.totalVisit, ""],
                    ["Last Visit", selectedStats.lastVisit, ""],
                    [
                      "Total Revenue",
                      `₹${selectedStats.totalRevenue?.toLocaleString()}`,
                      "info",
                    ],
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    paddingTop: 10,
                    borderTop: "1px solid #e5e7eb",
                    marginTop: 12,
                  }}
                >
                  {selectedStats.notes && (
                    <div>
                      <div className="info-cell__label">📝 Notes</div>
                      <div style={{ fontSize: 12, color: "#374151" }}>
                        {selectedStats.notes}
                      </div>
                    </div>
                  )}
                  {selectedStats.staffAlert && (
                    <div>
                      <div
                        className="info-cell__label"
                        style={{ color: "#ef4444" }}
                      >
                        🔔 Staff Alert
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#ef4444",
                          fontWeight: 600,
                        }}
                      >
                        {selectedStats.staffAlert}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {hasErr("no_rows") && (
            <div
              style={{
                fontSize: 11,
                color: "#ef4444",
                fontWeight: 600,
                padding: "5px 10px",
                background: "#fef2f2",
                borderRadius: 6,
                marginBottom: 8,
              }}
            >
              ⚠️ Add at least one service or package before saving.
            </div>
          )}

          {/* ── Services table ────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.6fr 1.1fr 0.9fr 0.7fr 0.9fr 32px",
              gap: 6,
              padding: "6px 10px",
              background: "#f9fafb",
              borderRadius: "8px 8px 0 0",
              fontSize: 11,
              fontWeight: 700,
              color: "#6b7280",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div>SERVICE</div>
            <div>STAFF</div>
            <div>TIME</div>
            <div>PRICE</div>
            <div>QTY</div>
            <div>TOTAL</div>
            <div></div>
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
                staff: hasErr(`svc_${i}_staff`),
                price: hasErr(`svc_${i}_price`),
                qty: hasErr(`svc_${i}_qty`),
              }}
            />
          ))}

          {/* ── Packages table ────────────────────────────────────────────── */}
          {packageRows.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                  gap: 6,
                  padding: "6px 10px",
                  marginTop: 12,
                  background: "#fef3c7",
                  borderRadius: "8px 8px 0 0",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#92400e",
                  borderBottom: "1px solid #fde68a",
                }}
              >
                <div>PACKAGE</div>
                <div>PRICE</div>
                <div>QTY</div>
                <div>TOTAL</div>
                <div></div>
              </div>
              {packageRows.map((row) => (
                <div
                  key={row.tempId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                    gap: 6,
                    padding: "8px 10px",
                    borderBottom: "1px solid #fef3c7",
                    alignItems: "center",
                    background: "#fffbeb",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {row.packageName}
                  </div>
                  <input
                    readOnly
                    value={row.price}
                    style={{
                      padding: "5px 8px",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      background: "#f9fafb",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.qty}
                    style={{
                      padding: "5px 8px",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setPackageRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId
                            ? { ...r, qty, total: r.price * qty }
                            : r,
                        ),
                      );
                    }}
                  />
                  <input
                    readOnly
                    value={row.total}
                    style={{
                      padding: "5px 8px",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      background: "#f9fafb",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={() =>
                      setPackageRows((r) =>
                        r.filter((x) => x.tempId !== row.tempId),
                      )
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: 15,
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Products table ────────────────────────────────────────────── */}
          {productRows.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                  gap: 6,
                  padding: "6px 10px",
                  marginTop: 12,
                  background: "#ede9fe",
                  borderRadius: "8px 8px 0 0",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#5b21b6",
                  borderBottom: "1px solid #ddd6fe",
                }}
              >
                <div>PRODUCT</div>
                <div>PRICE</div>
                <div>QTY</div>
                <div>TOTAL</div>
                <div></div>
              </div>
              {productRows.map((row) => (
                <div
                  key={row.tempId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                    gap: 6,
                    padding: "8px 10px",
                    borderBottom: "1px solid #ede9fe",
                    alignItems: "center",
                    background: "#f5f3ff",
                  }}
                >
                  <input
                    placeholder="Product name"
                    value={row.productName}
                    style={{
                      padding: "5px 8px",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    onChange={(e) =>
                      setProductRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId
                            ? { ...r, productName: e.target.value }
                            : r,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.price || ""}
                    placeholder="0"
                    style={{
                      padding: "5px 8px",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    onChange={(e) => {
                      const price = Math.max(
                        0,
                        parseFloat(e.target.value) || 0,
                      );
                      setProductRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId
                            ? { ...r, price, total: price * r.qty }
                            : r,
                        ),
                      );
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.qty}
                    style={{
                      padding: "5px 8px",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setProductRows((rows) =>
                        rows.map((r) =>
                          r.tempId === row.tempId
                            ? { ...r, qty, total: r.price * qty }
                            : r,
                        ),
                      );
                    }}
                  />
                  <input
                    readOnly
                    value={row.total.toFixed(2)}
                    style={{
                      padding: "5px 8px",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      background: "#f9fafb",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={() =>
                      setProductRows((r) =>
                        r.filter((x) => x.tempId !== row.tempId),
                      )
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: 15,
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Action buttons ────────────────────────────────────────────── */}
          <div
            style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 20 }}
          >
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
            <Button
              variant="dark"
              size="sm"
              onClick={() => setShowPkgModal(true)}
            >
              + Add Package
            </Button>
            <Button
              variant="dark"
              size="sm"
              onClick={() =>
                setProductRows((r) => [
                  ...r,
                  {
                    tempId: "pr_" + Date.now(),
                    id: "",
                    productName: "",
                    price: 0,
                    qty: 1,
                    total: 0,
                  },
                ])
              }
            >
              + Add Product
            </Button>
          </div>

          {/* ── Extras grid ───────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6,1fr)",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: "Reward Points",
                el: (
                  <select
                    style={{ ...formInput, padding: "5px 8px" }}
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(e.target.value)}
                  >
                    {REWARD_POINTS_OPTIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: "Ex Charges",
                el: (
                  <input
                    type="number"
                    min={0}
                    style={{ ...formInput, padding: "5px 8px" }}
                    value={exCharges || ""}
                    placeholder="0"
                    onChange={(e) => posNum(e.target.value, setExCharges)}
                  />
                ),
              },
              {
                label: "Tip",
                el: (
                  <input
                    type="number"
                    min={0}
                    style={{ ...formInput, padding: "5px 8px" }}
                    value={tip || ""}
                    placeholder="0"
                    onChange={(e) => posNum(e.target.value, setTip)}
                  />
                ),
              },
              {
                label: "Discount",
                el: (
                  <input
                    type="number"
                    min={0}
                    style={{ ...formInput, padding: "5px 8px" }}
                    value={discount || ""}
                    placeholder="0"
                    onChange={(e) => posNum(e.target.value, setDiscount)}
                  />
                ),
              },
              {
                label: "Discount Type",
                el: (
                  <select
                    style={{ ...formInput, padding: "5px 8px" }}
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as DiscountType)
                    }
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
                    type="number"
                    min={0}
                    style={{ ...formInput, padding: "5px 8px" }}
                    value={gst || ""}
                    placeholder="0"
                    onChange={(e) => posNum(e.target.value, setGst)}
                  />
                ),
              },
            ].map(({ label, el }) => (
              <div key={label}>
                <label style={fieldLabel}>{label}</label>
                {el}
              </div>
            ))}
          </div>

          {/* ── Payment + Totals ──────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Payment Method</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["Cash", "Card", "UPI"] as PaymentMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setPayMode(m);
                        setValidationErrors((ev) =>
                          ev.filter((x) => x !== "paymode"),
                        );
                      }}
                      style={{
                        padding: "5px 16px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        cursor: "pointer",
                        border:
                          payMode === m
                            ? "2px solid #1f2937"
                            : "1px solid #e5e7eb",
                        background: payMode === m ? "#1f2937" : "#fff",
                        color: payMode === m ? "#fff" : "#374151",
                        transition: "all 0.15s",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {hasErr("paymode") && (
                  <span style={errText}>Please select a payment method</span>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Adjust Payment</label>
                <input
                  type="number"
                  min={0}
                  style={{ ...formInput, padding: "5px 8px" }}
                  value={adjustPayment || ""}
                  placeholder="0"
                  onChange={(e) => posNum(e.target.value, setAdjustPayment)}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Coupon Code</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={{ ...formInput, padding: "5px 8px", flex: 1 }}
                    placeholder="SAVE10, FLAT50, NEW20"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  />
                  <Button variant="dark" size="sm" onClick={handleApplyCoupon}>
                    Apply
                  </Button>
                </div>
                {couponApplied && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#22c55e",
                      marginTop: 3,
                      display: "block",
                    }}
                  >
                    ✓ "{couponApplied}" applied — ₹{couponDiscount} off
                  </span>
                )}
                {couponError && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#ef4444",
                      marginTop: 3,
                      display: "block",
                    }}
                  >
                    {couponError}
                  </span>
                )}
              </div>

              <textarea
                style={{
                  ...formInput,
                  padding: "6px 8px",
                  resize: "vertical",
                  minHeight: 60,
                  fontFamily: "inherit",
                }}
                placeholder="Enter Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
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

        <div className="appt-drawer-footer">
          <Button variant="dark" fullWidth onClick={handleSave}>
            {isEditMode ? "Update Appointment" : "Save Appointment"}
          </Button>
        </div>
      </div>

      {/* ── Package picker modal ──────────────────────────────────────────── */}
      {showPkgModal && (
        <div
          className="pkg-picker-overlay"
          onClick={() => setShowPkgModal(false)}
        >
          <div
            className="pkg-picker-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pkg-picker-content__header">
              <h3>Select Package</h3>
              <button
                onClick={() => setShowPkgModal(false)}
                className="btn-close"
              >
                ✕
              </button>
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
