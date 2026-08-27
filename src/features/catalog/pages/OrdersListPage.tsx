import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, FileEarmarkText, PlusLg, X, ThreeDotsVertical, PencilSquare, Trash3 } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchOrdersThunk, deleteOrderThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Pagination from "../../../components/ui/Pagination";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import Modal from "../../../components/ui/Modal";
import OrderDetailsDrawer from "../components/OrderDetailsDrawer";
import "../styles/SuppliersListPage.scss";
import "../styles/OrdersListPage.scss";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

// Orders list — same list-page pattern as SuppliersListPage.tsx (header,
// search, table, pagination, empty state) so Orders reads as part of the
// same Inventory family rather than a one-off layout. Server-paginated
// (unlike Suppliers' client-side list) since orders can grow unbounded.
const OrdersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { showError, showSuccess, overlay } = useStatusOverlay();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [kebabPos, setKebabPos] = useState<{ top: number; right: number } | null>(null);
  const kebabPortalRef = useRef<HTMLUListElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    if (!openRowMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".orders-kebab-wrap")) return;
      if (kebabPortalRef.current?.contains(target)) return;
      setOpenRowMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openRowMenuId]);

  // Closes the menu on scroll instead of tracking/repositioning it — simpler,
  // and scrolling away from the row it belongs to should dismiss it anyway.
  useEffect(() => {
    if (!openRowMenuId) return;
    const closeOnScroll = () => setOpenRowMenuId(null);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => window.removeEventListener("scroll", closeOnScroll, true);
  }, [openRowMenuId]);

  const handleClearSearch = () => setSearch("");

  const goToNewOrder = () => navigate("/dashboard/catalog/inventory/orders/new-order");

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteOrderThunk(deleteTarget.id)).unwrap();
      showSuccess("Order deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't delete order");
    } finally {
      setDeleting(false);
    }
  };

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
                <th>Total Quantity</th>
                <th>Total Price</th>
                <th>Payment Terms</th>
                <th className="actions-cell" style={{ width: 56 }} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width="60%" height={13} /></td>
                  <td><Skeleton width="70%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="30%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td className="actions-cell" />
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
                <th>Total Quantity</th>
                <th>Total Price</th>
                <th>Payment Terms</th>
                <th className="actions-cell" style={{ width: 56 }} />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => { setSelectedOrderId(o.id); setIsDrawerOpen(true); }}
                >
                  <td className="fw-semibold">{o.order_number}</td>
                  <td>{o.supplier_name || "—"}</td>
                  <td>{fmtDate(o.order_date)}</td>
                  <td>{o.total_quantity ?? 0}</td>
                  <td>{formatAmount(o.total_price ?? 0)}</td>
                  <td>{o.payment_terms_days != null ? `${o.payment_terms_days} days` : "—"}</td>
                  <td className="actions-cell orders-kebab-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="orders-kebab-btn"
                      title="Actions"
                      onClick={(e) => {
                        const isOpen = openRowMenuId === o.id;
                        setOpenRowMenuId(isOpen ? null : o.id);
                        if (!isOpen) {
                          const r = e.currentTarget.getBoundingClientRect();
                          setKebabPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                        }
                      }}
                    >
                      <ThreeDotsVertical size={16} />
                    </button>
                    {openRowMenuId === o.id && kebabPos && createPortal(
                      <ul
                        ref={kebabPortalRef}
                        className="orders-kebab-menu"
                        style={{ position: "fixed", top: kebabPos.top, right: kebabPos.right }}
                      >
                        <li>
                          <button
                            className="orders-kebab-item"
                            onClick={() => {
                              setOpenRowMenuId(null);
                              navigate(`/dashboard/catalog/inventory/orders/${o.id}/edit`);
                            }}
                          >
                            <PencilSquare size={14} /> Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className="orders-kebab-item orders-kebab-item--danger"
                            onClick={() => { setOpenRowMenuId(null); setDeleteTarget(o); }}
                          >
                            <Trash3 size={13} /> Delete
                          </button>
                        </li>
                      </ul>,
                      document.body
                    )}
                  </td>
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

      <OrderDetailsDrawer
        orderId={selectedOrderId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onDeleted={load}
      />

      {deleteTarget && (
        <Modal
          show
          onClose={() => setDeleteTarget(null)}
          title="Delete order?"
          footer={
            <div className="d-flex gap-2 w-100">
              <Button variant="outline-dark" fullWidth onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" fullWidth loading={deleting} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          }
        >
          <p className="text-muted small mb-0">
            Are you sure you want to delete <strong>{deleteTarget.order_number}</strong>? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default OrdersListPage;
