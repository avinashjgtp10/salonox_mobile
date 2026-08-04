import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ServiceItem } from "../../types/scheduler-types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";
import { Trash } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import { SERVICES } from "../../../../services/api/endpoints/services.endpoints";
import { IconClock, IconBox, IconTag } from "../../../../components/shared/QuickSaleIcons";
import "../../styles/AppointmentModal.scss";

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 350;

interface StaffDto {
  id: string | number;
  name: string;
}

interface RawConsumableUsage {
  product_id: string;
  product_name?: string;
  qty: number;
  unit: string;
}

interface SearchServiceResult {
  id: string;
  name: string;
  price: number;
  duration: number;
  consumables_used: RawConsumableUsage[];
  categoryId?: string;
}

interface RawServiceItem {
  id?: string | number;
  name?: string;
  price?: string | number;
  duration?: string | number;
  duration_minutes?: string | number;
  consumables_used?: RawConsumableUsage[];
  category_id?: string;
}

interface ServiceRowProps {
  row: ServiceItem & { tempId: string };
  onChange: (id: string, field: string, value: string | number | boolean | ServiceItem["consumables"]) => void;
  onRemove: (id: string) => void;
  onClearError?: (tempId: string, field: string) => void;
  hasError?: boolean;
  errorFields?: { service?: boolean; staff?: boolean; time?: boolean; price?: boolean; qty?: boolean };
  disabled?: boolean;
  /** Pre-pooled package sessions remaining for THIS row specifically (see
   *  perRowCoveredRemaining in AppointmentModal.tsx) — already resolved by
   *  the parent by walking every row in order, so two rows of the same
   *  covered service split the real remaining sessions instead of each
   *  independently seeing the full pool and both claiming to be covered. */
  packageSessionsRemaining?: number;
  membershipWalletInfo?: { walletUsed: number; payable: number };
  /** This row's own GST from the live pricing preview (see serviceTaxByRow in
   *  AppointmentModal.tsx) — the real per-item tax it will carry once saved. */
  taxAmount?: number;
  /** This row's own Discount Balance/Loyalty membership discount (see
   *  serviceMembershipDiscountByRow in AppointmentModal.tsx) — already
   *  excluded from this row's own taxable base server-side, shown here so
   *  it's visible against the price it actually reduced. */
  membershipDiscountAmount?: number;
  /** Live Actual Qty edits for this row's consumables, keyed by productId —
   *  a sibling of row.consumables (see AppointmentModal's consumableActuals
   *  state), read here to render the current value; edits are reported back
   *  via onConsumableActualChange rather than through the normal onChange
   *  path, since that path patches serviceRows directly and would re-trigger
   *  calculate-totals. */
  consumableActuals?: Record<string, number>;
  onConsumableActualChange?: (productId: string, actualQty: number) => void;
}

