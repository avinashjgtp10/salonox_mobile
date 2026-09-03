import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { NO_SHOW_RECOVERY_REPORT } from "../../../services/api/endpoints";
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

const REPORT_NAME = "No-Show Recovery";

interface NoShowRow {
  appointmentId: string;
  clientId: string;
  clientName: string;
  contact: string;
  serviceName: string | null;
  staffName: string | null;
  scheduledDate: string;
  daysSince: number;
}

function mapRow(row: any): NoShowRow {
  return {
    appointmentId: row.appointment_id ? String(row.appointment_id) : "",
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Unnamed Client",
    contact: row.contact || "—",
    serviceName: row.service_name || null,
    staffName: row.staff_name || null,
    scheduledDate: row.scheduled_date || "",
    daysSince: Number(row.days_since) || 0,
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

// No-show appointments — one row per no-show booking (a client can no-show
// more than once, each recoverable independently) — same checkbox-select +
// SendCampaignBar/SendCampaignModal pattern as the other WhatsApp-enabled
// reports (Membership Opportunity, Cancellation Recovery, New Client
// Follow-Up), meant to be paired with a "We Missed You" recovery template.
export default function NoShowRecoveryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";

  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "last_month", ...getDateRangePresetValue("last_month") });
  const [staffFilter, setStaffFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [serviceOptions, setServiceOptions] = useState<{ id: string; label: string }[]>([]);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<NoShowRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalNoShows: 0 });
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
      if (dateRange.startDate) body.start_date = dateRange.startDate;
      if (dateRange.endDate) body.end_date = dateRange.endDate;
      if (staffFilter.length) body.staff_ids = staffFilter;
      if (serviceFilter.length) body.service_ids = serviceFilter;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(NO_SHOW_RECOVERY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      setStats({ totalNoShows: Number(data?.stats?.total_no_shows) || 0 });
      const fa = data?.filters_available;
      if (Array.isArray(fa?.staff)) setStaffOptions(fa.staff);
      if (Array.isArray(fa?.services)) setServiceOptions(fa.services);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalNoShows: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateRange, staffFilter, serviceFilter, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateRange, staffFilter, serviceFilter, debouncedSearch]);

  const filterFields: JiraFilterField[] = [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "service", label: "Service", options: serviceOptions, searchable: true },
  ];
  const filterMenuSelected = { staff: staffFilter, service: serviceFilter };
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilter(next.staff ?? []);
    setServiceFilter(next.service ?? []);
  };

  const HEADERS = ["Client Name", "Contact", "Service", "Staff", "Scheduled Date", "Days Since"];
  const exportRows = () => rows.map(r => [
    r.clientName, canViewFullContact ? r.contact : maskMobile(r.contact),
    r.serviceName ?? "—", r.staffName ?? "—", formatDate(r.scheduledDate), r.daysSince,
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
              filename="no-show-recovery"
              variant="button"
              csv
              filterLines={[
                ...(dateRange.startDate || dateRange.endDate ? [`Date: ${dateRange.startDate || "…"} to ${dateRange.endDate || "…"}`] : []),
                ...(staffFilter.length ? [`Staff: ${staffFilter.length} selected`] : []),
                ...(serviceFilter.length ? [`Service: ${serviceFilter.length} selected`] : []),
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
              ]}
              summaryLines={[
                `Total No-Shows: ${stats.totalNoShows}`,
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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalNoShows}</div><div className="rp-sra-summary-label">No-Show Appointments</div></div>
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
              <th>Client Name</th><th>Contact</th><th>Service</th><th>Staff</th><th>Scheduled Date</th><th>Days Since</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={7} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No no-show appointments match these filters</td></tr>
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
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.serviceName ?? "—"}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.staffName ?? "—"}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatDate(r.scheduledDate)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>
                  <span className="rp-status-badge rp-status-cancelled">{r.daysSince}d</span>
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
        defaultCampaignName="No-Show Recovery"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
