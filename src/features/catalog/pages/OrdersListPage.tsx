import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, FileEarmarkText, FileEarmarkPdf, PlusLg, X, ThreeDotsVertical, PencilSquare, Trash3, BoxSeam } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchOrdersThunk, deleteOrderThunk, fetchOrderByIdThunk, receiveOrderThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { generatePurchaseOrderPdf } from "../utils/purchaseOrderPdf";
import Pagination from "../../../components/ui/Pagination";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import { formatDateDDMMYYYY as fmtDate } from "../../../utils/dateFormat";
import Modal from "../../../components/ui/Modal";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import OrderDetailsDrawer from "../components/OrderDetailsDrawer";
import "../styles/SuppliersListPage.scss";
import "../styles/OrdersListPage.scss";

const STATUS_LABEL: Record<Order["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};
const STATUS_BADGE: Record<Order["status"], "paid" | "due" | "overdue" | "partial"> = {
  draft: "due",
  sent: "due",
  partially_received: "partial",
  received: "paid",
  cancelled: "overdue",
};

// Orders list — same list-page pattern as SuppliersListPage.tsx (header,
// search, table, pagination, empty state) so Orders reads as part of the
// same Inventory family rather than a one-off layout. Both are now
// server-paginated.
const OrdersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount, currencySymbol } = useCurrency();
  const { showError, showSuccess, overlay } = useStatusOverlay();
  const currentSalon = useSelector(selectCurrentSalon);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // The list only ever holds summary fields per row — full line items (needed
  // for the PDF body table) only come back from the single-order endpoint, so
  // this fetches on demand rather than requiring every list row to carry them.
  const handleDownloadPdf = async (o: Order) => {
    setDownloadingPdfId(o.id);
    try {
      const full = await dispatch(fetchOrderByIdThunk(o.id)).unwrap();
      generatePurchaseOrderPdf(full, { salon: currentSalon, currencySymbol });
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't generate PDF");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Kept in Redux (inventorySlice), not page-local state — this page
  // unmounts/remounts on every navigation away and back (e.g. Close on
  // NewOrderPage), which would otherwise reset local state to empty on
  // every return and defeat the "skip refetch on a plain Close" check below.
  const { orders, ordersTotal: total, ordersLoading: loading } = useAppSelector((s) => s.inventory);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "">("");

  const filterFields: JiraFilterField[] = useMemo(() => [
    {
      key: "status",
      label: "Status",
      options: [
        { id: "sent", label: "Sent" },
        { id: "partially_received", label: "Partially Received" },
        { id: "received", label: "Received" },
        { id: "draft", label: "Draft" },
        { id: "cancelled", label: "Cancelled" },
      ],
    },
  ], []);

  const filterMenuSelected = useMemo(() => ({
    status: statusFilter ? [statusFilter] : [],
  }), [statusFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    const one = (v?: string[]) => (v?.length ? v[v.length - 1] : "");
    setStatusFilter(one(next.status) as Order["status"] | "");
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [kebabPos, setKebabPos] = useState<{ top: number; right: number } | null>(null);
  const kebabPortalRef = useRef<HTMLUListElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [receiveOrder, setReceiveOrder] = useState<Order | null>(null);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [receiveBatchNumbers, setReceiveBatchNumbers] = useState<Record<string, string>>({});
  const [submittingReceive, setSubmittingReceive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      await dispatch(
        fetchOrdersThunk({
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          page: currentPage,
          limit: pageSize,
        }),
      ).unwrap();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't load orders");
    }
  }, [dispatch, debouncedSearch, statusFilter, currentPage, pageSize, showError]);

  // Tracks whether we're past the initial mount, so the effect below doesn't
  // also fire (redundantly) on first render — mirrors SuppliersListPage.tsx.
  const isMountedRef = useRef(false);

  // Initial fetch on mount — skipped when orders are already loaded (a plain
  // Close navigates back with no signal) AND this mount wasn't triggered by
  // a successful Add/Edit save. NewOrderPage navigates back with
  // location.state.refresh only after a save; a plain Close navigates with
  // no state at all, so returning from Close reuses what's already loaded
  // instead of calling the API again.
  useEffect(() => {
    const justSaved = (location.state as { refresh?: boolean } | null)?.refresh;
    if (orders.length === 0 || justSaved) {
      load();
    }
    const t = setTimeout(() => { isMountedRef.current = true; }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when page/pageSize/search/filters change (skip initial mount,
  // already handled above). When search/filters change while not already on
  // page 1, reset to page 1 without firing a second (stale-page) fetch in
  // the same tick — the page-1 reset alone triggers this effect again with
  // the corrected page.
  const filtersKey = JSON.stringify({ debouncedSearch, statusFilter });
  const prevFiltersKeyRef = useRef(filtersKey);
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, debouncedSearch, statusFilter, filtersKey]);

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

  const goToNewOrder = () => navigate("/dashboard/inventory/orders/new-order");

  const remainingByItem = useMemo(() => {
    const map = new Map<string, number>();
    (receiveOrder?.items ?? []).forEach((it) => map.set(it.id, Math.max(0, Number(it.qty) - Number(it.received_qty))));
    return map;
  }, [receiveOrder]);

  const openReceive = async (o: Order) => {
    setReceiveLoading(true);
    try {
      const full = await dispatch(fetchOrderByIdThunk(o.id)).unwrap();
      const defaults: Record<string, string> = {};
      (full.items ?? []).forEach((it) => {
        const remaining = Math.max(0, Number(it.qty) - Number(it.received_qty));
        defaults[it.id] = remaining > 0 ? String(remaining) : "";
      });
      setReceiveQtys(defaults);
      setReceiveBatchNumbers({});
      setReceiveOrder(full);
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't load order");
    } finally {
      setReceiveLoading(false);
    }
  };

  const submitReceive = async () => {
    if (!receiveOrder) return;
    const items = Object.entries(receiveQtys)
      .map(([order_item_id, v]) => ({
        order_item_id,
        received_qty: parseFloat(v) || 0,
        batch_number: receiveBatchNumbers[order_item_id]?.trim() || undefined,
      }))
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

    setSubmittingReceive(true);
    try {
      await dispatch(receiveOrderThunk({ orderId: receiveOrder.id, payload: { items } })).unwrap();
      setReceiveOrder(null);
      showSuccess("Order received — stock and supplier balance updated");
      load();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to receive order");
    } finally {
      setSubmittingReceive(false);
    }
  };

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
        <JiraFilterMenu
          fields={filterFields}
          selected={filterMenuSelected}
          onApply={handleFiltersApply}
          triggerLabel="Filters"
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
                <th className="actions-cell" style={{ width: 56 }} />
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
                <th>Status</th>
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
                  onClick={() => { console.log("[OrdersListPage] row clicked", o.id); setSelectedOrderId(o.id); setIsDrawerOpen(true); }}
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
                  <td className="actions-cell orders-kebab-wrap" onClick={(e) => { console.log("[OrdersListPage] td stopPropagation"); e.stopPropagation(); }}>
                    <button
                      className="orders-kebab-btn"
                      title="Actions"
                      onClick={(e) => {
                        console.log("[OrdersListPage] kebab button clicked", o.id);
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
                        {o.status === "sent" && (
                          <li>
                            <button
                              className="orders-kebab-item"
                              disabled={receiveLoading}
                              onClick={() => {
                                setOpenRowMenuId(null);
                                openReceive(o);
                              }}
                            >
                              <BoxSeam size={14} /> Receive Order
                            </button>
                          </li>
                        )}
                        <li>
                          <button
                            className="orders-kebab-item"
                            disabled={downloadingPdfId === o.id}
                            onClick={() => {
                              setOpenRowMenuId(null);
                              handleDownloadPdf(o);
                            }}
                          >
                            <FileEarmarkPdf size={14} /> {downloadingPdfId === o.id ? "Generating..." : "Download PDF"}
                          </button>
                        </li>
                        <li>
                          <button
                            className="orders-kebab-item"
                            onClick={() => {
                              setOpenRowMenuId(null);
                              navigate(`/dashboard/inventory/orders/${o.id}/edit`);
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

      {receiveOrder && (
        <Modal show onClose={() => setReceiveOrder(null)} title="Receive Order" size="lg">
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
                <th>Batch / Lot No.</th>
              </tr>
            </thead>
            <tbody>
              {(receiveOrder.items ?? []).map((item) => {
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
                    <td>
                      <input
                        type="text"
                        className="new-order-input--sm"
                        placeholder="Optional"
                        value={receiveBatchNumbers[item.id] ?? ""}
                        disabled={remaining <= 0}
                        onChange={(e) => setReceiveBatchNumbers((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="outline-dark" onClick={() => setReceiveOrder(null)} disabled={submittingReceive}>Cancel</Button>
            <Button variant="dark" onClick={submitReceive} disabled={submittingReceive}>
              {submittingReceive ? "Receiving…" : "Confirm Receive"}
            </Button>
          </div>
        </Modal>
      )}

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
