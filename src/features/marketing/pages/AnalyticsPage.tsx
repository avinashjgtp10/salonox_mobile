import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux"
import { fetchAnalytics } from '../../../middleware/marketing/analytics.thunk'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Button } from '../../../components/ui'
import '../styles/AnalyticsPage.scss'

type Preset      = '7' | '15' | '30' | '60' | '90' | 'custom'
type CategoryKey = 'marketing' | 'utility' | 'authentication' | 'service'

const CATEGORIES: CategoryKey[] = ['marketing', 'utility', 'authentication', 'service']

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  marketing:      '#3b82f6',
  utility:        '#8b5cf6',
  authentication: '#10b981',
  service:        '#9ca3af',
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  marketing:      'Marketing',
  utility:        'Utility',
  authentication: 'Authentication',
  service:        'Service (Free)',
}

const PRESETS: { label: string; value: Preset }[] = [
  { label: '7 days',  value: '7'      },
  { label: '15 days', value: '15'     },
  { label: '30 days', value: '30'     },
  { label: '60 days', value: '60'     },
  { label: '90 days', value: '90'     },
  { label: 'Custom',  value: 'custom' },
]

function getDateRange(preset: Preset, customStart?: string, customEnd?: string) {
  if (preset === 'custom') return { start: customStart!, end: customEnd! }
  const end   = new Date()
  const start = new Date()
  start.setDate(end.getDate() - parseInt(preset))
  return {
    start: start.toISOString().split('T')[0],
    end:   end.toISOString().split('T')[0],
  }
}

function extractErrorMessage(err: any): string {
  if (!err) return ''
  if (typeof err === 'string') return err
  if (typeof err === 'object') return err.error ?? err.message ?? err.msg ?? JSON.stringify(err)
  return String(err)
}

function fmtINR(n: number)  { return '₹' + n.toFixed(2) }
function fmtINR4(n: number) { return '₹' + n.toFixed(4) }

