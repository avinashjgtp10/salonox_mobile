import { calcRowTotal } from "../utils/quickSale.utils";
import type { InitStaff, LazyProduct, ProdRow } from "../types/quickSale.types";

const GRID = "2fr 1.5fr 1fr 0.6fr 1.1fr 1fr 30px";

interface Props {
  row: ProdRow;
  staffList: InitStaff[];
  productsList: LazyProduct[];
  onUpdate: (tid: string, p: Partial<ProdRow>) => void;
  onRemove: (tid: string) => void;
}

export default function ProductItemRow({ row, staffList, productsList, onUpdate, onRemove }: Props) {
  const filtered = productsList.filter((p) =>
    (p.name ?? "").toLowerCase().includes(row.search.toLowerCase())
  );

  return (
    <div className="qs-item-row" style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", alignItems: "center" }}>
      {/* Product search */}
      <div style={{ position: "relative" }}>
        <input
          className="qs-inp"
          placeholder="Search product…"
          value={row.search}
          style={row.stock !== null && row.stock <= 0 ? { color: "#dc2626", fontWeight: 600 } : undefined}
          onChange={(e) => onUpdate(row.tempId, { search: e.target.value, showDrop: true })}
          onFocus={() => onUpdate(row.tempId, { showDrop: true })}
          onBlur={() => setTimeout(() => onUpdate(row.tempId, { showDrop: false }), 150)}
        />
        {row.stock !== null && row.stock <= 0 && (
          <div className="qs-oos-badge">Out of stock</div>
        )}
        {row.showDrop && filtered.length > 0 && (
          <div className="qs-inline-drop">
            {filtered.map((p, i) => (
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
      </div>

      {/* Staff */}
      <div className="qs-staff-pill">
        <select value={row.staffId} onChange={(e) => onUpdate(row.tempId, { staffId: e.target.value })}>
          <option value="">Any Staff</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
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
      <input
        className="qs-inp"
        type="number"
        value={row.qty}
        onChange={(e) => {
          const q = e.target.value === "" ? "" : Number(e.target.value);
          onUpdate(row.tempId, { qty: q as any, total: calcRowTotal(row.price, Number(q) || 0, row.discountVal, row.discountType) });
        }}
      />

      {/* Discount */}
      <input
        className="qs-inp"
        type="number"
        min={0}
        placeholder="0"
        value={row.discountVal || ""}
        onChange={(e) => {
          const dv = Math.max(0, parseFloat(e.target.value) || 0);
          onUpdate(row.tempId, { discountVal: dv, total: calcRowTotal(row.price, Number(row.qty) || 0, dv, "flat") });
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
      <span>Discount</span>
      <span style={{ textAlign: "right" }}>Total</span>
      <span style={{ width: 30 }} />
    </div>
  );
}
