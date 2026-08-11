import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { MEMBERSHIP_HISTORY_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./MembershipHistoryReport.scss";

const REPORT_NAME = "Membership History";

interface FilterOption { id: string; label: string; }

// Mirrors the backend's _MEMBER_STATUS_EXPR vocabulary exactly (shared with
// the Membership Sale report) — 'complete' means the membership is used up.
const STATUS_OPTIONS: FilterOption[] = [
  { id: "active", label: "Active" },
  { id: "expiry_soon", label: "Expiry Soon" },
  { id: "expired", label: "Expired" },
  { id: "complete", label: "Exhausted" },
];

// How the benefit came off the bill. Wallet spends money from a balance;
// Discount is money never charged — never totalled together.
const BENEFIT_OPTIONS: FilterOption[] = [
  { id: "wallet", label: "Wallet" },
  { id: "discount", label: "Discount" },
  { id: "loyalty", label: "Loyalty" },
];

// The membership's own pricing model. These are the three real membership
// types — there is no session-based membership (sessions belong to packages).
// Loyalty ("get X% off once you've completed N visits") writes no usage-log
// row, so the backend reconstructs those rows from
// payments.membership_discount_used instead — see _MEMBERSHIP_HISTORY_SOURCE.
const MEMBERSHIP_TYPE_OPTIONS: FilterOption[] = [
  { id: "value", label: "Value (Wallet)" },
  { id: "percentage", label: "Percentage" },
  { id: "loyalty", label: "Loyalty (Visits)" },
];

interface HistoryRow {
  date: string;
  client: string;
  clientId: string;
  membershipName: string;
  membershipType: string;
  serviceName: string;
  benefitType: string;
  amountDeducted: number;
  remainingBalance: number | null;
  sessionsConsumed: number;
  staff: string;
  expiryDate: string;
  status: string;
}

// dd-mm-yyyy across the table and every export, matching the other reports.
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function mapRow(row: any): HistoryRow {
  return {
    date: row.date ? formatDate(row.date) : "—",
    client: row.client_name || "—",
    clientId: row.client_id ? String(row.client_id) : "",
    membershipName: row.membership_name || "—",
    membershipType: row.membership_type || "value",
    serviceName: row.service_name || "—",
    benefitType: row.benefit_type || "wallet",
    amountDeducted: Number(row.amount_deducted) || 0,
    remainingBalance: row.remaining_balance === null || row.remaining_balance === undefined
      ? null
      : Number(row.remaining_balance),
    sessionsConsumed: Number(row.sessions_consumed) || 0,
    staff: row.staff || "—",
    expiryDate: row.expiry_date ? formatDate(row.expiry_date) : "—",
    status: row.status || "active",
  };
}

export default function MembershipHistoryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);
  const [benefitFilter,    setBenefitFilter]    = useState<string[]>([]);
  const [typeFilter,       setTypeFilter]       = useState<string[]>([]);
  const [statusFilter,     setStatusFilter]     = useState<string[]>([]);
  const [staffFilterIds,   setStaffFilterIds]   = useState<string[]>([]);
  const [rows,  setRows]  = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalRedemptions: 0, totalWalletUsed: 0, totalDiscountGiven: 0, totalLoyaltyGiven: 0,
    activeMemberships: 0, expirySoonMemberships: 0, exhaustedMemberships: 0,
  });
  // Membership/service options come from the report's own filters_available
  // so they stay complete regardless of the date range in effect; staff comes
  // from the salon roster, same convention as Package History.
  const [membershipOptions, setMembershipOptions] = useState<string[]>([]);
  const [staffOptions,      setStaffOptions]      = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
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
      if (debouncedSearch) body.search = debouncedSearch;
      if (membershipFilter.length > 0) body.membership_names = membershipFilter;
      if (benefitFilter.length > 0) body.benefit_types = benefitFilter;
      if (typeFilter.length > 0) body.pricing_types = typeFilter;
      if (statusFilter.length > 0) body.statuses = statusFilter;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      const res = await api.post(MEMBERSHIP_HISTORY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalRedemptions: Number(s.total_redemptions) || 0,
        totalWalletUsed: Number(s.total_wallet_used) || 0,
        totalDiscountGiven: Number(s.total_discount_given) || 0,
        totalLoyaltyGiven: Number(s.total_loyalty_given) || 0,
        activeMemberships: Number(s.active_memberships) || 0,
        expirySoonMemberships: Number(s.expiry_soon_memberships) || 0,
        exhaustedMemberships: Number(s.exhausted_memberships) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.memberships)) {
        // Defensive: drop null/empty entries and the literal string
        // "undefined" (which a String(undefined) upstream can produce) so a
        // bad payload can never render a row of blank checkboxes.
        setMembershipOptions(
          avail.memberships
            .map((m: any) => (m == null ? "" : String(m).trim()))
            .filter((m: string) => m !== "" && m !== "undefined" && m !== "null")
        );
      }
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({
          totalRedemptions: 0, totalWalletUsed: 0, totalDiscountGiven: 0, totalLoyaltyGiven: 0,
          activeMemberships: 0, expirySoonMemberships: 0, exhaustedMemberships: 0,
        });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, membershipFilter, benefitFilter, typeFilter, statusFilter, staffFilterIds, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, membershipFilter, benefitFilter, typeFilter, statusFilter, staffFilterIds]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "membership", label: "Membership", options: membershipOptions.map(m => ({ id: m, label: m })), searchable: true },
    { key: "type", label: "Membership Type", options: MEMBERSHIP_TYPE_OPTIONS },
    { key: "benefit", label: "Benefit Used", options: BENEFIT_OPTIONS },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [membershipOptions, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    membership: membershipFilter,
    type: typeFilter,
    benefit: benefitFilter,
    status: statusFilter,
    staff: staffFilterIds,
  }), [membershipFilter, typeFilter, benefitFilter, statusFilter, staffFilterIds]);

  // One commit for all four fields so they narrow the result set jointly
  // (AND) rather than a later field replacing an earlier one. Clear passes
  // {}, hence the ?? [] defaults.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setMembershipFilter(next.membership ?? []);
    setTypeFilter(next.type ?? []);
    setBenefitFilter(next.benefit ?? []);
    setStatusFilter(next.status ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const statusLabel  = (s: string) => STATUS_OPTIONS.find(o => o.id === s)?.label ?? s;
  const benefitLabel = (b: string) => BENEFIT_OPTIONS.find(o => o.id === b)?.label ?? b;
  const typeLabel    = (t: string) => MEMBERSHIP_TYPE_OPTIONS.find(o => o.id === t)?.label ?? t;

  const HEADERS = [
    "Date", "Client", "Membership", "Type", "Service", "Benefit",
    `Deducted (${currencySymbol})`, `Remaining (${currencySymbol})`,
    "Staff", "Expiry Date", "Status",
  ];
  const exportRows = () => rows.map(r => [
    r.date, r.client, r.membershipName, typeLabel(r.membershipType), r.serviceName, benefitLabel(r.benefitType),
    r.amountDeducted, r.remainingBalance ?? "",
    r.staff, r.expiryDate, statusLabel(r.status),
  ]);

  const activeFilterLines = [
    ...(membershipFilter.length ? [`Membership: ${membershipFilter.join(", ")}`] : []),
    ...(typeFilter.length ? [`Membership Type: ${typeFilter.map(typeLabel).join(", ")}`] : []),
    ...(benefitFilter.length ? [`Benefit: ${benefitFilter.map(benefitLabel).join(", ")}`] : []),
    ...(statusFilter.length ? [`Status: ${statusFilter.map(statusLabel).join(", ")}`] : []),
    ...(staffFilterIds.length
      ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
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
              filename={`membership-history-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={activeFilterLines}
              summaryLines={[
                `Total Redemptions: ${stats.totalRedemptions}`,
                `Wallet Used: ${formatAmount(stats.totalWalletUsed)}`,
                `Discount Given: ${formatAmount(stats.totalDiscountGiven)}`,
                `Loyalty Given: ${formatAmount(stats.totalLoyaltyGiven)}`,
                `Active: ${stats.activeMemberships} | Expiry Soon: ${stats.expirySoonMemberships} | Exhausted: ${stats.exhaustedMemberships}`,
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

      {loading ? <SkeletonStatCards count={7} className="rp-mh-summary-row" /> : (
        <div className="rp-sra-summary-row rp-mh-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalRedemptions}</div><div className="rp-sra-summary-label">Total Redemptions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalWalletUsed)}</div><div className="rp-sra-summary-label">Wallet Used</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalDiscountGiven)}</div><div className="rp-sra-summary-label">Discount Given</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalLoyaltyGiven)}</div><div className="rp-sra-summary-label">Loyalty Given</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.activeMemberships}</div><div className="rp-sra-summary-label">Active Memberships</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.expirySoonMemberships}</div><div className="rp-sra-summary-label">Expiry Soon</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.exhaustedMemberships}</div><div className="rp-sra-summary-label">Exhausted</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client, membership or service" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Client</th><th>Membership</th><th>Type</th><th>Service</th>
              <th>Benefit</th>
              <th>Deducted ({currencySymbol})</th>
              <th>Remaining ({currencySymbol})</th>
              <th>Staff</th><th>Expiry Date</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={11} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="rp-detail-empty-cell">No membership usage found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.date}</td>
                <td className="fw-semibold">{r.client}</td>
                <td>{r.membershipName}</td>
                <td>{typeLabel(r.membershipType)}</td>
                <td>{r.serviceName}</td>
                <td><span className={`rp-status-badge rp-mh-benefit-${r.benefitType}`}>{benefitLabel(r.benefitType)}</span></td>
                <td className="fw-semibold">{formatAmount(r.amountDeducted)}</td>
                <td>{r.remainingBalance === null ? "—" : formatAmount(r.remainingBalance)}</td>
                <td>{r.staff}</td>
                <td>{r.expiryDate}</td>
                <td><span className={`rp-status-badge rp-mh-status-${r.status}`}>{statusLabel(r.status)}</span></td>
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
