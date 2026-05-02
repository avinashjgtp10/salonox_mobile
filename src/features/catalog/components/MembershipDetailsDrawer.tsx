import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { XLg, Pencil, CardList, InfoCircle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import "../styles/MembershipDetailsDrawer.scss";

interface MembershipDetailsDrawerProps {
  membershipId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const MembershipDetailsDrawer: React.FC<MembershipDetailsDrawerProps> = ({
  membershipId,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && membershipId) {
      const fetchDetails = async () => {
        try {
          setLoading(true);
          const res = await api.get(`/api/v1/memberships/${membershipId}`);
          const data = res.data?.data || res.data;
          setMembership(data);
        } catch (error) {
          console.error("Error fetching membership details:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    } else if (!isOpen) {
      setMembership(null);
    }
  }, [isOpen, membershipId]);

  if (!isOpen) return null;

  return (
    <div className={`mdd-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="mdd" onClick={(e) => e.stopPropagation()}>
        <header className="mdd__header">
          <button className="close-btn" onClick={onClose}>
            <XLg size={20} />
          </button>
          <div className="header-content">
            <div
              className="membership-icon"
              style={{ background: (membership?.colour || "#000") + "22" }}
            >
              <CardList size={24} style={{ color: membership?.colour }} />
            </div>
            <div className="title-section">
              <h3 className="membership-name">
                {membership?.name || "Loading..."}
              </h3>
              <span className="validity-badge">
                {membership?.validFor || "–"}
              </span>
            </div>
          </div>
          <button
            className="edit-btn"
            onClick={() => {
              navigate(`/dashboard/catalog/memberships/edit/${membershipId}`);
              onClose();
            }}
          >
            <Pencil size={14} /> Edit
          </button>
        </header>

        {loading ? (
          <div className="mdd__loading">
            <div className="spinner-border spinner-border-sm" role="status" />
            <span>Loading...</span>
          </div>
        ) : (
          <div className="mdd__body">
            <section className="mdd__section">
              <h4 className="section-title">Description</h4>
              <p className="description-text">
                {membership?.description || "No description provided."}
              </p>
            </section>

            <section className="mdd__section">
              <h4 className="section-title">Price & Details</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Price</span>
                  <span className="value fw-bold">
                    ₹{Number(membership?.price || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Sessions</span>
                  <span className="value">
                    {membership?.sessionType === "unlimited"
                      ? "Unlimited"
                      : `${membership?.numberOfSessions || 0} sessions`}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Tax Rate</span>
                  <span className="value">
                    {membership?.taxRate ? `${membership.taxRate}%` : "No tax"}
                  </span>
                </div>
              </div>
            </section>

            <section className="mdd__section">
              <h4 className="section-title">Included Services</h4>
              <div className="services-list">
                {membership?.includedServices?.length > 0 ? (
                  membership.includedServices.map((s: any) => (
                    <div key={s.serviceId} className="service-tag">
                      {s.serviceName}
                    </div>
                  ))
                ) : (
                  <div className="empty-services">
                    <InfoCircle size={14} /> All services included
                  </div>
                )}
              </div>
            </section>

            <section className="mdd__section">
              <h4 className="section-title">Online & T&C</h4>
              <div className="settings-list">
                <div className="setting-row">
                  <span>Online Sales</span>
                  <span
                    className={`status-dot ${membership?.enableOnlineSales ? "active" : ""}`}
                  />
                  <span className="status-text">
                    {membership?.enableOnlineSales ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="setting-row">
                  <span>Online Redemption</span>
                  <span
                    className={`status-dot ${membership?.enableOnlineRedemption ? "active" : ""}`}
                  />
                  <span className="status-text">
                    {membership?.enableOnlineRedemption
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="tc-box mt-3">
                <h5 className="tc-title">Terms & Conditions</h5>
                <p className="tc-text">
                  {membership?.termsAndConditions ||
                    "No terms and conditions provided."}
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipDetailsDrawer;
