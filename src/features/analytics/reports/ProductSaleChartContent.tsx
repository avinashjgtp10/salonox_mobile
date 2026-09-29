import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../../../services/api/axios";
import { PRODUCT_RETAIL_REPORT } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatPaymentMode } from "../../../utils/paymentMode";
import ReportPieChart from "./ReportPieChart";

type Granularity = "day" | "week" | "month";
type TrendMode = "bar_line" | "bar" | "line";

// "YYYY-MM-DD" (or an IST week/month-start date, same shape) reformatted by
// string manipulation, not new Date() — a bare Date parse of a date-only
// string rolls over at the *browser's* local timezone.
function formatIsoDate(value: string): string {
  const [y, m, d] = String(value ?? "").split("-");
  return y && m && d ? `${d}-${m}-${y}` : String(value ?? "—");
}

// Same "list of ranked horizontal bars" layout every other report chart
// content uses for Top Products/Brands/Categories/Staff.
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

// Chart content only — no header/breadcrumb/back-nav/stat cards of its own.
// It renders in place of the table, below the SAME header, date range,
// filters and stat cards the table view uses, so toggling Table View/Chart
// View swaps only the data area, not the whole page.
export default function ProductSaleChartContent({
  dateFrom, dateTo, buildFilterBody,
}: {
  dateFrom: string;
  dateTo: string;
  buildFilterBody: () => Record<string, any>;
}) {
  const { formatAmount: money } = useCurrency();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [trendMode, setTrendMode] = useState<TrendMode>("bar_line");
  const [topLimit, setTopLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [daily, setDaily] = useState<{ date: string; quantity: number; revenue: number }[]>([]);
  const [paymentModes, setPaymentModes] = useState<{ mode: string; label: string; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ productId: string | null; name: string; revenue: number }[]>([]);
  const [topBrands, setTopBrands] = useState<{ brandId: string | null; name: string; revenue: number }[]>([]);
  const [topCategories, setTopCategories] = useState<{ categoryId: string | null; name: string; revenue: number }[]>([]);
  const [topStaff, setTopStaff] = useState<{ staffId: string | null; name: string; revenue: number }[]>([]);

  const fetchOverview = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(PRODUCT_RETAIL_REPORT.CHART(), {
        ...buildFilterBody(),
        granularity,
        top_limit: topLimit,
      });
      const data = res.data?.data ?? {};

      setDaily((Array.isArray(data.daily) ? data.daily : []).map((p: any) => ({
        date: formatIsoDate(p.date),
        quantity: Number(p.quantity) || 0,
        revenue: Number(p.revenue) || 0,
      })));

      setPaymentModes((Array.isArray(data.payment_modes) ? data.payment_modes : []).map((m: any) => ({
        mode: String(m.payment_mode ?? "unknown"),
        label: formatPaymentMode(m.payment_mode),
        revenue: Number(m.revenue) || 0,
      })));

      setTopProducts((Array.isArray(data.top_products) ? data.top_products : []).map((p: any) => ({
        productId: p.product_id ? String(p.product_id) : null,
        name: String(p.product_name ?? "Unknown"),
        revenue: Number(p.revenue) || 0,
      })));

      setTopBrands((Array.isArray(data.top_brands) ? data.top_brands : []).map((b: any) => ({
        brandId: b.brand_id ? String(b.brand_id) : null,
        name: String(b.brand_name ?? "Unknown"),
        revenue: Number(b.revenue) || 0,
      })));

      setTopCategories((Array.isArray(data.top_categories) ? data.top_categories : []).map((c: any) => ({
        categoryId: c.category_id ? String(c.category_id) : null,
        name: String(c.category_name ?? "Unknown"),
        revenue: Number(c.revenue) || 0,
      })));

      setTopStaff((Array.isArray(data.top_staff) ? data.top_staff : []).map((s: any) => ({
        staffId: s.staff_id ? String(s.staff_id) : null,
        name: String(s.staff_name ?? "Unknown"),
        revenue: Number(s.revenue) || 0,
      })));
    } catch {
      setError("Failed to load graph data.");
    } finally {
      setLoading(false);
    }
  }, [buildFilterBody, dateFrom, dateTo, granularity, topLimit]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  return (
    <div className="rp-product-sale-chart-content">
      {error && <div className="text-center text-danger py-3">{error}</div>}

      {/* ── Quantity / Revenue Trend ─────────────────────────────────── */}
      <div className="rp-graph-card mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
          <div>
            <h5 className="fw-bold mb-1">Sales Trend</h5>
            <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>Quantity Sold and Revenue</p>
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
          <div className="text-center text-muted py-5">No product sales in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={daily} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" width={80} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v)} />
              <YAxis yAxisId="right" orientation="right" width={50} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number, name: string) => [name === "Revenue" ? money(value) : value, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {trendMode !== "line" && <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#c7d2fe" radius={[4, 4, 0, 0]} />}
              {trendMode !== "bar" && <Line yAxisId="right" type="monotone" dataKey="quantity" name="Quantity Sold" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Payment Mode Split ──────────────────────────────────────── */}
      <div className="row g-4 mb-1">
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Payment Mode Split</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>Revenue by payment method</p>
            <ReportPieChart
              data={paymentModes.map((p) => ({ name: p.label, value: p.revenue }))}
              formatValue={money}
              height={260}
              innerRadiusRatio={0.6}
              emptyMessage="No data in this range."
            />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <RankedBarList
            title="Top Brands by Revenue"
            subtitle="Revenue"
            items={topBrands.map((b) => ({ key: b.brandId ?? b.name, name: b.name, value: b.revenue }))}
            money={money}
          />
        </div>
      </div>

      {/* ── Top Products / Categories / Staff ──────────────────────────── */}
      <div className="d-flex justify-content-end mb-2">
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={topLimit} onChange={(e) => setTopLimit(Number(e.target.value))}>
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-4">
          <RankedBarList
            title="Top Products by Revenue"
            subtitle="Revenue"
            items={topProducts.map((p) => ({ key: p.productId ?? p.name, name: p.name, value: p.revenue }))}
            money={money}
          />
        </div>
        <div className="col-12 col-lg-4">
          <RankedBarList
            title="Top Categories by Revenue"
            subtitle="Revenue"
            items={topCategories.map((c) => ({ key: c.categoryId ?? c.name, name: c.name, value: c.revenue }))}
            money={money}
          />
        </div>
        <div className="col-12 col-lg-4">
          <RankedBarList
            title="Top Staff by Product Sales"
            subtitle="Revenue"
            items={topStaff.map((s) => ({ key: s.staffId ?? s.name, name: s.name, value: s.revenue }))}
            money={money}
          />
        </div>
      </div>

      <div className="text-muted text-center" style={{ fontSize: 12 }}>
        All charts are based on the currently applied filters. Data is calculated on the entire filtered set, not just the visible page.
      </div>
    </div>
  );
}
