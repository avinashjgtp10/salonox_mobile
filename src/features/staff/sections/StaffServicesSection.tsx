import React, { useState } from "react";

const SERVICES = [
  "Hair Cut","Hair Color","Balayage","Blow Dry","Keratin Treatment",
  "Manicure","Pedicure","Facial","Waxing","Eyebrow Threading",
  "Lash Extensions","Massage","Beard Trim","Hair Highlights",
];

const StaffServicesSection: React.FC = () => {
  const [selected, setSelected] = useState<string[]>(["Hair Cut", "Blow Dry"]);

  const toggle = (s: string) =>
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  return (
    <div className="section">
      <h4 className="section__title">Services</h4>
      <p className="section__subtitle">Select which services this team member can perform</p>

      <div className="d-flex align-items-center justify-content-between mb-3">
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {selected.length} service{selected.length !== 1 ? "s" : ""} selected
        </span>
        <button className="btn btn-sm" style={{ fontSize: 12, color: "#6c3ce1", fontWeight: 600 }}
          onClick={() => setSelected(selected.length === SERVICES.length ? [] : [...SERVICES])}>
          {selected.length === SERVICES.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="row g-2">
        {SERVICES.map((service) => {
          const isSelected = selected.includes(service);
          return (
            <div key={service} className="col-6">
              <div className="p-2 rounded border d-flex align-items-center gap-2"
                style={{
                  cursor: "pointer",
                  background: isSelected ? "#ede8fb" : "#fff",
                  borderColor: isSelected ? "#6c3ce1" : "#e5e7eb",
                  transition: "all 0.15s",
                }}
                onClick={() => toggle(service)}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${isSelected ? "#6c3ce1" : "#d1d5db"}`,
                  background: isSelected ? "#6c3ce1" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isSelected && <i className="bi bi-check" style={{ color: "#fff", fontSize: 11 }} />}
                </div>
                <span style={{ fontSize: 13, color: "#1a1a1a", fontWeight: isSelected ? 500 : 400 }}>
                  {service}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StaffServicesSection;