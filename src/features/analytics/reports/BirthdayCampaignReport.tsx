import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BIRTHDAY_CAMPAIGN_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { formatDate, formatDateTime, fmtPct } from "./campaignReportShared";
import { maskMobile } from "../../../utils/maskMobile";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./CampaignReports.scss";

const REPORT_NAME = "Birthday Campaign Performance Report";

const STATUS_OPTIONS = [
  { id: "SENT", label: "Sent" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "READ", label: "Read" },
  { id: "FAILED", label: "Failed" },
  { id: "SKIPPED", label: "Skipped" },
];
const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.id, o.label]));
const statusClass = (s: string) =>
  s === "READ" ? "ok" : s === "DELIVERED" ? "run" : s === "SENT" ? "neutral" : s === "FAILED" ? "fail" : "warn";

export interface BirthdayCampaignRow {
  id: string;
  clientId: string | null;
  clientName: string;
  phoneNumber: string | null;
  templateName: string | null;
  status: string;
  failureReason: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

function mapRow(row: any): BirthdayCampaignRow {
  return {
    id: String(row.id ?? ""),
    clientId: row.client_id ?? null,
    clientName: row.client_name || "Unknown",
    phoneNumber: row.phone_number ?? null,
    templateName: row.template_name ?? null,
    status: row.status || "—",
    failureReason: row.failure_reason ?? null,
    sentAt: row.sent_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    readAt: row.read_at ?? null,
    createdAt: row.created_at || "",
  };
}

export default function BirthdayCampaignReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  // On-screen the contact column is always masked; only the owner/admin role
  // gets the real number in Excel/CSV/PDF exports (staff/manager exports stay
  // masked too) — see maskMobile.
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [statuses, setStatuses] = useState<string[]>([]);

  const [rows, setRows] = useState<BirthdayCampaignRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0,
    deliveryRate: 0, readRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const selection = useRowSelection();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
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
      if (statuses.length > 0) body.statuses = statuses;
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;

      const res = await api.post(BIRTHDAY_CAMPAIGN_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data ?? {};
      setRows((data.rows ?? []).map(mapRow));
      setTotal(Number(data.pagination?.total) || 0);
      const s = data.stats ?? {};
      setStats({
        totalSent: Number(s.total_sent) || 0,
        totalDelivered: Number(s.total_delivered) || 0,
        totalRead: Number(s.total_read) || 0,
        totalFailed: Number(s.total_failed) || 0,
        deliveryRate: Number(s.delivery_rate) || 0,
        readRate: Number(s.read_rate) || 0,
      });
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setRows([]); setTotal(0);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, statuses, dateFrom, dateTo, currentPage, pageSize, sortBy, sortDir, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statuses, dateFrom, dateTo]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
  ], []);

  const filterMenuSelected = useMemo(() => ({ status: statuses }), [statuses]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatuses(next.status ?? []);
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
    setCurrentPage(1);
  };
  const sortIndicator = (col: string) => (sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const HEADERS = ["Client", "Phone", "Template", "Status", "Sent", "Delivered", "Read"];
  const exportRows = () => rows.map((r) => [
    r.clientName,
    canViewFullContact ? (r.phoneNumber ?? "—") : maskMobile(r.phoneNumber ?? "—"),
    r.templateName ?? "—",
    STATUS_LABELS[r.status] ?? r.status,
    r.sentAt ? formatDateTime(r.sentAt) : "—",
    r.deliveredAt ? formatDateTime(r.deliveredAt) : "—",
    r.readAt ? formatDateTime(r.readAt) : "—",
  ]);

  const hasAnySent = stats.totalSent > 0;

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
                ...(statuses.length > 0 ? [`Status: ${statuses.map((s) => STATUS_LABELS[s] ?? s).join(", ")}`] : []),
              ]}
              summaryLines={[
                `Total Sent: ${stats.totalSent}`,
                `Total Delivered: ${stats.totalDelivered}`,
                `Total Read: ${stats.totalRead}`,
                `Delivery Rate: ${fmtPct(stats.deliveryRate)}`,
                `Read Rate: ${fmtPct(stats.readRate)}`,
                `Failed: ${stats.totalFailed}`,
                `Delivery Rate = Delivered / Sent. Read Rate = Read / Delivered.`,
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

      {loading ? <SkeletonStatCards count={5} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalSent}</div><div className="rp-sra-summary-label">Total Sent</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalDelivered}</div><div className="rp-sra-summary-label">Total Delivered</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalRead}</div><div className="rp-sra-summary-label">Total Read</div></div>
          <div className="rp-sra-summary-card rp-camp-card--hero"><div className="rp-sra-summary-val">{fmtPct(stats.readRate)}</div><div className="rp-sra-summary-label">Read Rate</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalFailed}</div><div className="rp-sra-summary-label">Failed</div></div>
        </div>
      )}

      {!loading && hasAnySent && stats.totalDelivered === 0 && (
        <div className="rp-camp-notice">
          No delivery receipts have been received for these messages, so Read Rate cannot be
          calculated. This usually means WhatsApp delivery/read webhooks aren't reaching the
          system — it does not mean recipients ignored the messages.
        </div>
      )}

      <SendCampaignBar count={selection.selectedIds.size} onSendClick={() => setShowCampaignModal(true)} />

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search client name or phone"
            value={search}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-camp-table">
          <thead>
            <tr>
              <th className="rp-row-checkbox-col">
                <input
                  type="checkbox"
                  className="rp-row-checkbox"
                  checked={rows.length > 0 && rows.every(r => selection.selectedIds.has(r.id))}
                  onChange={() => selection.toggleAll(rows.map(r => r.id))}
                />
              </th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("client_name")}>Client{sortIndicator("client_name")}</th>
              <th>Phone</th>
              <th>Template</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("status")}>Status{sortIndicator("status")}</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("sent_at")}>Sent{sortIndicator("sent_at")}</th>
              <th>Delivered</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="rp-row-checkbox-col">
                  <input
                    type="checkbox"
                    className="rp-row-checkbox"
                    checked={selection.selectedIds.has(r.id)}
                    onChange={() => selection.toggleOne(r.id)}
                  />
                </td>
                <td className="fw-semibold">{r.clientName}</td>
                <td>{maskMobile(r.phoneNumber ?? "—")}</td>
                <td>{r.templateName ?? "—"}</td>
                <td>
                  <span className={`rp-wac-status rp-wac-status--${statusClass(r.status)}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
                  {r.status === "FAILED" && r.failureReason && (
                    <span className="rp-wac-warn" title={r.failureReason}> ⓘ</span>
                  )}
                </td>
                <td>{r.sentAt ? formatDateTime(r.sentAt) : "—"}</td>
                <td>{r.deliveredAt ? formatDateTime(r.deliveredAt) : "—"}</td>
                <td>{r.readAt ? formatDateTime(r.readAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} />

      <SendCampaignModal
        show={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        contacts={rows
          .filter(r => selection.selectedIds.has(r.id) && r.phoneNumber)
          .map(r => ({ phone: r.phoneNumber as string, name: r.clientName }))}
        defaultCampaignName="Birthday Campaign"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
