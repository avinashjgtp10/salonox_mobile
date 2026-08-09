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
import { formatDuration } from "../../utils/duration";

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
    const { currencyCode, currencySymbol } = useCurrency();
    const CurrencyIcon = getCurrencyIcon(currencyCode);

    // staff_count of 0 is NOT "nobody" — no service_staff rows is how the
    // backend stores "every staff member, including future hires", so it reads
    // as "All staff". undefined means the response predates staff_count, in
    // which case we say nothing rather than guess.
    const staffLabel =
      service.staff_count === undefined
        ? null
        : service.staff_count === 0
          ? "All staff"
          : `${service.staff_count} staff`;

    const description = (service.description ?? "").trim();

    // null when no per-service override is set, in which case the row shows a
    // muted dash — the service still earns commission, just under the staff
    // member's own rules rather than a rate of its own.
    const rate = service.commission_rate;
    const commissionLabel =
      rate === null || rate === undefined
        ? null
        : service.commission_kind === "fixed"
          ? `${currencySymbol}${Number(rate)}`
          : `${Number(rate)}%`;

    return (
    <div
      id={`service-card-${service.id}`}
      className={`slp__service-card ${highlighted ? "slp__service-card--highlighted" : ""} ${isSelected ? "slp__service-card--selected" : ""}`}
      onClick={() => onClick(service.id)}
    >
      {/* One grid cell per column so values line up down the list, rather than
          duration/staff being stacked under the name as free text. */}
      <div className="slp__svc-check">
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
      </div>

      <div className="slp__svc-name-cell">
        <div className="slp__svc-avatar">
          {(service.name ?? "S").charAt(0).toUpperCase()}
        </div>
        {/* Name over category, mirroring the Products table's name-over-SKU
            cell. The group header already names the category, but it scrolls
            out of view on long lists — and it's the only cue when a service
            has none. */}
        <div className="slp__svc-name-wrap">
          <div className="slp__svc-name-row">
            <p className="slp__svc-name" title={service.name}>{service.name}</p>
            {service.is_active === false && (
              <span className="slp__svc-tag slp__svc-tag--inactive">Inactive</span>
            )}
          </div>
          <span className="slp__svc-category">
            {service.category_name || "Uncategorized"}
          </span>
        </div>
      </div>

      {/* Hours-first, e.g. "1 hr 30 min" — see utils/duration.ts for why sub-hour
          durations stay in minutes rather than becoming "0 hr 30 min". */}
      <div className="slp__svc-cell slp__svc-cell--time">
        <ClockHistory size={12} />
        {formatDuration(Number(service.duration) || 0)}
      </div>

      <div className="slp__svc-cell slp__svc-cell--staff">{staffLabel ?? "—"}</div>

      {/* Description doubles as the audience marker in practice — most services
          carry "Female"/"Male" here, the rest a tier label like "Premium
          service". Full text in the tooltip for the long ones. */}
      <div className="slp__svc-cell slp__svc-cell--desc">
        {description
          ? <span className="slp__svc-desc" title={description}>{description}</span>
          : <span className="slp__svc-cell--muted">—</span>}
      </div>

      <div className="slp__svc-cell slp__svc-cell--status">
        <span
          className={`slp__svc-status${service.online_booking ? "" : " slp__svc-status--off"}`}
        >
          {service.online_booking ? "Online" : "Offline"}
        </span>
      </div>

      {/* Commission, price and the kebab are each their own grid cell rather
          than one bundled cell — bundling made the final track size to its
          content, which differed from the header's and pushed every column
          out of line with its label. */}
      <span
        className={`slp__svc-commission${commissionLabel ? "" : " slp__svc-commission--none"}`}
        title={
          commissionLabel
            ? "This service pays this commission, overriding the staff member's rules"
            : "No override — commission follows the staff member's rules"
        }
      >
        {commissionLabel ?? "—"}
      </span>

      <span className="slp__svc-price">
        <CurrencyIcon size={14} />
        {service.price}
      </span>

      {/* Kebab menu for Edit / Delete */}
      <div className="slp__dd-wrap" onClick={(e) => e.stopPropagation()}>
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
    );
  },
);

ServiceCard.displayName = "ServiceCard";

export default ServiceCard;
