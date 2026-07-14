import { ThreeDots, Pencil, Trash, ToggleOn } from "react-bootstrap-icons";
import { useEffect, useRef, useState } from "react";
import type { RuleGroup } from "../../types/commissionRules.types";
import { SOURCE_META, FREQUENCY_LABELS, fmtMoney } from "./commissionRuleMeta";
import "../../styles/RuleCard.scss";

interface RuleCardProps {
  group: RuleGroup;
  staffNames: string[];
  onOpenDetail: (group: RuleGroup) => void;
  onEdit: (group: RuleGroup) => void;
  onDelete: (group: RuleGroup) => void;
  onToggleStatus: (group: RuleGroup) => void;
  toggling: boolean;
}

export default function RuleCard({ group, staffNames, onOpenDetail, onEdit, onDelete, onToggleStatus, toggling }: RuleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const rule = group.primary;
  const source = SOURCE_META[rule.source];

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const scopeSummary =
    rule.scope_type === "salon" ? "Entire Salon"
    : rule.scope_type === "role" ? (rule.scope_id ?? "Role")
    : staffNames.length === 0 ? "Staff member"
    : staffNames.length === 1 ? staffNames[0]
    : `${staffNames.length} staff`;

  return (
    <div className="rc-card" onClick={() => onOpenDetail(group)}>
      <div className="rc-card__top">
        <div className="rc-card__icon" style={{ "--icon-bg": source.bg, "--icon-color": source.color } as React.CSSProperties}>
          {source.icon}
        </div>
        <div className="rc-card__top-info">
          <div className="rc-card__name">{rule.name}</div>
          <span className={`rc-status rc-status--${rule.status}`}>{rule.status}</span>
        </div>
        <div className="rc-card__menu-wrap" ref={menuWrapRef} onClick={(e) => e.stopPropagation()}>
          <button className="rc-card__menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <ThreeDots size={15} />
          </button>
          {menuOpen && (
            <div className="rc-card__menu">
              <button onClick={() => { onEdit(group); setMenuOpen(false); }}>
                <Pencil size={12} /> Edit
              </button>
              <button disabled={toggling} onClick={() => { onToggleStatus(group); setMenuOpen(false); }}>
                <ToggleOn size={12} /> {rule.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <button className="rc-card__menu-danger" onClick={() => { onDelete(group); setMenuOpen(false); }}>
                <Trash size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rc-card__value">
        {rule.type === "percentage" && <span>{Number(rule.rate)}%</span>}
        {(rule.type === "fixed" || rule.type === "milestone") && <span>{fmtMoney(Number(rule.rate))}</span>}
      </div>

      {rule.condition_target != null && rule.condition_metric && (
        <div className="rc-card__condition">
          when {rule.condition_metric === "revenue" ? "revenue" : "count"} reaches{" "}
          <strong>{rule.condition_metric === "revenue" ? fmtMoney(rule.condition_target) : rule.condition_target}</strong>
        </div>
      )}

      <div className="rc-card__chips">
        <span className="rc-chip">{source.label}</span>
        <span className="rc-chip">{FREQUENCY_LABELS[rule.frequency]}</span>
        <span className="rc-chip rc-chip--scope">{scopeSummary}</span>
      </div>
    </div>
  );
}
