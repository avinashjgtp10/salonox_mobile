import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BoxSeam, XCircle } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchOrderByIdThunk, receiveOrderThunk, cancelOrderThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order, OrderStatus } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Skeleton from "../../../components/ui/Skeleton";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { formatDateDDMMYYYY as fmtDate } from "../../../utils/dateFormat";
import "../styles/SuppliersListPage.scss";
import "../styles/PurchaseHistoryListPage.scss";
import "../styles/SupplierDetailPage.scss";

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

// Order document view + the Receive/Cancel actions that drive its lifecycle.
// Receiving records a linked Purchase (via the backend's receive() reusing
// purchasesRepository.create()) — that's the only thing that actually moves
// products.amount; creating the order itself never did.
const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const { showError, showSuccess, overlay } = useStatusOverlay();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    dispatch(fetchOrderByIdThunk(id))
      .unwrap()
      .then((result) => setOrder(result))
      .catch((err) => {
        showError(typeof err === "string" ? err : "Couldn't load order");
        setOrder(null);
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const canReceive = !!order && (order.status === "sent" || order.status === "partially_received");
  const canCancel = !!order && (order.status === "draft" || order.status === "sent");

  const remainingByItem = useMemo(() => {
    const map = new Map<string, number>();
    (order?.items ?? []).forEach((it) => map.set(it.id, Math.max(0, Number(it.qty) - Number(it.received_qty))));
    return map;
  }, [order]);

  function openReceive() {
    const defaults: Record<string, string> = {};
    (order?.items ?? []).forEach((it) => {
      const remaining = remainingByItem.get(it.id) ?? 0;
      defaults[it.id] = remaining > 0 ? String(remaining) : "";
    });
    setReceiveQtys(defaults);
    setReceiveOpen(true);
  }

  async function submitReceive() {
    if (!order) return;
    const items = Object.entries(receiveQtys)
      .map(([order_item_id, v]) => ({ order_item_id, received_qty: parseFloat(v) || 0 }))
      .filter((i) => i.received_qty > 0);

    if (!items.length) {
      showError("Enter a received quantity for at least one item");
      return;
    }
    for (const i of items) {
      const remaining = remainingByItem.get(i.order_item_id) ?? 0;
      if (i.received_qty > remaining) {
        showError("Received quantity can't exceed what's still outstanding on this order");
        return;
      }
    }

    setSubmitting(true);
    try {
      const updated = await dispatch(receiveOrderThunk({ orderId: order.id, payload: { items } })).unwrap();
      setOrder(updated);
      setReceiveOpen(false);
      showSuccess("Order received — stock and supplier balance updated");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to receive order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    try {
      const updated = await dispatch(cancelOrderThunk(order.id)).unwrap();
      setOrder(updated);
      showSuccess("Order cancelled");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to cancel order");
    }
  }

  if (loading) {
    return (
      <div className="supplier-detail-page">
        {overlay}
        <Skeleton width="30%" height={24} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="supplier-detail-page">
        {overlay}
        <button className="supplier-detail-page__back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back to Orders
        </button>
        <p className="text-muted">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="supplier-detail-page">
      {overlay}
      <button className="supplier-detail-page__back" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Back to Orders
      </button>

      <header className="supplier-detail-page__header">
        <div>
          <h1>
            {order.order_number}{" "}
            <span className={`supplier-status-badge supplier-status-badge--${order.status === "received" ? "paid" : order.status === "cancelled" ? "overdue" : "due"}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </h1>
          <p>{order.supplier_name || "—"}</p>
        </div>
        <div className="d-flex gap-2">
          {canCancel && (
            <Button variant="outline-dark" iconLeft={<XCircle size={14} />} onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
          {canReceive && (
            <Button variant="dark" iconLeft={<BoxSeam size={14} />} onClick={openReceive}>
              Receive
            </Button>
          )}
        </div>
      </header>

      <div className="supplier-detail-page__stats">
        <div className="stat-card">
          <span className="stat-label">Order Date</span>
          <span className="stat-value">{fmtDate(order.order_date)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Quantity</span>
          <span className="stat-value">{order.total_quantity}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Price</span>
          <span className="stat-value">{formatAmount(order.total_price)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Payment Terms</span>
          <span className="stat-value">{order.payment_terms_days != null ? `${order.payment_terms_days} days` : "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Delivery Date</span>
          <span className="stat-value">{fmtDate(order.delivery_date)}</span>
        </div>
      </div>

      <div className="phist-page">
        <table className="phist-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Product Code</th>
              <th className="phist-num">Qty</th>
              <th className="phist-num">Received</th>
              <th className="phist-num">Selling Price</th>
              <th className="phist-num">Discount</th>
              <th className="phist-num">Cost Price</th>
              <th className="phist-num">Total Cost W/O Tax</th>
              <th className="phist-num">Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.product_name || "—"}</td>
                <td>{item.product_code || "—"}</td>
                <td className="phist-num">{item.qty}</td>
                <td className="phist-num">{item.received_qty} / {item.qty}</td>
                <td className="phist-num">{formatAmount(item.selling_price)}</td>
                <td className="phist-num">{item.discount_percent}%</td>
                <td className="phist-num">{formatAmount(item.cost_price)}</td>
                <td className="phist-num">{formatAmount(item.total_cost_wo_tax)}</td>
                <td className="phist-num">{formatAmount(item.total_tax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.remark && (
        <p className="text-muted mt-3"><strong>Remark:</strong> {order.remark}</p>
      )}
      {order.terms_conditions && (
        <p className="text-muted"><strong>Terms and Conditions:</strong> {order.terms_conditions}</p>
      )}

      {receiveOpen && (
        <Modal show onClose={() => setReceiveOpen(false)} title="Receive Order" size="lg">
          <p className="text-muted mb-3">
            Enter how much of each item actually arrived in this delivery. This creates a Purchase record,
            adds the received quantity to stock, and updates the supplier's balance.
          </p>
          <table className="phist-table--compact w-100">
            <thead>
              <tr>
                <th>Product</th>
                <th className="phist-num">Ordered</th>
                <th className="phist-num">Already Received</th>
                <th className="phist-num">Receiving Now</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item) => {
                const remaining = remainingByItem.get(item.id) ?? 0;
                return (
                  <tr key={item.id}>
                    <td>{item.product_name || "—"}</td>
                    <td className="phist-num">{item.qty}</td>
                    <td className="phist-num">{item.received_qty}</td>
                    <td className="phist-num">
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        step="any"
                        className="new-order-input--sm"
                        value={receiveQtys[item.id] ?? ""}
                        disabled={remaining <= 0}
                        onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="outline-dark" onClick={() => setReceiveOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="dark" onClick={submitReceive} disabled={submitting}>
              {submitting ? "Receiving…" : "Confirm Receive"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrderDetailPage;
