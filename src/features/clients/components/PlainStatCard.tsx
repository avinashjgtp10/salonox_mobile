import React from "react";

interface PlainStatCardProps {
  label: string;
  value: string | number;
  /** Optional secondary line under the label — e.g. a count or status detail
   *  ("4 services used", "Active · expires 12 Sep 2026"). */
  sub?: string | number | null;
}

/** Minimal white-card KPI tile matching the Reports pages' summary cards
 *  (.rp-sra-summary-card) — used across Client History instead of the
 *  colorful gradient StatCard used elsewhere in the app. */
const PlainStatCard: React.FC<PlainStatCardProps> = ({ label, value, sub }) => (
  <div className="chp-stat-card">
    <div className="chp-stat-card__value">{value}</div>
    <div className="chp-stat-card__label">{label}</div>
    {sub != null && sub !== "" && <div className="chp-stat-card__sub">{sub}</div>}
  </div>
);

export default PlainStatCard;
