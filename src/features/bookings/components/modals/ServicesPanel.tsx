import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { currencySymbol } from "../../utils/currency";
import ServiceRow from "./ServiceRow";
import { Trash } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import type { ServiceItem, PackageItem, ProductItem, MembershipItem } from "../../types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";
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
}

function getProductDisplayPrice(item: any) {
  return parseFloat(String(
    item.retail_price ??
    item.selling_price ??
    item.sellingPrice ??
    item.retailPrice ??
    item.sellingPriceRaw ??
    item.price
  )) || 0;
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

  availablePackages: any[];
  availableProducts: any[];
  availableMemberships: any[];
  frozen?: boolean;
  coveredServices?: Map<string, number>;
  membershipWalletInfo?: Map<string, { walletUsed: number; payable: number }>;

  svcErrors?: Array<{ service?: boolean; staff?: boolean; time?: boolean }>;
  pkgErrors?: Array<{ item?: boolean; staff?: boolean; time?: boolean }>;
  prodErrors?: Array<{ item?: boolean; staff?: boolean; time?: boolean }>;
  memErrors?: Array<{ item?: boolean; staff?: boolean; time?: boolean }>;
  onClearSvcError?: (index: number, field: string) => void;
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
      onUpdate: (row: PackageItem) => void;
      onRemove: () => void;
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
      onUpdate: (row: ProductItem) => void;
      onUpdateProductRow: (index: number, row: ProductItem) => void;
      onAddProductRow: () => void;
      requestNextProductFocus: (index: number) => void;
      autoFocusSearch?: boolean;
      onAutoFocusHandled?: () => void;
      onRemove: () => void;
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
  if (isNumericPriceSearch) return matchesProductPriceSearch(item, rawSearch);

  // Text input -> search only Product Name.
  return String(item.name || "").toLowerCase().includes(normalizedSearch);
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
  };
}

