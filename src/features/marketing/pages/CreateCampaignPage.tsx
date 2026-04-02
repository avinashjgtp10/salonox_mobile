import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { campaignsApi } from '../api/marketing.api'
import { useTemplates } from '../hooks/useMarketing'
import ExcelUpload from '../components/ExcelUpload'
import toast from 'react-hot-toast'
import '../styles/CreateCampaignPage.scss'

const STEPS       = ['Name & Template', 'Upload Contacts', 'Review & Launch']
const BATCH_SIZES = [20, 50, 100]

export default function CreateCampaignPage() {
  const navigate            = useNavigate()
  const { templates }       = useTemplates()
  const [step, setStep]     = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm]     = useState({ name: '', templateId: '', batchSize: 50 })
  const [contacts, setContacts] = useState<any[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const approved = templates.filter((t) => t.status === 'APPROVED')

  const up = (k: string, v: any) => {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const validateStep0 = () => {
    const e: Record<string, string> = {}
    if (!form.name) e.name = 'Campaign name is required'
    if (!form.templateId) e.templateId = 'Please select an approved template'
    setErrors(e)
    return !Object.keys(e).length
  }

  const validateStep1 = () => {
    if (!contacts.length) { setErrors({ contacts: 'Please upload at least 1 contact' }); return false }
    return true
  }

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return
    if (step === 1 && !validateStep1()) return
    setStep((s) => s + 1)
  }

  const handleLaunch = async () => {
    setSubmitting(true)
    try {
      await campaignsApi.create({
        name:       form.name,
        templateId: form.templateId,
        batchSize:  form.batchSize,
        contacts:   contacts.map((c) => ({ phone: c.phone, name: c.name, variables: c })),
      })
      toast.success('Campaign launched successfully!')
      navigate('/dashboard/marketing')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to launch campaign')
    } finally { setSubmitting(false) }
  }

  const selectedTemplate = templates.find((t) => t.id === form.templateId)

  return (
    <div className="cc-page">

      {/* Header */}
      <div className="cc-header">
        <button className="cc-back" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <h1 className="cc-title">New Campaign</h1>
          <p className="cc-sub">Send a bulk WhatsApp campaign to your contacts</p>
        </div>
      </div>

      {/* Steps */}
      <div className="cc-steps">
        {STEPS.map((s, i) => (
          <div key={s} className="cc-step-item">
            <div className={`cc-step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`cc-step-label ${i === step ? 'active' : ''}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="cc-step-line" />}
          </div>
        ))}
      </div>

      <div className="cc-body">

        {/* ── Step 0: Name & Template ── */}
        {step === 0 && (
          <div className="cc-step-form">

            <div className="cc-field">
              <label className="cc-label">Campaign Name *</label>
              <input
                className={`cc-input ${errors.name ? 'error' : ''}`}
                placeholder="Diwali Offer 2025"
                value={form.name}
                onChange={(e) => up('name', e.target.value)}
              />
              {errors.name && <span className="cc-error">{errors.name}</span>}
            </div>

            <div className="cc-field" style={{ marginTop: 20 }}>
              <label className="cc-label">WhatsApp Template *</label>

              {templates.length === 0 ? (
                <div className="cc-no-templates">
                  <span>📐 No templates yet —</span>
                  <button
                    className="cc-create-template-link"
                    onClick={() => navigate('/dashboard/marketing/templates/create')}
                  >
                    Create one first →
                  </button>
                </div>
              ) : (
                <div className="cc-template-list">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className={[
                        'cc-template-item',
                        t.status !== 'APPROVED' ? 'disabled' : '',
                        form.templateId === t.id ? 'selected' : '',
                      ].join(' ')}
                      onClick={() => t.status === 'APPROVED' && up('templateId', t.id)}
                    >
                      <div className="cc-template-info">
                        <div className="cc-template-name">{t.name}</div>
                        <div className="cc-template-body">
                          {t.bodyText?.length > 70 ? t.bodyText.slice(0, 70) + '...' : t.bodyText}
                        </div>
                      </div>
                      <span className={`cc-template-status status-${t.status.toLowerCase()}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {errors.templateId && <span className="cc-error">{errors.templateId}</span>}
              {templates.length > 0 && approved.length === 0 && (
                <div className="cc-pending-warn">
                  ⏳ No approved templates yet. Go to Templates and sync or create a new one.
                </div>
              )}
            </div>

            <div className="cc-field" style={{ marginTop: 20 }}>
              <label className="cc-label">Batch Size</label>
              <select
                className="cc-select"
                value={form.batchSize}
                onChange={(e) => up('batchSize', Number(e.target.value))}
              >
                {BATCH_SIZES.map((b) => (
                  <option key={b} value={b}>{b} messages / batch</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="cc-step-form">
            <ExcelUpload onContactsLoaded={setContacts} />
            {errors.contacts && <span className="cc-error" style={{ marginTop: 8 }}>{errors.contacts}</span>}
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <div className="cc-step-form">
            <div className="cc-review-box">
              <div className="cc-review-row">
                <span className="cc-review-label">Campaign Name</span>
                <span className="cc-review-value">{form.name}</span>
              </div>
              <div className="cc-review-row">
                <span className="cc-review-label">Template</span>
                <span className="cc-review-value mono">{selectedTemplate?.name}</span>
              </div>
              <div className="cc-review-row">
                <span className="cc-review-label">Total Contacts</span>
                <span className="cc-review-value" style={{ color: '#10b981', fontWeight: 700 }}>
                  {contacts.length.toLocaleString()}
                </span>
              </div>
              <div className="cc-review-row">
                <span className="cc-review-label">Batch Size</span>
                <span className="cc-review-value">{form.batchSize} per batch</span>
              </div>
            </div>

            {selectedTemplate && (
              <div className="cc-preview-wrap">
                <div className="cc-preview-label">Message Preview</div>
                <div className="cc-wa-bubble">
                  <p className="cc-wa-body">{selectedTemplate.bodyText}</p>
                  <p className="cc-wa-time">10:24 AM ✓✓</p>
                </div>
              </div>
            )}

            <div className="cc-launch-warn">
              ⚠️ Once launched, messages will be sent immediately in batches. You can pause at any time.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="cc-nav">
          {step > 0 && (
            <button className="cc-btn-outline" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          )}
          {step < 2 ? (
            <button
              className="cc-btn-primary"
              onClick={handleNext}
              disabled={step === 0 && templates.length > 0 && approved.length === 0}
            >
              Next →
            </button>
          ) : (
            <button className="cc-btn-primary" onClick={handleLaunch} disabled={submitting}>
              {submitting ? 'Launching...' : '🚀 Launch Campaign'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}