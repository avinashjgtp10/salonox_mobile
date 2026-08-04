import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { WA_CAMPAIGN_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import MultiSelectCheckbox from "../../../components/ui/MultiSelectCheckbox";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
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
  { value: "", label: "All" },
  { value: "high", label: "High (≥90%)" },
  { value: "medium", label: "Medium (50-89%)" },
  { value: "low", label: "Low (<50%)" },
  { value: "none", label: "No Deliveries" },
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [templateIds, setTemplateIds] = useState<string[]>([]);
  const [deliveryBucket, setDeliveryBucket] = useState("");
  const [readBucket, setReadBucket] = useState("");
  const [templateOptions, setTemplateOptions] = useState<{ id: string; label: string }[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Draft copies edited while the modal is open; only committed to the
  // applied filter state above when Apply is clicked. Closing via the X or
  // the overlay discards them, matching the Client Revenue/Commission
  // filter modal pattern.
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<string[]>([]);
  const [draftTemplateIds, setDraftTemplateIds] = useState<string[]>([]);
  const [draftDeliveryBucket, setDraftDeliveryBucket] = useState("");
  const [draftReadBucket, setDraftReadBucket] = useState("");

  const [rows, setRows] = useState<CampaignPerfRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalCampaigns: 0, totalContacts: 0, totalSent: 0, totalDelivered: 0,
    totalRead: 0, totalFailed: 0, totalBlocked: 0, avgDeliveryRate: 0, avgReadRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";
  const draftDateRangeError = draftDateFrom && draftDateTo && draftDateTo < draftDateFrom
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
      if (deliveryBucket) body.delivery_bucket = deliveryBucket;
      if (readBucket) body.read_bucket = readBucket;

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
  }, [debouncedSearch, statuses, templateIds, dateFrom, dateTo, deliveryBucket, readBucket, currentPage, pageSize, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statuses, templateIds, dateFrom, dateTo, deliveryBucket, readBucket]);

  const activeFilterCount = [
    statuses.length > 0 ? 1 : 0,
    templateIds.length > 0 ? 1 : 0,
    dateFrom || dateTo ? 1 : 0,
    deliveryBucket ? 1 : 0,
    readBucket ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const openFiltersPanel = () => {
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setDraftStatuses(statuses);
    setDraftTemplateIds(templateIds);
    setDraftDeliveryBucket(deliveryBucket);
    setDraftReadBucket(readBucket);
    setShowFiltersPanel(true);
  };

  const cancelFiltersPanel = () => setShowFiltersPanel(false);

  const clearDraftFilters = () => {
    setDraftDateFrom("");
    setDraftDateTo("");
    setDraftStatuses([]);
    setDraftTemplateIds([]);
    setDraftDeliveryBucket("");
    setDraftReadBucket("");
    // Clear applies immediately (not just the draft) — resets the actually
    // applied filters and refetches, same as Clear-then-Apply in one step.
    setDateFrom("");
    setDateTo("");
    setStatuses([]);
    setTemplateIds([]);
    setDeliveryBucket("");
    setReadBucket("");
    setShowFiltersPanel(false);
  };

  const applyFilters = () => {
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setStatuses(draftStatuses);
    setTemplateIds(draftTemplateIds);
    setDeliveryBucket(draftDeliveryBucket);
    setReadBucket(draftReadBucket);
    setShowFiltersPanel(false);
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
                ...(deliveryBucket ? [`Delivery Status: ${BUCKET_OPTIONS.find(b => b.value === deliveryBucket)?.label}`] : []),
                ...(readBucket ? [`Read Status: ${BUCKET_OPTIONS.find(b => b.value === readBucket)?.label}`] : []),
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
        <button className="rp-cr-filters-btn" onClick={openFiltersPanel}>
          Filters
          {activeFilterCount > 0 && <span className="rp-cr-filters-badge">{activeFilterCount}</span>}
        </button>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

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

      {showFiltersPanel && (
        <div className="rp-cr-filters-overlay" onClick={cancelFiltersPanel}>
          <div className="rp-cr-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
              <button type="button" className="rp-cr-filters-close" aria-label="Close" onClick={cancelFiltersPanel}>
                <X size={18} />
              </button>
            </div>

            <div className="rp-cr-filters-body">
              <MultiSelectCheckbox
                label="Campaign Status"
                containerClass="rp-cr-filter-field"
                options={STATUS_OPTIONS}
                selected={draftStatuses}
                onChange={setDraftStatuses}
                placeholder="All statuses"
              />

              <MultiSelectCheckbox
                label="Template"
                containerClass="rp-cr-filter-field"
                options={templateOptions}
                selected={draftTemplateIds}
                onChange={setDraftTemplateIds}
                placeholder="All templates"
                searchable
              />

              <div className="rp-cr-filter-field">
                <label className="rp-detail-filter-label">Date Range</label>
                <div className="rp-detail-date-range">
                  <input type="date" value={draftDateFrom} max={draftDateTo || undefined} onChange={e => setDraftDateFrom(e.target.value)} className="rp-detail-date-input" />
                  <span className="rp-detail-date-sep">-</span>
                  <input type="date" value={draftDateTo} min={draftDateFrom || undefined} onChange={e => setDraftDateTo(e.target.value)} className="rp-detail-date-input" />
                </div>
                {draftDateRangeError && <div className="rp-detail-date-error">{draftDateRangeError}</div>}
              </div>

              <Select label="Delivery Status" containerClass="rp-cr-filter-field" value={draftDeliveryBucket} onChange={e => setDraftDeliveryBucket(e.target.value)}>
                {BUCKET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>

              <Select label="Read Status" containerClass="rp-cr-filter-field" value={draftReadBucket} onChange={e => setDraftReadBucket(e.target.value)}>
                {BUCKET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>

            <div className="rp-cr-filters-actions">
              <Button variant="ghost" onClick={clearDraftFilters}>Clear</Button>
              <Button variant="dark" onClick={applyFilters} disabled={!!draftDateRangeError}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
