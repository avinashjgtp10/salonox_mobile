import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSchedulerContext } from "../../bookings/store/SchedulerContext";
import { useSchedulerInit } from "../../bookings/hooks/useSchedulerInit";
import MiniCalendar from "../../bookings/components/shared/MiniCalendar";
import ClientSearchInput, { type ClientSearchResult } from "../../clients/components/ClientSearchInput";
import api from "../../../services/api/axios";
import {
  createSaleThunk,
  updateSaleThunk,
  checkoutSaleThunk,
} from "../../../middleware/sale/sale.thunk";
import { createBookingThunk } from "../../../middleware/booking/booking.thunk";
import type { AppDispatch, RootState } from "../../../store/store";
import type { PaymentMethod } from "../../../types/sale.types";
import "../styles/QuickSalePage.scss";

// ── Types ──────────────────────────────────────────────────────────────────────
interface SvcRow {
  tempId: string;
  id: string;
  service: string;
  staffId: string;
  time: string;
  price: number;
  qty: number;
  total: number;
  duration: number;
  search: string;
  showDrop: boolean;
}

interface ProdRow {
  tempId: string;
  productName: string;
  price: number;
  qty: number;
  total: number;
  staffId: string;
  search: string;
  showDrop: boolean;
}

interface MemRow {
  tempId: string;
  name: string;
  price: number;
  qty: number;
  total: number;
  staffId: string;
  search: string;
  showDrop: boolean;
}

interface SelectedClient {
  id: string;
  name: string;
  phone: string;
  initials: string;
  eWallet?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUUID = (v: string | undefined | null) => v && UUID_RE.test(v);

function makeTempId() {
  return Math.random().toString(36).substring(2, 9);
}

function toInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
  { id: "gift_card", label: "Gift Card" },
];

// Split-payment sub-methods (each can receive a partial amount)
const SPLIT_METHODS: { id: string; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
];



