import { calcRowTotal } from "../utils/quickSale.utils";
import type { InitStaff, LazyMembership, MemRow } from "../types/quickSale.types";

const GRID = "2fr 1.5fr 1fr 0.6fr 1.1fr 1fr 30px";

interface Props {
  row: MemRow;
  staffList: InitStaff[];
  membershipsList: LazyMembership[];
  onUpdate: (tid: string, p: Partial<MemRow>) => void;
  onRemove: (tid: string) => void;
}

export default function MembershipItemRow({ row, staffList, membershipsList, onUpdate, onRemove }: Props) {
  const filtered = membershipsList.filter((m) =>
    (m.name ?? "").toLowerCase().includes(row.search.toLowerCase())
  );

  return (
    <div className="qs-item-row" style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", alignItems: "center" }}>
      {/* Membership search */}
      <div style={{ position: "relative" }}>
        <input
          className={`qs-inp${row.errors.includes("membership") ? " qs-inp--error" : ""}`}
          placeholder="Search membership…"
          value={row.search}
          onChange={(e) => onUpdate(row.tempId, { search: e.target.value, showDrop: true, errors: row.errors.filter((e) => e !== "membership") })}
          onFocus={() => onUpdate(row.tempId, { showDrop: true })}
          onBlur={() => setTimeout(() => onUpdate(row.tempId, { showDrop: false }), 150)}
        />
        {row.errors.includes("membership") && <div className="qs-field-error">Membership is required</div>}
        {row.showDrop && filtered.length > 0 && (
          <div className="qs-inline-drop">
            {filtered.map((m, i) => (
              <div
                key={i}
                className="qs-inline-drop__item"
                onMouseDown={() => {
                  const q = Number(row.qty) || 1;
                  onUpdate(row.tempId, {
                    membershipId: m.id,
                    name: m.name, search: m.name, price: m.price,
                    qty: q as any,
                    total: calcRowTotal(m.price, q, row.discountVal, row.discountType),
                    showDrop: false,
                    sessions: m.sessions ?? 0,
                    validFor: m.validFor ?? "",
                    colour: m.colour ?? "",
                    errors: row.errors.filter((e) => e !== "membership"),
                  });
                }}
              >
                <span>{m.name}</span>
                <span className="qs-inline-drop__item__price">₹{m.price}</span>
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

export function MembershipColHeaders() {
  return (
    <div className="qs-col-headers" style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", alignItems: "center" }}>
      <span>Membership</span>
      <span>Staff</span>
      <span>Price ₹</span>
      <span>Qty</span>
      <span>Disc %</span>
      <span style={{ textAlign: "right" }}>Total</span>
      <span style={{ width: 30 }} />
    </div>
  );
}
