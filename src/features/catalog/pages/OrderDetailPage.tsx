import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchOrderByIdThunk, deleteOrderThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Skeleton from "../../../components/ui/Skeleton";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import "../styles/SuppliersListPage.scss";
import "../styles/PurchaseHistoryListPage.scss";
import "../styles/SupplierDetailPage.scss";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

// Read-only order document view — same header/back-button/stat-card pattern
// as SupplierDetailPage.tsx, reusing .phist-table for the line items.
const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const { showError, showSuccess, overlay } = useStatusOverlay();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await dispatch(deleteOrderThunk(id)).unwrap();
      showSuccess("Order deleted successfully");
      navigate("/dashboard/catalog/inventory/orders");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't delete order");
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    dispatch(fetchOrderByIdThunk(id))
      .unwrap()
      .then((result) => { if (!cancelled) setOrder(result); })
      .catch((err) => {
        if (cancelled) return;
        showError(typeof err === "string" ? err : "Couldn't load order");
        setOrder(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, dispatch, showError]);

  if (loading) {
    return (
      <div className="supplier-detail-page">
        <Skeleton width="30%" height={24} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="supplier-detail-page">
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
          <h1>{order.order_number}</h1>
          <p>{order.supplier_name || "—"}</p>
        </div>
        <Button variant="outline-danger" size="sm" iconLeft={<Trash size={14} />} onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
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

      <Modal
        show={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete order?"
        footer={
          <div className="d-flex gap-2 w-100">
            <Button variant="outline-dark" fullWidth onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" fullWidth loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-0">
          Are you sure you want to delete <strong>{order.order_number}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
