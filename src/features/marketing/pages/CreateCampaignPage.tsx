import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchTemplatesThunk, createCampaignThunk } from "../../../middleware/marketing/marketing.thunk";
import { ExcelUpload } from "../components";
import { Button, Input } from "../../../components/ui";
import Dropdown from "../../../components/ui/Dropdown";
import { useOnce } from "../../../hooks/useOnce";
import { toTitleCase } from "../../../utils/titleCase";
import "../styles/CreateCampaignPage.scss";

const SCHEDULE_OPTIONS = [
  { id: "now",   name: "Send immediately" },
  { id: "later", name: "Schedule for later" },
];

// Local calendar date (not toISOString(), which is UTC and rolls back a day
// during early-morning IST hours since India is ahead of UTC)
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Date + time suggested as the default schedule, computed together so they
// stay consistent across an hour/day rollover (e.g. 11:56 PM -> next day).
// Rounds up to the nearest 15 minutes to match TIME_OPTIONS' granularity —
// otherwise the <select> has no matching <option> for the default value.
function getDefaultSchedule(): { date: string; time: string } {
  const d = new Date(Date.now() + 10 * 60000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); // setMinutes rolls hour/day over automatically
  const y   = d.getFullYear();
  const mo  = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const h   = d.getHours().toString().padStart(2, "0");
  const mi  = d.getMinutes().toString().padStart(2, "0");
  return { date: `${y}-${mo}-${day}`, time: `${h}:${mi}` };
}

function buildIso(date: string, time: string): string {
  if (!date || !time) return "";
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  // Construct directly from local components — new Date(dateString) parses
  // date-only strings as UTC midnight, which can land on the wrong local day.
  const d = new Date(year, month - 1, day, h, m, 0, 0);
  return d.toISOString();
}

