import { useEffect, useState } from "react";
import { X, Pencil, Trash, ToggleOn, People } from "react-bootstrap-icons";
import type { RuleGroup, TieredTargetProgress } from "../../types/commissionRules.types";
import { SOURCE_META, FREQUENCY_LABELS } from "./commissionRuleMeta";
import { useCurrency } from "../../../../hooks/useCurrency";
import api from "../../../../services/api/axios";
import { COMMISSION_RULES } from "../../../../services/api/endpoints";
import "../../styles/RuleDetailModal.scss";

/** One staff member's monthly target progress — fetched on demand since it
 *  reflects the current, ever-changing month rather than the rule row itself. */
function TargetProgressRow({ ruleId, staffName }: { ruleId: string; staffName: string }) {
  const { formatAmount: fmtMoney } = useCurrency();
  const [progress, setProgress] = useState<TieredTargetProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get(COMMISSION_RULES.PROGRESS(ruleId))
      .then((res) => { if (!cancelled) setProgress(res.data.data); })
      .catch(() => { if (!cancelled) setProgress(null); });
    return () => { cancelled = true; };
  }, [ruleId]);

  if (!progress) return null;

  return (
    <div className="rdm-progress">
      <div className="rdm-progress__head">
        <span className="rdm-progress__staff">{staffName}</span>
        <span className="rdm-progress__pct">{progress.progressPct}%</span>
      </div>
      <div className="rdm-progress__bar">
        <div
          className={`rdm-progress__fill ${progress.targetReached ? "rdm-progress__fill--done" : ""}`}
          style={{ width: `${progress.progressPct}%` }}
        />
      </div>
      <div className="rdm-progress__stats">
        <span>Achieved: <strong>{fmtMoney(progress.achieved)}</strong></span>
        <span>Target: <strong>{fmtMoney(progress.target)}</strong></span>
        <span>Remaining: <strong>{fmtMoney(progress.remaining)}</strong></span>
      </div>
    </div>
  );
}

interface RuleDetailModalProps {
  group: RuleGroup;
  staffNames: string[];
  onClose: () => void;
  onEdit: (group: RuleGroup) => void;
  onDelete: (group: RuleGroup) => void;
  onToggleStatus: (group: RuleGroup) => void;
  toggling: boolean;
}

export default function RuleDetailModal({ group, staffNames, onClose, onEdit, onDelete, onToggleStatus, toggling }: RuleDetailModalProps) {
  const { formatAmount: fmtMoney } = useCurrency();
  const rule = group.primary;
  const source = SOURCE_META[rule.source];

  const scopeLine =
    rule.scope_type === "salon" ? "Entire Salon"
    : rule.scope_type === "role" ? `Staff Role: ${rule.scope_id}`
    : null;

  return (
    <div className="rdm-overlay" onClick={onClose}>
      <div className="rdm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rdm-header">
          <div className="rdm-header__icon" style={{ "--icon-bg": source.bg, "--icon-color": source.color } as React.CSSProperties}>
            {source.icon}
          </div>
          <div className="rdm-header__info">
            <h3>{rule.name}</h3>
            <span className={`rdm-status rdm-status--${rule.status}`}>{rule.status}</span>
          </div>
          <button className="rdm-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="rdm-body">
          <div className="rdm-value">
            {rule.type === "percentage" && <span>{Number(rule.rate)}%</span>}
            {(rule.type === "fixed" || rule.type === "milestone") && <span>{fmtMoney(Number(rule.rate))}</span>}
            {rule.type === "tiered_target" && <span>{Number(rule.rate)}% → {Number(rule.rate_after_target)}%</span>}
          </div>

          <div className="rdm-rows">
            <div className="rdm-row"><span>Source</span><strong>{source.label}</strong></div>
            <div className="rdm-row"><span>Frequency</span><strong>{FREQUENCY_LABELS[rule.frequency]}</strong></div>
            {rule.type === "tiered_target" && rule.condition_target != null && (
              <div className="rdm-row">
                <span>Monthly Target</span>
                <strong>{fmtMoney(rule.condition_target)}</strong>
              </div>
            )}
            {rule.type !== "tiered_target" && rule.condition_target != null && rule.condition_metric && (
              <div className="rdm-row">
                <span>Condition</span>
                <strong>
                  when {rule.condition_metric === "revenue" ? "revenue" : "count"} reaches{" "}
                  {rule.condition_metric === "revenue" ? fmtMoney(rule.condition_target) : rule.condition_target}
                </strong>
              </div>
            )}
          </div>

          {rule.type === "tiered_target" && (
            <div className="rdm-progress-section">
              <p className="rdm-staff-title">Target Progress</p>
              {group.rules.map((r, i) => (
                <TargetProgressRow key={r.id} ruleId={r.id} staffName={staffNames[i] ?? "Staff member"} />
              ))}
            </div>
          )}

          <div className="rdm-staff-section">
            <p className="rdm-staff-title"><People size={14} /> {scopeLine ?? `${staffNames.length} staff member${staffNames.length !== 1 ? "s" : ""}`}</p>
            {!scopeLine && (
              <div className="rdm-staff-list">
                {staffNames.map((name) => (
                  <span key={name} className="rdm-staff-chip">{name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rdm-footer">
          <button className="rdm-btn rdm-btn--danger" onClick={() => onDelete(group)}>
            <Trash size={13} /> Delete
          </button>
          <button className="rdm-btn rdm-btn--ghost" disabled={toggling} onClick={() => onToggleStatus(group)}>
            <ToggleOn size={13} /> {rule.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <button className="rdm-btn rdm-btn--primary" onClick={() => onEdit(group)}>
            <Pencil size={13} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}
