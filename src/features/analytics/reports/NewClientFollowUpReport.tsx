import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { NEW_CLIENT_FOLLOW_UP_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { maskMobile } from "../../../utils/maskMobile";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "New Client Follow-Up";
const DEFAULT_NEW_WITHIN_DAYS = 7;

interface FollowUpRow {
  clientId: string;
  clientName: string;
  contact: string;
  joinedDate: string;
  daysSinceJoined: number;
}

function mapRow(row: any): FollowUpRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Unnamed Client",
    contact: row.contact || "—",
    joinedDate: row.joined_date || "",
    daysSinceJoined: Number(row.days_since_joined) || 0,
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

export default function NewClientFollowUpReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";

  // How many days since joining still counts as "new" — same pattern as Lost
  // Clients' "Inactive for (days)" input, just the inverse direction.
  const [newDaysInput, setNewDaysInput] = useState(String(DEFAULT_NEW_WITHIN_DAYS));
  const [newDays, setNewDaysApplied] = useState(DEFAULT_NEW_WITHIN_DAYS);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<FollowUpRow[]>([]);
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

  const commitNewDays = () => {
    const n = Math.max(1, parseInt(newDaysInput, 10) || DEFAULT_NEW_WITHIN_DAYS);
    setNewDaysInput(String(n));
    setNewDaysApplied(n);
  };

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        new_within_days: newDays,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(NEW_CLIENT_FOLLOW_UP_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      setStats({ totalEligible: Number(data?.stats?.total_eligible) || 0 });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalEligible: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [newDays, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [newDays, debouncedSearch]);

  const HEADERS = ["Client Name", "Contact", "Joined Date", "Days Since Joined"];
  const exportRows = () => rows.map(r => [
    r.clientName, canViewFullContact ? r.contact : maskMobile(r.contact),
    formatDate(r.joinedDate), r.daysSinceJoined,
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
              reportId="new_client_follow_up"
              filename={`new-client-follow-up-${newDays}d`}
              variant="button"
              csv
              filterLines={[
                `New within: ${newDays} day${newDays !== 1 ? "s" : ""}`,
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
        <div className="rp-detail-filter-group" style={{ minWidth: 100 }}>
          <label htmlFor="new-days-input" className="rp-detail-filter-label">New within (days)</label>
          <input
            id="new-days-input"
            type="number"
            min={1}
            value={newDaysInput}
            onChange={e => setNewDaysInput(e.target.value)}
            onBlur={commitNewDays}
            onKeyDown={e => { if (e.key === "Enter") commitNewDays(); }}
            style={{ height: 32, padding: "0 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={1} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalEligible}</div><div className="rp-sra-summary-label">New Clients Needing Follow-Up</div></div>
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
              <th>Client Name</th><th>Contact</th><th>Joined Date</th><th>Days Since Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={5} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="rp-detail-empty-cell">No new clients need follow-up right now</td></tr>
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
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatDate(r.joinedDate)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>
                  <span className="rp-status-badge rp-status-cancelled">{r.daysSinceJoined}d</span>
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
        defaultCampaignName="New Client Follow-Up"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
