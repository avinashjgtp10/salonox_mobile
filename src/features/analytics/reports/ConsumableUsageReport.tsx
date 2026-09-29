import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import type { AppDispatch, RootState } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./ConsumableUsageReport.scss";

const REPORT_NAME = "Consumable Usage";

interface UsageRow {
  productId: string;
  category: string;
  product: string;
  unit: string;
  consumed: number;
  adjusted: number;
  difference: number;
  remark: string;
}

export default function ConsumableUsageReport({ onBack, category: reportCategory, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentSalon, branches } = useSelector((s: RootState) => s.salon);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [search,      setSearch]      = useState("");
  const [allRows,     setAllRows]     = useState<UsageRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const branchId = useMemo(
    () => (branches as any[]).find(b => b.is_main === true)?.id ?? (branches as any[])[0]?.id ?? "",
    [branches],
  );

  useEffect(() => {
    if (currentSalon?.id) dispatch(fetchBranchesThunk(currentSalon.id));
  }, [dispatch, currentSalon?.id]);

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await api.get(INVENTORY.STOCK_RECONCILIATION, { params: { branch_id: branchId }, signal: ctrl.signal });
      const list: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      const rows: UsageRow[] = list
        .map((r: any) => ({
          productId: String(r.product_id),
          category: r.category_name || "Uncategorized",
          product: r.item_name,
          unit: r.unit || "—",
          consumed: Number(r.actual_consumable) || 0,
          adjusted: Number(r.adjust_consumable) || 0,
          difference: Number(r.consumable_difference) || 0,
          remark: r.remark || "—",
        }))
        .filter(r => r.consumed > 0 || r.adjusted > 0);
      setAllRows(rows);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(allRows.map(r => r.category))).map(c => ({ id: c, label: c })),
    [allRows],
  );

  const rows = useMemo(() => {
    let r = categoryFilter.length > 0 ? allRows.filter(x => categoryFilter.includes(x.category)) : allRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => x.product.toLowerCase().includes(q));
    }
    return r;
  }, [allRows, categoryFilter, search]);

  useEffect(() => { setCurrentPage(1); }, [rows]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "category", label: "Category", options: categoryOptions, searchable: true },
  ], [categoryOptions]);

  const filterMenuSelected = useMemo(() => ({ category: categoryFilter }), [categoryFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setCategoryFilter(next.category ?? []);
  };

  const totalConsumed = rows.reduce((s, r) => s + r.consumed, 0);
  const uniqueCategories = new Set(rows.map(r => r.category)).size;

  const HEADERS = ["Product", "Category", "Unit", "Consumed", "Adjusted", "Difference", "Remark"];
  const exportRows = () => rows.map(r => [r.product, r.category, r.unit, r.consumed, r.adjusted, r.difference, r.remark]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={reportCategory} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename="consumable-usage" variant="button" csv reportId="consumable_usage" />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={3} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{rows.length}</div><div className="rp-sra-summary-label">Products Used</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalConsumed.toLocaleString()}</div><div className="rp-sra-summary-label">Total Quantity Consumed</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{uniqueCategories}</div><div className="rp-sra-summary-label">Categories</div></div>
        </div>
      )}

      <div className="rp-detail-drag-hint">
        Products used up by staff during services (back-bar stock) — logged separately from client sales, all-time totals for the main branch. Not date-range filterable yet.
      </div>

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Product name" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Product</th><th>Category</th><th>Unit</th><th>Consumed</th><th>Adjusted</th><th>Difference</th><th>Remark</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={7} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No consumable usage recorded</td></tr>
            ) : paged.map(r => (
              <tr key={r.productId}>
                <td className="fw-semibold">{r.product}</td>
                <td>{r.category}</td>
                <td>{r.unit}</td>
                <td>{r.consumed.toLocaleString()}</td>
                <td>{r.adjusted.toLocaleString()}</td>
                <td className={r.difference !== 0 ? "rp-cu-diff" : undefined}>{r.difference.toLocaleString()}</td>
                <td>{r.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
