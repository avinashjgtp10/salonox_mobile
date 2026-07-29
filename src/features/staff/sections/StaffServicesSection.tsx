import React, { useState, useEffect } from "react";
import { Search } from "react-bootstrap-icons";
import "../styles/StaffServicesSection.scss";
import api from "../../../services/api/axios";
import { SERVICES as SERVICES_ENDPOINTS } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";

interface StaffServicesSectionProps {
  specialization?: string[];
  setSpecialization?: (val: string[]) => void;
  salonId?: string;
}

const StaffServicesSection: React.FC<StaffServicesSectionProps> = ({ 
  specialization = [], 
  setSpecialization = () => {},
  salonId
}) => {
  const { formatAmount } = useCurrency();
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (salonId) {
      const fetchServices = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(SERVICES_ENDPOINTS.BASE);
          setAvailableServices(response.data.data || []);
        } catch (error) {
          console.error("Error fetching services:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchServices();
    }
  }, [salonId]);

  const toggle = (id: string) => {
    const next = specialization.includes(id)
      ? specialization.filter((x) => x !== id)
      : [...specialization, id];
    setSpecialization(next);
  };

  const toggleAll = () => {
    if (specialization.length === availableServices.length) {
      setSpecialization([]);
    } else {
      setSpecialization(availableServices.map((s) => s.id));
    }
  };

  const isAllSelected =
    availableServices.length > 0 && specialization.length === availableServices.length;

  const filteredServices = availableServices.filter((s) =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="p-4 text-center">Loading services...</div>;

  return (
    <div className="section services-section">
      <h5 className="section__title">Services</h5>
      <p className="section__subtitle">
        Choose the services this staff member provides
      </p>

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
        {availableServices.length > 0 && (
          <div className="service-item pb-3">
            <div
              className={`custom-checkbox ${isAllSelected ? "checked" : ""}`}
              onClick={toggleAll}
            >
              {isAllSelected && <i className="bi bi-check" />}
            </div>
            <div className="service-content">
              <span className="service-name">
                All services <span className="badge-count">{availableServices.length}</span>
              </span>
            </div>
          </div>
        )}

        {availableServices.length === 0 && !isLoading && (
          <div className="p-4 text-center text-muted">
            No services found. Please add services in the catalog first.
          </div>
        )}

        {/* INDIVIDUAL SERVICES */}
        {filteredServices.map((service) => {
          const isSelected = specialization.includes(service.id);
          return (
            <div
              key={service.id}
              className="service-item service-item--clickable"
              onClick={() => toggle(service.id)}
            >
              <div className={`custom-checkbox ${isSelected ? "checked" : ""}`}>
                {isSelected && <i className="bi bi-check" />}
              </div>
              <div className="service-content">
                <div className="service-name service-name--regular">
                  {service.name}
                </div>
                <div className="service-duration">{service.duration_minutes} min</div>
              </div>
              <div className="service-price">{formatAmount(Number(service.price))}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StaffServicesSection;
