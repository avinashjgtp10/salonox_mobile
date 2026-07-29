import { useRef, useState } from "react";
import { X } from "react-bootstrap-icons";
import type {
  CommissionRule, CommissionRuleFormData, CommissionRuleSource, CommissionRuleType,
  CommissionFrequency, CommissionRuleStatus,
} from "../../types/commissionRules.types";
import { SOURCE_META } from "./commissionRuleMeta";
import { useCurrency } from "../../../../hooks/useCurrency";
import "../../styles/RuleWizard.scss";

interface StaffOption {
  id: string;
  name: string;
}

interface RuleWizardProps {
  staffOptions: StaffOption[];
  staffLoading?: boolean;
  editing?: CommissionRule | null;
  /** All staff currently in the group being edited (a group may span multiple
   *  staff-scoped rows) — falls back to editing.scope_id alone when omitted. */
  initialStaffIds?: string[];
  onClose: () => void;
  onSave: (data: CommissionRuleFormData) => Promise<void>;
}

const SOURCES: CommissionRuleSource[] = ["services", "products", "memberships", "packages"];
const TYPE_OPTIONS: { key: CommissionRuleType; label: string }[] = [
  { key: "percentage", label: "Percentage" },
  { key: "fixed", label: "Fixed Amount" },
  { key: "milestone", label: "Milestone Bonus" },
];
const TYPE_FIELD_LABEL: Record<CommissionRuleType, string> = {
  percentage: "Commission",
  fixed: "Amount",
  milestone: "Reward",
};
const FREQUENCY_OPTIONS: CommissionFrequency[] = ["daily", "monthly"];
const FREQUENCY_LABELS: Record<CommissionFrequency, string> = { daily: "Daily", weekly: "Weekly", biweekly: "Bi-Weekly", monthly: "Monthly", custom: "Custom Date" };

