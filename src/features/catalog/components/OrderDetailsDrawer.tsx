import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { XLg, Trash, Pencil, FileEarmarkText, FileEarmarkPdf } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchOrderByIdThunk, deleteOrderThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { generatePurchaseOrderPdf } from "../utils/purchaseOrderPdf";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import "../styles/OrderDetailsDrawer.scss";

interface OrderDetailsDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Notified after a successful delete so the list page can refresh/refetch. */
  onDeleted: () => void;
}

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({ orderId, isOpen, onClose, onDeleted }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { formatAmount, currencySymbol } = useCurrency();
  const { showError, showSuccess, overlay } = useStatusOverlay();
  const currentSalon = useSelector(selectCurrentSalon);

  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      dispatch(fetchOrderByIdThunk(orderId))
        .unwrap()
        .then((result) => setOrder(result))
        .catch((err: any) => {
          showError(typeof err === "string" ? err : "Couldn't load order");
          setOrder(null);
        })
        .finally(() => setLoading(false));
    } else if (!isOpen) {
      setOrder(null);
      setDeleteOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (!order) return;
    if (!can("download_order_pdf")) { denyPerm("download_order_pdf"); return; }
    if (!can("export_pdf")) { denyPerm("export_pdf"); return; }
    generatePurchaseOrderPdf(order, { salon: currentSalon, currencySymbol });
  };

  const handleEdit = () => {
    if (!can("edit_order")) { denyPerm("edit_order"); return; }
    navigate(`/dashboard/inventory/orders/${orderId}/edit`);
    onClose();
  };

  const handleDeleteClick = () => {
    if (!can("cancel_order")) { denyPerm("cancel_order"); return; }
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!orderId) return;
    if (!can("cancel_order")) { denyPerm("cancel_order"); setDeleteOpen(false); return; }
    setDeleting(true);
    try {
      await dispatch(deleteOrderThunk(orderId)).unwrap();
      showSuccess("Order deleted successfully");
      setDeleteOpen(false);
      onDeleted();
      onClose();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't delete order");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`odd-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="odd" onClick={(e) => e.stopPropagation()}>
        {overlay}
        <header className="odd__header">
          <button className="close-btn" onClick={onClose}>
            <XLg size={20} />
          </button>
          <div className="header-content">
            <div className="order-icon">
              <FileEarmarkText size={22} />
            </div>
            <div className="title-section">
              <h3 className="order-name">{order?.order_number || `Order #${orderId?.slice(0, 6)}`}</h3>
              <span className="order-supplier">{order?.supplier_name || "—"}</span>
            </div>
          </div>
          <div className="header-actions">
            {order && (
              <button
                className="edit-btn"
                style={(!can("download_order_pdf") || !can("export_pdf")) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={handleDownloadPdf}
              >
                <FileEarmarkPdf size={13} /> Download PDF
              </button>
            )}
            <button
              className="edit-btn"
              style={!can("edit_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={handleEdit}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              className="delete-btn"
              style={!can("cancel_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={handleDeleteClick}
            >
              <Trash size={14} /> Delete
            </button>
          </div>
        </header>

        {loading ? (
          <div className="odd__loading">
            <div className="spinner-border spinner-border-sm" role="status" />
            <span>Loading details...</span>
          </div>
        ) : order ? (
          <div className="odd__body">
            <section className="odd__section">
              <h4 className="section-title">Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">Order Date</span>
                  <span className="value">{fmtDate(order.order_date)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Delivery Date</span>
                  <span className="value">{fmtDate(order.delivery_date)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Total Quantity</span>
                  <span className="value">{order.total_quantity}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Total Price</span>
                  <span className="value">{formatAmount(order.total_price)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Payment Terms</span>
                  <span className="value">{order.payment_terms_days != null ? `${order.payment_terms_days} days` : "—"}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Reference Number</span>
                  <span className="value">{order.ref_number || "—"}</span>
                </div>
              </div>
            </section>

            <section className="odd__section">
              <div className="section-header">
                <h4 className="section-title">Order Items</h4>
                <span className="badge bg-light text-dark rounded-pill">{order.items?.length || 0} items</span>
              </div>
              {order.items?.length ? (
                <div className="odd-items-table-wrap">
                  <table className="odd-items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-end">Qty</th>
                        <th className="text-end">Selling Price</th>
                        <th className="text-end">Discount</th>
                        <th className="text-end">Cost Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name || "—"}</td>
                          <td className="text-end">{item.qty}</td>
                          <td className="text-end">{formatAmount(item.selling_price)}</td>
                          <td className="text-end">{item.discount_percent}%</td>
                          <td className="text-end">{formatAmount(item.cost_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No items on this order.</p>
              )}
            </section>

            {(order.remark || order.terms_conditions) && (
              <section className="odd__section">
                <h4 className="section-title">Additional Information</h4>
                {order.remark && <p className="odd-note"><strong>Notes:</strong> {order.remark}</p>}
                {order.terms_conditions && <p className="odd-note"><strong>Terms &amp; Conditions:</strong> {order.terms_conditions}</p>}
              </section>
            )}
          </div>
        ) : (
          <div className="odd__loading">
            <span>Order not found.</span>
          </div>
        )}
      </div>

      {deleteOpen && (
        <Modal
          show
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
            Are you sure you want to delete <strong>{order?.order_number}</strong>? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default OrderDetailsDrawer;
