import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trash, PlusLg, BoxSeam, X as XIcon } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { fetchSuppliersThunk, createSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import { markSuppliersStale } from "../../../store/inventorySlice";
import type { AppDispatch, RootState } from "../../../store/store";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatDateDDMMYYYY as fmtDate } from "../../../utils/dateFormat";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Dropdown from "../../../components/ui/Dropdown";
import { DatePicker } from "../../../components/ui";
import QuickAdd from "./form/QuickAdd";
import ProductSearchSelect, { type ProductSearchResult } from "./ProductSearchSelect";
import "../styles/PurchaseModal.scss";

interface PurchaseLine {
  key: string;
  product: ProductSearchResult | null;
  quantity: string;
  purchasePrice: string;
  expiryDate: string;
  // Set only when this line was populated from an order's own line item
  // (see loadOrderIntoLines) — links back to it for the /receive payload,
  // and caps quantity at what's actually still outstanding on that order.
  orderItemId?: string;
  maxQty?: number;
}

function emptyLine(): PurchaseLine {
  return { key: Math.random().toString(36).slice(2), product: null, quantity: "", purchasePrice: "", expiryDate: "" };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  onClose: () => void;
  /** `updatedProducts` are the freshly recomputed Product Inventory rows for
   *  everything this purchase touched — the page patches its table state from
   *  this directly, no follow-up GET. */
  onSaved: (result: { purchaseNumber: string; updatedProducts: any[] }) => void;
  onError: (msg: string) => void;
  /** Set when opened from OrderDetailPage's "Verify Order" tab — skips the
   *  supplier-pick-then-find-the-PO-again dance and jumps straight into
   *  receiving against this exact order. */
  initialOrderId?: string;
}

