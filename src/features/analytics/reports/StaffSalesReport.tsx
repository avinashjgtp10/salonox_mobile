import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF_SALES_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import MultiSelectCheckbox from "../../../components/ui/MultiSelectCheckbox";
import { Pagination, DateRangePicker } from "../../../components/ui";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { useCurrency } from "../../../hooks/useCurrency";
import SaleDetailModal from "./SaleDetailModal";
import StaffHistoryModal from "./StaffHistoryModal";
import "./StaffSalesReport.scss";

const REPORT_NAME = "Staff Sales";

interface StaffSaleRow {
  id: string;
  staffId: string | null;
  staffName: string;
  // >1 means this sale had multiple staff attributed across its line items
  // (e.g. one staff on the service, another on a retail product) —
  // staffName above only ever shows the first one found.
  staffCount: number;
  isUnbilled: boolean;
  contact: string;
  itemType: string;
  description: string;
  totalSales: number;
  paid: number;
  due: number;
  commission: number;
  paymentMode: string;
  status: string;
  date: string;
}

// dd/MM/yyyy, consistently across the table and every export.
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Staff Sales API
// (POST /api/report/staff-sales — reads sales/sale_items/payments directly,
// never the Appointment API) to the table's StaffSaleRow shape.
function mapRow(row: any): StaffSaleRow {
  return {
    id: String(row.id ?? ""),
    staffId: row.staff_id ? String(row.staff_id) : null,
    staffName: row.staff_name || "—",
    staffCount: Number(row.staff_count) || 1,
    isUnbilled: Boolean(row.is_unbilled),
    contact: row.client_phone || "—",
    itemType: row.item_types || "—",
    description: row.item_description || "—",
    totalSales: Number(row.price) || 0,
    paid: Number(row.paid_amount) || 0,
    due: Number(row.due_amount) || 0,
    commission: Number(row.commission_amount) || 0,
    paymentMode: row.payment_method || "—",
    status: row.status || "booked",
    date: row.created_at ? formatDate(row.created_at) : "—",
  };
}

export default function StaffSalesReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,       setDateFrom]       = useState(monthStart);
  const [dateTo,         setDateTo]         = useState(today);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<{ id: string; label: string }[]>([]);
  const [search,         setSearchInput]    = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading,        setLoading]        = useState(false);
  const [rows,           setRows]           = useState<StaffSaleRow[]>([]);
  const [total,          setTotal]          = useState(0);
  const [stats,          setStats]          = useState({
    totalSale: 0, totalPaid: 0, totalDue: 0, totalCommission: 0,
    serviceRevenue: 0, productRevenue: 0, packageRevenue: 0, membershipRevenue: 0,
  });
  const [currentPage,    setCurrentPage]    = useState(1);
  const [pageSize,       setPageSize]       = useState(25);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedStaff,  setSelectedStaff]  = useState<{ id: string; name: string } | null>(null);
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

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(STAFF_SALES_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalSale: Number(s.total_sale) || 0,
        totalPaid: Number(s.total_paid) || 0,
        totalDue: Number(s.total_due) || 0,
        totalCommission: Number(s.total_commission) || 0,
        serviceRevenue: Number(s.service_revenue) || 0,
        productRevenue: Number(s.product_revenue) || 0,
        packageRevenue: Number(s.package_revenue) || 0,
        membershipRevenue: Number(s.membership_revenue) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalSale: 0, totalPaid: 0, totalDue: 0, totalCommission: 0, serviceRevenue: 0, productRevenue: 0, packageRevenue: 0, membershipRevenue: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, debouncedSearch]);

  const HEADERS = ["Staff Name", "Contact", "Item Type", "Description", `Total Sales (${currencySymbol})`, `Paid (${currencySymbol})`, `Due Amount (${currencySymbol})`, `Commission (${currencySymbol})`, "Payment Mode", "Status", "Date"];
  const exportRows = () => rows.map(r => [r.staffName, r.contact, r.itemType, r.description, r.totalSales, r.paid, r.due, r.commission, r.paymentMode, r.status, r.date]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-sales-${dateFrom}-${dateTo}`} csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <DateRangePicker startDate={dateFrom} endDate={dateTo} onChange={(s, e) => { setDateFrom(s); setDateTo(e); }} showQuickPresets />
        </div>
        <MultiSelectCheckbox
          label="Staff Member"
          containerClass="rp-detail-filter-group"
          options={staffOptions}
          selected={staffFilterIds}
          onChange={setStaffFilterIds}
          placeholder="All staff"
        />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          {[
            { label: "Total Sales",      value: formatAmount(stats.totalSale) },
            { label: "Total Paid",       value: formatAmount(stats.totalPaid) },
            { label: "Total Due",        value: formatAmount(stats.totalDue) },
            { label: "Total Commission", value: formatAmount(stats.totalCommission) },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className="rp-sra-summary-val rp-ss-val--total">{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          {[
            { label: "Service Revenue",    value: formatAmount(stats.serviceRevenue) },
            { label: "Product Revenue",    value: formatAmount(stats.productRevenue) },
            { label: "Package Revenue",    value: formatAmount(stats.packageRevenue) },
            { label: "Membership Revenue", value: formatAmount(stats.membershipRevenue) },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Staff, client name or phone" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff Name</th>
              <th>Contact</th>
              <th>Item Type</th>
              <th>Description</th>
              <th>Total Sales ({currencySymbol})</th>
              <th>Paid ({currencySymbol})</th>
              <th>Due Amount ({currencySymbol})</th>
              <th>Commission ({currencySymbol})</th>
              <th>Payment Mode</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={12} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="rp-detail-empty-cell">No staff sales data available for the selected date/filter.</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={r.id || i}
                className={!r.isUnbilled ? "rp-ss-clickable-row" : undefined}
                title={!r.isUnbilled ? "Click to view full staff/item breakdown for this sale" : undefined}
                onClick={() => { if (!r.isUnbilled && r.id) setSelectedSaleId(r.id); }}
              >
                <td className="rp-ss-idx">#{(currentPage - 1) * pageSize + i + 1}</td>
                <td className="fw-semibold">
                  <span
                    className={r.staffId ? "rp-detail-link" : undefined}
                    title={r.staffId ? `View ${r.staffName}'s sales history` : undefined}
                    onClick={e => {
                      if (!r.staffId) return;
                      e.stopPropagation();
                      setSelectedStaff({ id: r.staffId, name: r.staffName });
                    }}
                  >
                    {r.staffName}
                  </span>
                  {r.staffCount > 1 && <span className="rp-ss-multi-staff-badge">+{r.staffCount - 1} more</span>}
                </td>
                <td>{r.contact}</td>
                <td>{r.itemType}</td>
                <td>{r.description}</td>
                <td>{formatAmount(r.totalSales)}</td>
                <td>{formatAmount(r.paid)}</td>
                <td>{formatAmount(r.due)}</td>
                <td>{formatAmount(r.commission)}</td>
                <td>{r.paymentMode}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedSaleId && (
        <SaleDetailModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
      )}

      {selectedStaff && (
        <StaffHistoryModal
          staffId={selectedStaff.id}
          staffName={selectedStaff.name}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </div>
  );
}
