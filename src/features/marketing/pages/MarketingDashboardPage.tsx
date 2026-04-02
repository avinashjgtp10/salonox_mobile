import { useNavigate } from 'react-router-dom'
import { useDashboardStats } from '../hooks/useMarketing'
import '../styles/MarketingDashboardPage.scss'

export default function MarketingDashboardPage() {
  const navigate      = useNavigate()
  const { data, loading } = useDashboardStats()

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '0%')
  const maxVol = Math.max(...(data.dailyVolume ?? []).map((d: any) => d.count), 1)

  const kpis = [
    { label: 'Total Sent',  value: data.totalSent ?? 0,      sub: pct(data.totalSent, data.totalContacts), color: '#10b981' },
    { label: 'Delivered',   value: data.totalDelivered ?? 0,  sub: pct(data.totalDelivered, data.totalSent), color: '#3b82f6' },
    { label: 'Read',        value: data.totalRead ?? 0,       sub: pct(data.totalRead, data.totalSent),      color: '#8b5cf6' },
    { label: 'Campaigns',   value: data.totalCampaigns ?? 0,  sub: `${data.activeCampaigns ?? 0} live`,      color: '#111827' },
    { label: 'Failed',      value: data.totalFailed ?? 0,     sub: '',                                       color: '#f59e0b' },
    { label: 'Blocked',     value: data.totalBlocked ?? 0,    sub: '',                                       color: '#ef4444' },
  ]

  const funnel = [
    { label: 'Sent',      value: data.totalSent ?? 0,      color: '#10b981' },
    { label: 'Delivered', value: data.totalDelivered ?? 0, color: '#3b82f6' },
    { label: 'Read',      value: data.totalRead ?? 0,      color: '#8b5cf6' },
    { label: 'Failed',    value: data.totalFailed ?? 0,    color: '#f59e0b' },
    { label: 'Blocked',   value: data.totalBlocked ?? 0,   color: '#ef4444' },
  ]

  return (
    <div className="mkt-page">

      {/* ── Page Header ── */}
      <div className="mkt-page-header">
        <div>
          <h1 className="mkt-page-title">WhatsApp Marketing</h1>
          <p className="mkt-page-sub">Monitor campaigns, delivery rates and messaging performance</p>
        </div>
        <div className="mkt-header-btns">
          <button
            className="mkt-btn-outline"
            onClick={() => navigate('/dashboard/marketing/templates/create')}
          >
            + Template
          </button>
          <button
            className="mkt-btn-primary"
            onClick={() => navigate('/dashboard/marketing/campaigns/create')}
          >
            + Campaign
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      {loading ? (
        <div className="mkt-loading">Loading stats...</div>
      ) : (
        <>
          <div className="mkt-kpi-grid">
            {kpis.map((k) => (
              <div key={k.label} className="mkt-kpi-card">
                <div className="mkt-kpi-accent" style={{ background: k.color }} />
                <div className="mkt-kpi-value">{k.value.toLocaleString('en-IN')}</div>
                <div className="mkt-kpi-label">{k.label}</div>
                {k.sub && <div className="mkt-kpi-sub">{k.sub}</div>}
              </div>
            ))}
          </div>

          {/* ── Bottom Row ── */}
          <div className="mkt-bottom-row">

            {/* Funnel */}
            <div className="mkt-card">
              <div className="mkt-card-title">📊 Delivery Funnel</div>
              <div className="mkt-funnel">
                {funnel.map((row) => {
                  const w = data.totalSent
                    ? Math.max((row.value / data.totalSent) * 100, row.value > 0 ? 4 : 0)
                    : 0
                  return (
                    <div key={row.label} className="mkt-funnel-row">
                      <span className="mkt-funnel-label">{row.label}</span>
                      <div className="mkt-funnel-track">
                        <div
                          className="mkt-funnel-fill"
                          style={{ width: `${w}%`, background: row.color }}
                        />
                      </div>
                      <span className="mkt-funnel-val">{row.value.toLocaleString('en-IN')}</span>
                      <span className="mkt-funnel-pct">
                        {data.totalSent ? Math.round((row.value / data.totalSent) * 100) : 0}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="mkt-card">
              <div className="mkt-card-title">📅 Daily Volume</div>
              <div className="mkt-bar-chart">
                {(data.dailyVolume ?? []).map((d: any) => (
                  <div key={d.date} className="mkt-bar-col">
                    <div className="mkt-bar-wrap">
                      <div
                        className="mkt-bar"
                        style={{
                          height: `${Math.max((d.count / maxVol) * 100, d.count > 0 ? 6 : 2)}%`,
                        }}
                        title={`${d.count.toLocaleString()} messages`}
                      />
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
  )
}