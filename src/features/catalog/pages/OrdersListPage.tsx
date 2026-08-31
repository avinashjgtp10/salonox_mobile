import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileEarmarkText, PlusLg, X } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchOrdersThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Pagination from "../../../components/ui/Pagination";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import { formatDateDDMMYYYY as fmtDate } from "../../../utils/dateFormat";
import "../styles/SuppliersListPage.scss";

const STATUS_LABEL: Record<Order["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};
const STATUS_BADGE: Record<Order["status"], "paid" | "due" | "overdue"> = {
  draft: "due",
  sent: "due",
  partially_received: "due",
  received: "paid",
  cancelled: "overdue",
};

// Orders list — same list-page pattern as SuppliersListPage.tsx (header,
// search, table, pagination, empty state) so Orders reads as part of the
// same Inventory family rather than a one-off layout. Server-paginated
// (unlike Suppliers' client-side list) since orders can grow unbounded.
const OrdersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { showError, overlay } = useStatusOverlay();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dispatch(
        fetchOrdersThunk({ search: debouncedSearch || undefined, page: currentPage, limit: pageSize }),
      ).unwrap();
      setOrders(result.data);
      setTotal(result.total);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't load orders");
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, debouncedSearch, currentPage, pageSize, showError]);

  useEffect(() => { load(); }, [load]);

  const handleClearSearch = () => setSearch("");

  const goToNewOrder = () => navigate("/dashboard/catalog/inventory/orders/new-order");

  return (
    <div className="suppliers-list-page">
      {overlay}
      <header className="suppliers-list-page__header">
        <div>
          <h1>
            Orders
            <span className="count-badge">{total}</span>
          </h1>
          <p>Create and manage purchase orders sent to your suppliers.</p>
        </div>
        <Button variant="dark" iconLeft={<PlusLg size={14} />} onClick={goToNewOrder}>
          New Order
        </Button>
      </header>

      <div className="suppliers-list-page__controls">
        <Input
          containerClass="search-box mb-0"
          type="text"
          placeholder="Search orders by order number or supplier"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
          iconRight={search ? (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={handleClearSearch}
            >
              <X size={16} />
            </button>
          ) : undefined}
        />
      </div>

      <main className="suppliers-list-page__content">
        {loading ? (
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Status</th>
                <th>Total Quantity</th>
                <th>Total Price</th>
                <th>Payment Terms</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width="60%" height={13} /></td>
                  <td><Skeleton width="70%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="30%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : orders.length > 0 ? (
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Status</th>
                <th>Total Quantity</th>
                <th>Total Price</th>
                <th>Payment Terms</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/dashboard/catalog/inventory/orders/${o.id}`)}
                >
                  <td className="fw-semibold">{o.order_number}</td>
                  <td>{o.supplier_name || "—"}</td>
                  <td>{fmtDate(o.order_date)}</td>
                  <td>
                    <span className={`supplier-status-badge supplier-status-badge--${STATUS_BADGE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td>{o.total_quantity ?? 0}</td>
                  <td>{formatAmount(o.total_price ?? 0)}</td>
                  <td>{o.payment_terms_days != null ? `${o.payment_terms_days} days` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            className="suppliers-empty-card"
            icon={<FileEarmarkText size={40} />}
            title={debouncedSearch ? "No orders match your search." : "No orders yet"}
            description="Click here to create your first order."
            action={
              <Button variant="dark" size="sm" iconLeft={<PlusLg size={13} />} onClick={goToNewOrder}>
                New Order
              </Button>
            }
          />
        )}
      </main>

      {total > 0 && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
          pageSizeOptions={[10, 20, 50, 100]}
          className="suppliers-pagination"
        />
      )}
    </div>
  );
};

export default OrdersListPage;
