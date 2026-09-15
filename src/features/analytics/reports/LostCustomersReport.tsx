import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { LOST_CUSTOMERS_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { maskMobile } from "../../../utils/maskMobile";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Lost Clients";
const DEFAULT_LOST_DAYS = 90;

interface LostCustomerRow {
  clientId: string;
  clientName: string;
  contact: string;
  visits: number;
  totalSpend: number;
  firstVisit: string | null;
  lastVisit: string | null;
  daysSinceLastVisit: number;
}

function mapRow(row: any): LostCustomerRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Walk-in",
    contact: row.contact || "—",
    visits: Number(row.visits) || 0,
    totalSpend: Number(row.total_spend) || 0,
    firstVisit: row.first_visit || null,
    lastVisit: row.last_visit || null,
    daysSinceLastVisit: Number(row.days_since_last_visit) || 0,
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

export default function LostCustomersReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  // On-screen the contact column is always masked; only the owner/admin role
  // gets the real number in Excel/CSV/PDF exports (staff/manager exports stay
  // masked too) — see maskMobile.
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";
  const { currencySymbol, formatAmount } = useCurrency();
  // How many days without a visit before a client counts as "lost" — a
  // user-set cutoff, unlike Customer Frequency's fixed 90-day rule.
  const [lostDaysInput, setLostDaysInput] = useState(String(DEFAULT_LOST_DAYS));
  const [lostDays,      setLostDaysApplied] = useState(DEFAULT_LOST_DAYS);
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [search,       setSearchInput]  = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,         setRows]         = useState<LostCustomerRow[]>([]);
  const [total,        setTotal]        = useState(0);
  const [stats,        setStats]        = useState({ totalLostClients: 0, totalSpendWhenActive: 0 });
  const [loading,      setLoading]      = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const selection = useRowSelection();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  // "Inactive for N days" is applied on blur/Enter rather than on every
  // keystroke — re-fetching mid-typing (e.g. "9" before "90" is finished)
  // would flash the wrong cutoff's results.
  const commitLostDays = () => {
    const n = Math.max(1, parseInt(lostDaysInput, 10) || DEFAULT_LOST_DAYS);
    setLostDaysInput(String(n));
    setLostDaysApplied(n);
  };

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        lost_days: lostDays,
        page: currentPage, limit: pageSize,
      };
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(LOST_CUSTOMERS_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalLostClients: Number(s.total_lost_clients) || 0,
        totalSpendWhenActive: Number(s.total_spend_when_active) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalLostClients: 0, totalSpendWhenActive: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [lostDays, staffFilterIds, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [lostDays, staffFilterIds, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
  }), [staffFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
  };

  const HEADERS = ["Client Name", "Contact", "Total Visits", `Total Spend (${currencySymbol})`, "First Visit", "Last Visit", "Days Since Last Visit"];
  const exportRows = () => rows.map(r => [
    r.clientName, canViewFullContact ? r.contact : maskMobile(r.contact), r.visits, r.totalSpend,
    formatDate(r.firstVisit), formatDate(r.lastVisit),
    r.daysSinceLastVisit,
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
              reportId="lost_customers"
              filename={`lost-customers-${lostDays}d`}
              variant="button"
              csv
              filterLines={[
                `Inactive for: ${lostDays}+ days`,
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
              ]}
              summaryLines={[
                `Total Lost Clients: ${stats.totalLostClients}`,
                `Total Spend When Active: ${formatAmount(stats.totalSpendWhenActive)}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group" style={{ minWidth: 100 }}>
          <label htmlFor="lost-days-input" className="rp-detail-filter-label">Inactive for (days)</label>
          <input
            id="lost-days-input"
            type="number"
            min={1}
            value={lostDaysInput}
            onChange={e => setLostDaysInput(e.target.value)}
            onBlur={commitLostDays}
            onKeyDown={e => { if (e.key === "Enter") commitLostDays(); }}
            style={{ height: 32, padding: "0 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={2} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalLostClients}</div><div className="rp-sra-summary-label">Total Lost Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalSpendWhenActive)}</div><div className="rp-sra-summary-label">Total Spend When Active</div></div>
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
              <th>Client Name</th><th>Contact</th><th>Total Visits</th>
              <th>Total Spend ({currencySymbol})</th>
              <th>First Visit</th><th>Last Visit</th>
              <th>Days Since Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No lost clients found</td></tr>
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
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.visits}</td>
                <td className="fw-semibold" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.totalSpend)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatDate(r.firstVisit)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatDate(r.lastVisit)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>
                  <span className="rp-status-badge rp-status-cancelled">{r.daysSinceLastVisit}d</span>
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
        defaultCampaignName="Lost Clients"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
