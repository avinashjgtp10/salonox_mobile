import { calcRowTotal } from "../utils/quickSale.utils";
import type { InitStaff, InitService, SvcRow } from "../types/quickSale.types";

const GRID = "2fr 1.5fr 1fr 1fr 0.6fr 1.1fr 1fr 30px";

interface Props {
  row: SvcRow;
  staffList: InitStaff[];
  servicesList: InitService[];
  onUpdate: (tid: string, p: Partial<SvcRow>) => void;
  onRemove: (tid: string) => void;
}

export default function ServiceItemRow({ row, staffList, servicesList, onUpdate, onRemove }: Props) {
  const filtered = servicesList.filter((s) =>
    s.name.toLowerCase().includes(row.search.toLowerCase())
  );

  return (
    <div className="qs-item-row" style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", alignItems: "center" }}>
      {/* Service search */}
      <div style={{ position: "relative" }}>
        <input
          className={`qs-inp${row.errors.includes("service") ? " qs-inp--error" : ""}`}
          placeholder="Search service…"
          value={row.search}
          onChange={(e) => onUpdate(row.tempId, { search: e.target.value, showDrop: true, errors: row.errors.filter((e) => e !== "service") })}
          onFocus={() => onUpdate(row.tempId, { showDrop: true })}
          onBlur={() => setTimeout(() => onUpdate(row.tempId, { showDrop: false }), 150)}
        />
        {row.errors.includes("service") && <div className="qs-field-error">Service is required</div>}
        {row.showDrop && filtered.length > 0 && (
          <div className="qs-inline-drop">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="qs-inline-drop__item"
                onMouseDown={() => {
                  const q = Number(row.qty) || 1;
                  onUpdate(row.tempId, {
                    id: s.id, service: s.name, search: s.name,
                    price: s.price, duration: s.duration,
                    qty: q as any,
                    total: calcRowTotal(s.price, q, row.discountVal, row.discountType),
                    showDrop: false,
                    errors: row.errors.filter((e) => e !== "service"),
                  });
                }}
              >
                <span>{s.name}</span>
                <span className="qs-inline-drop__item__price">₹{s.price}</span>
              </div>
            ))}
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

      {/* Time */}
      <input
        className="qs-inp"
        placeholder="10:00"
        value={row.time}
        onChange={(e) => onUpdate(row.tempId, { time: e.target.value })}
      />

      {/* Price */}
      <input
        className="qs-inp"
        type="number"
        min={0}
        placeholder="0"
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

export function ServiceColHeaders() {
  return (
    <div className="qs-col-headers" style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", alignItems: "center" }}>
      <span>Service</span>
      <span>Staff</span>
      <span>Time</span>
      <span>Price ₹</span>
      <span>Qty</span>
      <span>Disc %</span>
      <span style={{ textAlign: "right" }}>Total</span>
      <span style={{ width: 30 }} />
    </div>
  );
}
