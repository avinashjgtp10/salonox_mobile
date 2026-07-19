import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchTemplatesThunk, createCampaignThunk } from "../../../middleware/marketing/marketing.thunk";
import { fetchClientsThunk } from "../../../middleware/client/client.thunk";
import { ExcelUpload } from "../components";
import { Button, Input } from "../../../components/ui";
import { useOnce } from "../../../hooks/useOnce";
import api from "../../../services/api/axios";
import "../styles/CreateCampaignPage.scss";

const STEPS = ["Name & Template", "Add Contacts", "Review & Launch"];
type ContactSource = "salon" | "excel" | "filter";

const MONTHS = [
  { value: "1",  label: "January"   },
  { value: "2",  label: "February"  },
  { value: "3",  label: "March"     },
  { value: "4",  label: "April"     },
  { value: "5",  label: "May"       },
  { value: "6",  label: "June"      },
  { value: "7",  label: "July"      },
  { value: "8",  label: "August"    },
  { value: "9",  label: "September" },
  { value: "10", label: "October"   },
  { value: "11", label: "November"  },
  { value: "12", label: "December"  },
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

interface SmartFilter {
  birth_month:          string;
  birth_day_month:      string;
  genders:              string[];
  service_category_ids: string[];
  last_visit_from:      string;
  last_visit_to:        string;
  customer_type:        "" | "new" | "repetitive";
  total_spend_min:      string;
  total_spend_max:      string;
  has_membership:       "" | "yes" | "no";
  has_package:          "" | "yes" | "no";
}

const EMPTY_FILTER: SmartFilter = {
  birth_month:          "",
  birth_day_month:      "",
  genders:              [],
  service_category_ids: [],
  last_visit_from:      "",
  last_visit_to:        "",
  customer_type:        "",
  total_spend_min:      "",
  total_spend_max:      "",
  has_membership:       "",
  has_package:          "",
};

const FILTER_TABS = [
  { key: "birthday",     label: "Birthday",       icon: "ti-cake" },
  { key: "details",      label: "Client Details", icon: "ti-users" },
  { key: "category",     label: "Service Category", icon: "ti-scissors" },
  { key: "last_visit",   label: "Last Visited",   icon: "ti-calendar-event" },
  { key: "retention",    label: "Client Retention", icon: "ti-repeat" },
  { key: "spend",        label: "Total Purchase Amount", icon: "ti-currency-rupee" },
  { key: "membership",   label: "Membership",     icon: "ti-id-badge-2" },
  { key: "package",      label: "Package",        icon: "ti-package" },
] as const;
type FilterTabKey = typeof FILTER_TABS[number]["key"];

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { templates, waConfig } = useAppSelector((s) => s.marketing);
  const { items: clientItems, loading: cl } = useAppSelector((s) => s.client);
  const clients: any[] = Array.isArray(clientItems) ? clientItems
    : Array.isArray((clientItems as any)?.items) ? (clientItems as any).items
    : Array.isArray((clientItems as any)?.data) ? (clientItems as any).data : [];

  const [step,        setStep]        = useState(0);
  const [form,        setForm]        = useState({ name: "", templateId: "", batchSize: 50 });
  const [contacts,    setContacts]    = useState<any[]>([]);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [source,      setSource]      = useState<ContactSource>("salon");
  const [search,      setSearch]      = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [schedDate,   setSchedDate]   = useState("");
  const [schedTime,   setSchedTime]   = useState("");
  const [isScheduled, setIsScheduled] = useState(false);

  const [smartFilter,     setSmartFilter]     = useState<SmartFilter>(EMPTY_FILTER);
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTabKey>("birthday");
  const [categories,      setCategories]      = useState<{ id: string; name: string }[]>([]);
  const [filterContacts,  setFilterContacts]  = useState<any[]>([]);
  const [filterCount,     setFilterCount]     = useState<number | null>(null);
  const [filterLoading,   setFilterLoading]   = useState(false);
  const [filterPreviewed, setFilterPreviewed] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const scheduledAt = isScheduled && schedDate ? buildIso(schedDate, schedTime) : "";
  const dailyLimit  = waConfig?.dailyLimit ?? (waConfig as any)?.daily_limit ?? 0;

  useEffect(() => { if (templates.length === 0) dispatch(fetchTemplatesThunk()); }, [dispatch, templates.length]);
  useEffect(() => { if (step === 1 && source === "salon") dispatch(fetchClientsThunk()); }, [step, source, dispatch]);
  useEffect(() => {
    if (step === 1 && source === "filter" && categories.length === 0) {
      api.get("/api/v1/categories").then(res => {
        const data = res.data?.data ?? res.data ?? [];
        setCategories(Array.isArray(data) ? data : []);
      }).catch(() => { showError("Failed to load service categories"); });
    }
  }, [step, source, categories.length]);

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
    if (selectedIds.size > 0) { setSelectedIds(new Set()); return; }
    const capped = dailyLimit > 0 ? filteredClients.slice(0, dailyLimit) : filteredClients;
    if (dailyLimit > 0 && filteredClients.length > dailyLimit) {
      showError(`Only selected the first ${dailyLimit.toLocaleString()} — your daily limit is ${dailyLimit.toLocaleString()} messages.`);
    }
    setSelectedIds(new Set(capped.map(c => String(c.id))));
  };

  const up = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const upFilter = (k: keyof SmartFilter, v: string | string[]) => {
    setSmartFilter(prev => ({ ...prev, [k]: v }));
    setFilterPreviewed(false);
    setFilterCount(null);
    setFilterContacts([]);
  };

  const toggleFilterCategory = (id: string) => {
    const next = smartFilter.service_category_ids.includes(id)
      ? smartFilter.service_category_ids.filter(c => c !== id)
      : [...smartFilter.service_category_ids, id];
    upFilter("service_category_ids", next);
  };

  const cleanPhone = (phone: string): string => {
    let p = phone.replace(/[\s\-().]/g, "");
    if (p.startsWith("0")) p = "+91" + p.slice(1);
    if (!p.startsWith("+")) p = "+91" + p;
    return p;
  };

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (smartFilter.birth_month)              params.set("birth_month",         smartFilter.birth_month);
    if (smartFilter.birth_day_month)          params.set("birth_day_month",     smartFilter.birth_day_month);
    if (smartFilter.genders.length > 0)       params.set("gender",              smartFilter.genders.join(','));
    if (smartFilter.service_category_ids.length > 0)
      params.set("service_category_ids", smartFilter.service_category_ids.join(','));
    if (smartFilter.last_visit_from)          params.set("last_visit_from",     smartFilter.last_visit_from);
    if (smartFilter.last_visit_to)            params.set("last_visit_to",       smartFilter.last_visit_to);
    if (smartFilter.customer_type)            params.set("customer_type",       smartFilter.customer_type);
    if (smartFilter.total_spend_min)          params.set("total_spend_min",     smartFilter.total_spend_min);
    if (smartFilter.total_spend_max)          params.set("total_spend_max",     smartFilter.total_spend_max);
    if (smartFilter.has_membership)           params.set("has_membership",      smartFilter.has_membership === "yes" ? "true" : "false");
    if (smartFilter.has_package)              params.set("has_package",         smartFilter.has_package === "yes" ? "true" : "false");
    return params;
  };

