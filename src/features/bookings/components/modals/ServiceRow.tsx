import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import type { ServiceItem } from "../../types/scheduler-types";
import { currencySymbol } from "../../utils/currency";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";
import { Trash } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import { SERVICES } from "../../../../services/api/endpoints/services.endpoints";
import { INVENTORY } from "../../../../services/api/endpoints/inventory.endpoints";
import { IconClock, IconBox, IconTag } from "../../../../components/shared/QuickSaleIcons";
import type { RootState } from "../../../../store/store";
import "../../styles/AppointmentModal.scss";

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 350;

interface StaffDto {
  id: string | number;
  name: string;
}

interface SearchServiceResult {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface RawServiceItem {
  id?: string | number;
  name?: string;
  price?: string | number;
  duration?: string | number;
  duration_minutes?: string | number;
}

interface ConsumableItem {
  tempId: string;
  productId: string;
  name: string;
  qty: string;
  unit: string;
  showDrop: boolean;
  results: Array<{ id: string; name: string }>;
  isSearching: boolean;
}

interface ServiceRowProps {
  row: ServiceItem & { tempId: string };
  onChange: (id: string, field: string, value: string | number | boolean) => void;
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
}) => {
  const schedulerContext = useSchedulerContext();
  const salonBranches = useSelector((s: RootState) => s.salon?.branches ?? []);
  const currentSalon = useSelector((s: RootState) => s.salon?.currentSalon ?? null);
  const activeBranchId =
    salonBranches.find((b: any) => b.is_main === true)?.id ??
    salonBranches[0]?.id ??
    "";

  const interval = schedulerContext.interval;
  const staffList = schedulerContext.staffList as StaffDto[] | undefined;
  const servicesList = schedulerContext.servicesList as RawServiceItem[] | undefined;
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

  // ── Consumable items modal state ──────────────────────────────────────────────
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const [consumableItems, setConsumableItems] = useState<ConsumableItem[]>([]);
  const [consumableError, setConsumableError] = useState("");
  const [savedConsumableCount, setSavedConsumableCount] = useState(0);
  const consumableDebounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  function selectService(service: { id?: string; name: string; price: number; duration?: number }) {
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

  // ── Consumable handlers ───────────────────────────────────────────────────────
  function openConsumableModal() {
    setShowConsumableModal(true);
  }

  function closeConsumableModal() {
    setShowConsumableModal(false);
  }

  function makeCId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function addConsumableItem() {
    setConsumableItems((prev) => [
      ...prev,
      { tempId: makeCId(), productId: "", name: "", qty: "1", unit: "", showDrop: false, results: [], isSearching: false },
    ]);
  }

  function removeConsumableItem(cid: string) {
    const timer = consumableDebounceRefs.current.get(cid);
    if (timer) { clearTimeout(timer); consumableDebounceRefs.current.delete(cid); }
    setConsumableItems((prev) => prev.filter((c) => c.tempId !== cid));
  }

  function updateConsumableItem(cid: string, patch: Partial<ConsumableItem>) {
    setConsumableItems((prev) => prev.map((c) => c.tempId === cid ? { ...c, ...patch } : c));
  }

  async function loadInitialProducts(cid: string) {
    updateConsumableItem(cid, { isSearching: true, showDrop: true });
    try {
      const res = await api.get("/api/v1/products?limit=20");
      const raw: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      const results = Array.isArray(raw) ? raw.map((p: any) => ({ id: String(p.id), name: String(p.name) })) : [];
      updateConsumableItem(cid, { results, isSearching: false });
    } catch {
      updateConsumableItem(cid, { results: [], isSearching: false });
    }
  }

  function handleConsumableSearch(cid: string, term: string) {
    updateConsumableItem(cid, { name: term, productId: "", showDrop: true });

    const existing = consumableDebounceRefs.current.get(cid);
    if (existing) clearTimeout(existing);

    if (!term.trim()) {
      loadInitialProducts(cid);
      return;
    }

    const timer = setTimeout(async () => {
      updateConsumableItem(cid, { isSearching: true });
      try {
        const res = await api.get(`/api/v1/products?search=${encodeURIComponent(term.trim())}&limit=20`);
        const raw: any[] = res.data?.data?.data ?? res.data?.data ?? [];
        const results = Array.isArray(raw) ? raw.map((p: any) => ({ id: String(p.id), name: String(p.name) })) : [];
        updateConsumableItem(cid, { results, isSearching: false });
      } catch {
        updateConsumableItem(cid, { results: [], isSearching: false });
      }
      consumableDebounceRefs.current.delete(cid);
    }, 300);

    consumableDebounceRefs.current.set(cid, timer);
  }

  function selectConsumableProduct(cid: string, product: { id: string; name: string }) {
    updateConsumableItem(cid, { productId: product.id, name: product.name, showDrop: false, results: [] });
  }

  function handleConsumableUpdate() {
    const invalid = consumableItems.some(
      (c) => !c.name.trim() || !c.qty.trim() || parseInt(c.qty, 10) <= 0
    );
    if (invalid) {
      setConsumableError("Please enter valid quantity for all consumables");
      return;
    }
    setConsumableError("");
    setSavedConsumableCount(consumableItems.filter((c) => c.name.trim()).length);

    // Persist consumable usage to inventory (non-blocking)
    const validItems = consumableItems.filter(
      (c) => c.productId && c.name.trim() && parseInt(c.qty, 10) > 0
    );
    if (validItems.length > 0 && activeBranchId) {
      api
        .post(INVENTORY.CONSUMABLE_USAGE, {
          branch_id: activeBranchId,
          items: validItems.map((c) => ({
            product_id: c.productId,
            product_name: c.name,
            qty: parseInt(c.qty, 10),
            unit: c.unit || "pcs",
          })),
        })
        .catch(() => {
          // Non-blocking — consumable sync failure should not disrupt appointment flow
        });
    }

    closeConsumableModal();
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
          <input
            type="text"
            disabled={disabled}
            inputMode="numeric"
            placeholder="0"
            value={row.price || ""}
            className={`svc-field__input${errorFields.price ? " svc-field__input--error" : ""}`}
            onChange={(e) => handlePriceChange(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          {errorFields.price && <span className="svc-field__err">Enter price</span>}
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
            // Membership coverage is a bill-level wallet deduction (see
            // membershipWalletMap in AppointmentModal.tsx) — row.total itself is
            // deliberately left untouched so the bill's subtotal/tax math isn't
            // double-discounted. This field's DISPLAY still needs to reflect the
            // discounted payable amount, though, or the "Membership Applied"
            // badge above looks like it did nothing to this row's price.
            value={
              !isPackageCovered && membershipWalletInfo && membershipWalletInfo.walletUsed > 0
                ? membershipWalletInfo.payable.toFixed(2)
                : row.total ? (row.total as number).toFixed(2) : "0.00"
            }
            title={
              !isPackageCovered && membershipWalletInfo && membershipWalletInfo.walletUsed > 0
                ? `Full price ${currencySymbol}${(Number(row.total) || 0).toFixed(2)} — ${currencySymbol}${membershipWalletInfo.walletUsed.toFixed(2)} covered by membership`
                : undefined
            }
            className="svc-field__input svc-field__input--readonly"
          />
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
                  className={`svc-quick-btn svc-quick-btn--consumable${savedConsumableCount > 0 ? " svc-quick-btn--itm" : ""}`}
                  title="Update Consumable Items"
                  onClick={openConsumableModal}
                >
                  {savedConsumableCount > 0 ? (
                    <>
                      <span className="svc-quick-btn__day-val">{savedConsumableCount}</span>
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

      {/* ── Consumable Items Modal ──────────────────────────────────────────── */}
      {showConsumableModal && (
        <div className="svc-reminder-overlay" onClick={closeConsumableModal}>
          <div className="svc-consumable-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="svc-consumable-modal__title">Update Consumable Items</h3>

            {/* Header row */}
            {consumableItems.length > 0 && (
              <div className="svc-consumable-header">
                <span>Sr.</span>
                <span>Name</span>
                <span>Quantity</span>
                <span>Unit</span>
                <span>Action</span>
              </div>
            )}

            <div className="svc-consumable-modal__list">
              {consumableItems.map((item, idx) => (
                <div key={item.tempId} className="svc-consumable-row">
                  <span className="svc-consumable-row__num">{idx + 1}</span>

                  <div className="svc-consumable-row__search-wrap">
                    <input
                      className="svc-consumable-row__input"
                      placeholder="Search By Name"
                      value={item.name}
                      autoFocus={idx === consumableItems.length - 1}
                      onChange={(e) => {
                        handleConsumableSearch(item.tempId, e.target.value);
                        if (consumableError) setConsumableError("");
                      }}
                      onFocus={() => {
                        if (!item.name.trim() && item.results.length === 0) {
                          loadInitialProducts(item.tempId);
                        } else {
                          updateConsumableItem(item.tempId, { showDrop: true });
                        }
                      }}
                      onBlur={() =>
                        setTimeout(() => updateConsumableItem(item.tempId, { showDrop: false }), 180)
                      }
                    />
                    <span className="svc-consumable-row__search-icon">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="#9ca3af">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
                      </svg>
                    </span>
                    {item.showDrop && (
                      <div className="svc-consumable-drop">
                        {item.isSearching ? (
                          <div className="svc-consumable-drop__msg">Searching…</div>
                        ) : item.results.length > 0 ? (
                          item.results.map((r) => (
                            <div
                              key={r.id}
                              className="svc-consumable-drop__item"
                              onMouseDown={() => selectConsumableProduct(item.tempId, r)}
                            >
                              {r.name}
                            </div>
                          ))
                        ) : (
                          <div className="svc-consumable-drop__msg">No products found</div>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    className="svc-consumable-row__input svc-consumable-row__input--sm"
                    type="number"
                    min={0}
                    value={item.qty}
                    onChange={(e) => {
                      updateConsumableItem(item.tempId, { qty: e.target.value });
                      if (consumableError) setConsumableError("");
                    }}
                  />

                  <select
                    className="svc-consumable-row__input svc-consumable-row__input--sm svc-consumable-row__unit-select"
                    value={item.unit}
                    onChange={(e) => updateConsumableItem(item.tempId, { unit: e.target.value })}
                  >
                    <option value="">Unit</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="oz">oz</option>
                    <option value="pcs">pcs</option>
                    <option value="strips">strips</option>
                    <option value="sheets">sheets</option>
                    <option value="drops">drops</option>
                  </select>

                  <button
                    type="button"
                    className="svc-consumable-row__del"
                    onClick={() => removeConsumableItem(item.tempId)}
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>

            {consumableError && (
              <p className="svc-consumable-modal__error">{consumableError}</p>
            )}

            <div className="svc-consumable-modal__actions">
              <button
                type="button"
                className="svc-consumable-modal__btn svc-consumable-modal__btn--add"
                onClick={addConsumableItem}
              >
                Add Item
              </button>
              <button
                type="button"
                className="svc-consumable-modal__btn svc-consumable-modal__btn--add"
                onClick={handleConsumableUpdate}
              >
                Update
              </button>
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
