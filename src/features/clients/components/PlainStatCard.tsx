import React from "react";

interface PlainStatCardProps {
  label: string;
  value: string | number;
}

/** Minimal white-card KPI tile matching the Reports pages' summary cards
 *  (.rp-sra-summary-card) — used across Client History instead of the
 *  colorful gradient StatCard used elsewhere in the app. */
const PlainStatCard: React.FC<PlainStatCardProps> = ({ label, value }) => (
  <div className="chp-stat-card">
    <div className="chp-stat-card__value">{value}</div>
    <div className="chp-stat-card__label">{label}</div>
  </div>
);

export default PlainStatCard;
