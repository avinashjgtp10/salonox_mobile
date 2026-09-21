import { useEffect, useState } from "react";
import {
  CurrencyRupee, GraphUpArrow, ClockHistory, CheckCircleFill, Wallet2,
} from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import Loader from "../../../components/ui/Loader";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import {
  SectionCard, StatTile, BoEmptyState,
  usePagination, BoPagination,
} from "../components/BranchOwnerUI";

interface SalonFinanceRow {
  salonId: string; salonName: string;
  totalRevenue: number; allTimeRevenue: number; todayRevenue: number;
  totalCommission: number; pendingPayout: number; paidOut: number;
}
interface FinanceOverview { salons: SalonFinanceRow[]; totals: Omit<SalonFinanceRow, "salonId" | "salonName">; }
interface SalonCashRow {
  salonId: string; salonName: string;
  openingBalance: number; cashRevenue: number; cashExpense: number;
  closingBalance: number; reconciliationAmount: number;
  totalSessions: number; openSessions: number; closedSessions: number;
}
interface CashManagementOverview { salons: SalonCashRow[]; totals: Omit<SalonCashRow, "salonId" | "salonName">; }

const fmtMoney = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`);

export default function BranchOwnerFinancePage() {
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [cashOverview, setCashOverview] = useState<CashManagementOverview | null>(null);
  const [cashLoaded, setCashLoaded] = useState(false);

  useEffect(() => {
    api.get(BRANCH_OWNER.FINANCE_OVERVIEW)
      .then((r) => setOverview(r.data?.data ?? null))
      .catch(() => setOverview(null))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    api.get(BRANCH_OWNER.FINANCE_CASH_MANAGEMENT)
      .then((r) => setCashOverview(r.data?.data ?? null))
      .catch(() => setCashOverview(null))
      .finally(() => setCashLoaded(true));
  }, []);

  const salonRowsPage = usePagination(overview?.salons ?? [], 5);
  const cashRowsPage = usePagination(cashOverview?.salons ?? [], 5);

  if (salons.length === 0) {
    return (
      <div style={{ padding: 28, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Multi-Branch Finance</h1>
        <SectionCard title="">
          <BoEmptyState icon={<Wallet2 size={30} />} text="No salons assigned yet." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1280 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Multi-Branch Finance</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Revenue and cash management rollup across your salons</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatTile icon={<CurrencyRupee size={18} />} label="Revenue (This Month)" value={loaded ? fmtMoney(overview?.totals.totalRevenue ?? 0) : "—"} />
        <StatTile icon={<GraphUpArrow size={18} />} label="All-Time Revenue" value={loaded ? fmtMoney(overview?.totals.allTimeRevenue ?? 0) : "—"} />
        <StatTile icon={<ClockHistory size={17} />} label="Pending Commission" value={loaded ? fmtMoney(overview?.totals.pendingPayout ?? 0) : "—"} />
        <StatTile icon={<CheckCircleFill size={16} />} label="Commission Paid Out" value={loaded ? fmtMoney(overview?.totals.paidOut ?? 0) : "—"} />
      </div>

      {/* Revenue by branch */}
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Revenue by Branch" noPadding>
          {!loaded ? <Loader message="Loading revenue…" /> : (overview?.salons.length ?? 0) === 0 ? (
            <BoEmptyState icon={<Wallet2 size={26} />} text="No revenue data yet." />
          ) : (<>
            <div className="bo-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Salon", "This Month", "All-Time", "Today", "Commission Earned", "Pending"].map((h) => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salonRowsPage.pageItems.map((r) => (
                  <tr key={r.salonId} style={{ borderTop: "1px solid #f8fafc" }}>
                    <td style={{ padding: "11px 20px", fontWeight: 700, color: "#0f172a" }}>{r.salonName}</td>
                    <td style={{ padding: "11px 20px", color: "#0f172a", fontWeight: 600 }}>{fmtMoney(r.totalRevenue)}</td>
                    <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(r.allTimeRevenue)}</td>
                    <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(r.todayRevenue)}</td>
                    <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(r.totalCommission)}</td>
                    <td style={{ padding: "11px 20px", color: r.pendingPayout > 0 ? "#d97706" : "#94a3b8", fontWeight: 600 }}>{fmtMoney(r.pendingPayout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <BoPagination {...salonRowsPage} />
          </>)}
        </SectionCard>
      </div>

      {/* Cash management across branches */}
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Cash Management" noPadding>
          {!cashLoaded ? <Loader message="Loading cash management…" /> : (cashOverview?.salons.length ?? 0) === 0 ? (
            <BoEmptyState icon={<Wallet2 size={26} />} text="No cash counter activity yet." />
          ) : (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: 20 }}>
              <StatTile icon={<CurrencyRupee size={18} />} label="Cash Revenue" value={fmtMoney(cashOverview?.totals.cashRevenue ?? 0)} />
              <StatTile icon={<GraphUpArrow size={18} />} label="Cash Expense" value={fmtMoney(cashOverview?.totals.cashExpense ?? 0)} />
              <StatTile icon={<Wallet2 size={17} />} label="Closing Balance" value={fmtMoney(cashOverview?.totals.closingBalance ?? 0)} />
              <StatTile icon={<CheckCircleFill size={16} />} label="Open / Closed Sessions" value={`${cashOverview?.totals.openSessions ?? 0} / ${cashOverview?.totals.closedSessions ?? 0}`} />
            </div>
            <div className="bo-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 950 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Salon", "Cash Revenue", "Cash Expense", "Closing Balance", "Reconciliation", "Sessions (Open/Closed)"].map((h) => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashRowsPage.pageItems.map((r) => (
                  <tr key={r.salonId} style={{ borderTop: "1px solid #f8fafc" }}>
                    <td style={{ padding: "11px 20px", fontWeight: 700, color: "#0f172a" }}>{r.salonName}</td>
                    <td style={{ padding: "11px 20px", color: "#0f172a", fontWeight: 600 }}>{fmtMoney(r.cashRevenue)}</td>
                    <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(r.cashExpense)}</td>
                    <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(r.closingBalance)}</td>
                    <td style={{ padding: "11px 20px", color: r.reconciliationAmount !== 0 ? "#d97706" : "#94a3b8", fontWeight: 600 }}>{fmtMoney(r.reconciliationAmount)}</td>
                    <td style={{ padding: "11px 20px", color: "#475569" }}>{r.openSessions} / {r.closedSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <BoPagination {...cashRowsPage} />
          </>)}
        </SectionCard>
      </div>

    </div>
  );
}