function fmtName(name: string) {
  return name.includes(" ") ? name : name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getSafeQty(qty?: number) {
  return Number.isInteger(qty) && (qty ?? 0) > 0 ? Number(qty) : 1;
}

function formatPriceForSearch(value: number) {
  const fixed = value.toFixed(2);
  return fixed.endsWith(".00") ? String(Math.trunc(value)) : fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function mapServiceSearchResult(service: RawServiceItem): SearchServiceResult {
  return {
    id: String(service.id ?? ""),
    name: service.name ?? "",
    price: parseFloat(String(service.price ?? 0)) || 0,
    duration: Number(service.duration ?? service.duration_minutes) || 30,
    consumables_used: service.consumables_used ?? [],
    categoryId: service.category_id ?? undefined,
  };
}

function matchesServicePrice(service: SearchServiceResult, searchValue: string) {
  const numericValue = Number(service.price);
  if (!Number.isFinite(numericValue)) return false;

  return numericValue === Number(searchValue) || formatPriceForSearch(numericValue).includes(searchValue);
}

function matchesServiceSearch(service: SearchServiceResult, searchValue: string, isNumericSearch: boolean) {
  if (isNumericSearch) return matchesServicePrice(service, searchValue);
  return service.name.toLowerCase().includes(searchValue.toLowerCase());
}

function extractServiceResults(response: any): RawServiceItem[] {
  const payload = response?.data?.data ?? response?.data ?? {};

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function extractServiceTotalPages(response: any) {
  const payload = response?.data?.data ?? response?.data ?? {};
  const totalPages = Number(
    payload?.totalPages ??
    payload?.total_pages ??
    payload?.pagination?.totalPages ??
    payload?.pagination?.total_pages ??
    response?.data?.pagination?.totalPages ??
    response?.data?.pagination?.total_pages ??
    1
  );

  return Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
}

function mergeServiceResults(
  base: SearchServiceResult[],
  incoming: SearchServiceResult[],
) {
  const merged = [...base];

  incoming.forEach((service) => {
    if (!merged.some((existing) => String(existing.id || existing.name) === String(service.id || service.name))) {
      merged.push(service);
    }
  });

  return merged;
}

const ServiceRow: React.FC<ServiceRowProps> = ({
  row,
  onChange,
  onRemove,
  onClearError,
  errorFields = {},
  disabled,
  packageSessionsRemaining = 0,
  membershipWalletInfo,
  taxAmount,
  membershipDiscountAmount,
  consumableActuals,
  onConsumableActualChange,
}) => {
  const { currencySymbol } = useCurrency();
  const schedulerContext = useSchedulerContext();

  const interval = schedulerContext.interval;
  const staffList = schedulerContext.staffList as StaffDto[] | undefined;
  const servicesList = schedulerContext.servicesList as RawServiceItem[] | undefined;
  // Current on-hand stock per product (same cached list the "+ Product" row
  // picker already uses) — for the Consumables panel's Remaining Stock
  // column and the over-stock warning, without a separate fetch.
  const productsList = schedulerContext.productsList as Array<{ id: string; stock: number }> | undefined;
  const productStockById = React.useMemo(() => {
    const map = new Map<string, number>();
    (productsList ?? []).forEach((p) => map.set(String(p.id), Number(p.stock) || 0));
    return map;
  }, [productsList]);
  const [serviceSearch, setServiceSearch] = useState(row.service || "");
  const [showDrop, setShowDrop] = useState(false);
  const [qtyInput, setQtyInput] = useState(String(getSafeQty(row.qty)));
  const [discountInput, setDiscountInput] = useState(String(row.discount || ""));
  const [apiResults, setApiResults] = useState<SearchServiceResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Tracks catalog price & package remaining for this row so qty changes recalculate correctly
  const catalogPriceRef = useRef<number>(0);
  const pkgRemainingRef = useRef<number>(0);

  // When package data loads for an existing row (not freshly selected), initialise the refs.
  // Also resets pkgRemainingRef back to 0 when coverage disappears (e.g. the "Apply
  // Package" checkbox is unchecked, or this row's own pooled allocation shrinks to 0
  // because an earlier row already claimed the remaining sessions) — otherwise qty/
  // price handlers below would keep using a stale remaining-sessions value.
  useEffect(() => {
    if (!row.service) return;
    if (packageSessionsRemaining > 0) {
      pkgRemainingRef.current = packageSessionsRemaining;
      if (!catalogPriceRef.current) catalogPriceRef.current = Number(row.price) || 0;
    } else {
      pkgRemainingRef.current = 0;
    }
  }, [packageSessionsRemaining]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reminder modal state ──────────────────────────────────────────────────────
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDays, setReminderDays] = useState("");
  const [reminderError, setReminderError] = useState("");
  const [savedReminderDays, setSavedReminderDays] = useState<number | null>(null);

  // ── Complimentary modal state ─────────────────────────────────────────────────
  const [showComplimentaryModal, setShowComplimentaryModal] = useState(false);
  const [complimentaryReason, setComplimentaryReason] = useState("");
  const [complimentaryError, setComplimentaryError] = useState("");
  const [savedComplimentaryRemark, setSavedComplimentaryRemark] = useState("");
  const [compApplied, setCompApplied] = useState(false);

  // ── Consumables recipe panel state ──────────────────────────────────────────────
  // Just an open/closed toggle now — the list itself is row.consumables
  // (read-only Product/Configured/Unit, editable Actual Qty), not local state.
  const [showConsumableModal, setShowConsumableModal] = useState(false);

  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const portalDropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const trimmedSearch = serviceSearch.trim();
  const meetsMinSearchLength = trimmedSearch.length >= MIN_SEARCH_LENGTH;
  const showSearchHelper = !disabled && trimmedSearch.length < MIN_SEARCH_LENGTH;

  // The dropdown is a document.body portal positioned with `position: fixed`
  // (so it isn't clipped by the row's own overflow:hidden ancestors), which
  // means it sits relative to the viewport, not to whatever container the
  // page/modal actually scrolls. Computing its position only once at render
  // time left it visually stuck in place while the input scrolled away
  // underneath it — recompute on every scroll (capture phase, so it catches
  // scrolling on the modal's own inner container too, not just window) and resize.
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => {
    if (!showDrop || !meetsMinSearchLength) { setDropPos(null); return; }
    function updateDropPos() {
      if (!inputRef.current) return;
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 2, left: r.left, width: r.width });
    }
    updateDropPos();
    window.addEventListener("scroll", updateDropPos, true);
    window.addEventListener("resize", updateDropPos);
    return () => {
      window.removeEventListener("scroll", updateDropPos, true);
      window.removeEventListener("resize", updateDropPos);
    };
  }, [showDrop, meetsMinSearchLength]);

  useEffect(() => {
    setServiceSearch(row.service || "");
  }, [row.service]);

  useEffect(() => {
    setQtyInput(String(getSafeQty(row.qty)));
  }, [row.qty, row.tempId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const inField = dropRef.current?.contains(event.target as Node);
      const inPortal = portalDropRef.current?.contains(event.target as Node);
      if (!inField && !inPortal) {
        setShowDrop(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function fetchServiceResults(term: string) {
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    const normalizedTerm = term.trim();
    const isNumericSearch = /^\d+(\.\d+)?$/.test(normalizedTerm);
    const localMatches = (servicesList || [])
      .map(mapServiceSearchResult)
      .filter((service) => matchesServiceSearch(service, normalizedTerm, isNumericSearch));
    abortRef.current = controller;

    try {
      let apiMatches: SearchServiceResult[] = [];

      if (isNumericSearch) {
        let page = 1;
        let totalPages = 1;

        do {
          const params = `page=${page}&limit=100&pageSize=100&is_active=true`;
          const res = await api.get(SERVICES.LIST(params), { signal: controller.signal });
          const mapped = extractServiceResults(res)
            .map(mapServiceSearchResult)
            .filter((service) => matchesServiceSearch(service, normalizedTerm, true));

          apiMatches = mergeServiceResults(apiMatches, mapped);
          totalPages = extractServiceTotalPages(res);
          page += 1;
        } while (page <= totalPages);
      } else {
        const params = `search=${encodeURIComponent(term)}&is_active=true&limit=20`;
        const res = await api.get(SERVICES.LIST(params), { signal: controller.signal });
        apiMatches = extractServiceResults(res)
          .map(mapServiceSearchResult)
          .filter((service) => matchesServiceSearch(service, normalizedTerm, false));
      }

      if (abortRef.current === controller) {
        setApiResults(mergeServiceResults(localMatches, apiMatches));
      }
    } catch {
      if (abortRef.current === controller) {
        setApiResults(localMatches);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsSearching(false);
      }
    }
  }

  function handleServiceSearchChange(value: string) {
    const nextSearch = value.trim();

    // Only update the local search query here — NOT row.service. The row's real
    // service/id only gets committed via selectService() below, when the user
    // actually picks a result from the dropdown. Otherwise free-typed text (that
    // was never selected) would count as a "filled" service and let Save/Checkout
    // through with garbage data.
    setServiceSearch(value);

    if (nextSearch) onClearError?.(row.tempId, "service");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (nextSearch.length < MIN_SEARCH_LENGTH) {
      setApiResults(null);
      setIsSearching(false);
      setShowDrop(false);
      return;
    }

    setApiResults(null);
    setShowDrop(true);
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      fetchServiceResults(nextSearch);
    }, DEBOUNCE_MS);
  }

  // Per-row discount is a PERCENTAGE (0–100) of price × qty, not a flat amount.
  function calcTotal(price: number, qty: number, discountPct: number) {
    const pct = Math.min(100, Math.max(0, discountPct));
    return Math.max(0, price * qty * (1 - pct / 100));
  }

  // Reset the keyboard-highlighted result whenever the result set changes.
  useEffect(() => { setActiveIndex(-1); }, [apiResults]);

  function handleServiceSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDrop || !apiResults || apiResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % apiResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? apiResults.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < apiResults.length) {
      e.preventDefault();
      selectService(apiResults[activeIndex]);
    } else if (e.key === "Escape") {
      // Capture-phase: stop here so a lone Escape only closes the suggestion
      // list, not the whole appointment drawer (its own focus-trap Escape
      // handler would otherwise also see this same keydown).
      e.stopPropagation();
      setShowDrop(false);
    }
  }

  function selectService(service: { id?: string; name: string; price: number; duration?: number; consumables_used?: RawConsumableUsage[]; categoryId?: string }) {
    // Every pick creates/fills its own row, even if the same service is
    // already on the bill elsewhere — a client can want the same service from
    // two different staff at once, which a merge-into-existing-row would make
    // impossible. Package-coverage math for this row is only a first-pass
    // estimate here (based on this row's CURRENT pooled allocation, which
    // hasn't yet accounted for the service just picked); the parent
    // (AppointmentModal) recomputes it correctly, pooled across every row
    // sharing this service, right after — see perRowCoveredRemaining there.
    const remaining = packageSessionsRemaining;
    catalogPriceRef.current = service.price;
    pkgRemainingRef.current = remaining;

    const qty = getSafeQty(row.qty);
    const discount = parseFloat(discountInput) || 0;
    const paidQty = Math.max(0, qty - remaining);
    const effectiveTotal = calcTotal(service.price, paidQty, discount);

    setServiceSearch(service.name);
    onChange(row.tempId, "id", service.id ?? "");
    onChange(row.tempId, "service", service.name);
    onChange(row.tempId, "price", service.price);
    onChange(row.tempId, "duration", service.duration ?? 30);
    onChange(row.tempId, "qty", qty);
    onChange(row.tempId, "total", effectiveTotal);
    onChange(row.tempId, "isPackageService", paidQty === 0);
    onChange(row.tempId, "categoryId", service.categoryId ?? "");
    // Attach the service's configured consumables so they ride along on the
    // appointment payload — deduction happens later, at completion, not here.
    onChange(
      row.tempId,
      "consumables",
      (service.consumables_used ?? []).map((c) => ({
        productId: c.product_id,
        productName: c.product_name ?? "",
        qty: c.qty,
        unit: c.unit,
      })),
    );

    setShowDrop(false);
    onClearError?.(row.tempId, "service");
    onClearError?.(row.tempId, "price");
  }

  function handlePriceChange(value: string) {
    const price = Math.max(0, parseFloat(value) || 0);
    const qty = getSafeQty(row.qty);
    const discount = parseFloat(discountInput) || 0;

    // Manual price edit overrides package logic
    catalogPriceRef.current = price;
    pkgRemainingRef.current = 0;

    onChange(row.tempId, "price", price);
    onChange(row.tempId, "total", calcTotal(price, qty, discount));

    if (price > 0) onClearError?.(row.tempId, "price");
  }

  function handleQtyChange(value: string) {
    const normalizedValue = value.slice(0, 2);
    setQtyInput(normalizedValue);

    if (!normalizedValue) return;

    const qty = parseInt(normalizedValue, 10);
    if (Number.isInteger(qty) && qty > 0) {
      const discount = parseFloat(discountInput) || 0;
      const remaining = pkgRemainingRef.current;
      const catalogPrice = catalogPriceRef.current || (row.price || 0);
      const paidQty = remaining > 0 ? Math.max(0, qty - remaining) : qty;
      onChange(row.tempId, "qty", qty);
      onChange(row.tempId, "total", calcTotal(catalogPrice, paidQty, discount));
      onClearError?.(row.tempId, "qty");
    }
  }

  function handleQtyBlur() {
    const qty = parseInt(qtyInput, 10);
    const clampedQty = Number.isInteger(qty) && qty > 0 ? Math.min(qty, 99) : 1;
    const discount = parseFloat(discountInput) || 0;

    setQtyInput(String(clampedQty));
    onChange(row.tempId, "qty", clampedQty);
    // Use pkgRemainingRef so blur doesn't override ₹0 for package-covered services
    const remaining = pkgRemainingRef.current;
    const catalogPrice = catalogPriceRef.current || (row.price || 0);
    const paidQty = remaining > 0 ? Math.max(0, clampedQty - remaining) : clampedQty;
    onChange(row.tempId, "total", calcTotal(catalogPrice, paidQty, discount));
    onClearError?.(row.tempId, "qty");
  }

  function handleDiscountChange(value: string) {
    const normalizedValue = value.slice(0, 3);
    setDiscountInput(normalizedValue);

    const discount = Math.min(100, parseFloat(normalizedValue) || 0);
    const qty = getSafeQty(row.qty);
    onChange(row.tempId, "discount", discount);
    onChange(row.tempId, "total", calcTotal(row.price || 0, qty, discount));
  }

  function handleDiscountBlur() {
    const discount = Math.min(100, Math.max(0, parseFloat(discountInput) || 0));
    const qty = getSafeQty(row.qty);

    setDiscountInput(discount > 0 ? String(discount) : "");
    onChange(row.tempId, "discount", discount);
    onChange(row.tempId, "total", calcTotal(row.price || 0, qty, discount));
  }

  function handleStaffChange(staffId: string) {
    const staffName =
      ((staffList || []) as StaffDto[]).find((staff: StaffDto) => String(staff.id) === staffId)?.name || "";

    onChange(row.tempId, "staffId", staffId);
    onChange(row.tempId, "staff", staffName);

    if (staffId) onClearError?.(row.tempId, "staff");
  }

  // ── Reminder handlers ─────────────────────────────────────────────────────────
  function openReminderModal() {
    setReminderDays(savedReminderDays !== null ? String(savedReminderDays) : "");
    setReminderError("");
    setShowReminderModal(true);
  }

  function closeReminderModal() {
    setShowReminderModal(false);
    setReminderDays("");
    setReminderError("");
  }

  // ── Complimentary handlers ────────────────────────────────────────────────────
  function openComplimentaryModal() {
    setComplimentaryReason(savedComplimentaryRemark);
    setComplimentaryError("");
    setShowComplimentaryModal(true);
  }

  function closeComplimentaryModal() {
    setShowComplimentaryModal(false);
    setComplimentaryError("");
  }

  function handleComplimentaryConfirm() {
    if (!complimentaryReason.trim()) {
      setComplimentaryError("Please enter remark");
      return;
    }
    setSavedComplimentaryRemark(complimentaryReason.trim());
    onChange(row.tempId, "price", 0);
    onChange(row.tempId, "discount", 0);
    onChange(row.tempId, "total", 0);
    setCompApplied(true);
    setShowComplimentaryModal(false);
    setComplimentaryError("");
  }

  // ── Consumables recipe panel handlers ───────────────────────────────────────────
  function openConsumableModal() {
    setShowConsumableModal(true);
  }

  function closeConsumableModal() {
    setShowConsumableModal(false);
  }

  // Reads back the current Actual Qty for a product: a live (unsaved) edit
  // from AppointmentModal's consumableActuals if there is one, else this
  // row's own last-saved actualQty, else the configured/standard qty.
  function getActualQty(c: NonNullable<ServiceItem["consumables"]>[number]): number {
    return consumableActuals?.[c.productId] ?? c.actualQty ?? c.qty;
  }

  function handleActualQtyChange(productId: string, raw: string) {
    const n = parseFloat(raw);
    onConsumableActualChange?.(productId, Number.isFinite(n) && n >= 0 ? n : 0);
  }

  // A qty input showing "0" and cursor-after-zero made typing "1" then "2"
  // produce "012" instead of "12" (the browser appends rather than replacing
  // when the displayed value is literally "0") — select the existing value
  // on focus so any typing replaces it instead, the standard fix for this.
  function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  // ── Add-to-recipe (from the appointment) ────────────────────────────────────
  // Deliberately writes to the SERVICE's recipe (service_consumables via the
  // existing PATCH /services/:id endpoint), not a one-off for this
  // appointment only — confirmed with the user: fixing "no consumables
  // configured" here should fix it for every future booking of this
  // service too, same data ConsumablesTab (Services catalog) edits.
  const [addDraft, setAddDraft] = useState<{
    productId: string; productName: string; searchText: string;
    unit: string; qty: string; showDrop: boolean;
    results: Array<{ id: string; name: string; unit: string }>; isSearching: boolean;
  } | null>(null);
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const addDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startAddConsumable() {
    setAddDraft({ productId: "", productName: "", searchText: "", unit: "", qty: "1", showDrop: false, results: [], isSearching: false });
    setAddError("");
  }

  function cancelAddConsumable() {
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    setAddDraft(null);
    setAddError("");
  }

  async function runAddProductSearch(term: string) {
    setAddDraft((prev) => (prev ? { ...prev, isSearching: true, showDrop: true } : prev));
    try {
      const url = term.trim()
        ? `/api/v1/products?search=${encodeURIComponent(term.trim())}&limit=20`
        : `/api/v1/products?limit=20`;
      const res = await api.get(url);
      const raw: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      // Recipe-only editing still means "only real consumable products" —
      // same isConsumableType() rule the Services catalog's ConsumablesTab
      // already applies, just re-checked here since this endpoint doesn't
      // support filtering by product_type IN (consumable, both) server-side.
      // API responses use `measure_unit`, not `unit` (see
      // products.repository.ts's PRODUCT_COLUMNS) — read both, same fix
      // applied to ConsumablesTab, so the unit auto-fills below instead of
      // silently coming through blank.
      const results = raw
        .filter((p) => p.product_type === "consumable" || p.product_type === "both")
        .map((p: any) => ({ id: String(p.id), name: String(p.name), unit: String(p.unit || p.measure_unit || "") }));
      setAddDraft((prev) => (prev ? { ...prev, results, isSearching: false } : prev));
    } catch {
      setAddDraft((prev) => (prev ? { ...prev, results: [], isSearching: false } : prev));
    }
  }

  function handleAddSearchChange(term: string) {
    setAddDraft((prev) => (prev ? { ...prev, searchText: term, productId: "", showDrop: true } : prev));
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    addDebounceRef.current = setTimeout(() => runAddProductSearch(term), 300);
  }

  // The backend always lowercases measure_unit on save (products.validator.ts
  // in salon_mgm_backend), so "L" round-trips as "l" — case-insensitively
  // re-match it against this row's own <option> values, or the <select>
  // silently shows its placeholder instead of the product's real unit.
  const ADD_UNIT_OPTIONS = ["ml", "L", "g", "kg", "oz", "pcs"];
  function normalizeAddUnit(value: string): string {
    return ADD_UNIT_OPTIONS.find((u) => u.toLowerCase() === value.toLowerCase()) ?? value;
  }

  function selectAddProduct(product: { id: string; name: string; unit: string }) {
    setAddDraft((prev) => (prev ? { ...prev, productId: product.id, productName: product.name, unit: product.unit ? normalizeAddUnit(product.unit) : prev.unit, searchText: product.name, showDrop: false, results: [] } : prev));
  }

  async function confirmAddConsumable() {
    if (!addDraft) return;
    const qty = parseFloat(addDraft.qty);
    if (!addDraft.productId) { setAddError("Pick a product first"); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setAddError("Enter a valid quantity"); return; }

    const serviceId = (row as any).service_id || row.id;
    if (!serviceId) { setAddError("Save this row's service first"); return; }

    setAddSaving(true);
    setAddError("");
    try {
      const existingRecipe = (row.consumables ?? []).map((c) => ({ product_id: c.productId, qty: c.qty, unit: c.unit }));
      const newRecipeItem = { product_id: addDraft.productId, qty, unit: addDraft.unit || undefined };
      await api.patch(SERVICES.BY_ID(serviceId), { consumables_used: [...existingRecipe, newRecipeItem] });

      const newRowConsumables = [
        ...(row.consumables ?? []),
        { productId: addDraft.productId, productName: addDraft.productName, qty, unit: addDraft.unit, actualQty: qty },
      ];
      onChange(row.tempId, "consumables", newRowConsumables);
      setAddDraft(null);
    } catch (err: any) {
      setAddError(err?.response?.data?.error?.message || "Failed to save — try again");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleReminderSubmit() {
    const trimmed = reminderDays.trim();
    if (!trimmed) {
      setReminderError("Please enter reminder in days");
      return;
    }
    const days = parseInt(trimmed, 10);
    if (!Number.isInteger(days) || days <= 0) {
      setReminderError("Please enter a valid number of days");
      return;
    }

    setSavedReminderDays(days);
    closeReminderModal();

    const serviceId = (row as any).id;
    if (serviceId) {
      try {
        await api.patch(`${SERVICES.BY_ID(serviceId)}/reminder`, { reminder_days: days });
      } catch {
        // API sync failed; local value is already saved and displayed
      }
    }
  }

  const pkgRemaining = packageSessionsRemaining;
  // Also requires the visible search text to be non-empty, not just the
  // committed row.service — row.service only updates when a result is
  // actually picked (see handleServiceSearchChange's comment), so backspacing
  // the field to clear it leaves row.service untouched until blur reverts the
  // text or a new pick commits it. Without this, the "✓ Package Applied"
  // badge kept showing under a visibly empty search box the whole time the
  // field was mid-edit.
  const isPackageCovered = row.service.trim() !== "" && serviceSearch.trim() !== "" && pkgRemaining > 0;

  // Total field display: same "show what the client actually pays" rule the
  // wallet coverage above already follows — row.total itself stays untouched
  // (the bill's subtotal/tax math reads from it directly), but the DISPLAYED
  // figure must reflect both the wallet-covered portion AND the membership
  // discount, or the ✓ Membership badge above looks like it did nothing to
  // this row's own Total.
  const fullRowTotal = row.total ? Number(row.total) : 0;
  const walletCovered = !isPackageCovered ? (membershipWalletInfo?.walletUsed ?? 0) : 0;
  const discountApplied = !isPackageCovered ? (membershipDiscountAmount ?? 0) : 0;
  const displayedRowTotal = isPackageCovered
    ? fullRowTotal
    : Math.max(0, fullRowTotal - walletCovered - discountApplied);
  const rowTotalTitleParts: string[] = [];
  if (walletCovered > 0) rowTotalTitleParts.push(`${currencySymbol}${walletCovered.toFixed(2)} covered by membership wallet`);
  if (discountApplied > 0) rowTotalTitleParts.push(`${currencySymbol}${discountApplied.toFixed(2)} membership discount`);
  const rowTotalTitle = rowTotalTitleParts.length > 0
    ? `Full price ${currencySymbol}${fullRowTotal.toFixed(2)} — ${rowTotalTitleParts.join(" + ")}`
    : undefined;

  return (
    <>
      <div className="svc-row">
        <div className="svc-field" ref={dropRef}>
          <span className="svc-field__label">Service</span>
          <div className="svc-field__input-wrap">
            <input
              ref={inputRef}
              className={`svc-field__input${errorFields.service ? " svc-field__input--error" : ""}`}
              placeholder="Search service..."
              value={serviceSearch}
              disabled={disabled}
              onChange={(e) => handleServiceSearchChange(e.target.value)}
              onFocus={() => setShowDrop(meetsMinSearchLength && (isSearching || apiResults !== null))}
              onBlur={() => {
                // Typed text that was never selected from the dropdown gets reverted
                // back to the row's actual (last selected) service — selecting an item
                // fires onMouseDown before this blur, so a real selection still sticks.
                setServiceSearch(row.service || "");
              }}
              onKeyDownCapture={handleServiceSearchKeyDown}
              role="combobox"
              aria-expanded={showDrop && !!apiResults && apiResults.length > 0}
              aria-haspopup="listbox"
              aria-controls={`service-search-listbox-${row.tempId}`}
              aria-activedescendant={activeIndex >= 0 ? `service-search-option-${row.tempId}-${activeIndex}` : undefined}
            />
            {showDrop && meetsMinSearchLength && dropPos && createPortal(
              <div
                ref={portalDropRef}
                className="svc-dropdown"
                role="listbox"
                id={`service-search-listbox-${row.tempId}`}
                style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
              >
                {isSearching ? (
                  <div className="svc-dropdown__searching">Searching...</div>
                ) : apiResults && apiResults.length > 0 ? (
                  apiResults.map((service, i) => (
                    <button
                      type="button"
                      key={service.id || service.name}
                      id={`service-search-option-${row.tempId}-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      className={`svc-dropdown__item${i === activeIndex ? " svc-dropdown__item--active" : ""}`}
                      onMouseDown={() => selectService(service)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <span className="svc-dropdown__name">{service.name}</span>
                      <span className="svc-dropdown__price">{currencySymbol}{service.price}</span>
                    </button>
                  ))
                ) : (
                  <div className="svc-dropdown__searching">No services found.</div>
                )}
              </div>,
              document.body
            )}
          </div>
          {showSearchHelper && (
            <span className="svc-field__hint">Type at least 3 characters to search services.</span>
          )}
          {errorFields.service && <span className="svc-field__err">Select a service</span>}
          {isPackageCovered && (
            <span className="svc-field__pkg-badge">
              ✓ Package Applied
            </span>
          )}
          {!isPackageCovered && membershipWalletInfo && membershipWalletInfo.walletUsed > 0 && (
            <span className="svc-field__pkg-badge" title={`You pay ${currencySymbol}${membershipWalletInfo.payable.toFixed(2)}`}>
              ✓ Membership Applied −{currencySymbol}{membershipWalletInfo.walletUsed.toFixed(2)}
            </span>
          )}
        </div>

        <div className="svc-field">
          <span className="svc-field__label">Staff</span>
          <div className={`svc-staff-pill${errorFields.staff ? " svc-staff-pill--error" : ""}`}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onChange(row.tempId, "staffId", "");
                onChange(row.tempId, "staff", "");
              }}
              className="svc-staff-pill__clear"
            >
              ×
            </button>
            <select
              disabled={disabled}
              value={row.staffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="svc-staff-pill__select"
              style={{ color: row.staffId ? "#111827" : "#6b7280" }}
            >
              <option value="" disabled style={{ color: "#000", background: "#fff" }}>
                Select Staff
              </option>
              {(staffList || []).map((staff: StaffDto) => (
                <option
                  key={String(staff.id)}
                  value={String(staff.id)}
                  style={{ color: "#000", background: "#fff" }}
                >
                  {fmtName(staff.name)}
                </option>
              ))}
            </select>
          </div>
          {errorFields.staff && <span className="svc-field__err">Select staff</span>}
        </div>

        <div className="svc-field">
          <span className="svc-field__label">Time</span>
          <TimeSelect
            disabled={disabled}
            value={row.time}
            onChange={(value) => onChange(row.tempId, "time", value)}
            interval={interval || "30 Mins"}
            className={`svc-field__input svc-field__select${errorFields.time ? " svc-field__input--error" : ""}`}
          />
          {errorFields.time && <span className="svc-field__err">Select time</span>}
        </div>

        <div className="svc-field">
          <span className="svc-field__label">Price</span>
          <div className="svc-field__input-wrap">
            <span className="svc-field__prefix">{currencySymbol}</span>
            <input
              type="text"
              disabled={disabled}
              inputMode="numeric"
              placeholder="0"
              value={row.price || ""}
              className={`svc-field__input svc-field__input--with-prefix${errorFields.price ? " svc-field__input--error" : ""}`}
              onChange={(e) => handlePriceChange(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
          {errorFields.price && <span className="svc-field__err">Enter price</span>}
          {!isPackageCovered && !!membershipDiscountAmount && membershipDiscountAmount > 0 && (
            <span className="svc-field__pkg-badge" title="Membership discount — GST is calculated on the price after this reduction">
              ✓ Membership −{currencySymbol}{membershipDiscountAmount.toFixed(2)}
            </span>
          )}
        </div>

        <div className="svc-field">
          <span className="svc-field__label">Qty</span>
          <input
            type="text"
            disabled={disabled}
            inputMode="numeric"
            maxLength={2}
            placeholder="1"
            value={qtyInput}
            className={`svc-field__input${errorFields.qty ? " svc-field__input--error" : ""}`}
            onChange={(e) => handleQtyChange(e.target.value.replace(/\D/g, ""))}
            onBlur={handleQtyBlur}
          />
          {errorFields.qty && <span className="svc-field__err">Enter qty</span>}
        </div>

        <div className="svc-field">
          <span className="svc-field__label">Disc %</span>
          <input
            type="text"
            disabled={disabled}
            inputMode="numeric"
            maxLength={3}
            placeholder="0"
            value={discountInput}
            className="svc-field__input"
            onChange={(e) => handleDiscountChange(e.target.value.replace(/\D/g, ""))}
            onBlur={handleDiscountBlur}
          />
        </div>

        <div className="svc-field">
          <span className="svc-field__label">Total</span>
          <input
            readOnly
            // Membership coverage/discount is a bill-level deduction (see
            // membershipWalletMap / serviceMembershipDiscountByRow in
            // AppointmentModal.tsx) — row.total itself is deliberately left
            // untouched so the bill's subtotal/tax math isn't double-discounted.
            // This field's DISPLAY still needs to reflect the discounted
            // payable amount, though, or the membership badges above look
            // like they did nothing to this row's price.
            value={`${currencySymbol}${displayedRowTotal.toFixed(2)}`}
            title={rowTotalTitle}
            className="svc-field__input svc-field__input--readonly"
          />
          {taxAmount !== undefined && taxAmount > 0 && !isPackageCovered && (
            <span className="svc-field__hint" style={{ color: "#6b7280" }}>
              +{currencySymbol}{taxAmount.toFixed(2)} GST
            </span>
          )}
        </div>

        <div className="svc-quick-actions">
          <span className="svc-field__label">&nbsp;</span>
          <div className="svc-quick-actions__btns">
            {!disabled && (
              <>
                <button
                  type="button"
                  className={`svc-quick-btn svc-quick-btn--reminder${savedReminderDays !== null ? " svc-quick-btn--days" : ""}`}
                  title="Service Reminder"
                  onClick={openReminderModal}
                >
                  {savedReminderDays !== null ? (
                    <>
                      <span className="svc-quick-btn__day-val">{savedReminderDays}</span>
                      <span className="svc-quick-btn__day-lbl">Days</span>
                    </>
                  ) : (
                    <IconClock />
                  )}
                </button>
                <button
                  type="button"
                  className={`svc-quick-btn svc-quick-btn--comp${compApplied ? " svc-quick-btn--comp-applied" : ""}`}
                  title={compApplied ? savedComplimentaryRemark : "Complimentary"}
                  onClick={openComplimentaryModal}
                >
                  {compApplied ? (
                    <>
                      <span className="svc-quick-btn__day-val">{savedComplimentaryRemark.slice(0, 5)}</span>
                      <span className="svc-quick-btn__day-lbl">0</span>
                    </>
                  ) : (
                    <IconBox />
                  )}
                </button>
                <button
                  type="button"
                  className={`svc-quick-btn svc-quick-btn--consumable${(row.consumables?.length ?? 0) > 0 ? " svc-quick-btn--itm" : ""}`}
                  title="Consumables"
                  onClick={openConsumableModal}
                >
                  {(row.consumables?.length ?? 0) > 0 ? (
                    <>
                      <span className="svc-quick-btn__day-val">{row.consumables!.length}</span>
                      <span className="svc-quick-btn__day-lbl">Itm</span>
                    </>
                  ) : (
                    <IconTag />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="svc-field svc-field--del">
          <span className="svc-field__label">&nbsp;</span>
          {!disabled && (
            <button className="svc-del-btn" onClick={() => onRemove(row.tempId)} title="Remove">
              <Trash size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Consumables Panel ────────────────────────────────────────────────── */}
      {/* Recipe-only: shows exactly the products configured on this service's
          recipe (row.consumables, copied in at selectService() time). Product/
          Configured/Unit are read-only; Actual Qty is the only editable field,
          and edits go through onConsumableActualChange — never the normal
          onChange path — so they can never reach serviceRows/calculate-totals. */}
      {showConsumableModal && (
        <div className="svc-reminder-overlay" onClick={closeConsumableModal}>
          <div className="svc-consumable-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="svc-consumable-modal__title">Consumables</h3>

            {row.consumables?.length ? (
              <>
                <div className="svc-recipe-header">
                  <span>Product</span>
                  <span>Standard</span>
                  <span>Remaining Stock</span>
                  <span>Used Qty</span>
                </div>
                <div className="svc-consumable-modal__list">
                  {row.consumables.map((c) => {
                    const actualQty = getActualQty(c);
                    const remainingStock = productStockById.get(c.productId);
                    const overStock = remainingStock !== undefined && actualQty > remainingStock;
                    return (
                      <div key={c.productId} className="svc-recipe-row">
                        <span className="svc-recipe-row__name">{c.productName || "—"}</span>
                        <span className="svc-recipe-row__configured">{c.qty} {c.unit || ""}</span>
                        <span className="svc-recipe-row__unit">
                          {remainingStock !== undefined ? `${remainingStock} ${c.unit || ""}` : "—"}
                        </span>
                        <div>
                          <input
                            className={`svc-recipe-row__actual-input${overStock ? " svc-recipe-row__actual-input--error" : ""}`}
                            type="number"
                            min={0}
                            disabled={disabled}
                            value={actualQty}
                            onFocus={selectOnFocus}
                            onChange={(e) => handleActualQtyChange(c.productId, e.target.value)}
                          />
                          {overStock && (
                            <span className="svc-recipe-row__warning">Only {remainingStock} {c.unit} in stock</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="svc-recipe-empty">This service has no consumables configured.</p>
            )}

            {/* Adding here updates the SERVICE's own recipe (same data
                ConsumablesTab in the Services catalog edits) — not a one-off
                for just this appointment, so it fixes "no consumables
                configured" for every future booking of this service too. */}
            {addDraft ? (
              <div className="svc-recipe-add-row">
                <div className="svc-recipe-add-row__search-wrap">
                  <input
                    className="svc-consumable-row__input"
                    placeholder="Search consumable product…"
                    value={addDraft.searchText}
                    autoFocus
                    onChange={(e) => { handleAddSearchChange(e.target.value); if (addError) setAddError(""); }}
                    onFocus={() => {
                      if (!addDraft.searchText.trim() && addDraft.results.length === 0) runAddProductSearch("");
                      else setAddDraft((p) => (p ? { ...p, showDrop: true } : p));
                    }}
                    onBlur={() => setTimeout(() => setAddDraft((p) => (p ? { ...p, showDrop: false } : p)), 180)}
                  />
                  {addDraft.showDrop && (
                    <div className="svc-consumable-drop">
                      {addDraft.isSearching ? (
                        <div className="svc-consumable-drop__msg">Searching…</div>
                      ) : addDraft.results.length > 0 ? (
                        addDraft.results.map((r) => (
                          <div key={r.id} className="svc-consumable-drop__item" onMouseDown={() => selectAddProduct(r)}>
                            {r.name}
                          </div>
                        ))
                      ) : (
                        <div className="svc-consumable-drop__msg">No consumable products found</div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  className="svc-consumable-row__input svc-consumable-row__input--sm"
                  type="number"
                  min={0}
                  value={addDraft.qty}
                  onChange={(e) => { setAddDraft((p) => (p ? { ...p, qty: e.target.value } : p)); if (addError) setAddError(""); }}
                />
                <select
                  className="svc-consumable-row__input svc-consumable-row__input--sm svc-consumable-row__unit-select"
                  value={addDraft.unit}
                  onChange={(e) => setAddDraft((p) => (p ? { ...p, unit: e.target.value } : p))}
                >
                  <option value="">Unit</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="oz">oz</option>
                  <option value="pcs">pcs</option>
                </select>
                <button
                  type="button"
                  className="svc-consumable-modal__btn svc-consumable-modal__btn--add"
                  disabled={addSaving}
                  onClick={confirmAddConsumable}
                >
                  {addSaving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="svc-consumable-row__del" onClick={cancelAddConsumable} title="Cancel">
                  <Trash size={14} />
                </button>
              </div>
            ) : (
              !disabled && (
                <button
                  type="button"
                  className="svc-recipe-add-trigger"
                  onClick={startAddConsumable}
                >
                  + Add Consumable
                </button>
              )
            )}

            {addError && <p className="svc-consumable-modal__error">{addError}</p>}

            <div className="svc-consumable-modal__actions">
              <button
                type="button"
                className="svc-consumable-modal__btn svc-consumable-modal__btn--close"
                onClick={closeConsumableModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complimentary Modal ─────────────────────────────────────────────── */}
      {showComplimentaryModal && (
        <div className="svc-reminder-overlay" onClick={closeComplimentaryModal}>
          <div className="svc-reminder-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="svc-reminder-modal__close"
              onClick={closeComplimentaryModal}
              aria-label="Close"
            >
              ×
            </button>

            <h3 className="svc-reminder-modal__title">Complimentary Remark</h3>

            <p className="svc-reminder-modal__subtitle">
              Enter remark for <strong>{row.service || "this service"}</strong> as
              complimentary (Mandatory)
            </p>

            <input
              type="text"
              className={`svc-reminder-modal__input${complimentaryError ? " svc-reminder-modal__input--error" : ""}`}
              placeholder=""
              value={complimentaryReason}
              onChange={(e) => {
                setComplimentaryReason(e.target.value);
                if (complimentaryError) setComplimentaryError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleComplimentaryConfirm()}
              autoFocus
            />
            {complimentaryError && (
              <span className="svc-reminder-modal__err">{complimentaryError}</span>
            )}

            <div className="svc-reminder-modal__actions">
              <button
                type="button"
                className="svc-reminder-modal__btn svc-reminder-modal__btn--cancel"
                onClick={closeComplimentaryModal}
              >
                Close
              </button>
              <button
                type="button"
                className="svc-reminder-modal__btn svc-reminder-modal__btn--submit"
                onClick={handleComplimentaryConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Reminder Modal ───────────────────────────────────────────── */}
      {showReminderModal && (
        <div className="svc-reminder-overlay" onClick={closeReminderModal}>
          <div className="svc-reminder-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="svc-reminder-modal__close"
              onClick={closeReminderModal}
              aria-label="Close"
            >
              ×
            </button>

            <h3 className="svc-reminder-modal__title">Update service reminder</h3>

            <p className="svc-reminder-modal__subtitle">
              Set reminder for service (In days):{" "}
              <strong>{row.service || "—"}</strong>
            </p>

            <input
              type="number"
              min={1}
              className={`svc-reminder-modal__input${reminderError ? " svc-reminder-modal__input--error" : ""}`}
              placeholder="Enter Reminder In Days"
              value={reminderDays}
              onChange={(e) => {
                setReminderDays(e.target.value);
                if (reminderError) setReminderError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleReminderSubmit()}
              autoFocus
            />
            {reminderError && (
              <span className="svc-reminder-modal__err">{reminderError}</span>
            )}

            <div className="svc-reminder-modal__actions">
              <button
                type="button"
                className="svc-reminder-modal__btn svc-reminder-modal__btn--cancel"
                onClick={closeReminderModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="svc-reminder-modal__btn svc-reminder-modal__btn--submit"
                onClick={handleReminderSubmit}
              >
                Update Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceRow;
