import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchOrderByIdThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Skeleton from "../../../components/ui/Skeleton";
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
  const { showError } = useStatusOverlay();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

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
      <button className="supplier-detail-page__back" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Back to Orders
      </button>

      <header className="supplier-detail-page__header">
        <div>
          <h1>{order.order_number}</h1>
          <p>{order.supplier_name || "—"}</p>
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
    </div>
  );
};

export default OrderDetailPage;
