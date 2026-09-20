import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ArrowLeft } from "react-bootstrap-icons";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../../../services/api/axios";
import { SERVICE_FREQUENCY_REPORT } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import ReportPieChart from "./ReportPieChart";

type Granularity = "day" | "week" | "month";
type TrendMode = "bar_line" | "bar" | "line";

const PAIR_TYPE_LABELS: Record<string, string> = {
  one_time: "One-time",
  repeat: "Repeat",
};

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
  title, subtitle, items, formatValue,
}: {
  title: string;
  subtitle: string;
  items: { key: string; name: string; value: number }[];
  formatValue: (n: number) => string;
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
                {formatValue(item.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServiceFrequencyGraphPage({
  reportName, onBack, onClose,
  dateFrom, dateTo, statCards, buildFilterBody,
}: {
  reportName: string;
  onBack: () => void;
  onClose: () => void;
  dateFrom: string;
  dateTo: string;
  statCards: StatCardDef[];
  buildFilterBody: () => Record<string, any>;
}) {
  const { formatAmount: money } = useCurrency();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [trendMode, setTrendMode] = useState<TrendMode>("bar_line");
  const [topLimit, setTopLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [daily, setDaily] = useState<{ date: string; visits: number; revenue: number }[]>([]);
  const [pairFrequency, setPairFrequency] = useState<{ key: string; label: string; count: number }[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; visits: number }[]>([]);
  const [topServices, setTopServices] = useState<{ serviceId: string | null; name: string; visits: number }[]>([]);

  const fetchOverview = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(SERVICE_FREQUENCY_REPORT.CHART(), {
        ...buildFilterBody(),
        granularity,
        top_limit: topLimit,
      });
      const data = res.data?.data ?? {};

      setDaily((Array.isArray(data.daily) ? data.daily : []).map((p: any) => ({
        date: formatIsoDate(p.date),
        visits: Number(p.visits) || 0,
        revenue: Number(p.revenue) || 0,
      })));

      setPairFrequency((Array.isArray(data.pair_frequency) ? data.pair_frequency : []).map((t: any) => ({
        key: String(t.type ?? "one_time"),
        label: PAIR_TYPE_LABELS[String(t.type)] ?? String(t.type ?? "Unknown"),
        count: Number(t.count) || 0,
      })));

      setCategoryBreakdown((Array.isArray(data.category_breakdown) ? data.category_breakdown : []).map((c: any) => ({
        category: String(c.category ?? "—"),
        visits: Number(c.visits) || 0,
      })));

      setTopServices((Array.isArray(data.top_services) ? data.top_services : []).map((s: any) => ({
        serviceId: s.service_id ? String(s.service_id) : null,
        name: String(s.service_name ?? "—"),
        visits: Number(s.visits) || 0,
      })));
    } catch {
      setError("Failed to load graph data.");
    } finally {
      setLoading(false);
    }
  }, [buildFilterBody, dateFrom, dateTo, granularity, topLimit]);

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
          {dateFrom && dateTo ? `${formatIsoDate(dateFrom)} to ${formatIsoDate(dateTo)}` : "Selected date range"} · same filters as the table
        </p>
      </div>

      <StatCardRow cards={statCards} />

      {error && <div className="text-center text-danger py-3">{error}</div>}

      {/* ── Visits / Revenue Trend ─────────────────────────────────────── */}
      <div className="rp-graph-card mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
          <div>
            <h5 className="fw-bold mb-1">Service Visit Trend</h5>
            <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>Visits and Revenue across client-service pairs</p>
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
          <div className="text-center text-muted py-5">No service visits in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={daily} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis width={60} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number, name: string) => [name === "Revenue" ? money(value) : value, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {trendMode !== "line" && <Bar dataKey="visits" name="Visits" fill="#c7d2fe" radius={[4, 4, 0, 0]} />}
              {trendMode !== "bar" && <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Pair Frequency + Category Breakdown ─────────────────────────── */}
      <div className="row g-4 mb-1">
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Pair Frequency</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>Client-Service pairs by One-time vs Repeat visits</p>
            <ReportPieChart
              data={pairFrequency.map((t) => ({ name: t.label, value: t.count }))}
              formatValue={(n) => String(n)}
              height={260}
              innerRadiusRatio={0.6}
              emptyMessage="No data in this range."
            />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <RankedBarList
            title="Visits by Category"
            subtitle="Total Visits"
            items={categoryBreakdown.map((c) => ({ key: c.category, name: c.category, value: c.visits }))}
            formatValue={(n) => String(n)}
          />
        </div>
      </div>

      {/* ── Top Services by Visits ──────────────────────────────────────── */}
      <div className="d-flex justify-content-end mb-2">
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={topLimit} onChange={(e) => setTopLimit(Number(e.target.value))}>
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>
      <div className="row g-4 mb-4">
        <div className="col-12">
          <RankedBarList
            title="Top Services by Visits"
            subtitle="Total Visits"
            items={topServices.map((s) => ({ key: s.serviceId ?? s.name, name: s.name, value: s.visits }))}
            formatValue={(n) => String(n)}
          />
        </div>
      </div>

      <div className="text-muted text-center" style={{ fontSize: 12 }}>
        All charts and summary cards are based on the currently applied filters. Data is calculated on the entire filtered set, not just the visible page.
      </div>
    </div>
  );
}
