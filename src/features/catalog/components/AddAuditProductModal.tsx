import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "react-bootstrap-icons";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { Dropdown } from "../../../components/ui/Dropdown";
import api from "../../../services/api/axios";
import { PRODUCTS } from "../../../services/api/endpoints/products.endpoints";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";

interface CatalogRow {
  id: string;
  name: string;
  barcode: string | null;
  product_type: string | null;
  amount: number | null;
  bottle_size: number | null;
  measure_unit: string | null;
}

interface Option { id: string; name: string }

interface Props {
  existingProductIds: string[];
  onClose: () => void;
  onAdd: (productIds: string[]) => void | Promise<void>;
}

const PAGE_SIZE = 50;

// Whole packs from base units — same convention as
// product-inventory.repository.ts's STOCK_IN_PACKS. This endpoint (unlike
// Product Inventory's) returns raw amount/bottle_size, not a precomputed
// pack count, since it covers every product type, not just retail stock.
const packQty = (p: CatalogRow) => {
  const amount = p.amount ?? 0;
  const size = p.bottle_size ?? 0;
  return size > 0 ? amount / size : amount;
};

export default function AddAuditProductModal({ existingProductIds, onClose, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reuses Product Inventory's filter-options endpoint — scoped to retail
  // products, so a consumable-only category/brand won't show up here, but
  // it covers the common case without needing a new catalog-wide endpoint.
  useEffect(() => {
    api.get(INVENTORY.PRODUCT_INVENTORY_FILTER_OPTIONS)
      .then((res) => {
        setCategories(res.data?.data?.categories ?? []);
        setBrands(res.data?.data?.brands ?? []);
      })
      .catch(() => { /* filters just stay empty — search-by-name still works */ });
  }, []);

  // A new search term/filter restarts pagination from page 1 — otherwise the
  // infinite-scroll effect below would append page 2+ of the OLD results
  // onto the new filter's page 1.
  useEffect(() => { setPage(1); }, [debouncedSearch, categoryId, brandId]);

  useEffect(() => {
    let cancelled = false;
    if (page === 1) setLoading(true); else setLoadingMore(true);
    // The full product catalog (all types — retail, consumable, both), not
    // the retail-only Product Inventory endpoint, so consumable-only
    // products like a colour tube are still reachable here.
    api.get(PRODUCTS.LIST, {
      params: {
        search: debouncedSearch || undefined,
        category_id: categoryId || undefined,
        brand_id: brandId || undefined,
        page, pageSize: PAGE_SIZE,
      },
    })
      .then((res) => {
        if (cancelled) return;
        const data: CatalogRow[] = res.data?.data?.data ?? [];
        setRows((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotal(res.data?.data?.totalRecords ?? 0);
      })
      .catch(() => { if (!cancelled && page === 1) setRows([]); })
      .finally(() => { if (!cancelled) { setLoading(false); setLoadingMore(false); } });
    return () => { cancelled = true; };
  }, [debouncedSearch, categoryId, brandId, page]);

  const available = useMemo(
    () => rows.filter((p) => !existingProductIds.includes(p.id)),
    [rows, existingProductIds],
  );

  const hasMore = rows.length < total;

  // Fetch the next page once the user scrolls near the bottom of the list.
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setPage((p) => p + 1);
    }
  }, [loading, loadingMore, hasMore]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await onAdd(Array.from(selected));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      onClose={onClose}
      title="Add Products to Audit"
      size="lg"
      footer={
        <div className="d-flex justify-content-end gap-2 w-100">
          <Button variant="outline-dark" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="dark" onClick={submit} disabled={selected.size === 0 || saving} loading={saving}>
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      }
    >
      <div className="paudit-field-row-2 mb-3">
        <div>
          <label className="paudit-label">Select Category</label>
          <Dropdown
            value={categoryId}
            options={categories}
            placeholder="Select category..."
            onChange={setCategoryId}
            allowNone
          />
        </div>
        <div>
          <label className="paudit-label">Select Brand</label>
          <Dropdown
            value={brandId}
            options={brands}
            placeholder="Select brand..."
            onChange={setBrandId}
            allowNone
          />
        </div>
      </div>
      <Input
        containerClass="mb-3"
        type="text"
        placeholder="Search by name or barcode"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        iconLeft={<Search size={16} />}
      />
      <div className="paudit-picker-list" ref={listRef} onScroll={handleScroll}>
        {loading ? (
          <p className="paudit-empty">Loading…</p>
        ) : available.length === 0 ? (
          <p className="paudit-empty">No matching products.</p>
        ) : (
          <>
            {available.map((p) => (
              <label key={p.id} className="paudit-picker-row">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <div className="paudit-prod-cell">
                  <span className="name">{p.name}</span>
                  <span className="sub">
                    {p.barcode || "—"} · {p.product_type || "—"} · System Qty: {packQty(p)}
                    {p.measure_unit ? ` ${p.measure_unit}` : ""}
                  </span>
                </div>
              </label>
            ))}
            {loadingMore && <p className="paudit-empty">Loading more…</p>}
          </>
        )}
      </div>
      {total > 0 && (
        <p className="paudit-hint mt-2 mb-0">
          Showing {rows.length} of {total} product{total === 1 ? "" : "s"}
          {hasMore ? " — scroll for more" : ""}
        </p>
      )}
    </Modal>
  );
}
