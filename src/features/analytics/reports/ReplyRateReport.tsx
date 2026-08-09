import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REPLY_RATE_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import ReplyRateDetailModal from "./ReplyRateDetailModal";
import {
  CAMPAIGN_STATUS_OPTIONS, CAMPAIGN_STATUS_LABELS,
  MESSAGE_STATUS_OPTIONS, MESSAGE_STATUS_LABELS,
  CHANNEL_OPTIONS, CHANNEL_LABELS,
  PRESETS, formatDate, fmtPct, campStatusClass,
} from "./campaignReportShared";
import "./CampaignReports.scss";

const REPORT_NAME = "Reply Rate Report";

export interface ReplyRateRow {
  id: string;
  name: string;
  templateName: string;
  status: string;
  channel: string;
  createdAt: string;
  totalContacts: number;
  sent: number;
  reached: number;
  delivered: number;
  opened: number;
  failed: number;
  replied: number;
  replyRate: number;
}

function mapRow(row: any): ReplyRateRow {
  return {
    id: String(row.id ?? ""),
    name: row.name || "—",
    templateName: row.template_name || "—",
    status: row.status || "—",
    channel: row.channel || "whatsapp",
    createdAt: row.created_at || "",
    totalContacts: Number(row.total_contacts) || 0,
    sent: Number(row.sent) || 0,
    reached: Number(row.reached) || 0,
    delivered: Number(row.delivered) || 0,
    opened: Number(row.opened) || 0,
    failed: Number(row.failed) || 0,
    replied: Number(row.replied) || 0,
    replyRate: Number(row.reply_rate) || 0,
  };
}

