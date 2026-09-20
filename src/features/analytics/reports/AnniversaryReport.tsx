import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { ANNIVERSARY_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { maskMobile } from "../../../utils/maskMobile";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./AllClientsReport.scss";

const REPORT_NAME = "Anniversary Report";

const STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "blocked", label: "Blocked" },
];

const MONTH_OPTIONS = [
  { id: "1", label: "January" }, { id: "2", label: "February" }, { id: "3", label: "March" },
  { id: "4", label: "April" }, { id: "5", label: "May" }, { id: "6", label: "June" },
  { id: "7", label: "July" }, { id: "8", label: "August" }, { id: "9", label: "September" },
  { id: "10", label: "October" }, { id: "11", label: "November" }, { id: "12", label: "December" },
];

// "All" sends no upcoming_within_days filter at all (server default: every
// client with an anniversary on file, soonest first).
const UPCOMING_OPTIONS = [
  { id: "", label: "All Upcoming Anniversaries" },
  { id: "0", label: "Today" },
  { id: "7", label: "Next 7 Days" },
  { id: "30", label: "Next 30 Days" },
  { id: "90", label: "Next 90 Days" },
];

interface AnniversaryRow {
  clientId: string;
  clientName: string;
  contact: string;
  email: string;
  anniversary: string;
  yearsCount: number;
  nextOccurrence: string;
  daysUntilNext: number;
  clientSource: string;
  status: "Active" | "Blocked";
}

function mapRow(row: any): AnniversaryRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Unnamed Client",
    contact: row.contact || "—",
    email: row.email || "—",
    anniversary: row.anniversary || "",
    yearsCount: Number(row.years_count) || 0,
    nextOccurrence: row.next_occurrence || "",
    daysUntilNext: Number(row.days_until_next) || 0,
    clientSource: row.client_source || "—",
    status: row.status === "Blocked" ? "Blocked" : "Active",
  };
}

function formatDate(input: string): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function daysUntilLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export default function AnniversaryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  // On-screen the contact column is always masked; only the owner/admin role
  // gets the real number in Excel/CSV/PDF exports — see maskMobile.
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [upcoming, setUpcoming] = useState("");
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<AnniversaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalWithAnniversary: 0, anniversariesToday: 0, anniversariesThisWeek: 0, anniversariesThisMonth: 0 });
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
      const body: Record<string, any> = { page: currentPage, limit: pageSize };
      if (debouncedSearch) body.search = debouncedSearch;
      if (statusFilter.length === 1) body.status = statusFilter[0];
      if (monthFilter.length === 1) body.anniversary_month = Number(monthFilter[0]);
      if (upcoming !== "") body.upcoming_within_days = Number(upcoming);

      const res = await api.post(ANNIVERSARY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalWithAnniversary: Number(s.total_with_anniversary) || 0,
        anniversariesToday: Number(s.anniversaries_today) || 0,
        anniversariesThisWeek: Number(s.anniversaries_this_week) || 0,
        anniversariesThisMonth: Number(s.anniversaries_this_month) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalWithAnniversary: 0, anniversariesToday: 0, anniversariesThisWeek: 0, anniversariesThisMonth: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, statusFilter, monthFilter, upcoming, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, monthFilter, upcoming]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "month", label: "Anniversary Month", options: MONTH_OPTIONS, searchable: true },
  ], []);

  const filterMenuSelected = useMemo(() => ({
    status: statusFilter,
    month: monthFilter,
  }), [statusFilter, monthFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
    setMonthFilter(next.month ?? []);
  };

  const HEADERS = ["Client Name", "Contact", "Email", "Anniversary", "Years", "Next Occurrence", "Source", "Status"];
  const exportRows = () => rows.map(r => [
    r.clientName, canViewFullContact ? r.contact : maskMobile(r.contact), r.email,
    formatDate(r.anniversary), r.yearsCount, formatDate(r.nextOccurrence),
    r.clientSource, r.status,
  ]);

  const activeFilterLines = [
    ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
    ...(statusFilter.length === 1 ? [`Status: ${STATUS_OPTIONS.find(o => o.id === statusFilter[0])?.label}`] : []),
    ...(monthFilter.length === 1 ? [`Anniversary Month: ${MONTH_OPTIONS.find(o => o.id === monthFilter[0])?.label}`] : []),
    ...(upcoming !== "" ? [`Upcoming: ${UPCOMING_OPTIONS.find(o => o.id === upcoming)?.label}`] : []),
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
              reportId="anniversary"
              filename={`anniversary-report-${new Date().toISOString().slice(0, 10)}`}
              variant="button"
              csv
              filterLines={activeFilterLines}
              summaryLines={[
                `Total With Anniversary On File: ${stats.totalWithAnniversary}`,
                `Today: ${stats.anniversariesToday}`,
                `This Week: ${stats.anniversariesThisWeek}`,
                `This Month: ${stats.anniversariesThisMonth}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Upcoming</label>
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={upcoming} onChange={e => setUpcoming(e.target.value)}>
            {UPCOMING_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalWithAnniversary}</div><div className="rp-sra-summary-label">Total With Anniversary On File</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.anniversariesToday}</div><div className="rp-sra-summary-label">Today</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.anniversariesThisWeek}</div><div className="rp-sra-summary-label">This Week</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.anniversariesThisMonth}</div><div className="rp-sra-summary-label">This Month</div></div>
        </div>
      )}

      <SendCampaignBar count={selection.selectedIds.size} onSendClick={() => setShowCampaignModal(true)} />

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client name, phone or email" value={search} onChange={e => setSearchInput(e.target.value)} />
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
              <th>Client Name</th><th>Contact</th><th>Email</th>
              <th>Anniversary</th><th>Years</th><th>Next Occurrence</th><th>Source</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No anniversaries found</td></tr>
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
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.email}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatDate(r.anniversary)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.yearsCount}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)} title={formatDate(r.nextOccurrence)}>{daysUntilLabel(r.daysUntilNext)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.clientSource}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>
                  <span className={`rp-status-badge ${r.status === "Active" ? "rp-status-paid" : "rp-status-unpaid"}`}>
                    {r.status}
                  </span>
                </td>
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
        defaultCampaignName="Anniversary Report"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
