import React from "react";
import {
  ThreeDotsVertical,
  ClockHistory,
  PencilSquare,
  Trash3,
} from "react-bootstrap-icons";
import type { Service } from "../../types/catalog.types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../../utils/currencyIcon";

interface ServiceCardProps {
  service: Service;
  openMenuId: string | null;
  onMenuToggle: (id: string | null) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onClick: (id: string | number) => void;
  highlighted?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string | number, checked: boolean) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = React.memo(
  ({ service, openMenuId, onMenuToggle, onEdit, onDelete, onClick, highlighted = false, isSelected = false, onSelect }) => {
    const { currencyCode } = useCurrency();
    const CurrencyIcon = getCurrencyIcon(currencyCode);
    return (
    <div
      id={`service-card-${service.id}`}
      className={`slp__service-card ${highlighted ? "slp__service-card--highlighted" : ""} ${isSelected ? "slp__service-card--selected" : ""}`}
      onClick={() => onClick(service.id)}
    >
      <div className="slp__svc-left">
        {onSelect && (
          <input
            type="checkbox"
            className="slp__svc-checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(service.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="slp__svc-avatar">
          {(service.name ?? "S").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="slp__svc-name">{service.name}</p>
          <div className="slp__svc-meta">
            {service.duration && (
              <span>
                <ClockHistory size={12} /> {service.duration} min
              </span>
            )}
            {service.price_type && service.price_type !== "fixed" && (
              <span className="slp__svc-tag">{service.price_type}</span>
            )}
            {service.is_active === false && (
              <span className="slp__svc-tag slp__svc-tag--inactive">
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="slp__svc-right" onClick={(e) => e.stopPropagation()}>
        <span className="slp__svc-price">
          <CurrencyIcon size={14} />
          {service.price}
        </span>

        {/* Kebab menu for Edit / Delete */}
        <div className="slp__dd-wrap">
          <button
            className="slp__kebab"
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle(
                openMenuId === String(service.id) ? null : String(service.id),
              );
            }}
          >
            <ThreeDotsVertical size={16} />
          </button>
          {openMenuId === String(service.id) && (
            <ul className="slp__dd-menu slp__dd-menu--right">
              <li>
                <button
                  className="slp__dd-item"
                  onClick={() => onEdit(service.id)}
                >
                  <PencilSquare size={13} /> Edit
                </button>
              </li>
              <li>
                <button
                  className="slp__dd-item slp__dd-item--danger"
                  onClick={() => onDelete(service.id)}
                >
                  <Trash3 size={13} /> Delete
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
    );
  },
);

ServiceCard.displayName = "ServiceCard";

export default ServiceCard;