// ── Component ──────────────────────────────────────────────────────────────────
export default function QuickSalePage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  useSchedulerInit();

  const { staffList, servicesList, productsList, membershipsList, addBooking: addBookingToCalendar } =
    useSchedulerContext();

  const salonId = useSelector(
    (s: RootState) => (s as any).salon?.currentSalon?.id,
  );
  const isCreating = useSelector(
    (s: RootState) => (s as any).sale?.loading?.create ?? false,
  );
  const isCheckingOut = useSelector(
    (s: RootState) => (s as any).sale?.loading?.checkout ?? false,
  );

  // ── Client ───────────────────────────────────────────────────────────────────
  const [client, setClient] = useState<SelectedClient | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [isWalkin, setIsWalkin] = useState(false);
  const [saleDate, setSaleDate] = useState(todayISO());

  // ── Add Client form ───────────────────────────────────────────────────────────
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientGender, setNewClientGender] = useState<"" | "Female" | "Male" | "Other">("");
  const [countryCode, setCountryCode] = useState("+91");
  const [isClientSaved, setIsClientSaved] = useState(false);
  const [phoneDuplicate, setPhoneDuplicate] = useState(false);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // ── Item rows ─────────────────────────────────────────────────────────────────
  const [serviceRows, setServiceRows] = useState<SvcRow[]>([]);
  const [productRows, setProductRows] = useState<ProdRow[]>([]);
  const [membershipRows, setMembershipRows] = useState<MemRow[]>([]);

  // ── Charges & Discounts ───────────────────────────────────────────────────────
  const [exCharges, setExCharges] = useState<number>(0);
  const [exChargesStaffId, setExChargesStaffId] = useState<string>("");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [tipPreset, setTipPreset] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);

  // ── Payment ──────────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  // Split-payment state
  const [isSplit, setIsSplit] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({
    cash: "",
    card: "",
    upi: "",
  });

  // Derived: total allocated in split mode (computed after grandTotal below)
  const splitTotal = Object.values(splitAmounts).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );

  // ── Notes ────────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);

  // ── Draft tracking ────────────────────────────────────────────────────────────
  const [currentSaleId, setCurrentSaleId] = useState<string | number | null>(null);

  // ── UI ────────────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showDotMenu, setShowDotMenu] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node))
        setShowDotMenu(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // ── Derived financials ────────────────────────────────────────────────────────
  const hasItems =
    serviceRows.some((r) => r.service) ||
    productRows.length > 0 ||
    membershipRows.length > 0;

  const serviceTotal =
    serviceRows.reduce((s, r) => s + r.total, 0) +
    productRows.reduce((s, r) => s + r.total, 0) +
    membershipRows.reduce((s, r) => s + r.total, 0);

  const cartDiscount =
    discountType === "percentage"
      ? (serviceTotal * discountValue) / 100
      : discountValue;

  const afterDiscount = Math.max(0, serviceTotal - cartDiscount);

  const effectiveTipPct =
    tipPreset !== null
      ? tipPreset
      : showCustomTip
        ? parseFloat(customTip || "0")
        : 0;
  const tipAmount = (afterDiscount * effectiveTipPct) / 100;

  const grandTotal = afterDiscount + tipAmount + exCharges;
  const splitRemaining = grandTotal - splitTotal;
  const paid = parseFloat(amountPaid || "0");
  const due = Math.max(0, grandTotal - paid);

  // ── Row operations ────────────────────────────────────────────────────────────
  function addSvcRow() {
    setServiceRows((r) => [...r, { tempId: makeTempId(), id: "", service: "", staffId: "", time: "10:00", price: 0, qty: 1, total: 0, duration: 30, search: "", showDrop: false }]);
  }
  function updateSvcRow(tempId: string, patch: Partial<SvcRow>) {
    setServiceRows((r) => r.map((x) => x.tempId === tempId ? { ...x, ...patch } : x));
  }
  function removeSvcRow(tempId: string) {
    setServiceRows((r) => r.filter((x) => x.tempId !== tempId));
  }

  function addProdRow() {
    setProductRows((r) => [...r, { tempId: makeTempId(), productName: "", staffId: "", price: 0, qty: 1, total: 0, search: "", showDrop: false }]);
  }
  function updateProdRow(tempId: string, patch: Partial<ProdRow>) {
    setProductRows((r) => r.map((x) => x.tempId === tempId ? { ...x, ...patch } : x));
  }
  function removeProdRow(tempId: string) {
    setProductRows((r) => r.filter((x) => x.tempId !== tempId));
  }

  function addMemRow() {
    setMembershipRows((r) => [...r, { tempId: makeTempId(), name: "", staffId: "", price: 0, qty: 1, total: 0, search: "", showDrop: false }]);
  }
  function updateMemRow(tempId: string, patch: Partial<MemRow>) {
    setMembershipRows((r) => r.map((x) => x.tempId === tempId ? { ...x, ...patch } : x));
  }
  function removeMemRow(tempId: string) {
    setMembershipRows((r) => r.filter((x) => x.tempId !== tempId));
  }

  // ── Walk-In ───────────────────────────────────────────────────────────────────
  function handleWalkinClick() {
    setIsWalkin(true);
    setClient(null);
    setClientSearch("Walk-in");
    setShowAddClientForm(false);
    setFormErrors([]);
  }

  // ── Add Client helpers ────────────────────────────────────────────────────────
  const phoneValid = (p: string) => /^\d{10}$/.test(p.trim());

  async function checkPhoneExists(phone: string) {
    if (!phoneValid(phone)) return;
    setPhoneCheckLoading(true);
    try {
      const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(phone)}`);
      const raw = res.data?.data ?? res.data ?? [];
      setPhoneDuplicate(Array.isArray(raw) && raw.length > 0);
    } catch {
      // silently ignore
    } finally {
      setPhoneCheckLoading(false);
    }
  }

  async function handleSaveNewClient() {
    if (phoneDuplicate || phoneCheckLoading || isSavingClient) return;
    const errs: string[] = [];
    if (!newClientFirstName.trim()) errs.push("first_name");
    if (!newClientLastName.trim()) errs.push("last_name");
    if (!phoneValid(newClientPhone)) errs.push("phone");
    if (!newClientGender) errs.push("gender");
    if (errs.length) { setFormErrors(errs); return; }

    setIsSavingClient(true);
    try {
      const res = await api.post("/api/v1/clients", {
        first_name: newClientFirstName.trim(),
        last_name: newClientLastName.trim(),
        phone_number: countryCode + newClientPhone.trim(),
        gender: newClientGender,
        salon_id: String(salonId),
      });
      const saved = res.data?.data || res.data;
      const name = `${newClientFirstName.trim()} ${newClientLastName.trim()}`.trim();
      setClient({ id: String(saved?.id || ""), name, phone: countryCode + newClientPhone.trim(), initials: toInitials(name) });
      setClientSearch(name);
      setIsWalkin(false);
      setIsClientSaved(true);
      setShowAddClientForm(false);
      setNewClientFirstName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
      setFormErrors([]);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to save client.");
    } finally {
      setIsSavingClient(false);
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────────
  function resetForm() {
    setServiceRows([]);
    setProductRows([]);
    setMembershipRows([]);
    setClient(null);
    setClientSearch("");
    setIsWalkin(false);
    setShowAddClientForm(false);
    setNewClientFirstName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
    setIsClientSaved(false); setPhoneDuplicate(false); setFormErrors([]);
    setNotes("");
    setDiscountValue(0);
    setExCharges(0);
    setTipPreset(null);
    setCustomTip("");
    setShowCustomTip(false);
    setAmountPaid("");
    setPaymentReference("");
    setPaymentMethod("cash");
    setSaleDate(todayISO());
    setCurrentSaleId(null);
  }

  // ── Shared payload builders ───────────────────────────────────────────────────
  function buildItemsPayload() {
    const lineItems: import("../../../types/sale.types").CreateSaleItemPayload[] = [
      ...serviceRows.filter((r) => r.service).map((r) => ({
        item_type: "service" as const,
        name: r.service,
        quantity: Number(r.qty) || 0,
        unit_price: String(r.price),
      })),
      ...productRows.filter((r) => r.productName).map((r) => ({
        item_type: "product" as const,
        name: r.productName,
        quantity: Number(r.qty) || 0,
        unit_price: String(r.price),
      })),
      ...membershipRows.filter((r) => r.name).map((r) => ({
        item_type: "membership" as const,
        name: r.name,
        quantity: Number(r.qty) || 0,
        unit_price: String(r.price),
      })),
    ];
    if (exCharges > 0) {
      lineItems.push({ item_type: "quick" as const, name: "Extra Charges", quantity: 1, unit_price: String(exCharges) });
    }
    return lineItems;
  }

  function buildNotes() {
    return notes.trim() || undefined;
  }

  // ── Save Draft ────────────────────────────────────────────────────────────────
  async function handleUpdateAppointment() {
    if (!salonId) { setErrorMsg("Salon not loaded. Please refresh."); return; }
    if (!hasItems) { setErrorMsg("Add at least one item before saving."); return; }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (currentSaleId) {
        // Update the existing draft
        const result = await dispatch(
          updateSaleThunk({
            id: currentSaleId,
            data: {
              client_id: client?.id ?? null,
              items: buildItemsPayload(),
              discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined,
              tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
              notes: buildNotes(),
            },
          }),
        );
        if (updateSaleThunk.fulfilled.match(result)) {
          setSuccessMsg("Draft updated successfully!");
        } else {
          setErrorMsg((result.payload as string) || "Failed to update draft.");
        }
      } else {
        // Create a new draft and remember its ID
        const result = await dispatch(
          createSaleThunk({
            salon_id: String(salonId),
            client_id: client?.id ?? null,
            status: "draft",
            items: buildItemsPayload(),
            discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined,
            tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
            notes: buildNotes(),
          }),
        );
        if (createSaleThunk.fulfilled.match(result)) {
          const saved = result.payload as { id: string | number };
          setCurrentSaleId(saved.id);
          setSuccessMsg("Draft saved successfully!");
        } else {
          setErrorMsg((result.payload as string) || "Failed to save draft.");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Pay Now ───────────────────────────────────────────────────────────────────
  async function handleConfirmAndPay() {
    if (!salonId) { setErrorMsg("Salon not loaded. Please refresh."); return; }
    if (!hasItems) { setErrorMsg("Add at least one service, product or membership."); return; }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let saleId = currentSaleId;

      if (!saleId) {
        // No draft yet — create one first
        const createResult = await dispatch(
          createSaleThunk({
            salon_id: String(salonId),
            client_id: client?.id ?? null,
            status: "draft",
            items: buildItemsPayload(),
            discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined,
            tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
            notes: buildNotes(),
          }),
        );

        if (createSaleThunk.rejected.match(createResult)) {
          setErrorMsg((createResult.payload as string) || "Failed to create sale.");
          return;
        }

        const newSale = createResult.payload as { id: string | number };
        saleId = newSale.id;
        setCurrentSaleId(saleId);
      }

      // Build checkout payload — handle split
      const checkoutPayload = isSplit
        ? {
            id: saleId,
            payment_method: "split" as PaymentMethod,
            amount_paid: splitTotal,
            payment_reference: JSON.stringify(
              Object.fromEntries(
                SPLIT_METHODS
                  .filter((m) => parseFloat(splitAmounts[m.id] || "0") > 0)
                  .map((m) => [m.id, parseFloat(splitAmounts[m.id] || "0")])
              )
            ),
          }
        : {
            id: saleId,
            payment_method: paymentMethod,
            amount_paid: parseFloat(amountPaid || grandTotal.toString()),
            payment_reference: paymentReference || undefined,
          };

      const checkoutResult = await dispatch(checkoutSaleThunk(checkoutPayload));

      if (checkoutSaleThunk.fulfilled.match(checkoutResult)) {
        // Sync quick sale as a completed appointment on the calendar
        const firstSvc = serviceRows.find((r) => r.service);
        const totalDuration = serviceRows.reduce((acc, r) => acc + (Number(r.duration) || 30), 0) || 30;

        // Compute scheduled_at from saleDate + first service time
        let scheduledAt = new Date().toISOString();
        const startTime = firstSvc?.time || new Date().toTimeString().slice(0, 5);
        if (saleDate && startTime) {
          const dt = new Date(`${saleDate}T${startTime}:00`);
          if (!isNaN(dt.getTime())) scheduledAt = dt.toISOString();
        }

        // Compute end time string (HH:MM)
        const [sh, sm] = startTime.split(":").map(Number);
        const endMins = (sh * 60 + sm + totalDuration) % (24 * 60);
        const endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;

        try {
          const bookingResult = await dispatch(createBookingThunk({
            salon_id: String(salonId),
            client_id: client?.id || undefined,
            staff_id: isUUID(firstSvc?.staffId) ? firstSvc?.staffId : undefined,
            service_id: isUUID(firstSvc?.id) ? firstSvc?.id : undefined,
            scheduled_at: scheduledAt,
            duration_minutes: totalDuration,
            status: "completed",
            title: client ? `Quick Sale – ${client.name}` : "Quick Sale – Walk-in",
            services: serviceRows.filter((r) => r.service).map((r) => ({
              service_id: isUUID(r.id) ? r.id : undefined,
              staff_id: isUUID(r.staffId) ? r.staffId : undefined,
              name: r.service,
              price: r.price,
              quantity: Number(r.qty) || 1,
              time: r.time,
            })),
          }));

          if (createBookingThunk.fulfilled.match(bookingResult)) {
            // Add to the scheduler store so it appears on the calendar immediately
            addBookingToCalendar({
              id: String(bookingResult.payload.id),
              clientId: client?.id,
              clientName: client ? client.name : "Walk-in",
              clientPhone: client?.phone || "",
              staffId: firstSvc?.staffId || "",
              date: saleDate,
              billDate: saleDate,
              startTime,
              endTime,
              status: "Confirmed",
              paymentStatus: "Paid",
              services: serviceRows.filter((r) => r.service).map((r) => ({
                id: r.id || r.tempId,
                service: r.service,
                staff: staffList.find((s) => s.id === r.staffId)?.name || "",
                staffId: r.staffId,
                time: r.time,
                price: r.price,
                qty: Number(r.qty) || 1,
                total: r.total,
                duration: r.duration,
              })),
              subtotal: serviceTotal,
              taxableAmount: serviceTotal,
              grandTotal,
              payingNow: grandTotal,
              dueAmount: 0,
              notes: notes || undefined,
            } as any);
          }
        } catch (e) {
          console.error("Failed to sync quick sale to calendar", e);
        }

        setSuccessMsg("Sale completed successfully!");
        resetForm();
      } else {
        setErrorMsg((checkoutResult.payload as string) || "Checkout failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isCreating || isCheckingOut;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="va-page">

      {/* ══════════════════ TOP BAR ══════════════════ */}
      <div className="va-topbar">
        <div className="va-topbar__left">
          <button className="va-close-btn" onClick={() => navigate(-1)}>✕</button>
          <span className="va-topbar__title">View Appointment</span>
        </div>
        <div ref={dotMenuRef} style={{ position: "relative" }}>
          <button className="va-dots-btn" onClick={() => setShowDotMenu((v) => !v)}>
            <span>⋯</span>
          </button>
          {showDotMenu && (
            <div className="va-dot-menu">
              <button
                className="va-dot-menu__item"
                onClick={() => { handleUpdateAppointment(); setShowDotMenu(false); }}
              >
                Save as Draft
              </button>
              <div className="va-dot-menu__divider" />
              <button
                className="va-dot-menu__item va-dot-menu__item--danger"
                onClick={() => { resetForm(); setShowDotMenu(false); }}
              >
                Clear Sale
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════ BODY ══════════════════ */}
      <div className="va-body">

        {/* ── Messages ── */}
        {successMsg && <div className="va-success-msg">{successMsg}</div>}
        {errorMsg && <div className="va-error-msg">{errorMsg}</div>}

        {/* ════════════════════════════════════════════
            SECTION 1 — CLIENT
        ════════════════════════════════════════════ */}
        <div className="va-section">
          <div className="va-section__header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
            </svg>
            Client
          </div>
          <div className="va-section__body">
            <div className="va-client-row">
              {/* Live API client search */}
              <ClientSearchInput
                value={clientSearch}
                onChange={(val) => {
                  setClientSearch(val);
                  if (isWalkin) setIsWalkin(false);
                  if (!val) setClient(null);
                }}
                onSelect={(c: ClientSearchResult) => {
                  const name = `${c.first_name} ${c.last_name || ""}`.trim();
                  setClient({
                    id: String(c.id),
                    name,
                    phone: c.phone_number ?? "",
                    initials: toInitials(name),
                  });
                  setClientSearch(name);
                }}
                placeholder="Search client by name or phone…"
              />

              {/* Walk-in button */}
              <button
                className={`va-walkin-btn${isWalkin ? " va-walkin-btn--active" : ""}`}
                onClick={handleWalkinClick}
              >
                Walk-In
              </button>

              {/* Add Client toggle */}
              <button
                className="va-add-client-btn"
                onClick={() => { setShowAddClientForm((v) => !v); setIsClientSaved(false); }}
              >
                {showAddClientForm ? "✕ Cancel" : "+ Add Client"}
              </button>

              {/* Date picker */}
              <div ref={datePickerRef} style={{ position: "relative" }}>
                <button
                  className="va-date-field"
                  onClick={() => setShowDatePicker((v) => !v)}
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                  </svg>
                  <span>{formatDisplayDate(saleDate)}</span>
                </button>
                {showDatePicker && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 1000 }}>
                    <MiniCalendar
                      value={saleDate}
                      onChange={(d) => { setSaleDate(d); setShowDatePicker(false); }}
                      onClose={() => setShowDatePicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Add Client form */}
            {showAddClientForm && (
              <div className="va-add-client-form">
                <div className="va-add-client-form__row">
                  <div className="va-add-client-form__col">
                    <label className="va-field-label">First Name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input
                      className={`va-inp${formErrors.includes("first_name") ? " va-inp--error" : ""}`}
                      placeholder="e.g. Priya"
                      value={newClientFirstName}
                      onChange={(e) => { setNewClientFirstName(e.target.value); setFormErrors((p) => p.filter((x) => x !== "first_name")); }}
                    />
                    {formErrors.includes("first_name") && <span className="va-form-error">Required</span>}
                  </div>

                  <div className="va-add-client-form__col">
                    <label className="va-field-label">Last Name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input
                      className={`va-inp${formErrors.includes("last_name") ? " va-inp--error" : ""}`}
                      placeholder="e.g. Sharma"
                      value={newClientLastName}
                      onChange={(e) => { setNewClientLastName(e.target.value); setFormErrors((p) => p.filter((x) => x !== "last_name")); }}
                    />
                    {formErrors.includes("last_name") && <span className="va-form-error">Required</span>}
                  </div>

                  <div className="va-add-client-form__col">
                    <label className="va-field-label">Mobile <span style={{ color: "#ef4444" }}>*</span></label>
                    <div className="va-phone-group">
                      <select className="va-phone-code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+971">+971</option>
                      </select>
                      <input
                        className={`va-inp${formErrors.includes("phone") ? " va-inp--error" : ""}`}
                        placeholder="10-digit number"
                        value={newClientPhone}
                        maxLength={10}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setNewClientPhone(val);
                          if (phoneDuplicate) setPhoneDuplicate(false);
                          if (phoneValid(val)) { setFormErrors((p) => p.filter((x) => x !== "phone")); checkPhoneExists(val); }
                        }}
                        onBlur={() => { if (phoneValid(newClientPhone)) checkPhoneExists(newClientPhone); }}
                      />
                    </div>
                    {formErrors.includes("phone") && <span className="va-form-error">{newClientPhone.length === 0 ? "Required" : "Must be 10 digits"}</span>}
                    {!formErrors.includes("phone") && phoneDuplicate && <span className="va-form-error">Mobile number already exists</span>}
                    {!formErrors.includes("phone") && !phoneDuplicate && phoneCheckLoading && <span style={{ fontSize: 11, color: "#6b7280" }}>Checking…</span>}
                  </div>

                  <div className="va-add-client-form__col">
                    <label className="va-field-label">Gender <span style={{ color: "#ef4444" }}>*</span></label>
                    <select
                      className={`va-inp${formErrors.includes("gender") ? " va-inp--error" : ""}`}
                      value={newClientGender}
                      onChange={(e) => { setNewClientGender(e.target.value as "Female" | "Male" | "Other"); setFormErrors((p) => p.filter((x) => x !== "gender")); }}
                    >
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                    {formErrors.includes("gender") && <span className="va-form-error">Required</span>}
                  </div>

                  <div className="va-add-client-form__col va-add-client-form__col--btn">
                    <button
                      className="va-save-client-btn"
                      disabled={isClientSaved || phoneDuplicate || phoneCheckLoading || isSavingClient}
                      onClick={handleSaveNewClient}
                    >
                      {isSavingClient ? "Saving..." : isClientSaved ? "Saved ✓" : "Save Client"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            SECTION 2 — SERVICES & ITEMS
        ════════════════════════════════════════════ */}
        <div className="va-section">
          <div className="va-section__header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2v4.586l7 7L14.586 9l-7-7H3zM2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
            </svg>
            Services &amp; Items
          </div>

          {/* ── Service rows ── */}
          {serviceRows.length > 0 && (
            <div className="va-svc-col-hdrs">
              <span style={{ flex: 2 }}>SERVICE</span>
              <span style={{ flex: 1.5 }}>STAFF</span>
              <span style={{ flex: 1 }}>TIME</span>
              <span style={{ flex: 1 }}>PRICE</span>
              <span style={{ flex: 0.7 }}>QTY</span>
              <span style={{ flex: 1 }}>TOTAL</span>
              <span style={{ width: 32 }} />
            </div>
          )}
          {serviceRows.map((row) => {
            const filtered = servicesList.filter((s) => s.name.toLowerCase().includes(row.search.toLowerCase()));
            return (
              <div key={row.tempId} className="va-svc-row">
                {/* Service inline search */}
                <div style={{ flex: 2, position: "relative" }}>
                  <input
                    className="va-inp"
                    placeholder="Search service…"
                    value={row.search}
                    onChange={(e) => updateSvcRow(row.tempId, { search: e.target.value, showDrop: true })}
                    onFocus={() => updateSvcRow(row.tempId, { showDrop: true })}
                    onBlur={() => setTimeout(() => updateSvcRow(row.tempId, { showDrop: false }), 150)}
                  />
                  {row.showDrop && filtered.length > 0 && (
                    <div className="va-inline-drop">
                      {filtered.map((s) => (
                        <div key={s.id} className="va-inline-drop__item"
                          onMouseDown={() => {
                            const q = Number(row.qty) || 1;
                            updateSvcRow(row.tempId, { id: s.id, service: s.name, search: s.name, price: s.price, duration: s.duration || 30, qty: q as any, total: s.price * q, showDrop: false });
                          }}
                        >
                          <span>{s.name}</span>
                          <span className="va-inline-drop__price">₹{s.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Staff pill */}
                <div style={{ flex: 1.5 }}>
                  <div className="va-staff-pill">
                    <select
                      value={row.staffId}
                      onChange={(e) => updateSvcRow(row.tempId, { staffId: e.target.value })}
                    >
                      <option value="">Select Staff</option>
                      {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Time */}
                <div style={{ flex: 1 }}>
                  <input className="va-inp" placeholder="10:00" value={row.time}
                    onChange={(e) => updateSvcRow(row.tempId, { time: e.target.value })} />
                </div>

                {/* Price */}
                <div style={{ flex: 1 }}>
                  <input className="va-inp" type="number" min={0} placeholder="0" value={row.price || ""}
                    onChange={(e) => { const p = parseFloat(e.target.value) || 0; updateSvcRow(row.tempId, { price: p, total: p * (Number(row.qty) || 0) }); }} />
                </div>

                {/* Qty */}
                <div style={{ flex: 0.7 }}>
                  <input className="va-inp" type="number" value={row.qty}
                    onChange={(e) => { 
                      const val = e.target.value; 
                      const q = val === "" ? "" : Number(val); 
                      updateSvcRow(row.tempId, { qty: q as any, total: row.price * (Number(q) || 0) }); 
                    }} />
                </div>

                {/* Total */}
                <div style={{ flex: 1 }} className="va-svc-row__total">₹{row.total.toFixed(2)}</div>

                <button className="va-svc-row__remove" onClick={() => removeSvcRow(row.tempId)}>✕</button>
              </div>
            );
          })}

          {/* ── Product rows ── */}
          {productRows.length > 0 && (
            <div className="va-svc-col-hdrs va-svc-col-hdrs--product">
              <span style={{ flex: 2 }}>PRODUCT</span>
              <span style={{ flex: 1.5 }}>STAFF</span>
              <span style={{ flex: 1 }}>PRICE</span>
              <span style={{ flex: 0.7 }}>QTY</span>
              <span style={{ flex: 1 }}>TOTAL</span>
              <span style={{ width: 32 }} />
            </div>
          )}
          {productRows.map((row) => {
            const filtered = productsList.filter((p) => (p.name ?? "").toLowerCase().includes(row.search.toLowerCase()));
            return (
              <div key={row.tempId} className="va-svc-row">
                <div style={{ flex: 2, position: "relative" }}>
                  <input className="va-inp" placeholder="Search product…" value={row.search}
                    onChange={(e) => updateProdRow(row.tempId, { search: e.target.value, showDrop: true })}
                    onFocus={() => updateProdRow(row.tempId, { showDrop: true })}
                    onBlur={() => setTimeout(() => updateProdRow(row.tempId, { showDrop: false }), 150)}
                  />
                  {row.showDrop && filtered.length > 0 && (
                    <div className="va-inline-drop">
                      {filtered.map((p, i) => (
                        <div key={i} className="va-inline-drop__item"
                          onMouseDown={() => { const q = Number(row.qty) || 1; updateProdRow(row.tempId, { productName: p.name, search: p.name, price: p.price, qty: q as any, total: p.price * q, showDrop: false }); }}
                        >
                          <span>{p.name}</span>
                          <span className="va-inline-drop__price">₹{p.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1.5 }}>
                  <div className="va-staff-pill">
                    <select
                      value={row.staffId}
                      onChange={(e) => updateProdRow(row.tempId, { staffId: e.target.value })}
                    >
                      <option value="">Select Staff</option>
                      {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <input className="va-inp" type="number" min={0} value={row.price || ""}
                    onChange={(e) => { const p = parseFloat(e.target.value) || 0; updateProdRow(row.tempId, { price: p, total: p * (Number(row.qty) || 0) }); }} />
                </div>
                <div style={{ flex: 0.7 }}>
                  <input className="va-inp" type="number" value={row.qty}
                    onChange={(e) => { 
                      const val = e.target.value; 
                      const q = val === "" ? "" : Number(val); 
                      updateProdRow(row.tempId, { qty: q as any, total: row.price * (Number(q) || 0) }); 
                    }} />
                </div>
                <div style={{ flex: 1 }} className="va-svc-row__total">₹{row.total.toFixed(2)}</div>
                <button className="va-svc-row__remove" onClick={() => removeProdRow(row.tempId)}>✕</button>
              </div>
            );
          })}

          {/* ── Membership rows ── */}
          {membershipRows.length > 0 && (
            <div className="va-svc-col-hdrs va-svc-col-hdrs--membership">
              <span style={{ flex: 2 }}>MEMBERSHIP</span>
              <span style={{ flex: 1.5 }}>STAFF</span>
              <span style={{ flex: 1 }}>PRICE</span>
              <span style={{ flex: 0.7 }}>QTY</span>
              <span style={{ flex: 1 }}>TOTAL</span>
              <span style={{ width: 32 }} />
            </div>
          )}
          {membershipRows.map((row) => {
            const filtered = membershipsList.filter((m) => (m.name ?? "").toLowerCase().includes(row.search.toLowerCase()));
            return (
              <div key={row.tempId} className="va-svc-row">
                <div style={{ flex: 2, position: "relative" }}>
                  <input className="va-inp" placeholder="Search membership…" value={row.search}
                    onChange={(e) => updateMemRow(row.tempId, { search: e.target.value, showDrop: true })}
                    onFocus={() => updateMemRow(row.tempId, { showDrop: true })}
                    onBlur={() => setTimeout(() => updateMemRow(row.tempId, { showDrop: false }), 150)}
                  />
                  {row.showDrop && filtered.length > 0 && (
                    <div className="va-inline-drop">
                      {filtered.map((m, i) => (
                        <div key={i} className="va-inline-drop__item"
                          onMouseDown={() => { const q = Number(row.qty) || 1; updateMemRow(row.tempId, { name: m.name, search: m.name, price: m.price, qty: q as any, total: m.price * q, showDrop: false }); }}
                        >
                          <span>{m.name}</span>
                          <span className="va-inline-drop__price">₹{m.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1.5 }}>
                  <div className="va-staff-pill">
                    <select
                      value={row.staffId}
                      onChange={(e) => updateMemRow(row.tempId, { staffId: e.target.value })}
                    >
                      <option value="">Select Staff</option>
                      {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <input className="va-inp" type="number" min={0} value={row.price || ""}
                    onChange={(e) => { const p = parseFloat(e.target.value) || 0; updateMemRow(row.tempId, { price: p, total: p * (Number(row.qty) || 0) }); }} />
                </div>
                <div style={{ flex: 0.7 }}>
                  <input className="va-inp" type="number" value={row.qty}
                    onChange={(e) => { 
                      const val = e.target.value; 
                      const q = val === "" ? "" : Number(val); 
                      updateMemRow(row.tempId, { qty: q as any, total: row.price * (Number(q) || 0) }); 
                    }} />
                </div>
                <div style={{ flex: 1 }} className="va-svc-row__total">₹{row.total.toFixed(2)}</div>
                <button className="va-svc-row__remove" onClick={() => removeMemRow(row.tempId)}>✕</button>
              </div>
            );
          })}

          {/* ── Add buttons ── */}
          <div className="va-section__body">
            <div className="va-add-actions">
              <button className="va-add-svc-btn" onClick={addSvcRow}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" /></svg>
                Service
              </button>
              <button className="va-add-svc-btn" onClick={addProdRow}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" /></svg>
                Product
              </button>
              <button className="va-add-svc-btn" onClick={addMemRow}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" /></svg>
                Membership
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            SECTION 3 — CHARGES & DISCOUNTS
        ════════════════════════════════════════════ */}
        <div className="va-section">
          <div className="va-section__header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 2A3.5 3.5 0 0 0 2 5.5v5A3.5 3.5 0 0 0 5.5 14h5a3.5 3.5 0 0 0 3.5-3.5V8a.5.5 0 0 1 1 0v2.5a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 1 10.5v-5A4.5 4.5 0 0 1 5.5 1H8a.5.5 0 0 1 0 1H5.5z" />
              <path d="M16 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
            </svg>
            Charges &amp; Discounts
          </div>
          <div className="va-section__body">
            <div className="va-charges-grid">
              <div className="va-charges-grid__col">
                <label className="va-field-label">Reward Points</label>
                <input className="va-inp" value="None" readOnly />
              </div>
              <div className="va-charges-grid__col">
                <label className="va-field-label">Ex Charges</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    className="va-inp"
                    type="number"
                    min={0}
                    value={exCharges || ""}
                    placeholder="0"
                    style={{ flex: 1 }}
                    onChange={(e) => setExCharges(parseFloat(e.target.value) || 0)}
                  />
                  {exCharges > 0 && (
                    <select
                      className="va-inp"
                      style={{ flex: 1.5 }}
                      value={exChargesStaffId}
                      onChange={(e) => setExChargesStaffId(e.target.value)}
                    >
                      <option value="">Staff</option>
                      {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <div className="va-charges-grid__col">
                <label className="va-field-label">Tip</label>
                <div className="va-tip-row">
                  <input
                    className="va-inp"
                    type="number"
                    min={0}
                    value={
                      showCustomTip
                        ? customTip
                        : tipPreset !== null
                          ? tipPreset
                          : ""
                    }
                    placeholder="0"
                    onChange={(e) => {
                      setShowCustomTip(true);
                      setTipPreset(null);
                      setCustomTip(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="va-charges-grid__col">
                <label className="va-field-label">Discount</label>
                <input
                  className="va-inp"
                  type="number"
                  min={0}
                  value={discountValue || ""}
                  placeholder="0"
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="va-charges-grid__col">
                <label className="va-field-label">Discount Type</label>
                <select
                  className="va-inp"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percentage" | "flat")}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            SECTION 4 — PAYMENT & NOTES
        ════════════════════════════════════════════ */}
        <div className="va-section">
          <div className="va-section__header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z" />
              <path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1z" />
            </svg>
            Payment &amp; Notes
          </div>
          <div className="va-section__body">

            {/* Payment method */}
            <label className="va-field-label" style={{ marginBottom: 8 }}>Payment Method</label>
            <div className="va-payment-methods">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`va-pm-btn${!isSplit && paymentMethod === m.id ? " va-pm-btn--active" : ""}`}
                  onClick={() => { 
                    setIsSplit(false); 
                    setPaymentMethod(m.id); 
                    setAmountPaid(grandTotal.toFixed(2));
                  }}
                >
                  {m.label}
                </button>
              ))}
              {/* Split toggle */}
              <button
                className={`va-pm-btn${isSplit ? " va-pm-btn--active" : ""}`}
                onClick={() => setIsSplit((v) => !v)}
              >
                ⚡ Split
              </button>
            </div>

            {/* Single-method reference */}
            {!isSplit && (paymentMethod === "card" || paymentMethod === "upi") && (
              <input
                className="va-inp"
                style={{ marginTop: 8 }}
                placeholder={
                  paymentMethod === "card"
                    ? "Card reference / last 4 digits"
                    : "UPI transaction ID"
                }
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            )}

            {/* ── Split payment panel ── */}
            {isSplit && (
              <div className="va-split-panel">
                <div className="va-split-panel__header">
                  <span>Split Payment</span>
                  <span
                    className={`va-split-panel__remaining ${splitRemaining < -0.001 ? "va-split-panel__remaining--over" : splitRemaining < 0.001 ? "va-split-panel__remaining--done" : ""}`}
                  >
                    {splitRemaining < -0.001
                      ? `Over by ₹${Math.abs(splitRemaining).toFixed(2)}`
                      : splitRemaining < 0.001
                      ? "✓ Fully allocated"
                      : `Remaining: ₹${splitRemaining.toFixed(2)}`}
                  </span>
                </div>
                <div className="va-split-rows">
                  {SPLIT_METHODS.map((m) => (
                    <div key={m.id} className="va-split-row">
                      <span className="va-split-row__label">{m.label}</span>
                      <div className="va-split-row__input-wrap">
                        <span className="va-split-row__currency">₹</span>
                        <input
                          className="va-inp va-split-row__input"
                          type="number"
                          min={0}
                          placeholder="0.00"
                          value={splitAmounts[m.id]}
                          onChange={(e) =>
                            setSplitAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                        />
                      </div>
                      {/* Quick-fill remaining */}
                      {splitRemaining > 0.001 && (parseFloat(splitAmounts[m.id] || "0") === 0) && (
                        <button
                          className="va-split-row__fill"
                          onClick={() =>
                            setSplitAmounts((prev) => ({ ...prev, [m.id]: splitRemaining.toFixed(2) }))
                          }
                        >
                          Fill ₹{splitRemaining.toFixed(2)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="va-split-panel__total-row">
                  <span>Total allocated</span>
                  <span className="va-split-panel__total-val">₹{splitTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Amount paid — hidden in split mode (split amounts define it) */}
            {!isSplit && (
              <div style={{ marginTop: 14 }}>
                <label className="va-field-label">Amount Paid (₹)</label>
                <input
                  className="va-inp"
                  type="number"
                  placeholder={grandTotal.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            )}

            <div className="va-pay-notes-layout">
              {/* Left: alert + notes */}
              <div className="va-pay-notes-layout__left">
                <div style={{ marginTop: 0 }}>
                  <label className="va-field-label">Notes</label>
                  <textarea
                    className="va-textarea"
                    placeholder="Enter appointment notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Right: summary box */}
              <div className="va-summary-box">
                <div className="va-summary-box__title">SUMMARY</div>
                <div className="va-summary-row">
                  <span>Service</span>
                  <span>₹{serviceTotal.toFixed(2)}</span>
                </div>
                {exCharges > 0 && (
                  <div className="va-summary-row">
                    <span>Extra charges</span>
                    <span>₹{exCharges.toFixed(2)}</span>
                  </div>
                )}
                {cartDiscount > 0 && (
                  <div className="va-summary-row" style={{ color: "#ef4444" }}>
                    <span>Discount</span>
                    <span>−₹{cartDiscount.toFixed(2)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="va-summary-row">
                    <span>Tip</span>
                    <span>+₹{tipAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="va-summary-row">
                  <span>Subtotal</span>
                  <span>₹{(serviceTotal + exCharges).toFixed(2)}</span>
                </div>
                <div className="va-summary-row va-summary-row--total">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                {paid > 0 && (
                  <div className="va-summary-row" style={{ color: "#22c55e" }}>
                    <span>Paid</span>
                    <span>₹{paid.toFixed(2)}</span>
                  </div>
                )}
                {due > 0 && (
                  <div className="va-summary-row" style={{ color: "#ef4444" }}>
                    <span>Due</span>
                    <span>₹{due.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            SECTION 5 — CONFIRM & PAY
        ════════════════════════════════════════════ */}
        {hasItems && (
          <div className="va-section">
            <div className="va-section__header" style={{ color: "#d97706" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#d97706">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z" />
              </svg>
              Confirm &amp; Pay
            </div>
            {serviceRows.filter((r) => r.service).map((r) => {
              const staffName = staffList.find((s) => s.id === r.staffId)?.name || "Any staff";
              return (
                <div key={r.tempId} className="va-confirm-item">
                  <span className="va-confirm-item__name">{r.service}<span className="va-confirm-item__staff"> · {staffName}</span></span>
                  <span className="va-confirm-item__price">₹{r.total.toFixed(2)}</span>
                </div>
              );
            })}
            {productRows.filter((r) => r.productName).map((r) => (
              <div key={r.tempId} className="va-confirm-item">
                <span className="va-confirm-item__name">{r.productName}<span className="va-confirm-item__staff"> · Product</span></span>
                <span className="va-confirm-item__price">₹{r.total.toFixed(2)}</span>
              </div>
            ))}
            {membershipRows.filter((r) => r.name).map((r) => (
              <div key={r.tempId} className="va-confirm-item">
                <span className="va-confirm-item__name">{r.name}<span className="va-confirm-item__staff"> · Membership</span></span>
                <span className="va-confirm-item__price">₹{r.total.toFixed(2)}</span>
              </div>
            ))}
            <div className="va-progress-bar" />
          </div>
        )}

      </div>

      {/* ══════════════════ BOTTOM ACTION BAR ══════════════════ */}
      <div className="va-bottom-bar">
        
        <button
          className="va-confirm-btn"
          disabled={!hasItems || isBusy}
          onClick={handleConfirmAndPay}
        >
          ✅ Confirm &amp; Pay — ₹{grandTotal.toFixed(2)}
        </button>
      </div>

    </div>
  );
}