const hasAnyFilter =
  smartFilter.birth_month !== "" ||
  smartFilter.birth_day_month !== "" ||
  smartFilter.genders.length > 0 ||
  smartFilter.service_category_ids.length > 0 ||
  smartFilter.last_visit_from !== "" ||
  smartFilter.last_visit_to !== "" ||
  smartFilter.customer_type !== "" ||
  smartFilter.total_spend_min !== "" ||
  smartFilter.total_spend_max !== "" ||
  smartFilter.has_membership !== "" ||
  smartFilter.has_package !== "";

  const handleApplyFilter = async () => {
    if (!hasAnyFilter) { showError("Please set at least one filter"); return; }
    setFilterLoading(true);
    try {
      const params = buildFilterParams();
      const res    = await api.get(`/api/v1/clients/filter?${params.toString()}`);
      const list   = res.data?.clients ?? res.data?.data?.clients ?? [];
      const mapped = list.map((c: any) => ({
        phone:     cleanPhone(c.phone),
        name:      c.full_name ?? c.fullName ?? "",
        variables: {},
      }));
      setFilterContacts(mapped);
      setFilterCount(mapped.length);
      setFilterPreviewed(true);
      if (mapped.length === 0) showError("No clients match these filters");
      else showSuccess(`${mapped.length} clients loaded`);
    } catch {
      showError("Failed to load filtered clients");
    } finally {
      setFilterLoading(false);
    }
  };

  const buildContacts = () => {
    if (source === "salon") {
      return normalizedClients
        .filter(c => selectedIds.has(String(c.id)))
        .map(c => ({ phone: cleanPhone(c.phone!), name: c.fullName ?? "", variables: {} }));
    }
    if (source === "filter") return filterContacts;
    return contacts.map(c => ({ ...c, phone: cleanPhone(c.phone) }));
  };

  const validateStep0 = () => {
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
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validateStep1 = () => {
    const built = buildContacts();
    if (!built.length) { setErrors({ contacts: "Please select or upload at least 1 contact" }); return false; }
    if (dailyLimit > 0 && built.length > dailyLimit) {
      setErrors({ contacts: `Your contact list (${built.length.toLocaleString()}) exceeds your daily limit of ${dailyLimit.toLocaleString()}.` });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 1) setContacts(buildContacts());
    setStep(s => s + 1);
  };

  const [handleLaunch, launching] = useOnce(async () => {
    if (dailyLimit > 0 && contacts.length > dailyLimit) {
      showError(`Contact list exceeds your daily limit of ${dailyLimit.toLocaleString()} messages.`);
      return;
    }
    const result = await dispatch(createCampaignThunk({
      name:         form.name,
      template_id:  form.templateId,
      batch_size:   form.batchSize,
      scheduled_at: scheduledAt || null,
      contacts:     contacts.map(c => ({ phone: c.phone, name: c.name, variables: c.variables ?? {} })),
    }));
    if (createCampaignThunk.fulfilled.match(result)) {
      showSuccess(scheduledAt ? "Campaign scheduled!" : "Campaign launched!");
      navigate("/dashboard/marketing/campaigns/history");
    } else {
      showError((result.payload as string) ?? "Failed to launch campaign");
    }
  });

  const selectedTemplate = templates.find(t => t.id === form.templateId);
  const finalContacts    = step === 2 ? contacts : buildContacts();
  const isOverLimit      = dailyLimit > 0 && finalContacts.length > dailyLimit;
  const isNearLimit      = dailyLimit > 0 && finalContacts.length > dailyLimit * 0.8 && !isOverLimit;

  return (
    <div className="cc-page cc-page--split">
      {overlay}
      <div className="cc-header">
        <div>
          <h1 className="cc-title">New Campaign</h1>
          <p className="cc-sub">Send a bulk WhatsApp campaign to your contacts</p>
        </div>
      </div>

      <div className="cc-steps">
        {STEPS.map((s, i) => (
          <div key={s} className="cc-step-item">
            <div className={`cc-step-circle ${i < step ? "done" : i === step ? "active" : ""}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`cc-step-label ${i === step ? "active" : ""}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="cc-step-line" />}
          </div>
        ))}
      </div>

      <div className="cc-split-layout">
        <div className="cc-left-col">
          <div className="cc-body">

            {/* ── Step 0 ── */}
            {step === 0 && (
              <div className="cc-step-form">
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

                <div className="cc-field" style={{ marginTop: 20 }}>
                  <label className="cc-label">WhatsApp Template *</label>
                  {templates.length === 0 ? (
                    <div className="cc-no-templates">
                      <span>📐 No templates yet —</span>
                      <button className="cc-create-template-link" onClick={() => navigate("/dashboard/marketing/templates/create")}>
                        Create one first →
                      </button>
                    </div>
                  ) : (
                    <div className="cc-template-list">
                      {templates.map(t => (
                        <div
                          key={t.id}
                          className={["cc-template-item", t.status !== "APPROVED" ? "disabled" : "", form.templateId === t.id ? "selected" : ""].join(" ")}
                          onClick={() => t.status === "APPROVED" && up("templateId", t.id as string)}
                        >
                          <div className="cc-template-info">
                            <div className="cc-template-name">{t.name}</div>
                            <div className="cc-template-body">
                              {(t.body_text ?? t.bodyText ?? "").slice(0, 70)}
                              {(t.body_text ?? t.bodyText ?? "").length > 70 ? "..." : ""}
                            </div>
                          </div>
                          <span className={`cc-template-status status-${t.status.toLowerCase()}`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.templateId && <span className="cc-error">{errors.templateId}</span>}
                  {templates.length > 0 && approved.length === 0 && (
                    <div className="cc-pending-warn">⏳ No approved templates yet.</div>
                  )}
                </div>

                <div className="cc-field" style={{ marginTop: 20 }}>
                  <label className="cc-label">Batch Size</label>

                  <div className="cc-batch-info">
                    <div className="cc-batch-info-title">What is batch size?</div>
                    <p className="cc-batch-info-desc">
                      Messages are sent in groups with a short delay between each batch.
                      This prevents Meta from flagging your number as spam.
                    </p>
                    <div className="cc-batch-options">
                      <div className={`cc-batch-option ${form.batchSize === 20 ? "active" : ""}`} onClick={() => up("batchSize", 20)}>
                        <span className="cc-batch-option-val">20</span>
                        <span className="cc-batch-option-label">Safe</span>
                        <span className="cc-batch-option-desc">Best for new numbers or low quality rating</span>
                      </div>
                      <div className={`cc-batch-option ${form.batchSize === 50 ? "active" : ""}`} onClick={() => up("batchSize", 50)}>
                        <span className="cc-batch-option-val">50</span>
                        <span className="cc-batch-option-label">Balanced ⭐</span>
                        <span className="cc-batch-option-desc">Recommended for most salons</span>
                      </div>
                      <div className={`cc-batch-option ${form.batchSize === 100 ? "active" : ""}`} onClick={() => up("batchSize", 100)}>
                        <span className="cc-batch-option-val">100</span>
                        <span className="cc-batch-option-label">Fast</span>
                        <span className="cc-batch-option-desc">Only for high quality rated numbers</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cc-field" style={{ marginTop: 20 }}>
                  <div className="cc-schedule-toggle-row">
                    <label className="cc-label" style={{ margin: 0 }}>Schedule for later</label>
                    <button
                      type="button"
                      className={`cc-toggle${isScheduled ? " cc-toggle--on" : ""}`}
                      onClick={() => {
                        setIsScheduled(s => !s);
                        if (!schedDate) {
                          const def = getDefaultSchedule();
                          setSchedDate(def.date);
                          setSchedTime(def.time);
                        }
                      }}
                    >
                      <span className="cc-toggle-thumb" />
                    </button>
                  </div>

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
                          <select
                            className="cc-time-select"
                            value={schedTime}
                            onChange={e => setSchedTime(e.target.value)}
                          >
                            {TIME_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
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
                  {!isScheduled && <p className="cc-field-hint">Leave off to send immediately after launch</p>}
                </div>
              </div>
            )}

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div className="cc-step-form">
                {dailyLimit > 0 && (
                  <div className="cc-limit-info">
                    <span className="cc-limit-info-icon">📊</span>
                    <span>Your daily limit is <strong>{dailyLimit.toLocaleString()}</strong> messages.</span>
                  </div>
                )}

                <div className="cc-source-toggle">
                  <button
                    className={`cc-source-btn ${source === "salon" ? "active" : ""}`}
                    onClick={() => { setSource("salon"); setContacts([]); setFilterContacts([]); }}
                  >
                    🏪 Salon Clients
                    {source === "salon" && selectedIds.size > 0 && <span className="cc-source-count">{selectedIds.size}</span>}
                  </button>
                  <button
                    className={`cc-source-btn ${source === "excel" ? "active" : ""}`}
                    onClick={() => { setSource("excel"); setSelectedIds(new Set()); setFilterContacts([]); }}
                  >
                    📊 Excel Upload
                    {source === "excel" && contacts.length > 0 && <span className="cc-source-count">{contacts.length}</span>}
                  </button>
                  <button
                    className={`cc-source-btn ${source === "filter" ? "active" : ""}`}
                    onClick={() => { setSource("filter"); setSelectedIds(new Set()); setContacts([]); }}
                  >
                    🎯 Smart Filter
                    {source === "filter" && filterContacts.length > 0 && <span className="cc-source-count">{filterContacts.length}</span>}
                  </button>
                </div>

                {/* ── Salon client picker ── */}
                {source === "salon" && (
                  <div className="cc-client-picker">
                    <div className="cc-client-toolbar">
                      <Input
                        placeholder="Search by name or phone..."
                        value={search}
                        containerClass="mb-0 flex-1"
                        onChange={e => setSearch(e.target.value)}
                      />
                      <div className="cc-client-toolbar-right">
                        <span className="cc-client-count">{normalizedClients.length} clients with phone</span>
                        <button className="cc-select-all" onClick={toggleAll}>
                          {selectedIds.size > 0 ? "✗ Deselect All" : "✓ Select All"}
                        </button>
                      </div>
                    </div>

                    {dailyLimit > 0 && selectedIds.size > dailyLimit && (
                      <div className="cc-over-limit-warn">
                        ⚠️ You've selected {selectedIds.size.toLocaleString()} contacts but your daily limit is {dailyLimit.toLocaleString()}.
                      </div>
                    )}

                    {cl?.fetchAll ? (
                      <div className="cc-client-loading">Loading clients...</div>
                    ) : filteredClients.length === 0 ? (
                      <div className="cc-client-empty">
                        {normalizedClients.length === 0 ? "No clients with phone numbers found." : "No clients match your search."}
                      </div>
                    ) : (
                      <div className="cc-client-list">
                        {filteredClients.map(c => {
                          const id          = String(c.id);
                          const sel         = selectedIds.has(id);
                          const wouldExceed = !sel && dailyLimit > 0 && selectedIds.size >= dailyLimit;
                          return (
                            <div
                              key={id}
                              className={`cc-client-row ${sel ? "cc-client-row--selected" : ""} ${wouldExceed ? "cc-client-row--disabled" : ""}`}
                              onClick={() => !wouldExceed && toggleClient(id)}
                            >
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
                      <div className="cc-selected-summary">
                        ✅ {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""} selected
                        {dailyLimit > 0 && (
                          <span className={`cc-selected-limit ${selectedIds.size > dailyLimit ? "over" : ""}`}>
                            {" "}({dailyLimit - selectedIds.size >= 0
                              ? `${(dailyLimit - selectedIds.size).toLocaleString()} remaining`
                              : `${(selectedIds.size - dailyLimit).toLocaleString()} over limit`})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Excel upload ── */}
                {source === "excel" && (
                  <>
                    <ExcelUpload onContactsLoaded={setContacts} />
                    {contacts.length > 0 && dailyLimit > 0 && contacts.length > dailyLimit && (
                      <div className="cc-over-limit-warn">
                        🚫 Your Excel has {contacts.length.toLocaleString()} contacts but your daily limit is {dailyLimit.toLocaleString()}.
                      </div>
                    )}
                  </>
                )}

                {/* ── Smart Filter ── */}
                {source === "filter" && (
                  <div className="cc-smart-filter">

                    <div className="cc-sf-header">
                      <div>
                        <div className="cc-sf-title">Smart Filter</div>
                        <div className="cc-sf-sub">Filter your salon clients and load them as campaign contacts</div>
                      </div>
                      {hasAnyFilter && (
                        <button className="cc-sf-reset" onClick={() => {
                          setSmartFilter(EMPTY_FILTER);
                          setFilterContacts([]);
                          setFilterCount(null);
                          setFilterPreviewed(false);
                        }}>
                          Reset all
                        </button>
                      )}
                    </div>

                    {/* ── Two-pane tabbed filter ── */}
                    <div className="cc-sf-panes">
                      <div className="cc-sf-tabs">
                        {FILTER_TABS.map(t => (
                          <button
                            key={t.key}
                            className={`cc-sf-tab${activeFilterTab === t.key ? " active" : ""}`}
                            onClick={() => setActiveFilterTab(t.key)}
                          >
                            <i className={`ti ${t.icon}`} aria-hidden="true" />
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="cc-sf-tab-content">

                        {activeFilterTab === "birthday" && (
                          <div className="cc-sf-row-2">
                            <div className="cc-sf-field">
                              <label className="cc-sf-label">Birth month</label>
                              <select
                                className="cc-sf-select"
                                value={smartFilter.birth_month}
                                onChange={e => upFilter("birth_month", e.target.value)}
                              >
                                <option value="">Any month</option>
                                {MONTHS.map(m => (
                                  <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="cc-sf-field">
                              <label className="cc-sf-label">Exact date (MM-DD)</label>
                              <input
                                className="cc-sf-input"
                                type="text"
                                placeholder="e.g. 05-15"
                                value={smartFilter.birth_day_month}
                                maxLength={5}
                                onChange={e => {
                                  let v = e.target.value.replace(/[^0-9-]/g, "");
                                  if (v.length === 2 && !v.includes("-")) v = v + "-";
                                  upFilter("birth_day_month", v);
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {activeFilterTab === "details" && (
                          <div className="cc-sf-field">
                            <label className="cc-sf-label">Gender</label>
                            <div className="cc-sf-checkboxes">
                              {[
                                { value: "female", label: "Female" },
                                { value: "male",   label: "Male"   },
                                { value: "other",  label: "Other"  },
                              ].map(g => (
                                <label key={g.value} className="cc-sf-checkbox-label">
                                  <input
                                    type="checkbox"
                                    className="cc-sf-checkbox"
                                    checked={smartFilter.genders.includes(g.value)}
                                    onChange={e => {
                                      const next = e.target.checked
                                        ? [...smartFilter.genders, g.value]
                                        : smartFilter.genders.filter(v => v !== g.value);
                                      upFilter("genders", next);
                                    }}
                                  />
                                  {g.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeFilterTab === "category" && (
                          <div className="cc-sf-field">
                            <label className="cc-sf-label">Service category</label>
                            {categories.length === 0 ? (
                              <p className="cc-sf-empty-note">No service categories set up yet.</p>
                            ) : (
                              <div className="cc-sf-checkboxes">
                                {categories.map(cat => (
                                  <label key={cat.id} className="cc-sf-checkbox-label">
                                    <input
                                      type="checkbox"
                                      className="cc-sf-checkbox"
                                      checked={smartFilter.service_category_ids.includes(cat.id)}
                                      onChange={() => toggleFilterCategory(cat.id)}
                                    />
                                    {cat.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {activeFilterTab === "last_visit" && (
                          <div className="cc-sf-row-2">
                            <div className="cc-sf-field">
                              <label className="cc-sf-label">From</label>
                              <input
                                type="date"
                                className="cc-sf-input"
                                value={smartFilter.last_visit_from}
                                max={smartFilter.last_visit_to || undefined}
                                onChange={e => upFilter("last_visit_from", e.target.value)}
                              />
                            </div>
                            <div className="cc-sf-field">
                              <label className="cc-sf-label">To</label>
                              <input
                                type="date"
                                className="cc-sf-input"
                                value={smartFilter.last_visit_to}
                                min={smartFilter.last_visit_from || undefined}
                                onChange={e => upFilter("last_visit_to", e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {activeFilterTab === "retention" && (
                          <div className="cc-sf-field">
                            <label className="cc-sf-label">Customer type</label>
                            <div className="cc-sf-radios">
                              {[
                                { value: "",           label: "Any" },
                                { value: "new",         label: "First-time (new) clients" },
                                { value: "repetitive",  label: "Regular (returning) clients" },
                              ].map(o => (
                                <label key={o.value} className="cc-sf-radio-label">
                                  <input
                                    type="radio"
                                    name="customer_type"
                                    checked={smartFilter.customer_type === o.value}
                                    onChange={() => upFilter("customer_type", o.value)}
                                  />
                                  {o.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeFilterTab === "spend" && (
                          <div className="cc-sf-field">
                            <label className="cc-sf-label">Total spending range (₹)</label>
                            <div className="cc-sf-row-2">
                              <input
                                type="number"
                                className="cc-sf-input"
                                placeholder="Low"
                                min={0}
                                value={smartFilter.total_spend_min}
                                onChange={e => upFilter("total_spend_min", e.target.value)}
                              />
                              <input
                                type="number"
                                className="cc-sf-input"
                                placeholder="High"
                                min={0}
                                value={smartFilter.total_spend_max}
                                onChange={e => upFilter("total_spend_max", e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {activeFilterTab === "membership" && (
                          <div className="cc-sf-field">
                            <div className="cc-sf-radios">
                              {[
                                { value: "",    label: "Any" },
                                { value: "yes", label: "Has active membership" },
                                { value: "no",  label: "No active membership" },
                              ].map(o => (
                                <label key={o.value} className="cc-sf-radio-label">
                                  <input
                                    type="radio"
                                    name="has_membership"
                                    checked={smartFilter.has_membership === o.value}
                                    onChange={() => upFilter("has_membership", o.value)}
                                  />
                                  {o.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeFilterTab === "package" && (
                          <div className="cc-sf-field">
                            <div className="cc-sf-radios">
                              {[
                                { value: "",    label: "Any" },
                                { value: "yes", label: "Has active package" },
                                { value: "no",  label: "No active package" },
                              ].map(o => (
                                <label key={o.value} className="cc-sf-radio-label">
                                  <input
                                    type="radio"
                                    name="has_package"
                                    checked={smartFilter.has_package === o.value}
                                    onChange={() => upFilter("has_package", o.value)}
                                  />
                                  {o.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Footer */}
                    <div className="cc-sf-footer">
                      <button
                        className="cc-sf-apply-btn"
                        disabled={!hasAnyFilter || filterLoading}
                        onClick={handleApplyFilter}
                      >
                        <i className="ti ti-check" aria-hidden="true" />
                        {filterLoading ? "Loading..." : "Load contacts"}
                      </button>
                      {filterPreviewed && filterCount !== null && (
                        <span className="cc-sf-result">
                          {filterCount === 0
                            ? "No clients match"
                            : <><strong>{filterContacts.length}</strong> contacts loaded</>
                          }
                        </span>
                      )}
                    </div>

                    {/* Contacts preview */}
                    {filterContacts.length > 0 && (
                      <div className="cc-sf-contacts">
                        <div className="cc-sf-contacts-title">Loaded contacts preview</div>
                        {filterContacts.slice(0, 5).map((c, i) => (
                          <div key={i} className="cc-sf-contact-row">
                            <span>{c.name || "—"}</span>
                            <span className="cc-sf-contact-phone">📱 {c.phone}</span>
                          </div>
                        ))}
                        {filterContacts.length > 5 && (
                          <div className="cc-sf-more">+{filterContacts.length - 5} more contacts</div>
                        )}
                      </div>
                    )}

                  </div>
                )}

                {errors.contacts && (
                  <span className="cc-error" style={{ marginTop: 8 }}>{errors.contacts}</span>
                )}
              </div>
            )}

            {/* ── Step 2 ── */}
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
                    <span className="cc-review-label">Contact Source</span>
                    <span className="cc-review-value">
                      {source === "salon" ? "🏪 Salon Clients" : source === "filter" ? "🎯 Smart Filter" : "📊 Excel Upload"}
                    </span>
                  </div>
                  <div className="cc-review-row">
                    <span className="cc-review-label">Total Contacts</span>
                    <span className="cc-review-value" style={{ color: isOverLimit ? "#ef4444" : "#10b981", fontWeight: 700 }}>
                      {finalContacts.length.toLocaleString()}
                      {dailyLimit > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 400, color: "#737373", marginLeft: 6 }}>
                          / {dailyLimit.toLocaleString()} limit
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="cc-review-row">
                    <span className="cc-review-label">Batch Size</span>
                    <span className="cc-review-value">{form.batchSize} per batch</span>
                  </div>
                  {scheduledAt && (
                    <div className="cc-review-row">
                      <span className="cc-review-label">Scheduled</span>
                      <span className="cc-review-value" style={{ color: "#8b5cf6" }}>
                        📅 {new Date(scheduledAt).toLocaleString("en-IN", {
                          weekday: "short", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
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
                        <div key={i} className="cc-contacts-preview-row">
                          <span>{c.name || "—"}</span>
                          <span>📱 {c.phone}</span>
                        </div>
                      ))}
                      {finalContacts.length > 5 && (
                        <div className="cc-contacts-preview-more">+{finalContacts.length - 5} more contacts</div>
                      )}
                    </div>
                  </div>
                )}

                {isOverLimit && (
                  <div className="cc-over-limit-block">
                    <span className="cc-over-limit-icon">🚫</span>
                    <div>
                      <strong>Cannot launch — contact list exceeds daily limit</strong>
                      <p>You have {finalContacts.length.toLocaleString()} contacts but your daily limit is {dailyLimit.toLocaleString()}. Go back and reduce by {(finalContacts.length - dailyLimit).toLocaleString()}.</p>
                    </div>
                  </div>
                )}

                {isNearLimit && !isOverLimit && (
                  <div className="cc-near-limit-warn">
                    ⚠️ Your contact list uses {Math.round((finalContacts.length / dailyLimit) * 100)}% of your daily limit.
                  </div>
                )}

                {!isOverLimit && (
                  scheduledAt ? (
                    <div className="cc-launch-warn cc-launch-scheduled">
                      📅 Campaign will be sent automatically on{" "}
                      <strong>{new Date(scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong>.
                      You can cancel it from Campaign History before that time.
                    </div>
                  ) : (
                    <div className="cc-launch-warn">
                      ⚠️ Once launched, messages will be sent immediately in batches. You can pause at any time.
                    </div>
                  )
                )}

                {!isOverLimit && (
                  <div className="cc-meta-info">
                    <span className="cc-meta-info-icon">💡</span>
                    <div>
                      <strong>About delivery rates</strong>
                      <p>
                        Meta limits marketing messages per user per day across all businesses.
                        Some contacts may not receive your message if they've already received
                        marketing messages from other businesses today. This shows as "Blocked"
                        in your campaign report — it's normal and not your fault.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="cc-nav">
              {step > 0 && <Button variant="ghost" onClick={() => setStep(s => s - 1)}>← Back</Button>}
              {step < 2 ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={
                    (step === 0 && templates.length > 0 && approved.length === 0) ||
                    (step === 1 && source === "excel" && dailyLimit > 0 && contacts.length > dailyLimit)
                  }
                >
                  Next →
                </Button>
              ) : (
                <Button
                  variant="success"
                  loading={launching}
                  disabled={launching || isOverLimit}
                  onClick={handleLaunch}
                >
                  {scheduledAt ? "📅 Schedule Campaign" : "🚀 Launch Campaign"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="cc-right-col">
          <div className="cc-what-is">
            <div className="cc-what-is-title">📣 What is a Blast Campaign?</div>
            <p className="cc-what-is-desc">
              A Blast Campaign lets you send a WhatsApp message to hundreds of contacts
              at once using a pre-approved template. Perfect for promotions, announcements,
              appointment reminders and offers.
            </p>
            <div className="cc-what-is-stats">
              <div className="cc-what-is-stat">
                <span className="cc-what-is-stat-icon">⚡</span>
                <span>Sends in batches so Meta doesn't flag your number</span>
              </div>
              <div className="cc-what-is-stat">
                <span className="cc-what-is-stat-icon">⏸</span>
                <span>Pause anytime from Campaign History</span>
              </div>
              <div className="cc-what-is-stat">
                <span className="cc-what-is-stat-icon">📊</span>
                <span>Track delivery, read rates per contact</span>
              </div>
              <div className="cc-what-is-stat">
                <span className="cc-what-is-stat-icon">📅</span>
                <span>Schedule for the perfect time</span>
              </div>
            </div>
          </div>

          <div className="cc-guide">
            <div className="cc-guide-title">🗺️ How to run a campaign</div>
            <div className="cc-guide-steps">
              {[
                { title: "Create a Template",  desc: "Go to Templates → design your WhatsApp message and submit for Meta approval." },
                { title: "Wait for Approval",  desc: "Meta reviews templates in minutes to hours. Sync status on the Templates page." },
                { title: "Pick Contacts",      desc: "Select from your salon clients, upload Excel, or use Smart Filter to target specific clients." },
                { title: "Launch & Track",     desc: "Launch the campaign. Track delivery and read rates in Campaign History." },
              ].map((s, i) => (
                <div key={i} className="cc-guide-step">
                  <div className="cc-guide-num">{i + 1}</div>
                  <div>
                    <div className="cc-guide-step-title">{s.title}</div>
                    <div className="cc-guide-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {dailyLimit > 0 && (
              <div className="cc-guide-limit">
                📊 Your daily limit: <strong>{dailyLimit.toLocaleString()}</strong> messages
              </div>
            )}
            <div className="cc-guide-tip">
              💡 <strong>Tip:</strong> Use UTILITY templates — they get approved faster than MARKETING ones.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}