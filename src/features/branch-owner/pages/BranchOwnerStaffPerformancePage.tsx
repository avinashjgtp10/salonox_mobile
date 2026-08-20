import { useEffect, useState } from "react";
import { PersonBadge, CurrencyRupee, Trophy, GraphUpArrow } from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import {
  SectionCard, StatTile, BoEmptyState, Shimmer, inputStyle,
  usePagination, BoPagination,
} from "../components/BranchOwnerUI";

interface StaffPerformanceRow {
  staffId: string; name: string; role: string;
  salonId: string; salonName: string;
  revenue: number; commissionEarned: number; pendingPayout: number; paidOut: number; transactionCount: number;
}

const fmtMoney = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`);

export default function BranchOwnerStaffPerformancePage() {
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [rows, setRows] = useState<StaffPerformanceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [salonFilter, setSalonFilter] = useState("all");

  useEffect(() => {
    api.get(BRANCH_OWNER.STAFF_PERFORMANCE)
      .then((r) => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, []);

  const visible = (salonFilter === "all" ? rows : rows.filter((r) => r.salonId === salonFilter))
    .slice()
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = visible.reduce((sum, r) => sum + r.revenue, 0);
  const totalCommission = visible.reduce((sum, r) => sum + r.commissionEarned, 0);
  const topPerformer = visible[0];

  const page = usePagination(visible, 8);

  if (salons.length === 0) {
    return (
      <div style={{ padding: 28, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Staff Performance Across Branches</h1>
        <SectionCard title="">
          <BoEmptyState icon={<PersonBadge size={30} />} text="No salons assigned yet." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1280 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Staff Performance Across Branches</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Revenue and commission earned, rolled up per staff member across every salon</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {!loaded ? [...Array(3)].map((_, i) => <Shimmer key={i} h={104} />) : (<>
          <StatTile icon={<CurrencyRupee size={18} />} label="Revenue Generated" value={fmtMoney(totalRevenue)} variantIndex={0} />
          <StatTile icon={<GraphUpArrow size={18} />} label="Commission Earned" value={fmtMoney(totalCommission)} variantIndex={1} />
          <StatTile icon={<Trophy size={17} />} label="Top Performer" value={topPerformer ? topPerformer.name : "—"} variantIndex={2} sub={topPerformer ? topPerformer.salonName : undefined} />
        </>)}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 16, maxWidth: 240 }}>
        <select value={salonFilter} onChange={(e) => setSalonFilter(e.target.value)} style={inputStyle}>
          <option value="all">All Branches</option>
          {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <SectionCard title="Staff Performance" noPadding>
        {!loaded ? <div style={{ padding: 20 }}><Shimmer h={200} /></div> : visible.length === 0 ? (
          <BoEmptyState icon={<PersonBadge size={26} />} text="No staff activity yet." />
        ) : (<>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Staff", "Branch", "Role", "Revenue", "Commission Earned", "Pending", "Transactions"].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.pageItems.map((r) => (
                <tr key={`${r.staffId}-${r.salonId}`} style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 700, color: "#0f172a" }}>{r.name}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{r.salonName}</td>
                  <td style={{ padding: "11px 20px", color: "#94a3b8" }}>{r.role}</td>
                  <td style={{ padding: "11px 20px", color: "#0f172a", fontWeight: 600 }}>{fmtMoney(r.revenue)}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtMoney(r.commissionEarned)}</td>
                  <td style={{ padding: "11px 20px", color: r.pendingPayout > 0 ? "#d97706" : "#94a3b8", fontWeight: 600 }}>{fmtMoney(r.pendingPayout)}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{r.transactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <BoPagination {...page} />
        </>)}
      </SectionCard>
    </div>
  );
}
