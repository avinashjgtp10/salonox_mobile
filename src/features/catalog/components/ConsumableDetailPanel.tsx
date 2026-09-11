import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, PencilSquare, PlusCircle, DashCircle } from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchConsumableByIdThunk, adjustConsumableStockThunk } from "../../../middleware/inventory/inventory.thunk";
import { clearConsumableDetail } from "../../../store/inventorySlice";
import type { AdjustStockReason } from "../../../types/inventory.types";
import Dropdown from "../../../components/ui/Dropdown";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import "../styles/ConsumableDetailPanel.scss";

interface Props {
  productId: string;
  onClose: () => void;
  onAdjusted?: () => void;
  onEdit?: () => void;
  /** Opens the Stock Adjustment modal immediately on mount — set by the
   *  table's "Adjust Stock" row action, which otherwise just dropped the user
   *  on the panel and made them find the same button a second time. */
  openAdjustOnMount?: boolean;
}

const REASON_OPTIONS: { value: AdjustStockReason; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "damage", label: "Damage" },
  { value: "expired", label: "Expired" },
  { value: "manual_correction", label: "Manual Correction" },
];

const ConsumableDetailPanel: React.FC<Props> = ({ productId, onClose, onAdjusted, onEdit, openAdjustOnMount = false }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { can } = usePermissions();
  const { consumableDetail: detail, consumableDetailLoading: loading } = useSelector((s: RootState) => s.inventory);

  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  const [showAdjust, setShowAdjust] = useState(openAdjustOnMount && can("adjust_consumable_stock"));
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
            {onEdit && (
              <button
                className="ci-btn ci-btn--outline"
                style={!can("edit_consumable") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={() => { if (!can("edit_consumable")) { denyPerm("edit_consumable"); return; } onEdit(); }}
              >
                <PencilSquare size={13} /> Edit
              </button>
            )}
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
              <div className="ci-panel__field-row">
                <span>Category</span><span>{detail.category_name || "—"}</span>
              </div>
              <div className="ci-panel__field-row">
                <span>Base Unit</span><span>{detail.unit}</span>
              </div>
            </section>

            <section className="ci-panel__section">
              <div className="ci-panel__section-header">
                <h4>Inventory Details</h4>
                <button
                  className="ci-btn ci-btn--sm"
                  style={!can("adjust_consumable_stock") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                  onClick={() => {
                    if (!can("adjust_consumable_stock")) { denyPerm("adjust_consumable_stock"); return; }
                    setShowAdjust(true);
                  }}
                >
                  Adjust Stock
                </button>
              </div>
              <div className="ci-panel__field-row"><span>Product Quantity</span><span>{detail.product_qty}</span></div>
              <div className="ci-panel__field-row"><span>Package Size</span><span>{detail.unit_size ? `${detail.unit_size} ${detail.unit}` : "—"}</span></div>
              <div className="ci-panel__field-row"><span>Total Stock</span><span>{detail.total_stock.toLocaleString()} {detail.unit}</span></div>
              <div className="ci-panel__field-row"><span>Available Stock</span><span>{detail.remaining_stock.toLocaleString()} {detail.unit}</span></div>
              {/* qty_alert is entered as a PACKAGE count ("Low Stock Alert (in
                  bottles/units)"), so rendering it with the base unit turned a
                  2-bottle threshold into a nonsensical "2 ml". */}
              <div className="ci-panel__field-row">
                <span>Low Stock Alert</span>
                <span>
                  {detail.qty_alert == null
                    ? "—"
                    : detail.unit_size
                      ? `${detail.qty_alert.toLocaleString()} × ${detail.unit_size.toLocaleString()} ${detail.unit}`
                      : `${detail.qty_alert.toLocaleString()} ${detail.unit}`}
                </span>
              </div>
            </section>

            <section className="ci-panel__section">
              <h4>Unit Conversion</h4>
              {detail.unit_conversions.length === 0 ? (
                <p className="ci-panel__empty">No custom units configured — edit this consumable to add some (e.g. Bottle, Sachet).</p>
              ) : (
                <table className="ci-panel__mini-table">
                  <thead><tr><th>Unit</th><th>Conversion</th></tr></thead>
                  <tbody>
                    {detail.unit_conversions.map((c) => (
                      <tr key={c.id}>
                        <td>{c.unit_name}</td>
                        <td>1 {c.unit_name} = {c.conversion_to_base.toLocaleString()} {detail.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
                <table className="ci-panel__mini-table">
                  <thead><tr><th>Service</th><th>Standard Usage</th></tr></thead>
                  <tbody>
                    {detail.assigned_services.map((s) => (
                      <tr key={s.service_id}>
                        <td>{s.name}</td>
                        <td>{s.qty} {s.unit || detail.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="ci-panel__section">
              <h4>Recent Consumption</h4>
              {detail.recent_consumption.length === 0 ? (
                <p className="ci-panel__empty">No consumption recorded yet.</p>
              ) : (
                <table className="ci-panel__mini-table">
                  <thead><tr><th>Date</th><th>Service</th><th>Staff</th><th>Used</th></tr></thead>
                  <tbody>
                    {detail.recent_consumption.map((r, i) => (
                      <tr key={i}>
                        <td>{formatDateDDMMYYYY(new Date(r.date))}</td>
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
              <Dropdown
                searchable={false}
                value={adjustReason}
                options={REASON_OPTIONS.map((r) => ({ id: r.value, name: r.label }))}
                onChange={(id) => setAdjustReason(id as AdjustStockReason)}
              />
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
