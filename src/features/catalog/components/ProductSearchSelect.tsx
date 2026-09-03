import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PRODUCTS } from "../../../services/api/endpoints";
import "../styles/ProductSearchSelect.scss";

export interface ProductSearchResult {
  id: string;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  supply_price?: number | null;
  retail_price?: number | null;
  amount?: number | null;
  bottle_size?: number | null;
}

// Whole packs from base units — same convention as
// product-inventory.repository.ts's STOCK_IN_PACKS / AddAuditProductModal's
// packQty. PRODUCTS.LIST returns raw amount/bottle_size, not a precomputed
// pack count, so this has to happen client-side.
const availableQty = (p: ProductSearchResult) => {
  const amount = p.amount ?? 0;
  const size = p.bottle_size ?? 0;
  return size > 0 ? amount / size : amount;
};

interface Props {
  onSelect: (product: ProductSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  showIcon?: boolean;
}

const DEBOUNCE_MS = 300;

// Debounced, server-searched product picker for the Purchase form's line
// items — deliberately not the shared SearchSelect (that assumes a small,
// fully-preloaded array; the product catalog can run to 5,000+ rows) and
// deliberately not INVENTORY.PRODUCT_INVENTORY (that endpoint's query grew
// four aggregate joins for the 12-column table — too heavy to hit on every
// keystroke of a typeahead). PRODUCTS.LIST has no aggregates and is the
// right weight for "find a product by name/barcode".
export default function ProductSearchSelect({ onSelect, placeholder = "Search product by name or barcode…", disabled, showIcon = true }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    abortRef.current?.abort();
    if (!term.trim()) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await api.get(PRODUCTS.LIST, {
        params: { search: term.trim(), pageSize: 20, page: 1 },
        signal: controller.signal,
      });
      const payload = res.data?.data;
      const list: ProductSearchResult[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload) ? payload : [];
      if (abortRef.current === controller) setResults(list);
    } catch {
      if (abortRef.current === controller) setResults([]);
    } finally {
      if (abortRef.current === controller) { setLoading(false); abortRef.current = null; }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="pss" ref={containerRef}>
      <div className="pss__input-wrap">
        {showIcon && <Search className="pss__icon" size={14} />}
        <input
          className={`pss__input${showIcon ? "" : " pss__input--no-icon"}`}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" className="pss__clear" onClick={() => { setQuery(""); setResults([]); }}>
            <X size={14} />
          </button>
        )}
      </div>
      {open && query.trim() && (
        <div className="pss__drop">
          {loading ? (
            <div className="pss__hint">Searching…</div>
          ) : results.length === 0 ? (
            <div className="pss__hint">No products found</div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pss__item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(p);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
              >
                <span className="pss__item-name">{p.name}</span>
                <span className="pss__item-sub">
                  {[p.barcode || p.sku, `${availableQty(p)} available`].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
