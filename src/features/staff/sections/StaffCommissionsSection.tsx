import React, { useState } from "react";

const TYPES = [
  { key: "services", label: "Services" },
  { key: "products", label: "Products" },
  { key: "vouchers", label: "Vouchers" },
  { key: "memberships", label: "Memberships" },
];

const StaffCommissionsSection: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [rates, setRates] = useState<Record<string, string>>({
    services: "", products: "", vouchers: "", memberships: "",
  });

  return (
    <div className="section staff-form">
      <h4 className="section__title">Commissions</h4>
      <p className="section__subtitle">Set commission rates across different sales categories</p>

      <div className="staff-toggle mb-4">
        <div className="staff-toggle__info">
          <div className="staff-toggle__label">Enable commissions</div>
          <div className="staff-toggle__hint">Apply commission rates to this team member's sales</div>
        </div>
        <div className="form-check form-switch ms-3">
          <input className="form-check-input" type="checkbox" role="switch"
            checked={enabled} onChange={() => setEnabled(!enabled)} />
        </div>
      </div>

      {enabled ? (
        <>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            Set a percentage (%) commission for each category
          </p>
          {TYPES.map((t) => (
            <div className="commission-row" key={t.key}>
              <span className="commission-row__label">{t.label}</span>
              <div className="d-flex align-items-center gap-2">
                <input className="commission-row__input" type="number"
                  min={0} max={100} step={0.5} placeholder="0"
                  value={rates[t.key]}
                  onChange={(e) => setRates((p) => ({ ...p, [t.key]: e.target.value }))} />
                <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>%</span>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="staff-empty">
          <i className="bi bi-percent staff-empty__icon" />
          <p className="staff-empty__title">Commissions disabled</p>
          <p className="staff-empty__desc">Toggle the switch above to configure commission rates</p>
        </div>
      )}
    </div>
  );
};

export default StaffCommissionsSection;