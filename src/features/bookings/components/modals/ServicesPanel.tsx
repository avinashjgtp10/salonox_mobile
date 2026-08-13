import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCurrency } from "../../../../hooks/useCurrency";
import ServiceRow from "./ServiceRow";
import { Trash, CalendarPlus, CalendarCheckFill, CalendarEvent, InfoCircle } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import { SERVICES } from "../../../../services/api/endpoints/services.endpoints";
import type { ServiceItem, PackageItem, ProductItem, MembershipItem } from "../../types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";
import NameSelect from "../shared/NameSelect";
import Dropdown from "../../../../components/ui/Dropdown";
import type { IntervalOption } from "../../types/scheduler-types";

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 350;

function fmtName(name: string) {
  return name.includes(" ") ? name : name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

interface SearchableCatalogItem {
  id: string | number;
  name: string;
  price?: number | null;
  stock?: number;
  barcode?: string | null;
  barcodeSearchValues?: Array<string | null | undefined>;
  priceSearchValues?: Array<number | string | null | undefined>;
  categoryId?: string;
}

function getProductDisplayPrice(item: any) {
  const retail = parseFloat(String(
    item.retail_price ??
    item.selling_price ??
    item.sellingPrice ??
    item.retailPrice ??
    item.sellingPriceRaw ??
    item.price
  ));
  if (!isNaN(retail) && retail !== 0) return retail;

  // Same fallback as ProductsListPage.tsx's price column — a product with no
  // retail_price set (e.g. consumable-only, or an incomplete manual entry)
  // still has a real supply_price, and showing ₹0 here silently zeroed out
  // the row's total instead of falling back to it.
  const supply = parseFloat(String(item.supply_price ?? item.supplyPrice));
  if (!isNaN(supply) && supply !== 0) return supply;

  return 0;
}

function getProductPriceSearchValues(item: any) {
  return [
    item.retail_price,
    item.retailPrice,
  ];
}

interface Props {
  serviceRows: ServiceItem[];
  onUpdateService: (index: number, field: string, value: any) => void;
  onRemoveService: (index: number) => void;
  onAddService: () => void;

  packageRows: PackageItem[];
  onUpdatePackage: (index: number, row: PackageItem) => void;
  onRemovePackage: (index: number) => void;
  onAddPackage: () => void;

  productRows: ProductItem[];
  onUpdateProduct: (index: number, row: ProductItem) => void;
  onRemoveProduct: (index: number) => void;
  onAddProduct: () => void;

  membershipRows: MembershipItem[];
  onUpdateMembership: (index: number, row: MembershipItem) => void;
  onRemoveMembership: (index: number) => void;
  onAddMembership: () => void;

  // Opens the Custom Package creation form (sell a brand-new package to
  // this bill's client on the spot, instead of only picking from existing
  // packages/templates via "+ Package") — omit to hide the trigger.
  onSellPackage?: () => void;
  // Opens the manual eWallet top-up popup — omit to hide the trigger.
  onTopupEwallet?: () => void;

  availablePackages: any[];
  availableProducts: any[];
  availableMemberships: any[];
  // Catalog services (id/name/price) — lets a "+ Package" row resolve each
  // of the picked package's individual services down to a real catalog id
  // for the per-service scheduling breakdown (see PackageRow).
  serviceCatalog?: Array<{ id: string; name: string; price?: number }>;
  frozen?: boolean;
  // Pre-pooled per-row package-session allocation (keyed by row tempId) —
  // computed once in AppointmentModal.tsx by walking every service row in
  // order and allocating the package's remaining sessions one row at a time,
  // so two rows of the same covered service (e.g. booked with two different
  // staff) split the real remaining sessions instead of each independently
  // seeing the full pool and both claiming to be covered.
  packageRemainingByRow?: Map<string, number>;
  // Per-row GST (keyed by row tempId) from the live pricing preview — the
  // real per-item tax each row will carry once the sale is saved. One map
  // per billable item type, same shape as the backend's rowTax.
  serviceTaxByRow?: Map<string, number>;
  // Actual-qty edits for each row's consumables (keyed by row tempId, then
  // productId) — a sibling of serviceRows, never merged into it (see
  // AppointmentModal's declaration for why: it must never trigger the
  // calculate-totals effect). Threaded straight through to ServiceRow.
  consumableActuals?: Record<string, Record<string, number>>;
  onConsumableActualChange?: (rowKey: string, productId: string, actualQty: number) => void;
  // Shown in the Consumable Usage modal's header (Service/Client/Staff) —
  // ServiceRow itself only knows the row's own staff, not the appointment's
  // client, so this is threaded down from AppointmentModal's selectedClient.
  clientName?: string;
  packageTaxByRow?: Map<string, number>;
  productTaxByRow?: Map<string, number>;
  membershipTaxByRow?: Map<string, number>;
  membershipWalletInfo?: Map<string, { walletUsed: number; payable: number }>;
  // Per-row Discount Balance/Loyalty membership discount (keyed by row
  // tempId) — same fill-in-order split already folded into the row's own
  // GST above, shown separately against the Price box.
  serviceMembershipDiscountByRow?: Map<string, number>;
  productMembershipDiscountByRow?: Map<string, number>;

  svcErrors?: Array<{ service?: boolean; staff?: boolean; time?: boolean }>;
  pkgErrors?: Array<{ item?: boolean; staff?: boolean; time?: boolean }>;
  prodErrors?: Array<{ item?: boolean; staff?: boolean; time?: boolean }>;
  memErrors?: Array<{ item?: boolean; staff?: boolean; time?: boolean }>;
  onClearSvcError?: (index: number, field: string) => void;
  onClearPkgError?: (index: number, field: string) => void;
  onClearProdError?: (index: number, field: string) => void;
  onClearMemError?: (index: number, field: string) => void;
}

type SearchableItemRowProps =
  | {
      row: PackageItem;
      frozen?: boolean;
      error?: boolean;
      staffError?: boolean;
      timeError?: boolean;
      kind: "package";
      items: SearchableCatalogItem[];
      placeholder: string;
      helperText: string;
      emptyText: string;
      staffList: { id: string; name: string }[];
      interval: IntervalOption;
      onClearError?: (field: string) => void;
      onUpdate: (row: PackageItem) => void;
      onRemove: () => void;
      taxAmount?: number;
    }
  | {
      row: ProductItem;
      productRows: ProductItem[];
      frozen?: boolean;
      error?: boolean;
      staffError?: boolean;
      timeError?: boolean;
      kind: "product";
      items: SearchableCatalogItem[];
      placeholder: string;
      helperText: string;
      emptyText: string;
      staffList: { id: string; name: string }[];
      interval: IntervalOption;
      onClearError?: (field: string) => void;
      onUpdate: (row: ProductItem) => void;
      onUpdateProductRow: (index: number, row: ProductItem) => void;
      onAddProductRow: () => void;
      requestNextProductFocus: (index: number) => void;
      autoFocusSearch?: boolean;
      onAutoFocusHandled?: () => void;
      onRemove: () => void;
      membershipWalletInfo?: { walletUsed: number; payable: number };
      taxAmount?: number;
      membershipDiscountAmount?: number;
    };

function getSafeQty(qty?: number) {
  return Number.isInteger(qty) && (qty ?? 0) > 0 ? Number(qty) : 1;
}

function getDiscountValue(discount?: number) {
  return Number.isFinite(discount) && (discount ?? 0) > 0 ? String(discount) : "";
}

// Per-row discount is a PERCENTAGE (0–100) of price × qty, not a flat amount.
function calcTotal(price: number, qty: number, discountPct: number) {
  const pct = Math.min(100, Math.max(0, discountPct));
  return Math.max(0, price * qty * (1 - pct / 100));
}

function formatPriceForSearch(value: number) {
  const fixed = value.toFixed(2);
  return fixed.endsWith(".00") ? String(Math.trunc(value)) : fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function matchesProductPriceSearch(item: SearchableCatalogItem, searchValue: string) {
  const candidates = item.priceSearchValues ?? [];

  return candidates.some((candidate) => {
    const numericValue = Number(candidate);
    if (!Number.isFinite(numericValue)) return false;

    return numericValue === Number(searchValue) || formatPriceForSearch(numericValue).includes(searchValue);
  });
}

function normalizeBarcode(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesProductBarcode(item: SearchableCatalogItem, searchValue: string) {
  const normalizedSearch = normalizeBarcode(searchValue);
  if (!normalizedSearch) return false;

  const candidates = item.barcodeSearchValues?.length
    ? item.barcodeSearchValues
    : [item.barcode];

  return candidates.some((candidate) => normalizeBarcode(candidate) === normalizedSearch);
}

function productMatchesSearch(
  item: SearchableCatalogItem,
  normalizedSearch: string,
  rawSearch: string,
  isNumericPriceSearch: boolean,
) {
  // Checked first, regardless of whether the typed value looks numeric — a
  // barcode is very often all-digits, which would otherwise be routed to
  // matchesProductPriceSearch below and never actually compared against any
  // product's barcode at all. This is also what filters the async
  // /products?search= results (that endpoint DOES match by barcode
  // server-side), so without this a correct backend barcode match was being
  // thrown away here before it ever reached the dropdown.
  if (matchesProductBarcode(item, rawSearch)) return true;

  if (isNumericPriceSearch) return matchesProductPriceSearch(item, rawSearch);

  // Text input -> search only Product Name.
  return String(item.name || "").toLowerCase().includes(normalizedSearch);
}

// In-stock products first, out-of-stock ones last — a stable sort (relative
// order within each group is untouched) so search-relevance ordering still
// holds within "in stock" and within "out of stock" separately.
function sortInStockFirst(items: SearchableCatalogItem[]): SearchableCatalogItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aOut = a.item.stock !== undefined && a.item.stock <= 0;
      const bOut = b.item.stock !== undefined && b.item.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function mapProductSearchItem(item: any): SearchableCatalogItem {
  return {
    id: item.id,
    name: item.name,
    price: getProductDisplayPrice(item),
    stock: Number(item.amount ?? item.stock_quantity ?? item.current_stock ?? item.stock ?? 0),
    barcode: item.barcode ?? item.BarcodeID ?? item.bar_code ?? item.sku ?? null,
    barcodeSearchValues: [
      item.barcode,
      item.BarcodeID,
      item.bar_code,
      item.sku,
    ],
    priceSearchValues: getProductPriceSearchValues(item),
    categoryId: item.category_id ?? undefined,
  };
}

function extractProductSearchResults(response: any): any[] {
  const payload = response?.data?.data ?? response?.data ?? {};

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

// Pure-consumable products (used only inside a service's recipe) aren't
// sellable on their own — this "+ Product" row is for retail sale, so any
// live server search result must be filtered the same way the cached
// availableProducts list already is (see AppointmentModal.tsx).
function filterSellableProducts(items: any[]): any[] {
  return items.filter((item) => !item.product_type || item.product_type === "retail" || item.product_type === "both");
}

function extractProductSearchTotalPages(response: any) {
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

async function fetchProductSearchItems(searchValue: string, isNumericPriceSearch: boolean) {
  const collected: SearchableCatalogItem[] = [];

  if (!isNumericPriceSearch) {
    const response = await api.get("/api/v1/products", {
      params: { search: searchValue, limit: 100 },
    }).catch(() => null);

    filterSellableProducts(extractProductSearchResults(response))
      .map(mapProductSearchItem)
      .forEach((item) => {
        if (!collected.some((existing) => String(existing.id) === String(item.id))) {
          collected.push(item);
        }
      });

    return collected;
  }

  let page = 1;
  let totalPages = 1;

  do {
    const response = await api.get("/api/v1/products", {
      params: { page, limit: 100, pageSize: 100 },
    }).catch(() => null);

    if (!response) break;

    filterSellableProducts(extractProductSearchResults(response))
      .map(mapProductSearchItem)
      .forEach((item) => {
        if (!collected.some((existing) => String(existing.id) === String(item.id))) {
          collected.push(item);
        }
      });

    totalPages = extractProductSearchTotalPages(response);
    page += 1;
  } while (page <= totalPages);

  if (collected.length === 0) {
    const response = await api.get("/api/v1/products", {
      params: { limit: 100, pageSize: 100 },
    }).catch(() => null);

    filterSellableProducts(extractProductSearchResults(response))
      .map(mapProductSearchItem)
      .forEach((item) => {
        if (!collected.some((existing) => String(existing.id) === String(item.id))) {
          collected.push(item);
        }
      });
  }

  return collected;
}

// Extracted so qty/discount can use the same local-buffer pattern as
// SearchableItemRow (package/product) — the inline version previously bound
// the Qty input straight to `row.qty` with `Math.max(1, parseInt(...) || 1)`
// on every keystroke, which snapped the field back to "1" the instant it was
// cleared to type a new number, making it feel impossible to edit.
interface MembershipRowProps {
  row: MembershipItem;
  index: number;
  frozen?: boolean;
  interval: IntervalOption;
  staffList: { id: string; name: string }[];
  availableMemberships: any[];
  memError?: { item?: boolean; staff?: boolean; time?: boolean };
  onClearError?: (field: string) => void;
  onUpdateMembership: (index: number, row: MembershipItem) => void;
  onRemoveMembership: (index: number) => void;
  taxAmount?: number;
}

function MembershipRow({
  row, index, frozen, interval, staffList, availableMemberships, memError,
  onClearError, onUpdateMembership, onRemoveMembership, taxAmount,
}: MembershipRowProps) {
  const { currencySymbol } = useCurrency();
  const [qtyInput, setQtyInput] = useState(String(getSafeQty(row.qty)));
  const [discountInput, setDiscountInput] = useState(getDiscountValue(row.discount));
  // Toggled by the "i" button next to the picker — lets staff read what this
  // membership actually includes before selling it, instead of having to
  // already know (or go check the catalog separately).
  const [showDesc, setShowDesc] = useState(false);
  const selectedMembership = availableMemberships.find(
    (m: any) => String(m.id) === String((row as any).membershipId),
  );

  useEffect(() => { setQtyInput(String(getSafeQty(row.qty))); }, [row.qty]);
  useEffect(() => { setDiscountInput(getDiscountValue(row.discount)); }, [row.discount]);
  useEffect(() => { setShowDesc(false); }, [(row as any).membershipId]);

  function handleQtyChange(value: string) {
    const normalizedValue = value.slice(0, 2);
    setQtyInput(normalizedValue);
    if (!normalizedValue) return;
    const qty = parseInt(normalizedValue, 10);
    if (Number.isInteger(qty) && qty > 0) {
      onUpdateMembership(index, { ...row, qty, total: calcTotal(row.price, qty, row.discount || 0) });
    }
  }

  function handleQtyBlur() {
    const qty = parseInt(qtyInput, 10);
    const clampedQty = Number.isInteger(qty) && qty > 0 ? Math.min(qty, 99) : 1;
    setQtyInput(String(clampedQty));
    onUpdateMembership(index, { ...row, qty: clampedQty, total: calcTotal(row.price, clampedQty, row.discount || 0) });
  }

  function handleDiscountChange(value: string) {
    const normalizedValue = value.slice(0, 3);
    setDiscountInput(normalizedValue);
    const discount = Math.min(100, parseInt(normalizedValue, 10) || 0);
    onUpdateMembership(index, { ...row, discount, total: calcTotal(row.price, getSafeQty(row.qty), discount) });
  }

  function handleDiscountBlur() {
    const discount = Math.min(100, Math.max(0, parseInt(discountInput, 10) || 0));
    setDiscountInput(discount > 0 ? String(discount) : "");
    onUpdateMembership(index, { ...row, discount, total: calcTotal(row.price, getSafeQty(row.qty), discount) });
  }

  return (
    <div className="item-row item-row--membership">
      {/* 1 — Name */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <NameSelect
          className={`svc-field__input svc-field__select${memError?.item ? " svc-field__input--error" : ""}`}
          disabled={frozen}
          placeholder="Select membership..."
          searchPlaceholder="Search memberships…"
          value={(row as any).membershipId || ""}
          options={availableMemberships.map((m: any) => ({ id: m.id, name: m.name }))}
          onChange={(option) => {
            const m = availableMemberships.find((mb: any) => String(mb.id) === String(option.id));
            if (m) {
              onUpdateMembership(index, { ...row, membershipId: m.id, membershipName: m.name, price: m.price, qty: 1, discount: 0, total: m.price });
              onClearError?.("item");
            }
          }}
        />
        {memError?.item && <span className="svc-field__err">Please select a membership</span>}
      </div>

      {/* 2 — Staff */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className={`svc-staff-pill${memError?.staff ? " svc-staff-pill--error" : ""}`}>
          <button
            type="button"
            disabled={frozen}
            className="svc-staff-pill__clear"
            onClick={() => !frozen && onUpdateMembership(index, { ...row, staffId: "" })}
          >
            ×
          </button>
          <Dropdown
            disabled={frozen}
            className="svc-staff-pill__select"
            placeholder="Select Staff"
            value={row.staffId || ""}
            options={staffList.map((s) => ({ id: s.id, name: fmtName(s.name) }))}
            onChange={(id) => { onUpdateMembership(index, { ...row, staffId: id }); if (id) onClearError?.("staff"); }}
          />
        </div>
        {memError?.staff && <span className="svc-field__err">Select staff</span>}
      </div>

      {/* 3 — Time */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TimeSelect
          disabled={frozen}
          value={row.time || ""}
          // Clearing the error on pick matters as much as raising it: without
          // this the "Select time" message stayed on screen after a time was
          // chosen, so the row looked permanently invalid.
          onChange={(value) => { onUpdateMembership(index, { ...row, time: value }); if (value) onClearError?.("time"); }}
          interval={interval}
          className={`svc-field__input svc-field__select${memError?.time ? " svc-field__input--error" : ""}`}
          placeholder="Time"
        />
        {memError?.time && <span className="svc-field__err">Select time</span>}
      </div>

      {/* 4 — Price (readonly) */}
      <input className="svc-field__input svc-field__input--readonly" readOnly value={row.price ? `${currencySymbol}${row.price}` : "—"} />

      {/* 5 — Qty */}
      <input
        className="svc-field__input"
        type="text"
        inputMode="numeric"
        maxLength={2}
        disabled={frozen}
        placeholder="1"
        value={qtyInput}
        onChange={(e) => handleQtyChange(e.target.value.replace(/\D/g, ""))}
        onBlur={handleQtyBlur}
      />

      {/* 6 — Discount (%) */}
      <input
        className="svc-field__input"
        type="text"
        inputMode="numeric"
        maxLength={3}
        disabled={frozen}
        placeholder="0"
        value={discountInput}
        onChange={(e) => handleDiscountChange(e.target.value.replace(/\D/g, ""))}
        onBlur={handleDiscountBlur}
      />

      {/* 7 — Total (readonly) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <input className="svc-field__input svc-field__input--readonly" readOnly value={`${currencySymbol}${row.total.toFixed(2)}`} />
        {taxAmount !== undefined && taxAmount > 0 && (
          <span className="svc-field__hint" style={{ color: "#6b7280" }}>
            +{currencySymbol}{taxAmount.toFixed(2)} GST
          </span>
        )}
      </div>

      {/* 8 — Quick-actions column: membership description */}
      <div style={{ position: "relative" }}>
        {(row as any).membershipId && (
          <button
            type="button"
            className="pkg-info-btn"
            title="View membership description"
            aria-label="View membership description"
            onClick={() => setShowDesc((v) => !v)}
          >
            ℹ
          </button>
        )}
        {showDesc && (row as any).membershipId && (
          <div className="membership-row__desc-box">
            {!!selectedMembership?.bonusCredit && (
              <div className="membership-row__desc-bonus">
                Bonus Credit: {currencySymbol}{selectedMembership.bonusCredit.toLocaleString("en-IN")}
              </div>
            )}
            <div>{selectedMembership?.description?.trim() || "No description provided."}</div>
          </div>
        )}
      </div>

      {/* 9 — Delete */}
      {!frozen
        ? <button className="svc-del-btn" onClick={() => onRemoveMembership(index)}><Trash size={13} /></button>
        : <span />}
    </div>
  );
}

// Same local-buffer qty/discount pattern as MembershipRow — packages are
// picked from a plain <select> (like memberships) rather than searched, since
// a salon's package list is short and named, not something worth free-text
// filtering.
interface PackageRowProps {
  row: PackageItem;
  index: number;
  frozen?: boolean;
  interval: IntervalOption;
  staffList: { id: string; name: string }[];
  availablePackages: any[];
  serviceCatalog?: Array<{ id: string; name: string; price?: number }>;
  pkgError?: { item?: boolean; staff?: boolean; time?: boolean };
  onClearError?: (field: string) => void;
  onUpdatePackage: (index: number, row: PackageItem) => void;
  onRemovePackage: (index: number) => void;
  taxAmount?: number;
}

// Resolves a picked package's individual services into a schedulable
// breakdown. Templates (`serviceDetails`) already carry name/sessions/price
// but no catalog id — resolved by matching on name. Catalog "combo"
// packages (`services`: string[] of catalog serviceIds) already have a real
// id — name/price resolved by looking that id up directly. A service that
// can't be matched to the catalog is still included (so its price counts
// toward the package total shown in the "i" popover) but with no
// `serviceId`, which the schedule toggle treats as unschedulable.
function resolvePackageServices(
  pkg: any,
  serviceCatalog: Array<{ id: string; name: string; price?: number }> | undefined,
): PackageItem["services"] {
  if (!pkg) return undefined;
  const catalog = serviceCatalog ?? [];
  if (Array.isArray(pkg.serviceDetails) && pkg.serviceDetails.length > 0) {
    return pkg.serviceDetails.map((s: any) => {
      const match = catalog.find((c) => c.name.trim().toLowerCase() === String(s.name || "").trim().toLowerCase());
      return {
        serviceId: match?.id,
        serviceName: s.name || "—",
        totalSessions: Number(s.sessions) || 1,
        price: Number(s.price) || 0,
        // Pre-expand the date/staff fields for anything already schedulable,
        // so staff land on a ready-to-fill row instead of a "Not scheduled"
        // placeholder that needs its own click to reveal them.
        schedule: match ? { scheduledAt: "" } : undefined,
      };
    });
  }
  if (Array.isArray(pkg.services) && pkg.services.length > 0 && typeof pkg.services[0] === "string") {
    return pkg.services.map((svcId: string) => {
      const match = catalog.find((c) => String(c.id) === String(svcId));
      return {
        serviceId: match ? String(match.id) : undefined,
        serviceName: match?.name ?? "Service",
        totalSessions: 1,
        price: Number(match?.price) || 0,
        schedule: match ? { scheduledAt: "" } : undefined,
      };
    });
  }
  return undefined;
}

// Fallback for services resolvePackageServices couldn't match — the bulk
// catalog fetch it reads from is capped (limit:200), so a salon with a
// larger catalog silently left most package services unschedulable even
// though an exact-named service really does exist. This does a live,
// server-side search per unresolved name (same endpoint/params ServiceRow's
// own search box already uses), which finds it regardless of total catalog
// size. Only ever called for entries still missing a serviceId.
async function fetchExactCatalogMatch(serviceName: string): Promise<{ id: string; price: number } | null> {
  try {
    const res = await api.get(SERVICES.LIST(`search=${encodeURIComponent(serviceName)}&is_active=true&limit=20`));
    const payload = (res as any)?.data?.data ?? (res as any)?.data ?? {};
    const results: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const exact = results.find((r) => String(r?.name ?? "").trim().toLowerCase() === serviceName.trim().toLowerCase());
    return exact ? { id: String(exact.id), price: parseFloat(String(exact.price)) || 0 } : null;
  } catch {
    return null;
  }
}

function PackageRow({
  row, index, frozen, interval, staffList, availablePackages, serviceCatalog, pkgError,
  onClearError, onUpdatePackage, onRemovePackage, taxAmount,
}: PackageRowProps) {
  const { currencySymbol } = useCurrency();
  const [qtyInput, setQtyInput] = useState(String(getSafeQty(row.qty)));
  const [discountInput, setDiscountInput] = useState(getDiscountValue(row.discount));
  // Mirrors MembershipRow's "i" button — lets staff see what a package
  // actually contains before selling it, instead of having to already know.
  const [showDesc, setShowDesc] = useState(false);
  // Expands into the per-service schedule breakdown (date/staff per
  // service) — same "schedule now, redeem on completion" capability the
  // standalone Sell Package form has, brought to this inline row.
  const [showSchedule, setShowSchedule] = useState(false);
  const selectedPackage = availablePackages.find(
    (p: any) => String(p.id) === String(row.packageId),
  );

  // Always holds the current `row` prop, readable from async callbacks below
  // (the background catalog-resolution lookup) without them closing over a
  // stale snapshot from the moment the package was picked — e.g. staff/qty
  // edits made while that lookup is still in flight must not be clobbered
  // when it resolves.
  const rowRef = useRef(row);
  rowRef.current = row;

  function updateRowService(svcIdx: number, patch: Partial<NonNullable<PackageItem["services"]>[number]>) {
    const next = (row.services ?? []).map((s, i) => i === svcIdx ? { ...s, ...patch } : s);
    onUpdatePackage(index, { ...row, services: next });
  }

  // Background fallback for any service resolvePackageServices couldn't
  // match against the (capped) bulk catalog cache — looks each one up by an
  // exact live search instead. Patches only the still-unresolved entries by
  // name, merged against whatever the row looks like AT THE TIME each
  // lookup resolves (via rowRef), and bails out entirely if the picked
  // package has since changed.
  function resolveUnmatchedServiceIds(pickedPackageId: string, services: NonNullable<PackageItem["services"]>) {
    const unresolved = services.filter((s) => !s.serviceId);
    if (unresolved.length === 0) return;
    unresolved.forEach((svc) => {
      fetchExactCatalogMatch(svc.serviceName).then((match) => {
        if (!match) return;
        const latest = rowRef.current;
        if (String(latest.packageId) !== String(pickedPackageId)) return;
        const merged = (latest.services ?? []).map((s) =>
          s.serviceName === svc.serviceName && !s.serviceId
            ? { ...s, serviceId: match.id, schedule: s.schedule ?? { scheduledAt: "" } }
            : s,
        );
        onUpdatePackage(index, { ...latest, services: merged });
      });
    });
  }

  useEffect(() => { setQtyInput(String(getSafeQty(row.qty))); }, [row.qty]);
  useEffect(() => { setDiscountInput(getDiscountValue(row.discount)); }, [row.discount]);
  useEffect(() => { setShowDesc(false); setShowSchedule(false); }, [row.packageId]);

  function handleQtyChange(value: string) {
    const normalizedValue = value.slice(0, 2);
    setQtyInput(normalizedValue);
    if (!normalizedValue) return;
    const qty = parseInt(normalizedValue, 10);
    if (Number.isInteger(qty) && qty > 0) {
      onUpdatePackage(index, { ...row, qty, total: calcTotal(row.price, qty, row.discount || 0) });
    }
  }

  function handleQtyBlur() {
    const qty = parseInt(qtyInput, 10);
    const clampedQty = Number.isInteger(qty) && qty > 0 ? Math.min(qty, 99) : 1;
    setQtyInput(String(clampedQty));
    onUpdatePackage(index, { ...row, qty: clampedQty, total: calcTotal(row.price, clampedQty, row.discount || 0) });
  }

  function handleDiscountChange(value: string) {
    const normalizedValue = value.slice(0, 3);
    setDiscountInput(normalizedValue);
    const discount = Math.min(100, parseInt(normalizedValue, 10) || 0);
    onUpdatePackage(index, { ...row, discount, total: calcTotal(row.price, getSafeQty(row.qty), discount) });
  }

  function handleDiscountBlur() {
    const discount = Math.min(100, Math.max(0, parseInt(discountInput, 10) || 0));
    setDiscountInput(discount > 0 ? String(discount) : "");
    onUpdatePackage(index, { ...row, discount, total: calcTotal(row.price, getSafeQty(row.qty), discount) });
  }

  return (
    <>
    <div className="item-row item-row--package">
      {/* 1 — Name */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(row as any).isCustom ? (
          // Built via "+ Sell Package" (PackageCreateForm's lineItemMode) —
          // already fully defined (name/services/price), so there's nothing
          // to pick from a dropdown for. Static label + badge instead.
          <div
            className="svc-field__input"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#faf5ff", borderColor: "#e9d5ff" }}
            title={row.packageName}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.packageName}</span>
            <span style={{ marginLeft: "auto", flexShrink: 0, background: "#7c3aed", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, letterSpacing: ".03em" }}>
              CUSTOM
            </span>
          </div>
        ) : (
          <NameSelect
            className={`svc-field__input svc-field__select${pkgError?.item ? " svc-field__input--error" : ""}`}
            disabled={frozen}
            placeholder="Select package..."
            searchPlaceholder="Search packages…"
            value={row.packageId || ""}
            options={availablePackages.map((p: any) => ({ id: p.id, name: p.name }))}
            onChange={(option) => {
              const p = availablePackages.find((pkg: any) => String(pkg.id) === String(option.id));
              if (p) {
                const services = resolvePackageServices(p, serviceCatalog);
                onUpdatePackage(index, {
                  ...row, packageId: p.id, packageName: p.name, price: p.price, qty: 1, discount: 0, total: p.price,
                  services,
                });
                onClearError?.("item");
                if (services?.length) resolveUnmatchedServiceIds(p.id, services);
              }
            }}
          />
        )}
        {pkgError?.item && <span className="svc-field__err">Please select a package</span>}
      </div>

      {/* 2 — Staff */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className={`svc-staff-pill${pkgError?.staff ? " svc-staff-pill--error" : ""}`}>
          <button
            type="button"
            disabled={frozen}
            className="svc-staff-pill__clear"
            onClick={() => !frozen && onUpdatePackage(index, { ...row, staffId: "" })}
          >
            ×
          </button>
          <Dropdown
            disabled={frozen}
            className="svc-staff-pill__select"
            placeholder="Select Staff"
            value={row.staffId || ""}
            options={staffList.map((s) => ({ id: s.id, name: fmtName(s.name) }))}
            onChange={(id) => { onUpdatePackage(index, { ...row, staffId: id }); if (id) onClearError?.("staff"); }}
          />
        </div>
        {pkgError?.staff && <span className="svc-field__err">Select staff</span>}
      </div>

      {/* 3 — Time */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TimeSelect
          disabled={frozen}
          value={row.time || ""}
          onChange={(value) => { onUpdatePackage(index, { ...row, time: value }); if (value) onClearError?.("time"); }}
          interval={interval}
          className={`svc-field__input svc-field__select${pkgError?.time ? " svc-field__input--error" : ""}`}
          placeholder="Time"
        />
        {pkgError?.time && <span className="svc-field__err">Select time</span>}
      </div>

      {/* 4 — Price (readonly) */}
      <input className="svc-field__input svc-field__input--readonly" readOnly value={row.price ? `${currencySymbol}${row.price}` : `${currencySymbol}0`} />

      {/* 5 — Qty */}
      <input
        className="svc-field__input"
        type="text"
        inputMode="numeric"
        maxLength={2}
        disabled={frozen}
        placeholder="1"
        value={qtyInput}
        onChange={(e) => handleQtyChange(e.target.value.replace(/\D/g, ""))}
        onBlur={handleQtyBlur}
      />

      {/* 6 — Discount (%) */}
      <input
        className="svc-field__input"
        type="text"
        inputMode="numeric"
        maxLength={3}
        disabled={frozen}
        placeholder="0"
        value={discountInput}
        onChange={(e) => handleDiscountChange(e.target.value.replace(/\D/g, ""))}
        onBlur={handleDiscountBlur}
      />

      {/* 7 — Total (readonly) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <input className="svc-field__input svc-field__input--readonly" readOnly value={`${currencySymbol}${row.total.toFixed(2)}`} />
        {taxAmount !== undefined && taxAmount > 0 && (
          <span className="svc-field__hint" style={{ color: "#6b7280" }}>
            +{currencySymbol}{taxAmount.toFixed(2)} GST
          </span>
        )}
      </div>

      {/* 8 — Quick-actions column: package contents + scheduling */}
      <div className="pkg-actions">
        {(row.packageId || (row as any).isCustom) && (
          <button
            type="button"
            className="pkg-info-btn"
            title="View package details"
            aria-label="View package details"
            onClick={() => setShowDesc((v) => !v)}
          >
            <InfoCircle size={14} />
          </button>
        )}
        {(row.packageId || (row as any).isCustom) && (row.services?.length ?? 0) > 0 && (
          <button
            type="button"
            className={`pkg-info-btn${showSchedule ? " pkg-info-btn--active" : ""}`}
            title="Schedule future appointments for this package's services"
            aria-label="Schedule future appointments for this package's services"
            aria-expanded={showSchedule}
            onClick={() => setShowSchedule((v) => !v)}
          >
            <CalendarPlus size={14} />
          </button>
        )}
        {showDesc && (row.packageId || (row as any).isCustom) && (
          <div className="membership-row__desc-box">
            {(row as any).isCustom ? (
              // Built via "+ Sell Package" — fully defined already, so show
              // its own real service/session list directly rather than
              // looking it up in availablePackages (nothing to find there).
              <>
                {(row.services?.length ?? 0) > 0 ? (
                  <div className="package-row__svc-list">
                    {row.services!.map((s, i) => (
                      <div key={`${s.serviceName}-${i}`} className="package-row__svc">
                        <span>{s.serviceName}</span>
                        <span>{s.totalSessions > 0 ? `${s.totalSessions} session${s.totalSessions > 1 ? "s" : ""}` : "—"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>No package details available.</div>
                )}
                <div className="package-row__expiry">
                  {(row as any).customExpiry?.neverExpires
                    ? "Never expires"
                    : (row as any).customExpiry?.expiryDate
                      ? `Expires ${(row as any).customExpiry.expiryDate}`
                      : ""}
                </div>
              </>
            ) : (
              <>
                {/* Package templates carry no description — what staff actually
                    need is what's inside, so the included services and their
                    session counts lead. Catalog packages have the reverse (a
                    description, no session data), so both are rendered and
                    whichever exists shows. */}
                {selectedPackage?.serviceDetails?.length > 0 ? (
                  <div className="package-row__svc-list">
                    {selectedPackage.serviceDetails.map((s: any, i: number) => (
                      <div key={`${s.name}-${i}`} className="package-row__svc">
                        <span>{s.name}</span>
                        <span>{s.sessions > 0 ? `${s.sessions} session${s.sessions > 1 ? "s" : ""}` : "—"}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {selectedPackage?.description?.trim() ? (
                  <div>{selectedPackage.description.trim()}</div>
                ) : null}
                {!selectedPackage?.serviceDetails?.length && !selectedPackage?.description?.trim() && (
                  <div>No package details available.</div>
                )}
                {selectedPackage && (
                  <div className="package-row__expiry">
                    {selectedPackage.neverExpires
                      ? "Never expires"
                      : selectedPackage.expiryDays != null
                        ? `Valid ${selectedPackage.expiryDays} day${selectedPackage.expiryDays === 1 ? "" : "s"}`
                        : ""}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 9 — Delete */}
      {!frozen
        ? <button className="svc-del-btn" onClick={() => onRemovePackage(index)}><Trash size={13} /></button>
        : <span />}
    </div>

    {/* Per-service schedule breakdown — book a future appointment for one or
        more of this package's services right now; the session is deducted
        only once that appointment is completed, not at package purchase. */}
    {showSchedule && (row.services?.length ?? 0) > 0 && (
      <div className="pkg-schedule">
        <div className="pkg-schedule__head">
          Schedule future appointments
          <span>Sessions are only deducted once the appointment is completed.</span>
        </div>
        {(row.services ?? []).map((svc, i) => {
          const scheduled = !!svc.schedule;
          const unschedulable = !svc.serviceId;
          return (
            <div key={`${svc.serviceName}-${i}`} className={`pkg-schedule__row${scheduled ? " pkg-schedule__row--on" : ""}`}>
              <button
                type="button"
                className="pkg-schedule__toggle"
                disabled={frozen || unschedulable}
                aria-pressed={scheduled}
                title={unschedulable
                  ? "This service isn't linked to the catalog and can't be auto-scheduled"
                  : scheduled ? "Remove scheduled appointment" : "Schedule a future appointment for this service"}
                onClick={() => updateRowService(i, { schedule: scheduled ? undefined : { scheduledAt: "", staffId: "" } })}
              >
                {scheduled ? <CalendarCheckFill size={13} /> : <CalendarPlus size={13} />}
              </button>
              <span className="pkg-schedule__name">
                {svc.serviceName}<span>×{svc.totalSessions}</span>
              </span>
              {scheduled ? (
                <div className="pkg-schedule__fields">
                  {/* The native date glyph is hidden in CSS and replaced with
                      this icon so it matches the rest of the modal's iconography;
                      clicking anywhere in the field opens the real picker. */}
                  <div
                    className="pkg-schedule__date"
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      try { (input as any)?.showPicker?.(); } catch { /* not user-activated / unsupported — the field is still typable */ }
                    }}
                  >
                    <input
                      type="date"
                      disabled={frozen}
                      min={new Date().toISOString().slice(0, 10)}
                      value={svc.schedule?.scheduledAt ? svc.schedule.scheduledAt.slice(0, 10) : ""}
                      onChange={(e) => {
                        const time = svc.schedule?.scheduledAt ? svc.schedule.scheduledAt.slice(11, 16) : "10:00";
                        updateRowService(i, { schedule: { ...svc.schedule, scheduledAt: `${e.target.value}T${time}` } });
                      }}
                      className="svc-field__input"
                    />
                    <CalendarEvent size={13} aria-hidden />
                  </div>
                  {/* Same picker the service rows use — 12-hour labels, snapped
                      to the calendar's configured slot interval. */}
                  <TimeSelect
                    disabled={frozen}
                    interval={interval}
                    placeholder="Time"
                    className="svc-field__input svc-field__select"
                    value={svc.schedule?.scheduledAt ? svc.schedule.scheduledAt.slice(11, 16) : ""}
                    onChange={(val) => {
                      const date = svc.schedule?.scheduledAt ? svc.schedule.scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                      updateRowService(i, { schedule: { ...svc.schedule, scheduledAt: `${date}T${val}` } });
                    }}
                  />
                </div>
              ) : (
                <span className="pkg-schedule__hint">
                  {unschedulable ? "Not linked to catalog" : "Not scheduled"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    )}
    </>
  );
}

function SearchableItemRow(props: SearchableItemRowProps) {
  const {
    row,
    frozen,
    error,
    staffError,
    timeError,
    kind,
    items,
    placeholder,
    helperText,
    emptyText,
    staffList,
    interval,
    onClearError,
    onUpdate,
    onRemove,
    taxAmount,
  } = props;
  const { currencySymbol } = useCurrency();
  const productRows = kind === "product" ? props.productRows : [];
  const onUpdateProductRow = kind === "product" ? props.onUpdateProductRow : undefined;
  const onAddProductRow = kind === "product" ? props.onAddProductRow : undefined;
  const requestNextProductFocus = kind === "product" ? props.requestNextProductFocus : undefined;
  const autoFocusSearch = kind === "product" ? props.autoFocusSearch : undefined;
  const onAutoFocusHandled = kind === "product" ? props.onAutoFocusHandled : undefined;
  const membershipWalletInfo = kind === "product" ? props.membershipWalletInfo : undefined;
  const membershipDiscountAmount = kind === "product" ? props.membershipDiscountAmount : undefined;
  // Looked up live from the catalog list rather than cached on the row — the
  // row is created once at selection time, but stock keeps changing (other
  // sales, restocks), so a value captured back then would go stale.
  // Only caps the qty when stock is a known positive number: an out-of-stock
  // item (0 or unknown) must stay sellable, same as its selectability in the
  // dropdown above — this only stops overselling PAST what's actually on hand.
  const availableStock = kind === "product"
    ? items.find((i) => String(i.id) === String(row.productId))?.stock
    : undefined;
  const selectedName = kind === "package" ? row.packageName : row.productName;
  const [search, setSearch] = useState(selectedName);
  const [showDrop, setShowDrop] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchableCatalogItem[]>([]);
  const [scanMessage, setScanMessage] = useState("");
  const [qtyInput, setQtyInput] = useState(String(getSafeQty(row.qty)));
  const [qtyError, setQtyError] = useState("");
  const [discountInput, setDiscountInput] = useState(getDiscountValue(row.discount));
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portalDropRef = useRef<HTMLDivElement>(null);
  // Only true while the user is actively typing. The search effect checks this before
  // opening the dropdown — this prevents the dropdown from auto-opening when the
  // items catalog loads async (which changes the `items` dep and re-runs the effect).
  const userTypedRef = useRef(false);
  const trimmedSearch = search.trim();
  const isNumericPriceSearch = kind === "product" && /^\d+(\.\d+)?$/.test(trimmedSearch);
  const meetsMinSearchLength = trimmedSearch.length >= MIN_SEARCH_LENGTH;
  const showSearchHelper = !frozen && !meetsMinSearchLength;

  // Same fix as ServiceRow.tsx: the dropdown is a document.body portal with
  // `position: fixed`, so a position computed once at render time leaves it
  // visually stuck while the input scrolls away underneath it. Recompute on
  // every scroll (capture phase — catches the modal's inner scroll container,
  // not just window) and resize while open.
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
    setSearch(selectedName);
  }, [selectedName]);

  useEffect(() => {
    if (!autoFocusSearch || !inputRef.current) return;

    inputRef.current.focus();
    inputRef.current.select();
    onAutoFocusHandled?.();
  }, [autoFocusSearch, onAutoFocusHandled]);

  useEffect(() => {
    setQtyInput(String(getSafeQty(row.qty)));
  }, [row.qty]);

  useEffect(() => {
    setDiscountInput(getDiscountValue(row.discount));
  }, [row.discount]);

  function updateRow(patch: {
    selectedId?: string;
    selectedName?: string;
    price?: number;
    qty?: number;
    discount?: number;
    total?: number;
    categoryId?: string;
  }) {
    if (kind === "package") {
      onUpdate({
        ...row,
        packageId: patch.selectedId ?? row.packageId,
        packageName: patch.selectedName ?? row.packageName,
        price: patch.price ?? row.price,
        qty: patch.qty ?? row.qty,
        discount: patch.discount ?? row.discount,
        total: patch.total ?? row.total,
      });
      return;
    }

    onUpdate({
      ...row,
      productId: patch.selectedId ?? row.productId,
      productName: patch.selectedName ?? row.productName,
      price: patch.price ?? row.price,
      qty: patch.qty ?? row.qty,
      discount: patch.discount ?? row.discount,
      total: patch.total ?? row.total,
      categoryId: "categoryId" in patch ? patch.categoryId : (row as any).categoryId,
    });
  }

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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let isCancelled = false;

    if (frozen || !meetsMinSearchLength) {
      setResults([]);
      setIsSearching(false);
      setShowDrop(false);
      return;
    }

    // Only open the dropdown when the user is actively typing.
    // This prevents automatic reopening when the items catalog reloads (a dep change
    // that re-runs this effect even though the user hasn't touched the input).
    if (!userTypedRef.current) {
      setShowDrop(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      if (kind === "product") {
        const normalizedSearch = trimmedSearch.toLowerCase();
        const localMatches = items.filter((item) =>
          productMatchesSearch(item, normalizedSearch, trimmedSearch, isNumericPriceSearch)
        );
        fetchProductSearchItems(trimmedSearch, isNumericPriceSearch)
          .then((apiItems) => {
            if (isCancelled) return;

            const mapped = apiItems.filter((item) =>
              productMatchesSearch(item, normalizedSearch, trimmedSearch, isNumericPriceSearch)
            );
            const merged = [...localMatches];

            mapped.forEach((item) => {
              if (!merged.some((existing) => String(existing.id) === String(item.id))) {
                merged.push(item);
              }
            });

            setResults(sortInStockFirst(merged));
          })
          .catch(() => {
            if (isCancelled) return;
            setResults(sortInStockFirst(localMatches));
          })
          .finally(() => {
            if (isCancelled) return;
            setIsSearching(false);
            setShowDrop(true);
          });
        return;
      }

      const normalizedSearch = trimmedSearch.toLowerCase();
      setResults(
        items.filter((item) => {
          if (!isNumericPriceSearch) {
            return String(item.name || "").toLowerCase().includes(normalizedSearch);
          }
          return matchesProductPriceSearch(item, trimmedSearch);
        })
      );
      setIsSearching(false);
      setShowDrop(true);
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [frozen, isNumericPriceSearch, items, meetsMinSearchLength, trimmedSearch]);

  function handleSearchChange(value: string) {
    // Only track the local search query here — NOT the row itself. The row's real
    // selectedId/selectedName only get committed via handleSelect() below, when the
    // user actually picks a result from the dropdown. Otherwise free-typed text that
    // was never selected would still show up in the row (and reach the save payload).
    userTypedRef.current = true;
    setScanMessage("");
    setSearch(value);
  }

  // Reset the keyboard-highlighted result whenever the result set changes.
  useEffect(() => { setActiveIndex(-1); }, [results]);

  // Keep the highlighted row visible — without this, arrowing past the
  // bottom of the scroll container moves the highlight out of sight.
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (activeIndex >= 0) itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showDrop && results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        // Clamped, not wrapped — jumping back to the first row after the last
        // reads as the list being stuck in a loop rather than reaching the end.
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        // Close the suggestion list first — stopPropagation here (this handler
        // runs on the capture phase) keeps a lone Escape from also closing the
        // whole appointment drawer via its own focus-trap Escape handler.
        e.stopPropagation();
        setShowDrop(false);
        return;
      }
    }
    if (e.key === "Enter" && kind === "product") {
      e.preventDefault();
      handleBarcodeSubmit();
    }
  }

  function handleSelect(item: SearchableCatalogItem) {
    // Out-of-stock products are selectable — being out of stock must never
    // block a sale. The dropdown still labels them "(Out of stock)" in red so
    // the shortfall is visible; it's a warning, not a gate.
    userTypedRef.current = false;
    const qty = getSafeQty(row.qty);
    const discount = parseInt(discountInput, 10) || 0;
    const price = Number(item.price ?? 0) || 0;

    setScanMessage("");
    setSearch(item.name);
    setResults([]);
    setShowDrop(false);
    // The row now has an item, so the "Please select a product/package"
    // message must go — it used to persist until the whole form revalidated.
    onClearError?.("item");
    updateRow({
      selectedId: String(item.id),
      selectedName: item.name,
      price,
      total: calcTotal(price, qty, discount),
      categoryId: item.categoryId,
    });
  }

  // Shared by every keystroke and blur, so the message appears the instant
  // a typed qty crosses the stock line rather than only once the field loses
  // focus.
  function stockErrorFor(qty: number): string {
    if (typeof availableStock === "number" && availableStock > 0 && qty > availableStock) {
      return `Only ${availableStock} in stock — you exceeded the stock limit.`;
    }
    return "";
  }

  function handleQtyChange(value: string) {
    const normalizedValue = value.slice(0, 2);
    setQtyInput(normalizedValue);

    if (!normalizedValue) { setQtyError(""); return; }

    const qty = parseInt(normalizedValue, 10);
    if (Number.isInteger(qty) && qty > 0) {
      setQtyError(stockErrorFor(qty));
      const discount = parseInt(discountInput, 10) || 0;
      updateRow({
        qty,
        total: calcTotal(row.price || 0, qty, discount),
      });
    }
  }

  function handleQtyBlur() {
    const qty = parseInt(qtyInput, 10);
    let clampedQty = Number.isInteger(qty) && qty > 0 ? Math.min(qty, 99) : 1;
    // Message computed off the pre-clamp value, then kept — it explains why
    // the field just snapped down instead of disappearing the instant it does.
    const message = stockErrorFor(clampedQty);
    if (message) clampedQty = availableStock as number;
    setQtyError(message);
    const discount = parseInt(discountInput, 10) || 0;

    setQtyInput(String(clampedQty));
    updateRow({
      qty: clampedQty,
      total: calcTotal(row.price || 0, clampedQty, discount),
    });
  }

  function handlePriceChange(value: string) {
    const price = Math.max(0, parseFloat(value) || 0);
    const qty = getSafeQty(row.qty);
    const discount = parseInt(discountInput, 10) || 0;

    updateRow({
      price,
      total: calcTotal(price, qty, discount),
    });
  }

  function resetBlankProductRow() {
    if (kind !== "product") return;

    setSearch("");
    updateRow({
      selectedId: "",
      selectedName: "",
      price: 0,
      qty: 1,
      total: 0,
      categoryId: undefined,
    });
  }

  function focusSearchField() {
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  async function handleBarcodeSubmit() {
    if (kind !== "product" || !trimmedSearch) return;

    let matchedItem = results.find((item) => matchesProductBarcode(item, trimmedSearch))
      ?? items.find((item) => matchesProductBarcode(item, trimmedSearch));

    if (!matchedItem) {
      try {
        const res = await api.get(`/api/v1/products?search=${encodeURIComponent(trimmedSearch)}&limit=20`);
        const raw = res.data?.data?.data ?? res.data?.data ?? [];
        const mapped = Array.isArray(raw) ? filterSellableProducts(raw).map(mapProductSearchItem) : [];
        matchedItem = mapped.find((item) => matchesProductBarcode(item, trimmedSearch));
        if (mapped.length > 0) {
          setResults(mapped);
        }
      } catch {
        matchedItem = undefined;
      }
    }

    if (!matchedItem) {
      if (/^[A-Za-z0-9\-_]+$/.test(trimmedSearch)) {
        setScanMessage("Product not found.");
      }
      return;
    }

    const matchedProductId = String(matchedItem.id);
    const existingIndex = productRows.findIndex((productRow) => String(productRow.productId || "") === matchedProductId);
    const matchedPrice = Number(matchedItem.price ?? 0) || 0;

    if (existingIndex >= 0) {
      const existingRow = productRows[existingIndex];
      const currentQty = getSafeQty(existingRow.qty);
      // Same "only cap when stock is a known positive number" rule as the
      // qty field's own blur-clamp — an out-of-stock item must stay scannable.
      if (typeof matchedItem.stock === "number" && matchedItem.stock > 0 && currentQty >= matchedItem.stock) {
        setScanMessage(`Only ${matchedItem.stock} in stock — you exceeded the stock limit.`);
        focusSearchField();
        return;
      }
      const nextQty = currentQty + 1;
      const existingDiscount = existingRow.discount || 0;
      const basePrice = Number(existingRow.price ?? matchedPrice) || matchedPrice;

      onUpdateProductRow?.(existingIndex, {
        ...existingRow,
        productId: matchedProductId,
        productName: existingRow.productName || matchedItem.name,
        price: basePrice,
        qty: nextQty,
        total: calcTotal(basePrice, nextQty, existingDiscount),
        categoryId: matchedItem.categoryId,
      });

      if (!row.productId || row.productId !== matchedProductId) {
        resetBlankProductRow();
      }

      setResults([]);
      setShowDrop(false);
      setIsSearching(false);
      setScanMessage("");
      focusSearchField();
      return;
    }

    const nextDiscount = row.discount || 0;
    userTypedRef.current = false;
    setScanMessage("");
    setSearch(matchedItem.name);
    updateRow({
      selectedId: matchedProductId,
      selectedName: matchedItem.name,
      price: matchedPrice,
      qty: 1,
      total: calcTotal(matchedPrice, 1, nextDiscount),
      categoryId: matchedItem.categoryId,
    });
    setResults([]);
    setShowDrop(false);
    setIsSearching(false);

    requestNextProductFocus?.(productRows.length);
    onAddProductRow?.();
  }

  function handleDiscountChange(value: string) {
    const normalizedValue = value.slice(0, 3);
    setDiscountInput(normalizedValue);

    const discount = Math.min(100, parseInt(normalizedValue, 10) || 0);
    const qty = getSafeQty(row.qty);
    updateRow({
      discount,
      total: calcTotal(row.price || 0, qty, discount),
    });
  }

  function handleDiscountBlur() {
    const discount = Math.min(100, Math.max(0, parseInt(discountInput, 10) || 0));
    const qty = getSafeQty(row.qty);

    setDiscountInput(discount > 0 ? String(discount) : "");
    updateRow({
      discount,
      total: calcTotal(row.price || 0, qty, discount),
    });
  }

  return (
    <>
    <div className={`item-row item-row--${kind}`}>
      <div className="svc-field" ref={dropRef}>
        <div className="svc-field__input-wrap">
          <input
            ref={inputRef}
            className={`svc-field__input${error ? " svc-field__input--error" : ""}`}
            placeholder={placeholder}
            value={search}
            disabled={frozen}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowDrop(meetsMinSearchLength && (isSearching || results.length > 0))}
            onBlur={() => {
              // Typed text that was never selected from the dropdown (or matched by
              // barcode) gets reverted back to the row's actual selected item.
              setSearch(selectedName);
            }}
            onKeyDownCapture={handleSearchKeyDown}
            role="combobox"
            aria-expanded={showDrop && results.length > 0}
            aria-haspopup="listbox"
            aria-controls={`${kind}-search-listbox`}
            aria-activedescendant={activeIndex >= 0 ? `${kind}-search-option-${results[activeIndex]?.id}` : undefined}
          />
          {showDrop && meetsMinSearchLength && dropPos && createPortal(
            <div
              ref={portalDropRef}
              className="svc-dropdown"
              role="listbox"
              id={`${kind}-search-listbox`}
              style={{ position: "fixed" as const, top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
            >
              {isSearching ? (
                <div className="svc-dropdown__searching">Searching...</div>
              ) : results.length > 0 ? (
                results.map((item, i) => {
                  const isOutOfStock = kind === "product" && item.stock !== undefined && item.stock <= 0;

                  return (
                    <button
                      type="button"
                      key={`${kind}-${item.id}`}
                      ref={(el) => { itemRefs.current[i] = el; }}
                      id={`${kind}-search-option-${item.id}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      className={`svc-dropdown__item${i === activeIndex ? " svc-dropdown__item--active" : ""}`}
                      onMouseDown={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(i)}
                      title={isOutOfStock ? "Out of stock — can still be sold" : undefined}
                    >
                      <span className="svc-dropdown__name" style={isOutOfStock ? { color: "#dc2626" } : undefined}>
                        {item.name}
                        {isOutOfStock ? " (Out of stock)" : ""}
                      </span>
                      <span className="svc-dropdown__price">{currencySymbol}{Number(item.price ?? 0) || 0}</span>
                    </button>
                  );
                })
              ) : (
                <div className="svc-dropdown__searching">{emptyText}</div>
              )}
            </div>,
            document.body
          )}
        </div>
        {scanMessage ? (
          <span className="svc-field__err">{scanMessage}</span>
        ) : showSearchHelper ? (
          <span className="svc-field__hint">{helperText}</span>
        ) : null}
        {error && <span className="svc-field__err">Please select a {kind}</span>}
        {membershipWalletInfo && membershipWalletInfo.walletUsed > 0 && (
          <span className="svc-field__pkg-badge" title={`You pay ${currencySymbol}${membershipWalletInfo.payable.toFixed(2)}`}>
            ✓ Membership Applied −{currencySymbol}{membershipWalletInfo.walletUsed.toFixed(2)}
          </span>
        )}
      </div>

      {/* Staff — wrapped to show error below */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className={`svc-staff-pill${staffError ? " svc-staff-pill--error" : ""}`}>
          <button
            type="button"
            disabled={frozen}
            className="svc-staff-pill__clear"
            onClick={() => !frozen && onUpdate({ ...row, staffId: "" } as any)}
          >
            ×
          </button>
          <Dropdown
            disabled={frozen}
            className="svc-staff-pill__select"
            placeholder="Select Staff"
            value={row.staffId || ""}
            options={staffList.map((s) => ({ id: s.id, name: fmtName(s.name) }))}
            onChange={(id) => { onUpdate({ ...row, staffId: id } as any); if (id) onClearError?.("staff"); }}
          />
        </div>
        {staffError && <span className="svc-field__err">Select staff</span>}
      </div>

      {/* Time — wrapped to show error below */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TimeSelect
          disabled={frozen}
          value={row.time || ""}
          onChange={(value) => { onUpdate({ ...row, time: value } as any); if (value) onClearError?.("time"); }}
          interval={interval}
          className={`svc-field__input svc-field__select${timeError ? " svc-field__input--error" : ""}`}
          placeholder="Time"
        />
        {timeError && <span className="svc-field__err">Select time</span>}
      </div>

      {kind === "product" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="svc-field__input-wrap">
            <span className="svc-field__prefix">{currencySymbol}</span>
            <input
              className="svc-field__input svc-field__input--with-prefix"
              type="text"
              inputMode="numeric"
              disabled={frozen}
              placeholder="0"
              value={row.price || ""}
              onChange={(e) => handlePriceChange(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
          {!!membershipDiscountAmount && membershipDiscountAmount > 0 && (
            <span className="svc-field__pkg-badge" title="Membership discount — GST is calculated on the price after this reduction">
              ✓ Membership −{currencySymbol}{membershipDiscountAmount.toFixed(2)}
            </span>
          )}
        </div>
      ) : (
        <input
          className="svc-field__input svc-field__input--readonly"
          readOnly
          value={row.price ? `${currencySymbol}${row.price}` : `${currencySymbol}0`}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <input
          className={`svc-field__input${qtyError ? " svc-field__input--error" : ""}`}
          type="text"
          inputMode="numeric"
          maxLength={2}
          disabled={frozen}
          placeholder="1"
          title={typeof availableStock === "number" && availableStock > 0 ? `${availableStock} in stock` : undefined}
          value={qtyInput}
          onChange={(e) => handleQtyChange(e.target.value.replace(/\D/g, ""))}
          onBlur={handleQtyBlur}
        />
      </div>

      <input
        className="svc-field__input"
        type="text"
        inputMode="numeric"
        maxLength={3}
        disabled={frozen}
        placeholder="0"
        value={discountInput}
        onChange={(e) => handleDiscountChange(e.target.value.replace(/\D/g, ""))}
        onBlur={handleDiscountBlur}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(() => {
          const walletCovered = membershipWalletInfo?.walletUsed ?? 0;
          const discountApplied = membershipDiscountAmount ?? 0;
          const displayedTotal = Math.max(0, row.total - walletCovered - discountApplied);
          const titleParts: string[] = [];
          if (walletCovered > 0) titleParts.push(`${currencySymbol}${walletCovered.toFixed(2)} covered by membership wallet`);
          if (discountApplied > 0) titleParts.push(`${currencySymbol}${discountApplied.toFixed(2)} membership discount`);
          const title = titleParts.length > 0
            ? `Full price ${currencySymbol}${row.total.toFixed(2)} — ${titleParts.join(" + ")}`
            : undefined;
          return (
            <input
              className="svc-field__input svc-field__input--readonly"
              readOnly
              value={`${currencySymbol}${displayedTotal.toFixed(2)}`}
              title={title}
            />
          );
        })()}
        {/* Same live per-row GST hint ServiceRow.tsx already shows — this
            row's own tax from the pricing preview (see packageTaxByRow/
            productTaxByRow in AppointmentModal.tsx). */}
        {taxAmount !== undefined && taxAmount > 0 && (
          <span className="svc-field__hint" style={{ color: "#6b7280" }}>
            +{currencySymbol}{taxAmount.toFixed(2)} GST
          </span>
        )}
      </div>

      {/* Placeholder for quick-actions column so columns align with service rows */}
      <span />

      {!frozen
        ? <button className="svc-del-btn" onClick={onRemove}><Trash size={13} /></button>
        : <span />}
    </div>
    {qtyError && <div className="item-row__qty-err">{qtyError}</div>}
    </>
  );
}

export const ServicesPanel: React.FC<Props> = ({
  serviceRows, onUpdateService, onRemoveService, onAddService,
  packageRows, onUpdatePackage, onRemovePackage, onAddPackage,
  productRows, onUpdateProduct, onRemoveProduct, onAddProduct,
  membershipRows, onUpdateMembership, onRemoveMembership, onAddMembership,
  onSellPackage, onTopupEwallet,
  availablePackages, availableProducts, availableMemberships, serviceCatalog,
  frozen, packageRemainingByRow, membershipWalletInfo, serviceTaxByRow,
  consumableActuals, onConsumableActualChange, clientName,
  packageTaxByRow, productTaxByRow, membershipTaxByRow,
  serviceMembershipDiscountByRow, productMembershipDiscountByRow,
  svcErrors, pkgErrors, prodErrors, memErrors, onClearSvcError,
  onClearPkgError, onClearProdError, onClearMemError,
}) => {
  const { staffList, interval } = useSchedulerContext();
  const [pendingProductFocusIndex, setPendingProductFocusIndex] = useState<number | null>(null);

  // Memoize the mapped catalog array so its reference is stable across re-renders.
  // Without this, the inline .map() creates a new array every render, causing the
  // search useEffect (which has `items` as a dep) to re-run after every state update
  // and reopen the dropdown immediately after a product is selected.
  const stableProductItems = useMemo(() =>
    availableProducts.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      stock: item.stock,
      barcode: item.barcode,
      barcodeSearchValues: [item.barcode],
      priceSearchValues: getProductPriceSearchValues(item),
      categoryId: item.categoryId,
    })),
    [availableProducts]
  );

  return (
  <div className="services-panel">
    {serviceRows.map((row, i) => (
      <ServiceRow
        key={`svc-${(row as any).tempId || i}`}
        row={{ ...row, tempId: (row as any).tempId || String(i) } as any}
        disabled={frozen}
        errorFields={svcErrors?.[i] ?? {}}
        onClearError={(_id, field) => onClearSvcError?.(i, field)}
        onChange={(_id: string, field: string, value: any) => {
          onUpdateService(i, field, value);
        }}
        onRemove={() => onRemoveService(i)}
        packageSessionsRemaining={packageRemainingByRow?.get((row as any).tempId || String(i)) ?? 0}
        membershipWalletInfo={membershipWalletInfo?.get((row as any).tempId || String(i))}
        taxAmount={serviceTaxByRow?.get((row as any).tempId || String(i))}
        membershipDiscountAmount={serviceMembershipDiscountByRow?.get((row as any).tempId || String(i))}
        consumableActuals={consumableActuals?.[(row as any).tempId || String(i)]}
        onConsumableActualChange={(productId, actualQty) => onConsumableActualChange?.((row as any).tempId || String(i), productId, actualQty)}
        clientName={clientName}
      />
    ))}

    {packageRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--package">
          <span>Package</span><span>Staff</span><span>Time</span><span>Price</span><span>Qty</span><span>Disc %</span><span>Total</span><span /><span />
        </div>
        {packageRows.map((row, i) => (
          <PackageRow
            key={`pkg-${row.packageId || `new-${i}`}`}
            row={row}
            index={i}
            frozen={frozen}
            interval={interval}
            staffList={staffList}
            availablePackages={availablePackages}
            serviceCatalog={serviceCatalog}
            pkgError={pkgErrors?.[i]}
            onClearError={(field) => onClearPkgError?.(i, field)}
            onUpdatePackage={onUpdatePackage}
            onRemovePackage={onRemovePackage}
            taxAmount={packageTaxByRow?.get((row as any).tempId || String(i))}
          />
        ))}
      </>
    )}

    {productRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--product">
          <span>Product</span><span>Staff</span><span>Time</span><span>Price</span><span>Qty</span><span>Disc %</span><span>Total</span><span /><span />
        </div>
        {productRows.map((row, i) => (
          <SearchableItemRow
            key={`prod-${row.productId || `new-${i}`}`}
            row={row}
            productRows={productRows}
            frozen={frozen}
            error={prodErrors?.[i]?.item}
            staffError={prodErrors?.[i]?.staff}
            timeError={prodErrors?.[i]?.time}
            kind="product"
            items={stableProductItems}
            placeholder="Search product..."
            helperText="Type at least 3 characters to search products, barcodes, or prices."
            emptyText="No products found."
            staffList={staffList}
            interval={interval}
            onClearError={(field) => onClearProdError?.(i, field)}
            onUpdate={(nextRow) => onUpdateProduct(i, nextRow)}
            onUpdateProductRow={onUpdateProduct}
            onAddProductRow={onAddProduct}
            requestNextProductFocus={setPendingProductFocusIndex}
            autoFocusSearch={pendingProductFocusIndex === i}
            onAutoFocusHandled={() => setPendingProductFocusIndex((prev) => prev === i ? null : prev)}
            onRemove={() => onRemoveProduct(i)}
            membershipWalletInfo={membershipWalletInfo?.get(`product:${(row as any).tempId || String(i)}`)}
            taxAmount={productTaxByRow?.get((row as any).tempId || String(i))}
            membershipDiscountAmount={productMembershipDiscountByRow?.get((row as any).tempId || String(i))}
          />
        ))}
      </>
    )}

    {membershipRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--membership">
          <span>Membership</span><span>Staff</span><span>Time</span><span>Price</span><span>Qty</span><span>Disc %</span><span>Total</span><span /><span />
        </div>
        {membershipRows.map((row, i) => (
          <MembershipRow
            key={`mem-${i}`}
            row={row}
            index={i}
            frozen={frozen}
            interval={interval}
            staffList={staffList}
            availableMemberships={availableMemberships}
            memError={memErrors?.[i]}
            onClearError={(field) => onClearMemError?.(i, field)}
            onUpdateMembership={onUpdateMembership}
            onRemoveMembership={onRemoveMembership}
            taxAmount={membershipTaxByRow?.get((row as any).tempId || String(i))}
          />
        ))}
      </>
    )}

    {!frozen && (
      <div className="add-row-actions">
        <button className="add-row-btn" onClick={onAddService}>+ Service</button>
        <button className="add-row-btn" onClick={onAddProduct}>+ Product</button>
        <button className="add-row-btn" onClick={onAddPackage}>+ Package</button>
        <button className="add-row-btn" onClick={onAddMembership}>+ Membership</button>
        {onSellPackage && (
          <button className="add-row-btn add-row-btn--sell" onClick={onSellPackage}>+ Sell Package</button>
        )}
        {onTopupEwallet && (
          <button className="add-row-btn add-row-btn--sell" onClick={onTopupEwallet}>+ Topup eWallet</button>
        )}
      </div>
    )}
  </div>
  );
};

export default ServicesPanel;
