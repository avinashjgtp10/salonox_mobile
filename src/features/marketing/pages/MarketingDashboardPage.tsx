import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchDashboardStatsThunk,
  fetchTemplatesThunk,
  syncTemplateThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { Button } from "../../../components/ui";
import "../styles/MarketingDashboardPage.scss";

export default function MarketingDashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { dashboardStats: data, loading, templates } = useAppSelector((s) => s.marketing);
  const prevStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchDashboardStatsThunk());
    dispatch(fetchTemplatesThunk());
  }, [dispatch]);

  useEffect(() => {
    const pending = templates.filter(t => t.status === "PENDING");
    if (pending.length === 0) return;
    const interval = setInterval(async () => {
      for (const t of pending) {
        const res = await dispatch(syncTemplateThunk(String(t.id)));
        if (syncTemplateThunk.fulfilled.match(res)) {
          const updated = res.payload;
          const prev    = prevStatuses.current[String(t.id)];
          if (prev && prev !== updated.status) {
            if (updated.status === "APPROVED") toast.success(`✅ Template "${t.name}" approved!`);
            else if (updated.status === "REJECTED") toast.error(`❌ Template "${t.name}" rejected.`);
          }
          prevStatuses.current[String(t.id)] = updated.status;
        }
      }
    }, 60_000);
    pending.forEach(t => { prevStatuses.current[String(t.id)] = t.status; });
    return () => clearInterval(interval);
  }, [templates, dispatch]);

  const stats     = data ?? ({} as any);
  const isLoading = loading.fetchDashboardStats;
  const pct       = (a: number, b: number) => b ? `${Math.round((a / b) * 100)}%` : "0%";
  const maxVol    = Math.max(...(stats.dailyVolume ?? []).map((d: any) => d.count), 1);

  const kpis = [
    { label: "Total Sent",  value: stats.totalSent ?? 0,      sub: pct(stats.totalSent, stats.totalContacts), color: "#10b981" },
    { label: "Delivered",   value: stats.totalDelivered ?? 0, sub: pct(stats.totalDelivered, stats.totalSent), color: "#3b82f6" },
    { label: "Read",        value: stats.totalRead ?? 0,      sub: pct(stats.totalRead, stats.totalSent),      color: "#8b5cf6" },
    { label: "Campaigns",   value: stats.totalCampaigns ?? 0, sub: `${stats.activeCampaigns ?? 0} live`,       color: "#111827" },
    { label: "Failed",      value: stats.totalFailed ?? 0,    sub: "",                                         color: "#f59e0b" },
    { label: "Blocked",     value: stats.totalBlocked ?? 0,   sub: "",                                         color: "#ef4444" },
  ];

  const funnel = [
    { label: "Sent",      value: stats.totalSent ?? 0,      color: "#10b981" },
    { label: "Delivered", value: stats.totalDelivered ?? 0, color: "#3b82f6" },
    { label: "Read",      value: stats.totalRead ?? 0,      color: "#8b5cf6" },
    { label: "Failed",    value: stats.totalFailed ?? 0,    color: "#f59e0b" },
    { label: "Blocked",   value: stats.totalBlocked ?? 0,   color: "#ef4444" },
  ];

  return (
    <div className="mkt-page">
      <div className="mkt-page-header">
        <div>
          <h1 className="mkt-page-title">WhatsApp Marketing</h1>
          <p className="mkt-page-sub">Monitor campaigns, delivery rates and messaging performance</p>
        </div>
        <div className="mkt-header-btns">
          <Button variant="ghost" onClick={() => navigate("/dashboard/marketing/templates/create")}>
            + Template
          </Button>
          <Button variant="primary" onClick={() => navigate("/dashboard/marketing/campaigns/create")}>
            + Campaign
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mkt-loading">Loading stats...</div>
      ) : (
        <>
          <div className="mkt-kpi-grid">
            {kpis.map((k) => (
              <div key={k.label} className="mkt-kpi-card">
                <div className="mkt-kpi-accent" style={{ background: k.color }} />
                <div className="mkt-kpi-value">{k.value.toLocaleString("en-IN")}</div>
                <div className="mkt-kpi-label">{k.label}</div>
                {k.sub && <div className="mkt-kpi-sub">{k.sub}</div>}
              </div>
            ))}
          </div>
          <div className="mkt-bottom-row">
            <div className="mkt-card">
              <div className="mkt-card-title">📊 Delivery Funnel</div>
              <div className="mkt-funnel">
                {funnel.map((row) => {
                  const w = stats.totalSent ? Math.max((row.value / stats.totalSent) * 100, row.value > 0 ? 4 : 0) : 0;
                  return (
                    <div key={row.label} className="mkt-funnel-row">
                      <span className="mkt-funnel-label">{row.label}</span>
                      <div className="mkt-funnel-track">
                        <div className="mkt-funnel-fill" style={{ width: `${w}%`, background: row.color }} />
                      </div>
                      <span className="mkt-funnel-val">{row.value.toLocaleString("en-IN")}</span>
                      <span className="mkt-funnel-pct">{stats.totalSent ? Math.round((row.value / stats.totalSent) * 100) : 0}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mkt-card">
              <div className="mkt-card-title">📅 Daily Volume</div>
              <div className="mkt-bar-chart">
                {(stats.dailyVolume ?? []).map((d: any) => (
                  <div key={d.date} className="mkt-bar-col">
                    <div className="mkt-bar-wrap">
                      <div className="mkt-bar" style={{ height: `${Math.max((d.count / maxVol) * 100, d.count > 0 ? 6 : 2)}%` }} title={`${d.count.toLocaleString()} messages`} />
                    </div>
                    <span className="mkt-bar-label">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}