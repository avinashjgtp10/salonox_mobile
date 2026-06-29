import { useState, useEffect, useRef } from "react";
import api from "../../../services/api/axios";
import { calcRowTotal } from "../utils/quickSale.utils";
import type { InitStaff, LazyProduct, ProdRow } from "../types/quickSale.types";

const GRID = "2fr 1.5fr 1fr 0.6fr 1.1fr 1fr 30px";

function normalizeBarcode(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesProductBarcodePartial(item: LazyProduct, searchValue: string) {
  const normalizedSearch = normalizeBarcode(searchValue);
  if (!normalizedSearch) return false;

  const candidates = item.barcodeSearchValues?.length
    ? item.barcodeSearchValues
    : [item.barcode];

  return candidates.some((candidate) => normalizeBarcode(candidate).includes(normalizedSearch));
}

function formatPriceForSearch(value: number) {
  const fixed = value.toFixed(2);
  return fixed.endsWith(".00") ? String(Math.trunc(value)) : fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function matchesProductPriceSearch(item: LazyProduct, searchValue: string) {
  if (item.price === null) return false;
  const numericValue = Number(item.price);
  if (!Number.isFinite(numericValue)) return false;

  return numericValue === Number(searchValue) || formatPriceForSearch(numericValue).includes(searchValue);
}

function productMatchesSearch(
  item: LazyProduct,
  normalizedSearch: string,
  rawSearch: string,
  isNumericSearch: boolean,
) {
  const matchesBarcode = matchesProductBarcodePartial(item, rawSearch);
  if (matchesBarcode) return true;

  if (isNumericSearch) {
    return matchesProductPriceSearch(item, rawSearch);
  }

  return String(item.name || "").toLowerCase().includes(normalizedSearch);
}

interface Props {
  row: ProdRow;
  staffList: InitStaff[];
  productsList: LazyProduct[];
  onUpdate: (tid: string, p: Partial<ProdRow>) => void;
  onRemove: (tid: string) => void;
}

export default function ProductItemRow({ row, staffList, onUpdate, onRemove }: Props) {
  const [localSearch, setLocalSearch] = useState(row.search);
  const [results, setResults]         = useState<LazyProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef          = useRef<AbortController | null>(null);
  const initialResultsRef = useRef<LazyProduct[]>([]);

  // sync when a product is selected externally (row.search changes)
  useEffect(() => {
    setLocalSearch(row.search);
  }, [row.search]);

  // load initial list on mount when row is new (empty search)
  useEffect(() => {
    if (!row.search) loadInitialProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function mapProducts(raw: any[]): LazyProduct[] {
    return raw.map((p) => ({
      id:    String(p.id),
      name:  p.name,
      price: p.retail_price !== null && p.retail_price !== undefined
               ? parseFloat(p.retail_price)
               : null,
      stock: Number(p.amount ?? 0),
      barcode: p.barcode ?? p.BarcodeID ?? p.bar_code ?? p.sku ?? null,
      barcodeSearchValues: [
        p.barcode,
        p.BarcodeID,
        p.bar_code,
        p.sku,
      ],
    }));
  }

  async function loadInitialProducts() {
    if (initialResultsRef.current.length > 0) {
      setResults(initialResultsRef.current);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get("/api/v1/products?limit=20");
      const raw: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      const mapped = Array.isArray(raw) ? mapProducts(raw) : [];
      initialResultsRef.current = mapped;
      setResults(mapped);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchChange(val: string) {
    setLocalSearch(val);
    onUpdate(row.tempId, { showDrop: true, errors: row.errors.filter((e) => e !== "product") });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      abortRef.current?.abort();
      setIsSearching(false);
      setResults(initialResultsRef.current);
      return;
    }

    const trimmed = val.trim();
    const isNumericSearch = /^\d+(\.\d+)?$/.test(trimmed);

    if (isNumericSearch && trimmed.length < 3) {
      abortRef.current?.abort();
      setIsSearching(false);
      setResults([]);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const collected: LazyProduct[] = [];

        // 1. Always run backend search (handles barcode search & text name search)
        const res = await api.get(
          `/api/v1/products?search=${encodeURIComponent(trimmed)}&limit=100`,
          { signal: abortRef.current.signal }
        );
        const raw: any[] = res.data?.data?.data ?? res.data?.data ?? [];
        const backendMapped = Array.isArray(raw) ? mapProducts(raw) : [];
        backendMapped.forEach((item) => {
          if (!collected.some((existing) => existing.id === item.id)) {
            collected.push(item);
          }
        });

        // 2. If numeric, also fetch all products to match selling price client-side
        if (isNumericSearch) {
          const allRes = await api.get(`/api/v1/products?limit=500`, { signal: abortRef.current.signal });
          const allRaw: any[] = allRes.data?.data?.data ?? allRes.data?.data ?? [];
          const allMapped = Array.isArray(allRaw) ? mapProducts(allRaw) : [];
          allMapped.forEach((item) => {
            if (!collected.some((existing) => existing.id === item.id)) {
              collected.push(item);
            }
          });
        }

        // 3. Filter using productMatchesSearch (incorporates barcode, price, and name matching rules)
        const normalizedSearch = trimmed.toLowerCase();
        const filtered = collected.filter((item) =>
          productMatchesSearch(item, normalizedSearch, trimmed, isNumericSearch)
        );

        setResults(filtered);
      } catch (err: any) {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  return (
    <div className="qs-item-row" style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", alignItems: "center" }}>
      {/* Product search */}
      <div style={{ position: "relative" }}>
        <input
          className={`qs-inp${row.errors.includes("product") ? " qs-inp--error" : ""}`}
          placeholder="Search product…"
          value={localSearch}
          style={row.stock !== null && row.stock <= 0 ? { color: "#dc2626", fontWeight: 600 } : undefined}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => { onUpdate(row.tempId, { showDrop: true }); if (!localSearch.trim()) loadInitialProducts(); }}
          onBlur={() => setTimeout(() => onUpdate(row.tempId, { showDrop: false }), 150)}
        />
        {row.errors.includes("product") && <div className="qs-field-error">Product is required</div>}
        {row.stock !== null && row.stock <= 0 && (
          <div className="qs-oos-badge">Out of stock</div>
        )}
        {row.showDrop && isSearching && (
          <div className="qs-inline-drop">
            <div style={{ padding: "8px 12px", color: "#9ca3af", fontSize: 13 }}>Searching…</div>
          </div>
        )}
        {row.showDrop && !isSearching && results.length > 0 && (
          <div className="qs-inline-drop">
            {results.map((p, i) => (
              <div
                key={p.id ?? i}
                className="qs-inline-drop__item"
                onMouseDown={() => {
                  const q = Number(row.qty) || 1;
                  const pr = p.price === null ? 0 : p.price;
                  onUpdate(row.tempId, {
                    id: p.id ?? "", productName: p.name, search: p.name,
                    price: pr, qty: q as any,
                    total: calcRowTotal(pr, q, row.discountVal, row.discountType),
                    stock: p.stock, showDrop: false,
                    errors: row.errors.filter((e) => e !== "product"),
                  });
                }}
              >
                <span style={p.stock <= 0 ? { color: "#dc2626" } : undefined}>
                  {p.name} {p.stock <= 0 && <span style={{ fontSize: 11 }}>(OOS)</span>}
                </span>
                <span className="qs-inline-drop__item__price">
                  {p.price === null
                    ? <span style={{ fontSize: 11, fontStyle: "italic", color: "#9ca3af" }}>No price</span>
                    : `₹${p.price}`}
                </span>
              </div>
            ))}
          </div>
        )}
        {row.showDrop && !isSearching && localSearch.trim() && results.length === 0 && (
          <div className="qs-inline-drop">
            <div style={{ padding: "8px 12px", color: "#9ca3af", fontSize: 13 }}>No products found</div>
          </div>
        )}
      </div>

      {/* Staff */}
      <div>
        <div className={`qs-staff-pill${row.errors.includes("staff") ? " qs-staff-pill--error" : (!row.staffId ? " qs-staff-pill--empty" : "")}`}>
          <select
            value={row.staffId}
            onChange={(e) => onUpdate(row.tempId, { staffId: e.target.value, errors: row.errors.filter((err) => err !== "staff") })}
          >
            <option value="">Select Staff</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {row.errors.includes("staff") && <div className="qs-field-error">Staff is required</div>}
      </div>

      {/* Price */}
      <input
        className="qs-inp"
        type="number"
        min={0}
        value={row.price || ""}
        onChange={(e) => {
          const p = parseFloat(e.target.value) || 0;
          onUpdate(row.tempId, { price: p, total: calcRowTotal(p, Number(row.qty) || 0, row.discountVal, row.discountType) });
        }}
      />

      {/* Qty */}
      <div>
        <input
          className={`qs-inp${row.errors.includes("qty") ? " qs-inp--error" : ""}`}
          type="number"
          value={row.qty}
          onChange={(e) => {
            const q = e.target.value === "" ? "" : Number(e.target.value);
            onUpdate(row.tempId, { qty: q as any, total: calcRowTotal(row.price, Number(q) || 0, row.discountVal, row.discountType), errors: row.errors.filter((e) => e !== "qty") });
          }}
        />
        {row.errors.includes("qty") && <div className="qs-field-error">Min 1</div>}
      </div>

      {/* Discount */}
      <input
        className="qs-inp"
        type="number"
        min={0}
        placeholder="0"
        value={row.discountVal || ""}
        onChange={(e) => {
          const dv = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
          onUpdate(row.tempId, { discountVal: dv, total: calcRowTotal(row.price, Number(row.qty) || 0, dv, "percentage") });
        }}
      />

      <div className="qs-item-row__total">₹{row.total.toFixed(2)}</div>
      <button className="qs-item-row__remove" onClick={() => onRemove(row.tempId)}>✕</button>
    </div>
  );
}

export function ProductColHeaders() {
  return (
    <div className="qs-col-headers" style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", alignItems: "center" }}>
      <span>Product</span>
      <span>Staff</span>
      <span>Price ₹</span>
      <span>Qty</span>
      <span>Disc %</span>
      <span style={{ textAlign: "right" }}>Total</span>
      <span style={{ width: 30 }} />
    </div>
  );
}
