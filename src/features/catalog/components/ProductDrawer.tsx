import React from "react";
import { useNavigate } from "react-router-dom";
import { X, PencilSquare, BoxSeam, Trash } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import "../styles/ProductDrawer.scss";

// ── Constants ─────────────────────────────────────────────────────────────────



// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductDrawerProps {
  product: any;
  brands: any[];
  categories: any[];
  loading: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ProductDrawer: React.FC<ProductDrawerProps> = ({
  product,
  brands,
  categories,
  loading: _loading,
  onClose,
  onDelete,
}) => {
  const navigate = useNavigate();

  const brandName  = brands.find((b: any) => b.id === product.brand_id)?.name ?? "—";
  const categoryName = categories.find((c: any) => c.id === product.category_id)?.name ?? "—";

  return (
    <>
      {/* Backdrop */}
      <div className="pd-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="pd-panel">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="pd-panel__header">
          <div className="pd-panel__header-left">
            <div className="pd-panel__icon"><BoxSeam size={18} /></div>
            <div className="pd-panel__info">
              <h6 className="pd-panel__title" title={product.name}>{product.name}</h6>
              <span className="pd-panel__sku">{product.barcode ?? "No SKU"}</span>
            </div>
          </div>
          <div className="pd-panel__header-actions">
            {onDelete && (
              <Button
                variant="outline-danger"
                size="sm"
                className="border-0 shadow-none"
                iconLeft={<Trash size={14} />}
                onClick={() => onDelete(product.id)}
              >
                Delete
              </Button>
            )}
            <Button
              variant="outline-dark"
              size="sm"
              iconLeft={<PencilSquare size={14} />}
              onClick={() => navigate(`/dashboard/catalog/products/edit/${product.id}`)}
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
            <Field label="Product name"   value={product.name} />
            <Field label="SKU / Barcode"  value={product.barcode ?? "—"} />
            <Field label="Brand"          value={brandName} />
            <Field label="Category"       value={categoryName} />
            <Field label="Stock level"    value={`${isNaN(parseFloat(product.amount)) ? 0 : parseFloat(product.amount)} in stock`} badge={
              (isNaN(parseFloat(product.amount)) ? 0 : parseFloat(product.amount)) <= 0 ? "out" : (isNaN(parseFloat(product.amount)) ? 0 : parseFloat(product.amount)) <= 5 ? "low" : undefined
            } />
          </section>

          <section className="pd-section">
            <h6 className="pd-section__title">Pricing</h6>
            <Field label="Supply price"  value={product.supply_price  != null ? `₹${Number(product.supply_price).toLocaleString()}` : "—"} />
            <Field label="Retail price"  value={product.retail_price  != null ? `₹${Number(product.retail_price).toLocaleString()}`  : "—"} />
            <Field label="Markup"        value={product.markup_percentage != null ? `${product.markup_percentage}%` : "—"} />
          </section>

          <section className="pd-section">
            <h6 className="pd-section__title">Commission</h6>
            <Field
              label="Team commission"
              value={product.team_commission_enabled ? "Enabled" : "Disabled"}
              badge={product.team_commission_enabled ? "on" : undefined}
            />
            {product.team_commission_enabled && (
              <Field label="Commission rate" value={`${product.team_commission_rate ?? 0}%`} />
            )}
          </section>

          {product.description && (
            <section className="pd-section">
              <h6 className="pd-section__title">Description</h6>
              <Field label="Full description" value={product.description} multiline />
            </section>
          )}
        </div>
      </div>
    </>
  );
};

// ── Field (view-mode row) ─────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  badge?: "low" | "out" | "on";
  multiline?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, badge, multiline }) => (
  <div className="pd-field">
    <span className="pd-field__label">{label}</span>
    <span className={`pd-field__value${multiline ? " pd-field__value--multiline" : ""}`}>
      {value}
      {badge === "out" && <span className="pd-badge pd-badge--danger ms-2">Out of stock</span>}
      {badge === "low" && <span className="pd-badge pd-badge--warning ms-2">Low stock</span>}
      {badge === "on"  && <span className="pd-badge pd-badge--success ms-2">Active</span>}
    </span>
  </div>
);

export default ProductDrawer;