function timeOptions() {
  const opts: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh   = h.toString().padStart(2, "0");
      const mm   = m.toString().padStart(2, "0");
      const ampm = h < 12 ? "AM" : "PM";
      const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
      opts.push({ label: `${h12}:${mm} ${ampm}`, value: `${hh}:${mm}` });
    }
  }
  return opts;
}
const TIME_OPTIONS = timeOptions();

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { templates, waConfig } = useAppSelector((s) => s.marketing);

  const [form,        setForm]        = useState({ name: "", templateId: "", batchSize: 50 });
  const [contacts,    setContacts]    = useState<any[]>([]);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [schedDate,   setSchedDate]   = useState("");
  const [schedTime,   setSchedTime]   = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const scheduledAt = isScheduled && schedDate ? buildIso(schedDate, schedTime) : "";
  const dailyLimit  = waConfig?.dailyLimit ?? (waConfig as any)?.daily_limit ?? 0;

  useEffect(() => { if (templates.length === 0) dispatch(fetchTemplatesThunk()); }, [dispatch, templates.length]);

  const approved = templates.filter((t) => t.status === "APPROVED");

  const up = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const cleanPhone = (phone: string): string => {
    let p = phone.replace(/[\s\-().]/g, "");
    if (p.startsWith("0")) p = "+91" + p.slice(1);
    if (!p.startsWith("+")) p = "+91" + p;
    return p;
  };

  const buildContacts = () => contacts.map(c => ({ ...c, phone: cleanPhone(c.phone) }));

  const validateAll = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Campaign name is required";
    if (!form.templateId)  e.templateId = "Please select an approved template";
    if (isScheduled) {
      if (!schedDate) {
        e.schedule = "Please pick a date";
      } else {
        const picked  = new Date(buildIso(schedDate, schedTime));
        const minTime = new Date(Date.now() + 5 * 60000);
        if (picked < minTime) e.schedule = "Scheduled time must be at least 5 minutes in the future";
      }
    }
    const built = buildContacts();
    if (!built.length) {
      e.contacts = "Please upload contacts to send this campaign to";
    } else if (dailyLimit > 0 && built.length > dailyLimit) {
      e.contacts = `Your contact list (${built.length.toLocaleString()}) exceeds your daily limit of ${dailyLimit.toLocaleString()}.`;
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const [handleLaunch, launching] = useOnce(async () => {
    if (!validateAll()) return;
    const finalContacts = buildContacts();
    if (dailyLimit > 0 && finalContacts.length > dailyLimit) {
      showError(`Contact list exceeds your daily limit of ${dailyLimit.toLocaleString()} messages.`);
      return;
    }
    const result = await dispatch(createCampaignThunk({
      name:         toTitleCase(form.name.trim()),
      template_id:  form.templateId,
      batch_size:   form.batchSize,
      scheduled_at: scheduledAt || null,
      contacts:     finalContacts.map(c => ({ phone: c.phone, name: c.name, variables: c.variables ?? {} })),
    }));
    if (createCampaignThunk.fulfilled.match(result)) {
      showSuccess(scheduledAt ? "Campaign scheduled!" : "Campaign launched!");
      navigate("/dashboard/marketing/campaigns/history");
    } else {
      showError((result.payload as string) ?? "Failed to launch campaign");
    }
  });

  const selectedTemplate = templates.find(t => t.id === form.templateId);
  const finalContacts    = buildContacts();
  const isOverLimit      = dailyLimit > 0 && finalContacts.length > dailyLimit;

  return (
    <div className="cc-page cc-page--simple">
      {overlay}

      <div className="cc-simple-form">

        {/* ── 1. Campaign Details ── */}
        <section className="cc-section">
          <h3 className="cc-section-title">1. Campaign Details</h3>
          <div className="cc-section-body">
            <div className="cc-row-2">
              <div className="cc-field">
                <label className="cc-label">Campaign Name *</label>
                <Input
                  placeholder="Diwali Offer 2025"
                  value={form.name}
                  error={errors.name}
                  containerClass="mb-0"
                  onChange={e => up("name", e.target.value)}
                />
              </div>

              <div className="cc-field">
                <label className="cc-label">WhatsApp Template *</label>
                {templates.length === 0 ? (
                  <div className="cc-no-templates">
                    <span>📐 No templates yet —</span>
                    <button className="cc-create-template-link" onClick={() => navigate("/dashboard/marketing/templates/create")}>
                      Create one first →
                    </button>
                  </div>
                ) : (
                  <Dropdown
                    searchable
                    placeholder="Select a template"
                    value={form.templateId}
                    options={templates.map(t => ({
                      id: t.id as string,
                      name: t.status === "APPROVED" ? t.name : `${t.name} (${t.status})`,
                      disabled: t.status !== "APPROVED",
                    }))}
                    onChange={id => up("templateId", id)}
                  />
                )}
                {errors.templateId && <span className="cc-error">{errors.templateId}</span>}
                {templates.length > 0 && approved.length === 0 && (
                  <div className="cc-pending-warn">⏳ No approved templates yet.</div>
                )}
              </div>
            </div>

            <div className="cc-field" style={{ marginTop: 18 }}>
              <label className="cc-label">Batch Size</label>
              <div className="cc-batch-pills">
                {[20, 50, 100].map(n => (
                  <label key={n} className={`cc-batch-pill${form.batchSize === n ? " active" : ""}`}>
                    <input
                      type="radio"
                      name="batchSize"
                      checked={form.batchSize === n}
                      onChange={() => up("batchSize", n)}
                    />
                    {n}
                  </label>
                ))}
              </div>
              <p className="cc-field-hint">Messages send in groups with a short delay between batches, so Meta doesn't flag your number as spam.</p>
            </div>

            <div className="cc-field" style={{ marginTop: 18 }}>
              <label className="cc-label">Schedule</label>
              <Dropdown
                searchable={false}
                value={isScheduled ? "later" : "now"}
                options={SCHEDULE_OPTIONS}
                onChange={id => {
                  setIsScheduled(id === "later");
                  if (id === "later" && !schedDate) {
                    const def = getDefaultSchedule();
                    setSchedDate(def.date);
                    setSchedTime(def.time);
                  }
                }}
              />

              {isScheduled && (
                <div className="cc-schedule-picker">
                  <div className="cc-schedule-row">
                    <div className="cc-schedule-field">
                      <label className="cc-schedule-label">Date</label>
                      <input
                        type="date"
                        className="cc-date-input"
                        value={schedDate}
                        min={todayStr()}
                        onChange={e => setSchedDate(e.target.value)}
                      />
                    </div>
                    <div className="cc-schedule-field">
                      <label className="cc-schedule-label">Time</label>
                      <Dropdown
                        className="cc-time-select"
                        searchable={false}
                        value={schedTime}
                        options={TIME_OPTIONS.map(o => ({ id: o.value, name: o.label }))}
                        onChange={setSchedTime}
                      />
                    </div>
                  </div>
                  {errors.schedule && <span className="cc-error">{errors.schedule}</span>}
                  {schedDate && !errors.schedule && (
                    <div className="cc-schedule-preview">
                      📅 Will send on{" "}
                      <strong>
                        {new Date(buildIso(schedDate, schedTime)).toLocaleString("en-IN", {
                          weekday: "short", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. Upload Contacts ── */}
        <section className="cc-section">
          <h3 className="cc-section-title">2. Upload Contacts</h3>
          <div className="cc-section-body">
            {dailyLimit > 0 && (
              <div className="cc-limit-info">
                <span className="cc-limit-info-icon">📊</span>
                <span>Your daily limit is <strong>{dailyLimit.toLocaleString()}</strong> messages.</span>
              </div>
            )}

            <ExcelUpload onContactsLoaded={setContacts} />
            {contacts.length > 0 && dailyLimit > 0 && contacts.length > dailyLimit && (
              <div className="cc-over-limit-warn">
                🚫 Your Excel has {contacts.length.toLocaleString()} contacts but your daily limit is {dailyLimit.toLocaleString()}.
              </div>
            )}

            {errors.contacts && (
              <span className="cc-error" style={{ marginTop: 8 }}>{errors.contacts}</span>
            )}
          </div>
        </section>

        {/* ── 3. Message Preview ── */}
        <section className="cc-section">
          <h3 className="cc-section-title">3. Message Preview</h3>
          <div className="cc-section-body">
            {selectedTemplate ? (
              <div className="cc-wa-bubble">
                <p className="cc-wa-body">{selectedTemplate.body_text ?? selectedTemplate.bodyText ?? ""}</p>
              </div>
            ) : (
              <p className="cc-field-hint" style={{ margin: 0 }}>Select a template above to preview the message.</p>
            )}

            <div className="cc-preview-meta">
              <span>Recipients: <strong>{finalContacts.length.toLocaleString()}</strong></span>
              <span>Batch: <strong>{form.batchSize}</strong></span>
            </div>

            {isOverLimit && (
              <div className="cc-over-limit-warn" style={{ marginTop: 12 }}>
                🚫 {finalContacts.length.toLocaleString()} contacts exceeds your daily limit of {dailyLimit.toLocaleString()} — reduce your selection by {(finalContacts.length - dailyLimit).toLocaleString()}.
              </div>
            )}
          </div>
        </section>

        <div className="cc-simple-footer">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            variant="success"
            loading={launching}
            disabled={launching || isOverLimit}
            onClick={handleLaunch}
          >
            {scheduledAt ? "📅 Schedule Campaign" : "🚀 Launch Campaign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
