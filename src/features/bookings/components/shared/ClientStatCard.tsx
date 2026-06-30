import React from "react";
import { currencySymbol } from "../../utils/currency";
import type { ClientStats } from "../../types";

interface Props {
  name: string;
  phone: string;
  address?: string;
  stats: ClientStats;
  /** Called when user clicks "View History" */
  onViewHistory?: () => void;
  /** Navigate to client history page */
  historyUrl?: string;
}

const STAT_ROWS: Array<{
  label: string;
  key: keyof ClientStats;
  format?: (v: any) => string;
  danger?: (v: any) => boolean;
  info?: boolean;
  hideWhen?: (v: any) => boolean;
}> = [
  { label: "Reward Points", key: "rewardPoints" },
  { label: "Ewallet Amt",   key: "ewalletAmt",   format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}` },
  { label: "Unpaid Amt",    key: "unpaidAmt",     format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}`,  danger: (v) => v > 0 },
  { label: "Assign Discount", key: "assignDiscount", format: (v) => `${v}%` },
  { label: "Disc. Validity", key: "discountValidity" },
  { label: "Membership",    key: "membership" },
  { label: "Cancelled",     key: "cancelled",     danger: (v) => v > 0 },
  { label: "Total Visits",  key: "totalVisit",    hideWhen: (v) => !v || Number(v) === 0 },
  { label: "Last Visit",    key: "lastVisit",     hideWhen: (v) => !v || v === "N/A" },
  { label: "Total Revenue", key: "totalRevenue",  format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}`, info: true, hideWhen: (v) => !v || Number(v) === 0 },
];

export const ClientStatCard: React.FC<Props> = ({
  name, phone, address, stats, onViewHistory, historyUrl,
}) => {
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="client-stats-panel mt-3">
      {/* Header */}
      <div className="client-stats-panel__header">
        <div className="avatar">{initial}</div>
        <div className="info">
          <div className="name">{name}</div>
          <div className="sub">{phone}{address && address !== "N/A" ? ` · ${address}` : ""}</div>
        </div>
        {stats.membership !== "NA" && (
          <span className="badge badge-warning" style={{ fontSize: 11 }}>
            ★ {stats.membership}
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="client-stats-panel__grid">
        {STAT_ROWS.map(({ label, key, format, danger, info, hideWhen }) => {
          const raw = stats[key];
          if (hideWhen && hideWhen(raw)) return null;
          const display = format ? format(raw) : String(raw ?? "N/A");
          const isDanger = danger ? danger(raw) : false;
          return (
            <div key={label} className={`info-cell${isDanger ? " danger" : info ? " info" : ""}`}>
              <span className="info-cell__label">{label}</span>
              <span className="info-cell__value">{display}</span>
            </div>
          );
        })}

        {/* Visit History */}
        {(onViewHistory || historyUrl) && (
          <div className="info-cell info-cell--history-btn">
            {onViewHistory ? (
              <button type="button" onClick={onViewHistory} className="btn-view-history">
                View History
              </button>
            ) : (
              <a href={historyUrl} rel="noreferrer" className="btn-view-history">
                View History
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientStatCard;
