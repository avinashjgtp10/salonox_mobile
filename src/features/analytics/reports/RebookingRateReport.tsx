import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REBOOKING_RATE_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import Select from "../../../components/ui/Select";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, DateRangeFilter, getDateRangePresetValue, JiraFilterMenu } from "../../../components/ui";
import type { DateRangeFilterValue } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Rebooking Rate";
const DEFAULT_REBOOKING_DAYS = 45;

const SORT_OPTIONS = [
  { label: "None", value: "None" },
  { label: "Highest Rebooking Rate", value: "rate_desc" },
  { label: "Lowest Rebooking Rate", value: "rate_asc" },
];

interface RebookingRateRow {
  staffId: string;
  staffName: string;
  totalVisits: number;
  rebookedVisits: number;
  rebookingRate: number;
}

function mapRow(row: any): RebookingRateRow {
  return {
    staffId: row.staff_id ? String(row.staff_id) : "",
    staffName: row.staff_name || "—",
    totalVisits: Number(row.total_visits) || 0,
    rebookedVisits: Number(row.rebooked_visits) || 0,
    rebookingRate: Number(row.rebooking_rate) || 0,
  };
}

export default function RebookingRateReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  // Rebooking window in days — manually entered by the user (no preset
  // default shown), same commit-on-blur/Enter pattern as Lost Customers'
  // "Inactive for (days)" field.
  const [rebookingDaysInput, setRebookingDaysInput] = useState("");
  const [rebookingDays,      setRebookingDaysApplied] = useState(DEFAULT_REBOOKING_DAYS);
  const [staffOptions,   setStaffOptions]   = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [search,         setSearchInput]    = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortFilter, setSortFilter] = useState("None");
  const [loading,        setLoading]        = useState(false);
  const [rows,           setRows]           = useState<RebookingRateRow[]>([]);
  const [total,          setTotal]          = useState(0);
  const [stats,          setStats]          = useState({
    totalVisits: 0, rebookedVisits: 0, overallRebookingRate: 0, staffCount: 0,
  });
  const [currentPage,    setCurrentPage]    = useState(1);
  const [pageSize,       setPageSize]       = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

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

  const commitRebookingDays = () => {
    const n = Math.max(1, parseInt(rebookingDaysInput, 10) || DEFAULT_REBOOKING_DAYS);
    setRebookingDaysInput(String(n));
    setRebookingDaysApplied(n);
  };

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        rebooking_days: rebookingDays,
        page: currentPage, limit: pageSize,
      };
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (debouncedSearch) body.search = debouncedSearch;
      if (sortFilter !== "None") body.sort = sortFilter;
      const res = await api.post(REBOOKING_RATE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalVisits: Number(s.total_visits) || 0,
        rebookedVisits: Number(s.rebooked_visits) || 0,
        overallRebookingRate: Number(s.overall_rebooking_rate) || 0,
        staffCount: Number(s.staff_count) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalVisits: 0, rebookedVisits: 0, overallRebookingRate: 0, staffCount: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, rebookingDays, staffFilterIds, debouncedSearch, sortFilter, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, rebookingDays, staffFilterIds, debouncedSearch, sortFilter]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
  }), [staffFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
  };

  const HEADERS = ["Staff Name", "Total Visits", "Rebooked Visits", "Rebooking Rate (%)"];
  const exportRows = () => rows.map(r => [r.staffName, r.totalVisits, r.rebookedVisits, r.rebookingRate]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title={REPORT_NAME}
              headers={HEADERS}
              rows={exportRows}
              reportId="rebooking_rate"
              filename={`rebooking-rate-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${dateFrom} - ${dateTo}`}
              filterLines={[
                `Rebooking Window: ${rebookingDays} days`,
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
              ]}
              summaryLines={[
                `Total Visits: ${stats.totalVisits}`,
                `Rebooked Visits: ${stats.rebookedVisits}`,
                `Overall Rebooking Rate: ${stats.overallRebookingRate}%`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="rp-detail-filter-group" style={{ minWidth: 140 }}>
          <label htmlFor="rebooking-days-input" className="rp-detail-filter-label">Rebooking Window (days)</label>
          <input
            id="rebooking-days-input"
            type="number"
            min={1}
            placeholder={String(DEFAULT_REBOOKING_DAYS)}
            value={rebookingDaysInput}
            onChange={e => setRebookingDaysInput(e.target.value)}
            onBlur={commitRebookingDays}
            onKeyDown={e => { if (e.key === "Enter") commitRebookingDays(); }}
            style={{ height: 32, padding: "0 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <Select containerClass="rp-detail-filter-group" value={sortFilter} onChange={e => setSortFilter(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label === "None" ? "Sort: None" : o.label}</option>)}
        </Select>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {dateRangeError && <div className="rp-detail-date-error">{dateRangeError}</div>}

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalVisits}</div><div className="rp-sra-summary-label">Total Visits</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.rebookedVisits}</div><div className="rp-sra-summary-label">Rebooked Visits</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.overallRebookingRate}%</div><div className="rp-sra-summary-label">Overall Rebooking Rate</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.staffCount}</div><div className="rp-sra-summary-label">Staff Counted</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Staff name" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff Name</th>
              <th>Total Visits</th>
              <th>Rebooked Visits</th>
              <th>Rebooking Rate (%)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={5} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="rp-detail-empty-cell">No rebooking data available for the selected date/filter.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.staffId || i}>
                <td className="rp-ss-idx">#{(currentPage - 1) * pageSize + i + 1}</td>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.totalVisits}</td>
                <td>{r.rebookedVisits}</td>
                <td>{r.rebookingRate}%</td>
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
