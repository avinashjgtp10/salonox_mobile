import React, { useEffect, useRef, useState } from "react";
import { currencySymbol } from "../../../../utils/currency";
import ServiceRow from "./ServiceRow";
import { Trash } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import type { ServiceItem, PackageItem, ProductItem, MembershipItem } from "../../types";

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 350;

interface SearchableCatalogItem {
  id: string | number;
  name: string;
  price?: number | null;
  stock?: number;
  barcode?: string | null;
  barcodeSearchValues?: Array<string | null | undefined>;
  priceSearchValues?: Array<number | string | null | undefined>;
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

  svcErrors?: Array<{ service?: boolean; staff?: boolean; time?: boolean }>;
  pkgErrors?: boolean[];
  prodErrors?: boolean[];
  memErrors?: boolean[];
  onClearSvcError?: (index: number, field: string) => void;
}

type SearchableItemRowProps =
  | {
      row: PackageItem;
      frozen?: boolean;
      error?: boolean;
      kind: "package";
      items: SearchableCatalogItem[];
      placeholder: string;
      helperText: string;
      emptyText: string;
      onUpdate: (row: PackageItem) => void;
      onRemove: () => void;
    }
  | {
      row: ProductItem;
      productRows: ProductItem[];
      frozen?: boolean;
      error?: boolean;
      kind: "product";
      items: SearchableCatalogItem[];
      placeholder: string;
      helperText: string;
      emptyText: string;
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

function calcTotal(price: number, qty: number, discount: number) {
  return Math.max(0, price * qty - discount);
}

function formatPriceForSearch(value: number) {
  const fixed = value.toFixed(2);
  return fixed.endsWith(".00") ? String(Math.trunc(value)) : fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function matchesProductPriceSearch(item: SearchableCatalogItem, searchValue: string) {
  const candidates = item.priceSearchValues?.length ? item.priceSearchValues : [item.price];

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

function mapProductSearchItem(item: any): SearchableCatalogItem {
  return {
    id: item.id,
    name: item.name,
    price: parseFloat(String(item.retail_price ?? item.selling_price ?? item.sellingPrice ?? item.price)) || 0,
    stock: Number(item.amount ?? item.stock_quantity ?? item.current_stock ?? item.stock ?? 0),
    barcode: item.barcode ?? item.BarcodeID ?? item.bar_code ?? item.sku ?? null,
    barcodeSearchValues: [
      item.barcode,
      item.BarcodeID,
      item.bar_code,
      item.sku,
    ],
    priceSearchValues: [
      item.retail_price,
      item.selling_price,
      item.sellingPrice,
      item.price,
    ],
  };
}

function SearchableItemRow(props: SearchableItemRowProps) {
  const {
    row,
    frozen,
    error,
    kind,
    items,
    placeholder,
    helperText,
    emptyText,
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
      if (dropRef.current && !dropRef.current.contains(event.target as Node)) {
        setShowDrop(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (frozen || !meetsMinSearchLength) {
      setResults([]);
      setIsSearching(false);
      setShowDrop(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      if (kind === "product") {
        api.get(`/api/v1/products?search=${encodeURIComponent(trimmedSearch)}&limit=20`)
          .then((res) => {
            const raw = res.data?.data?.data ?? res.data?.data ?? [];
            const mapped = Array.isArray(raw) ? raw.map(mapProductSearchItem) : [];
            const numericPriceSearch = isNumericPriceSearch ? Number(trimmedSearch) : null;
            const normalizedSearch = trimmedSearch.toLowerCase();

            setResults(
              mapped.filter((item) => {
                const matchesName = String(item.name || "").toLowerCase().includes(normalizedSearch);
                const matchesBarcode = (item.barcodeSearchValues?.length ? item.barcodeSearchValues : [item.barcode])
                  .some((candidate) => normalizeBarcode(candidate).includes(normalizeBarcode(trimmedSearch)));

                if (matchesBarcode) return true;
                if (!isNumericPriceSearch) return matchesName;

                const matchesPrice =
                  numericPriceSearch !== null && matchesProductPriceSearch(item, trimmedSearch);
                return matchesName || matchesPrice;
              })
            );
          })
          .catch(() => {
            setResults([]);
          })
          .finally(() => {
            setIsSearching(false);
            setShowDrop(true);
          });
        return;
      }

      const normalizedSearch = trimmedSearch.toLowerCase();
      const numericPriceSearch = isNumericPriceSearch ? Number(trimmedSearch) : null;
      setResults(
        items.filter((item) => {
          const matchesName = String(item.name || "").toLowerCase().includes(normalizedSearch);
          if (!isNumericPriceSearch) return matchesName;

          const matchesPrice =
            numericPriceSearch !== null && matchesProductPriceSearch(item, trimmedSearch);
          return matchesName || matchesPrice;
        })
      );
      setIsSearching(false);
      setShowDrop(true);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [frozen, isNumericPriceSearch, items, meetsMinSearchLength, trimmedSearch]);

  function handleSearchChange(value: string) {
    const qty = getSafeQty(row.qty);
    const discount = parseInt(discountInput, 10) || 0;

    setScanMessage("");
    setSearch(value);
    updateRow({
      selectedId: "",
      selectedName: value,
      price: 0,
      total: calcTotal(0, qty, discount),
    });
  }

  function handleSelect(item: SearchableCatalogItem) {
    const qty = getSafeQty(row.qty);
    const discount = parseInt(discountInput, 10) || 0;
    const price = Number(item.price ?? 0) || 0;

    setScanMessage("");
    setSearch(item.name);
    updateRow({
      selectedId: String(item.id),
      selectedName: item.name,
      price,
      total: calcTotal(price, qty, discount),
    });
    setShowDrop(false);
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
    const normalizedValue = value.slice(0, 5);
    setDiscountInput(normalizedValue);

    const discount = parseInt(normalizedValue, 10) || 0;
    const qty = getSafeQty(row.qty);
    updateRow({
      discount,
      total: calcTotal(row.price || 0, qty, discount),
    });
  }

  function handleDiscountBlur() {
    const discount = Math.min(99999, Math.max(0, parseInt(discountInput, 10) || 0));
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
            onKeyDown={(e) => {
              if (e.key !== "Enter" || kind !== "product") return;

              e.preventDefault();
              handleBarcodeSubmit();
            }}
          />
          {showDrop && meetsMinSearchLength && (
            <div className="svc-dropdown">
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
            </div>
          )}
        </div>
        {scanMessage ? (
          <span className="svc-field__err">{scanMessage}</span>
        ) : showSearchHelper ? (
          <span className="svc-field__hint">{helperText}</span>
        ) : null}
        {error && <span className="svc-field__err">Please select a {kind}</span>}
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
        maxLength={5}
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
  frozen,
  svcErrors, pkgErrors, prodErrors, memErrors, onClearSvcError,
}) => {
  const [pendingProductFocusIndex, setPendingProductFocusIndex] = useState<number | null>(null);

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
        onMembershipAction={onAddMembership}
      />
    ))}

    {packageRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--package">
          <span>Package</span><span>Price</span><span>Qty</span><span>Disc ({currencySymbol})</span><span>Total</span><span />
        </div>
        {packageRows.map((row, i) => (
          <SearchableItemRow
            key={`pkg-${i}`}
            row={row}
            frozen={frozen}
            error={pkgErrors?.[i]}
            kind="package"
            items={availablePackages.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: item.price,
            }))}
            placeholder="Search package..."
            helperText="Type at least 3 characters to search packages."
            emptyText="No packages found."
            onUpdate={(nextRow) => onUpdatePackage(i, nextRow)}
            onRemove={() => onRemovePackage(i)}
          />
        ))}
      </>
    )}

    {productRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--product">
          <span>Product</span><span>Price</span><span>Qty</span><span>Disc ({currencySymbol})</span><span>Total</span><span />
        </div>
        {productRows.map((row, i) => (
          <SearchableItemRow
            key={`prod-${i}`}
            row={row}
            productRows={productRows}
            frozen={frozen}
            error={prodErrors?.[i]}
            kind="product"
            items={availableProducts.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              stock: item.stock,
              barcode: item.barcode,
              barcodeSearchValues: [item.barcode],
              priceSearchValues: [
                item.price,
                item.retail_price,
                item.selling_price,
                item.sellingPrice,
              ],
            }))}
            placeholder="Search product..."
            helperText="Type at least 3 characters to search products or barcodes."
            emptyText="No products found."
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
          <span>Membership</span><span>Price</span><span>Qty</span><span>Total</span><span />
        </div>
        {membershipRows.map((row, i) => (
          <div key={`mem-${i}`} className="item-row item-row--membership">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <select
                className={`svc-field__input${memErrors?.[i] ? " svc-field__input--error" : ""}`}
                disabled={frozen}
                value={(row as any).membershipId || ""}
                onChange={(e) => {
                  const m = availableMemberships.find((mb: any) => String(mb.id) === e.target.value);
                  if (m) onUpdateMembership(i, { ...row, membershipId: m.id, membershipName: m.name, price: m.price, qty: 1, total: m.price });
                }}
              >
                <option value="">Select membership...</option>
                {availableMemberships.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {memErrors?.[i] && <span className="svc-field__err">Please select a membership</span>}
            </div>
            <input className="svc-field__input svc-field__input--readonly" readOnly value={row.price ? `${currencySymbol}${row.price}` : "—"} />
            <input
              className="svc-field__input"
              type="number" min={1} disabled={frozen} value={row.qty}
              onChange={(e) => onUpdateMembership(i, { ...row, qty: Number(e.target.value), total: row.price * Number(e.target.value) })}
            />
            <input className="svc-field__input svc-field__input--readonly" readOnly value={`${currencySymbol}${row.total.toFixed(2)}`} />
            {!frozen
              ? <button className="svc-del-btn" onClick={() => onRemoveMembership(i)}><Trash size={13} /></button>
              : <span />}
          </div>
        ))}
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
