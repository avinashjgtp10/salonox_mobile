import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { ALL_CLIENTS_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue, DATE_RANGE_PRESET_LABELS } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { maskMobile } from "../../../utils/maskMobile";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./AllClientsReport.scss";

const REPORT_NAME = "All Clients";

const GENDER_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "blocked", label: "Blocked" },
];

const MEMBERSHIP_OPTIONS = [
  { id: "yes", label: "Has Membership" },
  { id: "no", label: "No Membership" },
];

const PACKAGE_OPTIONS = [
  { id: "yes", label: "Has Package" },
  { id: "no", label: "No Package" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { id: "new", label: "New (never visited)" },
  { id: "repetitive", label: "Repeat Visitor" },
];

const BIRTH_MONTH_OPTIONS = [
  { id: "1", label: "January" }, { id: "2", label: "February" }, { id: "3", label: "March" },
  { id: "4", label: "April" }, { id: "5", label: "May" }, { id: "6", label: "June" },
  { id: "7", label: "July" }, { id: "8", label: "August" }, { id: "9", label: "September" },
  { id: "10", label: "October" }, { id: "11", label: "November" }, { id: "12", label: "December" },
];

interface AllClientsRow {
  clientId: string;
  clientName: string;
  contact: string;
  email: string;
  gender: string;
  birthday: string;
  address: string;
  clientSource: string;
  status: "Active" | "Blocked";
  joinedDate: string;
}

function mapRow(row: any): AllClientsRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Unnamed Client",
    contact: row.contact || "—",
    email: row.email || "—",
    gender: row.gender || "—",
    birthday: row.birthday || "—",
    address: row.address || "—",
    clientSource: row.client_source || "—",
    status: row.status === "Blocked" ? "Blocked" : "Active",
    joinedDate: row.joined_date || "",
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

// birthday_day_month is stored "MM-DD" — display as "24 Aug".
const MONTH_ABBR = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatBirthday(input: string): string {
  if (!input || !/^\d{2}-\d{2}$/.test(input)) return "—";
  const [mm, dd] = input.split("-").map(Number);
  if (!MONTH_ABBR[mm]) return "—";
  return `${dd} ${MONTH_ABBR[mm]}`;
}

export default function AllClientsReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  // On-screen the contact column is always masked; only the owner/admin role
  // gets the real number in Excel/CSV/PDF exports — see maskMobile.
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";

  const [genderFilter, setGenderFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);
  const [packageFilter, setPackageFilter] = useState<string[]>([]);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string[]>([]);
  const [birthMonthFilter, setBirthMonthFilter] = useState<string[]>([]);
  const [spendRange, setSpendRange] = useState<[string, string]>(["", ""]);
  const [sourceOptions, setSourceOptions] = useState<{ id: string; label: string }[]>([]);

  // Independent of each other — "Joined" narrows by clients.created_at,
  // "Last Visit" narrows by each client's most recent paid appointment.
  const [joinedRange, setJoinedRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });
  const [lastVisitRange, setLastVisitRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });

  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<AllClientsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, blockedClients: 0, newThisMonth: 0 });
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
      if (genderFilter.length > 0) body.genders = genderFilter;
      // status is a single-select concept server-side — checking exactly one
      // narrows normally; checking both (or neither) means "no filter".
      if (statusFilter.length === 1) body.status = statusFilter[0];
      if (sourceFilter.length === 1) body.client_source = sourceFilter[0];
      if (membershipFilter.length === 1) body.has_membership = membershipFilter[0] === "yes";
      if (packageFilter.length === 1) body.has_package = packageFilter[0] === "yes";
      if (customerTypeFilter.length === 1) body.customer_type = customerTypeFilter[0];
      if (birthMonthFilter.length === 1) body.birth_month = Number(birthMonthFilter[0]);
      if (spendRange[0]) body.total_spend_min = Number(spendRange[0]);
      if (spendRange[1]) body.total_spend_max = Number(spendRange[1]);
      if (joinedRange.startDate) body.joined_from = joinedRange.startDate;
      if (joinedRange.endDate) body.joined_to = joinedRange.endDate;
      if (lastVisitRange.startDate) body.last_visit_from = lastVisitRange.startDate;
      if (lastVisitRange.endDate) body.last_visit_to = lastVisitRange.endDate;

      const res = await api.post(ALL_CLIENTS_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.client_sources)) {
        setSourceOptions(avail.client_sources.map((o: any) => ({ id: String(o.id), label: o.label })));
      }
      const s = data?.stats ?? {};
      setStats({
        totalClients: Number(s.total_clients) || 0,
        activeClients: Number(s.active_clients) || 0,
        blockedClients: Number(s.blocked_clients) || 0,
        newThisMonth: Number(s.new_this_month) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalClients: 0, activeClients: 0, blockedClients: 0, newThisMonth: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [
    debouncedSearch, genderFilter, statusFilter, sourceFilter, membershipFilter,
    packageFilter, customerTypeFilter, birthMonthFilter, spendRange,
    joinedRange, lastVisitRange, currentPage, pageSize,
  ]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch, genderFilter, statusFilter, sourceFilter, membershipFilter,
    packageFilter, customerTypeFilter, birthMonthFilter, spendRange,
    joinedRange, lastVisitRange,
  ]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "gender", label: "Gender", options: GENDER_OPTIONS },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "source", label: "Client Source", options: sourceOptions, searchable: true },
    { key: "membership", label: "Membership", options: MEMBERSHIP_OPTIONS },
    { key: "package", label: "Package", options: PACKAGE_OPTIONS },
    { key: "customerType", label: "Visit History", options: CUSTOMER_TYPE_OPTIONS },
    { key: "birthMonth", label: "Birth Month", options: BIRTH_MONTH_OPTIONS, searchable: true },
    {
      key: "spend",
      label: "Total Spend",
      options: [],
      // Not a checkbox list — a min/max pair. The draft carries it as
      // [min, max]; an empty array means "no spend filter".
      render: (draft, setDraft) => (
        <div className="clients-filter-range">
          <input
            type="number" min="0" placeholder="Min" className="form-control custom-focus-select"
            value={draft[0] ?? ""} onChange={(e) => setDraft([e.target.value, draft[1] ?? ""])}
          />
          <span className="clients-filter-range__sep">to</span>
          <input
            type="number" min="0" placeholder="Max" className="form-control custom-focus-select"
            value={draft[1] ?? ""} onChange={(e) => setDraft([draft[0] ?? "", e.target.value])}
          />
        </div>
      ),
    },
  ], [sourceOptions]);

  const filterMenuSelected = useMemo(() => ({
    gender: genderFilter,
    status: statusFilter,
    source: sourceFilter,
    membership: membershipFilter,
    package: packageFilter,
    customerType: customerTypeFilter,
    birthMonth: birthMonthFilter,
    spend: spendRange[0] || spendRange[1] ? spendRange : [],
  }), [genderFilter, statusFilter, sourceFilter, membershipFilter, packageFilter, customerTypeFilter, birthMonthFilter, spendRange]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setGenderFilter(next.gender ?? []);
    setStatusFilter(next.status ?? []);
    setSourceFilter(next.source ?? []);
    setMembershipFilter(next.membership ?? []);
    setPackageFilter(next.package ?? []);
    setCustomerTypeFilter(next.customerType ?? []);
    setBirthMonthFilter(next.birthMonth ?? []);
    setSpendRange([next.spend?.[0] ?? "", next.spend?.[1] ?? ""]);
  };

  const HEADERS = ["Client Name", "Contact", "Email", "Gender", "Birthday", "Address", "Source", "Status", "Joined Date"];
  const exportRows = () => rows.map(r => [
    r.clientName, canViewFullContact ? r.contact : maskMobile(r.contact), r.email,
    r.gender, formatBirthday(r.birthday), r.address, r.clientSource, r.status,
    r.joinedDate ? formatDate(r.joinedDate) : "—",
  ]);

  const activeFilterLines = [
    ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
    ...(genderFilter.length > 0 ? [`Gender: ${GENDER_OPTIONS.filter(o => genderFilter.includes(o.id)).map(o => o.label).join(", ")}`] : []),
    ...(statusFilter.length === 1 ? [`Status: ${STATUS_OPTIONS.find(o => o.id === statusFilter[0])?.label}`] : []),
    ...(sourceFilter.length === 1 ? [`Source: ${sourceOptions.find(o => o.id === sourceFilter[0])?.label ?? sourceFilter[0]}`] : []),
    ...(membershipFilter.length === 1 ? [`Membership: ${MEMBERSHIP_OPTIONS.find(o => o.id === membershipFilter[0])?.label}`] : []),
    ...(packageFilter.length === 1 ? [`Package: ${PACKAGE_OPTIONS.find(o => o.id === packageFilter[0])?.label}`] : []),
    ...(customerTypeFilter.length === 1 ? [`Visit History: ${CUSTOMER_TYPE_OPTIONS.find(o => o.id === customerTypeFilter[0])?.label}`] : []),
    ...(birthMonthFilter.length === 1 ? [`Birth Month: ${BIRTH_MONTH_OPTIONS.find(o => o.id === birthMonthFilter[0])?.label}`] : []),
    ...(spendRange[0] || spendRange[1] ? [`Total Spend: ${spendRange[0] || "0"} - ${spendRange[1] || "∞"}`] : []),
    ...(joinedRange.preset !== "all_time" ? [`Joined: ${DATE_RANGE_PRESET_LABELS[joinedRange.preset]}${joinedRange.preset === "custom" ? ` (${joinedRange.startDate} - ${joinedRange.endDate})` : ""}`] : []),
    ...(lastVisitRange.preset !== "all_time" ? [`Last Visit: ${DATE_RANGE_PRESET_LABELS[lastVisitRange.preset]}${lastVisitRange.preset === "custom" ? ` (${lastVisitRange.startDate} - ${lastVisitRange.endDate})` : ""}`] : []),
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
              filename={`all-clients-${new Date().toISOString().slice(0, 10)}`}
              variant="button"
              csv
              filterLines={activeFilterLines}
              summaryLines={[
                `Total Clients: ${stats.totalClients}`,
                `Active: ${stats.activeClients}`,
                `Blocked: ${stats.blockedClients}`,
                `New This Month: ${stats.newThisMonth}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Joined</label>
          <DateRangeFilter value={joinedRange} onChange={setJoinedRange} />
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Last Visit</label>
          <DateRangeFilter value={lastVisitRange} onChange={setLastVisitRange} />
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalClients}</div><div className="rp-sra-summary-label">Total Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.activeClients}</div><div className="rp-sra-summary-label">Active</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.blockedClients}</div><div className="rp-sra-summary-label">Blocked</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.newThisMonth}</div><div className="rp-sra-summary-label">New This Month</div></div>
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
              <th>Client Name</th><th>Contact</th><th>Email</th><th>Gender</th>
              <th>Birthday</th><th>Address</th><th>Source</th><th>Status</th><th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No clients found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
              >
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
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.gender}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatBirthday(r.birthday)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.address}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.clientSource}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>
                  <span className={`rp-status-badge ${r.status === "Active" ? "rp-status-paid" : "rp-status-unpaid"}`}>
                    {r.status}
                  </span>
                </td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.joinedDate ? formatDate(r.joinedDate) : "—"}</td>
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
        defaultCampaignName="All Clients"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
