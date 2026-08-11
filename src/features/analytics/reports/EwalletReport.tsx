import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { EWALLET, EWALLET_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./EwalletReport.scss";

const REPORT_NAME = "Ewallet";

const STATUS_OPTIONS = [
  { id: "with_balance", label: "With Balance" },
  { id: "no_balance", label: "No Balance" },
];

interface ClientRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  balance: number;
}

interface Breakdown {
  balance: number;
  referral_rewards: number;
  reward_credits: number;
  other_credits: number;
  wallet_debits: number;
}

interface LedgerRow {
  date: string;
  type: string;
  amount: number;
  balanceAfter: number;
  source: string;
  note: string;
}

const EMPTY_BREAKDOWN: Breakdown = { balance: 0, referral_rewards: 0, reward_credits: 0, other_credits: 0, wallet_debits: 0 };

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function EwalletReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const today   = new Date().toISOString().slice(0, 10);
  const [asOfDate,    setAsOfDate]    = useState(today);
  const [rows,        setRows]        = useState<ClientRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalClients: 0, withBalance: 0, totalValue: 0, avgBalance: 0 });
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [minBalance,  setMinBalance]  = useState("");
  const [maxBalance,  setMaxBalance]  = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const [selected,     setSelected]     = useState<ClientRow | null>(null);
  const [breakdown,    setBreakdown]    = useState<Breakdown>(EMPTY_BREAKDOWN);
  const [ledger,       setLedger]       = useState<LedgerRow[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const drawerAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        as_of_date: asOfDate,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      // Backend's status knob is a single value — checking exactly one of
      // the two options narrows normally; checking both (or neither) means
      // "no filter", so nothing is sent (same pattern as Reward Report).
      if (statusFilter.length === 1) body.status = statusFilter[0];
      if (minBalance !== "") body.balance_min = Number(minBalance);
      if (maxBalance !== "") body.balance_max = Number(maxBalance);
      const res = await api.post(EWALLET_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map((c: any) => ({
        id: String(c.client_id),
        name: c.client_name || "—",
        phone: c.phone || "—",
        email: c.email || "—",
        balance: Number(c.balance) || 0,
      })));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalClients: Number(s.total_clients) || 0,
        withBalance: Number(s.with_balance) || 0,
        totalValue: Number(s.total_wallet_value) || 0,
        avgBalance: Number(s.avg_balance) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalClients: 0, withBalance: 0, totalValue: 0, avgBalance: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [asOfDate, debouncedSearch, statusFilter, minBalance, maxBalance, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [asOfDate, debouncedSearch, statusFilter, minBalance, maxBalance]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Balance Status", options: STATUS_OPTIONS },
  ], []);

  const filterMenuSelected = useMemo(() => ({ status: statusFilter }), [statusFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
  };

  const openDrawer = useCallback(async (row: ClientRow) => {
    setSelected(row);
    drawerAbortRef.current?.abort();
    const ctrl = new AbortController();
    drawerAbortRef.current = ctrl;
    setDrawerLoading(true);
    try {
      const [breakdownRes, ledgerRes] = await Promise.all([
        api.get(EWALLET.BREAKDOWN(row.id), { signal: ctrl.signal }),
        api.get(EWALLET.LEDGER(row.id), { signal: ctrl.signal }),
      ]);
      const b = breakdownRes.data?.data ?? breakdownRes.data ?? {};
      setBreakdown({
        balance: Number(b.balance ?? row.balance) || 0,
        referral_rewards: Number(b.referral_rewards) || 0,
        reward_credits: Number(b.reward_credits) || 0,
        other_credits: Number(b.other_credits) || 0,
        wallet_debits: Number(b.wallet_debits) || 0,
      });
      const rawLedger = ledgerRes.data?.data ?? ledgerRes.data ?? [];
      const list: any[] = Array.isArray(rawLedger) ? rawLedger : [];
      setLedger(list.map((l: any) => ({
        date: String(l.created_at ?? "").slice(0, 10),
        type: l.type ?? (Number(l.amount ?? 0) >= 0 ? "topup" : "redeem"),
        amount: Number(l.amount) || 0,
        balanceAfter: Number(l.balance_after) || 0,
        source: l.source_type ?? "—",
        note: l.note ?? "—",
      })));
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") { setBreakdown(EMPTY_BREAKDOWN); setLedger([]); }
    } finally {
      if (!ctrl.signal.aborted) setDrawerLoading(false);
    }
  }, []);

  const HEADERS = ["Client", "Phone", "Email", `Wallet Balance (${currencySymbol})`];
  const exportRows = () => rows.map(r => [r.name, r.phone, r.email, r.balance]);

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
              filename={`ewallet-balances-${asOfDate}`}
              variant="button"
              csv
              dateRangeLabel={`As of ${formatDate(asOfDate)}`}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
              ]}
              summaryLines={[
                `Total Clients: ${stats.totalClients}`,
                `With Wallet Balance: ${stats.withBalance}`,
                `Total Wallet Value: ${formatAmount(stats.totalValue)}`,
                `Average Balance: ${formatAmount(stats.avgBalance)}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">As of Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={asOfDate} max={today} onChange={e => setAsOfDate(e.target.value)} className="rp-detail-date-input" />
          </div>
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Balance Status" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Balance Range</label>
          <div className="rp-ew-range-inputs">
            <input type="number" min={0} placeholder="Min" value={minBalance} onChange={e => setMinBalance(e.target.value)} />
            <span>—</span>
            <input type="number" min={0} placeholder="Max" value={maxBalance} onChange={e => setMaxBalance(e.target.value)} />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalClients}</div><div className="rp-sra-summary-label">Total Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.withBalance}</div><div className="rp-sra-summary-label">With Wallet Balance</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalValue)}</div><div className="rp-sra-summary-label">Total Wallet Value</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.avgBalance)}</div><div className="rp-sra-summary-label">Avg Balance</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Client name, phone or email"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Client</th><th>Phone</th><th>Email</th><th>Wallet Balance ({currencySymbol})</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={4} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="rp-detail-empty-cell">No clients found</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="rp-appt-row" onClick={() => openDrawer(r)}>
                <td className="fw-semibold"><span className="rp-detail-link">{r.name}</span></td>
                <td>{r.phone}</td>
                <td>{r.email}</td>
                <td className={r.balance > 0 ? "rp-ew-credit fw-semibold" : "fw-semibold"}>{formatAmount(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selected && (
        <div className="rp-appt-drawer-overlay" onClick={() => setSelected(null)}>
          <div className="rp-appt-drawer rp-ew-drawer" onClick={e => e.stopPropagation()}>
            <button className="rp-appt-drawer-close" onClick={() => setSelected(null)}>✕</button>

            <div className="rp-appt-drawer-hero">
              <div className="rp-appt-drawer-avatar">{selected.name.charAt(0).toUpperCase()}</div>
              <div className="rp-appt-drawer-hero-info">
                <div className="rp-appt-drawer-client">{selected.name}</div>
                <span className="rp-ew-drawer-phone">{selected.phone}</span>
              </div>
            </div>

            <div className="rp-appt-drawer-body">
              {drawerLoading ? (
                <>
                  <div className="rp-appt-drawer-section-title">Wallet Breakdown</div>
                  <div className="rp-ew-drawer-stats">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rp-ew-drawer-stat">
                        <div className="rp-skel-bar rp-ew-skel-val" />
                        <div className="rp-skel-bar rp-ew-skel-label" />
                      </div>
                    ))}
                  </div>
                  <div className="rp-appt-drawer-section-title rp-ew-drawer-ledger-title">Transaction History</div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rp-appt-drawer-meta-row">
                      <div className="rp-skel-bar rp-ew-skel-meta" />
                      <div className="rp-skel-bar rp-ew-skel-amount" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="rp-appt-drawer-section-title">Wallet Breakdown</div>
                  <div className="rp-ew-drawer-stats">
                    <div className="rp-ew-drawer-stat"><span>{formatAmount(breakdown.balance)}</span><label>Balance</label></div>
                    <div className="rp-ew-drawer-stat"><span>{formatAmount(breakdown.referral_rewards)}</span><label>Referral</label></div>
                    <div className="rp-ew-drawer-stat"><span>{formatAmount(breakdown.reward_credits)}</span><label>Rewards</label></div>
                    <div className="rp-ew-drawer-stat"><span>{formatAmount(breakdown.other_credits)}</span><label>Other</label></div>
                    <div className="rp-ew-drawer-stat"><span className="rp-ew-debit">{formatAmount(breakdown.wallet_debits)}</span><label>Debits</label></div>
                  </div>

                  <div className="rp-appt-drawer-section-title rp-ew-drawer-ledger-title">Transaction History</div>
                  {ledger.length === 0 ? (
                    <div className="rp-detail-empty-cell">No wallet transactions found</div>
                  ) : (
                    <div className="rp-ew-drawer-ledger">
                      {ledger.map((l, i) => (
                        <div key={i} className="rp-appt-drawer-meta-row">
                          <span className="rp-appt-drawer-meta-label">{l.date ? formatDate(l.date) : "—"} · <span className="rp-ew-type">{l.type}</span></span>
                          <span className={`rp-appt-drawer-meta-val ${l.amount >= 0 ? "rp-ew-credit" : "rp-ew-debit"}`}>
                            {l.amount >= 0 ? `+${formatAmount(l.amount)}` : `-${formatAmount(Math.abs(l.amount))}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
