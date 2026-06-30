import React, { useState, useCallback, useEffect, useRef } from "react";
import { currencySymbol } from "../../../../utils/currency";
import { useAppSelector, useAppDispatch } from "../../../../hooks/useAppRedux";
import { useAppointment }    from "../../hooks/useAppointment";
import { usePayment }        from "../../hooks/usePayment";
import { useCoupon }         from "../../hooks/useCoupon";
import { usePackageSessions } from "../../hooks/usePackageSessions";
import { useServices }       from "../../hooks/useServices";
import { useLazyListPackagesQuery, useLazyListPackageTemplatesQuery } from "../../../../services/api/endpoints/packages.endpoints";
import { fetchProductsThunk } from "../../../../middleware/catalog/products.thunk";
import { fetchMembershipsThunk } from "../../../../middleware/membership/membership.thunk";
import { setPackagesList } from "../../../../store/schedulerSlice";
import { computeTotals }     from "../../utils/totalsUtils";
import { computePointsEarned, computeEWalletCredit, EWALLET_REDEEM_MINIMUM } from "../../utils/paymentUtils";
import {
  selectPackagesList, selectProductsList, selectMembershipsList,
} from "../../../../store/selectors/scheduler.selectors";
import {
  PersonFill, Scissors, TagFill, FileText,
  BellFill, PencilFill,
} from "react-bootstrap-icons";
import { ClientPanel }   from "./ClientPanel";
import { ServicesPanel } from "./ServicesPanel";
import { PaymentPanel }  from "./PaymentPanel";
import TotalsPanel       from "./TotalsPanel";
import PaymentButton     from "../shared/PaymentButton";
import { printReceipt }  from "./ViewBillModal";
import { store }         from "../../../../store/store";
import "../../styles/AppointmentModal.scss";

import type {
  Booking, Client, ClientStats,
  ServiceItem, PackageItem, ProductItem, MembershipItem,
  DiscountType, SingleMethod, SplitEntry,
} from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  salonId?: string;
  existingBooking?: Booking | null;
  defaultDate?: string;
  defaultTime?: string;
  defaultStaffId?: string;
  defaultClientId?: string;
  defaultClientName?: string;
  defaultClientPhone?: string;
  onRefresh?: () => void;
  onCancelBooking?: (b: Booking) => void;
  onDeleteBooking?: (b: Booking) => void;
}

