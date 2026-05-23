import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MiniCalendar from "../../bookings/components/shared/MiniCalendar";
import ClientSearchInput, { type ClientSearchResult } from "../../clients/components/ClientSearchInput";
import api from "../../../services/api/axios";
import {
  createSaleThunk,
  updateSaleThunk,
  checkoutSaleThunk,
  fetchSaleInitThunk,
  fetchSaleProductsThunk,
  fetchSaleMembershipsThunk,
  deleteSaleThunk,
} from "../../../middleware/sale/sale.thunk";
import { clearSaleError } from "../../../store/saleSlice";
import type { AppDispatch, RootState } from "../../../store/store";
import type { PaymentMethod } from "../../../types/sale.types";

import type {
  InitStaff, InitService, LazyProduct, LazyMembership,
  SvcRow, ProdRow, MemRow, SelectedClient, ItemTab,
} from "../types/quickSale.types";
import { PAYMENT_METHODS, SPLIT_METHODS } from "../types/quickSale.types";
import {
  makeTempId, toInitials, todayISO, formatDisplayDate,
  mapStaff, mapServices, mapProducts, mapMemberships,
  extractLocalPhone, isPhoneSearch,
} from "../utils/quickSale.utils";
import { INDIA } from "../components/CountryDialPicker";
import type { CountryOption } from "../components/CountryDialPicker";
import { IconUser, IconTag, IconPercent, IconPayment, IconPlus, IconCal } from "../components/QuickSaleIcons";
import ItemEmptyState from "../components/ItemEmptyState";
import ServiceItemRow, { ServiceColHeaders } from "../components/ServiceItemRow";
import ProductItemRow, { ProductColHeaders } from "../components/ProductItemRow";
import MembershipItemRow, { MembershipColHeaders } from "../components/MembershipItemRow";
import AddClientForm from "../components/AddClientForm";
import "../styles/QuickSalePage.scss";

