import React, { useEffect, useRef, useState } from "react";
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

const newRow = (): ConsumableUsageEntry => ({
  id: crypto.randomUUID(),
  productId: "",
  productName: "",
  qty: 1,
  unit: "",
});

const ConsumablesTab: React.FC<Props> = ({ data, onChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const allProducts = useSelector((state: RootState) => state.products.items);

  const items = data.items ?? [];
  const [queries, setQueries] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const consumableProducts = (allProducts ?? []).filter((p: any) =>
    isConsumableType(p.product_type),
  );

  const updateItems = (next: ConsumableUsageEntry[]) => onChange({ items: next });

  const addRow = () => {
    const row = newRow();
    updateItems([...items, row]);
    setOpenDropdown(row.id);
  };

  const removeRow = (id: string) => updateItems(items.filter((i) => i.id !== id));

  const updateRow = (id: string, patch: Partial<ConsumableUsageEntry>) =>
    updateItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleSearch = (rowId: string, value: string) => {
    setQueries((prev) => ({ ...prev, [rowId]: value }));
    setOpenDropdown(rowId);
    if (debounceRef.current[rowId]) clearTimeout(debounceRef.current[rowId]);
    if (value.trim().length < MIN_SEARCH_LENGTH) return;
    debounceRef.current[rowId] = setTimeout(() => {
      dispatch(fetchProductsThunk({ search: value.trim(), pageSize: 20 }));
    }, DEBOUNCE_MS);
  };

  const selectProduct = (rowId: string, product: any) => {
    updateRow(rowId, {
      productId: product.id,
      productName: product.name,
      unit: product.unit || "",
    });
    setQueries((prev) => ({ ...prev, [rowId]: product.name }));
    setOpenDropdown(null);
  };

  const searchResultsFor = (rowId: string) => {
    const q = (queries[rowId] ?? "").trim().toLowerCase();
    if (q.length < MIN_SEARCH_LENGTH) return [];
    return consumableProducts.filter((p: any) => p.name?.toLowerCase().includes(q)).slice(0, 20);
  };

  if (items.length === 0) {
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
          <button className="sao-btn-outline" onClick={addRow}>
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
        <button className="sao-btn-outline" onClick={addRow}>
          <PlusCircle size={13} /> Add consumable
        </button>
      </div>

      <div className="sao-groups">
        {items.map((row, idx) => (
          <div key={row.id} className="sao-option-row" style={{ position: "relative", alignItems: "flex-start" }}>
            <span className="sao-option-num">{idx + 1}</span>

            <div style={{ position: "relative", flex: 1 }}>
              <input
                className="sao-input sao-input--flex"
                placeholder="Search consumable product…"
                value={queries[row.id] ?? row.productName}
                onFocus={() => setOpenDropdown(row.id)}
                onChange={(e) => handleSearch(row.id, e.target.value)}
              />
              {openDropdown === row.id && searchResultsFor(row.id).length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {searchResultsFor(row.id).map((p: any) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => selectProduct(row.id, p)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {p.name} <span style={{ color: "#9ca3af" }}>({p.unit || "no unit"})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              className="sao-input sao-input--sm"
              type="number"
              min="0"
              step="0.01"
              placeholder="Qty"
              value={row.qty || ""}
              onChange={(e) => updateRow(row.id, { qty: parseFloat(e.target.value) || 0 })}
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
            />

            <span
              style={{
                minWidth: 56,
                fontSize: 13,
                color: "#6b7280",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {row.unit || "—"}
            </span>

            <button
              className="sao-icon-btn sao-icon-btn--danger"
              onClick={() => removeRow(row.id)}
              title="Remove consumable"
            >
              <Trash3 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsumablesTab;
