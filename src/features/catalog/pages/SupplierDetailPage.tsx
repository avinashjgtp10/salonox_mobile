import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BoxSeam, CashCoin, CloudUpload, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import { fetchSupplierByIdThunk, fetchSupplierProductsThunk } from "../../../middleware/inventory/inventory.thunk";
import type { SupplierOrderRow, SupplierPaymentStatus, SupplierWithBalance, SupplierProduct } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import CreatePayoutModal from "../components/CreatePayoutModal";
import SupplierPaymentHistory from "../components/SupplierPaymentHistory";
import ImportSupplierCatalogModal from "../components/ImportSupplierCatalogModal";
import ResolveSupplierProductRow from "../components/ResolveSupplierProductRow";
import "../styles/PurchaseHistoryTable.scss";
import "../styles/SuppliersListPage.scss";
import "../styles/SupplierDetailPage.scss";
import "../styles/ImportSupplierCatalogModal.scss";

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

interface Props {
  // Popup mode: an explicit id + onClose, used when opened as a popup from
  // SuppliersListPage.tsx instead of navigated to as its own route. Omitted
  // when rendered at its normal /suppliers/:id route.
  id?: string;
  onClose?: () => void;
}

const SupplierDetailPage: React.FC<Props> = ({ id: propId, onClose }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = propId ?? routeId;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const { formatAmount } = useCurrency();
  const { showError } = useStatusOverlay();
  // Same reusable denyPerm helper pattern as OrderDetailPage.tsx, instead of
  // inlining the permission-denied message at each call site.
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));
  // Fetched directly by id rather than found in the (now paginated)
  // suppliers list — see fetchSupplierByIdThunk for why.
  const [supplier, setSupplier] = useState<SupplierWithBalance | null>(null);
  const loadSupplier = useCallback(() => {
    if (!id) return;
    dispatch(fetchSupplierByIdThunk(id)).unwrap()
      .then((s) => setSupplier(s))
      .catch(() => {});
  }, [dispatch, id]);

  useEffect(() => { loadSupplier(); }, [loadSupplier]);

  const [tab, setTab] = useState<"orders" | "payments" | "catalog">("orders");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

  // Catalog tab — the supplier_products list built via Import Supplier
  // Catalog. Deliberately no "Suggested Products"-style add-to-order action
  // here (this page has no order to add into); it's just import + resolve.
  const [catalogRows, setCatalogRows] = useState<SupplierProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [importCatalogOpen, setImportCatalogOpen] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!id) return;
    setCatalogLoading(true);
    try {
      const rows = await dispatch(fetchSupplierProductsThunk({ supplierId: id })).unwrap();
      setCatalogRows(rows);
    } catch (err: any) {
      setCatalogError(typeof err === "string" ? err : "Couldn't load supplier catalog");
    } finally {
      setCatalogLoading(false);
    }
  }, [id, dispatch]);

  useEffect(() => { if (tab === "catalog") loadCatalog(); }, [tab, loadCatalog]);

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

  const isPopup = !!onClose;

  if (!supplier) {
    const loadingBody = (
      <div className="supplier-detail-page">
        <Skeleton width="30%" height={24} />
      </div>
    );
    if (!isPopup) return loadingBody;
    return (
      <div className="sdp-popup-overlay" onClick={onClose}>
        <div className="sdp-popup-panel" onClick={(e) => e.stopPropagation()}>{loadingBody}</div>
      </div>
    );
  }

  const status = supplier.status ?? "paid";

  const content = (
    <div className="supplier-detail-page">
      {isPopup ? (
        <button className="sdp-popup-close" onClick={onClose}><X size={20} /></button>
      ) : (
        <button className="supplier-detail-page__back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back to Suppliers
        </button>
      )}

      <header className="supplier-detail-page__header">
        <div>
          <h1>{supplier.name}</h1>
          <p>{supplier.contact_person || [supplier.first_name, supplier.last_name].filter(Boolean).join(" ") || supplier.email || "—"}</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-dark"
            size="sm"
            iconLeft={<CloudUpload size={14} />}
            onClick={() => setImportCatalogOpen(true)}
          >
            Import Supplier Catalog
          </Button>
          <Button
            variant="outline-dark"
            size="sm"
            iconLeft={<CashCoin size={14} />}
            onClick={() => {
              if (!can("supplier_payout")) { denyPerm("supplier_payout"); return; }
              setPayoutOpen(true);
            }}
            style={can("supplier_payout") ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
          >
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
        <button className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}>
          Catalog
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
      ) : tab === "payments" ? (
        <SupplierPaymentHistory supplierId={supplier.id} refreshKey={paymentsRefreshKey} />
      ) : (
        <div className="phist-page phist-page--tab">
          {catalogLoading ? (
            <Skeleton width="100%" height={160} />
          ) : catalogError ? (
            <p className="text-muted small mb-0">{catalogError}</p>
          ) : catalogRows.length === 0 ? (
            <EmptyState
              icon={<BoxSeam size={32} />}
              title="No catalog yet for this supplier"
              description="Import their product list to reuse it on every order for this supplier."
            />
          ) : (
            <>
              {catalogRows.filter((r) => r.match_status === "matched" && !r.ignored).length > 0 && (
                <div className="mb-3">
                  <p className="iscm-needs-attention-title mb-2">
                    Ready to use ({catalogRows.filter((r) => r.match_status === "matched" && !r.ignored).length})
                  </p>
                  <div className="rspr-list">
                    {catalogRows.filter((r) => r.match_status === "matched" && !r.ignored).map((row) => (
                      <div key={row.id} className="rspr-row">
                        <div className="rspr-info">
                          <span className="rspr-name">{row.linked_product_name || row.name}</span>
                          <span className="rspr-sub">
                            {[row.barcode, row.price != null ? `₹${row.price}` : null].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catalogRows.filter((r) => r.match_status === "unmatched" && !r.ignored).length > 0 && (
                <div className="iscm-needs-attention">
                  <p className="iscm-needs-attention-title">
                    Needs attention ({catalogRows.filter((r) => r.match_status === "unmatched" && !r.ignored).length})
                  </p>
                  <p className="iscm-needs-attention-hint">
                    These items couldn't be matched to an existing product — link them to one, create a new product, or ignore them.
                  </p>
                  {catalogRows.filter((r) => r.match_status === "unmatched" && !r.ignored).map((row) => (
                    <ResolveSupplierProductRow
                      key={row.id}
                      supplierId={supplier.id}
                      row={row}
                      onResolved={(updated) => setCatalogRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
                      onError={setCatalogError}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ImportSupplierCatalogModal
        show={importCatalogOpen}
        onClose={() => setImportCatalogOpen(false)}
        onSuccess={loadCatalog}
        supplierId={supplier.id}
      />

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
          loadSupplier();
          setPaymentsRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );

  if (!isPopup) return content;

  return (
    <div className="sdp-popup-overlay" onClick={onClose}>
      <div className="sdp-popup-panel" onClick={(e) => e.stopPropagation()}>{content}</div>
    </div>
  );
};

export default SupplierDetailPage;
