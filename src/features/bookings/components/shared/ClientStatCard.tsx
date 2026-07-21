import React, { useEffect, useRef, useState } from "react";
import { currencySymbol } from "../../utils/currency";
import type { ClientStats } from "../../types";
import type { ClientPackage } from "../../../../services/api/endpoints/packages.endpoints";
import type { ClientMembership } from "../../../../services/api/endpoints/clientMemberships.endpoints";
import Skeleton from "../../../../components/ui/Skeleton";
import { getPackageExpiryStatus, getExpiryStatus } from "../../utils/packageStatus";

interface Props {
  name: string;
  phone: string;
  address?: string;
  stats: ClientStats;
  packages?: ClientPackage[];
  memberships?: ClientMembership[];
  onViewHistory?: () => void;
  historyUrl?: string;
  // True while the background history/packages/memberships fetch (which is
  // what actually populates totalVisit/lastVisit/totalRevenue) is still in
  // flight — shows those 3 cells as skeleton placeholders instead of quietly
  // hiding the whole row until the number arrives.
  historyLoading?: boolean;
  // Ratio used to show the reward points' ₹ equivalent in the "ℹ" popover —
  // e.g. {redeem_points: 100, redeem_value: 50} means 100 pts = ₹50. Omit to
  // hide the info button entirely.
  rewardPointsConfig?: { redeem_points: number; redeem_value: number };
}

// Fields sourced from the slower "Phase 2" background fetch (useClientDetails.ts)
// rather than the fast initial profile fetch — these are the ones that get a
// skeleton placeholder while historyLoading is true. (totalRevenue is also a
// Phase 2 field but lives in the second row now, handled separately below.)
const HISTORY_KEYS = new Set<keyof ClientStats>(["totalVisit", "lastVisit"]);

const STAT_ROWS: Array<{
  label: string;
  key: keyof ClientStats;
  format?: (v: any) => string;
  danger?: (v: any) => boolean;
  info?: boolean;
  hideWhen?: (v: any) => boolean;
}> = [
  { label: "E-Wallet",      key: "ewalletAmt",      format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}` },
  { label: "Unpaid",        key: "unpaidAmt",        format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}`, danger: (v) => v > 0 },
  { label: "Reward",        key: "rewardPoints",     format: (v) => `${Number(v).toLocaleString("en-IN")} pts` },
  { label: "Referral",      key: "referralBalance",  format: (v) => `${currencySymbol}${Number(v).toLocaleString("en-IN")}` },
  { label: "Visits",        key: "totalVisit",       hideWhen: (v) => !v || Number(v) === 0 },
  { label: "Last Visit",    key: "lastVisit",        hideWhen: (v) => !v || v === "N/A" },
  { label: "Cancelled",     key: "cancelled",        danger: (v) => v > 0 },
];

function fmtExpiry(date: string | null | undefined): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch { return date; }
}

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return "N/A";
  try {
    return new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return raw; }
}