// ── Component ──────────────────────────────────────────────────────────────────
export default function QuickSalePage() {
  const dispatch  = useDispatch<AppDispatch>();
  const navigate  = useNavigate();

  const salonId       = useSelector((s: RootState) => (s as any).salon?.currentSalon?.id);
  const isCreating    = useSelector((s: RootState) => (s as any).sale?.loading?.create ?? false);
  const isCheckingOut = useSelector((s: RootState) => (s as any).sale?.loading?.checkout ?? false);

  const cachedInitData    = useSelector((s: RootState) => (s as any).sale?.initData ?? null);
  const initLoading       = useSelector((s: RootState) => (s as any).sale?.loading?.init ?? false);
  const productsLoaded    = useSelector((s: RootState) => Boolean((s as any).sale?.productsLoaded));
  const cachedProducts    = useSelector((s: RootState) => (s as any).sale?.catalogProducts ?? null);
  const membershipsLoaded = useSelector((s: RootState) => Boolean((s as any).sale?.membershipsLoaded));
  const cachedMemberships = useSelector((s: RootState) => (s as any).sale?.catalogMemberships ?? null);

  const [staffList,       setStaffList]       = useState<InitStaff[]>([]);
  const [servicesList,    setServicesList]    = useState<InitService[]>([]);
  const [productsList,    setProductsList]    = useState<LazyProduct[]>([]);
  const [membershipsList, setMembershipsList] = useState<LazyMembership[]>([]);

  const [client,       setClient]       = useState<SelectedClient | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [isWalkin,     setIsWalkin]     = useState(false);
  const [saleDate,     setSaleDate]     = useState(todayISO());

  const [showAddClientForm,  setShowAddClientForm]  = useState(false);
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName,  setNewClientLastName]  = useState("");
  const [newClientPhone,     setNewClientPhone]     = useState("");
  const [newClientGender,    setNewClientGender]    = useState<"" | "Female" | "Male" | "Other">("");
  const [selectedCountry,    setSelectedCountry]    = useState<CountryOption>(INDIA);
  const [isClientSaved,      setIsClientSaved]      = useState(false);
  const [phoneDuplicate,     setPhoneDuplicate]     = useState(false);
  const [phoneCheckLoading,  setPhoneCheckLoading]  = useState(false);
  const [formErrors,         setFormErrors]         = useState<string[]>([]);

  const [serviceRows,    setServiceRows]    = useState<SvcRow[]>([]);
  const [productRows,    setProductRows]    = useState<ProdRow[]>([]);
  const [membershipRows, setMembershipRows] = useState<MemRow[]>([]);
  const [activeTab,      setActiveTab]      = useState<ItemTab>("services");

  const [exCharges,     setExCharges]     = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType,  setDiscountType]  = useState<"percentage" | "flat">("percentage");
  const [tipPreset,     setTipPreset]     = useState<number | null>(null);
  const [customTip,     setCustomTip]     = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);

  const [paymentMethod,    setPaymentMethod]    = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountPaid,       setAmountPaid]       = useState("");

  const [isSplit,      setIsSplit]      = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({ cash: "", card: "", upi: "" });

  const splitTotal = Object.values(splitAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const [notes,         setNotes]         = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [currentSaleId,  setCurrentSaleId]  = useState<string | number | null>(null);

  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [isDeleting,        setIsDeleting]        = useState(false);
  const [successMsg,        setSuccessMsg]        = useState("");
  const [errorMsg,          setErrorMsg]          = useState("");
  const [showDotMenu,       setShowDotMenu]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDatePicker,    setShowDatePicker]    = useState(false);

  const dotMenuRef    = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // ── Hydrate from Redux cache ───────────────────────────────────────────────
  useEffect(() => {
    if (cachedInitData) {
      setStaffList(mapStaff(cachedInitData.staff));
      setServicesList(mapServices(cachedInitData.services));
    }
  }, [cachedInitData]);

  useEffect(() => { if (cachedProducts)    setProductsList(mapProducts(cachedProducts)); },       [cachedProducts]);
  useEffect(() => { if (cachedMemberships) setMembershipsList(mapMemberships(cachedMemberships)); }, [cachedMemberships]);

  useEffect(() => {
    dispatch(clearSaleError());
    dispatch(fetchSaleInitThunk());
  }, [dispatch]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dotMenuRef.current    && !dotMenuRef.current.contains(e.target as Node))    setShowDotMenu(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // ── Lazy loaders ───────────────────────────────────────────────────────────
  async function ensureProductsLoaded()    { if (!productsLoaded)    dispatch(fetchSaleProductsThunk()); }
  async function ensureMembershipsLoaded() { if (!membershipsLoaded) dispatch(fetchSaleMembershipsThunk()); }

  // ── Derived totals ─────────────────────────────────────────────────────────
  const hasItems =
    serviceRows.some((r) => r.service) ||
    productRows.length > 0 ||
    membershipRows.length > 0;

  const serviceTotal =
    serviceRows.reduce((s, r) => s + r.total, 0) +
    productRows.reduce((s, r) => s + r.total, 0) +
    membershipRows.reduce((s, r) => s + r.total, 0);

  const cartDiscount =
    discountType === "percentage" ? (serviceTotal * discountValue) / 100 : discountValue;

  const afterDiscount = Math.max(0, serviceTotal - cartDiscount);

  const effectiveTipAmount = tipPreset !== null ? tipPreset : showCustomTip ? parseFloat(customTip || "0") : 0;
  const tipAmount  = Math.max(0, effectiveTipAmount);
  const grandTotal = afterDiscount + tipAmount + exCharges;
  const splitRemaining = grandTotal - splitTotal;
  const paid = parseFloat(amountPaid || "0");
  const due  = Math.max(0, grandTotal - paid);

  // ── Row CRUD ───────────────────────────────────────────────────────────────
  function addSvcRow() {
    setActiveTab("services");
    setServiceRows((r) => [...r, { tempId: makeTempId(), id: "", service: "", staffId: "", time: "10:00", price: 0, qty: 1, total: 0, duration: 30, search: "", showDrop: false, discountVal: 0, discountType: "percentage" }]);
  }
  function updateSvcRow(tid: string, p: Partial<SvcRow>) { setServiceRows((r) => r.map((x) => x.tempId === tid ? { ...x, ...p } : x)); }
  function removeSvcRow(tid: string) { setServiceRows((r) => r.filter((x) => x.tempId !== tid)); }

  async function addProdRow() {
    await ensureProductsLoaded();
    setActiveTab("products");
    setProductRows((r) => [...r, { tempId: makeTempId(), id: "", productName: "", staffId: "", price: 0, qty: 1, total: 0, search: "", showDrop: false, stock: null, discountVal: 0, discountType: "percentage" }]);
  }
  function updateProdRow(tid: string, p: Partial<ProdRow>) { setProductRows((r) => r.map((x) => x.tempId === tid ? { ...x, ...p } : x)); }
  function removeProdRow(tid: string) { setProductRows((r) => r.filter((x) => x.tempId !== tid)); }

  async function addMemRow() {
    await ensureMembershipsLoaded();
    setActiveTab("memberships");
    setMembershipRows((r) => [...r, { tempId: makeTempId(), name: "", staffId: "", price: 0, qty: 1, total: 0, search: "", showDrop: false, discountVal: 0, discountType: "percentage" }]);
  }
  function updateMemRow(tid: string, p: Partial<MemRow>) { setMembershipRows((r) => r.map((x) => x.tempId === tid ? { ...x, ...p } : x)); }
  function removeMemRow(tid: string) { setMembershipRows((r) => r.filter((x) => x.tempId !== tid)); }

  function handleTabClick(tab: ItemTab) {
    setActiveTab(tab);
    if (tab === "services")    addSvcRow();
    else if (tab === "products")    addProdRow();
    else if (tab === "memberships") addMemRow();
  }

  // ── Walk-In ────────────────────────────────────────────────────────────────
  function handleWalkinClick() {
    setIsWalkin(true); setClient(null);
    setClientSearch("Walk-in"); setShowAddClientForm(false); setFormErrors([]);
  }

  // ── Add client ─────────────────────────────────────────────────────────────
  const phoneValid = (p: string) => /^\d{10}$/.test(p.trim());

  async function checkPhoneExists(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) return;
    setPhoneCheckLoading(true);
    try {
      const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(phone)}`);
      const raw = res.data?.data ?? res.data ?? [];
      setPhoneDuplicate(Array.isArray(raw) && raw.length > 0);
    } catch { /* silent */ } finally { setPhoneCheckLoading(false); }
  }

  async function handleSaveNewClient() {
    if (phoneDuplicate || phoneCheckLoading || isSavingClient) return;
    const errs: string[] = [];
    const firstNameTrim = newClientFirstName.trim();
    if (!firstNameTrim)          errs.push("first_name_required");
    else if (firstNameTrim.length < 3) errs.push("first_name_length");
    const lastNameTrim = newClientLastName.trim();
    if (lastNameTrim && lastNameTrim.length < 3) errs.push("last_name_length");
    if (!phoneValid(newClientPhone)) errs.push("phone");
    if (!newClientGender)            errs.push("gender");
    if (errs.length) { setFormErrors(errs); return; }

    setIsSavingClient(true);
    try {
      const cleaned   = newClientPhone.trim().replace(/\D/g, "");
      const dialDigits = selectedCountry.dialCode.replace(/\D/g, "");
      const phoneDigits = cleaned.startsWith(dialDigits) ? cleaned : `${dialDigits}${cleaned}`;
      const phoneNumberWithPlus = `+${phoneDigits}`;

      const res = await api.post("/api/v1/clients", {
        first_name:   newClientFirstName.trim(),
        last_name:    newClientLastName.trim(),
        phone_number: phoneNumberWithPlus,
        gender:       newClientGender,
      });
      const saved = res.data?.data || res.data;
      const name  = `${newClientFirstName.trim()} ${newClientLastName.trim()}`.trim();
      setClient({ id: String(saved?.id || ""), name, phone: phoneNumberWithPlus, initials: toInitials(name) });
      setClientSearch(name); setIsWalkin(false); setIsClientSaved(true);
      setShowAddClientForm(false);
      setNewClientFirstName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
      setFormErrors([]);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to save client.");
    } finally { setIsSavingClient(false); }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetForm() {
    setServiceRows([]); setProductRows([]); setMembershipRows([]);
    setClient(null); setClientSearch(""); setIsWalkin(false);
    setShowAddClientForm(false);
    setNewClientFirstName(""); setNewClientLastName(""); setNewClientPhone(""); setNewClientGender("");
    setIsClientSaved(false); setPhoneDuplicate(false); setFormErrors([]);
    setNotes(""); setDiscountValue(0); setExCharges(0);
    setTipPreset(null); setCustomTip(""); setShowCustomTip(false);
    setAmountPaid(""); setPaymentReference(""); setPaymentMethod("cash");
    setSaleDate(todayISO()); setCurrentSaleId(null);
  }

  // ── Delete draft ───────────────────────────────────────────────────────────
  async function handleDeleteSale() {
    if (!currentSaleId) { resetForm(); setShowDeleteConfirm(false); setShowDotMenu(false); return; }
    setIsDeleting(true); setErrorMsg("");
    try {
      const result = await dispatch(deleteSaleThunk(currentSaleId));
      if (deleteSaleThunk.fulfilled.match(result)) {
        setSuccessMsg("Sale deleted."); resetForm();
      } else {
        setErrorMsg((result.payload as string) || "Failed to delete sale.");
      }
    } finally { setIsDeleting(false); setShowDeleteConfirm(false); setShowDotMenu(false); }
  }

  // ── Payload builders ───────────────────────────────────────────────────────
  function buildItemsPayload() {
    const lineItems: import("../../../types/sale.types").CreateSaleItemPayload[] = [
      ...serviceRows.filter((r) => r.service).map((r) => {
        const subtotal = r.price * r.qty;
        const disc = r.discountType === "percentage" ? (subtotal * r.discountVal) / 100 : r.discountVal;
        return { item_type: "service" as const, name: r.service, quantity: Number(r.qty) || 0, unit_price: String(r.price), discount_amount: disc > 0 ? disc.toFixed(2) : undefined };
      }),
      ...productRows.filter((r) => r.productName).map((r) => {
        const subtotal = r.price * r.qty;
        const disc = r.discountType === "percentage" ? (subtotal * r.discountVal) / 100 : r.discountVal;
        return { item_type: "product" as const, item_id: r.id || undefined, name: r.productName, quantity: Number(r.qty) || 0, unit_price: String(r.price), discount_amount: disc > 0 ? disc.toFixed(2) : undefined };
      }),
      ...membershipRows.filter((r) => r.name).map((r) => {
        const subtotal = r.price * r.qty;
        const disc = r.discountType === "percentage" ? (subtotal * r.discountVal) / 100 : r.discountVal;
        return { item_type: "membership" as const, name: r.name, quantity: Number(r.qty) || 0, unit_price: String(r.price), discount_amount: disc > 0 ? disc.toFixed(2) : undefined };
      }),
    ];
    if (exCharges > 0) lineItems.push({ item_type: "quick" as const, name: "Extra Charges", quantity: 1, unit_price: String(exCharges) });
    return lineItems;
  }

  function buildNotes() { return notes.trim() || undefined; }

  // ── Save Draft ─────────────────────────────────────────────────────────────
  async function handleUpdateAppointment() {
    if (!salonId) { setErrorMsg("Salon not loaded. Please refresh."); return; }
    if (!hasItems) { setErrorMsg("Add at least one item before saving."); return; }

    setIsSubmitting(true); setErrorMsg(""); setSuccessMsg("");
    try {
      if (currentSaleId) {
        const result = await dispatch(updateSaleThunk({
          id: currentSaleId,
          data: { client_id: client?.id ?? null, items: buildItemsPayload(), discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined, tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined, notes: buildNotes() },
        }));
        if (updateSaleThunk.fulfilled.match(result)) setSuccessMsg("Draft updated successfully!");
        else setErrorMsg((result.payload as string) || "Failed to update draft.");
      } else {
        const result = await dispatch(createSaleThunk({
          client_id: client?.id ?? null, status: "draft", items: buildItemsPayload(),
          discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined,
          tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
          notes: buildNotes(),
        }));
        if (createSaleThunk.fulfilled.match(result)) {
          const saved = result.payload as { id: string | number };
          setCurrentSaleId(saved.id); setSuccessMsg("Draft saved successfully!");
        } else {
          setErrorMsg((result.payload as string) || "Failed to save draft.");
        }
      }
    } finally { setIsSubmitting(false); }
  }

  // ── Pay Now ────────────────────────────────────────────────────────────────
  async function handleConfirmAndPay() {
    if (!salonId) { setErrorMsg("Salon not loaded. Please refresh."); return; }
    if (!hasItems) { setErrorMsg("Add at least one service, product or membership."); return; }

    setIsSubmitting(true); setErrorMsg(""); setSuccessMsg("");
    try {
      let saleId = currentSaleId;
      if (!saleId) {
        const createResult = await dispatch(createSaleThunk({
          client_id: client?.id ?? null, status: "draft", items: buildItemsPayload(),
          discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined,
          tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
          notes: buildNotes(),
        }));
        if (createSaleThunk.rejected.match(createResult)) {
          setErrorMsg((createResult.payload as string) || "Failed to create sale."); return;
        }
        const newSale = createResult.payload as { id: string | number };
        saleId = newSale.id; setCurrentSaleId(saleId);
      }

      const checkoutPayload = isSplit
        ? {
            id: saleId, payment_method: "split" as PaymentMethod, amount_paid: splitTotal,
            payment_reference: JSON.stringify(
              Object.fromEntries(SPLIT_METHODS.filter((m) => parseFloat(splitAmounts[m.id] || "0") > 0).map((m) => [m.id, parseFloat(splitAmounts[m.id] || "0")]))
            ),
          }
        : { id: saleId, payment_method: paymentMethod, amount_paid: parseFloat(amountPaid || grandTotal.toString()), payment_reference: paymentReference || undefined };

      const checkoutResult = await dispatch(checkoutSaleThunk(checkoutPayload));
      if (checkoutSaleThunk.fulfilled.match(checkoutResult)) {
        setSuccessMsg("Sale completed successfully!"); resetForm();
      } else {
        setErrorMsg((checkoutResult.payload as string) || "Checkout failed.");
      }
    } finally { setIsSubmitting(false); }
  }

  const isBusy = isSubmitting || isCreating || isCheckingOut || isDeleting;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="qs-page">

      {/* ══ TOP BAR ══ */}
      <div className="qs-topbar">
        <div className="qs-topbar__left">
          <button className="qs-back-btn" onClick={() => navigate(-1)} title="Go back">←</button>
          <span className="qs-topbar__title">Quick Sale</span>
          {currentSaleId && <span className="qs-topbar__badge">Draft</span>}
        </div>

        <div ref={dotMenuRef} style={{ position: "relative" }}>
          <button className="qs-menu-btn" onClick={() => { setShowDotMenu((v) => !v); setShowDeleteConfirm(false); }} title="More actions">···</button>

          {showDotMenu && (
            <div className="qs-dot-menu">
              <button className="qs-dot-menu__item" onClick={() => { handleUpdateAppointment(); setShowDotMenu(false); setShowDeleteConfirm(false); }}>
                💾 Save as Draft
              </button>
              <div className="qs-dot-menu__divider" />
              <button
                className={`qs-dot-menu__item${!currentSaleId ? " qs-dot-menu__item--disabled" : ""}`}
                disabled={!currentSaleId || isBusy}
                onClick={() => { handleUpdateAppointment(); setShowDotMenu(false); setShowDeleteConfirm(false); }}
                title={!currentSaleId ? "Save as draft first to edit" : "Update this draft"}
              >
                ✏️ Edit Draft
              </button>
              <div className="qs-dot-menu__divider" />
              {!showDeleteConfirm ? (
                <button className="qs-dot-menu__item qs-dot-menu__item--danger" disabled={isBusy} onClick={() => setShowDeleteConfirm(true)}>
                  🗑 Delete Sale
                </button>
              ) : (
                <div className="qs-dot-menu__confirm">
                  <span className="qs-dot-menu__confirm-text">Delete this sale?</span>
                  <div className="qs-dot-menu__confirm-actions">
                    <button className="qs-dot-menu__confirm-yes" disabled={isDeleting} onClick={handleDeleteSale}>
                      {isDeleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button className="qs-dot-menu__confirm-no" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="qs-dot-menu__divider" />
              <button className="qs-dot-menu__item qs-dot-menu__item--muted" onClick={() => { resetForm(); setShowDotMenu(false); setShowDeleteConfirm(false); }}>
                🔄 Clear Sale
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="qs-layout">

        {/* ── LEFT MAIN ── */}
        <div className="qs-main">

          {initLoading && <div className="qs-alert qs-alert--info"><span>⏳</span> Loading catalog data…</div>}
          {successMsg  && <div className="qs-alert qs-alert--success"><span>✓</span> {successMsg}</div>}
          {errorMsg    && <div className="qs-alert qs-alert--error"><span>⚠</span> {errorMsg}</div>}

          {/* ═══ CLIENT ═══ */}
          <div className="qs-card">
            <div className="qs-card-header">
              <div className="qs-card-header__left">
                <span className="qs-card-header__icon"><IconUser /></span>
                <span className="qs-card-header__title">Client</span>
              </div>
            </div>

            <div className="qs-card-body">
              <div className="qs-client-row">
                <div style={{ flex: 1, minWidth: 180 }}>
                  <ClientSearchInput
                    value={clientSearch}
                    onChange={(val) => {
                      setClientSearch(val);
                      if (isWalkin) setIsWalkin(false);
                      if (!val) setClient(null);
                      if (isPhoneSearch(val)) {
                        const local = extractLocalPhone(val);
                        if (local.length === 10) {
                          setNewClientPhone(local);
                          setPhoneDuplicate(false);
                          setFormErrors((prev) => prev.filter((x) => x !== "phone"));
                        }
                      }
                    }}
                    onNoResults={(term) => {
                      if (isPhoneSearch(term)) {
                        const local = extractLocalPhone(term);
                        setNewClientPhone(local);
                        setPhoneDuplicate(false);
                        setFormErrors((prev) => prev.filter((x) => x !== "phone"));
                        setShowAddClientForm(true);
                        setIsClientSaved(false);
                        if (local.replace(/\D/g, "").length === 10) checkPhoneExists(local);
                      }
                    }}
                    onSelect={(c: ClientSearchResult) => {
                      const name = `${c.first_name} ${c.last_name || ""}`.trim();
                      setClient({ id: String(c.id), name, phone: c.phone_number ?? "", initials: toInitials(name) });
                      setClientSearch(name);
                      setNewClientFirstName(c.first_name || "");
                      setNewClientLastName(c.last_name || "");
                      if (c.phone_number) {
                        const local = extractLocalPhone(c.phone_number);
                        setNewClientPhone(local);
                        setPhoneDuplicate(false);
                        setFormErrors((prev) => prev.filter((x) => x !== "phone"));
                      }
                    }}
                    placeholder="Search client by name or phone…"
                  />
                </div>

                <button className={`qs-pill-btn${isWalkin ? " qs-pill-btn--active" : ""}`} onClick={handleWalkinClick}>
                  🚶 Walk-In
                </button>

                <button
                  className="qs-pill-btn qs-pill-btn--primary"
                  onClick={() => { setShowAddClientForm((v) => !v); setIsClientSaved(false); }}
                >
                  {showAddClientForm ? "✕ Cancel" : <><IconPlus /> Add Client</>}
                </button>

                <div ref={datePickerRef} style={{ position: "relative" }}>
                  <button className="qs-date-btn" onClick={() => setShowDatePicker((v) => !v)} type="button">
                    <IconCal />
                    <span>{formatDisplayDate(saleDate)}</span>
                  </button>
                  {showDatePicker && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 1000 }}>
                      <MiniCalendar value={saleDate} onChange={(d) => { setSaleDate(d); setShowDatePicker(false); }} onClose={() => setShowDatePicker(false)} />
                    </div>
                  )}
                </div>
              </div>

              {(client || isWalkin) && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="qs-client-display">
                    <div className="qs-client-display__avatar">{isWalkin ? "🚶" : client?.initials}</div>
                    <span className="qs-client-display__name">{isWalkin ? "Walk-In Customer" : client?.name}</span>
                  </div>
                  <button
                    className="qs-pill-btn qs-pill-btn--sm"
                    style={{ color: "#ef4444", borderColor: "#fecaca" }}
                    onClick={() => { setClient(null); setClientSearch(""); setIsWalkin(false); }}
                  >✕</button>
                </div>
              )}

              {showAddClientForm && (
                <AddClientForm
                  newClientFirstName={newClientFirstName}
                  newClientLastName={newClientLastName}
                  newClientPhone={newClientPhone}
                  newClientGender={newClientGender}
                  selectedCountry={selectedCountry}
                  isClientSaved={isClientSaved}
                  phoneDuplicate={phoneDuplicate}
                  phoneCheckLoading={phoneCheckLoading}
                  isSavingClient={isSavingClient}
                  formErrors={formErrors}
                  onFirstNameChange={(v) => { setNewClientFirstName(v); setFormErrors((p) => p.filter((x) => x !== "first_name_required" && x !== "first_name_length")); }}
                  onLastNameChange={(v) => { setNewClientLastName(v); setFormErrors((p) => p.filter((x) => x !== "last_name_length")); }}
                  onPhoneChange={(v) => {
                    setNewClientPhone(v);
                    if (phoneDuplicate) setPhoneDuplicate(false);
                    if (phoneValid(v)) { setFormErrors((p) => p.filter((x) => x !== "phone")); checkPhoneExists(v); }
                  }}
                  onGenderChange={(v) => { setNewClientGender(v); setFormErrors((p) => p.filter((x) => x !== "gender")); }}
                  onCountryChange={setSelectedCountry}
                  onPhoneBlur={() => { if (phoneValid(newClientPhone)) checkPhoneExists(newClientPhone); }}
                  onSave={handleSaveNewClient}
                />
              )}
            </div>
          </div>

          {/* ═══ SERVICES & ITEMS ═══ */}
          <div className="qs-card">
            <div className="qs-card-header">
              <div className="qs-card-header__left">
                <span className="qs-card-header__icon"><IconTag /></span>
                <span className="qs-card-header__title">Services &amp; Items</span>
              </div>
            </div>

            <div className="qs-type-tabs">
              <button className={`qs-type-tab${activeTab === "services" ? " qs-type-tab--active" : ""}`} onClick={() => handleTabClick("services")}>
                ✂ Services
                {serviceRows.length > 0 && <span className="qs-type-tab__count">{serviceRows.length}</span>}
              </button>
              <button className={`qs-type-tab${activeTab === "products" ? " qs-type-tab--active" : ""}`} onClick={() => handleTabClick("products")}>
                📦 Products
                {productRows.length > 0 && <span className="qs-type-tab__count">{productRows.length}</span>}
              </button>
              <button className={`qs-type-tab${activeTab === "memberships" ? " qs-type-tab--active" : ""}`} onClick={() => handleTabClick("memberships")}>
                🎫 Memberships
                {membershipRows.length > 0 && <span className="qs-type-tab__count">{membershipRows.length}</span>}
              </button>
            </div>

            {/* Services tab */}
            {activeTab === "services" && (
              <>
                {serviceRows.length > 0 && <ServiceColHeaders />}
                {serviceRows.map((row) => (
                  <ServiceItemRow key={row.tempId} row={row} staffList={staffList} servicesList={servicesList} onUpdate={updateSvcRow} onRemove={removeSvcRow} />
                ))}
                {serviceRows.length === 0 && (
                  <ItemEmptyState icon="✂️" text="No services added yet" hint="+ Click to add a service" onClick={addSvcRow} />
                )}
              </>
            )}

            {/* Products tab */}
            {activeTab === "products" && (
              <>
                {productRows.length > 0 && <ProductColHeaders />}
                {productRows.map((row) => (
                  <ProductItemRow key={row.tempId} row={row} staffList={staffList} productsList={productsList} onUpdate={updateProdRow} onRemove={removeProdRow} />
                ))}
                {productRows.length === 0 && (
                  <ItemEmptyState icon="📦" text="No products added yet" hint="+ Click to add a product" onClick={addProdRow} />
                )}
              </>
            )}

            {/* Memberships tab */}
            {activeTab === "memberships" && (
              <>
                {membershipRows.length > 0 && <MembershipColHeaders />}
                {membershipRows.map((row) => (
                  <MembershipItemRow key={row.tempId} row={row} staffList={staffList} membershipsList={membershipsList} onUpdate={updateMemRow} onRemove={removeMemRow} />
                ))}
                {membershipRows.length === 0 && (
                  <ItemEmptyState icon="🎫" text="No memberships added yet" hint="+ Click to add a membership" onClick={addMemRow} />
                )}
              </>
            )}
          </div>

          {/* ═══ CHARGES & DISCOUNTS ═══ */}
          <div className="qs-card">
            <div className="qs-card-header">
              <div className="qs-card-header__left">
                <span className="qs-card-header__icon"><IconPercent /></span>
                <span className="qs-card-header__title">Charges &amp; Discounts</span>
              </div>
            </div>

            <div className="qs-card-body">
              <div className="qs-charges-grid">
                <div className="qs-charge-col">
                  <label className="qs-label">Extra Charges (₹)</label>
                  <input className="qs-inp" type="number" min={0} value={exCharges || ""} placeholder="0" onChange={(e) => setExCharges(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="qs-charge-col">
                  <label className="qs-label">Discount</label>
                  <input className="qs-inp" type="number" min={0} value={discountValue || ""} placeholder="0" onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="qs-charge-col">
                  <label className="qs-label">Discount Type</label>
                  <select className="qs-inp" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percentage" | "flat")}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div className="qs-charge-col">
                  <label className="qs-label">Tip (₹)</label>
                  <input
                    className="qs-inp"
                    type="number"
                    min={0}
                    value={showCustomTip ? customTip : tipPreset !== null ? tipPreset : ""}
                    placeholder="0"
                    onChange={(e) => { setShowCustomTip(true); setTipPreset(null); setCustomTip(e.target.value); }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="qs-label" style={{ marginBottom: 6, display: "block" }}>Sale Notes</label>
                <textarea className="qs-textarea" placeholder="Enter any notes for this sale…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="qs-sidebar">
          <div className="qs-sidebar__scroll">

            {/* Order Summary */}
            <div className="qs-sidebar-section">
              <div className="qs-sidebar-section__title">📋 Order Summary</div>

              {hasItems && (
                <div className="qs-confirm-list">
                  {serviceRows.filter((r) => r.service).map((r) => (
                    <div key={r.tempId} className="qs-confirm-item">
                      <div className="qs-confirm-item__info">
                        <span className="qs-confirm-item__name">{r.service}</span>
                        <span className="qs-confirm-item__meta">{staffList.find((s) => s.id === r.staffId)?.name || "Any staff"} · ✂ Service</span>
                      </div>
                      <span className="qs-confirm-item__price">₹{r.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {productRows.filter((r) => r.productName).map((r) => (
                    <div key={r.tempId} className="qs-confirm-item">
                      <div className="qs-confirm-item__info">
                        <span className="qs-confirm-item__name">{r.productName}</span>
                        <span className="qs-confirm-item__meta">Qty: {r.qty} · 📦 Product</span>
                      </div>
                      <span className="qs-confirm-item__price">₹{r.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {membershipRows.filter((r) => r.name).map((r) => (
                    <div key={r.tempId} className="qs-confirm-item">
                      <div className="qs-confirm-item__info">
                        <span className="qs-confirm-item__name">{r.name}</span>
                        <span className="qs-confirm-item__meta">🎫 Membership</span>
                      </div>
                      <span className="qs-confirm-item__price">₹{r.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {!hasItems && (
                <div style={{ padding: "16px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No items added yet
                </div>
              )}

              <div className="qs-summary-rows">
                <div className="qs-summary-row">
                  <span className="qs-summary-row__label">Subtotal</span>
                  <span className="qs-summary-row__value">₹{serviceTotal.toFixed(2)}</span>
                </div>
                {exCharges > 0 && (
                  <div className="qs-summary-row">
                    <span className="qs-summary-row__label">Extra Charges</span>
                    <span className="qs-summary-row__value">+₹{exCharges.toFixed(2)}</span>
                  </div>
                )}
                {cartDiscount > 0 && (
                  <div className="qs-summary-row qs-summary-row--discount">
                    <span className="qs-summary-row__label">Discount</span>
                    <span className="qs-summary-row__value">−₹{cartDiscount.toFixed(2)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="qs-summary-row qs-summary-row--tip">
                    <span className="qs-summary-row__label">Tip (₹)</span>
                    <span className="qs-summary-row__value">+₹{tipAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="qs-summary-row qs-summary-row--total">
                  <span className="qs-summary-row__label">Grand Total</span>
                  <span className="qs-summary-row__value">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {paid > 0 && (
                <div className="qs-gap-row" style={{ marginBottom: 8 }}>
                  <span className="qs-badge qs-badge--paid">✓ Paid ₹{paid.toFixed(2)}</span>
                  {due > 0 && <span className="qs-badge qs-badge--due">Due ₹{due.toFixed(2)}</span>}
                </div>
              )}
            </div>

            {/* Payment section */}
            <div className="qs-sidebar-section">
              <div className="qs-sidebar-section__title"><IconPayment /> Payment Method</div>

              <div className="qs-payment-grid">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`qs-pm-card${!isSplit && paymentMethod === m.id ? " qs-pm-card--active" : ""}`}
                    onClick={() => { setIsSplit(false); setPaymentMethod(m.id); setAmountPaid(grandTotal.toFixed(2)); }}
                  >
                    <span className="qs-pm-card__icon">{m.icon}</span>
                    <span className="qs-pm-card__label">{m.label}</span>
                  </button>
                ))}
                <button
                  className={`qs-pm-card qs-pm-card--split${isSplit ? " qs-pm-card--active" : ""}`}
                  onClick={() => setIsSplit((v) => !v)}
                >
                  <span className="qs-pm-card__icon">⚡</span>
                  <span className="qs-pm-card__label">Split</span>
                </button>
              </div>

              {!isSplit && (paymentMethod === "card" || paymentMethod === "upi") && (
                <input
                  className="qs-ref-input"
                  placeholder={paymentMethod === "card" ? "Card ref / last 4 digits" : "UPI transaction ID"}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              )}

              {isSplit && (
                <div className="qs-split-panel">
                  <div className="qs-split-panel__header">
                    <span>Split Payment</span>
                    <span className={`qs-split-panel__badge${splitRemaining < -0.001 ? " qs-split-panel__badge--over" : splitRemaining < 0.001 ? " qs-split-panel__badge--done" : ""}`}>
                      {splitRemaining < -0.001 ? `Over ₹${Math.abs(splitRemaining).toFixed(2)}` : splitRemaining < 0.001 ? "✓ Full" : `₹${splitRemaining.toFixed(2)} left`}
                    </span>
                  </div>
                  {SPLIT_METHODS.map((m) => (
                    <div key={m.id} className="qs-split-panel__row">
                      <span className="qs-split-panel__label">{m.label}</span>
                      <div className="qs-split-panel__input-wrap">
                        <span className="qs-split-panel__currency">₹</span>
                        <input
                          className="qs-split-panel__input"
                          type="number"
                          min={0}
                          placeholder="0.00"
                          value={splitAmounts[m.id]}
                          onChange={(e) => setSplitAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        />
                        {splitRemaining > 0.001 && parseFloat(splitAmounts[m.id] || "0") === 0 && (
                          <button className="qs-split-panel__fill" onClick={() => setSplitAmounts((prev) => ({ ...prev, [m.id]: splitRemaining.toFixed(2) }))}>Fill</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="qs-split-panel__total">
                    <span>Allocated</span>
                    <span className="qs-split-panel__total-val">₹{splitTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {!isSplit && (
                <div style={{ marginTop: 12 }}>
                  <label className="qs-label" style={{ marginBottom: 6, display: "block" }}>Amount Paid</label>
                  <div className="qs-amount-paid-group">
                    <span className="qs-amount-paid-group__prefix">₹</span>
                    <input className="qs-amount-paid-group__input" type="number" placeholder={grandTotal.toFixed(2)} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="qs-sidebar__footer">
            <button className="qs-pay-btn" disabled={!hasItems || isBusy} onClick={handleConfirmAndPay}>
              {isBusy ? "Processing…" : <>✓ Confirm &amp; Pay — ₹{grandTotal.toFixed(2)}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
