import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, XCircle, Trash, PencilSquare, FileEarmarkPdf, ClipboardCheck } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchOrderByIdThunk, cancelOrderThunk, placeOrderThunk, startVerificationThunk, deleteOrderThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order, OrderStatus } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import Skeleton from "../../../components/ui/Skeleton";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Tabs from "../../../components/ui/Tabs";
import type { TabItem } from "../../../components/ui/Tabs";
import ReceivingTab from "../components/ReceivingTab";
import OrderStatusStepper from "../components/OrderStatusStepper";
import { formatDateDDMMYYYY as fmtDate } from "../../../utils/dateFormat";
import { generateOrderBillPdf } from "../utils/orderBillPdf";
import { generatePurchaseOrderPdf } from "../utils/purchaseOrderPdf";
import "../styles/SuppliersListPage.scss";
import "../styles/PurchaseHistoryTable.scss";
import "../styles/SupplierDetailPage.scss";

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  sent: "Ordered",
  partially_received: "Verify Order",
  received: "Received",
  cancelled: "Cancelled",
};

// Order document view + the Receive/Cancel actions that drive its lifecycle.
// Receiving records a linked Purchase (via the backend's receive() reusing
// purchasesRepository.create()) — that's the only thing that actually moves
// products.amount; creating the order itself never did.
interface OrderDetailPageProps {
  /** Set when embedded as a popup (see OrdersListPage.tsx) — overrides the
   *  :id route param so the same component works as a route AND a popup. */
  orderId?: string;
  /** Set when embedded as a popup — used instead of navigating away for
   *  Close/Back and after a delete. Same optional-prop convention as
   *  AddSupplierPage's panelMode/onClose. */
  onClose?: () => void;
}

const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ orderId: orderIdProp, onClose }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = orderIdProp ?? routeId;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const { formatAmount, currencySymbol } = useCurrency();
  const { showError, showSuccess, overlay } = useStatusOverlay();
  const currentSalon = useSelector(selectCurrentSalon);

  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "receiving">("overview");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    if (!can("cancel_order")) { denyPerm("cancel_order"); setDeleteOpen(false); return; }
    setDeleting(true);
    try {
      await dispatch(deleteOrderThunk(id)).unwrap();
      showSuccess("Order deleted successfully");
      if (onClose) onClose(); else navigate("/dashboard/inventory/orders");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't delete order");
      setDeleting(false);
    }
  };

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

  // Arriving from OrdersListPage's "Receive Order" row action — lands
  // straight on the Receiving tab instead of Overview.
  useEffect(() => {
    if (canReceive && (location.state as { openReceiving?: boolean } | null)?.openReceiving) {
      setActiveTab("receiving");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReceive]);
  const canCancel = !!order && (order.status === "draft" || order.status === "sent");

  const tabs: TabItem[] = useMemo(() => {
    const list: TabItem[] = [{ key: "overview", label: "Overview" }];
    if (canReceive) list.push({ key: "receiving", label: "Verify Order" });
    return list;
  }, [canReceive]);

  const canDownloadBill = order?.bill_payment_status === "paid" || order?.bill_payment_status === "partial";

  function handleDownloadBill() {
    if (!order) return;
    if (!can("download_order_pdf")) { denyPerm("download_order_pdf"); return; }
    if (!can("export_pdf")) { denyPerm("export_pdf"); return; }
    generateOrderBillPdf(order, { salon: currentSalon, currencySymbol });
  }

  function handleDownloadPurchaseOrder() {
    if (!order) return;
    if (!can("download_order_pdf")) { denyPerm("download_order_pdf"); return; }
    if (!can("export_pdf")) { denyPerm("export_pdf"); return; }
    generatePurchaseOrderPdf(order, { salon: currentSalon, currencySymbol });
  }

  async function handleCancel() {
    if (!order) return;
    if (!can("cancel_order")) { denyPerm("cancel_order"); return; }
    try {
      const updated = await dispatch(cancelOrderThunk(order.id)).unwrap();
      setOrder(updated);
      showSuccess("Order cancelled");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to cancel order");
    }
  }

  // Draft → Ordered. Nothing is recalculated here — the draft's items/totals
  // are already final, this just flips the status server-side.
  async function handlePlaceOrder() {
    if (!order) return;
    if (!can("create_order")) { denyPerm("create_order"); return; }
    setPlacing(true);
    try {
      const updated = await dispatch(placeOrderThunk(order.id)).unwrap();
      setOrder(updated);
      showSuccess("Order placed");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  // Ordered → Verify Order. Doesn't change order.status — just timestamps
  // that verification has begun (see orders.repository.ts's
  // startVerification) so this order now shows on the Verify Order list too,
  // then switches straight to that tab to actually check quantities.
  async function handleConfirmOrder() {
    if (!order) return;
    if (!can("receive_order")) { denyPerm("receive_order"); return; }
    setConfirmingOrder(true);
    try {
      const updated = await dispatch(startVerificationThunk(order.id)).unwrap();
      setOrder(updated);
      setActiveTab("receiving");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to move order to verification");
    } finally {
      setConfirmingOrder(false);
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
        <button className="supplier-detail-page__back" onClick={onClose ?? (() => navigate(-1))}>
          <ArrowLeft size={14} /> {onClose ? "Close" : "Back to Orders"}
        </button>
        <p className="text-muted">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="supplier-detail-page">
      {overlay}
      {/* The stepper's steps navigate away to the filtered orders list —
          not meaningful/wanted while this is open as a popup over that
          same list, so it's route-only. */}
      {!onClose && <OrderStatusStepper current={order.status} showProgress />}

      <button className="supplier-detail-page__back" onClick={onClose ?? (() => navigate(-1))}>
        <ArrowLeft size={14} /> {onClose ? "Close" : "Back to Orders"}
      </button>

      <header className="supplier-detail-page__header">
        <div>
          <h1>
            {order.order_number}{" "}
            <span className={`supplier-status-badge supplier-status-badge--${order.status === "received" ? "paid" : order.status === "cancelled" ? "overdue" : order.status === "partially_received" ? "partial" : "due"}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </h1>
          <p>{order.supplier_name || "—"}</p>
        </div>
        <div className="d-flex gap-2">
          {order.status === "draft" && (
            <Button
              variant="outline-dark"
              size="sm"
              iconLeft={<PencilSquare size={14} />}
              style={!can("edit_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => {
                if (!can("edit_order")) { denyPerm("edit_order"); return; }
                navigate(`/dashboard/inventory/orders/${order.id}/edit`);
              }}
            >
              Edit
            </Button>
          )}
          {order.status === "draft" && (
            <Button
              variant="dark"
              size="sm"
              style={!can("create_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={handlePlaceOrder}
              disabled={placing}
              loading={placing}
            >
              Place Order
            </Button>
          )}
          {order.status === "sent" && (
            <Button
              variant="dark"
              size="sm"
              iconLeft={<ClipboardCheck size={14} />}
              style={!can("receive_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={handleConfirmOrder}
              disabled={confirmingOrder}
              loading={confirmingOrder}
            >
              Confirm Order
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline-dark"
              size="sm"
              iconLeft={<XCircle size={14} />}
              style={!can("cancel_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={handleCancel}
            >
              Cancel Order
            </Button>
          )}
          <Button
            variant="outline-dark"
            size="sm"
            iconLeft={<FileEarmarkPdf size={14} />}
            style={(!can("download_order_pdf") || !can("export_pdf")) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            onClick={handleDownloadPurchaseOrder}
          >
            Download PDF
          </Button>
          {canDownloadBill && (
            <Button
              variant="outline-dark"
              size="sm"
              iconLeft={<FileEarmarkPdf size={14} />}
              style={(!can("download_order_pdf") || !can("export_pdf")) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={handleDownloadBill}
            >
              Download Bill PDF
            </Button>
          )}
          <Button
            variant="outline-danger"
            size="sm"
            iconLeft={<Trash size={14} />}
            style={!can("cancel_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            onClick={() => {
              if (!can("cancel_order")) { denyPerm("cancel_order"); return; }
              setDeleteOpen(true);
            }}
          >
            {order.status === "draft" ? "Delete Draft" : "Delete"}
          </Button>
        </div>
      </header>

      {tabs.length > 1 && (
        <Tabs tabs={tabs} activeKey={activeTab} onChange={(k) => setActiveTab(k as "overview" | "receiving")} variant="underline" className="mb-3" />
      )}

      {activeTab === "overview" && (
        <>
          <div className="supplier-detail-page__stats">
            <div className="stat-card">
              <span className="stat-label">Order Date</span>
              <span className="stat-value">{fmtDate(order.order_date)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Quantity</span>
              <span className="stat-value">{Number(order.total_quantity) || 0}</span>
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
            {order.status !== "cancelled" && order.status !== "draft" && order.status !== "sent" && (
              <>
                <div className="stat-card">
                  <span className="stat-label">Paid Amount</span>
                  <span className="stat-value">{formatAmount(order.paid_amount ?? 0)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Pending Amount</span>
                  <span className="stat-value">{formatAmount(order.pending_amount ?? 0)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Payment Status</span>
                  <span className={`supplier-status-badge supplier-status-badge--${order.bill_payment_status === "paid" ? "paid" : order.bill_payment_status === "partial" ? "partial" : "due"}`}>
                    {order.bill_payment_status === "paid" ? "Paid" : order.bill_payment_status === "partial" ? "Partial" : "Unpaid"}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="phist-page">
            <table className="phist-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Product Code</th>
                  <th className="phist-num">Qty</th>
                  <th className="phist-num">Received</th>
                  <th className="phist-num">Damaged</th>
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
                    <td className="phist-num">{Number(item.qty) || 0}</td>
                    <td className="phist-num">
                      {Number(item.received_qty) || 0} / {Number(item.qty) || 0}
                    </td>
                    <td className="phist-num">{Number(item.damaged_qty) || 0}</td>
                    <td className="phist-num">{formatAmount(item.selling_price)}</td>
                    <td className="phist-num">{Number(item.discount_percent) || 0}%</td>
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
        </>
      )}

      {activeTab === "receiving" && canReceive && (
        <ReceivingTab order={order} />
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
