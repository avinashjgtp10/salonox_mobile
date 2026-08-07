import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PlusCircle, Trash3 } from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../../store/store";
import { fetchProductsThunk } from "../../../../middleware/catalog/products.thunk";
import { isConsumableType } from "../../types/product.types";
import type { ConsumablesData, ConsumableUsageEntry } from "../../types/catalog.types.ts";
import LearnMoreLink from "../../../../components/shared/LearnMoreLink";

interface Props {
  data: ConsumablesData;
  onChange: (data: ConsumablesData) => void;
}

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;

// Same column concept as the Consumable Usage panel in Quick Sale and the
// Appointment modal (ServiceRow.tsx) — Product/Total Stock/Qty/Unit, rows
// locked once added (change the qty, or remove and re-add to swap the
// product). Picking a product is a SINGLE click here, unlike that panel's
// pick-then-separately-confirm flow — there's no per-click backend write to
// gate on (the whole recipe saves together with the rest of the service
// form), and a two-step pick made "select from the dropdown" look like it
// did nothing since nothing was added to the list yet.
const ConsumablesTab: React.FC<Props> = ({ data, onChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const allProducts = useSelector((state: RootState) => state.products.items);

  const items = data.items ?? [];
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [addError, setAddError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const consumableProducts = (allProducts ?? []).filter((p: any) => isConsumableType(p.product_type));

  // Seed a default list the first time the search UI opens, so clicking
  // straight into the (still-empty) input already has something to show —
  // without this, the dropdown had nothing to render until 2+ characters
  // were typed and the debounced search below had a chance to run. Skipped
  // once something's already cached (e.g. from a prior search this session).
  useEffect(() => {
    if (searchOpen && consumableProducts.length === 0) {
      dispatch(fetchProductsThunk({ pageSize: 50 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  // Current on-hand stock per product, for the Total Stock column — best-
  // effort from whatever's already in the shared products cache (same
  // graceful "—" fallback as the Quick Sale/Appointment panel when a
  // product isn't loaded yet).
  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    (allProducts ?? []).forEach((p: any) => map.set(String(p.id), Number(p.amount) || 0));
    return map;
  }, [allProducts]);

  // Empty query shows the default list (whatever's cached); a query, even a
  // single character, narrows it further — client-side, from whatever's
  // already loaded, while the debounced network search below fills in
  // anything not yet cached.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q.length === 0
      ? consumableProducts
      : consumableProducts.filter((p: any) => p.name?.toLowerCase().includes(q));
    return filtered.slice(0, 20);
  }, [query, consumableProducts]);

  // Reset the keyboard-highlighted result whenever the result set changes.
  useEffect(() => { setActiveIndex(-1); }, [searchResults]);

  // Keep the highlighted row visible — without this, arrowing past the
  // bottom of the scroll container moves the highlight out of sight.
  useEffect(() => {
    if (activeIndex >= 0) dropItemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDrop || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      // Clamped, not wrapped — jumping back to the first row after the last
      // reads as the list being stuck in a loop rather than reaching the end.
      setActiveIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < searchResults.length) {
      e.preventDefault();
      pickProduct(searchResults[activeIndex]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setShowDrop(false);
    }
  }

  const updateItems = (next: ConsumableUsageEntry[]) => onChange({ items: next });

  const removeRow = (id: string) => updateItems(items.filter((i) => i.id !== id));

  const updateRowQty = (id: string, qty: number) =>
    updateItems(items.map((i) => (i.id === id ? { ...i, qty } : i)));

  function startAdd() {
    setSearchOpen(true);
    setQuery("");
    setShowDrop(false);
    setAddError("");
  }

  function closeAdd() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchOpen(false);
    setQuery("");
    setShowDrop(false);
    setAddError("");
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setShowDrop(true);
    if (addError) setAddError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < MIN_SEARCH_LENGTH) return;
    debounceRef.current = setTimeout(() => {
      dispatch(fetchProductsThunk({ search: value.trim(), pageSize: 20 }));
    }, DEBOUNCE_MS);
  }

  // A single click both picks AND adds — qty defaults to 1 and is adjustable
  // right on the newly-visible row, same as every other row.
  function pickProduct(product: any) {
    if (items.some((i) => i.productId === product.id)) {
      setAddError("This consumable is already added.");
      return;
    }
    // API responses use `measure_unit` (see products.repository.ts's
    // PRODUCT_COLUMNS) — `unit` is only populated on shapes something has
    // explicitly remapped, so read both.
    const unit = product.unit || product.measure_unit || "";
    updateItems([...items, { id: crypto.randomUUID(), productId: product.id, productName: product.name, qty: 1, unit }]);
    // Stay open, ready for the next one — clears the just-picked query so
    // the same result doesn't linger in the dropdown.
    setQuery("");
    setShowDrop(false);
    setAddError("");
  }

  if (items.length === 0 && !searchOpen) {
    return (
      <div className="tab-content-panel" ref={containerRef}>
        <h5 className="tab-content-panel__title">Consumables used</h5>
        <div className="sao-empty">
          <div className="sao-empty__icon">
            <i className="bi bi-droplet" />
          </div>
          <h6>Consumables used</h6>
          <p>
            Track back-bar products this service consumes, so stock can be deducted
            automatically when the appointment is completed.{" "}
            <LearnMoreLink topic="service-consumables" className="sao-link">
              Learn more
            </LearnMoreLink>
          </p>
          <button className="sao-btn-outline" onClick={startAdd}>
            Add consumable
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content-panel" ref={containerRef}>
      <div className="sao-header">
        <h5 className="tab-content-panel__title mb-0">Consumables used</h5>
        {!searchOpen && (
          <button className="sao-btn-outline" onClick={startAdd}>
            <PlusCircle size={13} /> Add consumable
          </button>
        )}
      </div>

      {items.length > 0 && (
        <>
          <div className="sao-recipe-header">
            <span>Product</span>
            <span>Total Stock</span>
            <span>Qty</span>
            <span>Unit</span>
            <span />
          </div>
          <div className="sao-recipe-list">
            {items.map((row) => {
              const stock = stockByProductId.get(row.productId);
              return (
                <div key={row.id} className="sao-recipe-row">
                  <span className="sao-recipe-row__name" title={row.productName || "—"}>
                    {row.productName || "—"}
                  </span>
                  <span className="sao-recipe-row__stock">
                    {stock !== undefined ? `${stock.toLocaleString()} ${row.unit || ""}` : "—"}
                  </span>
                  <input
                    className="sao-input sao-input--sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.qty || ""}
                    onChange={(e) => updateRowQty(row.id, parseFloat(e.target.value) || 0)}
                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  />
                  <span className="sao-recipe-row__unit">{row.unit || "—"}</span>
                  <button
                    className="sao-icon-btn sao-icon-btn--danger"
                    onClick={() => removeRow(row.id)}
                    title="Remove consumable"
                  >
                    <Trash3 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {searchOpen && (
        <div className="sao-recipe-search-row">
          <div className="sao-recipe-add-row__search-wrap">
            <input
              className="sao-input sao-input--flex"
              placeholder="Search consumable product…"
              value={query}
              autoFocus
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowDrop(true)}
              onKeyDown={handleSearchKeyDown}
              role="combobox"
              aria-expanded={showDrop}
              aria-activedescendant={activeIndex >= 0 ? `consumable-search-option-${activeIndex}` : undefined}
            />
            {showDrop && (
              <div className="sao-recipe-drop" role="listbox">
                {searchResults.length > 0 ? (
                  searchResults.map((p: any, i: number) => (
                    <button
                      type="button"
                      key={p.id}
                      id={`consumable-search-option-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      ref={(el) => { dropItemRefs.current[i] = el; }}
                      className={`sao-recipe-drop__item${i === activeIndex ? " sao-recipe-drop__item--active" : ""}`}
                      onMouseDown={() => pickProduct(p)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      {p.name} <span className="sao-recipe-drop__unit">({p.unit || p.measure_unit || "no unit"})</span>
                    </button>
                  ))
                ) : (
                  <div className="sao-recipe-drop__empty">No consumable products found</div>
                )}
              </div>
            )}
          </div>
          <button type="button" className="sao-icon-btn sao-icon-btn--danger" onClick={closeAdd} title="Cancel">
            <Trash3 size={12} />
          </button>
        </div>
      )}

      {addError && <p className="sao-recipe-error">{addError}</p>}
    </div>
  );
};

export default ConsumablesTab;
