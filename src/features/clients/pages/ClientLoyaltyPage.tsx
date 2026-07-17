import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Star, ArrowUpCircle, People, Gift } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import { Pagination, Loader } from "../../../components/ui";
import WalletBreakdownModal from "../components/WalletBreakdownModal";
import "../styles/ClientLoyaltyPage.scss";

interface LoyaltyClientRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  walletBalance: number;
  rewardPointsBalance: number;
  referralCode: string | null;
  referralStatus: "pending" | "completed" | null;
  refereeRewarded: boolean;
  referredByClientId: string | null;
  isActive: boolean;
  createdAt: string;
}

function mapClient(c: any): LoyaltyClientRow {
  return {
    id: String(c.id),
    name: c.full_name ?? (`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—"),
    phone: c.phone_number ?? null,
    email: c.email ?? null,
    walletBalance: Number(c.ewallet_balance) || 0,
    rewardPointsBalance: Number(c.reward_points_balance) || 0,
    referralCode: c.referral_code ?? null,
    referralStatus: c.referral_reward_status ?? null,
    refereeRewarded: !!c.referral_referee_rewarded,
    referredByClientId: c.referred_by_client_id ?? null,
    isActive: c.is_active !== false,
    createdAt: c.created_at ?? "",
  };
}

const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ClientLoyaltyPage() {
  const [rows, setRows] = useState<LoyaltyClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchClients = useCallback(async (page: number, ps: number, q: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await api.get(CLIENT.BASE, {
        params: {
          page,
          pageSize: ps,
          sort_by: "created_at",
          sort_order: "desc",
          search: q.trim() || undefined,
        },
        signal: ctrl.signal,
      });
      const data = res.data?.data ?? res.data;
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      setRows(items.map(mapClient));
      setTotal(Number(data?.total) || items.length);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") { setRows([]); setTotal(0); }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(currentPage, pageSize, search); }, [fetchClients, currentPage, pageSize, search]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const walletTotal = rows.reduce((s, r) => s + r.walletBalance, 0);
  const referralHolders = rows.filter(r => r.referralCode).length;
  const completedReferrals = rows.filter(r => r.referralStatus === "completed").length;

  return (
    <div className="loyalty-page">
      <div className="loyalty-header">
        <div>
          <h1>Referral &amp; Reward Points</h1>
          <p>Real client wallet balances, referral codes and reward activity — pulled live from client and eWallet records.</p>
        </div>
      </div>

      <div className="loyalty-stats">
        <div className="loyalty-stat-card">
          <span className="loyalty-stat-icon"><People size={18} /></span>
          <div>
            <div className="loyalty-stat-val">{total}</div>
            <div className="loyalty-stat-label">Total Clients</div>
          </div>
        </div>
        <div className="loyalty-stat-card">
          <span className="loyalty-stat-icon"><ArrowUpCircle size={18} /></span>
          <div>
            <div className="loyalty-stat-val">{money(walletTotal)}</div>
            <div className="loyalty-stat-label">Wallet Balance (this page)</div>
          </div>
        </div>
        <div className="loyalty-stat-card">
          <span className="loyalty-stat-icon"><Star size={18} /></span>
          <div>
            <div className="loyalty-stat-val">{referralHolders}</div>
            <div className="loyalty-stat-label">Referral Code Holders</div>
          </div>
        </div>
        <div className="loyalty-stat-card">
          <span className="loyalty-stat-icon"><Gift size={18} /></span>
          <div>
            <div className="loyalty-stat-val">{completedReferrals}</div>
            <div className="loyalty-stat-label">Completed Referrals</div>
          </div>
        </div>
      </div>

      <div className="loyalty-toolbar">
        <div className="loyalty-search-wrap">
          <Search size={13} className="loyalty-search-ic" />
          <input
            type="text"
            className="loyalty-search-input"
            placeholder="Search by name, phone or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="loyalty-show-n">
          <span>Show</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="loyalty-table-wrap">
        <table className="loyalty-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Wallet Balance</th>
              <th>Referral Code</th>
              <th>Referral Status</th>
              <th>Reward Points</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="loyalty-empty-cell"><Loader message="Loading clients..." /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="loyalty-empty-cell">No clients found</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="loyalty-row" onClick={() => setSelectedClientId(r.id)}>
                <td className="fw-semibold">{r.name}</td>
                <td>
                  <div>{r.phone || "—"}</div>
                  {r.email && <div className="loyalty-email">{r.email}</div>}
                </td>
                <td className="fw-semibold">{money(r.walletBalance)}</td>
                <td>{r.referralCode || <span className="loyalty-muted">—</span>}</td>
                <td>
                  {r.referralStatus
                    ? <span className={`loyalty-badge loyalty-badge--${r.referralStatus}`}>{r.referralStatus}</span>
                    : <span className="loyalty-muted">—</span>}
                </td>
                <td>{r.rewardPointsBalance > 0 ? r.rewardPointsBalance : <span className="loyalty-muted">—</span>}</td>
                <td>
                  <span className={`loyalty-badge loyalty-badge--${r.isActive ? "active" : "inactive"}`}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="loyalty-muted">{r.createdAt ? r.createdAt.slice(0, 10) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
        // Must include the initial pageSize (20) below — a controlled <select>
        // whose value has no matching <option> falls back to visually
        // showing the first option instead, which made the dropdown
        // misleadingly display "10" while the page was still fetching 20
        // rows, until the user picked an option that actually existed.
        pageSizeOptions={[10, 20, 50, 100]}
      />

      {selectedClientId && (
        <WalletBreakdownModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
      )}
    </div>
  );
}
