import React from "react";
import type { ClientPackage } from "../../../../services/api/endpoints/packages.endpoints";

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return "N/A";
  try {
    return new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return raw; }
}

interface Props {
  clientName: string;
  packages: ClientPackage[];
  onClose: () => void;
}

export const PackageInfoModal: React.FC<Props> = ({ clientName, packages, onClose }) => {
  return (
    <div className="pkg-modal-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>

        <div className="pkg-modal__header">
          <span className="pkg-modal__title">Package Details</span>
          <button className="pkg-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="pkg-modal__body">
          <p className="pkg-modal__guest">Guest Name: <strong>{clientName}</strong></p>

          <div className="pkg-modal__cards">
            {packages.map((pkg) => {
              const totalSessions = pkg.services.reduce((s, svc) => s + svc.totalSessions, 0);
              const usedSessions  = pkg.services.reduce((s, svc) => s + svc.completedSessions, 0);
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
      </div>
    </div>
  );
};

export default PackageInfoModal;
