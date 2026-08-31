import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, BoxSeam, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Pagination from "../../../components/ui/Pagination";
import Skeleton from "../../../components/ui/Skeleton";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import "../styles/PurchaseHistoryListPage.scss";
import "../styles/StockLedgerPage.scss";

interface PurchaseRow {
  id: string;
  purchase_number: string;
  supplier_name: string | null;
  purchase_date: string;
  total_amount: number;
  item_count: number;
}

interface PurchaseItemDetail {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  total_price: number;
  expiry_date: string | null;
}

interface PurchaseDetail extends PurchaseRow {
  items: PurchaseItemDetail[];
}

const PAGE_SIZE = 10;

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

// Purchase History — every "Purchase" recorded from Product Inventory. A
// purchase here is applied to stock immediately on save, so unlike a
// traditional PO list there's no Draft/Ordered/Received lifecycle to track.
const PurchaseHistoryListPage: React.FC = () => {
  const { formatAmount } = useCurrency();
  const { showError, overlay } = useStatusOverlay();

  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(INVENTORY.PRODUCT_INVENTORY_PURCHASES, {
        params: { search: debouncedSearch || undefined, page, limit: pageSize },
      });
      setRows(res.data?.data?.data ?? []);
      setTotal(res.data?.data?.total ?? 0);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Couldn't load purchase history");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, showError]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!detailFor) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    api.get(INVENTORY.PRODUCT_INVENTORY_PURCHASE_BY_ID(detailFor))
      .then((res) => { if (!cancelled) setDetail(res.data?.data ?? null); })
      .catch((err: any) => {
        if (cancelled) return;
        showError(err?.response?.data?.message || "Couldn't load purchase details");
        setDetailFor(null);
      })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailFor, showError]);

  const emptyMessage = useMemo(
    () => (debouncedSearch ? "No purchases match your search." : "No purchases yet. Record your first purchase from Product Inventory."),
    [debouncedSearch],
  );

  return (
    <div className="phist-page">
      {overlay}
      <header className="phist-page__header">
        <div>
          <h1>
            Purchase History
            <span className="phist-count">{total}</span>
          </h1>
          <p>Every purchase recorded from Product Inventory, with its Supplier Number and line items.</p>
        </div>
      </header>

      <div className="phist-page__controls">
        <Input
          containerClass="search-box mb-0"
          type="text"
          placeholder="Search by Supplier Number or supplier"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
        />
      </div>

      <main className="phist-page__content">
        <table className="phist-table">
          <thead>
            <tr>
              <th>Supplier Number</th>
              <th>Supplier</th>
              <th>Purchase Date</th>
              <th className="phist-num">Products</th>
              <th className="phist-num">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width="60%" height={13} /></td>
                  <td><Skeleton width="70%" height={13} /></td>
                  <td><Skeleton width="50%" height={13} /></td>
                  <td><Skeleton width="30%" height={13} /></td>
                  <td><Skeleton width="50%" height={13} /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="phist-empty-cell">
                  <EmptyState icon={<BoxSeam size={32} />} title={emptyMessage} />
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="phist-row" onClick={() => setDetailFor(r.id)}>
                  <td className="fw-semibold">{r.purchase_number}</td>
                  <td>{r.supplier_name || "—"}</td>
                  <td>{fmtDate(r.purchase_date)}</td>
                  <td className="phist-num">{r.item_count}</td>
                  <td className="phist-num fw-semibold">{formatAmount(Number(r.total_amount) || 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>

      {total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          className="phist-pagination"
        />
      )}

      <PurchaseDetailDrawer
        detail={detail}
        loading={detailLoading}
        isOpen={!!detailFor}
        onClose={() => setDetailFor(null)}
        formatAmount={formatAmount}
      />
    </div>
  );
};

// Right-side slide-in panel — reuses StockLedgerPage's sl-detail-overlay/
// sl-detail-drawer structure so row-click details are consistent across the
// catalog module, instead of a centered Modal.
function PurchaseDetailDrawer({
  detail, loading, isOpen, onClose, formatAmount,
}: {
  detail: PurchaseDetail | null;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
  formatAmount: (n: number) => string;
}) {
  return (
    <div className={`sl-detail-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="sl-detail-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="sl-detail-drawer__header">
          <div className="title-section">
            <h3>Purchase Details</h3>
            <span>{detail?.purchase_number}</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="sl-detail-drawer__body">
          {loading || !detail ? (
            <div className="phist-detail-loading">Loading…</div>
          ) : (
            <>
              <div className="sl-detail-grid">
                <div><span>Supplier Number</span><strong>{detail.purchase_number}</strong></div>
                <div><span>Supplier</span><strong>{detail.supplier_name || "—"}</strong></div>
                <div><span>Purchase Date</span><strong>{fmtDate(detail.purchase_date)}</strong></div>
                <div><span>Total Amount</span><strong>{formatAmount(Number(detail.total_amount) || 0)}</strong></div>
              </div>

              <hr className="sl-detail-divider" />

              <h6 className="sl-detail-heading">Products</h6>
              <div className="phist-detail-items">
                {detail.items.map((item) => (
                  <div className="phist-detail-item" key={item.id}>
                    <div className="phist-detail-item__name">{item.product_name}</div>
                    <div className="sl-detail-grid">
                      <div><span>Quantity</span><strong>{item.quantity}</strong></div>
                      <div><span>Purchase Price</span><strong>{formatAmount(Number(item.purchase_price) || 0)}</strong></div>
                      <div><span>Expiry Date</span><strong>{fmtDate(item.expiry_date)}</strong></div>
                      <div><span>Line Total</span><strong>{formatAmount(Number(item.total_price) || 0)}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PurchaseHistoryListPage;
