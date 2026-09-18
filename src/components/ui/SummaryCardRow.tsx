import type { ReactNode } from "react";
import "./styles/SummaryCardRow.scss";

export interface SummaryCardItem {
  key: string;
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  sub?: string;
}

interface SummaryCardRowProps {
  items: SummaryCardItem[];
  className?: string;
}

/** One reusable summary-card strip — same look everywhere it's used (icon
 *  optional, matching the Reports pages' plain value/label cards when
 *  omitted). Backed by SummaryCardRow.scss instead of per-page inline
 *  styles, so every consumer stays visually identical by construction. */
export default function SummaryCardRow({ items, className = "" }: SummaryCardRowProps) {
  return (
    <div className={`ui-summary-row ${className}`.trim()}>
      {items.map((item) => (
        <div className="ui-summary-card" key={item.key}>
          {item.icon && <div className="ui-summary-card__icon">{item.icon}</div>}
          <div className="ui-summary-card__val">{item.value}</div>
          <div className="ui-summary-card__label">{item.label}</div>
          {item.sub && <div className="ui-summary-card__sub">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
