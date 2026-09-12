import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Dropdown } from "react-bootstrap";
import { Search, FileEarmarkText, FileEarmarkPdf, FileEarmarkExcel, FiletypeCsv, PlusLg, X, ThreeDotsVertical, PencilSquare, Trash3, BoxSeam } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchOrdersThunk, deleteOrderThunk, fetchOrderByIdThunk, receiveOrderThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Order } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { generatePurchaseOrderPdf } from "../utils/purchaseOrderPdf";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { downloadBlob } from "../../../utils/downloadBlob";
import { exportOrdersPDF, exportOrdersCSV, exportOrdersExcel } from "../utils/orderExport";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
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

// Same friendly copy PermissionGuard and the interceptor-driven global popup
// already use for a backend 403 — several of these actions (export, PDF
// download) are built entirely client-side with no backend call to deny,
// so this is the only enforcement point they actually have.
const friendlyPermissionDenied = (permKey: string) =>
  `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`;

const OrdersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const location = useLocation();
  const { formatAmount, currencySymbol } = useCurrency();
  const { showError, showSuccess, overlay } = useStatusOverlay();
  const currentSalon = useSelector(selectCurrentSalon);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // The list only ever holds summary fields per row — full line items (needed
  // for the PDF body table) only come back from the single-order endpoint, so
  // this fetches on demand rather than requiring every list row to carry them.
  const handleDownloadPdf = async (o: Order) => {
    if (!can("download_order_pdf")) {
      dispatch(showPermissionDenied(friendlyPermissionDenied("download_order_pdf")));
      return;
    }
    // export_pdf (System) is now a global master gate (Global Download
    // Switches ticket) — checked in addition to the module-specific key.
    if (!can("export_pdf")) {
      dispatch(showPermissionDenied(friendlyPermissionDenied("export_pdf")));
      return;
    }
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

  const goToNewOrder = () => {
    if (!can("create_order")) {
      dispatch(showPermissionDenied(friendlyPermissionDenied("create_order")));
      return;
    }
    navigate("/dashboard/inventory/orders/new-order");
  };

  const remainingByItem = useMemo(() => {
    const map = new Map<string, number>();
    (receiveOrder?.items ?? []).forEach((it) => map.set(it.id, Math.max(0, Number(it.qty) - Number(it.received_qty))));
    return map;
  }, [receiveOrder]);

  const openReceive = async (o: Order) => {
    if (!can("receive_order")) {
      dispatch(showPermissionDenied(friendlyPermissionDenied("receive_order")));
      return;
    }
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
    if (!can("cancel_order")) {
      dispatch(showPermissionDenied(friendlyPermissionDenied("cancel_order")));
      setDeleteTarget(null);
      return;
    }
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

  const [isExporting, setIsExporting] = useState(false);

  // Pulls every order matching the current search/status filter, not just
  // the page currently on screen — same page-looping approach as
  // SuppliersListPage/ProductsListPage's export, since INVENTORY.ORDERS is
  // server-paginated.
  const fetchAllOrdersForExport = useCallback(async (): Promise<Order[]> => {
    const all: Order[] = [];
    let page = 1;
    const limit = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await api.get(INVENTORY.ORDERS, {
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          page,
          limit,
        },
      });
      const chunk: Order[] = res.data?.data?.data ?? [];
      all.push(...chunk);
      if (chunk.length < limit) break;
      page += 1;
    }
    return all;
  }, [debouncedSearch, statusFilter]);

  const handleExport = useCallback(async (format: "pdf" | "csv" | "excel") => {
    const permKey = format === "pdf" ? "export_pdf" : format === "csv" ? "export_csv" : "export_excel";
    if (!can(permKey)) { dispatch(showPermissionDenied(friendlyPermissionDenied(permKey))); return; }
    setIsExporting(true);
    try {
      const all = await fetchAllOrdersForExport();
      if (format === "pdf") {
        downloadBlob(exportOrdersPDF(all, formatAmount), "orders.pdf", "application/pdf");
      } else if (format === "csv") {
        downloadBlob(exportOrdersCSV(all, formatAmount), "orders.csv", "text/csv;charset=utf-8;");
      } else {
        const blob = await exportOrdersExcel(all, formatAmount);
        downloadBlob(blob, "orders.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Order ${format.toUpperCase()} export failed:`, err);
      showError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [can, dispatch, fetchAllOrdersForExport, formatAmount, showError]);

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
        <div className="d-flex gap-2">
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="btn-options bg-white border-subtle d-flex align-items-center fw-medium"
              id="orders-options-dropdown"
              disabled={isExporting}
            >
              Options
            </Dropdown.Toggle>
            <Dropdown.Menu
              align="end"
              className="shadow-sm border-0 rounded-3 py-2"
              style={{ minWidth: "220px" }}
            >
              <Dropdown.Header className="px-3 py-1 text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>
                Export
              </Dropdown.Header>
              <Dropdown.Item onClick={() => handleExport("pdf")} disabled={isExporting} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkPdf size={16} /> Export All Data as PDF
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport("excel")} disabled={isExporting} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkExcel size={16} /> Export All Data as Excel
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport("csv")} disabled={isExporting} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FiletypeCsv size={16} /> Export All Data as CSV
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Button variant="dark" iconLeft={<PlusLg size={14} />} onClick={goToNewOrder}>
            New Order
          </Button>
        </div>
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
                              style={!can("receive_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
                            style={(!can("download_order_pdf") || !can("export_pdf")) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
                            style={!can("edit_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                            onClick={() => {
                              setOpenRowMenuId(null);
                              if (!can("edit_order")) {
                                dispatch(showPermissionDenied(friendlyPermissionDenied("edit_order")));
                                return;
                              }
                              navigate(`/dashboard/inventory/orders/${o.id}/edit`);
                            }}
                          >
                            <PencilSquare size={14} /> Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className="orders-kebab-item orders-kebab-item--danger"
                            style={!can("cancel_order") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                            onClick={() => {
                              setOpenRowMenuId(null);
                              if (!can("cancel_order")) {
                                dispatch(showPermissionDenied(friendlyPermissionDenied("cancel_order")));
                                return;
                              }
                              setDeleteTarget(o);
                            }}
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
