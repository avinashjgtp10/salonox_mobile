import React, { useState } from "react";

const LOCATIONS = [
  "Main Salon – MG Road",
  "Branch – Koregaon Park",
  "Outlet – Baner",
];

const StaffLocationsSection: React.FC = () => {
  const [selected, setSelected] = useState<string[]>(["Main Salon – MG Road"]);

  const toggle = (loc: string) =>
    setSelected((prev) => prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]);

  return (
    <div className="section">
      <h4 className="section__title">Locations</h4>
      <p className="section__subtitle">Assign this team member to one or more locations</p>

      {LOCATIONS.map((loc) => {
        const isSelected = selected.includes(loc);
        return (
          <div key={loc} className="staff-list-item"
            style={{
              cursor: "pointer",
              borderColor: isSelected ? "#6c3ce1" : "#e5e7eb",
              background: isSelected ? "#ede8fb" : "#fff",
            }}
            onClick={() => toggle(loc)}>
            <div className="staff-list-item__info">
              <div className="staff-list-item__label">{loc}</div>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: `2px solid ${isSelected ? "#6c3ce1" : "#d1d5db"}`,
              background: isSelected ? "#6c3ce1" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isSelected && <i className="bi bi-check" style={{ color: "#fff", fontSize: 11 }} />}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
        {selected.length} location{selected.length !== 1 ? "s" : ""} selected
      </p>
    </div>
  );
};

export default StaffLocationsSection;