import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { templatesApi } from '../api/marketing.api'
import TemplateCard from '../components/TemplateCard'
import { useTemplates } from '../hooks/useMarketing'
import toast from 'react-hot-toast'
import '../styles/CreateTemplatePage.scss'

type HeaderType = 'none' | 'text' | 'image' | 'video' | 'document'
type ButtonType = 'quick_reply' | 'url' | 'phone'
interface Btn { type: ButtonType; text: string; value: string }

const CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION']
const LANGUAGES  = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'hi_IN', label: 'Hindi' },
  { value: 'mr_IN', label: 'Marathi' },
  { value: 'ta_IN', label: 'Tamil' },
  { value: 'te_IN', label: 'Telugu' },
]
const BODY_LIMIT = 1024

export default function CreateTemplatePage() {
  const navigate = useNavigate()
  const fileRef  = useRef<HTMLInputElement>(null)
  const { templates, loading: tLoading, deleteTemplate, syncTemplate } = useTemplates()

  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'MARKETING', language: 'en_US', bodyText: '', footerText: '',
  })
  const [headerType, setHeaderType]       = useState<HeaderType>('none')
  const [headerText, setHeaderText]       = useState('')
  const [headerFile, setHeaderFile]       = useState<File | null>(null)
  const [headerPreview, setHeaderPreview] = useState('')
  const [buttons, setButtons]             = useState<Btn[]>([])
  const [errors, setErrors]               = useState<Record<string, string>>({})

  const up = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setHeaderFile(file)
    if (headerType === 'image') {
      const r = new FileReader()
      r.onload = (ev) => setHeaderPreview(ev.target?.result as string)
      r.readAsDataURL(file)
    }
  }

  const addBtn = (type: ButtonType) => {
    if (buttons.length >= 3) return
    setButtons((p) => [...p, { type, text: '', value: '' }])
  }
  const updateBtn = (i: number, k: keyof Btn, v: string) =>
    setButtons((p) => p.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)))
  const removeBtn = (i: number) => setButtons((p) => p.filter((_, idx) => idx !== i))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name) e.name = 'Required'
    else if (!/^[a-z0-9_]+$/.test(form.name)) e.name = 'Lowercase, numbers and underscores only'
    if (form.bodyText.length < 10) e.bodyText = 'At least 10 characters'
    if (headerType === 'text' && !headerText) e.headerText = 'Header text required'
    if (['image', 'video', 'document'].includes(headerType) && !headerFile) e.headerFile = 'Please upload a file'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('category', form.category)
    fd.append('language', form.language)
    fd.append('headerType', headerType)
    fd.append('bodyText', form.bodyText)
    if (form.footerText) fd.append('footerText', form.footerText)
    if (headerType === 'text') fd.append('headerText', headerText)
    if (headerFile) fd.append('headerFile', headerFile)
    fd.append('buttons', JSON.stringify(buttons))
    try {
      await templatesApi.create(fd)
      toast.success('Template submitted for approval!')
      setForm({ name: '', category: 'MARKETING', language: 'en_US', bodyText: '', footerText: '' })
      setHeaderType('none'); setHeaderText(''); setHeaderFile(null); setHeaderPreview(''); setButtons([])
    } catch { toast.error('Failed to submit template') }
    finally { setSubmitting(false) }
  }

  const previewBody = (t: string) =>
    t.replace(/\{\{1\}\}/g, '<b>Priya</b>').replace(/\{\{2\}\}/g, '<b>30</b>').replace(/\{\{3\}\}/g, '<b>Jan 15</b>')

  return (
    <div className="ct-page">

      {/* Header */}
      <div className="ct-topbar">
        <button className="ct-back" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <h1 className="ct-title">WhatsApp Templates</h1>
          <p className="ct-sub">Create a template and submit to Meta for approval</p>
        </div>
      </div>

      <div className="ct-layout">

        {/* ── LEFT: Form ── */}
        <div className="ct-form-col">

          {/* Basic Info */}
          <div className="ct-section">
            <div className="ct-section-title">Basic Info</div>
            <div className="ct-field">
              <label className="ct-label">Template Name *</label>
              <input
                className={`ct-input ${errors.name ? 'error' : ''}`}
                placeholder="e.g. summer_promo_2025"
                value={form.name}
                onChange={(e) => up('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              />
              {errors.name && <span className="ct-error">{errors.name}</span>}
              <span className="ct-hint">Lowercase, numbers and underscores only</span>
            </div>
            <div className="ct-row-2">
              <div className="ct-field">
                <label className="ct-label">Category</label>
                <select className="ct-select" value={form.category} onChange={(e) => up('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="ct-field">
                <label className="ct-label">Language</label>
                <select className="ct-select" value={form.language} onChange={(e) => up('language', e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="ct-section">
            <div className="ct-section-title">Header <span className="ct-optional">Optional</span></div>
            <div className="ct-header-types">
              {(['none','text','image','video','document'] as HeaderType[]).map((t) => (
                <button
                  key={t}
                  className={`ct-header-btn ${headerType === t ? 'active' : ''}`}
                  onClick={() => { setHeaderType(t); setHeaderFile(null); setHeaderPreview('') }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {headerType === 'text' && (
              <div className="ct-field">
                <input
                  className={`ct-input ${errors.headerText ? 'error' : ''}`}
                  placeholder="Hello {{1}}! Welcome to our salon 🎉"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  maxLength={60}
                />
                {errors.headerText && <span className="ct-error">{errors.headerText}</span>}
                <span className="ct-hint">{headerText.length}/60</span>
              </div>
            )}
            {['image','video','document'].includes(headerType) && (
              <>
                <div
                  className={`ct-upload-zone ${errors.headerFile ? 'error' : ''}`}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef} type="file" style={{ display: 'none' }}
                    accept={
                      headerType === 'image'    ? 'image/jpeg,image/png,image/webp' :
                      headerType === 'video'    ? 'video/mp4,video/3gpp' :
                      'application/pdf,.doc,.docx'
                    }
                    onChange={handleFile}
                  />
                  {headerPreview && headerType === 'image' ? (
                    <img src={headerPreview} alt="preview" className="ct-upload-img" />
                  ) : headerFile ? (
                    <div className="ct-upload-file">{headerFile.name}</div>
                  ) : (
                    <div className="ct-upload-placeholder">
                      Click to upload {headerType}
                    </div>
                  )}
                </div>
                {errors.headerFile && <span className="ct-error">{errors.headerFile}</span>}
              </>
            )}
          </div>

          {/* Body */}
          <div className="ct-section">
            <div className="ct-section-title">Body Message *</div>
            <div className="ct-field">
              <textarea
                className={`ct-textarea ${errors.bodyText ? 'error' : ''}`}
                rows={5}
                placeholder="Hi {{1}}, get {{2}}% OFF at Glow Salon! Book by {{3}}. Reply STOP to opt out."
                value={form.bodyText}
                onChange={(e) => up('bodyText', e.target.value.slice(0, BODY_LIMIT))}
              />
              {errors.bodyText && <span className="ct-error">{errors.bodyText}</span>}
              <div className="ct-body-footer">
                <span className="ct-hint">Use {'{{1}}, {{2}}, {{3}}'} for variables from Excel</span>
                <span className={`ct-char-count ${form.bodyText.length > BODY_LIMIT * 0.9 ? 'warn' : ''}`}>
                  {form.bodyText.length}/{BODY_LIMIT}
                </span>
              </div>
            </div>
            <div className="ct-var-btns">
              <span className="ct-var-label">Insert:</span>
              {['{{1}}','{{2}}','{{3}}','{{4}}'].map((v) => (
                <button key={v} className="ct-var-btn" onClick={() => up('bodyText', form.bodyText + v)}>{v}</button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="ct-section">
            <div className="ct-section-title">Footer <span className="ct-optional">Optional</span></div>
            <input
              className="ct-input"
              placeholder="Glow Salon · Reply STOP to unsubscribe"
              value={form.footerText}
              onChange={(e) => up('footerText', e.target.value)}
              maxLength={60}
            />
            <span className="ct-hint">{form.footerText.length}/60</span>
          </div>

          {/* Buttons */}
          <div className="ct-section">
            <div className="ct-section-title">Buttons <span className="ct-optional">Optional · Max 3</span></div>
            {buttons.map((btn, i) => (
              <div key={i} className="ct-btn-item">
                <div className="ct-btn-item-header">
                  <span className="ct-btn-type">
                    {btn.type === 'quick_reply' ? '↩ Quick Reply' : btn.type === 'url' ? '🔗 URL' : '📞 Phone'}
                  </span>
                  <button className="ct-remove-btn" onClick={() => removeBtn(i)}>✕</button>
                </div>
                <div className="ct-row-2">
                  <input className="ct-input" placeholder="Button text" value={btn.text}
                    onChange={(e) => updateBtn(i, 'text', e.target.value)} maxLength={25} />
                  {btn.type === 'url' && (
                    <input className="ct-input" placeholder="https://yoursalon.com/book" value={btn.value}
                      onChange={(e) => updateBtn(i, 'value', e.target.value)} />
                  )}
                  {btn.type === 'phone' && (
                    <input className="ct-input" placeholder="+91 98765 43210" value={btn.value}
                      onChange={(e) => updateBtn(i, 'value', e.target.value)} />
                  )}
                </div>
              </div>
            ))}
            {buttons.length < 3 && (
              <div className="ct-add-btns-row">
                <button className="ct-add-btn" onClick={() => addBtn('quick_reply')}>+ Quick Reply</button>
                <button className="ct-add-btn" onClick={() => addBtn('url')}>+ URL Button</button>
                <button className="ct-add-btn" onClick={() => addBtn('phone')}>+ Phone Button</button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="ct-actions">
            <button className="ct-cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
            <button className="ct-submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : '🚀 Submit to Meta for Approval'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Preview + Existing Templates ── */}
        <div className="ct-right-col">

          {/* Live Phone Preview */}
          <div className="ct-preview-label">📱 Live Preview</div>
          <div className="ct-phone">
            <div className="ct-phone-header">
              <div className="ct-phone-avatar">S</div>
              <div>
                <div className="ct-phone-name">Salon Bot</div>
                <div className="ct-phone-status">online</div>
              </div>
            </div>
            <div className="ct-phone-body">
              <div className="ct-message">
                {headerType === 'image' && headerPreview && (
                  <img src={headerPreview} alt="header" className="ct-msg-img" />
                )}
                {headerType === 'text' && headerText && (
                  <div className="ct-msg-header-text">{headerText}</div>
                )}
                <div
                  className="ct-msg-body"
                  dangerouslySetInnerHTML={{
                    __html: previewBody(form.bodyText || 'Your message will appear here...'),
                  }}
                />
                {form.footerText && <div className="ct-msg-footer">{form.footerText}</div>}
                <div className="ct-msg-time">10:24 AM ✓✓</div>
              </div>
              {buttons.filter((b) => b.text).length > 0 && (
                <div className="ct-msg-buttons">
                  {buttons.filter((b) => b.text).map((b, i) => (
                    <div key={i} className="ct-msg-btn">{b.text}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Existing Templates */}
          <div className="ct-existing-title">Existing Templates</div>
          {tLoading ? (
            <div className="ct-loading">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="ct-empty">No templates yet</div>
          ) : (
            <div className="ct-templates-list">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} onDelete={deleteTemplate} onSync={syncTemplate} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}