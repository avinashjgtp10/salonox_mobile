import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  fetchSaleByIdThunk,
} from "../../../middleware/sale/sale.thunk";
import { clearSaleError } from "../../../store/saleSlice";
import { fetchClientsThunk } from "../../../middleware/client/client.thunk";
import type { AppDispatch, RootState } from "../../../store/store";
import type { PaymentMethod } from "../../../types/sale.types";

import type {
  InitStaff, InitService, LazyProduct, LazyMembership,
  SvcRow, ProdRow, MemRow, SelectedClient, ItemTab,
} from "../types/quickSale.types";
import { PAYMENT_METHODS } from "../types/quickSale.types";
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
  const [searchParams] = useSearchParams();
  const editId     = searchParams.get("editId");
  const isEditMode = Boolean(editId);

  // In edit mode: Redux selectedItem holds the sale once fetchSaleByIdThunk resolves
  const editSaleFetched = useSelector((s: RootState) => isEditMode ? (s.sale as any).selectedItem : null);
  // Determine if the sale being edited is still a draft (can be checked out) or already completed
  const editSaleStatus  = isEditMode ? (editSaleFetched?.status ?? null) : null;
  const isEditDraft     = !isEditMode || editSaleStatus === "draft" || editSaleStatus === null;
  const rawClientItems  = useSelector((s: RootState) => (s.client as any).items);
  const clientMap = useMemo(() => {
    const list: any[] = Array.isArray(rawClientItems) ? rawClientItems
      : Array.isArray(rawClientItems?.items) ? rawClientItems.items
      : Array.isArray(rawClientItems?.data)  ? rawClientItems.data
      : [];
    const m: Record<string, string> = {};
    list.forEach((c: any) => {
      const name = (c.fullName || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()) || "";
      if (c.id && name) m[String(c.id)] = name;
    });
    return m;
  }, [rawClientItems]);

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
  const [clientError,  setClientError]  = useState("");
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

  const [selectedMethods,    setSelectedMethods]    = useState<string[]>([]);
  const [paymentReference,   setPaymentReference]   = useState("");
  const [amountPaid,         setAmountPaid]         = useState("");
  const [splitAmounts,       setSplitAmounts]       = useState<Record<string, string>>({ cash: "", card: "", upi: "" });
  const [paymentMethodError, setPaymentMethodError] = useState("");

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

  // ── Auto-dismiss error/success banners ────────────────────────────────────
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(""), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

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

  // In edit mode: fetch sale from backend and ensure clients are loaded for name resolution
  useEffect(() => {
    if (isEditMode && editId) {
      dispatch(fetchSaleByIdThunk(editId));
      dispatch(fetchClientsThunk());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dotMenuRef.current    && !dotMenuRef.current.contains(e.target as Node))    setShowDotMenu(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // ── Populate form when fetched sale arrives in Redux (edit mode) ──────────────
  useEffect(() => {
    if (!isEditMode || !editSaleFetched) return;

    // Sale ID
    setCurrentSaleId(editSaleFetched.id);

    // Client — use client_name from sale response, fall back to clientMap
    if (editSaleFetched.client_id) {
      const clientName = editSaleFetched.client_name || clientMap[String(editSaleFetched.client_id)] || "";
      if (clientName) {
        setClient({ id: String(editSaleFetched.client_id), name: clientName, phone: "", initials: toInitials(clientName) });
        setClientSearch(clientName);
        setIsWalkin(false);
      } else {
        // client_id present but name not yet resolved — will retry via clientMap effect below
        setIsWalkin(false);
      }
    } else {
      setIsWalkin(true);
      setClientSearch("Walk-in");
    }

    // Date
    if (editSaleFetched.created_at) {
      const candidateDate = editSaleFetched.created_at.split(/[T ]/)[0];
      setSaleDate(/^\d{4}-\d{2}-\d{2}$/.test(candidateDate) ? candidateDate : todayISO());
    }

    // Notes
    if (editSaleFetched.notes) setNotes(editSaleFetched.notes);

    // Payment method
    if (editSaleFetched.payment_method) {
      setSelectedMethods([editSaleFetched.payment_method]);
      setAmountPaid(editSaleFetched.total_amount || "");
    }

    // Items → rows
    const svcRows: SvcRow[]   = [];
    const prodRows: ProdRow[] = [];
    const memRows: MemRow[]   = [];
    let exChargesVal = 0;

    (editSaleFetched.items ?? []).forEach((item: any) => {
      const price    = parseFloat(item.unit_price    || "0");
      const qty      = Number(item.quantity)          || 1;
      const discAmt  = parseFloat(item.discount_amount || "0");
      const discPct  = price * qty > 0 ? (discAmt / (price * qty)) * 100 : 0;
      const total    = parseFloat(item.total_price   || String(price * qty));
      // staff_id may exist on the backend response even if not in the TypeScript type
      const staffId  = item.staff_id ? String(item.staff_id) : "";

      if (item.item_type === "service") {
        svcRows.push({ tempId: makeTempId(), id: item.item_id || "", service: item.name, staffId, time: "10:00", price, qty, total, duration: 30, search: item.name, showDrop: false, discountVal: discPct, discountType: "percentage", errors: [] });
      } else if (item.item_type === "product") {
        prodRows.push({ tempId: makeTempId(), id: item.item_id || "", productName: item.name, staffId, price, qty, total, search: item.name, showDrop: false, stock: null, discountVal: discPct, discountType: "percentage", errors: [] });
      } else if (item.item_type === "membership") {
        memRows.push({ tempId: makeTempId(), name: item.name, staffId, price, qty, total, search: item.name, showDrop: false, discountVal: discPct, discountType: "percentage", errors: [] });
      } else if (item.item_type === "quick") {
        exChargesVal = price;
      }
    });

    if (svcRows.length)  { setServiceRows(svcRows);    setActiveTab("services"); }
    if (prodRows.length) { setProductRows(prodRows);   if (!svcRows.length)  setActiveTab("products"); }
    if (memRows.length)  { setMembershipRows(memRows); if (!svcRows.length && !prodRows.length) setActiveTab("memberships"); }
    if (exChargesVal > 0) setExCharges(exChargesVal);

    // Cart-level discount
    if (editSaleFetched.discount_amount && parseFloat(editSaleFetched.discount_amount) > 0) {
      setDiscountValue(parseFloat(editSaleFetched.discount_amount));
      setDiscountType("flat");
    }

    // Tip
    if (editSaleFetched.tip_amount && parseFloat(editSaleFetched.tip_amount) > 0) {
      setTipPreset(parseFloat(editSaleFetched.tip_amount));
    }
  }, [editSaleFetched]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resolve client name once clientMap loads (handles race with fetchClientsThunk) ─
  useEffect(() => {
    if (!isEditMode || !editSaleFetched?.client_id || client || isWalkin) return;
    const name = editSaleFetched.client_name || clientMap[String(editSaleFetched.client_id)];
    if (name) {
      setClient({ id: String(editSaleFetched.client_id), name, phone: "", initials: toInitials(name) });
      setClientSearch(name);
    }
  }, [clientMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy loaders ───────────────────────────────────────────────────────────
  async function ensureProductsLoaded()    { if (!productsLoaded)    dispatch(fetchSaleProductsThunk()); }
  async function ensureMembershipsLoaded() { if (!membershipsLoaded) dispatch(fetchSaleMembershipsThunk()); }

  // ── Derived totals ─────────────────────────────────────────────────────────
  const isSplit = selectedMethods.length > 1;
  const splitTotal = selectedMethods.reduce((s, id) => s + (parseFloat(splitAmounts[id] || "0")), 0);

  const hasItems =
    serviceRows.some((r) => r.service) ||
    productRows.some((r) => r.productName) ||
    membershipRows.some((r) => r.name);

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
    setServiceRows((r) => [...r, { tempId: makeTempId(), id: "", service: "", staffId: "", time: "10:00", price: 0, qty: 1, total: 0, duration: 30, search: "", showDrop: false, discountVal: 0, discountType: "percentage", errors: [] }]);
    setErrorMsg("");
  }
  function updateSvcRow(tid: string, p: Partial<SvcRow>) { setServiceRows((r) => r.map((x) => x.tempId === tid ? { ...x, ...p } : x)); }
  function removeSvcRow(tid: string) { setServiceRows((r) => r.filter((x) => x.tempId !== tid)); }

  async function addProdRow() {
    await ensureProductsLoaded();
    setActiveTab("products");
    setProductRows((r) => [...r, { tempId: makeTempId(), id: "", productName: "", staffId: "", price: 0, qty: 1, total: 0, search: "", showDrop: false, stock: null, discountVal: 0, discountType: "percentage", errors: [] }]);
    setErrorMsg("");
  }
  function updateProdRow(tid: string, p: Partial<ProdRow>) { setProductRows((r) => r.map((x) => x.tempId === tid ? { ...x, ...p } : x)); }
  function removeProdRow(tid: string) { setProductRows((r) => r.filter((x) => x.tempId !== tid)); }

  async function addMemRow() {
    await ensureMembershipsLoaded();
    setActiveTab("memberships");
    setMembershipRows((r) => [...r, { tempId: makeTempId(), name: "", staffId: "", price: 0, qty: 1, total: 0, search: "", showDrop: false, discountVal: 0, discountType: "percentage", errors: [] }]);
    setErrorMsg("");
  }
  function updateMemRow(tid: string, p: Partial<MemRow>) { setMembershipRows((r) => r.map((x) => x.tempId === tid ? { ...x, ...p } : x)); }
  function removeMemRow(tid: string) { setMembershipRows((r) => r.filter((x) => x.tempId !== tid)); }

  function handleTabClick(tab: ItemTab) {
    setActiveTab(tab);
    if (tab === "products")    ensureProductsLoaded();
    if (tab === "memberships") ensureMembershipsLoaded();
  }

  // ── Walk-In ────────────────────────────────────────────────────────────────
  function handleWalkinClick() {
    setIsWalkin(true); setClient(null);
    setClientSearch("Walk-in"); setShowAddClientForm(false); setFormErrors([]);
    setClientError("");
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
      setClientError("");
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
    setClientError("");
    setNotes(""); setDiscountValue(0); setExCharges(0);
    setTipPreset(null); setCustomTip(""); setShowCustomTip(false);
    setAmountPaid(""); setPaymentReference("");
    setSelectedMethods([]); setSplitAmounts({ cash: "", card: "", upi: "" }); setPaymentMethodError("");
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
        const discAmt = (r.price * (Number(r.qty) || 0) * r.discountVal) / 100;
        return { item_type: "service" as const, name: r.service, staff_id: r.staffId || undefined, quantity: Number(r.qty) || 0, unit_price: String(r.price), discount_amount: discAmt > 0 ? discAmt.toFixed(2) : undefined };
      }),
      ...productRows.filter((r) => r.productName).map((r) => {
        const discAmt = (r.price * (Number(r.qty) || 0) * r.discountVal) / 100;
        return { item_type: "product" as const, item_id: r.id || undefined, name: r.productName, staff_id: r.staffId || undefined, quantity: Number(r.qty) || 0, unit_price: String(r.price), discount_amount: discAmt > 0 ? discAmt.toFixed(2) : undefined };
      }),
      ...membershipRows.filter((r) => r.name).map((r) => {
        const discAmt = (r.price * (Number(r.qty) || 0) * r.discountVal) / 100;
        return { item_type: "membership" as const, name: r.name, staff_id: r.staffId || undefined, quantity: Number(r.qty) || 0, unit_price: String(r.price), discount_amount: discAmt > 0 ? discAmt.toFixed(2) : undefined };
      }),
    ];
    if (exCharges > 0) lineItems.push({ item_type: "quick" as const, name: "Extra Charges", quantity: 1, unit_price: String(exCharges) });
    return lineItems;
  }

  function buildNotes() { return notes.trim() || undefined; }

  // ── Validation ────────────────────────────────────────────────────────────
  function runValidation(): boolean {
    let ok = true;

    // 1. Client
    if (!client && !isWalkin) {
      setClientError(
        showAddClientForm
          ? "Please save the new client or cancel the form."
          : "Please select a client or choose Walk-In."
      );
      ok = false;
    } else {
      setClientError("");
    }

    // 2. Items — compute all row errors synchronously outside state setters
    const hasAnyRows = serviceRows.length > 0 || productRows.length > 0 || membershipRows.length > 0;

    if (!hasAnyRows) {
      setErrorMsg("Add at least one service, product or membership.");
      ok = false;
    } else {
      const staffRequired = !isEditMode;
      const newSvcRows = serviceRows.map((r) => {
        const errs: string[] = [];
        if (!r.service)                  errs.push("service");
        if (staffRequired && !r.staffId) errs.push("staff");
        if (Number(r.qty) < 1)           errs.push("qty");
        return { ...r, errors: errs };
      });
      const newProdRows = productRows.map((r) => {
        const errs: string[] = [];
        if (!r.productName)              errs.push("product");
        if (staffRequired && !r.staffId) errs.push("staff");
        if (Number(r.qty) < 1)           errs.push("qty");
        return { ...r, errors: errs };
      });
      const newMemRows = membershipRows.map((r) => {
        const errs: string[] = [];
        if (!r.name)                     errs.push("membership");
        if (staffRequired && !r.staffId) errs.push("staff");
        if (Number(r.qty) < 1)           errs.push("qty");
        return { ...r, errors: errs };
      });

      setServiceRows(newSvcRows);
      setProductRows(newProdRows);
      setMembershipRows(newMemRows);

      const firstErrTab: ItemTab | null =
        newSvcRows.some((r) => r.errors.length > 0) ? "services" :
        newProdRows.some((r) => r.errors.length > 0) ? "products"  :
        newMemRows.some((r) => r.errors.length > 0)  ? "memberships" :
        null;

      if (firstErrTab) {
        setActiveTab(firstErrTab);
        setErrorMsg("Please fix the highlighted errors in your items.");
        ok = false;
      } else if (ok) {
        setErrorMsg("");
      }
    }

    return ok;
  }

  function runPaymentValidation(): boolean {
    if (selectedMethods.length === 0) {
      setPaymentMethodError("Please select a payment method.");
      return false;
    }
    setPaymentMethodError("");
    return true;
  }

  // ── Save Draft ─────────────────────────────────────────────────────────────
  async function handleUpdateAppointment() {
    if (!salonId) { setErrorMsg("Salon not loaded. Please refresh."); return; }
    if (!runValidation()) return;

    setIsSubmitting(true); setErrorMsg(""); setSuccessMsg("");
    const resolvedSaleId = currentSaleId ?? (isEditMode ? editId : null);
    try {
      if (resolvedSaleId) {
        const result = await dispatch(updateSaleThunk({
          id: resolvedSaleId,
          data: { client_id: client?.id ?? null, items: buildItemsPayload(), discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined, tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined, notes: buildNotes(), created_at: saleDate },
        }));
        if (updateSaleThunk.fulfilled.match(result)) setSuccessMsg("Draft updated successfully!");
        else setErrorMsg((result.payload as string) || "Failed to update draft.");
      } else {
        const result = await dispatch(createSaleThunk({
          client_id: client?.id ?? null, status: "draft", items: buildItemsPayload(),
          discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined,
          tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
          notes: buildNotes(), created_at: saleDate,
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
    const itemsOk   = runValidation();
    const paymentOk = runPaymentValidation();
    if (!itemsOk || !paymentOk) return;

    setIsSubmitting(true); setErrorMsg(""); setSuccessMsg("");
    try {
      let saleId = currentSaleId;
      if (!saleId) {
        const createResult = await dispatch(createSaleThunk({
          client_id: client?.id ?? null, status: "draft", items: buildItemsPayload(),
          discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : undefined,
          tip_amount: tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
          notes: buildNotes(), created_at: saleDate,
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
              Object.fromEntries(
                selectedMethods
                  .filter((id) => parseFloat(splitAmounts[id] || "0") > 0)
                  .map((id) => [id, parseFloat(splitAmounts[id] || "0")])
              )
            ),
          }
        : {
            id: saleId, payment_method: selectedMethods[0] as PaymentMethod,
            amount_paid: parseFloat(amountPaid || grandTotal.toString()),
            payment_reference: paymentReference || undefined,
          };

      const checkoutResult = await dispatch(checkoutSaleThunk(checkoutPayload));
      if (checkoutSaleThunk.fulfilled.match(checkoutResult)) {
        setSuccessMsg("Sale completed successfully!"); resetForm();
      } else {
        setErrorMsg((checkoutResult.payload as string) || "Checkout failed.");
      }
    } finally { setIsSubmitting(false); }
  }

  // ── Pay Now in Edit mode (update items then checkout) ─────────────────────
  async function handleCheckoutEditSale() {
    const saleId = currentSaleId ?? editId;
    if (!saleId) { setErrorMsg("Sale ID missing — cannot checkout."); return; }
    // Completed sales cannot be re-checked out; fall back to update-only
    if (!isEditDraft) { return handleUpdateSale(); }
    const itemsOk   = runValidation();
    const paymentOk = runPaymentValidation();
    if (!itemsOk || !paymentOk) return;

    setIsSubmitting(true); setErrorMsg(""); setSuccessMsg("");
    try {
      // Update items/amounts first
      const updateResult = await dispatch(updateSaleThunk({
        id: saleId,
        data: {
          client_id:       client?.id ?? null,
          items:           buildItemsPayload(),
          discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : "0",
          tip_amount:      tipAmount    > 0 ? tipAmount.toFixed(2)    : "0",
          notes:           buildNotes(),
          created_at:      saleDate,
        },
      }));
      if (updateSaleThunk.rejected.match(updateResult)) {
        setErrorMsg((updateResult.payload as string) || "Failed to update sale."); return;
      }

      // Then checkout
      const checkoutPayload = isSplit
        ? {
            id: saleId, payment_method: "split" as PaymentMethod, amount_paid: splitTotal,
            payment_reference: JSON.stringify(
              Object.fromEntries(
                selectedMethods
                  .filter((id) => parseFloat(splitAmounts[id] || "0") > 0)
                  .map((id) => [id, parseFloat(splitAmounts[id] || "0")])
              )
            ),
          }
        : {
            id: saleId, payment_method: selectedMethods[0] as PaymentMethod,
            amount_paid: parseFloat(amountPaid || grandTotal.toString()),
            payment_reference: paymentReference || undefined,
          };

      const checkoutResult = await dispatch(checkoutSaleThunk(checkoutPayload));
      if (checkoutSaleThunk.fulfilled.match(checkoutResult)) {
        setSuccessMsg("Sale completed successfully!");
        setTimeout(() => navigate("/dashboard/sales"), 1500);
      } else {
        setErrorMsg((checkoutResult.payload as string) || "Checkout failed.");
      }
    } finally { setIsSubmitting(false); }
  }

  // ── Update existing sale (Edit mode) ──────────────────────────────────────
  async function handleUpdateSale() {
    const saleId = currentSaleId ?? editId;
    if (!saleId) { setErrorMsg("Sale ID missing — cannot update."); return; }
    const itemsOk = runValidation();
    if (!itemsOk) return;

    setIsSubmitting(true); setErrorMsg(""); setSuccessMsg("");
    try {
      const result = await dispatch(updateSaleThunk({
        id: saleId,
        data: {
          client_id:       client?.id ?? null,
          items:           buildItemsPayload(),
          discount_amount: cartDiscount > 0 ? cartDiscount.toFixed(2) : "0",
          tip_amount:      tipAmount    > 0 ? tipAmount.toFixed(2)    : "0",
          notes:           buildNotes(),
          created_at:      saleDate,
        },
      }));
      if (updateSaleThunk.rejected.match(result)) {
        setErrorMsg((result.payload as string) || "Failed to update sale."); return;
      }
      setSuccessMsg("Sale updated successfully.");
      setTimeout(() => navigate("/dashboard/sales"), 1500);
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
          <span className="qs-topbar__title">{isEditMode ? "Edit Sale" : "Quick Sale"}</span>
          {isEditMode && <span className="qs-topbar__badge qs-topbar__badge--edit">Editing</span>}
          {!isEditMode && currentSaleId && <span className="qs-topbar__badge">Draft</span>}
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
          {successMsg  && <div className="qs-alert qs-alert--success"><span>✓</span> {successMsg}<button className="qs-alert__close" onClick={() => setSuccessMsg("")}>×</button></div>}
          {errorMsg    && <div className="qs-alert qs-alert--error"><span>⚠</span> {errorMsg}<button className="qs-alert__close" onClick={() => setErrorMsg("")}>×</button></div>}

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
                      if (val) setClientError("");
                      // clear stale name fields on every new search keystroke
                      setNewClientFirstName("");
                      setNewClientLastName("");
                      setIsClientSaved(false);
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
                      const digits = term.replace(/\D/g, "");
                      if (digits.length > 0 && digits === term.trim()) {
                        const local = extractLocalPhone(term);
                        setNewClientPhone(local);
                        setPhoneDuplicate(false);
                        setFormErrors((prev) => prev.filter((x) => x !== "phone"));
                        setShowAddClientForm(true);
                        setIsClientSaved(false);
                        if (local.length === 10) checkPhoneExists(local);
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
                      setShowAddClientForm(false);
                      setFormErrors([]);
                      setClientError("");
                    }}
                    placeholder="Search client by name or phone…"
                    hasError={!!clientError}
                  />
                  {clientError && <div className="qs-field-error" style={{ marginTop: 4, paddingLeft: 2 }}>{clientError}</div>}
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
                {serviceRows.some((r) => r.errors.length > 0) && <span className="qs-tab-error-dot" />}
              </button>
              <button className={`qs-type-tab${activeTab === "products" ? " qs-type-tab--active" : ""}`} onClick={() => handleTabClick("products")}>
                📦 Products
                {productRows.length > 0 && <span className="qs-type-tab__count">{productRows.length}</span>}
                {productRows.some((r) => r.errors.length > 0) && <span className="qs-tab-error-dot" />}
              </button>
              <button className={`qs-type-tab${activeTab === "memberships" ? " qs-type-tab--active" : ""}`} onClick={() => handleTabClick("memberships")}>
                🎫 Memberships
                {membershipRows.length > 0 && <span className="qs-type-tab__count">{membershipRows.length}</span>}
                {membershipRows.some((r) => r.errors.length > 0) && <span className="qs-tab-error-dot" />}
              </button>
            </div>

            {/* Services tab */}
            {activeTab === "services" && (
              <>
                {serviceRows.length > 0 && <ServiceColHeaders />}
                {serviceRows.map((row) => (
                  <ServiceItemRow key={row.tempId} row={row} staffList={staffList} servicesList={servicesList} onUpdate={updateSvcRow} onRemove={removeSvcRow} />
                ))}
                {serviceRows.length === 0
                  ? <ItemEmptyState icon="✂️" text="No services added yet" hint="+ Click to add a service" onClick={addSvcRow} />
                  : <button className="qs-add-row-btn" onClick={addSvcRow}><IconPlus /> Add Service</button>
                }
              </>
            )}

            {/* Products tab */}
            {activeTab === "products" && (
              <>
                {productRows.length > 0 && <ProductColHeaders />}
                {productRows.map((row) => (
                  <ProductItemRow key={row.tempId} row={row} staffList={staffList} productsList={productsList} onUpdate={updateProdRow} onRemove={removeProdRow} />
                ))}
                {productRows.length === 0
                  ? <ItemEmptyState icon="📦" text="No products added yet" hint="+ Click to add a product" onClick={addProdRow} />
                  : <button className="qs-add-row-btn" onClick={addProdRow}><IconPlus /> Add Product</button>
                }
              </>
            )}

            {/* Memberships tab */}
            {activeTab === "memberships" && (
              <>
                {membershipRows.length > 0 && <MembershipColHeaders />}
                {membershipRows.map((row) => (
                  <MembershipItemRow key={row.tempId} row={row} staffList={staffList} membershipsList={membershipsList} onUpdate={updateMemRow} onRemove={removeMemRow} />
                ))}
                {membershipRows.length === 0
                  ? <ItemEmptyState icon="🎫" text="No memberships added yet" hint="+ Click to add a membership" onClick={addMemRow} />
                  : <button className="qs-add-row-btn" onClick={addMemRow}><IconPlus /> Add Membership</button>
                }
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

          {/* Order summary — items scroll, totals fixed */}
          <div className="qs-sidebar__order">
            <div className="qs-order-header">📋 Order Summary</div>

            {/* Scrollable items list */}
            <div className="qs-order-items">
              {hasItems ? (
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
              ) : (
                <div style={{ padding: "14px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No items added yet
                </div>
              )}
            </div>

            {/* Fixed totals */}
            <div className="qs-order-totals">
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
                <div className="qs-gap-row" style={{ paddingBottom: 4 }}>
                  <span className="qs-badge qs-badge--paid">✓ Paid ₹{paid.toFixed(2)}</span>
                  {due > 0 && <span className="qs-badge qs-badge--due">Due ₹{due.toFixed(2)}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Fixed payment section */}
          <div className="qs-sidebar__payment">
            <div className="qs-sidebar-section__title"><IconPayment /> Payment Method</div>

              <div className="qs-payment-grid">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`qs-pm-card${selectedMethods.includes(m.id) ? " qs-pm-card--active" : ""}`}
                    onClick={() => {
                      setSelectedMethods((prev) =>
                        prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                      );
                      setPaymentMethodError("");
                    }}
                  >
                    <span className="qs-pm-card__icon">{m.icon}</span>
                    <span className="qs-pm-card__label">{m.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethodError && <div className="qs-field-error" style={{ marginBottom: 8 }}>{paymentMethodError}</div>}

              {!isSplit && selectedMethods.length === 1 && (selectedMethods[0] === "card" || selectedMethods[0] === "upi") && (
                <input
                  className="qs-ref-input"
                  placeholder={selectedMethods[0] === "card" ? "Card ref / last 4 digits" : "UPI transaction ID"}
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
                  {PAYMENT_METHODS.filter((m) => selectedMethods.includes(m.id)).map((m) => (
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

              {selectedMethods.length === 1 && (
                <div style={{ marginTop: 12 }}>
                  <label className="qs-label" style={{ marginBottom: 6, display: "block" }}>Amount Paid</label>
                  <div className="qs-amount-paid-group">
                    <span className="qs-amount-paid-group__prefix">₹</span>
                    <input className="qs-amount-paid-group__input" type="number" placeholder={grandTotal.toFixed(2)} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                  </div>
                </div>
              )}
          </div>

          <div className="qs-sidebar__footer">
            {isEditMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isEditDraft ? (
                  <button
                    className="qs-pay-btn"
                    disabled={!hasItems || isBusy || selectedMethods.length === 0}
                    onClick={handleCheckoutEditSale}
                  >
                    {isBusy ? "Processing…" : `✓ Pay Now — ₹${grandTotal.toFixed(2)}`}
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "7px 10px", textAlign: "center", fontWeight: 500 }}>
                    ✓ Payment complete — edit items below and click Save Changes
                  </div>
                )}
                <button
                  className="qs-pay-btn qs-pay-btn--update"
                  disabled={!hasItems || isBusy}
                  onClick={handleUpdateSale}
                >
                  {isBusy ? "Saving…" : "💾 Save Changes"}
                </button>
              </div>
            ) : (
              <button className="qs-pay-btn" disabled={!hasItems || isBusy || (isSplit && splitRemaining < -0.001)} onClick={handleConfirmAndPay}>
                {isBusy ? "Processing…" : <>✓ Confirm &amp; Pay — ₹{(isSplit ? splitTotal : parseFloat(amountPaid || grandTotal.toString())).toFixed(2)}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
