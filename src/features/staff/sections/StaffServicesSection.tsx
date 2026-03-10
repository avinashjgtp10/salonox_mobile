import React, { useState } from "react";
import { Search } from "react-bootstrap-icons";
import "../styles/StaffServicesSection.scss";

const SERVICES = [
  { id: "haircut", name: "Haircut", duration: "1h 30min", price: "₹25" },
  { id: "blowdry", name: "Blow Dry", duration: "1h 30min", price: "₹25" },
];

const StaffServicesSection: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleAll = () => {
    if (selected.length === SERVICES.length) {
      setSelected([]);
    } else {
      setSelected(SERVICES.map(s => s.id));
    }
  };

  const isAllSelected = selected.length === SERVICES.length && SERVICES.length > 0;

  return (
    <div className="section services-section">
      <h5 className="section__title">Services</h5>
      <p className="section__subtitle">Choose the services this team member provides</p>

      {/* SEARCH BAR */}
      <div className="search-container">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="form-control"
          placeholder="Search services"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="service-list">

        {/* ALL SERVICES HEADER */}
        <div className="service-item pb-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div
            className={`custom-checkbox ${isAllSelected ? "checked" : ""}`}
            onClick={toggleAll}
          >
            {isAllSelected && <i className="bi bi-check" />}
          </div>
          <div className="service-content">
            <span className="service-name">
              All services <span className="badge-count">2</span>
            </span>
          </div>
        </div>

        {/* CATEGORY HEADER */}
        <div className="service-item pb-3 pt-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div
            className={`custom-checkbox ${isAllSelected ? "checked" : ""}`}
            onClick={toggleAll}
          >
            {isAllSelected && <i className="bi bi-check" />}
          </div>
          <div className="service-content">
            <span className="service-name" style={{ fontWeight: 500 }}>
              Hair & styling <span className="badge-count">2</span>
            </span>
          </div>
        </div>

        {/* INDIVIDUAL SERVICES */}
        {SERVICES.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((service) => {
          const isSelected = selected.includes(service.id);
          return (
            <div key={service.id} className="service-item" onClick={() => toggle(service.id)} style={{ cursor: 'pointer' }}>
              <div className={`custom-checkbox ${isSelected ? "checked" : ""}`}>
                {isSelected && <i className="bi bi-check" />}
              </div>
              <div className="service-content">
                <div className="service-name" style={{ fontWeight: 400 }}>{service.name}</div>
                <div className="service-duration">{service.duration}</div>
              </div>
              <div className="service-price">{service.price}</div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default StaffServicesSection;