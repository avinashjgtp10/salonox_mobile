import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ServiceItem } from "../../types/scheduler-types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";
import Dropdown from "../../../../components/ui/Dropdown";
import { Trash, Pencil } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import { SERVICES } from "../../../../services/api/endpoints/services.endpoints";
import { INVENTORY } from "../../../../services/api/endpoints/inventory.endpoints";
import { getCompatibleUnits, resolveConversionRatio } from "../../../catalog/utils/unitFamilies";
import { IconClock, IconBox, IconTag } from "../../../../components/shared/QuickSaleIcons";
import {
  sanitizeDiscountPercentInput,
  parseDiscountPercent,
  formatDiscountPercent,
  DISCOUNT_INPUT_MAX_LENGTH,
  MAX_LINE_QTY,
  QTY_INPUT_MAX_LENGTH,
} from "../../utils/lineItemInput";
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
  /** On-hand stock in base units, enriched onto the recipe by the services
   *  API — see CONSUMABLES_USED_SUBQUERY in services.repository.ts. */
  stock?: number;
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
  /** Appointment's client name, for the Consumable Usage modal's header —
   *  ServiceRow only otherwise knows this row's own staff, not the client. */
  clientName?: string;
}

function fmtName(name: string) {
  return name.includes(" ") ? name : name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getSafeQty(qty?: number) {
  return Number.isInteger(qty) && (qty ?? 0) > 0 ? Number(qty) : 1;
}

// Rescales each consumable's Standard Qty to unitQty × newRowQty whenever the
// service row's billed Qty changes, so "100ml shampoo × 2 sessions = 200ml"
// stays correct instead of the recipe's flat per-session rate being deducted
// regardless of how many sessions were actually billed. Any manually-entered
// Actual Qty override is left untouched — it's a deliberate staff correction
// (e.g. wastage), not something a later Qty edit should silently overwrite.
function rescaleConsumables(
  consumables: NonNullable<ServiceItem["consumables"]> | undefined,
  newRowQty: number,
): NonNullable<ServiceItem["consumables"]> | undefined {
  if (!consumables?.length) return consumables;
  return consumables.map((c) => {
    const unitQty = c.unitQty ?? c.qty;
    return { ...c, unitQty, qty: unitQty * newRowQty };
  });
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

// Dedupes by id (falling back to name): `base` WINS on collision, `incoming`
// only contributes services base didn't already have. Callers pick the order
// accordingly — whichever list is more trustworthy goes first.
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
  clientName,
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
  // Local typed-text buffer for the Consumable Usage modal's Actual Qty
  // inputs, keyed by productId — same reasoning as qtyInput/discountInput
  // above: binding straight to the numeric value made a "0" impossible to
  // clean-edit (relying on the input's focus-select() to highlight it before
  // typing wasn't reliable, so a keystroke landed after the existing "0"
  // instead of replacing it, e.g. typing "20" produced "020"). Starting the
  // buffer blank on focus when the value is 0 sidesteps that entirely.
  const [actualQtyDrafts, setActualQtyDrafts] = useState<Record<string, string>>({});
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
  // The list itself is row.consumables (read-only Product/Standard/Unit,
  // editable Actual Qty), not local state — but Cancel needs to be able to
  // revert live Actual Qty edits made during this modal session, so a
  // snapshot of consumableActuals is taken at open time and restored on Cancel.
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const consumableSnapshotRef = useRef<Record<string, number>>({});
  const [deleteConfirmProductId, setDeleteConfirmProductId] = useState<string | null>(null);

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
        // API results FIRST so they win on id collision (see
        // mergeServiceResults) — the cached schedulerContext.servicesList
        // entry we built localMatches from can be arbitrarily stale, and its
        // consumables_used is what selectService() copies onto the row. Edit a
        // consumable's service assignments elsewhere in the app and nothing
        // invalidates that cache, so the other order silently served the OLD
        // recipe here even though the fresh one had just come back from this
        // very request. Local matches still fill in anything the server search
        // didn't return.
        setApiResults(mergeServiceResults(apiMatches, localMatches));
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

  // Keep the highlighted row visible — without this, arrowing past the
  // bottom of the scroll container moves the highlight out of sight.
  const serviceItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (activeIndex >= 0) serviceItemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleServiceSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDrop || !apiResults || apiResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      // Clamped, not wrapped — jumping back to the first row after the last
      // reads as the list being stuck in a loop rather than reaching the end.
      setActiveIndex((i) => Math.min(i + 1, apiResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
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
    const discount = parseDiscountPercent(discountInput);
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
    // qty here is the row's currently billed session count (`qty` local var
    // above) — a service picked while Qty is already 2 starts with Standard
    // Qty = recipe rate × 2, not the flat per-session rate.
    onChange(
      row.tempId,
      "consumables",
      (service.consumables_used ?? []).map((c) => ({
        productId: c.product_id,
        productName: c.product_name ?? "",
        qty: c.qty * qty,
        unitQty: c.qty,
        unit: c.unit,
        // Carried from the API alongside the recipe so the Consumables panel
        // has a stock figure without depending on the shared products cache.
        stock: c.stock,
      })),
    );

    setShowDrop(false);
    onClearError?.(row.tempId, "service");
    onClearError?.(row.tempId, "price");
  }

  function handlePriceChange(value: string) {
    const price = Math.max(0, parseFloat(value) || 0);
    const qty = getSafeQty(row.qty);
    const discount = parseDiscountPercent(discountInput);

    // Manual price edit overrides package logic
    catalogPriceRef.current = price;
    pkgRemainingRef.current = 0;

    onChange(row.tempId, "price", price);
    onChange(row.tempId, "total", calcTotal(price, qty, discount));

    if (price > 0) onClearError?.(row.tempId, "price");
  }

  function handleQtyChange(value: string) {
    const normalizedValue = value.slice(0, QTY_INPUT_MAX_LENGTH);
    setQtyInput(normalizedValue);

    if (!normalizedValue) return;

    const qty = parseInt(normalizedValue, 10);
    if (Number.isInteger(qty) && qty > 0) {
      const discount = parseDiscountPercent(discountInput);
      const remaining = pkgRemainingRef.current;
      const catalogPrice = catalogPriceRef.current || (row.price || 0);
      const paidQty = remaining > 0 ? Math.max(0, qty - remaining) : qty;
      onChange(row.tempId, "qty", qty);
      onChange(row.tempId, "total", calcTotal(catalogPrice, paidQty, discount));
      const rescaled = rescaleConsumables(row.consumables, qty);
      if (rescaled) onChange(row.tempId, "consumables", rescaled);
      onClearError?.(row.tempId, "qty");
    }
  }

  function handleQtyBlur() {
    const qty = parseInt(qtyInput, 10);
    const clampedQty = Number.isInteger(qty) && qty > 0 ? Math.min(qty, MAX_LINE_QTY) : 1;
    const discount = parseDiscountPercent(discountInput);

    setQtyInput(String(clampedQty));
    onChange(row.tempId, "qty", clampedQty);
    // Use pkgRemainingRef so blur doesn't override ₹0 for package-covered services
    const remaining = pkgRemainingRef.current;
    const catalogPrice = catalogPriceRef.current || (row.price || 0);
    const paidQty = remaining > 0 ? Math.max(0, clampedQty - remaining) : clampedQty;
    onChange(row.tempId, "total", calcTotal(catalogPrice, paidQty, discount));
    const rescaled = rescaleConsumables(row.consumables, clampedQty);
    if (rescaled) onChange(row.tempId, "consumables", rescaled);
    onClearError?.(row.tempId, "qty");
  }

  function handleDiscountChange(value: string) {
    const normalizedValue = sanitizeDiscountPercentInput(value);
    setDiscountInput(normalizedValue);

    const discount = parseDiscountPercent(normalizedValue);
    const qty = getSafeQty(row.qty);
    onChange(row.tempId, "discount", discount);
    onChange(row.tempId, "total", calcTotal(row.price || 0, qty, discount));
  }

  function handleDiscountBlur() {
    const discount = parseDiscountPercent(discountInput);
    const qty = getSafeQty(row.qty);

    setDiscountInput(formatDiscountPercent(discount));
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

  // A plain note attached to the service — saving it must never touch
  // price/discount/total or anything else billing-related (SCRUM: Remark
  // save should update only the remark data).
  function handleComplimentaryConfirm() {
    if (!complimentaryReason.trim()) {
      setComplimentaryError("Please enter remark");
      return;
    }
    setSavedComplimentaryRemark(complimentaryReason.trim());
    setCompApplied(true);
    setShowComplimentaryModal(false);
    setComplimentaryError("");
  }

  // ── Consumables recipe panel handlers ───────────────────────────────────────────
  function openConsumableModal() {
    // Snapshot every current-in-effect Actual Qty so Cancel can restore them —
    // edits go straight into AppointmentModal's consumableActuals live (there's
    // no separate "staged" copy), so reverting means writing the old values back.
    const snapshot: Record<string, number> = {};
    (row.consumables ?? []).forEach((c) => { snapshot[c.productId] = getActualQty(c); });
    consumableSnapshotRef.current = snapshot;
    setDeleteConfirmProductId(null);
    setShowConsumableModal(true);
  }

  function closeConsumableModal() {
    setShowConsumableModal(false);
    setDeleteConfirmProductId(null);
    cancelAddConsumable();
  }

  // "Update & Continue" — edits are already live, so this just closes.
  function confirmConsumableModal() {
    closeConsumableModal();
  }

  // "Cancel" — restores every Actual Qty to what it was when the modal opened.
  function cancelConsumableModal() {
    Object.entries(consumableSnapshotRef.current).forEach(([productId, qty]) => {
      onConsumableActualChange?.(productId, qty);
    });
    closeConsumableModal();
  }

  // Reads back the current Actual Qty for a product: a live (unsaved) edit
  // from AppointmentModal's consumableActuals if there is one, else this
  // row's own last-saved actualQty, else the configured/standard qty.
  function getActualQty(c: NonNullable<ServiceItem["consumables"]>[number]): number {
    return consumableActuals?.[c.productId] ?? c.actualQty ?? c.qty;
  }

  function handleActualQtyChange(productId: string, raw: string) {
    setActualQtyDrafts((prev) => ({ ...prev, [productId]: raw }));
    const n = parseFloat(raw);
    onConsumableActualChange?.(productId, Number.isFinite(n) && n >= 0 ? n : 0);
  }

  function handleActualQtyFocus(productId: string, currentValue: number, e: React.FocusEvent<HTMLInputElement>) {
    selectOnFocus(e);
    // Blank the buffer instead of leaving "0" for the user to select —
    // select() highlighting a single "0" character isn't reliably honored by
    // every browser before the next keystroke lands, which is what let a
    // typed "2","0" append after the existing "0" rather than replace it.
    setActualQtyDrafts((prev) => ({ ...prev, [productId]: currentValue === 0 ? "" : String(currentValue) }));
  }

  function handleActualQtyBlur(productId: string) {
    // Drop the draft so the field reverts to reflecting the authoritative
    // (parsed) value via getActualQty — self-corrects anything the raw
    // buffer text left in a weird state (e.g. a trailing ".").
    setActualQtyDrafts((prev) => {
      if (!(productId in prev)) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  // Removes a consumable from THIS sale only — never touches the product,
  // inventory, or the service's own recipe (service_consumables), which is
  // exactly what "+ Add Consumable" writes to. A one-off removal here is
  // the appointment-row-local mirror of that: row.consumables is per-
  // appointment state, distinct from the service's configured recipe.
  function removeConsumableRow(productId: string) {
    const next = (row.consumables ?? []).filter((c) => c.productId !== productId);
    onChange(row.tempId, "consumables", next);
    setDeleteConfirmProductId(null);
  }

  const actualQtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  function focusActualQtyInput(productId: string) {
    const el = actualQtyInputRefs.current[productId];
    el?.focus();
    el?.select();
  }

  type ConsumableStatus = "healthy" | "low" | "out_of_stock" | "unknown";
  function getConsumableStatus(availableStock: number | undefined, remainingStock: number): ConsumableStatus {
    // Product not in the cached productsList — we genuinely don't know its
    // stock. Without this the remainingStock passed in is `0 - actualQty`,
    // i.e. negative, and every such row claimed "Out of Stock" in red while
    // the Total Stock and Remaining Stock cells beside it correctly showed "—".
    if (availableStock === undefined) return "unknown";
    if (remainingStock <= 0) return "out_of_stock";
    // No qty_alert threshold is available on the cached productsList here
    // (see schedulerContext.productsList) — 10% of on-hand stock is a
    // reasonable stand-in low-water mark until that's threaded through.
    if (availableStock > 0 && remainingStock <= availableStock * 0.1) return "low";
    return "healthy";
  }
  const STATUS_LABEL: Record<ConsumableStatus, string> = {
    healthy: "Healthy",
    low: "Low Stock",
    out_of_stock: "Out of Stock",
    unknown: "Stock Unknown",
  };
  const STATUS_DOT: Record<ConsumableStatus, string> = {
    healthy: "🟢",
    low: "🟠",
    out_of_stock: "🔴",
    unknown: "⚪",
  };

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
    // baseUnit is the product's own measure_unit, captured once at
    // selection and never edited — always what Total Stock is denominated
    // in. unit is the (editable, dropdown-driven) unit this entry's Qty is
    // expressed in; starts equal to baseUnit but staff can switch it to any
    // compatible display unit — see unitOptionsFor below.
    baseUnit: string; unit: string; qty: string; showDrop: boolean;
    results: Array<{ id: string; name: string; unit: string }>; isSearching: boolean;
  } | null>(null);
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const addDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Per-product configured packaging units (Bottle/Tube/Sachet/...), fetched
  // lazily once per product as it's selected — same data the Product form's
  // own "Unit Conversion" section edits (GET .../unit-conversions). Cached
  // by productId for the lifetime of this modal; never invalidated, since
  // editing that config mid-booking isn't a flow this screen supports.
  const [productConversions, setProductConversions] = useState<Record<string, { unit_name: string; conversion_to_base: number }[]>>({});

  function startAddConsumable() {
    setAddDraft({ productId: "", productName: "", baseUnit: "", searchText: "", unit: "", qty: "1", showDrop: false, results: [], isSearching: false });
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

  // Which units are even offered for logging this product's usage: always
  // its own base unit, plus the system-fixed unit for that measurement
  // family (L for ml, kg for gm/g — 1000:1, non-negotiable), plus any
  // packaging unit (Bottle, Tube, Sachet, Cup, Jar, Packet, Box, Roll) THIS
  // SPECIFIC product actually has configured. A packaging unit no product
  // has configured never appears, because there's no known ratio to convert
  // it with. This only decides what the dropdown OFFERS — the backend
  // re-derives and enforces the same rule independently at save time (see
  // appointments.service.ts's flattenServiceConsumables), so this list
  // being stale or wrong can never corrupt actual stock, only confuse the
  // picker's own dropdown.
  function unitOptionsFor(baseUnit: string, productId: string): string[] {
    if (!baseUnit) return [];
    const configured = productConversions[productId] ?? [];
    const compatible = getCompatibleUnits(baseUnit)
      .filter((u) => u.fixedRatio !== undefined || configured.some((c) => c.unit_name.toLowerCase() === u.name.toLowerCase()))
      .map((u) => u.name);
    return [baseUnit, ...compatible];
  }

  async function fetchProductConversions(productId: string) {
    if (productConversions[productId]) return;
    try {
      const res = await api.get(INVENTORY.CONSUMABLE_UNIT_CONVERSIONS(productId));
      const rows = res.data?.data ?? [];
      setProductConversions((prev) => ({ ...prev, [productId]: rows }));
    } catch {
      // Non-fatal — the dropdown just falls back to base-unit-only until a
      // retry (e.g. re-selecting the product) succeeds.
      setProductConversions((prev) => ({ ...prev, [productId]: [] }));
    }
  }

  function selectAddProduct(product: { id: string; name: string; unit: string }) {
    const baseUnit = product.unit || "";
    setAddDraft((prev) => (prev ? { ...prev, productId: product.id, productName: product.name, baseUnit, unit: baseUnit, searchText: product.name, showDrop: false, results: [] } : prev));
    if (product.id) fetchProductConversions(product.id);
  }

  async function confirmAddConsumable() {
    if (!addDraft) return;
    const qty = parseFloat(addDraft.qty);
    if (!addDraft.productId) { setAddError("Pick a product first"); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setAddError("Enter a valid quantity"); return; }
    if ((row.consumables ?? []).some((c) => c.productId === addDraft.productId)) {
      setAddError("This consumable is already added.");
      return;
    }
    // Deliberately NOT blocked on stock — an out-of-stock consumable must not
    // stop staff recording what they actually used, or billing the service.
    // The row still shows a red "Only N in stock" warning (see the Actual Qty
    // input below) and the backend deducts with allowNegative, flooring
    // products.amount at 0 instead of refusing the payment.

    setAddSaving(true);
    setAddError("");
    try {
      // The consumable is added to THIS row first and unconditionally — it
      // rides along on the normal appointment save (see useAppointment.ts's
      // buildServiceApiItems), so it never needs a saved catalog service to
      // be recorded against this bill. Requiring one used to block the whole
      // action with "Save this row's service first".
      const rowQty = getSafeQty(row.qty);
      // Display-only: the backend independently resolves and enforces this
      // same ratio at save time (flattenServiceConsumables), so a stale
      // value here can never mis-deduct — it only affects what this row's
      // Total/Remaining Stock cells show before that save happens.
      const ratio = resolveConversionRatio(addDraft.baseUnit, addDraft.unit, productConversions[addDraft.productId] ?? []) ?? 1;
      const newRowConsumables = [
        ...(row.consumables ?? []),
        { productId: addDraft.productId, productName: addDraft.productName, qty: qty * rowQty, unitQty: qty, unit: addDraft.unit, baseUnit: addDraft.baseUnit, unitRatio: ratio },
      ];
      onChange(row.tempId, "consumables", newRowConsumables);

      // Best-effort catalog sync: when this row already points at a saved
      // catalog service, also fold the new item into that service's stored
      // recipe so future bookings inherit it. Skipped (not an error) when the
      // row has no service yet — nothing to patch — and a failure here must
      // not discard the row-level addition above, which is what actually
      // drives this bill's stock deduction.
      const serviceId = (row as any).service_id || row.id;
      if (serviceId) {
        // c.qty on an existing row entry is the STANDARD qty already scaled by
        // this row's billed Qty (see rescaleConsumables) — the catalog recipe
        // being patched here wants the flat per-session rate back, i.e. unitQty.
        const existingRecipe = (row.consumables ?? []).map((c) => ({ product_id: c.productId, qty: c.unitQty ?? c.qty, unit: c.unit }));
        const newRecipeItem = { product_id: addDraft.productId, qty, unit: addDraft.unit || undefined };
        try {
          await api.patch(SERVICES.BY_ID(serviceId), { consumables_used: [...existingRecipe, newRecipeItem] });
        } catch {
          // Non-fatal — the consumable is already on this row/bill.
        }
      }

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

    // `service_id` first, same as confirmAddConsumable below: on a row loaded
    // from a saved appointment, row.id is the appointment-service ROW id and
    // only service_id is the catalog service (see useAppointment.ts's
    // buildServiceApiItems). Reading row.id alone PATCHed
    // /services/<appointment-row-id>/reminder — a service that doesn't exist,
    // silently swallowed by the catch below.
    const serviceId = (row as any).service_id || row.id;
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
  // A row auto-created by the package-sale scheduling feature (row.clientPackageId
  // set) is always covered — it was already paid for in full at package-purchase
  // time, independent of the fuzzy pkgRemaining pool (see AppointmentModal.tsx's
  // perRowCoveredRemaining, which deliberately excludes these rows from that pool
  // to avoid double-redeeming the session it exactly links to).
  const isExactPackageLink = !!row.clientPackageId;
  const isPackageCovered = isExactPackageLink
    || (row.service.trim() !== "" && serviceSearch.trim() !== "" && pkgRemaining > 0);

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
                      ref={(el) => { serviceItemRefs.current[i] = el; }}
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
              {isExactPackageLink ? "Payment Source: Package" : "✓ Package Applied"}
            </span>
          )}
          {!isPackageCovered && membershipWalletInfo && membershipWalletInfo.walletUsed > 0 && (
            <span className="svc-field__pkg-badge" title={`You pay ${currencySymbol}${membershipWalletInfo.payable.toFixed(2)}`}>
              ✓ Membership Applied −{currencySymbol}{membershipWalletInfo.walletUsed.toFixed(2)}
            </span>
          )}
        </div>

        <div className="svc-field">
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
            <Dropdown
              disabled={disabled}
              className="svc-staff-pill__select"
              placeholder="Select Staff"
              value={row.staffId}
              options={(staffList || []).map((staff: StaffDto) => ({ id: String(staff.id), name: fmtName(staff.name) }))}
              onChange={handleStaffChange}
            />
          </div>
          {errorFields.staff && <span className="svc-field__err">Select staff</span>}
        </div>

        <div className="svc-field">
          <TimeSelect
            disabled={disabled}
            value={row.time}
            onChange={(value) => { onChange(row.tempId, "time", value); if (value) onClearError?.(row.tempId, "time"); }}
            interval={interval || "30 Mins"}
            className={`svc-field__input svc-field__select${errorFields.time ? " svc-field__input--error" : ""}`}
          />
          {errorFields.time && <span className="svc-field__err">Select time</span>}
        </div>

        <div className="svc-field">
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
          <input
            type="text"
            disabled={disabled}
            inputMode="numeric"
            maxLength={QTY_INPUT_MAX_LENGTH}
            placeholder="1"
            value={qtyInput}
            className={`svc-field__input${errorFields.qty ? " svc-field__input--error" : ""}`}
            onChange={(e) => handleQtyChange(e.target.value.replace(/\D/g, ""))}
            onBlur={handleQtyBlur}
          />
          {errorFields.qty && <span className="svc-field__err">Enter qty</span>}
        </div>

        <div className="svc-field">
          <input
            type="text"
            disabled={disabled}
            inputMode="decimal"
            maxLength={DISCOUNT_INPUT_MAX_LENGTH}
            placeholder="0"
            value={discountInput}
            className="svc-field__input"
            onChange={(e) => handleDiscountChange(e.target.value)}
            onBlur={handleDiscountBlur}
          />
        </div>

        <div className="svc-field">
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
                  title={compApplied ? savedComplimentaryRemark : "Remark"}
                  onClick={openComplimentaryModal}
                >
                  {compApplied ? (
                    <>
                      <span className="svc-quick-btn__day-val">{savedComplimentaryRemark.slice(0, 5)}</span>
                      <span className="svc-quick-btn__day-lbl">Note</span>
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
          {!disabled && (
            <button className="svc-del-btn" onClick={() => onRemove(row.tempId)} title="Remove">
              <Trash size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Consumable Usage Modal ───────────────────────────────────────────── */}
      {/* Standard/Unit come from the service's recipe (row.consumables, copied
          in at selectService() time) and are read-only. Actual Qty is edited
          live via onConsumableActualChange — never the normal onChange path —
          so it can never reach serviceRows/calculate-totals; Cancel restores
          the snapshot taken at open time, Update & Continue just closes since
          the edits are already in effect. */}
      {showConsumableModal && (
        <div className="svc-reminder-overlay" onClick={cancelConsumableModal}>
          <div className="svc-consumable-modal svc-consumable-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h3 className="svc-consumable-modal__title">Consumable Usage</h3>
            <div className="svc-consumable-modal__meta">
              <div><span>Service</span><strong>{row.service || "—"}</strong></div>
              <div><span>Client</span><strong>{clientName || "Walk-In"}</strong></div>
              <div><span>Staff</span><strong>{row.staff || "—"}</strong></div>
            </div>

            {row.consumables?.length ? (
              <>
                <div className="svc-recipe-header svc-recipe-header--full">
                  <span>Product</span>
                  <span>Total Stock</span>
                  <span>Standard Qty</span>
                  <span>Actual Qty</span>
                  <span>Unit</span>
                  <span>Remaining Stock</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                <div className="svc-consumable-modal__list">
                  {row.consumables.map((c) => {
                    const actualQty = getActualQty(c);
                    // The stock the API sent with the recipe wins; the shared
                    // products cache is only a fallback now (it's paged and
                    // replaced wholesale, so it frequently doesn't hold this
                    // product at all). ?? not || so a genuine 0 isn't treated
                    // as "unknown" and pushed to the cache lookup.
                    const availableStock = c.stock ?? productStockById.get(c.productId);
                    // Stock is always base-unit — c.baseUnit falls back to
                    // c.unit because every consumable NOT added through this
                    // row's own "+ Add Consumable" flow (i.e. everything from
                    // the service's recipe, via ConsumablesTab) already has
                    // unit === baseUnit by construction. actualQty is
                    // whatever's typed in c.unit, so it's converted by
                    // unitRatio before comparing/subtracting against a
                    // base-unit stock figure — comparing "1 Bottle" directly
                    // against "6000 ml" is the exact bug this replaces.
                    const stockUnit = c.baseUnit ?? c.unit;
                    const ratio = c.unitRatio ?? 1;
                    const actualQtyBase = actualQty * ratio;
                    const remainingStock = (availableStock ?? 0) - actualQtyBase;
                    const overStock = availableStock !== undefined && actualQtyBase > availableStock;
                    const status = getConsumableStatus(availableStock, remainingStock);
                    return (
                      <div key={c.productId} className="svc-recipe-row svc-recipe-row--full">
                        <span className="svc-recipe-row__name svc-recipe-row__name--truncate" title={c.productName || "—"}>{c.productName || "—"}</span>
                        <span className="svc-recipe-row__configured">
                          {availableStock !== undefined ? `${availableStock} ${stockUnit || ""}` : "—"}
                        </span>
                        <span className="svc-recipe-row__configured">{c.qty} {c.unit || ""}</span>
                        <div>
                          <input
                            ref={(el) => { actualQtyInputRefs.current[c.productId] = el; }}
                            className={`svc-recipe-row__actual-input${overStock ? " svc-recipe-row__actual-input--error" : ""}`}
                            type="number"
                            min={0}
                            step="any"
                            disabled={disabled}
                            value={actualQtyDrafts[c.productId] ?? actualQty}
                            onFocus={(e) => handleActualQtyFocus(c.productId, actualQty, e)}
                            onChange={(e) => handleActualQtyChange(c.productId, e.target.value)}
                            onBlur={() => handleActualQtyBlur(c.productId)}
                          />
                          {overStock && (
                            <span className="svc-recipe-row__warning">Only {availableStock} {stockUnit} in stock</span>
                          )}
                        </div>
                        <span className="svc-recipe-row__configured">{c.unit || "—"}</span>
                        <span className="svc-recipe-row__configured">
                          {availableStock !== undefined ? `${remainingStock} ${stockUnit || ""}` : "—"}
                        </span>
                        <span className={`svc-consumable-status svc-consumable-status--${status}`}>
                          {STATUS_DOT[status]} {STATUS_LABEL[status]}
                        </span>
                        <span className="svc-recipe-row__row-actions">
                          {!disabled && (
                            <>
                              <button type="button" className="svc-recipe-row__icon-btn" title="Edit Actual Qty" onClick={() => focusActualQtyInput(c.productId)}>
                                <Pencil size={13} />
                              </button>
                              <button type="button" className="svc-recipe-row__icon-btn svc-recipe-row__icon-btn--danger" title="Remove" onClick={() => setDeleteConfirmProductId(c.productId)}>
                                <Trash size={13} />
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="svc-recipe-empty">This service has no consumables configured.</p>
            )}

            {/* Delete confirmation */}
            {deleteConfirmProductId && (() => {
              const target = row.consumables?.find((c) => c.productId === deleteConfirmProductId);
              return (
                <div className="svc-consumable-confirm">
                  <p className="svc-consumable-confirm__title">Remove Consumable?</p>
                  <p className="svc-consumable-confirm__body">
                    <strong>{target?.productName || "This consumable"}</strong> will be removed from this sale.
                  </p>
                  <div className="svc-consumable-confirm__actions">
                    <button type="button" className="svc-consumable-modal__btn svc-consumable-modal__btn--close" onClick={() => setDeleteConfirmProductId(null)}>
                      Cancel
                    </button>
                    <button type="button" className="svc-consumable-modal__btn svc-consumable-modal__btn--danger" onClick={() => removeConsumableRow(deleteConfirmProductId)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Adding here updates the SERVICE's own recipe (same data
                ConsumablesTab in the Services catalog edits) — not a one-off
                for just this appointment, so it fixes "no consumables
                configured" for every future booking of this service too. */}
            {addDraft ? (
              <div className="svc-recipe-add-row svc-recipe-add-row--wrap">
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
                {addDraft.productId && (
                  <span className="svc-recipe-add-row__available">
                    Total Stock: {productStockById.get(addDraft.productId) ?? "—"} {addDraft.baseUnit || ""}
                  </span>
                )}
                <input
                  className="svc-consumable-row__input svc-consumable-row__input--sm"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Qty"
                  value={addDraft.qty}
                  onChange={(e) => { setAddDraft((p) => (p ? { ...p, qty: e.target.value } : p)); if (addError) setAddError(""); }}
                />
                <Dropdown
                  className="svc-consumable-row__input svc-consumable-row__input--sm svc-consumable-row__unit-select"
                  searchable={false}
                  placeholder="Unit"
                  value={addDraft.unit}
                  options={unitOptionsFor(addDraft.baseUnit, addDraft.productId).map((u) => ({ id: u, name: u }))}
                  onChange={(id) => setAddDraft((p) => (p ? { ...p, unit: id } : p))}
                />
                <button
                  type="button"
                  className="svc-consumable-modal__btn svc-consumable-modal__btn--add"
                  disabled={addSaving}
                  onClick={confirmAddConsumable}
                >
                  {addSaving ? "Saving…" : "Add Consumable"}
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
                onClick={cancelConsumableModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="svc-consumable-modal__btn svc-consumable-modal__btn--add"
                disabled={!!deleteConfirmProductId || (row.consumables ?? []).some((c) => {
                  const avail = productStockById.get(c.productId);
                  return avail !== undefined && getActualQty(c) > avail;
                })}
                onClick={confirmConsumableModal}
              >
                Update &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remark Modal ─────────────────────────────────────────────────────── */}
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

            <h3 className="svc-reminder-modal__title">Remark</h3>

            <p className="svc-reminder-modal__subtitle">
              Enter a remark for <strong>{row.service || "this service"}</strong> (Mandatory)
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
