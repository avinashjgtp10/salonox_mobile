import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { WA_CAMPAIGN_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./WaCampaignReport.scss";

const REPORT_NAME = "WA Marketing Campaign";

interface CampaignPerfRow {
  id: string;
  name: string;
  templateName: string;
  status: string;
  totalContacts: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  blocked: number;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { id: "DRAFT", label: "Draft" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "SENDING", label: "Running" },
  { id: "PAUSED", label: "Paused" },
  { id: "COMPLETED", label: "Completed" },
  { id: "FAILED", label: "Failed" },
];
const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map(o => [o.id, o.label]));

const BUCKET_OPTIONS = [
  { id: "high", label: "High (≥90%)" },
  { id: "medium", label: "Medium (50-89%)" },
  { id: "low", label: "Low (<50%)" },
  { id: "none", label: "No Deliveries" },
];

function mapRow(row: any): CampaignPerfRow {
  return {
    id: String(row.id ?? ""),
    name: row.name || "—",
    templateName: row.template_name || "—",
    status: row.status || "—",
    totalContacts: Number(row.total_contacts) || 0,
    sent: Number(row.sent) || 0,
    delivered: Number(row.delivered) || 0,
    read: Number(row.read) || 0,
    failed: Number(row.failed) || 0,
    blocked: Number(row.blocked) || 0,
    createdAt: row.created_at || "",
  };
}

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const campStatusClass = (s: string) =>
  s === "COMPLETED" ? "ok" : s === "SENDING" ? "run" : s === "PAUSED" ? "warn" : s === "FAILED" ? "fail" : "neutral";

