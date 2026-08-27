import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BoxSeam, CashCoin, PencilSquare } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuppliersThunk } from "../../../middleware/inventory/inventory.thunk";
import type { SupplierOrderRow, SupplierPaymentStatus } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import CreatePayoutModal from "../components/CreatePayoutModal";
import SupplierPaymentHistory from "../components/SupplierPaymentHistory";
import AddSupplierPage from "./AddSupplierPage";
import "../styles/PurchaseHistoryListPage.scss";
import "../styles/SuppliersListPage.scss";
import "../styles/SupplierDetailPage.scss";

const PAGE_SIZE = 10;

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const STATUS_LABEL: Record<SupplierPaymentStatus, string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
};

interface PurchaseItemDetail {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  total_price: number;
  expiry_date: string | null;
}

interface PurchaseDetail extends SupplierOrderRow {
  items: PurchaseItemDetail[];
}

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const { showError } = useStatusOverlay();
  const { suppliers } = useAppSelector((state) => state.inventory);

  const supplier = useMemo(() => suppliers.find((s) => s.id === id), [suppliers, id]);

  useEffect(() => {
    if (suppliers.length === 0) dispatch(fetchSuppliersThunk());
  }, [dispatch, suppliers.length]);

  const [tab, setTab] = useState<"orders" | "payments">("orders");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

  // Orders tab state — mirrors PurchaseHistoryListPage's list+detail pattern.
  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(PAGE_SIZE);

  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!id) return;
    setOrdersLoading(true);
    try {
      const res = await api.get(INVENTORY.PRODUCT_INVENTORY_PURCHASES, {
        params: { supplier_id: id, page: ordersPage, limit: ordersPageSize },
      });
      const data: SupplierOrderRow[] = res.data?.data?.data ?? [];
      // Stopgap: filter client-side too, in case the backend hasn't shipped
      // the supplier_id query param yet and returns the unfiltered list.
      setOrders(data.filter((o) => !o.supplier_id || o.supplier_id === id));
      setOrdersTotal(res.data?.data?.total ?? data.length);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Couldn't load orders");
      setOrders([]);
      setOrdersTotal(0);
    } finally {
      setOrdersLoading(false);
    }
  }, [id, ordersPage, ordersPageSize, showError]);

  useEffect(() => { if (tab === "orders") loadOrders(); }, [tab, loadOrders]);

  useEffect(() => {
    if (!detailFor) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    api.get(INVENTORY.PRODUCT_INVENTORY_PURCHASE_BY_ID(detailFor))
      .then((res) => { if (!cancelled) setDetail(res.data?.data ?? null); })
      .catch((err: any) => {
        if (cancelled) return;
        showError(err?.response?.data?.message || "Couldn't load order details");
        setDetailFor(null);
      })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailFor, showError]);

  if (!supplier) {
    return (
      <div className="supplier-detail-page">
        <Skeleton width="30%" height={24} />
      </div>
    );
  }

  const status = supplier.status ?? "paid";

  return (
    <div className="supplier-detail-page">
      <button className="supplier-detail-page__back" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Back to Suppliers
      </button>

      <header className="supplier-detail-page__header">
        <div>
          <h1>{supplier.name}</h1>
          <p>{[supplier.first_name, supplier.last_name].filter(Boolean).join(" ") || supplier.email || "—"}</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-dark" iconLeft={<PencilSquare size={14} />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="dark" iconLeft={<CashCoin size={14} />} onClick={() => setPayoutOpen(true)}>
            Create Payout
          </Button>
        </div>
      </header>

      <div className="supplier-detail-page__stats">
        <div className="stat-card">
          <span className="stat-label">Total Amount</span>
          <span className="stat-value">{formatAmount(supplier.total_purchase_amount ?? 0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Orders</span>
          <span className="stat-value">{supplier.pending_order_count ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Due Amount</span>
          <span className="stat-value">{formatAmount(supplier.due_amount ?? 0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Due Date</span>
          <span className="stat-value">{fmtDate(supplier.due_date)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Status</span>
          <span className={`supplier-status-badge supplier-status-badge--${status}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      <div className="supplier-detail-page__tabs">
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          Orders
        </button>
        <button className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}>
          Payments
        </button>
      </div>

      {tab === "orders" ? (
        <div className="phist-page">
          <table className="phist-table">
            <thead>
              <tr>
                <th>Supplier Number</th>
                <th>Purchase Date</th>
                <th className="phist-num">Products</th>
                <th className="phist-num">Total Amount</th>
                <th className="phist-num">Amount Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width="60%" height={13} /></td>
                    <td><Skeleton width="50%" height={13} /></td>
                    <td><Skeleton width="30%" height={13} /></td>
                    <td><Skeleton width="50%" height={13} /></td>
                    <td><Skeleton width="50%" height={13} /></td>
                    <td><Skeleton width="40%" height={13} /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="phist-empty-cell">
                    <EmptyState icon={<BoxSeam size={32} />} title="No orders yet for this supplier." />
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="phist-row" onClick={() => setDetailFor(o.id)}>
                    <td className="fw-semibold">{o.purchase_number}</td>
                    <td>{fmtDate(o.purchase_date)}</td>
                    <td className="phist-num">{o.item_count}</td>
                    <td className="phist-num fw-semibold">{formatAmount(Number(o.total_amount) || 0)}</td>
                    <td className="phist-num">{formatAmount(Number(o.amount_due) || 0)}</td>
                    <td>
                      <span className={`supplier-status-badge supplier-status-badge--${o.payment_status}`}>
                        {STATUS_LABEL[o.payment_status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {ordersTotal > 0 && (
            <Pagination
              currentPage={ordersPage}
              pageSize={ordersPageSize}
              totalItems={ordersTotal}
              onPageChange={setOrdersPage}
              onPageSizeChange={setOrdersPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              className="phist-pagination"
            />
          )}
        </div>
      ) : (
        <SupplierPaymentHistory supplierId={supplier.id} refreshKey={paymentsRefreshKey} />
      )}

      {detailFor && (
        <Modal show onClose={() => setDetailFor(null)} title="Order Details" size="lg">
          {detailLoading || !detail ? (
            <div className="phist-detail-loading">Loading…</div>
          ) : (
            <>
              <div className="phist-detail-head">
                <div>
                  <span className="phist-detail-label">Supplier Number</span>
                  <span className="phist-detail-value">{detail.purchase_number}</span>
                </div>
                <div>
                  <span className="phist-detail-label">Purchase Date</span>
                  <span className="phist-detail-value">{fmtDate(detail.purchase_date)}</span>
                </div>
                <div>
                  <span className="phist-detail-label">Total Amount</span>
                  <span className="phist-detail-value">{formatAmount(Number(detail.total_amount) || 0)}</span>
                </div>
              </div>

              <table className="phist-table--compact">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="phist-num">Quantity</th>
                    <th className="phist-num">Purchase Price</th>
                    <th>Expiry Date</th>
                    <th className="phist-num">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td className="phist-num">{item.quantity}</td>
                      <td className="phist-num">{formatAmount(Number(item.purchase_price) || 0)}</td>
                      <td>{fmtDate(item.expiry_date)}</td>
                      <td className="phist-num fw-semibold">{formatAmount(Number(item.total_price) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}

      <CreatePayoutModal
        show={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        supplierId={supplier.id}
        onSuccess={() => {
          dispatch(fetchSuppliersThunk());
          setPaymentsRefreshKey((k) => k + 1);
        }}
      />

      {editOpen && (
        <div className="supplier-panel-overlay" onClick={() => setEditOpen(false)}>
          <div className="supplier-panel" onClick={(e) => e.stopPropagation()}>
            <AddSupplierPage
              panelMode
              supplierId={supplier.id}
              onClose={() => setEditOpen(false)}
              onSaved={() => dispatch(fetchSuppliersThunk())}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetailPage;