export default function AnalyticsPage() {
  const dispatch         = useAppDispatch()
  const analyticsData    = useAppSelector((s) => s.marketing.analyticsData)
  const analyticsLoading = useAppSelector((s) => s.marketing.loading.fetchAnalytics)
  const rawError         = useAppSelector((s) => s.marketing.error)

  const [preset,      setPreset]      = useState<Preset>('30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')

  const load = () => {
    const { start, end } = getDateRange(preset, customStart, customEnd)
    if (preset === 'custom' && (!start || !end)) return
    dispatch(fetchAnalytics({ start, end, granularity: 'DAILY' }))
  }

  useEffect(() => {
    if (preset !== 'custom') load()
  }, [preset])

  const errorMessage  = extractErrorMessage(rawError)
  const data          = analyticsData
  const isConfigError = errorMessage.toLowerCase().includes('not configured')
    || errorMessage.toLowerCase().includes('waba id')
    || errorMessage.toLowerCase().includes('access token')

  // ← fix: use totalMessages, fall back to totalConversations for old data
  const totalMessages = (data as any)?.totalMessages
    ?? (data as any)?.totalConversations
    ?? 0

  const pricingModel  = (data as any)?.pricingModel ?? 'CBP'
  const hasData       = totalMessages > 0 || ((data?.totalEstimatedCost ?? 0) > 0)

  return (
    <div className="an-page">

      {/* Header */}
      <div className="an-header">
  <div>
    <h1 className="an-title">WhatsApp Analytics</h1>
    <p className="an-sub">Message counts and estimated spend — billed by Meta in ₹ (INR)</p>
  </div>
  <div className="an-header-right">
    <div className="an-pricing-info">
      <span className={`an-model-badge an-model-badge--${pricingModel.toLowerCase()}`}>
        {pricingModel === 'PMP' ? '⚡ Per-message pricing' : '💬 Conversation pricing'}
      </span>
      <div className="an-pricing-tooltip">
        <div className="an-pricing-tooltip-row">
          <span>📢 Marketing</span><span>₹0.88 / msg</span>
        </div>
        <div className="an-pricing-tooltip-row">
          <span>🔧 Utility</span><span>₹0.125 / msg</span>
        </div>
        <div className="an-pricing-tooltip-row">
          <span>🔐 Authentication</span><span>₹0.125 / msg</span>
        </div>
        <div className="an-pricing-tooltip-row">
          <span>💬 Service</span><span>Free</span>
        </div>
        <div className="an-pricing-tooltip-note">India rates · billed by Meta</div>
      </div>
    </div>
    <span className="an-delay">Data may have 24-48hr delay</span>
  </div>
</div>

      {/* Preset Pills */}
      <div className="an-presets">
        {PRESETS.map(p => (
          <button
            key={p.value}
            className={'an-preset' + (preset === p.value ? ' an-preset--active' : '')}
            onClick={() => setPreset(p.value)}
          >
            {p.label}
          </button>
        ))}

        {preset === 'custom' && (
          <div className="an-custom-range">
            <input
              type="date"
              className="an-date-input"
              value={customStart}
              max={customEnd || undefined}
              onChange={e => setCustomStart(e.target.value)}
            />
            <span className="an-custom-sep">to</span>
            <input
              type="date"
              className="an-date-input"
              value={customEnd}
              min={customStart || undefined}
              onChange={e => setCustomEnd(e.target.value)}
            />
            <Button variant="primary" size="sm" onClick={load}>Apply</Button>
          </div>
        )}
      </div>

      {/* Error */}
      {errorMessage && !analyticsLoading && (
        <div className="an-error">
          <p className="an-error-msg">{'⚠️ ' + errorMessage}</p>
          {isConfigError && (
            <p className="an-error-hint">
              Go to{' '}
              <a href="/dashboard/marketing/config">WhatsApp Config</a>
              {' — make sure WABA ID and Access Token are saved, then come back here.'}
            </p>
          )}
          <button className="an-retry" onClick={load}>Try again</button>
        </div>
      )}

      {/* Loading */}
      {analyticsLoading && (
        <div className="an-loading">
          <div className="an-spinner" />
          <p className="an-loading-text">Fetching data from Meta…</p>
        </div>
      )}

      {/* Content */}
      {!analyticsLoading && !errorMessage && data && (
        <>
          {/* KPI Grid */}
          <div className="an-kpi-grid">
            <div className="an-kpi-card">
              <div className="an-kpi-icon">📨</div>
              <div className="an-kpi-label">
                {pricingModel === 'PMP' ? 'Total Messages' : 'Total Conversations'}
              </div>
              <div className="an-kpi-value">{totalMessages.toLocaleString('en-IN')}</div>
              <div className="an-kpi-sub">
                {pricingModel === 'PMP' ? 'messages delivered' : 'conversation windows'}
              </div>
            </div>

            <div className="an-kpi-card an-kpi-card--green">
              <div className="an-kpi-icon">💰</div>
              <div className="an-kpi-label">Estimated Spend</div>
              <div className="an-kpi-value an-kpi-value--green">
                {fmtINR(data.totalEstimatedCost)}
              </div>
              <div className="an-kpi-sub">INR · billed by Meta</div>
            </div>

            <div className="an-kpi-card">
              <div className="an-kpi-icon">📢</div>
              <div className="an-kpi-label">Marketing</div>
              <div className="an-kpi-value">{data.byCategory.marketing.toLocaleString('en-IN')}</div>
              <div className="an-kpi-sub">{fmtINR(data.byCategoryCost.marketing)} est.</div>
            </div>

            <div className="an-kpi-card">
              <div className="an-kpi-icon">🔧</div>
              <div className="an-kpi-label">Utility</div>
              <div className="an-kpi-value">{data.byCategory.utility.toLocaleString('en-IN')}</div>
              <div className="an-kpi-sub">{fmtINR(data.byCategoryCost.utility)} est.</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="an-card">
            <div className="an-card-title">📊 Messages by Category</div>
            {hasData ? (
              <>
                {/* ← fix: use totalMessages as base, not totalConversations */}
                {totalMessages > 0 ? (
                  <div className="an-breakdown-bar">
                    {CATEGORIES.map((cat) => {
                      const pct = (data.byCategory[cat] / totalMessages) * 100
                      return pct > 0 ? (
                        <div
                          key={cat}
                          className="an-breakdown-seg"
                          style={{ width: pct + '%', backgroundColor: CATEGORY_COLORS[cat] }}
                          title={CATEGORY_LABELS[cat] + ': ' + pct.toFixed(1) + '%'}
                        />
                      ) : null
                    })}
                  </div>
                ) : (
                  <div className="an-breakdown-bar-empty" />
                )}
                <div className="an-breakdown-legend">
                  {CATEGORIES.map((cat) => (
                    <div key={cat} className="an-legend-item">
                      <div className="an-legend-dot" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                      <span>
                        {CATEGORY_LABELS[cat]}
                        {' — '}
                        <strong>{data.byCategory[cat].toLocaleString('en-IN')}</strong>
                        {data.byCategoryCost[cat] > 0 && (
                          <span className="an-legend-cost"> · {fmtINR(data.byCategoryCost[cat])}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="an-no-data">No messages in this period.</p>
            )}
          </div>

          {/* Daily Messages Chart */}
          {data.daily.length > 0 && (
            <div className="an-card">
              <div className="an-card-title">
                📅 Daily {pricingModel === 'PMP' ? 'Messages' : 'Conversations'}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.daily} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                    labelFormatter={(l: string) => 'Date: ' + l}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {CATEGORIES.map((cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      name={CATEGORY_LABELS[cat]}
                      stackId="a"
                      fill={CATEGORY_COLORS[cat]}
                      radius={cat === 'marketing' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily Spend Chart */}
          {data.daily.length > 0 && (
            <div className="an-card">
              <div className="an-card-title">💰 Daily Estimated Spend (INR)</div>
              <p className="an-chart-hint">
                Estimated in ₹ using Meta India rates · Actual charges may vary by volume tier
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.daily} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtINR(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => [fmtINR4(v), 'Est. Spend (INR)']}
                    labelFormatter={(l: string) => 'Date: ' + l}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="estimatedCost"
                    name="Est. Spend"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#costGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ← fix: empty state only when truly no data at all */}
          {!hasData && data.daily.length === 0 && (
            <div className="an-empty">
              <div className="an-empty-icon">📊</div>
              <div className="an-empty-title">No data for this period</div>
              <div className="an-empty-sub">Try selecting a wider date range</div>
            </div>
          )}

          <p className="an-disclaimer">
            💡 Costs shown in ₹ (INR) — Meta bills Indian businesses in INR.
            Rates: ₹0.88/marketing, ₹0.125/utility & authentication. Service messages are free.
            Check your{' '}
            <a href="https://business.facebook.com" target="_blank" rel="noreferrer">
              Meta WhatsApp Manager → Message pricing
            </a>
            {' '}for exact charges.
          </p>
        </>
      )}
    </div>
  )
}