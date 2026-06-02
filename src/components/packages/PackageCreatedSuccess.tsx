// src/components/packages/PackageCreatedSuccess.tsx
import React from "react";
import { CheckCircle2 } from "lucide-react";
import styles from "./packages.module.scss";
import type { ClientPackage } from "../../services/api/endpoints/packages.endpoints";

interface Props {
  pkg: ClientPackage;
  onViewPackages: () => void;
  onCreateAnother: () => void;
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const PackageCreatedSuccess: React.FC<Props> = ({ pkg, onViewPackages, onCreateAnother }) => {
  const expiryFmt = new Date(pkg.expiryDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>

      <div className={styles.successBanner}>
        <CheckCircle2 size={16} />
        Package created successfully — {pkg.id}
      </div>

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
              ["Category",     pkg.category],
              ["Branch",       pkg.branch],
            ].map(([label, value]) => (
              <div key={label} className={styles.formField}>
                <span className={styles.formLabel}>{label}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 18px" }} />

          {/* Services */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Services included</div>
          <table className={styles.table} style={{ marginBottom: 18 }}>
            <thead>
              <tr>
                {["Service","Total Sessions","Completed","Remaining","Amount"].map(h => (
                  <th key={h} className={styles.tableTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pkg.services.map(s => (
                <tr key={s.serviceId} className={styles.tableRow}>
                  <td className={styles.tableTd} style={{ fontWeight: 600 }}>{s.serviceName}</td>
                  <td className={styles.tableTd}>{s.totalSessions}</td>
                  <td className={styles.tableTd}>{s.completedSessions}</td>
                  <td className={styles.tableTd} style={{ color: "#7c3aed", fontWeight: 700 }}>{s.remainingSessions}</td>
                  <td className={styles.tableTd}>₹{s.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 18px" }} />

          {/* Payment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Payment Summary</div>
              <div className={styles.priceBox}>
                <div className={styles.priceRow}><span>Package price</span><span>₹{pkg.basePrice.toFixed(2)}</span></div>
                {pkg.discount > 0 && (
                  <div className={styles.priceRow}><span>Discount</span><span>− ₹{pkg.discount.toFixed(2)}</span></div>
                )}
                {pkg.gstPercentage > 0 && (
                  <div className={styles.priceRow}><span>GST ({pkg.gstPercentage}%)</span><span>₹{pkg.gstAmount.toFixed(2)}</span></div>
                )}
                <div className={`${styles.priceRow} ${styles["priceRow--total"]}`}>
                  <span>Total Amount</span><span>₹{pkg.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Payment Information</div>
              <div className={styles.priceBox}>
                <div className={styles.priceRow}><span>Method</span><span style={{ fontWeight: 600 }}>{pkg.paymentMethod}</span></div>
                <div className={styles.priceRow}><span>Paid Amount</span><span style={{ fontWeight: 600 }}>₹{pkg.paidAmount.toFixed(2)}</span></div>
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