export default function WaCampaignReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Unfiltered by default — "all_time" is exactly the empty start/end pair
  // this report previously used.
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [statuses, setStatuses] = useState<string[]>([]);
  const [templateIds, setTemplateIds] = useState<string[]>([]);
  const [deliveryBucketFilter, setDeliveryBucketFilter] = useState<string[]>([]);
  const [readBucketFilter, setReadBucketFilter] = useState<string[]>([]);
  const [templateOptions, setTemplateOptions] = useState<{ id: string; label: string }[]>([]);

  const [rows, setRows] = useState<CampaignPerfRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalCampaigns: 0, totalContacts: 0, totalSent: 0, totalDelivered: 0,
    totalRead: 0, totalFailed: 0, totalBlocked: 0, avgDeliveryRate: 0, avgReadRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

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
      const body: Record<string, any> = { page: currentPage, limit: pageSize };
      if (debouncedSearch) body.search = debouncedSearch;
      if (statuses.length > 0) body.statuses = statuses;
      if (templateIds.length > 0) body.template_ids = templateIds;
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;
      // Backend delivery_bucket/read_bucket are single-value only — only send
      // when exactly one option is checked; 0 or 2+ selected means "All".
      if (deliveryBucketFilter.length === 1) body.delivery_bucket = deliveryBucketFilter[0];
      if (readBucketFilter.length === 1) body.read_bucket = readBucketFilter[0];

      const res = await api.post(WA_CAMPAIGN_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalCampaigns: Number(s.total_campaigns) || 0,
        totalContacts: Number(s.total_contacts) || 0,
        totalSent: Number(s.total_sent) || 0,
        totalDelivered: Number(s.total_delivered) || 0,
        totalRead: Number(s.total_read) || 0,
        totalFailed: Number(s.total_failed) || 0,
        totalBlocked: Number(s.total_blocked) || 0,
        avgDeliveryRate: Number(s.avg_delivery_rate) || 0,
        avgReadRate: Number(s.avg_read_rate) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.templates)) setTemplateOptions(avail.templates);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalCampaigns: 0, totalContacts: 0, totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0, totalBlocked: 0, avgDeliveryRate: 0, avgReadRate: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, statuses, templateIds, dateFrom, dateTo, deliveryBucketFilter, readBucketFilter, currentPage, pageSize, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statuses, templateIds, dateFrom, dateTo, deliveryBucketFilter, readBucketFilter]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Campaign Status", options: STATUS_OPTIONS },
    { key: "template", label: "Template", options: templateOptions, searchable: true },
    { key: "delivery_bucket", label: "Delivery Status", options: BUCKET_OPTIONS },
    { key: "read_bucket", label: "Read Status", options: BUCKET_OPTIONS },
  ], [templateOptions]);

  const filterMenuSelected = useMemo(() => ({
    status: statuses,
    template: templateIds,
    delivery_bucket: deliveryBucketFilter,
    read_bucket: readBucketFilter,
  }), [statuses, templateIds, deliveryBucketFilter, readBucketFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatuses(next.status ?? []);
    setTemplateIds(next.template ?? []);
    setDeliveryBucketFilter(next.delivery_bucket ?? []);
    setReadBucketFilter(next.read_bucket ?? []);
  };

  const pct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";

  const HEADERS = ["Date", "Campaign", "Template", "Status", "Contacts", "Sent", "Delivered", "Read", "Failed", "Blocked", "Delivery Rate (%)", "Read Rate (%)"];
  const exportRows = () => rows.map(r => [
    r.createdAt ? formatDate(r.createdAt) : "—",
    r.name, r.templateName, STATUS_LABELS[r.status] ?? r.status,
    r.totalContacts, r.sent, r.delivered, r.read, r.failed, r.blocked,
    pct(r.delivered, r.sent), pct(r.read, r.sent),
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
              filename={REPORT_NAME}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={dateFrom || dateTo ? `${dateFrom ? formatDate(dateFrom) : "…"} - ${dateTo ? formatDate(dateTo) : "…"}` : undefined}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(statuses.length > 0 ? [`Status: ${statuses.map(s => STATUS_LABELS[s] ?? s).join(", ")}`] : []),
                ...(templateIds.length > 0
                  ? [`Template: ${templateOptions.filter(o => templateIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(deliveryBucketFilter.length > 0
                  ? [`Delivery Status: ${deliveryBucketFilter.map(v => BUCKET_OPTIONS.find(b => b.id === v)?.label ?? v).join(", ")}`]
                  : []),
                ...(readBucketFilter.length > 0
                  ? [`Read Status: ${readBucketFilter.map(v => BUCKET_OPTIONS.find(b => b.id === v)?.label ?? v).join(", ")}`]
                  : []),
              ]}
              summaryLines={[
                `Total Campaigns: ${stats.totalCampaigns}`,
                `Total Contacts: ${stats.totalContacts}`,
                `Total Sent: ${stats.totalSent}`,
                `Total Delivered: ${stats.totalDelivered}`,
                `Total Read: ${stats.totalRead}`,
                `Total Failed: ${stats.totalFailed}`,
                `Total Blocked: ${stats.totalBlocked}`,
                `Average Delivery Rate: ${stats.avgDeliveryRate.toFixed(1)}%`,
                `Average Read Rate: ${stats.avgReadRate.toFixed(1)}%`,
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
      {dateRangeError && <div className="rp-detail-date-error">{dateRangeError}</div>}

      {loading ? <SkeletonStatCards count={9} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalCampaigns}</div><div className="rp-sra-summary-label">Total Campaigns</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalContacts}</div><div className="rp-sra-summary-label">Total Contacts</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalSent}</div><div className="rp-sra-summary-label">Total Sent</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalDelivered}</div><div className="rp-sra-summary-label">Total Delivered</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalRead}</div><div className="rp-sra-summary-label">Total Read</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalFailed}</div><div className="rp-sra-summary-label">Total Failed</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalBlocked}</div><div className="rp-sra-summary-label">Total Blocked</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.avgDeliveryRate.toFixed(1)}%</div><div className="rp-sra-summary-label">Average Delivery Rate</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.avgReadRate.toFixed(1)}%</div><div className="rp-sra-summary-label">Average Read Rate</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search campaign name, template name or campaign ID"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Campaign</th>
              <th>Template</th>
              <th>Status</th>
              <th>Contacts</th>
              <th>Sent</th>
              <th>Delivered</th>
              <th>Read</th>
              <th>Failed</th>
              <th>Blocked</th>
              <th>Delivery Rate (%)</th>
              <th>Read Rate (%)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={12} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt ? formatDate(r.createdAt) : "—"}</td>
                <td className="fw-semibold">{r.name}</td>
                <td><span className="rp-detail-link">{r.templateName}</span></td>
                <td><span className={`rp-wac-status rp-wac-status--${campStatusClass(r.status)}`}>{STATUS_LABELS[r.status] ?? r.status}</span></td>
                <td>{r.totalContacts}</td>
                <td>{r.sent}</td>
                <td>{r.delivered}</td>
                <td>{r.read}</td>
                <td className={r.failed > 0 ? "rp-wac-warn" : undefined}>{r.failed}</td>
                <td className={r.blocked > 0 ? "rp-wac-warn" : undefined}>{r.blocked}</td>
                <td>{pct(r.delivered, r.sent)}</td>
                <td>{pct(r.read, r.sent)}</td>
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
