import React from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  PencilSquare,
  Trash3,
  ClockHistory,
  CurrencyRupee,
  CheckCircleFill,
  XCircleFill,
  Globe,
  People,
  Calendar3,
} from "react-bootstrap-icons";
import type { Service } from "../types/catalog.types";

interface ServiceDetailPanelProps {
  service: Service;
  onClose: () => void;
  onDelete: (service: Service) => void;
}

const ServiceDetailPanel: React.FC<ServiceDetailPanelProps> = ({
  service,
  onClose,
  onDelete,
}) => {
  const navigate = useNavigate();

  return (
    <aside className="sdp">
      {/* Header */}
      <div className="sdp__header">
        <div className="sdp__avatar">
          {(service.name ?? "S").charAt(0).toUpperCase()}
        </div>
        <div className="sdp__title-wrap">
          <h3 className="sdp__name">{service.name}</h3>
          {service.category_name && (
            <span className="sdp__category">{service.category_name}</span>
          )}
        </div>
        <button className="sdp__close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>

      {/* Status row */}
      <div className="sdp__status-row">
        <span className={`sdp__badge ${service.is_active ? "sdp__badge--active" : "sdp__badge--inactive"}`}>
          {service.is_active ? (
            <><CheckCircleFill size={11} /> Active</>
          ) : (
            <><XCircleFill size={11} /> Inactive</>
          )}
        </span>
        {service.online_booking && (
          <span className="sdp__badge sdp__badge--info">
            <Globe size={11} /> Online booking
          </span>
        )}
      </div>

      {/* Body */}
      <div className="sdp__body">
        {/* Key metrics */}
        <div className="sdp__metrics">
          <div className="sdp__metric">
            <span className="sdp__metric-icon"><ClockHistory size={16} /></span>
            <div>
              <p className="sdp__metric-label">Duration</p>
              <p className="sdp__metric-value">{service.duration} min</p>
            </div>
          </div>
          <div className="sdp__metric">
            <span className="sdp__metric-icon"><CurrencyRupee size={16} /></span>
            <div>
              <p className="sdp__metric-label">Price</p>
              <p className="sdp__metric-value">
                ₹{service.price}
                {service.discounted_price && (
                  <span className="sdp__discounted">₹{service.discounted_price}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {service.description && (
          <div className="sdp__section">
            <h4 className="sdp__section-title">Description</h4>
            <p className="sdp__description">{service.description}</p>
          </div>
        )}

        {/* Details grid */}
        <div className="sdp__section">
          <h4 className="sdp__section-title">Details</h4>
          <div className="sdp__detail-list">
            {service.price_type && service.price_type !== "fixed" && (
              <div className="sdp__detail-row">
                <span className="sdp__detail-key">Price type</span>
                <span className="sdp__detail-val sdp__detail-val--cap">{service.price_type}</span>
              </div>
            )}
            {(service.padding_before !== undefined && service.padding_before > 0) && (
              <div className="sdp__detail-row">
                <span className="sdp__detail-key">Padding before</span>
                <span className="sdp__detail-val">{service.padding_before} min</span>
              </div>
            )}
            {(service.padding_after !== undefined && service.padding_after > 0) && (
              <div className="sdp__detail-row">
                <span className="sdp__detail-key">Padding after</span>
                <span className="sdp__detail-val">{service.padding_after} min</span>
              </div>
            )}
            <div className="sdp__detail-row">
              <span className="sdp__detail-key"><People size={13} /> Team members</span>
              <span className="sdp__detail-val">
                {service.all_members ? "All members" : `${(service.team_member_ids ?? []).length} selected`}
              </span>
            </div>
            <div className="sdp__detail-row">
              <span className="sdp__detail-key">Commissions</span>
              <span className="sdp__detail-val">
                {service.commission_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="sdp__detail-row">
              <span className="sdp__detail-key">Resource required</span>
              <span className="sdp__detail-val">
                {service.resource_required ? "Yes" : "No"}
              </span>
            </div>
            {service.gender_preference && (
              <div className="sdp__detail-row">
                <span className="sdp__detail-key">Gender preference</span>
                <span className="sdp__detail-val sdp__detail-val--cap">{service.gender_preference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Created / updated */}
        {service.created_at && (
          <div className="sdp__section">
            <h4 className="sdp__section-title">Timestamps</h4>
            <div className="sdp__detail-list">
              <div className="sdp__detail-row">
                <span className="sdp__detail-key"><Calendar3 size={12} /> Created</span>
                <span className="sdp__detail-val">
                  {new Date(service.created_at).toLocaleDateString()}
                </span>
              </div>
              {service.updated_at && (
                <div className="sdp__detail-row">
                  <span className="sdp__detail-key"><Calendar3 size={12} /> Updated</span>
                  <span className="sdp__detail-val">
                    {new Date(service.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="sdp__footer">
        <button
          className="sdp__action-btn sdp__action-btn--danger"
          onClick={() => onDelete(service)}
        >
          <Trash3 size={15} /> Delete
        </button>
        <button
          className="sdp__action-btn sdp__action-btn--edit"
          onClick={() =>
            navigate(`/dashboard/catalog/services/${service.id}/edit`)
          }
        >
          <PencilSquare size={15} /> Edit service
        </button>
      </div>
    </aside>
  );
};

export default ServiceDetailPanel;
