// src/components/packages/PackageCreatedSuccess.tsx
import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import styles from "./packages.module.scss";
import type { ClientPackage } from "../../services/api/endpoints/packages.endpoints";
import { useCurrency } from "../../hooks/useCurrency";
import { getPackageServiceDisplayStatus } from "../../features/bookings/utils/packageServiceStatus";

interface Props {
  pkg: ClientPackage;
  onViewPackages: () => void;
  onCreateAnother: () => void;
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const PackageCreatedSuccess: React.FC<Props> = ({ pkg, onViewPackages, onCreateAnother }) => {
  const { formatAmount } = useCurrency();
  const expiryFmt = pkg.expiryDate
    ? new Date(pkg.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Never expires";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>

      <div className={styles.successBanner}>
        <CheckCircle2 size={16} />
        Package created successfully — {pkg.id}
      </div>

      {pkg.schedulingErrors && pkg.schedulingErrors.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#b45309", fontWeight: 500, marginBottom: 12, padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div>The package was created and paid successfully, but the following service{pkg.schedulingErrors.length > 1 ? "s" : ""} couldn't be auto-scheduled — book {pkg.schedulingErrors.length > 1 ? "them" : "it"} manually from the Calendar:</div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {pkg.schedulingErrors.map((e, i) => <li key={i}>{e.serviceName} — {e.error}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardBody}>

          {/* Client row */}
          <div className={styles.clientDetail}>
            <div className={`${styles.avatar} ${styles["avatar--lg"]}`}>{initials(pkg.clientName)}</div>
            <div className={styles.clientDetailInfo}>
              <div className={styles.clientDetailName}>{pkg.clientName}</div>
              <div className={styles.clientDetailSub}>
                {pkg.mobile ?? ""}
                {pkg.email ? ` · ${pkg.email}` : ""}
              </div>
            </div>
            <div className={styles.clientDetailMeta}>
              <div>
                <div className={styles.clientDetailMetaLabel}>Status</div>
                <span className={`${styles.badge} ${styles["badge--green"]}`}>
                  <span className={styles.badgeDot} /> {pkg.status}
                </span>
              </div>
              <div>
                <div className={styles.clientDetailMetaLabel}>Expires</div>
                <div className={styles.clientDetailMetaValue}>{expiryFmt}</div>
              </div>
            </div>
          </div>

          {/* Package details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              ["Package Name", pkg.packageName],
              ["Package ID",   pkg.id],
            ].map(([label, value]) => (
              <div key={label} className={styles.formField}>
                <span className={styles.formLabel}>{label}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 18px" }} />

          {/* Services */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Services Included</div>
          <table className={styles.table} style={{ marginBottom: 18 }}>
            <thead>
              <tr>
                {["Service","Total Sessions","Completed","Remaining","Amount","Schedule"].map(h => (
                  <th key={h} className={styles.tableTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pkg.services.map(s => {
                const scheduleInfo = getPackageServiceDisplayStatus(s, pkg.expiryDate);
                return (
                  <tr key={s.serviceId} className={styles.tableRow}>
                    <td className={styles.tableTd} style={{ fontWeight: 600 }}>{s.serviceName}</td>
                    <td className={styles.tableTd}>{s.totalSessions}</td>
                    <td className={styles.tableTd}>{s.completedSessions}</td>
                    <td className={styles.tableTd} style={{ color: "#7c3aed", fontWeight: 700 }}>{s.remainingSessions}</td>
                    <td className={styles.tableTd}>{formatAmount(s.price)}</td>
                    <td className={styles.tableTd}>
                      {scheduleInfo.status === "Scheduled" && scheduleInfo.scheduledAt
                        ? `${new Date(scheduleInfo.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${scheduleInfo.staffName ?? "—"}`
                        : scheduleInfo.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 18px" }} />

          {/* Payment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Payment Summary</div>
              <div className={styles.priceBox}>
                <div className={styles.priceRow}><span>Package price</span><span>{formatAmount(pkg.basePrice)}</span></div>
                {pkg.discount > 0 && (
                  <div className={styles.priceRow}><span>Discount</span><span>− {formatAmount(pkg.discount)}</span></div>
                )}
                {pkg.gstPercentage > 0 && (
                  <div className={styles.priceRow}><span>GST ({pkg.gstPercentage}%)</span><span>{formatAmount(pkg.gstAmount)}</span></div>
                )}
                <div className={`${styles.priceRow} ${styles["priceRow--total"]}`}>
                  <span>Total Amount</span><span>{formatAmount(pkg.totalAmount)}</span>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Payment Information</div>
              <div className={styles.priceBox}>
                <div className={styles.priceRow}><span>Method</span><span style={{ fontWeight: 600 }}>{pkg.paymentMethod}</span></div>
                <div className={styles.priceRow}><span>Paid Amount</span><span style={{ fontWeight: 600 }}>{formatAmount(pkg.paidAmount)}</span></div>
                <div className={styles.priceRow} style={{ marginTop: 4 }}>
                  <span>Status</span>
                  <span className={`${styles.badge} ${styles["badge--green"]}`}>
                    <span className={styles.badgeDot} /> {pkg.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button onClick={onViewPackages}  className={styles.btnSecondary}>← View Packages</button>
            <button onClick={onCreateAnother} className={styles.btnPrimary}>+ Create Another</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageCreatedSuccess;
