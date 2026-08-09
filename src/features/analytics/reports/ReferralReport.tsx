import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REFERRAL_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Referral Report";

const REWARD_STATUS_OPTIONS = [
  { id: "rewarded", label: "Rewarded" },
  { id: "pending",  label: "Pending" },
];

interface ReferralRow {
  referredClientId: string;
  referrerClientId: string;
  referrerName: string;
  referredName: string;
  referralDate: string | null;
  firstVisit: string | null;
  totalVisits: number;
  revenueGenerated: number;
  rewardEarned: number;
  rewardStatus: "rewarded" | "pending";
  staffName: string;
}

function mapRow(row: any): ReferralRow {
  return {
    referredClientId: row.referred_client_id ? String(row.referred_client_id) : "",
    referrerClientId: row.referrer_client_id ? String(row.referrer_client_id) : "",
    referrerName: row.referrer_name || "Walk-in",
    referredName: row.referred_name || "Walk-in",
    referralDate: row.referral_date || null,
    firstVisit: row.first_visit || null,
    totalVisits: Number(row.total_visits) || 0,
    revenueGenerated: Number(row.revenue_generated) || 0,
    rewardEarned: Number(row.reward_earned) || 0,
    rewardStatus: row.reward_status === "rewarded" ? "rewarded" : "pending",
    staffName: row.staff_name || "—",
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function ReferralReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [rewardStatusFilter, setRewardStatusFilter] = useState<string[]>([]);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,    setRows]    = useState<ReferralRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [stats,   setStats]   = useState({ totalReferrals: 0, rewardedReferrals: 0, totalRevenueGenerated: 0, totalRewardEarned: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
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

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
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
      // Both statuses selected is the same as no status filter — sending
      // neither keeps the backend's WHERE clause off entirely.
      if (rewardStatusFilter.length === 1) body.reward_status = rewardStatusFilter[0];
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(REFERRAL_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalReferrals: Number(s.total_referrals) || 0,
        rewardedReferrals: Number(s.rewarded_referrals) || 0,
        totalRevenueGenerated: Number(s.total_revenue_generated) || 0,
        totalRewardEarned: Number(s.total_reward_earned) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalReferrals: 0, rewardedReferrals: 0, totalRevenueGenerated: 0, totalRewardEarned: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, rewardStatusFilter, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, rewardStatusFilter, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff",  label: "Staff", options: staffOptions, searchable: true },
    { key: "reward", label: "Reward Status", options: REWARD_STATUS_OPTIONS },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    reward: rewardStatusFilter,
  }), [staffFilterIds, rewardStatusFilter]);

  // Applied together in one commit so Staff + Reward Status narrow the result
  // set jointly (AND), instead of the later field replacing the earlier one.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    setRewardStatusFilter(next.reward ?? []);
  };

  const HEADERS = [
    "Referrer", "Referred Client", "Referral Date", "First Visit", "Total Visits",
    `Revenue Generated (${currencySymbol})`, `Reward Earned (${currencySymbol})`, "Reward Status", "Staff",
  ];
  const exportRows = () => rows.map(r => [
    r.referrerName, r.referredName, formatDate(r.referralDate), formatDate(r.firstVisit),
    r.totalVisits, r.revenueGenerated, r.rewardEarned,
    r.rewardStatus === "rewarded" ? "Rewarded" : "Pending", r.staffName,
  ]);

  const activeFilterLines = [
    ...(staffFilterIds.length
      ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
    ...(rewardStatusFilter.length
      ? [`Reward Status: ${REWARD_STATUS_OPTIONS.filter(o => rewardStatusFilter.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
    ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
  ];

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
              filename={`referral-report-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={activeFilterLines}
              summaryLines={[
                `Total Referrals: ${stats.totalReferrals}`,
                `Rewarded Referrals: ${stats.rewardedReferrals}`,
                `Revenue Generated: ${formatAmount(stats.totalRevenueGenerated)}`,
                `Reward Earned: ${formatAmount(stats.totalRewardEarned)}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalReferrals}</div><div className="rp-sra-summary-label">Total Referrals</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.rewardedReferrals}</div><div className="rp-sra-summary-label">Rewarded Referrals</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenueGenerated)}</div><div className="rp-sra-summary-label">Revenue Generated</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRewardEarned)}</div><div className="rp-sra-summary-label">Reward Earned</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Referrer, referred client, phone or code" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Referrer</th><th>Referred Client</th><th>Referral Date</th>
              <th>First Visit</th><th>Total Visits</th>
              <th>Revenue Generated ({currencySymbol})</th>
              <th>Reward Earned ({currencySymbol})</th>
              <th>Reward Status</th><th>Staff</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No referrals found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.referredClientId ? "rp-appt-row" : undefined}
                onClick={() => r.referredClientId && setSelectedClientId(r.referredClientId)}
              >
                <td className="fw-semibold">{r.referrerName}</td>
                <td>{r.referredName}</td>
                <td>{formatDate(r.referralDate)}</td>
                <td>{formatDate(r.firstVisit)}</td>
                <td>{r.totalVisits}</td>
                <td className="fw-semibold">{formatAmount(r.revenueGenerated)}</td>
                <td>{formatAmount(r.rewardEarned)}</td>
                <td>
                  <span className={`rp-status-badge ${r.rewardStatus === "rewarded" ? "rp-status-completed" : "rp-status-pending"}`}>
                    {r.rewardStatus === "rewarded" ? "Rewarded" : "Pending"}
                  </span>
                </td>
                <td>{r.staffName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
      )}
    </div>
  );
}
