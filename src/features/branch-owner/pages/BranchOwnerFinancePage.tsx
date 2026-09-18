import { useEffect, useState } from "react";
import {
  CurrencyRupee, GraphUpArrow, ClockHistory, CheckCircleFill, Wallet2, PersonBadge,
} from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import Dropdown from "../../../components/ui/Dropdown";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import {
  SectionCard, StatTile, BoEmptyState, PrimaryButton, GhostButton,
  Shimmer, inputStyle,
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
interface StaffCommissionRow {
  staff_id: string; staff_first_name: string; staff_last_name: string | null;
  staff_designation: string | null;
  total_revenue: number; total_earned: number; pending_payout: number; paid_out: number; transaction_count: number;
}

const fmtMoney = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`);

export default function BranchOwnerFinancePage() {
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [cashOverview, setCashOverview] = useState<CashManagementOverview | null>(null);
  const [cashLoaded, setCashLoaded] = useState(false);

  const [commissionSalonId, setCommissionSalonId] = useState("");
  const [commissions, setCommissions] = useState<StaffCommissionRow[]>([]);
  const [commissionsLoaded, setCommissionsLoaded] = useState(false);

  const [settleStaffId, setSettleStaffId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleError, setSettleError] = useState("");

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

  useEffect(() => {
    if (salons.length > 0 && !commissionSalonId) setCommissionSalonId(salons[0].id);
  }, [salons, commissionSalonId]);

  const loadCommissions = (salonId: string) => {
    if (!salonId) return;
    setCommissionsLoaded(false);
    api.get(BRANCH_OWNER.FINANCE_SALON_COMMISSIONS(salonId))
      .then((r) => setCommissions(r.data?.data ?? []))
      .catch(() => setCommissions([]))
      .finally(() => setCommissionsLoaded(true));
  };
  useEffect(() => { loadCommissions(commissionSalonId); }, [commissionSalonId]);

  async function handleSettle(row: StaffCommissionRow) {
    setSettleError("");
    const amount = Number(settleAmount);
    if (!(amount > 0)) { setSettleError("Enter a valid amount."); return; }
    if (amount > row.pending_payout) { setSettleError("Amount cannot exceed the pending payout."); return; }
    setSettleBusy(true);
    try {
      await api.post(BRANCH_OWNER.FINANCE_SETTLE_COMMISSION(commissionSalonId), { staff_id: row.staff_id, amount });
      setSettleStaffId(null); setSettleAmount("");
      loadCommissions(commissionSalonId);
    } catch (err: any) {
      setSettleError(err?.response?.data?.error?.message || "Failed to settle commission.");
    } finally {
      setSettleBusy(false);
    }
  }

  const salonRowsPage = usePagination(overview?.salons ?? [], 5);
  const cashRowsPage = usePagination(cashOverview?.salons ?? [], 5);
  const commissionsPage = usePagination(commissions, 6);

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
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Revenue rollup and commission settlement across your salons</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {!loaded ? [...Array(4)].map((_, i) => <Shimmer key={i} h={104} />) : (<>
          <StatTile icon={<CurrencyRupee size={18} />} label="Revenue (This Month)" value={fmtMoney(overview?.totals.totalRevenue ?? 0)} variantIndex={0} />
          <StatTile icon={<GraphUpArrow size={18} />} label="All-Time Revenue" value={fmtMoney(overview?.totals.allTimeRevenue ?? 0)} variantIndex={1} />
          <StatTile icon={<ClockHistory size={17} />} label="Pending Commission" value={fmtMoney(overview?.totals.pendingPayout ?? 0)} variantIndex={2} />
          <StatTile icon={<CheckCircleFill size={16} />} label="Commission Paid Out" value={fmtMoney(overview?.totals.paidOut ?? 0)} variantIndex={3} />
        </>)}
      </div>

      {/* Revenue by branch */}
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Revenue by Branch" noPadding>
          {!loaded ? <div style={{ padding: 20 }}><Shimmer h={160} /></div> : (overview?.salons.length ?? 0) === 0 ? (
            <BoEmptyState icon={<Wallet2 size={26} />} text="No revenue data yet." />
          ) : (<>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
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
            <BoPagination {...salonRowsPage} />
          </>)}
        </SectionCard>
      </div>

      {/* Cash management across branches */}
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Cash Management" noPadding>
          {!cashLoaded ? <div style={{ padding: 20 }}><Shimmer h={160} /></div> : (cashOverview?.salons.length ?? 0) === 0 ? (
            <BoEmptyState icon={<Wallet2 size={26} />} text="No cash counter activity yet." />
          ) : (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: 20 }}>
              <StatTile icon={<CurrencyRupee size={18} />} label="Cash Revenue" value={fmtMoney(cashOverview?.totals.cashRevenue ?? 0)} variantIndex={0} />
              <StatTile icon={<GraphUpArrow size={18} />} label="Cash Expense" value={fmtMoney(cashOverview?.totals.cashExpense ?? 0)} variantIndex={1} />
              <StatTile icon={<Wallet2 size={17} />} label="Closing Balance" value={fmtMoney(cashOverview?.totals.closingBalance ?? 0)} variantIndex={2} />
              <StatTile icon={<CheckCircleFill size={16} />} label="Open / Closed Sessions" value={`${cashOverview?.totals.openSessions ?? 0} / ${cashOverview?.totals.closedSessions ?? 0}`} variantIndex={3} />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
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
            <BoPagination {...cashRowsPage} />
          </>)}
        </SectionCard>
      </div>

      {/* Settle commissions */}
      <SectionCard title="Settle Staff Commissions" noPadding action={
        <div style={{ width: 220 }}>
          <Dropdown
            value={commissionSalonId}
            onChange={setCommissionSalonId}
            options={salons.map((s) => ({ id: s.id, name: s.name }))}
            placeholder="Select branch…"
            style={inputStyle}
          />
        </div>
      }>
        {!commissionsLoaded ? <div style={{ padding: 20 }}><Shimmer h={160} /></div> : commissions.length === 0 ? (
          <BoEmptyState icon={<PersonBadge size={26} />} text="No commission activity for this branch yet." />
        ) : (<>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Staff", "Designation", "Revenue", "Earned", "Pending", "Paid", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissionsPage.pageItems.map((row) => (
                <tr key={row.staff_id} style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 700, color: "#0f172a" }}>{row.staff_first_name} {row.staff_last_name ?? ""}</td>
                  <td style={{ padding: "11px 20px", color: "#94a3b8" }}>{row.staff_designation ?? "—"}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(row.total_revenue)}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(row.total_earned)}</td>
                  <td style={{ padding: "11px 20px", color: row.pending_payout > 0 ? "#d97706" : "#94a3b8", fontWeight: 600 }}>{fmtMoney(row.pending_payout)}</td>
                  <td style={{ padding: "11px 20px", color: "#16a34a" }}>{fmtMoney(row.paid_out)}</td>
                  <td style={{ padding: "11px 20px", textAlign: "right" }}>
                    {row.pending_payout > 0 && (
                      settleStaffId === row.staff_id ? null : (
                        <GhostButton onClick={() => { setSettleStaffId(row.staff_id); setSettleAmount(String(row.pending_payout)); setSettleError(""); }}>Settle</GhostButton>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {commissionsPage.pageItems.map((row) => (
                settleStaffId === row.staff_id ? (
                  <tr key={`${row.staff_id}-settle`} style={{ borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
                    <td colSpan={7} style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>
                          Settle for {row.staff_first_name} {row.staff_last_name ?? ""} — pending {fmtMoney(row.pending_payout)}
                        </span>
                        <input
                          type="number" min={0.01} max={row.pending_payout} step="0.01"
                          value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)}
                          style={{ ...inputStyle, width: 130 }}
                        />
                        <PrimaryButton onClick={() => handleSettle(row)} disabled={settleBusy}>{settleBusy ? "Settling…" : "Confirm"}</PrimaryButton>
                        <GhostButton onClick={() => { setSettleStaffId(null); setSettleError(""); }}>Cancel</GhostButton>
                      </div>
                      {settleError && <div style={{ marginTop: 8, color: "#dc2626", fontSize: 12.5 }}>{settleError}</div>}
                    </td>
                  </tr>
                ) : null
              ))}
            </tbody>
          </table>
          <BoPagination {...commissionsPage} />
        </>)}
      </SectionCard>
    </div>
  );
}
