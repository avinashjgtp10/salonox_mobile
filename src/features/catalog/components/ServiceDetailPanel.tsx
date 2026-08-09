import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  X,
  PencilSquare,
  Trash3,
  ClockHistory,
  CheckCircleFill,
  XCircleFill,
  Globe,
  People,
  Calendar3,
} from "react-bootstrap-icons";
import type { Service } from "../types/catalog.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { formatDuration } from "../utils/duration";

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
  const { formatAmount, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);
  const dialogTitleId = "service-detail-panel-title";
  const formatMoney = (value: string | number | null | undefined) => {
    const parsed = parseFloat(String(value ?? 0));
    const safeValue = Number.isFinite(parsed) ? parsed : 0;
    return formatAmount(safeValue);
  };
  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleString() : "";

  return (
    <div className="sdp-overlay" onClick={onClose}>
      <aside
        className="sdp"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sdp__header">
          <button
            className="sdp__back-btn"
            onClick={onClose}
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 id={dialogTitleId} className="sdp__header-title">Service details</h3>
          <div className="sdp__header-actions">
            <button
              className="sdp__edit-btn"
              onClick={() => navigate(`/dashboard/catalog/services/${service.id}/edit`)}
            >
              <PencilSquare size={13} />
              Edit
            </button>
            <button
              className="sdp__close-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

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

        <div className="sdp__body">
          <div className="sdp__hero-card">
            <div className="sdp__avatar">
              {(service.name ?? "S").charAt(0).toUpperCase()}
            </div>
            <div className="sdp__title-wrap">
              <h3 className="sdp__name">{service.name}</h3>
              <div className="sdp__hero-sub">
                {service.category_name || "Uncategorized"}
              </div>
              {service.online_booking && (
                <div className="sdp__hero-note">Available for online booking</div>
              )}
            </div>
          </div>

          <div className="sdp__metrics">
            <div className="sdp__metric">
              <span className="sdp__metric-icon"><ClockHistory size={16} /></span>
              <div>
                <p className="sdp__metric-label">Duration</p>
                <p className="sdp__metric-value">{formatDuration(Number(service.duration) || 0)}</p>
              </div>
            </div>
            <div className="sdp__metric">
              <span className="sdp__metric-icon"><CurrencyIcon size={16} /></span>
              <div>
                <p className="sdp__metric-label">Price</p>
                <p className="sdp__metric-value">{formatMoney(service.price)}</p>
              </div>
            </div>
          </div>

          {service.description && (
            <div className="sdp__section">
              <h4 className="sdp__section-title">Description</h4>
              <p className="sdp__description">{service.description}</p>
            </div>
          )}

          <div className="sdp__section">
            <h4 className="sdp__section-title">Details</h4>
            <div className="sdp__detail-list">
              {service.price_type && service.price_type !== "fixed" && (
                <div className="sdp__detail-row">
                  <span className="sdp__detail-key">Price type</span>
                  <span className="sdp__detail-val sdp__detail-val--cap">{service.price_type}</span>
                </div>
              )}
              <div className="sdp__detail-row">
                <span className="sdp__detail-key">Category</span>
                <span className="sdp__detail-val">{service.category_name || "Uncategorized"}</span>
              </div>
              <div className="sdp__detail-row">
                <span className="sdp__detail-key"><People size={13} /> Staff members</span>
                <span className="sdp__detail-val">
                  {(service.staff ?? []).length === 0
                    ? "All members"
                    : `${(service.staff ?? []).length} selected`}
                </span>
              </div>
              {/* Only shown when an override is actually set — otherwise the
                  service pays under the staff member's own rules and there is
                  no single rate to quote here. */}
              {service.commission_rate !== null && service.commission_rate !== undefined && (
                <div className="sdp__detail-row">
                  <span className="sdp__detail-key">Commission</span>
                  <span className="sdp__detail-val">
                    {service.commission_kind === "fixed"
                      ? formatMoney(service.commission_rate)
                      : `${Number(service.commission_rate)}%`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {service.created_at && (
            <div className="sdp__section">
              <h4 className="sdp__section-title">Timestamps</h4>
              <div className="sdp__detail-list">
                <div className="sdp__detail-row">
                  <span className="sdp__detail-key"><Calendar3 size={12} /> Created</span>
                  <span className="sdp__detail-val">
                    {formatDate(service.created_at)}
                  </span>
                </div>
                {service.updated_at && (
                  <div className="sdp__detail-row">
                    <span className="sdp__detail-key"><Calendar3 size={12} /> Updated</span>
                    <span className="sdp__detail-val">
                      {formatDate(service.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sdp__footer">
          <button
            className="sdp__action-btn sdp__action-btn--danger"
            onClick={() => onDelete(service)}
          >
            <Trash3 size={15} /> Delete
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ServiceDetailPanel;
