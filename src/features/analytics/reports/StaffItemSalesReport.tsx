import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import api from "../../../services/api/axios";
import { STAFF_ITEM_SALES_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
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

// Maps a row from the independent Staff Item Sales API
// (POST /api/report/staff-item-sales — reads sale_items directly, never
// the Appointment API) to the table's existing ItemRow shape.
function mapRow(row: any): ItemRow {
  return {
    staffName: row.staff_name || "Unknown",
    itemName: row.item_name || "—",
    quantity: Number(row.quantity) || 0,
    revenue: Number(row.revenue) || 0,
    date: row.date || "—",
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
  const [staffFilter,   setStaffFilter]   = useState("All");
  const [staffOptions,  setStaffOptions]  = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
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
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, [dispatch]);

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
      if (staffFilter !== "All") body.staff_id = staffFilter;
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
  }, [dateFrom, dateTo, itemType, staffFilter, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, itemType, staffFilter]);

  useEffect(() => {
    const close = () => setShowStaffDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const itemColLabel =
    itemType === "service"    ? "Service Name" :
    itemType === "product"    ? "Product Name" :
    itemType === "membership" ? "Membership Name" :
    "Package Name";

  const HEADERS = ["Staff Name", itemColLabel, "Quantity", `Revenue (${currencySymbol})`, "Date"];
  const exportRows = () => rows.map(r => [r.staffName, r.itemName, r.quantity, r.revenue, r.date]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-item-sales-${itemType}-${dateFrom}-${dateTo}`} csv />
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
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff Member</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {(staffOptions.find(o => o.value === staffFilter)?.label ?? "All").slice(0, 16)}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showStaffDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {staffOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(o.value); setShowStaffDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          {[
            { label: "Total Quantity Sold", value: stats.totalQty.toString() },
            { label: "Total Revenue",       value: formatAmount(stats.totalRev) },
            { label: "Top Item",            value: stats.topItem },
            { label: "Top Staff",           value: stats.topStaff },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className="rp-sra-summary-val rp-sis-val">{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff Name</th>
              <th>{itemColLabel}</th>
              <th>Quantity</th>
              <th>Revenue ({currencySymbol})</th>
              <th>Date</th>
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
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.itemName}</td>
                <td>{r.quantity}</td>
                <td>{formatAmount(r.revenue)}</td>
                <td>{r.date}</td>
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
