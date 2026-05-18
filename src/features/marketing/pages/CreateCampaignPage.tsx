import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchTemplatesThunk, createCampaignThunk } from "../../../middleware/marketing/marketing.thunk";
import { fetchClientsThunk } from "../../../middleware/client/client.thunk";
import { ExcelUpload } from "../components";
import { Button, Input } from "../../../components/ui";
import { useOnce } from "../../../hooks/useOnce";
import "../styles/CreateCampaignPage.scss";

const STEPS       = ["Name & Template", "Add Contacts", "Review & Launch"];
const BATCH_SIZES = [20, 50, 100];
type ContactSource = "salon" | "excel";

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { templates } = useAppSelector((s) => s.marketing);
  const { items: clientItems, loading: cl } = useAppSelector((s) => s.client);
  const clients: any[] = Array.isArray(clientItems) ? clientItems
    : Array.isArray((clientItems as any)?.items) ? (clientItems as any).items
    : Array.isArray((clientItems as any)?.data) ? (clientItems as any).data : [];

  const [step,        setStep]       = useState(0);
  const [form,        setForm]       = useState({ name: "", templateId: "", batchSize: 50, scheduledAt: "" });
  const [contacts,    setContacts]   = useState<any[]>([]);
  const [errors,      setErrors]     = useState<Record<string, string>>({});
  const [source,      setSource]     = useState<ContactSource>("salon");
  const [search,      setSearch]     = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { if (templates.length === 0) dispatch(fetchTemplatesThunk()); }, [dispatch, templates.length]);
  useEffect(() => { if (step === 1 && source === "salon") dispatch(fetchClientsThunk()); }, [step, source, dispatch]);

  const approved = templates.filter((t) => t.status === "APPROVED");

  type NClient = { id: string; fullName: string; phone: string };
  const normalizedClients = useMemo<NClient[]>(() =>
    (clients ?? []).map((c: any): NClient => ({
      id:       c.id,
      fullName: c.fullName ?? c.full_name ?? ((c.first_name ?? '') + ' ' + (c.last_name ?? '')).trim(),
      phone:    c.phone ?? c.phone_number ?? c.phoneNumber ?? '',
    })).filter((c: NClient) => c.phone && c.phone.trim().length > 0),
  [clients]);

  const filteredClients = useMemo(() =>
    normalizedClients.filter(c =>
      c.fullName?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
    ), [normalizedClients, search]);

  const toggleClient = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredClients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredClients.map(c => String(c.id))));
  };

  const up = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const cleanPhone = (phone: string): string => {
    let p = phone.replace(/[\s\-().]/g, "");
    if (p.startsWith("0")) p = "+91" + p.slice(1);
    if (!p.startsWith("+")) p = "+91" + p;
    return p;
  };

  const buildContacts = () => {
    if (source === "salon") {
      return normalizedClients.filter(c => selectedIds.has(String(c.id)))
        .map(c => ({ phone: cleanPhone(c.phone!), name: c.fullName ?? "", variables: {} }));
    }
    return contacts.map(c => ({ ...c, phone: cleanPhone(c.phone) }));
  };

  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Campaign name is required";
    if (!form.templateId) e.templateId = "Please select an approved template";
    setErrors(e); return !Object.keys(e).length;
  };

  const validateStep1 = () => {
    if (!buildContacts().length) { setErrors({ contacts: "Please select or upload at least 1 contact" }); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 1) setContacts(buildContacts());
    setStep(s => s + 1);
  };

  const [handleLaunch, launching] = useOnce(async () => {
    const result = await dispatch(createCampaignThunk({
      name: form.name, template_id: form.templateId, batch_size: form.batchSize, scheduled_at: form.scheduledAt || null,
      contacts: contacts.map(c => ({ phone: c.phone, name: c.name, variables: c })),
    }));
    if (createCampaignThunk.fulfilled.match(result)) {
      toast.success("Campaign launched successfully!");
      navigate("/dashboard/marketing/campaigns/history");
    } else {
      toast.error((result.payload as string) ?? "Failed to launch campaign");
    }
  });

  const selectedTemplate = templates.find(t => t.id === form.templateId);
  const finalContacts    = step === 2 ? contacts : buildContacts();

  return (
    <div className="cc-page cc-page--split">
      <div className="cc-header">
        <div>
          <h1 className="cc-title">New Campaign</h1>
          <p className="cc-sub">Send a bulk WhatsApp campaign to your contacts</p>
        </div>
      </div>

      <div className="cc-steps">
        {STEPS.map((s, i) => (
          <div key={s} className="cc-step-item">
            <div className={`cc-step-circle ${i < step ? "done" : i === step ? "active" : ""}`}>{i < step ? "✓" : i + 1}</div>
            <span className={`cc-step-label ${i === step ? "active" : ""}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="cc-step-line" />}
          </div>
        ))}
      </div>

      <div className="cc-split-layout">
        <div className="cc-left-col">
          <div className="cc-body">

            {/* Step 0 */}
            {step === 0 && (
              <div className="cc-step-form">
                <div className="cc-field">
                  <label className="cc-label">Campaign Name *</label>
                  <Input placeholder="Diwali Offer 2025" value={form.name} error={errors.name} containerClass="mb-0"
                    onChange={e => up("name", e.target.value)} />
                </div>
                <div className="cc-field" style={{ marginTop: 20 }}>
                  <label className="cc-label">WhatsApp Template *</label>
                  {templates.length === 0 ? (
                    <div className="cc-no-templates">
                      <span>📐 No templates yet —</span>
                      <button className="cc-create-template-link" onClick={() => navigate("/dashboard/marketing/templates/create")}>Create one first →</button>
                    </div>
                  ) : (
                    <div className="cc-template-list">
                      {templates.map(t => (
                        <div key={t.id} className={["cc-template-item", t.status !== "APPROVED" ? "disabled" : "", form.templateId === t.id ? "selected" : ""].join(" ")}
                          onClick={() => t.status === "APPROVED" && up("templateId", t.id as string)}>
                          <div className="cc-template-info">
                            <div className="cc-template-name">{t.name}</div>
                            <div className="cc-template-body">{(t.body_text ?? t.bodyText ?? "").slice(0, 70)}{(t.body_text ?? t.bodyText ?? "").length > 70 ? "..." : ""}</div>
                          </div>
                          <span className={`cc-template-status status-${t.status.toLowerCase()}`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.templateId && <span className="cc-error">{errors.templateId}</span>}
                  {templates.length > 0 && approved.length === 0 && (
                    <div className="cc-pending-warn">⏳ No approved templates yet. Go to Templates and sync or create a new one.</div>
                  )}
                </div>
                <div className="cc-field" style={{ marginTop: 20 }}>
                  <label className="cc-label">Batch Size</label>
                  <select className="cc-select" value={form.batchSize} onChange={e => up("batchSize", Number(e.target.value))}>
                    {BATCH_SIZES.map(b => <option key={b} value={b}>{b} messages / batch</option>)}
                  </select>
                </div>

                <div className="cc-field" style={{ marginTop: 20 }}>
                  <label className="cc-label">Schedule (optional)</label>
                  <input
                    type="datetime-local"
                    className="cc-input"
                    value={form.scheduledAt}
                    min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                    onChange={e => up("scheduledAt", e.target.value)}
                  />
                  {form.scheduledAt && (
                    <button
                      className="cc-schedule-clear"
                      onClick={() => up("scheduledAt", "")}
                    >
                      ✕ Clear — send immediately instead
                    </button>
                  )}
                  <p className="cc-field-hint">
                    {form.scheduledAt
                      ? `📅 Will send on ${new Date(form.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                      : "Leave empty to send immediately after launch"}
                  </p>
                </div>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="cc-step-form">
                <div className="cc-source-toggle">
                  <button className={`cc-source-btn ${source === "salon" ? "active" : ""}`}
                    onClick={() => { setSource("salon"); setContacts([]); }}>
                    🏪 Select from Salon Clients
                    {source === "salon" && selectedIds.size > 0 && <span className="cc-source-count">{selectedIds.size}</span>}
                  </button>
                  <button className={`cc-source-btn ${source === "excel" ? "active" : ""}`}
                    onClick={() => { setSource("excel"); setSelectedIds(new Set()); }}>
                    📊 Upload Excel
                    {source === "excel" && contacts.length > 0 && <span className="cc-source-count">{contacts.length}</span>}
                  </button>
                </div>

                {source === "salon" && (
                  <div className="cc-client-picker">
                    <div className="cc-client-toolbar">
                      <Input placeholder="Search by name or phone..." value={search} containerClass="mb-0 flex-1"
                        onChange={e => setSearch(e.target.value)} />
                      <div className="cc-client-toolbar-right">
                        <span className="cc-client-count">{normalizedClients.length} clients with phone</span>
                        <button className="cc-select-all" onClick={toggleAll}>
                          {selectedIds.size > 0 && selectedIds.size === filteredClients.length ? "✗ Deselect All" : "✓ Select All"}
                        </button>
                      </div>
                    </div>
                    {cl?.fetchAll ? (
                      <div className="cc-client-loading">Loading clients...</div>
                    ) : filteredClients.length === 0 ? (
                      <div className="cc-client-empty">{normalizedClients.length === 0 ? "No clients with phone numbers found." : "No clients match your search."}</div>
                    ) : (
                      <div className="cc-client-list">
                        {filteredClients.map(c => {
                          const id = String(c.id); const sel = selectedIds.has(id);
                          return (
                            <div key={id} className={`cc-client-row ${sel ? "cc-client-row--selected" : ""}`} onClick={() => toggleClient(id)}>
                              <div className={`cc-client-checkbox ${sel ? "checked" : ""}`}>{sel && "✓"}</div>
                              <div className="cc-client-avatar">{(c.fullName ?? "?")[0].toUpperCase()}</div>
                              <div className="cc-client-info">
                                <span className="cc-client-name">{c.fullName}</span>
                                <span className="cc-client-phone">📱 {c.phone}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedIds.size > 0 && (
                      <div className="cc-selected-summary">✅ {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""} selected</div>
                    )}
                  </div>
                )}

                {source === "excel" && <ExcelUpload onContactsLoaded={setContacts} />}
                {errors.contacts && <span className="cc-error" style={{ marginTop: 8 }}>{errors.contacts}</span>}
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="cc-step-form">
                <div className="cc-review-box">
                  <div className="cc-review-row"><span className="cc-review-label">Campaign Name</span><span className="cc-review-value">{form.name}</span></div>
                  <div className="cc-review-row"><span className="cc-review-label">Template</span><span className="cc-review-value mono">{selectedTemplate?.name}</span></div>
                  <div className="cc-review-row"><span className="cc-review-label">Contact Source</span><span className="cc-review-value">{source === "salon" ? "🏪 Salon Clients" : "📊 Excel Upload"}</span></div>
                  <div className="cc-review-row"><span className="cc-review-label">Total Contacts</span><span className="cc-review-value" style={{ color: "#10b981", fontWeight: 700 }}>{finalContacts.length.toLocaleString()}</span></div>
                  <div className="cc-review-row"><span className="cc-review-label">Batch Size</span><span className="cc-review-value">{form.batchSize} per batch</span></div>
                </div>
                {selectedTemplate && (
                  <div className="cc-preview-wrap">
                    <div className="cc-preview-label">Message Preview</div>
                    <div className="cc-wa-bubble">
                      <p className="cc-wa-body">{selectedTemplate.body_text ?? selectedTemplate.bodyText ?? ""}</p>
                      <p className="cc-wa-time">10:24 AM ✓✓</p>
                    </div>
                  </div>
                )}
                {finalContacts.length > 0 && (
                  <div className="cc-contacts-preview">
                    <div className="cc-contacts-preview-title">📋 Contacts Preview ({finalContacts.length})</div>
                    <div className="cc-contacts-preview-list">
                      {finalContacts.slice(0, 5).map((c, i) => (
                        <div key={i} className="cc-contacts-preview-row"><span>{c.name || "—"}</span><span>📱 {c.phone}</span></div>
                      ))}
                      {finalContacts.length > 5 && <div className="cc-contacts-preview-more">+{finalContacts.length - 5} more contacts</div>}
                    </div>
                  </div>
                )}
                {form.scheduledAt ? (
                <div className="cc-launch-warn cc-launch-scheduled">
                  📅 Campaign will be sent automatically on <strong>{new Date(form.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong>. You can cancel it from Campaign History before that time.
                </div>
              ) : (
                <div className="cc-launch-warn">⚠️ Once launched, messages will be sent immediately in batches. You can pause at any time.</div>
              )}
              </div>
            )}

            <div className="cc-nav">
              {step > 0 && <Button variant="ghost" onClick={() => setStep(s => s - 1)}>← Back</Button>}
              {step < 2 ? (
                <Button variant="primary" onClick={handleNext} disabled={step === 0 && templates.length > 0 && approved.length === 0}>Next →</Button>
              ) : (
                <Button variant="success" loading={launching} disabled={launching} onClick={handleLaunch}>🚀 Launch Campaign</Button>
              )}
            </div>
          </div>
        </div>

        <div className="cc-right-col">
          <div className="cc-guide">
            <div className="cc-guide-title">🗺️ How to run a campaign</div>
            <div className="cc-guide-steps">
              {[
                { title: "Create a Template",  desc: "Go to Templates → design your WhatsApp message and submit for Meta approval." },
                { title: "Wait for Approval",  desc: "Meta reviews templates in minutes to hours. Sync status on the Templates page." },
                { title: "Pick Contacts",      desc: "Select from your salon clients or upload an Excel file with phone numbers." },
                { title: "Launch & Track",     desc: "Launch the campaign. Track delivery and read rates in Campaign History." },
              ].map((step, i) => (
                <div key={i} className="cc-guide-step">
                  <div className="cc-guide-num">{i + 1}</div>
                  <div>
                    <div className="cc-guide-step-title">{step.title}</div>
                    <div className="cc-guide-step-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cc-guide-tip">💡 <strong>Tip:</strong> Use UTILITY templates — they get approved faster than MARKETING ones.</div>
          </div>
        </div>
      </div>
    </div>
  );
}