export default function ReplyRateReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<string>("");
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [campaignStatuses, setCampaignStatuses] = useState<string[]>([]);
  const [messageStatuses, setMessageStatuses] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<{ id: string; label: string }[]>([]);

  const [rows, setRows] = useState<ReplyRateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalCampaigns: 0, totalSent: 0, totalReached: 0, totalDelivered: 0,
    totalOpened: 0, totalReplied: 0, totalFailed: 0, replyRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailCampaign, setDetailCampaign] = useState<ReplyRateRow | null>(null);
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
      const body: Record<string, any> = {
        page: currentPage, limit: pageSize, sort_by: sortBy, sort_dir: sortDir,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (campaignIds.length > 0) body.campaign_ids = campaignIds;
      if (campaignStatuses.length > 0) body.campaign_statuses = campaignStatuses;
      if (messageStatuses.length > 0) body.message_statuses = messageStatuses;
      if (channels.length > 0) body.channels = channels;
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;

      const res = await api.post(REPLY_RATE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data ?? {};
      setRows((data.rows ?? []).map(mapRow));
      setTotal(Number(data.pagination?.total) || 0);
      const s = data.stats ?? {};
      setStats({
        totalCampaigns: Number(s.total_campaigns) || 0,
        totalSent: Number(s.total_sent) || 0,
        totalReached: Number(s.total_reached) || 0,
        totalDelivered: Number(s.total_delivered) || 0,
        totalOpened: Number(s.total_opened) || 0,
        totalReplied: Number(s.total_replied) || 0,
        totalFailed: Number(s.total_failed) || 0,
        replyRate: Number(s.reply_rate) || 0,
      });
      const opts = data.filters_available?.campaigns ?? [];
      if (opts.length > 0) setCampaignOptions(opts.map((o: any) => ({ id: String(o.id), label: o.label })));
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setRows([]); setTotal(0);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, campaignIds, campaignStatuses, messageStatuses, channels,
      dateFrom, dateTo, currentPage, pageSize, sortBy, sortDir, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, campaignIds, campaignStatuses, messageStatuses, channels, dateFrom, dateTo]);

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (activePreset === id) { setActivePreset(""); setDateFrom(""); setDateTo(""); return; }
    const [from, to] = preset.range();
    setActivePreset(id); setDateFrom(from); setDateTo(to);
  };

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "campaign", label: "Campaign Name", options: campaignOptions, searchable: true },
    { key: "channel", label: "Campaign Type", options: CHANNEL_OPTIONS },
    { key: "message_status", label: "Message Status", options: MESSAGE_STATUS_OPTIONS },
    { key: "campaign_status", label: "Campaign Status", options: CAMPAIGN_STATUS_OPTIONS },
  ], [campaignOptions]);

  const filterMenuSelected = useMemo(() => ({
    campaign: campaignIds,
    channel: channels,
    message_status: messageStatuses,
    campaign_status: campaignStatuses,
  }), [campaignIds, channels, messageStatuses, campaignStatuses]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setCampaignIds(next.campaign ?? []);
    setChannels((next.channel ?? []).filter((c) => c === "whatsapp"));
    setMessageStatuses(next.message_status ?? []);
    setCampaignStatuses(next.campaign_status ?? []);
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
    setCurrentPage(1);
  };
  const sortIndicator = (col: string) => (sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const HEADERS = ["Campaign Name", "Date", "Channel", "Sent", "Failed", "Reached", "Replied", "Reply Rate"];
  const exportRows = () => rows.map((r) => [
    r.name,
    r.createdAt ? formatDate(r.createdAt) : "—",
    CHANNEL_LABELS[r.channel] ?? r.channel,
    r.sent, r.failed, r.reached, r.replied,
    fmtPct(r.replyRate),
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
                ...(campaignIds.length > 0
                  ? [`Campaign: ${campaignOptions.filter((o) => campaignIds.includes(o.id)).map((o) => o.label).join(", ")}`]
                  : []),
                ...(channels.length > 0 ? [`Campaign Type: ${channels.map((c) => CHANNEL_LABELS[c] ?? c).join(", ")}`] : []),
                ...(messageStatuses.length > 0 ? [`Message Status: ${messageStatuses.map((s) => MESSAGE_STATUS_LABELS[s] ?? s).join(", ")}`] : []),
                ...(campaignStatuses.length > 0 ? [`Campaign Status: ${campaignStatuses.map((s) => CAMPAIGN_STATUS_LABELS[s] ?? s).join(", ")}`] : []),
              ]}
              summaryLines={[
                `Campaigns: ${stats.totalCampaigns}`,
                `Messages Sent (attempted): ${stats.totalSent}`,
                `Failed: ${stats.totalFailed}`,
                `Reached (successfully sent): ${stats.totalReached}`,
                `Replied: ${stats.totalReplied}`,
                `Reply Rate: ${fmtPct(stats.replyRate)}`,
                `Reply Rate = Replied / Reached. A reply is an incoming WhatsApp message from the`,
                `recipient within 24 hours of the campaign reaching them. Failed and blocked`,
                `messages are excluded — they never arrived, so they could not be replied to.`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo}
          onFromChange={(v) => { setDateFrom(v); setActivePreset(""); }}
          onToChange={(v) => { setDateTo(v); setActivePreset(""); }} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      <div className="rp-camp-presets">
        {PRESETS.map((p) => (
          <button key={p.id} type="button"
            className={`rp-camp-preset${activePreset === p.id ? " rp-camp-preset--on" : ""}`}
            onClick={() => applyPreset(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      {dateRangeError && <div className="rp-detail-date-error">{dateRangeError}</div>}

      {loading ? <SkeletonStatCards count={5} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalSent}</div><div className="rp-sra-summary-label">Messages Sent</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalReached}</div><div className="rp-sra-summary-label">Reached Recipients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalReplied}</div><div className="rp-sra-summary-label">Replied</div></div>
          <div className="rp-sra-summary-card rp-camp-card--hero"><div className="rp-sra-summary-val">{fmtPct(stats.replyRate)}</div><div className="rp-sra-summary-label">Reply Rate</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalCampaigns}</div><div className="rp-sra-summary-label">Campaigns</div></div>
        </div>
      )}

      {/* The attribution rule isn't self-evident from the numbers, and quietly
          guessing wrong about it is how a report loses trust. State it. */}
      <div className="rp-camp-notice rp-camp-notice--info">
        A reply is an incoming WhatsApp message from the recipient within <strong>24 hours</strong> of
        the campaign reaching them. Nothing links a message to a campaign directly, so replies are
        matched by phone number and timing. Failed and blocked messages are excluded from the rate —
        they never arrived, so they could not be replied to.
      </div>

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search campaign or template name"
            value={search}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-camp-table">
          <thead>
            <tr>
              <th className="rp-camp-sortable" onClick={() => toggleSort("name")}>Campaign Name{sortIndicator("name")}</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("created_at")}>Date{sortIndicator("created_at")}</th>
              <th>Channel</th>
              <th>Status</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("sent")}>Sent{sortIndicator("sent")}</th>
              <th>Failed</th>
              <th title="Messages that actually went out — the reply-rate denominator">Reached</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("replied")}>Replied{sortIndicator("replied")}</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("reply_rate")}>Reply Rate{sortIndicator("reply_rate")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="rp-camp-row" onClick={() => setDetailCampaign(r)}
                  title="View recipients">
                <td className="fw-semibold"><span className="rp-detail-link">{r.name}</span></td>
                <td>{r.createdAt ? formatDate(r.createdAt) : "—"}</td>
                <td>{CHANNEL_LABELS[r.channel] ?? r.channel}</td>
                <td><span className={`rp-wac-status rp-wac-status--${campStatusClass(r.status)}`}>{CAMPAIGN_STATUS_LABELS[r.status] ?? r.status}</span></td>
                <td>{r.sent}</td>
                <td className={r.failed > 0 ? "rp-wac-warn" : undefined}>{r.failed}</td>
                <td>{r.reached}</td>
                <td>{r.replied}</td>
                <td className="fw-semibold">{r.reached > 0 ? fmtPct(r.replyRate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} />

      {detailCampaign && (
        <ReplyRateDetailModal campaign={detailCampaign} onClose={() => setDetailCampaign(null)} />
      )}
    </div>
  );
}
