import React from "react";
import { useNavigate } from "react-router-dom";
import { X, PencilSquare, Trash3, Scissors } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import type { Service } from "../types/catalog.types";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatDuration } from "../utils/duration";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import "../styles/ProductDrawer.scss";

// Built on the same `pd-` panel system as ProductDrawer (and shaped like the
// Consumable panel) rather than its own `sdp-` styles, so the three catalog
// side panels are genuinely identical instead of three lookalikes that drift.
// Importing the same stylesheet is what guarantees that.

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
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const { formatAmount } = useCurrency();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  const money = (value: string | number | null | undefined) => {
    const parsed = parseFloat(String(value ?? 0));
    return formatAmount(Number.isFinite(parsed) ? parsed : 0);
  };

  // staff_count comes from the list response; `staff` only from GET-by-id. Zero
  // of either means "every staff member, including future hires" — never
  // "nobody" — so it reads as "All staff".
  const staffCount = service.staff_count ?? service.staff?.length;
  const staffLabel =
    staffCount === undefined
      ? "—"
      : staffCount === 0
        ? "All staff"
        : `${staffCount} selected`;

  const commissionLabel =
    service.commission_rate === null || service.commission_rate === undefined
      ? null
      : service.commission_kind === "fixed"
        ? money(service.commission_rate)
        : `${Number(service.commission_rate)}%`;

  const consumables = service.consumables_used ?? [];

  return (
    <>
      <div className="pd-backdrop" onClick={onClose} />

      <div className="pd-panel" role="dialog" aria-modal="true" aria-label="Service details">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="pd-panel__header">
          <div className="pd-panel__header-left">
            <div className="pd-panel__icon"><Scissors size={18} /></div>
            <div className="pd-panel__info">
              <h6 className="pd-panel__title" title={service.name}>{service.name}</h6>
              <span className="pd-panel__sku">{service.category_name || "Uncategorized"}</span>
            </div>
          </div>
          <div className="pd-panel__header-actions">
            <Button
              variant="outline-dark"
              size="sm"
              iconLeft={<PencilSquare size={14} />}
              style={!can("edit_services") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => {
                if (!can("edit_services")) { denyPerm("edit_services"); return; }
                navigate(`/dashboard/catalog/services/${service.id}/edit`);
              }}
            >
              Edit
            </Button>
            <button className="pd-panel__close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="pd-panel__body">
          <section className="pd-section">
            <h6 className="pd-section__title">Basic info</h6>
            <Field label="Service name" value={service.name} />
            <Field label="Category"     value={service.category_name || "Uncategorized"} />
            <Field label="Duration"     value={formatDuration(Number(service.duration) || 0)} />
            <Field label="Staff"        value={staffLabel} />
            <Field
              label="Status"
              value={service.is_active === false ? "Inactive" : "Active"}
              badge={service.is_active === false ? "off" : "on"}
            />
            <Field
              label="Online booking"
              value={service.online_booking ? "Enabled" : "Disabled"}
              badge={service.online_booking ? "on" : "off"}
            />
            <Field
              label="Service reminder"
              value={service.reminder_after_days ? `Redo after ${service.reminder_after_days} days` : "Not set"}
            />
          </section>

          <section className="pd-section">
            <h6 className="pd-section__title">Pricing</h6>
            <Field label="Price" value={money(service.price)} />
            {/* Only surfaced when it isn't the default — every service is
                "fixed" today, so showing it always would be noise. */}
            {service.price_type && service.price_type !== "fixed" && (
              <Field label="Price type" value={service.price_type} />
            )}
          </section>

          <section className="pd-section">
            <h6 className="pd-section__title">Commission</h6>
            {/* No override is not "no commission" — the service still earns
                under the staff member's own rules, so say that rather than
                showing a bare dash. */}
            <Field
              label="Rate"
              value={commissionLabel ?? "Follows staff rules"}
              badge={commissionLabel ? "on" : undefined}
            />
            {commissionLabel && (
              <Field
                label="Type"
                value={service.commission_kind === "fixed" ? "Fixed amount per service" : "Percentage of price"}
              />
            )}
          </section>

          {consumables.length > 0 && (
            <section className="pd-section">
              <h6 className="pd-section__title">Consumables</h6>
              {consumables.map((c, i) => (
                <Field
                  key={c.product_id ?? i}
                  label={c.product_name || "Product"}
                  value={`${c.qty} ${c.unit ?? ""}`.trim()}
                />
              ))}
            </section>
          )}

          {service.description && (
            <section className="pd-section">
              <h6 className="pd-section__title">Description</h6>
              <Field label="Full description" value={service.description} multiline />
            </section>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="pd-panel__footer">
          <Button
            variant="outline-danger"
            size="sm"
            iconLeft={<Trash3 size={14} />}
            onClick={() => onDelete(service)}
          >
            Delete
          </Button>
        </div>
      </div>
    </>
  );
};

// ── Field (view-mode row) ─────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  badge?: "on" | "off";
  multiline?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, badge, multiline }) => (
  <div className="pd-field">
    <span className="pd-field__label">{label}</span>
    <span className={`pd-field__value${multiline ? " pd-field__value--multiline" : ""}`}>
      {value}
      {badge === "on" && <span className="pd-badge pd-badge--success ms-2">On</span>}
      {badge === "off" && <span className="pd-badge pd-badge--warning ms-2">Off</span>}
    </span>
  </div>
);

export default ServiceDetailPanel;
