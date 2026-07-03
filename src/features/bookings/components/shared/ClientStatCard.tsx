import React, { useState } from "react";
import { currencySymbol } from "../../utils/currency";
import type { ClientStats } from "../../types";
import type { ClientPackage } from "../../../../services/api/endpoints/packages.endpoints";
import type { ClientMembership } from "../../../../services/api/endpoints/clientMemberships.endpoints";
import { PackageInfoModal } from "./PackageInfoModal";
import { MembershipInfoModal } from "./MembershipInfoModal";

interface Props {
  name: string;
  phone: string;
  address?: string;
  stats: ClientStats;
  packages?: ClientPackage[];
  memberships?: ClientMembership[];
  onViewHistory?: () => void;
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
  { label: "Reward Points",   key: "rewardPoints" },
  { label: "Ewallet Amt",     key: "ewalletAmt",     format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}` },
  { label: "Unpaid Amt",      key: "unpaidAmt",       format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}`, danger: (v) => v > 0 },
  { label: "Assign Discount", key: "assignDiscount",  format: (v) => `${v}%` },
  { label: "Disc. Validity",  key: "discountValidity" },
  { label: "Cancelled",       key: "cancelled",       danger: (v) => v > 0 },
  { label: "Total Visits",    key: "totalVisit",      hideWhen: (v) => !v || Number(v) === 0 },
  { label: "Last Visit",      key: "lastVisit",       hideWhen: (v) => !v || v === "N/A" },
  { label: "Total Revenue",   key: "totalRevenue",    format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}`, info: true, hideWhen: (v) => !v || Number(v) === 0 },
];

function fmtExpiry(date: string | null | undefined): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch { return date; }
}

export const ClientStatCard: React.FC<Props> = ({
  name, phone, address, stats, packages = [], memberships = [], onViewHistory, historyUrl,
}) => {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [showMemModal, setShowMemModal] = useState(false);

  const activePackages = packages.filter((p) => p.status === "Active");
  const firstPkg = activePackages[0];

  const activeMemberships = memberships.filter((m) => m.status === "active");
  const firstMembership = activeMemberships[0];

  return (
    <>
      <div className="client-stats-panel mt-3">
        {/* Header */}
        <div className="client-stats-panel__header">
          <div className="avatar">{initial}</div>
          <div className="info">
            <div className="name">{name}</div>
            <div className="sub">{phone}{address && address !== "N/A" ? ` · ${address}` : ""}</div>
          </div>
          {stats.membership !== "NA" && (
            <span className="badge badge-warning ms-auto" style={{ fontSize: 11 }}>
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

          {/* Package cell — shown only when client has active packages */}
          {firstPkg && (
            <div className="info-cell info">
              <span className="info-cell__label">
                Package{activePackages.length > 1 ? ` (${activePackages.length})` : ""}
              </span>
              <span className="info-cell__value pkg-cell__value">
                <span className="pkg-cell__name">
                  {firstPkg.packageName}
                  {fmtExpiry(firstPkg.expiryDate) ? `/${fmtExpiry(firstPkg.expiryDate)}` : ""}
                </span>
                <button
                  type="button"
                  className="pkg-info-btn"
                  title="View package details"
                  onClick={() => setShowPkgModal(true)}
                >
                  ℹ
                </button>
              </span>
            </div>
          )}

          {/* Membership cell — shown only when client has active memberships */}
          {firstMembership && (
            <div className="info-cell info">
              <span className="info-cell__label">
                Membership{activeMemberships.length > 1 ? ` (${activeMemberships.length})` : ""}
              </span>
              <span className="info-cell__value pkg-cell__value">
                <span className="pkg-cell__name">
                  {firstMembership.membershipName}
                  {fmtExpiry(firstMembership.expiresAt) ? `/${fmtExpiry(firstMembership.expiresAt)}` : ""}
                </span>
                <button
                  type="button"
                  className="pkg-info-btn"
                  title="View membership details"
                  onClick={() => setShowMemModal(true)}
                >
                  ℹ
                </button>
              </span>
            </div>
          )}

          {/* View History */}
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

      {showPkgModal && activePackages.length > 0 && (
        <PackageInfoModal
          clientName={name}
          packages={activePackages}
          onClose={() => setShowPkgModal(false)}
        />
      )}

      {showMemModal && activeMemberships.length > 0 && (
        <MembershipInfoModal
          clientName={name}
          memberships={activeMemberships}
          onClose={() => setShowMemModal(false)}
        />
      )}
    </>
  );
};

export default ClientStatCard;
