import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../../../services/api/axios";
import { SALES_REPORT } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatPaymentMode } from "../../../utils/paymentMode";
import ReportPieChart from "./ReportPieChart";

type Granularity = "day" | "week" | "month";
type TrendMode = "bar_line" | "bar" | "line";

const ITEM_TYPE_LABELS: Record<string, string> = {
  service: "Service",
  product: "Product",
  membership: "Membership",
  gift_card: "Gift Card",
  quick: "Quick Sale",
  package: "Package",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  booked: "Booked",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_BUCKETS: { key: "morning" | "afternoon" | "evening"; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

// "YYYY-MM-DD" (or an IST week/month-start date, same shape) reformatted by
// string manipulation, not new Date() — a bare Date parse of a date-only
// string rolls over at the *browser's* local timezone, which has already
// caused a real off-by-one bug elsewhere in this codebase this session.
function formatIsoDate(value: string): string {
  const [y, m, d] = String(value ?? "").split("-");
  return y && m && d ? `${d}-${m}-${y}` : String(value ?? "—");
}

// Shared "list of ranked horizontal bars" layout used by Top Staff, Top
// Services, and Sales by Category — a plain div-based bar (not a recharts
// BarChart) since it needs to sit inline with a name/value label per row,
// matching how these read as compact rankings rather than a full chart axis.
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
export default function SalesSummaryChartContent({
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

  const [daily, setDaily] = useState<{ date: string; totalBill: number; totalSale: number; received: number; due: number }[]>([]);
  const [paymentModes, setPaymentModes] = useState<{ mode: string; label: string; totalBill: number; received: number }[]>([]);
  const [itemTypes, setItemTypes] = useState<{ type: string; label: string; totalSale: number }[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<{ status: string; label: string; totalBill: number; totalSale: number }[]>([]);
  const [topStaff, setTopStaff] = useState<{ staffId: string | null; name: string; totalSale: number }[]>([]);
  const [topServices, setTopServices] = useState<{ serviceId: string | null; name: string; totalSale: number }[]>([]);
  const [categories, setCategories] = useState<{ categoryId: string; name: string; totalSale: number }[]>([]);
  const [heatmap, setHeatmap] = useState<{ dow: number; bucket: "morning" | "afternoon" | "evening"; totalSale: number }[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<{ totalBill: number; totalSale: number; received: number } | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<{ totalBill: number; totalSale: number; received: number } | null>(null);

  const fetchOverview = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(SALES_REPORT.CHART(), {
        ...buildFilterBody(),
        granularity,
        top_limit: topLimit,
      });
      const data = res.data?.data ?? {};

      setDaily((Array.isArray(data.daily) ? data.daily : []).map((p: any) => ({
        date: formatIsoDate(p.date),
        totalBill: Number(p.total_bill) || 0,
        totalSale: Number(p.total_sale) || 0,
        received: Number(p.received_amount) || 0,
        due: Number(p.due_amount) || 0,
      })));

      setPaymentModes((Array.isArray(data.payment_modes) ? data.payment_modes : []).map((m: any) => ({
        mode: String(m.payment_mode ?? "unknown"),
        label: formatPaymentMode(m.payment_mode),
        totalBill: Number(m.total_bill) || 0,
        received: Number(m.received_amount) || 0,
      })));

      setItemTypes((Array.isArray(data.item_types) ? data.item_types : []).map((t: any) => ({
        type: String(t.item_type ?? "other"),
        label: ITEM_TYPE_LABELS[String(t.item_type)] ?? String(t.item_type ?? "Other"),
        totalSale: Number(t.total_sale) || 0,
      })));

      setPaymentStatus((Array.isArray(data.payment_status) ? data.payment_status : []).map((p: any) => ({
        status: String(p.payment_status ?? "unknown"),
        label: PAYMENT_STATUS_LABELS[String(p.payment_status)] ?? String(p.payment_status ?? "Unknown"),
        totalBill: Number(p.total_bill) || 0,
        totalSale: Number(p.total_sale) || 0,
      })));

      setTopStaff((Array.isArray(data.top_staff) ? data.top_staff : []).map((s: any) => ({
        staffId: s.staff_id ? String(s.staff_id) : null,
        name: String(s.staff_name ?? "Unknown"),
        totalSale: Number(s.total_sale) || 0,
      })));

      setTopServices((Array.isArray(data.top_services) ? data.top_services : []).map((s: any) => ({
        serviceId: s.service_id ? String(s.service_id) : null,
        name: String(s.service_name ?? "Unknown"),
        totalSale: Number(s.total_sale) || 0,
      })));

      setCategories((Array.isArray(data.categories) ? data.categories : []).map((c: any) => ({
        categoryId: String(c.category_id),
        name: String(c.category_name),
        totalSale: Number(c.total_sale) || 0,
      })));

      setHeatmap((Array.isArray(data.heatmap) ? data.heatmap : []).map((h: any) => ({
        dow: Number(h.day_of_week),
        bucket: h.time_bucket,
        totalSale: Number(h.total_sale) || 0,
      })));

      setCurrentPeriod(data.current_period ? {
        totalBill: Number(data.current_period.total_bill) || 0,
        totalSale: Number(data.current_period.total_sale) || 0,
        received: Number(data.current_period.received_amount) || 0,
      } : null);

      setPreviousPeriod(data.previous_period ? {
        totalBill: Number(data.previous_period.total_bill) || 0,
        totalSale: Number(data.previous_period.total_sale) || 0,
        received: Number(data.previous_period.received_amount) || 0,
      } : null);
    } catch {
      setError("Failed to load graph data.");
    } finally {
      setLoading(false);
    }
  }, [buildFilterBody, dateFrom, dateTo, granularity, topLimit]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const heatmapLookup = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    heatmap.forEach((h) => {
      map.set(`${h.dow}-${h.bucket}`, h.totalSale);
      if (h.totalSale > max) max = h.totalSale;
    });
    return { map, max: Math.max(1, max) };
  }, [heatmap]);

  return (
    <div className="rp-ss-chart-content">
      {error && <div className="text-center text-danger py-3">{error}</div>}

      {/* ── Sales Trend ─────────────────────────────────────────────── */}
      <div className="rp-graph-card mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
          <div>
            <h5 className="fw-bold mb-1">Sales Trend</h5>
            <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>Total Sale, Received Amount and Due Amount</p>
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
          <div className="text-center text-muted py-5">No sales in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={daily} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis width={80} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v)} />
              <Tooltip formatter={(value: number, name: string) => [money(value), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {trendMode !== "line" && <Bar dataKey="totalSale" name="Total Sale" fill="#c7d2fe" radius={[4, 4, 0, 0]} />}
              {trendMode !== "bar" && <Line type="monotone" dataKey="received" name="Received Amount" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />}
              {trendMode !== "bar" && <Line type="monotone" dataKey="due" name="Due Amount" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Payment Mode Split + Sales by Item Type + Payment Status ──── */}
      <div className="row g-4 mb-1">
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Payment Mode Split</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>Received Amount by payment method</p>
            <ReportPieChart
              data={paymentModes.map((p) => ({ name: p.label, value: p.received }))}
              formatValue={money}
              height={260}
              innerRadiusRatio={0.6}
              emptyMessage="No data in this range."
            />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Sales by Item Type</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>Total Sale by item type</p>
            {itemTypes.length === 0 ? (
              <div className="text-center text-muted py-4" style={{ fontSize: 13 }}>No data in this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={itemTypes} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis width={70} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v)} />
                  <Tooltip formatter={(value: number) => money(value)} />
                  <Bar dataKey="totalSale" name="Total Sale" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4 mb-1">
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Payment Status</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>Bills by payment status</p>
            <ReportPieChart
              data={paymentStatus.map((p) => ({ name: p.label, value: p.totalBill }))}
              formatValue={(n) => String(n)}
              height={260}
              innerRadiusRatio={0.6}
              emptyMessage="No data in this range."
            />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Revenue Composition</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>Contribution by item type</p>
            <ReportPieChart
              data={itemTypes.map((t) => ({ name: t.label, value: t.totalSale }))}
              formatValue={money}
              height={260}
              innerRadiusRatio={0.6}
              emptyMessage="No data in this range."
            />
          </div>
        </div>
      </div>

      {/* ── Top Staff / Top Services / Sales by Category ──────────────── */}
      <div className="d-flex justify-content-end mb-2">
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={topLimit} onChange={(e) => setTopLimit(Number(e.target.value))}>
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>
      <div className="row g-4 mb-1">
        <div className="col-12 col-lg-4">
          <RankedBarList
            title="Top Staff by Sales"
            subtitle="Total Sale"
            items={topStaff.map((s) => ({ key: s.staffId ?? s.name, name: s.name, value: s.totalSale }))}
            money={money}
          />
        </div>
        <div className="col-12 col-lg-4">
          <RankedBarList
            title="Top Services by Sales"
            subtitle="Total Sale"
            items={topServices.map((s) => ({ key: s.serviceId ?? s.name, name: s.name, value: s.totalSale }))}
            money={money}
          />
        </div>
        <div className="col-12 col-lg-4">
          <RankedBarList
            title="Sales by Service Category"
            subtitle="Total Sale"
            items={categories.map((c) => ({ key: c.categoryId, name: c.name, value: c.totalSale }))}
            money={money}
          />
        </div>
      </div>

      {/* ── Sales vs Previous Period / Heatmap ─────────────────────────── */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Sales vs Previous Period</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>
              {previousPeriod ? "Current period vs the equal-length period before it" : "Needs a start and end date to compare"}
            </p>
            {!currentPeriod || !previousPeriod ? (
              <div className="text-center text-muted py-4" style={{ fontSize: 13 }}>Not enough data to compare.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {[
                  { label: "Total Sale", curr: currentPeriod.totalSale, prev: previousPeriod.totalSale, fmt: money },
                  { label: "Received Amount", curr: currentPeriod.received, prev: previousPeriod.received, fmt: money },
                  { label: "Total Bill", curr: currentPeriod.totalBill, prev: previousPeriod.totalBill, fmt: (n: number) => String(n) },
                ].map((row) => {
                  const max = Math.max(1, row.curr, row.prev);
                  return (
                    <div key={row.label}>
                      <div className="d-flex justify-content-between" style={{ fontSize: 12.5, color: "#374151" }}>
                        <span>{row.label}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <div style={{ width: 60, fontSize: 11, color: "#6366f1" }}>Current</div>
                        <div style={{ flex: 1, background: "#eef2ff", borderRadius: 6, height: 14 }}>
                          <div style={{ width: `${Math.max(3, (row.curr / max) * 100)}%`, background: "#6366f1", height: "100%", borderRadius: 6 }} />
                        </div>
                        <div style={{ width: 80, fontSize: 12, fontWeight: 600, textAlign: "right" }}>{row.fmt(row.curr)}</div>
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <div style={{ width: 60, fontSize: 11, color: "#cbd5e1" }}>Previous</div>
                        <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 14 }}>
                          <div style={{ width: `${Math.max(3, (row.prev / max) * 100)}%`, background: "#cbd5e1", height: "100%", borderRadius: 6 }} />
                        </div>
                        <div style={{ width: 80, fontSize: 12, fontWeight: 600, textAlign: "right", color: "#64748b" }}>{row.fmt(row.prev)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Daily Sales Heatmap</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>Sales volume by day and time</p>
            {heatmap.length === 0 ? (
              <div className="text-center text-muted py-4" style={{ fontSize: 13 }}>No data in this range.</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "70px repeat(7, 1fr)", gap: 4 }}>
                  <div />
                  {DOW_LABELS.map((d) => (
                    <div key={d} style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>{d}</div>
                  ))}
                  {TIME_BUCKETS.map(({ key, label }) => (
                    <div key={key} style={{ display: "contents" }}>
                      <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center" }}>{label}</div>
                      {DOW_LABELS.map((_, i) => {
                        const dow = i + 1;
                        const value = heatmapLookup.map.get(`${dow}-${key}`) ?? 0;
                        const intensity = value / heatmapLookup.max;
                        return (
                          <div
                            key={`${dow}-${key}`}
                            title={money(value)}
                            style={{
                              height: 32,
                              borderRadius: 6,
                              background: `rgba(79, 70, 229, ${0.08 + intensity * 0.8})`,
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="d-flex align-items-center gap-2 mt-3" style={{ fontSize: 11, color: "#9ca3af" }}>
                  <span>Low</span>
                  {[0.15, 0.3, 0.5, 0.7, 0.9].map((o) => (
                    <div key={o} style={{ width: 16, height: 10, borderRadius: 3, background: `rgba(79, 70, 229, ${o})` }} />
                  ))}
                  <span>High</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="text-muted text-center" style={{ fontSize: 12 }}>
        All charts are based on the currently applied filters. Data is calculated on the entire filtered set, not just the visible page.
      </div>
    </div>
  );
}
