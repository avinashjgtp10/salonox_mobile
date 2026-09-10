import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TelephoneFill, Whatsapp, PersonPlusFill, PencilSquare } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { ENQUIRY_REPORT } from "../../../services/api/endpoints";
import { ENQUIRY } from "../../../services/api/endpoints/enquiries.endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { formatFollowUpAt } from "../../enquiries/utils/enquiryFormat";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "./ClientRevenueReport.scss";
import "./MembershipOpportunityReport.scss";

const REPORT_NAME = "Enquiry Report";

// Kept in sync with enquiries.types.ts's ENQUIRY_STATUSES on the backend —
// "Closed" retained alongside "Lost" so existing enquiries already marked
// Closed keep displaying/filtering correctly.
const STATUS_OPTIONS = [
  { id: "New", label: "New" },
  { id: "Contacted", label: "Contacted" },
  { id: "Follow-up", label: "Follow-up" },
  { id: "Converted", label: "Converted" },
  { id: "Lost", label: "Lost" },
  { id: "Closed", label: "Closed" },
];

interface EnquiryRow {
  enquiryId: string;
  enquiryNo: number;
  name: string;
  phone: string;
  serviceName: string | null;
  staffName: string | null;
  status: string;
  source: string | null;
  followUpAt: string | null;
  notes: string | null;
  createdAt: string;
}