function nextQuarterHour(): string {
  const now = new Date();
  let h = now.getHours();
  let m = Math.ceil(now.getMinutes() / 15) * 15;
  if (m === 60) { m = 0; h = (h + 1) % 24; }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function emptyService(staffId?: string, time?: string): ServiceItem {
  return { id: "", service: "", staff: "", staffId: staffId || "", time: time || nextQuarterHour(), price: 0, qty: 1, total: 0, duration: 30 };
}

function timeToMins(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const AppointmentModal: React.FC<Props> = ({
  isOpen, onClose, salonId,
  existingBooking, defaultDate, defaultTime, defaultStaffId,
  defaultClientId, defaultClientName, defaultClientPhone,
  onRefresh, onCancelBooking, onDeleteBooking,
}) => {
  const dispatch = useAppDispatch();

  // Always fetch services + clients when modal opens
  useServices(salonId);

  // ── Lazy on-demand fetching ───────────────────────────────────────────────
  const [triggerPackages, { data: packagesData }]       = useLazyListPackagesQuery();
  const [triggerTemplates, { data: packageTemplatesRaw }] = useLazyListPackageTemplatesQuery();
  const pkgRequested  = useRef(false);
  const prodRequested = useRef(false);
  const memRequested  = useRef(false);

  // In edit mode, pre-fetch data for item types that already exist on the booking
  useEffect(() => {
    if (existingBooking?.packageItems?.length && !pkgRequested.current) {
      pkgRequested.current = true;
      triggerPackages({});
      triggerTemplates();
    }
    if ((existingBooking as any)?.productItems?.length && !prodRequested.current) {
      prodRequested.current = true;
      dispatch(fetchProductsThunk());
    }
    if ((existingBooking as any)?.membershipItems?.length && !memRequested.current) {
      memRequested.current = true;
      dispatch(fetchMembershipsThunk());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Map package API data → scheduler packagesList when it arrives
  useEffect(() => {
    const templates = packageTemplatesRaw ?? [];
    const fromCatalog = (packagesData?.items || []).map((p: any) => ({
      id: String(p.id || ""), name: p.name || "", price: p.basePrice || 0, services: [] as string[],
    }));
    const fromTemplates = templates.map((t: any) => ({
      id: String(t.id || ""), name: t.name || "", price: t.basePrice || 0,
      services: (t.services || []).map((s: any) => s.serviceName),
    }));
    const templateNames = new Set(fromTemplates.map((t: any) => t.name.toLowerCase()));
    const merged = [...fromTemplates, ...fromCatalog.filter((c: any) => !templateNames.has(c.name.toLowerCase()))];
    if (merged.length > 0) dispatch(setPackagesList(merged));
  }, [packagesData, packageTemplatesRaw, dispatch]);

  const availablePackages    = useAppSelector(selectPackagesList);
  const availableProducts    = useAppSelector(selectProductsList);
  const availableMemberships = useAppSelector(selectMembershipsList);
  const blockedTimes  = useAppSelector((s: any) => s.scheduler?.blockedTimes ?? []);
  const schedulerStaff = useAppSelector((s: any) => s.scheduler?.staffList ?? []);
  const currentSalon  = useAppSelector((s: any) => s.salon?.currentSalon ?? null);

  // ── Client ───────────────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    existingBooking
      ? (existingBooking.clientId
          ? { id: String(existingBooking.clientId), name: existingBooking.clientName || "", phone: existingBooking.clientPhone || "", eWallet: 0 }
          : { id: "walk-in", name: "Walk-In", phone: "", eWallet: 0 })
      : defaultClientId
        ? { id: defaultClientId, name: defaultClientName || "", phone: defaultClientPhone || "", eWallet: 0 }
        : null
  );
  const [clientStats, setClientStats]       = useState<ClientStats | null>(null);

  // ── Date ─────────────────────────────────────────────────────────────────
  const [calDate, setCalDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));

  // ── Line items ───────────────────────────────────────────────────────────
  const [serviceRows, setServiceRows]       = useState<ServiceItem[]>(() =>
    existingBooking
      ? (existingBooking.services ?? [])
      : [emptyService(defaultStaffId, defaultTime)]
  );
  const [packageRows, setPackageRows]       = useState<PackageItem[]>(existingBooking?.packageItems ?? []);
  const [productRows, setProductRows]       = useState<ProductItem[]>((existingBooking as any)?.productItems ?? []);
  const [membershipRows, setMembershipRows] = useState<MembershipItem[]>((existingBooking as any)?.membershipItems ?? []);

  // ── Charges / Discounts ───────────────────────────────────────────────────
  const [discountType, setDiscountType]   = useState<DiscountType>(existingBooking?.discountType || "Percentage (%)");
  const [discountValue, setDiscountValue] = useState(existingBooking?.discount ?? 0);
  const [gstPercent]                      = useState(existingBooking?.gst ?? 0);
  const [exCharges, setExCharges]         = useState(existingBooking?.exCharges ?? 0);
  const [tip, setTip]                     = useState(existingBooking?.tipAmount ?? 0);
  const [focusedField, setFocusedField]   = useState<"exCharges" | "tip" | "discountValue" | null>(null);

  // ── Notes / Alert ─────────────────────────────────────────────────────────
  const [notes, setNotes]           = useState(existingBooking?.notes ?? "");
  const [staffAlert, setStaffAlert] = useState(existingBooking?.staffAlert ?? "");

  // ── Payment state ────────────────────────────────────────────────────────
  const [useEWallet, setUseEWallet]             = useState(false);
  const [eWalletAmt, setEWalletAmt]             = useState(0);
  const [paymentMode, setPaymentMode]           = useState<"single" | "split">("single");
  const [singleMethod, setSingleMethod]         = useState<SingleMethod | null>(null);
  const [splitEntries, setSplitEntries]         = useState<SplitEntry[]>([
    { method: "Cash", amount: "" }, { method: "Card", amount: "" },
  ]);
  const [partialAmtInput, setPartialAmtInput]   = useState("");
  const [includeClearDue, setIncludeClearDue]   = useState(false);
  const [printAfterPayment, setPrintAfterPayment] = useState(false);
  const [payMethodError, setPayMethodError]     = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // ── Walk-in → Add Client gate ─────────────────────────────────────────────
  const [triggerAddForm, setTriggerAddForm]   = useState(false);
  const [walkInPayError, setWalkInPayError]   = useState("");
  const clientSectionRef = useRef<HTMLDivElement>(null);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { save, isSaving, error: saveError, apiAppointmentId } = useAppointment();
  const { completePayment, isProcessing, payError }            = usePayment();
  const coupon = useCoupon(salonId);
  usePackageSessions(selectedClient?.id ?? null);

  // ── Totals ───────────────────────────────────────────────────────────────
  const totals = computeTotals({
    serviceRows, packageRows, productRows, membershipRows,
    discountType, discountValue, gstPercent, exCharges, tip,
    couponDiscount: coupon.discount,
    eWalletUsed: useEWallet ? eWalletAmt : 0,
  });

  const alreadyPaidAmount   = existingBooking?.payingNow ?? 0;
  // For partial bookings, trust the API's dueAmount directly — payingNow can be unreliable
  const remainingDue = (existingBooking?.paymentStatus === "Partial" && (existingBooking?.dueAmount ?? 0) > 0)
    ? existingBooking.dueAmount
    : Math.max(0, totals.effectiveTotal - alreadyPaidAmount);
  // Exclude current appointment's due so "Clear Pending Due" only shows OTHER unpaid appointments
  const priorDueAmt         = Math.max(0, (clientStats?.unpaidAmt ?? 0) - remainingDue);
  const previewPoints       = computePointsEarned(totals.effectiveTotal);
  const previewWalletCredit = computeEWalletCredit(previewPoints);

  // ── Sync eWalletAmt ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!useEWallet) { setEWalletAmt(0); return; }
    const balance = clientStats?.ewalletAmt ?? 0;
    if (balance < EWALLET_REDEEM_MINIMUM) { setUseEWallet(false); setEWalletAmt(0); return; }
    setEWalletAmt(Math.min(balance, totals.grandTotal));
  }, [useEWallet, clientStats, totals.grandTotal]);

  // ── Inline validation errors ──────────────────────────────────────────────
  const [clientError,    setClientError]    = useState("");
  const [noItemsError,   setNoItemsError]   = useState(false);
  const [blockTimeError, setBlockTimeError] = useState("");
  const [svcErrors,      setSvcErrors]      = useState<Array<{ service?: boolean; staff?: boolean; time?: boolean }>>([]);
  const [pkgErrors,      setPkgErrors]      = useState<boolean[]>([]);
  const [prodErrors,     setProdErrors]     = useState<boolean[]>([]);
  const [memErrors,      setMemErrors]      = useState<boolean[]>([]);

  useEffect(() => {
    if (selectedClient && selectedClient.id !== "walk-in") {
      setClientError("");
      setWalkInPayError("");
      setTriggerAddForm(false);
    }
  }, [selectedClient]);

  // Auto-open payment section for partial-paid appointments so user can pay the remaining due
  useEffect(() => {
    if (isOpen && existingBooking?.paymentStatus === "Partial") {
      setShowPaymentSection(true);
    } else if (!isOpen) {
      setShowPaymentSection(false);
    }
  }, [isOpen, existingBooking?.id, existingBooking?.paymentStatus]);

  useEffect(() => {
    if (!noItemsError) return;
    const hasAny =
      serviceRows.some((r) => r.service.trim()) ||
      packageRows.some((r) => (r as any).packageId) ||
      productRows.some((r) => (r as any).productId) ||
      membershipRows.some((r) => (r as any).membershipId);
    if (hasAny) setNoItemsError(false);
  }, [serviceRows, packageRows, productRows, membershipRows, noItemsError]);

  useEffect(() => {
    if (blockTimeError) setBlockTimeError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceRows, calDate]);

  function validate(): boolean {
    let ok = true;
    if (!selectedClient) { setClientError("Please select a client or choose Walk-In"); ok = false; }
    else setClientError("");

    const filledSvc = serviceRows.filter((r) => r.service.trim());
    const filledPkg = packageRows.filter((r) => (r as any).packageId);
    const filledPrd = productRows.filter((r) => (r as any).productId);
    const filledMem = membershipRows.filter((r) => (r as any).membershipId);
    const hasAnyFilled = filledSvc.length > 0 || filledPkg.length > 0 || filledPrd.length > 0 || filledMem.length > 0;

    if (!hasAnyFilled) {
      setNoItemsError(true);
      setSvcErrors([]); setPkgErrors([]); setProdErrors([]); setMemErrors([]);
      return false;
    }
    setNoItemsError(false);

    const se = serviceRows.map((r) => ({
      service: !r.service.trim(),
      staff:   !!r.service.trim() && !r.staffId,
      time:    !!r.service.trim() && !r.time,
    }));
    setSvcErrors(se);
    if (se.some((e) => e.service || e.staff || e.time)) ok = false;

    const pe = packageRows.map((r) => !(r as any).packageId);
    setPkgErrors(pe);
    if (pe.some(Boolean)) ok = false;

    const pre = productRows.map((r) => !(r as any).productId);
    setProdErrors(pre);
    if (pre.some(Boolean)) ok = false;

    const me = membershipRows.map((r) => !(r as any).membershipId);
    setMemErrors(me);
    if (me.some(Boolean)) ok = false;

    // ── Block time conflict check ─────────────────────────────────────────
    setBlockTimeError("");
    const rowsToCheck = serviceRows.filter((r) => r.service.trim() && r.staffId && r.time);
    for (const row of rowsToCheck) {
      const svcStart = timeToMins(row.time);
      const svcEnd   = svcStart + (row.duration || 30);
      const conflict = (blockedTimes as any[]).find((bt) => {
        if (String(bt.staffId) !== String(row.staffId)) return false;
        if (bt.date !== calDate) return false;
        const btStart = timeToMins(bt.startTime);
        const btEnd   = timeToMins(bt.endTime);
        return svcStart < btEnd && svcEnd > btStart;
      });
      if (conflict) {
        const staffName =
          (schedulerStaff as any[]).find((s) => String(s.id) === String(row.staffId))?.name ||
          "This staff member";
        const reasonPart = conflict.reason ? ` (${conflict.reason})` : "";
        setBlockTimeError(
          `${staffName} is blocked from ${conflict.startTime} to ${conflict.endTime} on this date${reasonPart}. Please choose a different time or staff.`
        );
        ok = false;
        break;
      }
    }

    return ok;
  }

  function buildSavePayload() {
    const isWalkIn = !selectedClient || selectedClient.id === "walk-in";
    return {
      booking: {
        clientId:      isWalkIn ? undefined : selectedClient?.id,
        clientName:    isWalkIn ? "Walk-In" : (selectedClient?.name || "Walk-In"),
        clientPhone:   isWalkIn ? "" : (selectedClient?.phone || ""),
        staffId:       serviceRows[0]?.staffId || defaultStaffId || "",
        date:          calDate,
        startTime:     serviceRows[0]?.time || defaultTime || "10:00",
        paymentStatus: (existingBooking?.paymentStatus || "Unpaid") as any,
        grandTotal:    totals.grandTotal,
        discount:      discountValue,
        discountType,
        exCharges,
        tipAmount:     tip,
        gst:           gstPercent,
      } as Partial<Booking>,
      serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId,
      clientId:        selectedClient?.id ?? null,
      existingBooking: existingBooking ?? null,
    };
  }

  const handleSaveAndPay = useCallback(async () => {
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (id) { onRefresh?.(); onClose(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, gstPercent, totals,
      onRefresh, onClose]);

  const handleUpdate = useCallback(async () => {
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (id) { onRefresh?.(); onClose(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, gstPercent, totals,
      onRefresh, onClose]);

  // ── Pay ──────────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    // Validate payment method first — stop completely if not selected
    if (paymentMode === "single" && !singleMethod) {
      setPayMethodError(true);
      return; // ← hard stop, no processing
    }
    setPayMethodError(false);

    const apptId = existingBooking?.id ?? apiAppointmentId;
    if (!apptId) return;

    const ok = await completePayment({
      appointmentId: apptId,
      clientId:      selectedClient?.id,
      salonId,
      grandTotal:        totals.grandTotal,
      effectiveTotal:    totals.effectiveTotal,
      alreadyPaidAmount,
      eWalletAmt,
      couponDiscount:    coupon.discount,
      couponApplied:     coupon.applied,
      paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet,
    });
    if (ok) {
      if (printAfterPayment) {
        const freshBooking = store.getState().scheduler.bookings.find(
          (b: any) => String(b.id) === String(apptId)
        );
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon);
      }
      onRefresh?.();
      onClose();
    }
  }, [
    completePayment, existingBooking, apiAppointmentId,
    selectedClient, salonId, totals, alreadyPaidAmount,
    eWalletAmt, coupon, paymentMode, singleMethod, splitEntries,
    partialAmtInput, includeClearDue, priorDueAmt, useEWallet,
    onRefresh, onClose, printAfterPayment, schedulerStaff, currentSalon,
  ]);

  if (!isOpen) return null;

  const isCancelledBooking = existingBooking?.status?.toLowerCase() === "cancelled";
  const isPartialBooking   = existingBooking?.paymentStatus === "Partial";
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const isPaymentFrozen = existingBooking?.paymentStatus === "Paid"
    || (existingBooking?.paymentStatus !== "Partial"
        && alreadyPaidAmount > 0
        && alreadyPaidAmount >= totals.effectiveTotal);
  const parsedPartial   = parseFloat(partialAmtInput);
  const isPartialEntry  = !isNaN(parsedPartial) && parsedPartial > 0 && parsedPartial < remainingDue;

  // Disable pay button when no method selected in single mode
  const isPayDisabled = isPaymentFrozen
    || isProcessing
    || (paymentMode === "single" && !singleMethod);

  const confirmLabel = isPaymentFrozen
    ? "Already Paid"
    : isPartialEntry
      ? `Confirm Partial — ${currencySymbol}${parsedPartial.toFixed(2)} (${currencySymbol}${(remainingDue - parsedPartial).toFixed(2)} due)`
      : includeClearDue
        ? `Confirm & Pay — ${currencySymbol}${(remainingDue + priorDueAmt).toFixed(2)} (incl. ${currencySymbol}${priorDueAmt.toFixed(2)} due)`
        : `Confirm & Pay — ${currencySymbol}${remainingDue.toFixed(2)}`;

  return (
    <div className="appt-drawer-overlay" onClick={onClose}>
      <div className="appt-drawer-content" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="appt-drawer-header">
          <button className="btn-close-drawer" onClick={onClose}>×</button>
          <h2>{existingBooking ? "Edit Appointment" : "New Appointment"}</h2>
          {existingBooking && (
            isCancelledBooking ? (
              <span className="appt-header-status-badge" style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}>
                CANCELLED
              </span>
            ) : (
              <span className={`appt-header-status-badge appt-header-status-badge--${
                existingBooking.paymentStatus === "Paid" ? "paid"
                : existingBooking.paymentStatus === "Partial" ? "partial"
                : "unpaid"
              }`}>
                {existingBooking.paymentStatus}
              </span>
            )
          )}
          {/* Three-dot menu — hidden for partial-payment appointments */}
          {existingBooking && !isPartialBooking && (
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button
                onClick={() => setHeaderMenuOpen((v) => !v)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 20, fontWeight: 900, color: "#6b7280",
                  padding: "0 6px", lineHeight: 1, borderRadius: 4,
                }}
                title="More options"
              >
                ⋮
              </button>
              {headerMenuOpen && (
                <>
                  {/* backdrop to close on outside click */}
                  <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setHeaderMenuOpen(false)} />
                  <div style={{
                    position: "absolute", top: "110%", right: 0,
                    background: "#fff", border: "1px solid #e5e7eb",
                    borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
                    zIndex: 9999, minWidth: 190, padding: "4px 0",
                  }}>
                    {!isCancelledBooking && existingBooking?.paymentStatus !== "Partial" && onCancelBooking && (
                      <button
                        style={apptMenuItemStyle}
                        onClick={() => { setHeaderMenuOpen(false); onCancelBooking(existingBooking); onClose(); }}
                      >
                        🚫 Cancel Appointment
                      </button>
                    )}
                    {onDeleteBooking && (
                      <button
                        style={{ ...apptMenuItemStyle, color: "#ef4444" }}
                        onClick={() => { setHeaderMenuOpen(false); onDeleteBooking(existingBooking); onClose(); }}
                      >
                        🗑️ Delete Appointment
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="appt-drawer-body" style={isCancelledBooking ? { pointerEvents: "none", opacity: 0.55, userSelect: "none" } : undefined}>

          {/* 1. Client */}
          <div className="appt-section" ref={clientSectionRef}>
            <div className="appt-section__title"><PersonFill size={15} /> Client</div>
            <ClientPanel
              salonId={salonId}
              calDate={calDate}
              onDateChange={setCalDate}
              selectedClientId={selectedClient?.id ?? null}
              initialName={existingBooking?.clientName}
              fallbackUnpaidAmt={existingBooking?.dueAmount ?? 0}
              onSelectClient={setSelectedClient}
              onClearClient={() => { setSelectedClient(null); setClientStats(null); }}
              onStatsLoaded={setClientStats}
              historyUrlBase="/dashboard/clients"
              error={clientError || walkInPayError}
              defaultPhone={!existingBooking && !selectedClient ? defaultClientPhone : undefined}
              openAddForm={triggerAddForm}
            />
          </div>

          {/* 2. Services & Items */}
          <div className="appt-section" style={isPartialBooking ? { pointerEvents: "none", opacity: 0.7 } : undefined}>
            <div className="appt-section__title"><Scissors size={15} /> Services &amp; Items</div>
            {noItemsError && (
              <div className="services-no-items-error">
                Add at least one service, package, product or membership before saving.
              </div>
            )}
            <ServicesPanel
              serviceRows={serviceRows}
              onUpdateService={(i, field, value) => setServiceRows((rows) => rows.map((x, idx) => idx === i ? { ...x, [field as string]: value } : x))}
              onRemoveService={(i) => setServiceRows((rows) => rows.filter((_, idx) => idx !== i))}
              onAddService={() => setServiceRows((rows) => {
                const last = rows[rows.length - 1];
                const nextTime = last?.time
                  ? (() => {
                      const [h, m] = last.time.split(":").map(Number);
                      const total = h * 60 + m + (last.duration || 30);
                      return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
                    })()
                  : rows[0]?.time;
                return [...rows, emptyService("", nextTime)];
              })}
              packageRows={packageRows}
              onUpdatePackage={(i, r) => setPackageRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
              onRemovePackage={(i) => setPackageRows((rows) => rows.filter((_, idx) => idx !== i))}
              onAddPackage={() => {
                if (!pkgRequested.current) {
                  pkgRequested.current = true;
                  triggerPackages({});
                  triggerTemplates();
                }
                setPackageRows((rows) => [...rows, { id: "", packageId: "", packageName: "", price: 0, qty: 1, discount: 0, total: 0, staffId: defaultStaffId || "", time: serviceRows[0]?.time || defaultTime || "" }]);
              }}
              productRows={productRows}
              onUpdateProduct={(i, r) => setProductRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
              onRemoveProduct={(i) => setProductRows((rows) => rows.filter((_, idx) => idx !== i))}
              onAddProduct={() => {
                if (!prodRequested.current) {
                  prodRequested.current = true;
                  dispatch(fetchProductsThunk());
                }
                setProductRows((rows) => [...rows, { id: "", productId: "", productName: "", price: 0, qty: 1, discount: 0, total: 0, staffId: defaultStaffId || "", time: serviceRows[0]?.time || defaultTime || "" }]);
              }}
              membershipRows={membershipRows}
              onUpdateMembership={(i, r) => setMembershipRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
              onRemoveMembership={(i) => setMembershipRows((rows) => rows.filter((_, idx) => idx !== i))}
              onAddMembership={() => {
                if (!memRequested.current) {
                  memRequested.current = true;
                  dispatch(fetchMembershipsThunk());
                }
                setMembershipRows((rows) => [...rows, { id: "", membershipId: "", membershipName: "", price: 0, qty: 1, total: 0, staffId: defaultStaffId || "", time: serviceRows[0]?.time || defaultTime || "" }]);
              }}
              availablePackages={availablePackages}
              availableProducts={availableProducts}
              availableMemberships={availableMemberships}
              frozen={false}
              svcErrors={svcErrors}
              pkgErrors={pkgErrors}
              prodErrors={prodErrors}
              memErrors={memErrors}
              onClearSvcError={(i: number, field: string) => setSvcErrors((prev) => {
                const n = [...prev];
                if (n[i]) n[i] = { ...n[i], [field]: false };
                return n;
              })}
            />
          </div>

          {/* 3. Charges & Discounts */}
          {!showPaymentSection && (
            <div className="appt-section">
              <div className="appt-section__title"><TagFill size={15} /> Charges &amp; Discounts</div>
              <div className="charges-grid">
                <div className="field-group">
                  <label>Reward Points</label>
                  <select className="fg-input" value={clientStats?.rewardPoints ?? "None"} disabled>
                    <option>{clientStats?.rewardPoints ?? "None"}</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Ex Charges</label>
                  <input className="fg-input" type="number" min={0}
                    value={focusedField === "exCharges" && exCharges === 0 ? "" : exCharges}
                    onFocus={() => setFocusedField("exCharges")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setExCharges(e.target.value === "" ? 0 : Number(e.target.value))} />
                </div>
                <div className="field-group">
                  <label>Tip</label>
                  <input className="fg-input" type="number" min={0}
                    value={focusedField === "tip" && tip === 0 ? "" : tip}
                    onFocus={() => setFocusedField("tip")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setTip(e.target.value === "" ? 0 : Number(e.target.value))} />
                </div>
                <div className="field-group">
                  <label>Svc Discount</label>
                  <input className="fg-input" type="number" min={0}
                    value={focusedField === "discountValue" && discountValue === 0 ? "" : discountValue}
                    onFocus={() => setFocusedField("discountValue")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setDiscountValue(e.target.value === "" ? 0 : Number(e.target.value))} />
                </div>
                <div className="field-group">
                  <label>Disc. Type</label>
                  <select className="fg-input" value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                    <option value="Percentage (%)">Percentage (%)</option>
                    <option value="Flat (₹)">Flat ({currencySymbol})</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4. Payment & Notes */}
          {!showPaymentSection && (
            <div className="appt-section">
              <div className="appt-section__title"><FileText size={15} /> Payment &amp; Notes</div>
              <div className="pn-layout">
                <div className="pn-layout__left">
                  <div className="field-group">
                    <label><BellFill size={13} /> Staff Alert</label>
                    <textarea className="fg-textarea" rows={2} placeholder="e.g. Client has allergy to chemicals"
                      value={staffAlert} onChange={(e) => setStaffAlert(e.target.value)} />
                  </div>
                  <div className="field-group" style={{ marginTop: 10 }}>
                    <label>Notes</label>
                    <textarea className="fg-textarea" rows={3} placeholder="Enter appointment notes"
                      value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
                <div className="pn-layout__right">
                  <TotalsPanel
                    subtotal={totals.subtotal}
                    serviceTotal={serviceRows.reduce((s, r) => s + r.total, 0)}
                    packageTotal={packageRows.reduce((s, r) => s + r.total, 0)}
                    productTotal={productRows.reduce((s, r) => s + r.total, 0)}
                    membershipTotal={membershipRows.reduce((s, r) => s + r.total, 0)}
                    exCharges={exCharges}
                    discount={discountValue}
                    discountType={discountType}
                    totalDiscount={totals.totalDisc}
                    tip={tip}
                    alreadyPaid={alreadyPaidAmount}
                    dueAmount={remainingDue}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Payment section */}
          {showPaymentSection && (
            <div className="appt-section" ref={paymentSectionRef}>
              <div className="appt-section__title" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Amount to Pay</span>
                {alreadyPaidAmount > 0 ? (
                  <span>Paid {currencySymbol}{alreadyPaidAmount.toFixed(2)} &nbsp;·&nbsp; Remaining {currencySymbol}{remainingDue.toFixed(2)}</span>
                ) : (
                  <span>{currencySymbol}{totals.effectiveTotal.toFixed(2)}</span>
                )}
              </div>
              <PaymentPanel
                effectiveTotal={totals.effectiveTotal}
                remainingDue={remainingDue}
                alreadyPaid={alreadyPaidAmount}
                grandTotal={totals.grandTotal}
                eWalletBalance={clientStats?.ewalletAmt ?? 0}
                useEWallet={useEWallet}
                eWalletAmt={eWalletAmt}
                onToggleEWallet={setUseEWallet}
                couponInput={coupon.input}
                onCouponInputChange={coupon.setInput}
                onApplyCoupon={() => coupon.apply(totals.subtotal)}
                couponDiscount={coupon.discount}
                couponMessage={coupon.message}
                couponError={coupon.error}
                couponLoading={coupon.loading}
                paymentMode={paymentMode}
                onSetPaymentMode={setPaymentMode}
                singleMethod={singleMethod}
                onSetSingleMethod={setSingleMethod}
                splitEntries={splitEntries}
                onSetSplitEntries={setSplitEntries}
                payMethodError={payMethodError}
                partialAmtInput={partialAmtInput}
                onSetPartialAmt={setPartialAmtInput}
                priorDueAmt={priorDueAmt}
                includeClearDue={includeClearDue}
                onToggleClearDue={setIncludeClearDue}
                printAfterPayment={printAfterPayment}
                onTogglePrint={setPrintAfterPayment}
                previewPoints={previewPoints}
                previewWalletCredit={previewWalletCredit}
                frozen={isPaymentFrozen}
              />
            </div>
          )}

          {blockTimeError && (
            <div style={{
              margin: "8px 0", padding: "10px 14px",
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, color: "#dc2626", fontSize: 13,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span style={{ flexShrink: 0 }}>⛔</span>
              <span>{blockTimeError}</span>
            </div>
          )}
          {(saveError || payError) && (
            <div className="err-text" style={{ marginTop: 8 }}>{saveError || payError}</div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="appt-drawer-footer">
          {isCancelledBooking ? (
            <div style={{
              width: "100%", textAlign: "center", padding: "10px 0",
              color: "#ef4444", fontWeight: 700, fontSize: 14, letterSpacing: "0.3px",
            }}>
              🚫 This appointment is cancelled — no actions available
            </div>
          ) : !showPaymentSection ? (
            <>
              {existingBooking ? (
                <>
                  <button className="btn btn-outline-secondary" onClick={handleUpdate} disabled={isSaving}>
                    {isSaving ? "Saving…" : "Update Appointment"}
                  </button>
                  {!isPaymentFrozen && (
                    <button className="btn btn-dark" disabled={isSaving} onClick={async () => {
                      const isWalkIn = !selectedClient || selectedClient.id === "walk-in";
                      if (isWalkIn) {
                        setWalkInPayError("Add client details before proceeding to payment.");
                        setTriggerAddForm(true);
                        clientSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        return;
                      }
                      const id = await save(buildSavePayload());
                      if (!id) return;
                      setShowPaymentSection(true);
                      setTimeout(() => {
                        paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }}>
                      {isSaving ? "Saving…" : "Continue to Payment"}
                    </button>
                  )}
                </>
              ) : (
                <button className="btn btn-dark" style={{ width: "100%" }} onClick={handleSaveAndPay} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Appointment"}
                </button>
              )}
            </>
          ) : (
            <>
              {!isPartialBooking && (
                <button className="btn btn-outline-secondary" onClick={() => setShowPaymentSection(false)}>
                  <PencilFill size={13} /> Update Appointment
                </button>
              )}
              <PaymentButton
                amount={isPartialEntry ? parsedPartial : (includeClearDue ? remainingDue + priorDueAmt : remainingDue)}
                isPartial={isPartialEntry}
                disabled={isPayDisabled}
                label={isProcessing ? "Processing…" : confirmLabel}
                onClick={handlePay}
              />
            </>
          )}
        </div>

      </div>
    </div>
  );
};

const apptMenuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  background: "none", border: "none", cursor: "pointer",
  padding: "10px 16px", fontSize: 13, color: "#111827",
};

export default AppointmentModal;