// Hover shows the popover as a quick preview; clicking "pins" it open so it
// survives the mouse leaving (needed on touch devices, and lets you read a
// long package/membership list without the mouse hovering the exact spot).
// Outside click un-pins and closes it.
function usePopover() {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = hovered || pinned;

  useEffect(() => {
    if (!pinned) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [pinned]);

  return {
    ref,
    visible,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    toggle: () => setPinned((p) => !p),
  };
}

export const ClientStatCard: React.FC<Props> = ({
  name, phone, address, stats, packages = [], memberships = [], onViewHistory, historyUrl,
  historyLoading = false, rewardPointsConfig,
}) => {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const rewardPopover = usePopover();
  const pkgPopover = usePopover();
  const memPopover = usePopover();

  const rewardMoneyValue = rewardPointsConfig && rewardPointsConfig.redeem_points > 0
    ? (Number(stats.rewardPoints) / rewardPointsConfig.redeem_points) * rewardPointsConfig.redeem_value
    : 0;

  // "Active" per the backend status, but also not past its own expiry date —
  // a package sitting on a stale "Active" status server-side must still stop
  // being offered as usable once its expiry date has passed.
  const activePackages = packages.filter((p) => p.status === "Active" && getPackageExpiryStatus(p.expiryDate) !== "expired");
  const firstPkg = activePackages[0];

  // "active" per the backend status, but also not past its own expiry date —
  // same guard as packages above.
  const activeMemberships = memberships.filter((m) => m.status === "active" && getExpiryStatus(m.expiresAt) !== "expired");
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
            // Pure eWallet balance only — membership wallet has its own
            // dedicated "Membership" cell below, and this must match the
            // eWallet figure shown in the Add Appointment benefits card, which
            // is also eWallet-only (membership is a separate benefit there too).
            const raw = stats[key];
            const isHistoryField = HISTORY_KEYS.has(key);
            if (isHistoryField && historyLoading) {
              return (
                <div key={label} className={`info-cell${info ? " info" : ""}`}>
                  <span className="info-cell__label">{label}</span>
                  <Skeleton width={48} height={14} style={{ marginTop: 3 }} />
                </div>
              );
            }
            if (hideWhen && hideWhen(raw)) return null;
            const display = format ? format(raw) : String(raw ?? "N/A");
            const isDanger = danger ? danger(raw) : false;
            const isReward = key === "rewardPoints";
            return (
              <div
                key={label}
                className={`info-cell${isDanger ? " danger" : info ? " info" : ""}`}
                ref={isReward ? rewardPopover.ref : undefined}
              >
                <span className="info-cell__label">{label}</span>
                <span className="info-cell__value">
                  {display}
                  {isReward && rewardPointsConfig && (
                    <button
                      type="button"
                      className="pkg-info-btn reward-info-btn"
                      title="View ₹ value"
                      onMouseEnter={rewardPopover.onMouseEnter}
                      onMouseLeave={rewardPopover.onMouseLeave}
                      onClick={rewardPopover.toggle}
                    >
                      ℹ
                    </button>
                  )}
                </span>
                {isReward && rewardPopover.visible && (
                  <div className="info-popover">
                    ≈ {currencySymbol}{rewardMoneyValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* Second row: Total Revenue, Package, Membership, View History */}
        <div className="client-stats-panel__grid client-stats-panel__grid--second-row">
          {/* Total Revenue cell */}
          {historyLoading ? (
            <div className="info-cell info">
              <span className="info-cell__label">Total Revenue</span>
              <Skeleton width={48} height={14} style={{ marginTop: 3 }} />
            </div>
          ) : Number(stats.totalRevenue) > 0 ? (
            <div className="info-cell info">
              <span className="info-cell__label">Total Revenue</span>
              <span className="info-cell__value">
                {currencySymbol}{Number(stats.totalRevenue).toLocaleString("en-IN")}
              </span>
            </div>
          ) : null}

          {/* Package cell */}
          <div className="info-cell info" ref={pkgPopover.ref}>
            <span className="info-cell__label">
              Package{activePackages.length > 1 ? ` (${activePackages.length})` : ""}
            </span>
            {firstPkg ? (
              <span className="info-cell__value pkg-cell__value">
                <span className="pkg-cell__name">
                  {firstPkg.packageName}
                  {fmtExpiry(firstPkg.expiryDate) ? `/${fmtExpiry(firstPkg.expiryDate)}` : ""}
                </span>
                <button
                  type="button"
                  className="pkg-info-btn"
                  title="View package details"
                  onMouseEnter={pkgPopover.onMouseEnter}
                  onMouseLeave={pkgPopover.onMouseLeave}
                  onClick={pkgPopover.toggle}
                >
                  ℹ
                </button>
              </span>
            ) : (
              <span className="info-cell__value">N/A</span>
            )}
            {pkgPopover.visible && activePackages.length > 0 && (
              <div className="info-popover info-popover--wide">
                <div className="pkg-modal__cards">
                  {activePackages.map((pkg) => {
                    const totalSessions = pkg.services.reduce((s, svc) => s + svc.totalSessions, 0);
                    const usedSessions  = pkg.services.reduce((s, svc) => s + svc.completedSessions, 0);
                    const expiryStatus = getPackageExpiryStatus(pkg.expiryDate);
                    return (
                      <div key={pkg.id} className="pkg-card">
                        <div className="pkg-card__row">
                          <span className="pkg-card__lbl">Active Package:</span>
                          <span className="pkg-card__val">{pkg.packageName}</span>
                        </div>
                        <div className="pkg-card__row">
                          <span className="pkg-card__lbl">Purchase Date:</span>
                          <span className="pkg-card__val">{fmtDate(pkg.createdDate)}</span>
                        </div>
                        <div className="pkg-card__row">
                          <span className="pkg-card__lbl">Expiry Date:</span>
                          <span className="pkg-card__val">{fmtDate(pkg.expiryDate)}</span>
                        </div>
                        <div className="pkg-card__row">
                          <span className="pkg-card__lbl">Status:</span>
                          <span className={`pkg-card__status-badge pkg-card__status-badge--${expiryStatus}`}>
                            {expiryStatus === "expiring-soon" ? "Expiring Soon" : expiryStatus.charAt(0).toUpperCase() + expiryStatus.slice(1)}
                          </span>
                        </div>
                        <div className="pkg-card__row">
                          <span className="pkg-card__lbl">Sessions:</span>
                          <span className="pkg-card__val">{usedSessions} used / {totalSessions} total</span>
                        </div>
                        <div className="pkg-card__svc-title">Services</div>
                        <table className="pkg-card__svc-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Avl</th>
                              <th>Usage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pkg.services.map((svc) => (
                              <tr key={svc.serviceId}>
                                <td>- {svc.serviceName}</td>
                                <td className={svc.remainingSessions === 0 ? "pkg-card__svc-done" : "pkg-card__svc-avl"}>
                                  {svc.remainingSessions}
                                </td>
                                <td>{svc.completedSessions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Membership cell */}
          <div className="info-cell info" ref={memPopover.ref}>
            <span className="info-cell__label">
              Membership{activeMemberships.length > 1 ? ` (${activeMemberships.length})` : ""}
            </span>
            {firstMembership ? (
              <span className="info-cell__value pkg-cell__value">
                <span className="pkg-cell__name">
                  {firstMembership.membershipName}
                  {fmtExpiry(firstMembership.expiresAt) ? `/${fmtExpiry(firstMembership.expiresAt)}` : ""}
                </span>
                <button
                  type="button"
                  className="pkg-info-btn"
                  title="View membership details"
                  onMouseEnter={memPopover.onMouseEnter}
                  onMouseLeave={memPopover.onMouseLeave}
                  onClick={memPopover.toggle}
                >
                  ℹ
                </button>
              </span>
            ) : (
              <span className="info-cell__value">N/A</span>
            )}
            {memPopover.visible && activeMemberships.length > 0 && (
              <div className="info-popover info-popover--wide">
                <div className="pkg-modal__cards">
                  {activeMemberships.map((m) => {
                    const expiryStatus = getExpiryStatus(m.expiresAt);
                    return (
                    <div key={m.id} className="pkg-card">
                      <div className="pkg-card__row">
                        <span className="pkg-card__lbl">Active Membership:</span>
                        <span className="pkg-card__val">{m.membershipName}</span>
                      </div>
                      <div className="pkg-card__row">
                        <span className="pkg-card__lbl">Purchase Date:</span>
                        <span className="pkg-card__val">{fmtDate(m.purchasedAt)}</span>
                      </div>
                      <div className="pkg-card__row">
                        <span className="pkg-card__lbl">Expiry Date:</span>
                        <span className="pkg-card__val">{fmtDate(m.expiresAt)}</span>
                      </div>
                      <div className="pkg-card__row">
                        <span className="pkg-card__lbl">Status:</span>
                        <span className={`pkg-card__status-badge pkg-card__status-badge--${expiryStatus}`}>
                          {expiryStatus === "expiring-soon" ? "Expiring Soon" : expiryStatus.charAt(0).toUpperCase() + expiryStatus.slice(1)}
                        </span>
                      </div>
                      <div className="pkg-card__row">
                        <span className="pkg-card__lbl">Price:</span>
                        <span className="pkg-card__val">₹{Number(m.pricePaid ?? 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="pkg-card__row">
                        <span className="pkg-card__lbl">Sessions:</span>
                        <span className="pkg-card__val">
                          {m.totalSessions === 0 ? "Unlimited" : `${m.usedSessions} used / ${m.totalSessions} total`}
                        </span>
                      </div>
                      <div className="pkg-card__row">
                        <span className="pkg-card__lbl">Balance Amount:</span>
                        <span className="pkg-card__val">₹{Number(m.membershipWalletBalance ?? 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
    </>
  );
};

export default ClientStatCard;
