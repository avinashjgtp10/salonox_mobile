import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, PencilSquare, PlusCircle, DashCircle } from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchConsumableByIdThunk, adjustConsumableStockThunk } from "../../../middleware/inventory/inventory.thunk";
import { clearConsumableDetail } from "../../../store/inventorySlice";
import type { AdjustStockReason } from "../../../types/inventory.types";
import "../styles/ConsumableDetailPanel.scss";

interface Props {
  productId: string;
  onClose: () => void;
  onAdjusted?: () => void;
  onEdit?: () => void;
}

const REASON_OPTIONS: { value: AdjustStockReason; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "damage", label: "Damage" },
  { value: "expired", label: "Expired" },
  { value: "manual_correction", label: "Manual Correction" },
];

const ConsumableDetailPanel: React.FC<Props> = ({ productId, onClose, onAdjusted, onEdit }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { consumableDetail: detail, consumableDetailLoading: loading } = useSelector((s: RootState) => s.inventory);

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustDirection, setAdjustDirection] = useState<"increase" | "decrease">("increase");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState<AdjustStockReason>("purchase");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  useEffect(() => {
    dispatch(fetchConsumableByIdThunk(productId));
    return () => { dispatch(clearConsumableDetail()); };
  }, [dispatch, productId]);

  async function submitAdjust() {
    const qty = parseFloat(adjustQty);
    if (!Number.isFinite(qty) || qty <= 0) { setAdjustError("Enter a valid quantity"); return; }
    setAdjustSaving(true);
    setAdjustError("");
    const result = await dispatch(adjustConsumableStockThunk({ id: productId, payload: { direction: adjustDirection, qty, reason: adjustReason } }));
    setAdjustSaving(false);
    if (adjustConsumableStockThunk.rejected.match(result)) {
      setAdjustError((result.payload as string) || "Failed to adjust stock");
      return;
    }
    setShowAdjust(false);
    setAdjustQty("");
    dispatch(fetchConsumableByIdThunk(productId));
    onAdjusted?.();
  }

  return (
    <div className="ci-panel-overlay" onClick={onClose}>
      <div className="ci-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ci-panel__header">
          <div>
            <h3>{detail?.name || "Loading…"}</h3>
            {detail && <span className="ci-panel__subtitle">Consumable · {detail.category_name || "Uncategorized"}</span>}
          </div>
          <div className="ci-panel__header-actions">
            {onEdit && <button className="ci-btn ci-btn--outline" onClick={onEdit}><PencilSquare size={13} /> Edit</button>}
            <button className="ci-panel__close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {loading || !detail ? (
          <div className="ci-panel__loading">Loading…</div>
        ) : (
          <div className="ci-panel__body">
            <section className="ci-panel__section">
              <h4>Product Information</h4>
              <div className="ci-panel__field-row">
                <span>Brand</span><span>{detail.brand_name || "—"}</span>
              </div>
              <div className="ci-panel__field-row">
                <span>Supplier</span><span>{detail.supplier_name || "—"}</span>
              </div>
            </section>

            <section className="ci-panel__section">
              <div className="ci-panel__section-header">
                <h4>Inventory</h4>
                <button className="ci-btn ci-btn--sm" onClick={() => setShowAdjust(true)}>Adjust Stock</button>
              </div>
              <div className="ci-panel__field-row"><span>Product Quantity</span><span>{detail.product_qty}</span></div>
              <div className="ci-panel__field-row"><span>Unit Size</span><span>{detail.unit_size ? `${detail.unit_size} ${detail.unit}` : "—"}</span></div>
              <div className="ci-panel__field-row"><span>Total Stock</span><span>{detail.total_stock.toLocaleString()} {detail.unit}</span></div>
              <div className="ci-panel__field-row"><span>Remaining</span><span>{detail.remaining_stock.toLocaleString()} {detail.unit}</span></div>
              <div className="ci-panel__field-row"><span>Low Stock Alert</span><span>{detail.qty_alert ?? "—"}</span></div>
            </section>

            <section className="ci-panel__section">
              <h4>Usage Summary</h4>
              <div className="ci-panel__field-row"><span>Used Today</span><span>{detail.usage_stats.used_today.toLocaleString()} {detail.unit}</span></div>
              <div className="ci-panel__field-row"><span>This Week</span><span>{detail.usage_stats.used_this_week.toLocaleString()} {detail.unit}</span></div>
              <div className="ci-panel__field-row"><span>This Month</span><span>{detail.usage_stats.used_this_month.toLocaleString()} {detail.unit}</span></div>
              <div className="ci-panel__field-row"><span>Average Per Service</span><span>{detail.usage_stats.average_per_service.toLocaleString()} {detail.unit}</span></div>
              <div className="ci-panel__field-row"><span>Estimated Services Remaining</span><span>{detail.usage_stats.estimated_services_remaining ?? "—"}</span></div>
            </section>

            <section className="ci-panel__section">
              <h4>Assigned Services</h4>
              {detail.assigned_services.length === 0 ? (
                <p className="ci-panel__empty">No services use this product yet.</p>
              ) : (
                <div className="ci-panel__chips">
                  {detail.assigned_services.map((s) => <span key={s.service_id} className="ci-panel__chip">{s.name}</span>)}
                </div>
              )}
            </section>

            <section className="ci-panel__section">
              <h4>Recent Consumption</h4>
              {detail.recent_consumption.length === 0 ? (
                <p className="ci-panel__empty">No usage recorded yet.</p>
              ) : (
                <table className="ci-panel__mini-table">
                  <thead><tr><th>Date</th><th>Service</th><th>Staff</th><th>Used</th></tr></thead>
                  <tbody>
                    {detail.recent_consumption.map((r, i) => (
                      <tr key={i}>
                        <td>{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                        <td>{r.service_name || "—"}</td>
                        <td>{r.staff_name?.trim() || "—"}</td>
                        <td>{r.direction === "return" ? "+" : "−"}{r.qty} {detail.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="ci-panel__section">
              <h4>Stock Timeline</h4>
              <div className="ci-panel__timeline">
                {detail.stock_timeline.map((p, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="ci-panel__timeline-arrow">↓</span>}
                    <div className="ci-panel__timeline-point">
                      <span className="ci-panel__timeline-label">{p.label}</span>
                      <span className="ci-panel__timeline-val">{p.remaining.toLocaleString()} {detail.unit}</span>
                    </div>
                  </React.Fragment>
                ))}
                {detail.status !== "healthy" && (
                  <>
                    <span className="ci-panel__timeline-arrow">↓</span>
                    <div className="ci-panel__timeline-point ci-panel__timeline-point--warn">Refill Required</div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {showAdjust && (
        <div className="ci-adjust-overlay" onClick={() => setShowAdjust(false)}>
          <div className="ci-adjust-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Stock Adjustment</h3>
            <div className="ci-adjust-modal__direction">
              <button
                type="button"
                className={adjustDirection === "increase" ? "active" : ""}
                onClick={() => setAdjustDirection("increase")}
              >
                <PlusCircle size={14} /> Increase Stock
              </button>
              <button
                type="button"
                className={adjustDirection === "decrease" ? "active" : ""}
                onClick={() => setAdjustDirection("decrease")}
              >
                <DashCircle size={14} /> Decrease Stock
              </button>
            </div>
            <label>
              Quantity {detail ? `(${detail.unit})` : ""}
              <input type="number" min={0} value={adjustQty} onChange={(e) => { setAdjustQty(e.target.value); setAdjustError(""); }} />
            </label>
            <label>
              Reason
              <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value as AdjustStockReason)}>
                {REASON_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            {adjustError && <p className="ci-adjust-modal__error">{adjustError}</p>}
            <div className="ci-adjust-modal__actions">
              <button className="ci-btn ci-btn--outline" onClick={() => setShowAdjust(false)}>Cancel</button>
              <button className="ci-btn ci-btn--primary" disabled={adjustSaving} onClick={submitAdjust}>
                {adjustSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumableDetailPanel;
