import React from "react";
import { Shop } from "react-bootstrap-icons";
import "../styles/StaffLocationsSection.scss";

const StaffLocationsSection: React.FC = () => {

  return (
    <div className="section locations-section">
      <h5 className="section__title">Works at</h5>
      <p className="section__subtitle">Choose the locations where this team member works</p>

      <div className="location-list mt-3">
        <div className="location-item">
          <div className="location-icon-wrapper">
            <Shop />
          </div>
          <div className="location-content">
            <div className="location-name">bhb</div>
            <div className="location-address">
              Amit Nagar, Knowledge Park I, Pari Chowk, Greater Noida, Uttar Pradesh
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLocationsSection;