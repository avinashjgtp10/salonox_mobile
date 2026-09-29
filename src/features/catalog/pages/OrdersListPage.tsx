import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import { fetchOrdersThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatDateDDMMYYYY as fmtDate } from "../../../utils/dateFormat";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import OrderStatusStepper from "../components/OrderStatusStepper";
import OrderDetailPage from "./OrderDetailPage";
import "../styles/SuppliersListPage.scss";

const friendlyPermissionDenied = (permKey: string) =>
  `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`;

const STEPS: { key: Order["status"]; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Ordered" },
  { key: "partially_received", label: "Verify Order" },
  { key: "received", label: "Received" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<Order["status"], "paid" | "due" | "overdue" | "partial"> = {
  draft: "due",
  sent: "due",
  partially_received: "partial",
  received: "paid",
  cancelled: "overdue",
};

const OrdersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { formatAmount } = useCurrency();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status") as Order["status"] | null;

  const { orders, ordersTotal: total, ordersLoading: loading } = useAppSelector((s) => s.inventory);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  // The "Verify Order" filter's OR-with-verification_started_at logic lives
  // server-side (orders.repository.ts's list()) — an "Ordered" order only
  // shows there once "Confirm Order" has actually been clicked on it, not
  // just by being "sent". This just requests the plain status as usual.
  useEffect(() => {
    if (!statusParam) return;
    dispatch(fetchOrdersThunk({ status: statusParam }));
  }, [dispatch, statusParam]);

  const goToNewOrder = () => {
    if (!can("create_order")) {
      dispatch(showPermissionDenied(friendlyPermissionDenied("create_order")));
      return;
    }
    navigate("/dashboard/inventory/orders/new-order");
  };

  const goToStep = (key: Order["status"] | "create") => {
    if (key === "create") { goToNewOrder(); return; }
    navigate(`/dashboard/inventory/orders?status=${key}`);
  };

  // No status picked yet — this page has nothing of its own to show, so it
  // hands off straight to Create Order (the default landing page for
  // Warehouse → Orders). Picking a step below comes back here with
  // ?status=... instead.
  if (!statusParam) {
    return <Navigate to="/dashboard/inventory/orders/new-order" replace />;
  }

  return (
    <div className="suppliers-list-page">
      <OrderStatusStepper current={statusParam} onStepClick={goToStep} />

      <header className="suppliers-list-page__header">
        <div>
          <h1>Orders</h1>
        </div>
      </header>

      <main className="suppliers-list-page__content">
        {loading ? (
          <Skeleton height={200} />
        ) : orders.length === 0 ? (
          <EmptyState title={`No ${STEPS.find((s) => s.key === statusParam)?.label ?? statusParam} orders`} />
        ) : (
          <table className="supplier-table">
            <thead>
              <tr>
                <th>ORDER NUMBER</th>
                <th>SUPPLIER</th>
                <th>ORDER DATE</th>
                <th>STATUS</th>
                <th>TOTAL QUANTITY</th>
                <th>TOTAL PRICE</th>
                <th>PAYMENT TERMS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => setOpenOrderId(o.id)} style={{ cursor: "pointer" }}>
                  <td>{o.order_number}</td>
                  <td>{o.supplier_name || "—"}</td>
                  <td>{fmtDate(o.order_date)}</td>
                  <td>
                    <span className={`supplier-status-badge supplier-status-badge--${STATUS_BADGE[o.status]}`}>
                      {STEPS.find((s) => s.key === o.status)?.label ?? o.status}
                    </span>
                  </td>
                  <td>{o.total_quantity}</td>
                  <td>{formatAmount(o.total_price)}</td>
                  <td>{o.payment_terms_days != null ? `${o.payment_terms_days} days` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-muted mt-2 px-2">{total} result{total === 1 ? "" : "s"}</p>
      </main>

      {openOrderId && (
        <div className="sdp-popup-overlay" onClick={() => setOpenOrderId(null)}>
          <div className="sdp-popup-panel" onClick={(e) => e.stopPropagation()}>
            <OrderDetailPage
              orderId={openOrderId}
              onClose={() => {
                setOpenOrderId(null);
                // Cancel/Place/Confirm/delete inside the popup can change
                // this row's status — refresh the filtered list so it
                // doesn't go stale.
                dispatch(fetchOrdersThunk({ status: statusParam! }));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersListPage;