export default function RuleWizard({ staffOptions, staffLoading, editing, initialStaffIds, onClose, onSave }: RuleWizardProps) {
  const { currencySymbol } = useCurrency();
  const [savingStatus, setSavingStatus] = useState<CommissionRuleStatus | null>(null);
  const [attempted, setAttempted] = useState(false);
  // Synchronous guard — React's `disabled` state can't stop a second click that
  // lands in the same tick as the first (e.g. a fast double-click before re-render).
  const isSubmittingRef = useRef(false);

  const [name, setName] = useState(editing?.name ?? "");
  const [source, setSource] = useState<CommissionRuleSource>(editing?.source ?? "services");
  const [type, setType] = useState<CommissionRuleType>(editing?.type ?? "percentage");
  const [rate, setRate] = useState(editing?.rate != null ? String(editing.rate) : "");

  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(
    initialStaffIds && initialStaffIds.length > 0
      ? initialStaffIds
      : editing?.scope_type === "staff" && editing.scope_id ? [editing.scope_id] : []
  );

  const [conditionTarget, setConditionTarget] = useState(editing?.condition_target != null ? String(editing.condition_target) : "");

  const [frequency, setFrequency] = useState<CommissionFrequency>(editing?.frequency ?? "monthly");

  const toggleStaff = (id: string) =>
    setSelectedStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredStaff = staffOptions.filter((s) => s.name.toLowerCase().includes(staffSearch.toLowerCase()));

  const isNameInvalid = attempted && !name.trim();
  const isRateInvalid = attempted && !(Number(rate) > 0);
  const isScopeInvalid = attempted && selectedStaffIds.length === 0;
  const isConditionInvalid = attempted && type === "milestone" && !(Number(conditionTarget) > 0);

  const buildPayload = (finalStatus: CommissionRuleStatus): CommissionRuleFormData | null => {
    if (!name.trim() || !(Number(rate) > 0) || selectedStaffIds.length === 0 ||
      (type === "milestone" && !(Number(conditionTarget) > 0))) {
      return null;
    }

    const data: CommissionRuleFormData = {
      name: name.trim(),
      source,
      type,
      rate: Number(rate),
      frequency,
      scope_type: "staff",
      status: finalStatus,
    };

    if (selectedStaffIds.length === 1) data.scope_id = selectedStaffIds[0];
    else data.scope_ids = selectedStaffIds;

    if (conditionTarget.trim()) {
      data.condition_target = Number(conditionTarget);
      data.condition_metric = "revenue";
    }

    return data;
  };

  const handleSubmit = async (finalStatus: CommissionRuleStatus) => {
    setAttempted(true);
    const data = buildPayload(finalStatus);
    if (!data) return;

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setSavingStatus(finalStatus);
    try {
      await onSave(data);
    } finally {
      setSavingStatus(null);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="rw-overlay" onClick={onClose}>
      <div className="rw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rw-header">
          <h3>{editing ? "Edit Commission Rule" : "New Commission Rule"}</h3>
          <button className="rw-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="rw-body">
          {/* Rule name */}
          <div className="rw-field">
            <label className="rw-field-label">Rule name</label>
            <input
              className={`rw-name-input ${isNameInvalid ? "rw-invalid" : ""}`}
              placeholder="e.g. Hair Color Commission"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {isNameInvalid && <span className="rw-error">Name is required</span>}
          </div>

          {/* Source */}
          <div className="rw-field">
            <label className="rw-field-label">Source</label>
            <div className="rw-radio-grid">
              {SOURCES.map((s) => (
                <label key={s} className={`rw-radio-card ${source === s ? "active" : ""}`}>
                  <input type="radio" name="source" checked={source === s} onChange={() => setSource(s)} />
                  {SOURCE_META[s].label}
                </label>
              ))}
            </div>
          </div>

          {/* Commission type */}
          <div className="rw-field">
            <label className="rw-field-label">Commission type</label>
            <div className="rw-radio-list">
              {TYPE_OPTIONS.map((t) => (
                <label key={t.key} className={`rw-radio-row ${type === t.key ? "active" : ""}`}>
                  <input type="radio" name="type" checked={type === t.key} onChange={() => setType(t.key)} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Type-specific rate/amount/reward field */}
          <div className="rw-field">
            <label className="rw-field-label">{TYPE_FIELD_LABEL[type]}</label>
            <div className={`rw-rate-input-wrap ${isRateInvalid ? "rw-invalid" : ""}`}>
              <span className="rw-rate-prefix">{type === "percentage" ? "%" : currencySymbol}</span>
              <input
                type="number"
                min={0}
                className="rw-rate-input"
                placeholder={type === "percentage" ? "e.g. 10" : type === "fixed" ? "e.g. 100" : "e.g. 200"}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            {isRateInvalid && <span className="rw-error">Enter a value greater than 0</span>}
          </div>

          {/* Condition */}
          <div className="rw-field">
            <label className="rw-field-label">
              Condition {type !== "milestone" && <span className="rw-optional">(optional — leave blank to always apply)</span>}
            </label>
            <div className="rw-condition-sentence">
              <span>They will receive</span>
              <strong className="rw-condition-value">
                {rate ? (type === "percentage" ? `${rate}%` : `${currencySymbol}${rate}`) : "—"}
              </strong>
              <span>when they generate</span>
              <div className={`rw-condition-input-wrap ${isConditionInvalid ? "rw-invalid" : ""}`}>
                <span>{currencySymbol}</span>
                <input
                  type="number" min={0}
                  placeholder="e.g. 20000"
                  value={conditionTarget}
                  onChange={(e) => setConditionTarget(e.target.value)}
                />
              </div>
            </div>
            {isConditionInvalid && <span className="rw-error">Milestone rules need a target amount</span>}
          </div>

          {/* Who receives this commission */}
          <div className="rw-field">
            <label className="rw-field-label">
              Who receives this commission?
              {selectedStaffIds.length > 0 && <span className="rw-optional"> — {selectedStaffIds.length} selected</span>}
            </label>
            <input
              className="rw-select"
              placeholder="Search staff…"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
            <div className={`rw-staff-list ${isScopeInvalid ? "rw-invalid" : ""}`}>
              {staffLoading ? (
                <p className="rw-scope-empty">Loading staff…</p>
              ) : filteredStaff.length === 0 ? (
                <p className="rw-scope-empty">No staff found</p>
              ) : (
                filteredStaff.map((s) => (
                  <label key={s.id} className="rw-staff-row">
                    <input type="checkbox" checked={selectedStaffIds.includes(s.id)} onChange={() => toggleStaff(s.id)} />
                    {s.name}
                  </label>
                ))
              )}
            </div>
            {isScopeInvalid && <span className="rw-error">Pick at least one staff member</span>}
          </div>

          {/* Payout frequency */}
          <div className="rw-field">
            <label className="rw-field-label">Payout frequency</label>
            <div className="rw-radio-grid rw-radio-grid--2col">
              {FREQUENCY_OPTIONS.map((f) => (
                <label key={f} className={`rw-radio-card ${frequency === f ? "active" : ""}`}>
                  <input type="radio" name="frequency" checked={frequency === f} onChange={() => setFrequency(f)} />
                  {FREQUENCY_LABELS[f]}
                </label>
              ))}
            </div>
          </div>

        </div>

        <div className="rw-footer">
          <button className="rw-btn rw-btn--ghost" onClick={onClose} disabled={savingStatus !== null}>Cancel</button>
          <button className="rw-btn rw-btn--secondary" onClick={() => handleSubmit("draft")} disabled={savingStatus !== null}>
            {savingStatus === "draft" ? "Saving…" : "Save Draft"}
          </button>
          <button className="rw-btn rw-btn--primary" onClick={() => handleSubmit("active")} disabled={savingStatus !== null}>
            {savingStatus === "active" ? "Saving…" : editing ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