function extractProductSearchResults(response: any): any[] {
  const payload = response?.data?.data ?? response?.data ?? {};

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
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

    extractProductSearchResults(response)
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

    extractProductSearchResults(response)
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

    extractProductSearchResults(response)
      .map(mapProductSearchItem)
      .forEach((item) => {
        if (!collected.some((existing) => String(existing.id) === String(item.id))) {
          collected.push(item);
        }
      });
  }

  return collected;
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
    onUpdate,
    onRemove,
  } = props;
  const productRows = kind === "product" ? props.productRows : [];
  const onUpdateProductRow = kind === "product" ? props.onUpdateProductRow : undefined;
  const onAddProductRow = kind === "product" ? props.onAddProductRow : undefined;
  const requestNextProductFocus = kind === "product" ? props.requestNextProductFocus : undefined;
  const autoFocusSearch = kind === "product" ? props.autoFocusSearch : undefined;
  const onAutoFocusHandled = kind === "product" ? props.onAutoFocusHandled : undefined;
  const selectedName = kind === "package" ? row.packageName : row.productName;
  const [search, setSearch] = useState(selectedName);
  const [showDrop, setShowDrop] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchableCatalogItem[]>([]);
  const [scanMessage, setScanMessage] = useState("");
  const [qtyInput, setQtyInput] = useState(String(getSafeQty(row.qty)));
  const [discountInput, setDiscountInput] = useState(getDiscountValue(row.discount));
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

            setResults(merged);
          })
          .catch(() => {
            if (isCancelled) return;
            setResults(localMatches);
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

  function handleSelect(item: SearchableCatalogItem) {
    if (kind === "product" && item.stock !== undefined && item.stock <= 0) {
      setScanMessage("This product is out of stock and cannot be added.");
      setResults([]);
      setShowDrop(false);
      return;
    }
    userTypedRef.current = false;
    const qty = getSafeQty(row.qty);
    const discount = parseInt(discountInput, 10) || 0;
    const price = Number(item.price ?? 0) || 0;

    setScanMessage("");
    setSearch(item.name);
    setResults([]);
    setShowDrop(false);
    updateRow({
      selectedId: String(item.id),
      selectedName: item.name,
      price,
      total: calcTotal(price, qty, discount),
    });
  }

  function handleQtyChange(value: string) {
    const normalizedValue = value.slice(0, 2);
    setQtyInput(normalizedValue);

    if (!normalizedValue) return;

    const qty = parseInt(normalizedValue, 10);
    if (Number.isInteger(qty) && qty > 0) {
      const discount = parseInt(discountInput, 10) || 0;
      updateRow({
        qty,
        total: calcTotal(row.price || 0, qty, discount),
      });
    }
  }

  function handleQtyBlur() {
    const qty = parseInt(qtyInput, 10);
    const clampedQty = Number.isInteger(qty) && qty > 0 ? Math.min(qty, 99) : 1;
    const discount = parseInt(discountInput, 10) || 0;

    setQtyInput(String(clampedQty));
    updateRow({
      qty: clampedQty,
      total: calcTotal(row.price || 0, clampedQty, discount),
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
        const mapped = Array.isArray(raw) ? raw.map(mapProductSearchItem) : [];
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
      const nextQty = getSafeQty(existingRow.qty) + 1;
      const existingDiscount = existingRow.discount || 0;
      const basePrice = Number(existingRow.price ?? matchedPrice) || matchedPrice;

      onUpdateProductRow?.(existingIndex, {
        ...existingRow,
        productId: matchedProductId,
        productName: existingRow.productName || matchedItem.name,
        price: basePrice,
        qty: nextQty,
        total: calcTotal(basePrice, nextQty, existingDiscount),
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
            onKeyDown={(e) => {
              if (e.key !== "Enter" || kind !== "product") return;

              e.preventDefault();
              handleBarcodeSubmit();
            }}
          />
          {showDrop && meetsMinSearchLength && inputRef.current && createPortal(
            <div
              ref={portalDropRef}
              className="svc-dropdown"
              style={(() => {
                const r = inputRef.current!.getBoundingClientRect();
                return { position: "fixed" as const, top: r.bottom + 2, left: r.left, width: r.width, zIndex: 9999 };
              })()}
            >
              {isSearching ? (
                <div className="svc-dropdown__searching">Searching...</div>
              ) : results.length > 0 ? (
                results.map((item) => {
                  const isOutOfStock = kind === "product" && item.stock !== undefined && item.stock <= 0;

                  return (
                    <button
                      type="button"
                      key={`${kind}-${item.id}`}
                      className="svc-dropdown__item"
                      onMouseDown={() => handleSelect(item)}
                      disabled={isOutOfStock}
                      style={isOutOfStock ? { cursor: "not-allowed", opacity: 0.6 } : undefined}
                      title={isOutOfStock ? "Out of stock" : undefined}
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
          <select
            disabled={frozen}
            value={row.staffId || ""}
            onChange={(e) => onUpdate({ ...row, staffId: e.target.value } as any)}
            className="svc-staff-pill__select"
            style={{ color: row.staffId ? "#111827" : "#6b7280" }}
          >
            <option value="" disabled style={{ color: "#000", background: "#fff" }}>
              Select Staff
            </option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id} style={{ color: "#000", background: "#fff" }}>
                {fmtName(s.name)}
              </option>
            ))}
          </select>
        </div>
        {staffError && <span className="svc-field__err">Select staff</span>}
      </div>

      {/* Time — wrapped to show error below */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TimeSelect
          disabled={frozen}
          value={row.time || ""}
          onChange={(value) => onUpdate({ ...row, time: value } as any)}
          interval={interval}
          className={`svc-field__input svc-field__select${timeError ? " svc-field__input--error" : ""}`}
          placeholder="Time"
        />
        {timeError && <span className="svc-field__err">Select time</span>}
      </div>

      <input
        className="svc-field__input svc-field__input--readonly"
        readOnly
        value={row.price ? `${currencySymbol}${row.price}` : `${currencySymbol}0`}
      />

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

      <input
        className="svc-field__input svc-field__input--readonly"
        readOnly
        value={`${currencySymbol}${row.total.toFixed(2)}`}
      />

      {/* Placeholder for quick-actions column so columns align with service rows */}
      <span />

      {!frozen
        ? <button className="svc-del-btn" onClick={onRemove}><Trash size={13} /></button>
        : <span />}
    </div>
  );
}

export const ServicesPanel: React.FC<Props> = ({
  serviceRows, onUpdateService, onRemoveService, onAddService,
  packageRows, onUpdatePackage, onRemovePackage, onAddPackage,
  productRows, onUpdateProduct, onRemoveProduct, onAddProduct,
  membershipRows, onUpdateMembership, onRemoveMembership, onAddMembership,
  availablePackages, availableProducts, availableMemberships,
  frozen, coveredServices, membershipWalletInfo,
  svcErrors, pkgErrors, prodErrors, memErrors, onClearSvcError,
}) => {
  const { staffList, interval } = useSchedulerContext();
  const [pendingProductFocusIndex, setPendingProductFocusIndex] = useState<number | null>(null);

  // Memoize mapped catalog arrays so their reference is stable across re-renders.
  // Without this, the inline .map() creates a new array every render, causing the
  // search useEffect (which has `items` as a dep) to re-run after every state update
  // and reopen the dropdown immediately after a product/package is selected.
  const stablePackageItems = useMemo(() =>
    availablePackages.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
    })),
    [availablePackages]
  );

  const stableProductItems = useMemo(() =>
    availableProducts.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      stock: item.stock,
      barcode: item.barcode,
      barcodeSearchValues: [item.barcode],
      priceSearchValues: getProductPriceSearchValues(item),
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
        coveredServices={coveredServices}
        membershipWalletInfo={membershipWalletInfo?.get((row as any).tempId || String(i))}
      />
    ))}

    {packageRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--package">
          <span>Package</span><span>Staff</span><span>Time</span><span>Price</span><span>Qty</span><span>Disc %</span><span>Total</span><span /><span />
        </div>
        {packageRows.map((row, i) => (
          <SearchableItemRow
            key={`pkg-${row.packageId || `new-${i}`}`}
            row={row}
            frozen={frozen}
            error={pkgErrors?.[i]?.item}
            staffError={pkgErrors?.[i]?.staff}
            timeError={pkgErrors?.[i]?.time}
            kind="package"
            items={stablePackageItems}
            placeholder="Search package..."
            helperText="Type at least 3 characters to search packages."
            emptyText="No packages found."
            staffList={staffList}
            interval={interval}
            onUpdate={(nextRow) => onUpdatePackage(i, nextRow)}
            onRemove={() => onRemovePackage(i)}
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
            onUpdate={(nextRow) => onUpdateProduct(i, nextRow)}
            onUpdateProductRow={onUpdateProduct}
            onAddProductRow={onAddProduct}
            requestNextProductFocus={setPendingProductFocusIndex}
            autoFocusSearch={pendingProductFocusIndex === i}
            onAutoFocusHandled={() => setPendingProductFocusIndex((prev) => prev === i ? null : prev)}
            onRemove={() => onRemoveProduct(i)}
          />
        ))}
      </>
    )}

    {membershipRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--membership">
          <span>Membership</span><span>Staff</span><span>Time</span><span>Price</span><span>Qty</span><span>Disc %</span><span>Total</span><span /><span />
        </div>
        {membershipRows.map((row, i) => {
          const memDisc = row.discount || 0;
          return (
            <div key={`mem-${i}`} className="item-row item-row--membership">
              {/* 1 — Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <select
                  className={`svc-field__input${memErrors?.[i]?.item ? " svc-field__input--error" : ""}`}
                  disabled={frozen}
                  value={(row as any).membershipId || ""}
                  onChange={(e) => {
                    const m = availableMemberships.find((mb: any) => String(mb.id) === e.target.value);
                    if (m) onUpdateMembership(i, { ...row, membershipId: m.id, membershipName: m.name, price: m.price, qty: 1, discount: 0, total: m.price });
                  }}
                >
                  <option value="">Select membership...</option>
                  {availableMemberships.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {memErrors?.[i]?.item && <span className="svc-field__err">Please select a membership</span>}
              </div>

              {/* 2 — Staff */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div className={`svc-staff-pill${memErrors?.[i]?.staff ? " svc-staff-pill--error" : ""}`}>
                  <button
                    type="button"
                    disabled={frozen}
                    className="svc-staff-pill__clear"
                    onClick={() => !frozen && onUpdateMembership(i, { ...row, staffId: "" })}
                  >
                    ×
                  </button>
                  <select
                    disabled={frozen}
                    value={row.staffId || ""}
                    onChange={(e) => onUpdateMembership(i, { ...row, staffId: e.target.value })}
                    className="svc-staff-pill__select"
                    style={{ color: row.staffId ? "#111827" : "#6b7280" }}
                  >
                    <option value="" disabled style={{ color: "#000", background: "#fff" }}>
                      Select Staff
                    </option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id} style={{ color: "#000", background: "#fff" }}>
                        {fmtName(s.name)}
                      </option>
                    ))}
                  </select>
                </div>
                {memErrors?.[i]?.staff && <span className="svc-field__err">Select staff</span>}
              </div>

              {/* 3 — Time */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TimeSelect
                  disabled={frozen}
                  value={row.time || ""}
                  onChange={(value) => onUpdateMembership(i, { ...row, time: value })}
                  interval={interval}
                  className={`svc-field__input svc-field__select${memErrors?.[i]?.time ? " svc-field__input--error" : ""}`}
                  placeholder="Time"
                />
                {memErrors?.[i]?.time && <span className="svc-field__err">Select time</span>}
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
                value={row.qty || 1}
                onChange={(e) => {
                  const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                  onUpdateMembership(i, { ...row, qty, total: calcTotal(row.price, qty, memDisc) });
                }}
              />

              {/* 6 — Discount (%) */}
              <input
                className="svc-field__input"
                type="text"
                inputMode="numeric"
                maxLength={3}
                disabled={frozen}
                placeholder="0"
                value={memDisc > 0 ? String(memDisc) : ""}
                onChange={(e) => {
                  const disc = Math.min(100, Math.max(0, parseInt(e.target.value.replace(/\D/g, ""), 10) || 0));
                  onUpdateMembership(i, { ...row, discount: disc, total: calcTotal(row.price, row.qty || 1, disc) });
                }}
              />

              {/* 7 — Total (readonly) */}
              <input className="svc-field__input svc-field__input--readonly" readOnly value={`${currencySymbol}${row.total.toFixed(2)}`} />

              {/* 8 — Placeholder (quick-actions column) */}
              <span />

              {/* 9 — Delete */}
              {!frozen
                ? <button className="svc-del-btn" onClick={() => onRemoveMembership(i)}><Trash size={13} /></button>
                : <span />}
            </div>
          );
        })}
      </>
    )}

    {!frozen && (
      <div className="add-row-actions">
        <button className="add-row-btn" onClick={onAddService}>+ Service</button>
        <button className="add-row-btn" onClick={onAddPackage}>+ Package</button>
        <button className="add-row-btn" onClick={onAddProduct}>+ Product</button>
        <button className="add-row-btn" onClick={onAddMembership}>+ Membership</button>
      </div>
    )}
  </div>
  );
};

export default ServicesPanel;