function mapRow(row: any): EnquiryRow {
  return {
    enquiryId: row.enquiry_id ? String(row.enquiry_id) : "",
    enquiryNo: Number(row.enquiry_no) || 0,
    name: row.name || "Unnamed",
    phone: row.phone || "—",
    serviceName: row.service_name || null,
    staffName: row.staff_name || null,
    status: row.status || "New",
    source: row.source || null,
    followUpAt: row.follow_up_at || null,
    notes: row.notes || null,
    createdAt: row.created_at || "",
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return formatDateDDMMYYYY(d);
}

function cleanPhoneForWa(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  return p;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  New: "rp-status-booked",
  Contacted: "rp-status-confirmed",
  "Follow-up": "rp-status-pending",
  Converted: "rp-status-completed",
  Lost: "rp-status-cancelled",
  Closed: "rp-status-refunded",
};

// Centralized read/report view over the same enquiries table the Add
// Enquiry form and EnquiriesListPage already manage — richer filters
// (staff/service/source/follow-up date), KPI cards, and quick actions
// (Call/WhatsApp/Convert/Edit) on top of the exact same data, not a
// separate enquiry pipeline.
export default function EnquiryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", ...getDateRangePresetValue("all_time") });
  const [staffFilter, setStaffFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [serviceOptions, setServiceOptions] = useState<{ id: string; label: string }[]>([]);
  const [sourceOptions, setSourceOptions] = useState<{ id: string; label: string }[]>([]);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalEnquiries: 0, newEnquiries: 0, pendingFollowUps: 0,
    convertedEnquiries: 0, lostEnquiries: 0, conversionRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
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
      if (statusFilter.length) body.statuses = statusFilter;
      if (sourceFilter.length) body.sources = sourceFilter;
      if (followUpDate) body.follow_up_date = followUpDate;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(ENQUIRY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalEnquiries: Number(s.total_enquiries) || 0,
        newEnquiries: Number(s.new_enquiries) || 0,
        pendingFollowUps: Number(s.pending_follow_ups) || 0,
        convertedEnquiries: Number(s.converted_enquiries) || 0,
        lostEnquiries: Number(s.lost_enquiries) || 0,
        conversionRate: Number(s.conversion_rate) || 0,
      });
      const fa = data?.filters_available;
      if (Array.isArray(fa?.staff)) setStaffOptions(fa.staff);
      if (Array.isArray(fa?.services)) setServiceOptions(fa.services);
      if (Array.isArray(fa?.sources)) setSourceOptions(fa.sources);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalEnquiries: 0, newEnquiries: 0, pendingFollowUps: 0, convertedEnquiries: 0, lostEnquiries: 0, conversionRate: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateRange, staffFilter, serviceFilter, statusFilter, sourceFilter, followUpDate, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateRange, staffFilter, serviceFilter, statusFilter, sourceFilter, followUpDate, debouncedSearch]);

  const filterFields: JiraFilterField[] = [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "service", label: "Service", options: serviceOptions, searchable: true },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "source", label: "Source", options: sourceOptions },
    {
      key: "followUpDate",
      label: "Follow-up Date",
      options: [],
      render: (draft, setDraft) => (
        <div className="rp-mo-visits-field">
          <label htmlFor="jfm-enq-followup-input">Follow-up on</label>
          <input
            id="jfm-enq-followup-input"
            type="date"
            value={draft[0] ?? ""}
            onChange={(e) => setDraft(e.target.value ? [e.target.value] : [])}
          />
          <p className="rp-mo-visits-field__hint">Shows enquiries with a follow-up scheduled on this date.</p>
        </div>
      ),
    },
  ];
  const filterMenuSelected = {
    staff: staffFilter, service: serviceFilter, status: statusFilter, source: sourceFilter,
    followUpDate: followUpDate ? [followUpDate] : [],
  };
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilter(next.staff ?? []);
    setServiceFilter(next.service ?? []);
    setStatusFilter(next.status ?? []);
    setSourceFilter(next.source ?? []);
    setFollowUpDate(next.followUpDate?.[0] ?? "");
  };

  const handleStatusChange = async (enquiry: EnquiryRow, status: string) => {
    if (status === enquiry.status) return;
    setUpdatingStatusId(enquiry.enquiryId);
    setRows((prev) => prev.map((e) => (e.enquiryId === enquiry.enquiryId ? { ...e, status } : e)));
    try {
      await api.patch(ENQUIRY.BY_ID(enquiry.enquiryId), { status });
      fetchData();
    } catch {
      setRows((prev) => prev.map((e) => (e.enquiryId === enquiry.enquiryId ? { ...e, status: enquiry.status } : e)));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConvert = async (enquiry: EnquiryRow) => {
    await handleStatusChange(enquiry, "Converted");
    navigate("/dashboard/clients/add", { state: { prefillName: enquiry.name, prefillPhone: enquiry.phone } });
  };

  const HEADERS = ["Enquiry Name", "Phone", "Service", "Staff", "Status", "Source", "Follow-up Date & Time", "Notes", "Created Date"];
  const exportRows = () => rows.map(r => [
    r.name, r.phone, r.serviceName ?? "—", r.staffName ?? "—", r.status,
    r.source ?? "—", formatFollowUpAt(r.followUpAt), r.notes ?? "—", formatDate(r.createdAt),
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
              filename="enquiry-report"
              variant="button"
              csv
              filterLines={[
                ...(dateRange.startDate || dateRange.endDate ? [`Date: ${dateRange.startDate || "…"} to ${dateRange.endDate || "…"}`] : []),
                ...(staffFilter.length ? [`Staff: ${staffFilter.length} selected`] : []),
                ...(serviceFilter.length ? [`Service: ${serviceFilter.length} selected`] : []),
                ...(statusFilter.length ? [`Status: ${statusFilter.join(", ")}`] : []),
                ...(sourceFilter.length ? [`Source: ${sourceFilter.join(", ")}`] : []),
                ...(followUpDate ? [`Follow-up on: ${followUpDate}`] : []),
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
              ]}
              summaryLines={[
                `Total Enquiries: ${stats.totalEnquiries}`,
                `Conversion Rate: ${stats.conversionRate}%`,
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

      {loading ? <SkeletonStatCards count={6} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalEnquiries}</div><div className="rp-sra-summary-label">Total Enquiries</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.newEnquiries}</div><div className="rp-sra-summary-label">New Enquiries</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.pendingFollowUps}</div><div className="rp-sra-summary-label">Pending Follow-ups</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.convertedEnquiries}</div><div className="rp-sra-summary-label">Converted</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.lostEnquiries}</div><div className="rp-sra-summary-label">Lost</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.conversionRate}%</div><div className="rp-sra-summary-label">Conversion Rate</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Name or phone" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Enquiry Name</th><th>Phone</th><th>Service</th><th>Staff</th>
              <th>Status</th><th>Source</th><th>Follow-up Date &amp; Time</th>
              <th>Notes</th><th>Created Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No enquiries match these filters</td></tr>
            ) : rows.map((r) => (
              <tr key={r.enquiryId}>
                <td className="fw-semibold">{r.name}</td>
                <td>{r.phone}</td>
                <td>{r.serviceName ?? "—"}</td>
                <td>{r.staffName ?? "—"}</td>
                <td>
                  <select
                    className={`rp-status-badge ${STATUS_BADGE_CLASS[r.status] ?? "rp-status-refunded"}`}
                    style={{ border: "none", cursor: "pointer" }}
                    value={r.status}
                    disabled={updatingStatusId === r.enquiryId}
                    onChange={(e) => handleStatusChange(r, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </td>
                <td>{r.source ?? "—"}</td>
                <td>{formatFollowUpAt(r.followUpAt)}</td>
                <td title={r.notes ?? undefined}>{r.notes ? (r.notes.length > 30 ? `${r.notes.slice(0, 30)}…` : r.notes) : "—"}</td>
                <td>{formatDate(r.createdAt)}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={`tel:${r.phone}`} title="Call client" style={{ color: "#16a34a" }}><TelephoneFill size={15} /></a>
                    <a href={`https://wa.me/${cleanPhoneForWa(r.phone)}`} target="_blank" rel="noreferrer" title="WhatsApp client" style={{ color: "#25d366" }}><Whatsapp size={16} /></a>
                    <button type="button" title="Edit enquiry" onClick={() => navigate(`/dashboard/enquiries/edit/${r.enquiryId}`)} style={{ border: "none", background: "transparent", color: "#6366f1", cursor: "pointer" }}>
                      <PencilSquare size={15} />
                    </button>
                    {r.status !== "Converted" && (
                      <button type="button" title="Convert to client" onClick={() => handleConvert(r)} style={{ border: "none", background: "transparent", color: "#7c3aed", cursor: "pointer" }}>
                        <PersonPlusFill size={15} />
                      </button>
                    )}
                  </div>
                </td>
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
