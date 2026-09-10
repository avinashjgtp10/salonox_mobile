import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { MEMBERSHIP_OPPORTUNITY_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { maskMobile } from "../../../utils/maskMobile";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./ClientRevenueReport.scss";
import "./MembershipOpportunityReport.scss";

const REPORT_NAME = "Membership Opportunity";
const DEFAULT_WINDOW_DAYS = 90;
const DEFAULT_MIN_VISITS = 0;

// Unticked by default — the report shows both membership states until the
// user manually ticks one. "No Membership" narrows to frequent visitors not
// yet converted (this report's core purpose); "Has Membership" lets the
// same report double as a renewal/upgrade list.
const MEMBERSHIP_OPTIONS = [
  { id: "no", label: "No Membership" },
  { id: "has", label: "Has Membership" },
];

const GENDER_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

interface OpportunityRow {
  clientId: string;
  clientName: string;
  contact: string;
  visitCount: number;
  hasMembership: boolean;
  lastVisitDate: string | null;
}

function mapRow(row: any): OpportunityRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Unnamed Client",
    contact: row.contact || "—",
    visitCount: Number(row.visit_count) || 0,
    hasMembership: Boolean(row.has_membership),
    lastVisitDate: row.last_visit_date || null,
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Frequent visitors with no active membership yet — same checkbox-select +
// SendCampaignBar/SendCampaignModal pattern as the other marketing reports,
// meant to be paired with the "Membership Promotion" WhatsApp template.
export default function MembershipOpportunityReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";

  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = useState<{ id: string; label: string }[]>([]);
  // Empty by default — an explicit input, not a preselected threshold, per
  // the filter menu's "Visits" field below.
  const [minVisits, setMinVisits] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", ...getDateRangePresetValue("all_time") });
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalEligible: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const selection = useRowSelection();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
        window_days: DEFAULT_WINDOW_DAYS,
        min_visits: minVisits ?? DEFAULT_MIN_VISITS,
        page: currentPage, limit: pageSize,
      };
      // has_membership stays unset (both shown) until the user manually
      // ticks one of the two mutually exclusive options.
      if (membershipFilter[0]) body.has_membership = membershipFilter[0];
      if (genderFilter.length) body.genders = genderFilter;
      if (sourceFilter[0]) body.client_source = sourceFilter[0];
      if (dateRange.startDate) body.last_visit_from = dateRange.startDate;
      if (dateRange.endDate) body.last_visit_to = dateRange.endDate;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(MEMBERSHIP_OPPORTUNITY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      setStats({ totalEligible: Number(data?.stats?.total_eligible) || 0 });
      const sources = data?.filters_available?.client_sources;
      if (Array.isArray(sources)) setSourceOptions(sources);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalEligible: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [membershipFilter, genderFilter, sourceFilter, minVisits, dateRange, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [membershipFilter, genderFilter, sourceFilter, minVisits, dateRange, debouncedSearch]);

  const filterFields: JiraFilterField[] = [
    { key: "membership", label: "Membership", options: MEMBERSHIP_OPTIONS },
    { key: "gender", label: "Gender", options: GENDER_OPTIONS },
    { key: "source", label: "Client Source", options: sourceOptions, searchable: true },
    {
      key: "visits",
      label: "Visits",
      options: [],
      render: (draft, setDraft) => (
        <div className="rp-mo-visits-field">
          <label htmlFor="jfm-mo-min-visits-input">Minimum Visits</label>
          <input
            id="jfm-mo-min-visits-input"
            type="number"
            min={0}
            placeholder="e.g. 3"
            value={draft[0] ?? ""}
            onChange={(e) => setDraft(e.target.value ? [e.target.value] : [])}
          />
          <p className="rp-mo-visits-field__hint">Shows clients with at least this many visits.</p>
        </div>
      ),
    },
  ];
  const filterMenuSelected = {
    membership: membershipFilter, gender: genderFilter, source: sourceFilter,
    visits: minVisits !== undefined ? [String(minVisits)] : [],
  };
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setGenderFilter(next.gender ?? []);
    setSourceFilter(next.source?.length ? [next.source[next.source.length - 1]] : []);
    // Single-select in practice — the filter API is multi-select, but "has"
    // and "no" are mutually exclusive, so only the last-ticked value is
    // kept; unticking both leaves it empty, showing every client regardless
    // of membership status.
    setMembershipFilter(next.membership?.length ? [next.membership[next.membership.length - 1]] : []);
    const visitsRaw = next.visits?.[0];
    setMinVisits(visitsRaw ? Math.max(0, parseInt(visitsRaw, 10) || 0) : undefined);
  };

  const HEADERS = ["Client Name", "Contact", "Visits", "Membership", "Last Visit"];
  const exportRows = () => rows.map(r => [
    r.clientName, canViewFullContact ? r.contact : maskMobile(r.contact),
    r.visitCount, r.hasMembership ? "Has Membership" : "No Membership", formatDate(r.lastVisitDate),
  ]);

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
              filename="membership-opportunity"
              variant="button"
              csv
              filterLines={[
                `Membership: ${membershipFilter[0] === "has" ? "Has Membership" : membershipFilter[0] === "no" ? "No Membership" : "All"}`,
                ...(genderFilter.length ? [`Gender: ${genderFilter.join(", ")}`] : []),
                ...(sourceFilter[0] ? [`Client Source: ${sourceFilter[0]}`] : []),
                ...(minVisits !== undefined ? [`Visits: ${minVisits}+`] : []),
                ...(dateRange.startDate || dateRange.endDate ? [`Last visit: ${dateRange.startDate || "…"} to ${dateRange.endDate || "…"}`] : []),
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
              ]}
              summaryLines={[
                `Total Eligible Clients: ${stats.totalEligible}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={1} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalEligible}</div><div className="rp-sra-summary-label">{membershipFilter[0] === "has" ? "Frequent Visitors With Membership" : membershipFilter[0] === "no" ? "Suitable for Membership" : "Matching Clients"}</div></div>
        </div>
      )}

      <SendCampaignBar count={selection.selectedIds.size} onSendClick={() => setShowCampaignModal(true)} />

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client name or phone" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th className="rp-row-checkbox-col">
                <input
                  type="checkbox"
                  className="rp-row-checkbox"
                  checked={rows.length > 0 && rows.every((_r, i) => selection.selectedIds.has(String(i)))}
                  onChange={() => selection.toggleAll(rows.map((_r, i) => String(i)))}
                />
              </th>
              <th>Client Name</th><th>Contact</th><th>Visits</th><th>Membership</th><th>Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No clients match this criteria right now</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className={r.clientId ? "rp-appt-row" : undefined}>
                <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rp-row-checkbox"
                    checked={selection.selectedIds.has(String(i))}
                    onChange={() => selection.toggleOne(String(i))}
                  />
                </td>
                <td className="fw-semibold" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.clientName}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{maskMobile(r.contact)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>
                  <span className="rp-status-badge rp-status-cancelled">{r.visitCount}</span>
                </td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>
                  <span className={`rp-status-badge ${r.hasMembership ? "rp-status-completed" : "rp-status-refunded"}`}>
                    {r.hasMembership ? "Has Membership" : "No Membership"}
                  </span>
                </td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatDate(r.lastVisitDate)}</td>
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

      <SendCampaignModal
        show={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        contacts={rows
          .filter((r, i) => selection.selectedIds.has(String(i)) && r.contact && r.contact !== "—")
          .map(r => ({ phone: r.contact, name: r.clientName }))}
        defaultCampaignName="Membership Promotion"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
