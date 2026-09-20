import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ArrowLeft } from "react-bootstrap-icons";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { useCurrency } from "../../../hooks/useCurrency";

type Granularity = "day" | "week" | "month";
type TrendMode = "bar_line" | "bar" | "line";

// Same string-manipulation date formatter every report graph page uses —
// a bare Date parse of a date-only string rolls over at the browser's own
// local timezone.
function formatIsoDate(value: string): string {
  const [y, m, d] = String(value ?? "").split("-");
  return y && m && d ? `${d}-${m}-${y}` : String(value ?? "—");
}

interface StatCardDef {
  label: string;
  value: string;
}

function StatCardRow({ cards }: { cards: StatCardDef[] }) {
  return (
    <div className="rp-sra-summary-row rp-sales-stat-row mb-4">
      {cards.map((c) => (
        <div key={c.label} className="rp-sra-summary-card">
          <div className="rp-sra-summary-val">{c.value}</div>
          <div className="rp-sra-summary-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// Same "list of ranked horizontal bars" layout every other report graph
// page uses for its own Top N breakdown.
function RankedBarList({
  title, subtitle, items, money,
}: {
  title: string;
  subtitle: string;
  items: { key: string; name: string; value: number }[];
  money: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="rp-graph-card">
      <h5 className="fw-bold mb-1">{title}</h5>
      <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>{subtitle}</p>
      {items.length === 0 ? (
        <div className="text-center text-muted py-4" style={{ fontSize: 13 }}>No data in this range.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {items.map((item) => (
            <div key={item.key} className="d-flex align-items-center gap-2">
              <div style={{ width: 90, fontSize: 12.5, color: "#374151", flexShrink: 0 }} title={item.name}>
                {item.name}
              </div>
              <div style={{ flex: 1, background: "#eef2ff", borderRadius: 6, height: 18, position: "relative" }}>
                <div
                  style={{
                    width: `${Math.max(3, (item.value / max) * 100)}%`,
                    background: "#818cf8",
                    height: "100%",
                    borderRadius: 6,
                  }}
                />
              </div>
              <div style={{ width: 84, fontSize: 12.5, fontWeight: 600, color: "#0f172a", textAlign: "right", flexShrink: 0 }}>
                {money(item.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PurchaseHistoryGraphPage({
  reportName, onBack, onClose, buildFilterParams,
}: {
  reportName: string;
  onBack: () => void;
  onClose: () => void;
  buildFilterParams: () => Record<string, any>;
}) {
  const { formatAmount: money } = useCurrency();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [trendMode, setTrendMode] = useState<TrendMode>("bar_line");
  const [topLimit, setTopLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [daily, setDaily] = useState<{ date: string; count: number; amount: number }[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<{ name: string; amount: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; amount: number }[]>([]);

  const totalPurchases = daily.reduce((sum, d) => sum + d.count, 0);
  const totalAmount = daily.reduce((sum, d) => sum + d.amount, 0);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(INVENTORY.PRODUCT_INVENTORY_PURCHASES_CHART, {
        params: { ...buildFilterParams(), granularity, top_limit: topLimit },
      });
      const data = res.data?.data ?? {};

      setDaily((Array.isArray(data.daily) ? data.daily : []).map((p: any) => ({
        date: formatIsoDate(p.date),
        count: Number(p.count) || 0,
        amount: Number(p.amount) || 0,
      })));

      setTopSuppliers((Array.isArray(data.top_suppliers) ? data.top_suppliers : []).map((s: any) => ({
        name: String(s.supplier_name ?? "Unknown"),
        amount: Number(s.amount) || 0,
      })));

      setTopProducts((Array.isArray(data.top_products) ? data.top_products : []).map((p: any) => ({
        name: String(p.product_name ?? "—"),
        amount: Number(p.amount) || 0,
      })));
    } catch {
      setError("Failed to load graph data.");
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, granularity, topLimit]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <nav className="rp-breadcrumb" aria-label="Breadcrumb">
            <button type="button" className="rp-breadcrumb-link" onClick={onBack}>Reports</button>
            <ChevronRight size={11} className="rp-breadcrumb-sep" />
            <button type="button" className="rp-breadcrumb-link" onClick={onClose}>{reportName}</button>
            <ChevronRight size={11} className="rp-breadcrumb-sep" />
            <span className="rp-breadcrumb-current">Graph</span>
          </nav>
        </div>
      </div>

      <button
        type="button"
        className="rp-breadcrumb-link d-inline-flex align-items-center gap-1 mb-3"
        style={{ fontSize: 13 }}
        onClick={onClose}
      >
        <ArrowLeft size={14} /> Back to {reportName}
      </button>

      <div className="mb-3">
        <h4 className="fw-bold mb-1">{reportName} — Graph</h4>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          Same filters as the table
        </p>
      </div>

      <StatCardRow cards={[
        { label: "Total Purchases", value: totalPurchases.toString() },
        { label: "Total Amount",    value: money(totalAmount) },
      ]} />

      {error && <div className="text-center text-danger py-3">{error}</div>}

      {/* ── Purchases / Amount Trend ─────────────────── */}
      <div className="rp-graph-card mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
          <div>
            <h5 className="fw-bold mb-1">Purchase Trend</h5>
            <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>Purchases Recorded and Amount</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="btn-group btn-group-sm" role="group">
              {(["day", "week", "month"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`btn ${granularity === g ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setGranularity(g)}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={trendMode}
              onChange={(e) => setTrendMode(e.target.value as TrendMode)}
            >
              <option value="bar_line">Bar + Line</option>
              <option value="bar">Bar only</option>
              <option value="line">Line only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted py-5">Loading…</div>
        ) : daily.length === 0 ? (
          <div className="text-center text-muted py-5">No purchases in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={daily} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="amount" width={80} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v)} />
              <YAxis yAxisId="count" orientation="right" width={50} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip formatter={(value: number, name: string) => [name === "Amount" ? money(value) : value, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {trendMode !== "line" && <Bar yAxisId="amount" dataKey="amount" name="Amount" fill="#c7d2fe" radius={[4, 4, 0, 0]} />}
              {trendMode !== "bar" && <Line yAxisId="count" type="monotone" dataKey="count" name="Purchases" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top Suppliers + Top Products ──────────────────────── */}
      <div className="d-flex justify-content-end mb-2">
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={topLimit} onChange={(e) => setTopLimit(Number(e.target.value))}>
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>
      <div className="row g-4 mb-1">
        <div className="col-12 col-lg-6">
          <RankedBarList
            title="Top Suppliers by Amount"
            subtitle="Highest purchase amount by supplier"
            items={topSuppliers.map((s) => ({ key: s.name, name: s.name, value: s.amount }))}
            money={money}
          />
        </div>
        <div className="col-12 col-lg-6">
          <RankedBarList
            title="Top Products Purchased"
            subtitle="Highest purchase amount by product"
            items={topProducts.map((p) => ({ key: p.name, name: p.name, value: p.amount }))}
            money={money}
          />
        </div>
      </div>

      <div className="text-muted text-center mt-3" style={{ fontSize: 12 }}>
        All charts and summary cards are based on the currently applied filters. Data is calculated on the entire filtered set, not just the visible page.
      </div>
    </div>
  );
}