// Product Inventory → Purchase → Select Supplier → Add Products → Save
// Purchase. Saving is exactly ONE POST (supplier + every line in one request
// body) — see PRODUCT_INVENTORY_PURCHASES; the backend does the whole
// multi-item transaction and returns the generated Supplier Number plus the
// updated rows in that same response.
export default function PurchaseModal({ onClose, onSaved, onError, initialOrderId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const suppliers = useSelector((s: RootState) => s.inventory.suppliers) as { id: string; name: string }[];
  const { currencySymbol, formatAmount } = useCurrency();

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [lines, setLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  // Set whenever a Qty input's raw typed/pasted value contains a decimal
  // point, so the validation message below can explain the strip rather
  // than leaving the user wondering why "1.5" silently became "15".
  const [decimalAttempted, setDecimalAttempted] = useState(false);

  // Set once a PO has been picked below — the Products table is then
  // populated FROM that order (see loadOrderIntoLines) and Save calls
  // ORDER_RECEIVE instead of the plain ad-hoc PRODUCT_INVENTORY_PURCHASES
  // endpoint, so this receipt stays linked to the order (received_qty/
  // status update) instead of creating a disconnected Purchase record.
  const [receivingOrder, setReceivingOrder] = useState<{ id: string; order_number: string } | null>(null);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);

  // page_limit:100 — this is the Supplier dropdown, not the paginated
  // Suppliers list page, so it needs the full set.
  useEffect(() => { dispatch(fetchSuppliersThunk({ page_limit: 100 })); }, [dispatch]);

  // Opened straight from OrderDetailPage's "Verify Order" tab — load this
  // order's items immediately instead of making the owner pick the supplier
  // and then find the same order again from a dropdown.
  useEffect(() => {
    if (initialOrderId) loadOrderIntoLines(initialOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId]);

  // Purchase Orders this supplier already has open (Ordered/Verify Order) —
  // a straight GET, not the fetchOrdersThunk used by OrdersListPage, so this
  // doesn't clobber that page's own filtered `orders` redux state.
  const [supplierOrders, setSupplierOrders] = useState<Order[]>([]);
  const [loadingSupplierOrders, setLoadingSupplierOrders] = useState(false);
  useEffect(() => {
    if (!supplierId) { setSupplierOrders([]); return; }
    let cancelled = false;
    setLoadingSupplierOrders(true);
    api.get(INVENTORY.ORDERS, { params: { supplier_id: supplierId, status: "sent,partially_received", limit: 20 } })
      .then((res) => { if (!cancelled) setSupplierOrders(res.data?.data?.data ?? []); })
      .catch(() => { if (!cancelled) setSupplierOrders([]); })
      .finally(() => { if (!cancelled) setLoadingSupplierOrders(false); });
    return () => { cancelled = true; };
  }, [supplierId]);

  // Pulls the order's own line items in (product, outstanding qty, cost
  // price) right into the Products table below, instead of navigating away
  // to the Verify Order tab — Save then posts straight to ORDER_RECEIVE.
  async function loadOrderIntoLines(orderId: string) {
    setLoadingOrderItems(true);
    try {
      const res = await api.get(INVENTORY.ORDER_BY_ID(orderId));
      const order = res.data?.data;
      const outstanding = (order?.items ?? []).filter(
        (it: any) => Number(it.qty) - Number(it.received_qty) > 0.001,
      );
      if (!outstanding.length) {
        onError("Every item on this order has already been received");
        return;
      }
      setLines(outstanding.map((it: any) => {
        const remaining = Number(it.qty) - Number(it.received_qty);
        return {
          key: it.id,
          product: { id: it.product_id, name: it.product_name },
          quantity: String(remaining),
          purchasePrice: String(it.cost_price),
          expiryDate: "",
          orderItemId: it.id,
          maxQty: remaining,
        };
      }));
      if (order?.supplier_id) setSupplierId(order.supplier_id);
      setReceivingOrder({ id: order.id, order_number: order.order_number });
    } catch (err: any) {
      onError(err?.response?.data?.message || "Couldn't load this order's items");
    } finally {
      setLoadingOrderItems(false);
    }
  }

  function clearReceivingOrder() {
    setReceivingOrder(null);
    setLines([emptyLine()]);
  }

  async function handleAddSupplier(name: string) {
    const result = await dispatch(createSupplierThunk({ name })).unwrap();
    if (result?.id) setSupplierId(result.id);
  }

  function patchLine(key: string, patch: Partial<PurchaseLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const validLines = lines.filter((l) => {
    const qty = parseFloat(l.quantity);
    const price = parseFloat(l.purchasePrice);
    return l.product && Number.isInteger(qty) && qty > 0 && Number.isFinite(price) && price >= 0
      && (l.maxQty == null || qty <= l.maxQty);
  });

  const totalAmount = validLines.reduce(
    (sum, l) => sum + parseFloat(l.quantity) * parseFloat(l.purchasePrice),
    0,
  );

  const hasIncompleteLine = lines.some((l) => {
    // A line the user has started (picked a product) but not finished
    // shouldn't silently be dropped from the save — flag it instead.
    if (!l.product) return false;
    const qty = parseFloat(l.quantity);
    const price = parseFloat(l.purchasePrice);
    return !(Number.isInteger(qty) && qty > 0) || !(Number.isFinite(price) && price >= 0)
      || (l.maxQty != null && qty > l.maxQty);
  });

  const canSave = !!supplierId && validLines.length > 0 && !hasIncompleteLine;

  async function handleSave() {
    setTouched(true);
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (receivingOrder) {
        // Receiving against a PO — posts to the order's own receive
        // endpoint (order_item_id + received_qty per line) so
        // order_items.received_qty/order.status update, not a disconnected
        // ad-hoc Purchase. Backend returns the same updatedProducts shape
        // as PRODUCT_INVENTORY_PURCHASES so the patch-in-place below works
        // identically either way.
        const res = await api.post(INVENTORY.ORDER_RECEIVE(receivingOrder.id), {
          purchase_date: purchaseDate,
          items: validLines.filter((l) => l.orderItemId).map((l) => ({
            order_item_id: l.orderItemId,
            received_qty: parseFloat(l.quantity),
          })),
        });
        const data = res.data?.data;
        // Moves this supplier's due_amount — not caught by inventorySlice's
        // thunk-fulfilled matcher since this is a plain axios call, so mark
        // the suppliers list stale directly.
        dispatch(markSuppliersStale());
        onSaved({
          purchaseNumber: receivingOrder.order_number,
          updatedProducts: data?.updatedProducts ?? [],
        });
        return;
      }

      const res = await api.post(INVENTORY.PRODUCT_INVENTORY_PURCHASES, {
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        items: validLines.map((l) => ({
          product_id: l.product!.id,
          quantity: parseFloat(l.quantity),
          purchase_price: parseFloat(l.purchasePrice),
          expiry_date: l.expiryDate || null,
        })),
      });
      const data = res.data?.data;
      onSaved({
        purchaseNumber: data?.purchase?.purchase_number,
        updatedProducts: data?.updatedProducts ?? [],
      });
    } catch (err: any) {
      onError(err?.response?.data?.message || "Couldn't record purchase");
      setSaving(false);
    }
  }

  return (
    <Modal
      show
      onClose={onClose}
      title={receivingOrder ? `Receive ${receivingOrder.order_number}` : "Record Purchase"}
      size="lg"
      disableBackdropClose
      footer={
        <div className="d-flex justify-content-between align-items-center w-100">
          <span className="pm-total">
            Total Amount <strong>{formatAmount(totalAmount)}</strong>
          </span>
          <div className="d-flex gap-2">
            <Button variant="outline-dark" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="dark" onClick={handleSave} disabled={saving || !canSave} loading={saving}>
              {receivingOrder ? "Confirm Receipt" : "Save Purchase"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="pm-field">
        <label className="pm-label">Supplier <span className="pm-req">*</span></label>
        <Dropdown
          value={supplierId}
          options={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          placeholder="Search supplier…"
          onChange={setSupplierId}
          disabled={!!receivingOrder}
        />
        {!receivingOrder && <QuickAdd label="Add a supplier" onAdd={handleAddSupplier} />}
        {touched && !supplierId && <span className="pm-err">Select a supplier</span>}
      </div>

      {receivingOrder ? (
        <div className="pm-receiving-banner">
          <BoxSeam size={14} />
          <span>Receiving against <strong>{receivingOrder.order_number}</strong></span>
          <button type="button" onClick={clearReceivingOrder}>
            <XIcon size={13} /> Switch to purchase with no PO
          </button>
        </div>
      ) : (
        <>
          {supplierId && (loadingSupplierOrders || loadingOrderItems) && (
            <p className="text-muted small">
              {loadingOrderItems ? "Loading this order's items…" : "Checking for open purchase orders…"}
            </p>
          )}

          {supplierId && !loadingSupplierOrders && !loadingOrderItems && supplierOrders.length > 0 && (
            <div className="pm-field">
              <label className="pm-label">Open purchase orders from this supplier</label>
              <div className="pm-po-list">
                {supplierOrders.map((o) => (
                  <button key={o.id} type="button" className="pm-po-row" onClick={() => loadOrderIntoLines(o.id)}>
                    <BoxSeam size={14} />
                    <span className="pm-po-row__number">{o.order_number}</span>
                    <span className="pm-po-row__date">{fmtDate(o.order_date)}</span>
                    <span className="pm-po-row__qty">{o.total_quantity} items</span>
                    <span className="pm-po-row__cta">Receive →</span>
                  </button>
                ))}
              </div>
              <p className="text-muted small mb-0">
                Pick one above to load its items here — or record a purchase with no PO below.
              </p>
            </div>
          )}
        </>
      )}

      <div className="pm-field">
        <label className="pm-label">Purchase Date <span className="pm-req">*</span></label>
        <DatePicker value={purchaseDate} onChange={setPurchaseDate} separator="-" className="dp--block" />
      </div>

      <div className="pm-field">
        <label className="pm-label">Products <span className="pm-req">*</span></label>
        <div className="pm-lines">
          <div className="pm-lines__head">
            <span>Product</span>
            <span>Quantity</span>
            <span>Purchase Price ({currencySymbol})</span>
            <span>Expiry Date</span>
            <span>Total</span>
            <span />
          </div>
          {lines.map((line) => {
            const qty = parseFloat(line.quantity);
            const price = parseFloat(line.purchasePrice);
            const lineTotal = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
            return (
              <div className="pm-lines__row" key={line.key}>
                <div className="pm-lines__product">
                  {line.product ? (
                    <div className="pm-selected-product">
                      <span>{line.product.name}</span>
                      {/* Locked once it's tied to a PO line — swapping the
                          product wouldn't map to a real order_item_id. */}
                      {!line.orderItemId && (
                        <button type="button" onClick={() => patchLine(line.key, { product: null })}>
                          Change
                        </button>
                      )}
                    </div>
                  ) : (
                    <ProductSearchSelect
                      onSelect={(p) => patchLine(line.key, {
                        product: p,
                        // Defaults to 1 on every product pick (including
                        // re-picking a different product into an existing
                        // row via "Change") — still a plain editable input
                        // afterward, this only seeds the initial value.
                        quantity: "1",
                        purchasePrice: p.supply_price != null ? String(p.supply_price) : line.purchasePrice,
                      })}
                    />
                  )}
                </div>
                <div>
                  <input
                    className="pm-input pm-input--sm"
                    type="text"
                    inputMode="numeric"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.includes(".")) setDecimalAttempted(true);
                      patchLine(line.key, { quantity: raw.replace(/[^0-9]/g, "") });
                    }}
                  />
                  {line.maxQty != null && <span className="pm-max-hint">of {line.maxQty} ordered</span>}
                </div>
                <input
                  className="pm-input pm-input--sm"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Price"
                  value={line.purchasePrice}
                  onChange={(e) => patchLine(line.key, { purchasePrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <DatePicker
                  className="dp--block"
                  value={line.expiryDate}
                  onChange={(v) => patchLine(line.key, { expiryDate: v })}
                  separator="-"
                />
                <span className="pm-line-total">{formatAmount(lineTotal)}</span>
                <button
                  type="button"
                  className="pm-remove-line"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  title="Remove product"
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })}
        </div>
        {!receivingOrder && (
          <button type="button" className="pm-add-line" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            <PlusLg size={13} /> Add Product
          </button>
        )}
        {touched && validLines.length === 0 && <span className="pm-err">Add at least one product</span>}
        {touched && hasIncompleteLine && !lines.some((l) => l.maxQty != null && parseFloat(l.quantity) > l.maxQty) && (
          <span className="pm-err">Every product needs a whole-number quantity and purchase price</span>
        )}
        {touched && lines.some((l) => l.maxQty != null && parseFloat(l.quantity) > l.maxQty) && (
          <span className="pm-err">Received quantity can't exceed what's still outstanding on the order</span>
        )}
        {decimalAttempted && <span className="pm-err">Add Qty must be a whole number — decimals aren't allowed</span>}
      </div>
    </Modal>
  );
}
