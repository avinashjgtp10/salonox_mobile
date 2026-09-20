import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ArrowLeft } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PRODUCT_INVENTORY_REPORT } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import ReportPieChart from "./ReportPieChart";

const STATUS_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

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

export default function ProductInventoryGraphPage({
  reportName, onBack, onClose, statCards, buildFilterBody,
}: {
  reportName: string;
  onBack: () => void;
  onClose: () => void;
  statCards: StatCardDef[];
  buildFilterBody: () => Record<string, any>;
}) {
  const { formatAmount: money } = useCurrency();
  const [topLimit, setTopLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [byStatus, setByStatus] = useState<{ name: string; value: number }[]>([]);
  const [byCategory, setByCategory] = useState<{ key: string; name: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ key: string; name: string; value: number }[]>([]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(PRODUCT_INVENTORY_REPORT.CHART(), {
        ...buildFilterBody(),
        top_limit: topLimit,
      });
      const data = res.data?.data ?? {};

      setByStatus((Array.isArray(data.by_status) ? data.by_status : []).map((s: any) => ({
        name: STATUS_LABELS[String(s.status)] ?? String(s.status ?? "Unknown"),
        value: Number(s.value) || 0,
      })));

      setByCategory((Array.isArray(data.by_category) ? data.by_category : []).map((c: any) => ({
        key: String(c.category_name ?? "—"),
        name: String(c.category_name ?? "—"),
        value: Number(c.value) || 0,
      })));

      setTopProducts((Array.isArray(data.top_products) ? data.top_products : []).map((p: any) => ({
        key: String(p.product_name ?? "—"),
        name: String(p.product_name ?? "—"),
        value: Number(p.value) || 0,
      })));
    } catch {
      setError("Failed to load graph data.");
    } finally {
      setLoading(false);
    }
  }, [buildFilterBody, topLimit]);

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
          Current stock snapshot · same filters as the table
        </p>
      </div>

      <StatCardRow cards={statCards} />

      {error && <div className="text-center text-danger py-3">{error}</div>}

      {/* ── Stock Value by Status ─────────────────── */}
      <div className="row g-4 mb-1">
        <div className="col-12 col-lg-6">
          <div className="rp-graph-card">
            <h5 className="fw-bold mb-1">Stock Value by Status</h5>
            <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>In Stock, Low Stock and Out of Stock share of total stock value</p>
            <ReportPieChart
              data={byStatus}
              formatValue={(n) => money(n)}
              height={280}
              innerRadiusRatio={0.6}
              loading={loading}
              emptyMessage="No data in this range."
            />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="d-flex justify-content-end mb-2">
            <select className="form-select form-select-sm" style={{ width: "auto" }} value={topLimit} onChange={(e) => setTopLimit(Number(e.target.value))}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>
          <RankedBarList
            title="Stock Value by Category"
            subtitle="Highest stock-value categories"
            items={byCategory}
            money={money}
          />
        </div>
      </div>

      <div className="row g-4 mt-1 mb-1">
        <div className="col-12">
          <RankedBarList
            title="Top Products by Stock Value"
            subtitle="Highest stock-value products currently held"
            items={topProducts}
            money={money}
          />
        </div>
      </div>

      <div className="text-muted text-center mt-3" style={{ fontSize: 12 }}>
        All charts and summary cards are based on the currently applied filters, computed over the entire filtered set, not just the visible page.
      </div>
    </div>
  );
}
