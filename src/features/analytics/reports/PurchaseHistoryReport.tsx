import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { Loader } from "../../../components/ui";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./PurchaseHistoryReport.scss";

const REPORT_NAME = "Supplier Purchase History";

interface PurchaseRow {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  totalAmount: number;
  itemCount: number;
}

interface PurchaseItemDetail {
  id: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  totalPrice: number;
  expiryDate: string | null;
}

interface PurchaseDetail extends PurchaseRow {
  items: PurchaseItemDetail[];
}

interface SupplierOption {
  id: string;
  name: string;
}

function formatDate(input?: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function mapRow(row: any): PurchaseRow {
  return {
    id: String(row.id ?? ""),
    purchaseNumber: row.purchase_number || "—",
    supplierId: row.supplier_id ? String(row.supplier_id) : "",
    supplierName: row.supplier_name || "—",
    purchaseDate: row.purchase_date,
    totalAmount: Number(row.total_amount) || 0,
    itemCount: Number(row.item_count) || 0,
  };
}

function mapDetail(raw: any): PurchaseDetail | null {
  if (!raw) return null;
  return {
    ...mapRow(raw),
    items: (raw.items ?? []).map((it: any) => ({
      id: String(it.id ?? ""),
      productName: it.product_name || "—",
      quantity: Number(it.quantity) || 0,
      purchasePrice: Number(it.purchase_price) || 0,
      totalPrice: Number(it.total_price) || 0,
      expiryDate: it.expiry_date ?? null,
    })),
  };
}

// Purchase History — every "Purchase" recorded from Product Inventory,
// rebuilt as a report (was previously its own page under Catalog →
// Inventory) so it picks up the same filter/export/pagination chrome every
// other report already uses, instead of a bespoke layout.
export default function PurchaseHistoryReport({
  onBack, category: reportCategory, categoryKey,
}: {
  onBack: () => void;
  category: string;
  categoryKey: string;
}) {
  const { formatAmount } = useCurrency();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(() => ({
    preset: "all_time",
    ...getDateRangePresetValue("all_time"),
  }));

  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Supplier filter options — same source Suppliers/Product Inventory use.
  useEffect(() => {
    api.get(INVENTORY.SUPPLIERS)
      .then((res) => {
        const list = res.data?.data ?? [];
        setSuppliers(list.map((s: any) => ({ id: String(s.id), name: s.name })));
      })
      .catch(() => { /* filter just stays empty */ });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params: Record<string, any> = { page: currentPage, limit: pageSize };
      if (debouncedSearch) params.search = debouncedSearch;
      // The backend takes a single supplier_id — the filter panel is
      // multi-select generically, but only the first pick is actually sent.
      if (supplierFilter.length > 0) params.supplier_id = supplierFilter[0];
      if (dateRange.startDate) params.date_from = dateRange.startDate;
      if (dateRange.endDate) params.date_to = dateRange.endDate;
      const res = await api.get(INVENTORY.PRODUCT_INVENTORY_PURCHASES, { params, signal: ctrl.signal });
      setRows((res.data?.data?.data ?? []).map(mapRow));
      setTotal(Number(res.data?.data?.total) || 0);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]);
        setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, supplierFilter, dateRange.startDate, dateRange.endDate, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, supplierFilter, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!detailFor) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    api.get(INVENTORY.PRODUCT_INVENTORY_PURCHASE_BY_ID(detailFor))
      .then((res) => { if (!cancelled) setDetail(mapDetail(res.data?.data)); })
      .catch(() => { if (!cancelled) setDetailFor(null); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailFor]);

  const filterFields: JiraFilterField[] = [
    { key: "supplier", label: "Supplier", options: suppliers.map((s) => ({ id: s.id, label: s.name })), searchable: true },
  ];
  const filterSelected = { supplier: supplierFilter };
  const handleFiltersApply = (next: Record<string, string[]>) => setSupplierFilter(next.supplier ?? []);

  const HEADERS = ["Supplier Number", "Supplier", "Purchase Date", "Products", "Total Amount"];
  const exportRows = () => rows.map((r) => [r.purchaseNumber, r.supplierName, formatDate(r.purchaseDate), r.itemCount, r.totalAmount]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={reportCategory} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title={REPORT_NAME}
              headers={HEADERS}
              rows={exportRows}
              reportId="purchase_history"
              filename="purchase-history"
              variant="button"
              csv
              dateRangeLabel={dateRange.startDate || dateRange.endDate ? `${dateRange.startDate ? formatDate(dateRange.startDate) : "…"} - ${dateRange.endDate ? formatDate(dateRange.endDate) : "…"}` : undefined}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(supplierFilter.length > 0
                  ? [`Supplier: ${suppliers.find((s) => s.id === supplierFilter[0])?.name ?? supplierFilter[0]}`]
                  : []),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <JiraFilterMenu fields={filterFields} selected={filterSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={1} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card">
            <div className="rp-sra-summary-val">{total}</div>
            <div className="rp-sra-summary-label">Total Purchases</div>
          </div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search by Supplier Number or supplier"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Supplier Number</th>
              <th>Supplier</th>
              <th>Purchase Date</th>
              <th>Products</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={5} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="rp-detail-empty-cell">No purchases found</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="phr-row" onClick={() => setDetailFor(r.id)}>
                <td className="fw-semibold">{r.purchaseNumber}</td>
                <td>{r.supplierName}</td>
                <td>{formatDate(r.purchaseDate)}</td>
                <td>{r.itemCount}</td>
                <td className="fw-semibold">{formatAmount(r.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      {detailFor && (
        <PurchaseDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetailFor(null)}
          formatAmount={formatAmount}
        />
      )}
    </div>
  );
}

// Same modal-chrome-duplicated-per-report convention as StaffHistoryModal/
// SaleDetailModal — each report modal owns its own scss rather than sharing.
function PurchaseDetailModal({
  detail, loading, onClose, formatAmount,
}: {
  detail: PurchaseDetail | null;
  loading: boolean;
  onClose: () => void;
  formatAmount: (n: number) => string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal-box phr-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Purchase Details{detail ? ` — ${detail.purchaseNumber}` : ""}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {loading || !detail ? (
          <Loader message="Loading purchase details..." />
        ) : (
          <>
            <div className="phr-detail-grid">
              <div><span>Supplier Number</span><strong>{detail.purchaseNumber}</strong></div>
              <div><span>Supplier</span><strong>{detail.supplierName}</strong></div>
              <div><span>Purchase Date</span><strong>{formatDate(detail.purchaseDate)}</strong></div>
              <div><span>Total Amount</span><strong>{formatAmount(detail.totalAmount)}</strong></div>
            </div>

            <div className="phr-table-wrap">
              <table className="phr-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Purchase Price</th>
                    <th>Expiry Date</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatAmount(item.purchasePrice)}</td>
                      <td>{formatDate(item.expiryDate)}</td>
                      <td className="fw-semibold">{formatAmount(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
