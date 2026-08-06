import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF_ITEM_SALES_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, DateRangePicker, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./StaffItemSalesReport.scss";

const REPORT_NAME = "Service, Product, Membership & Package Sold by Staff";

type ItemType = "service" | "product" | "membership" | "package";

interface ItemRow {
  staffName: string;
  itemName: string;
  quantity: number;
  revenue: number;
  date: string;
}

// dd/MM/yyyy, consistently across the table and every export (CSV/Excel/PDF
// all read the same r.date via exportRows).
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Staff Item Sales API
// (POST /api/report/staff-item-sales — reads sale_items directly, never
// the Appointment API) to the table's existing ItemRow shape.
function mapRow(row: any): ItemRow {
  return {
    staffName: row.staff_name || "Unknown",
    itemName: row.item_name || "—",
    quantity: Number(row.quantity) || 0,
    revenue: Number(row.revenue) || 0,
    date: row.date ? formatDate(row.date) : "—",
  };
}

export default function StaffItemSalesReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,      setDateFrom]      = useState(monthStart);
  const [dateTo,        setDateTo]        = useState(today);
  const [itemType,      setItemType]      = useState<ItemType>("service");
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions,  setStaffOptions]  = useState<{ id: string; label: string }[]>([]);
  const [search,        setSearchInput]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [rows,          setRows]          = useState<ItemRow[]>([]);
  const [total,         setTotal]         = useState(0);
  const [stats,         setStats]         = useState({ totalQty: 0, totalRev: 0, topItem: "—", topStaff: "—" });
  const [currentPage,   setCurrentPage]   = useState(1);
  const [pageSize,      setPageSize]      = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        id: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.id);
      setStaffOptions(opts);
    }).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo, item_type: itemType,
        page: currentPage, limit: pageSize,
      };
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(STAFF_ITEM_SALES_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalQty: Number(s.total_quantity) || 0,
        totalRev: Number(s.total_revenue) || 0,
        topItem: s.top_item || "—",
        topStaff: s.top_staff || "—",
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalQty: 0, totalRev: 0, topItem: "—", topStaff: "—" });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, itemType, staffFilterIds, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, itemType, staffFilterIds, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff Member", options: staffOptions, searchable: true },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({ staff: staffFilterIds }), [staffFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
  };

  const itemColLabel =
    itemType === "service"    ? "Service Name" :
    itemType === "product"    ? "Product Name" :
    itemType === "membership" ? "Membership Name" :
    "Package Name";

  const searchPlaceholder =
    itemType === "service"    ? "Staff or service name" :
    itemType === "product"    ? "Staff or product name" :
    itemType === "membership" ? "Staff or membership name" :
    "Staff or package name";

  const HEADERS = ["Date", "Staff Name", itemColLabel, "Quantity", `Revenue (${currencySymbol})`];
  const exportRows = () => rows.map(r => [r.date, r.staffName, r.itemName, r.quantity, r.revenue]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-item-sales-${itemType}-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
        <div className="rp-detail-tab-bar">
          {(["service", "product", "membership", "package"] as ItemType[]).map(t => (
            <span key={t} className={`rp-detail-tab rp-sis-type-tab ${itemType === t ? "active" : ""}`}
              onClick={() => setItemType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(s, e) => { setDateFrom(s); setDateTo(e); }} showQuickPresets />
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          {[
            { label: "Total Quantity Sold", value: stats.totalQty.toString() },
            { label: "Total Revenue",       value: formatAmount(stats.totalRev) },
            { label: "Top Selling Item",    value: stats.topItem },
            { label: "Top Performing Staff", value: stats.topStaff },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className="rp-sra-summary-val rp-sis-val">{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder={searchPlaceholder} value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Staff Name</th>
              <th>{itemColLabel}</th>
              <th>Quantity</th>
              <th>Revenue ({currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No {itemType} sales data available</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i}>
                <td className="rp-sis-idx">#{(currentPage - 1) * pageSize + i + 1}</td>
                <td>{r.date}</td>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.itemName}</td>
                <td>{r.quantity}</td>
                <td>{formatAmount(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
