import React from "react";
import { currencySymbol } from "../../../../utils/currency";
import ServiceRow from "./ServiceRow";
import { Trash } from "react-bootstrap-icons";
import type { ServiceItem, PackageItem, ProductItem, MembershipItem } from "../../types";

interface Props {
  serviceRows: ServiceItem[];
  onUpdateService: (index: number, field: string, value: any) => void;
  onRemoveService: (index: number) => void;
  onAddService: () => void;

  packageRows: PackageItem[];
  onUpdatePackage: (index: number, row: PackageItem) => void;
  onRemovePackage: (index: number) => void;
  onAddPackage: () => void;

  productRows: ProductItem[];
  onUpdateProduct: (index: number, row: ProductItem) => void;
  onRemoveProduct: (index: number) => void;
  onAddProduct: () => void;

  membershipRows: MembershipItem[];
  onUpdateMembership: (index: number, row: MembershipItem) => void;
  onRemoveMembership: (index: number) => void;
  onAddMembership: () => void;

  availablePackages: any[];
  availableProducts: any[];
  availableMemberships: any[];
  frozen?: boolean;

  svcErrors?: Array<{ service?: boolean; staff?: boolean; time?: boolean }>;
  pkgErrors?: boolean[];
  prodErrors?: boolean[];
  memErrors?: boolean[];
  onClearSvcError?: (index: number, field: string) => void;
}

export const ServicesPanel: React.FC<Props> = ({
  serviceRows, onUpdateService, onRemoveService, onAddService,
  packageRows, onUpdatePackage, onRemovePackage, onAddPackage,
  productRows, onUpdateProduct, onRemoveProduct, onAddProduct,
  membershipRows, onUpdateMembership, onRemoveMembership, onAddMembership,
  availablePackages, availableProducts, availableMemberships,
  frozen,
  svcErrors, pkgErrors, prodErrors, memErrors, onClearSvcError,
}) => (
  <div className="services-panel">
    {serviceRows.map((row, i) => (
      <ServiceRow
        key={`svc-${(row as any).tempId || i}`}
        row={{ ...row, tempId: (row as any).tempId || String(i) } as any}
        disabled={frozen}
        errorFields={svcErrors?.[i] ?? {}}
        onClearError={(_id, field) => onClearSvcError?.(i, field)}
        onChange={(_id: string, field: string, value: any) => {
          onUpdateService(i, field, value);
        }}
        onRemove={() => onRemoveService(i)}
      />
    ))}

    {packageRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--package">
          <span>Package</span><span>Price</span><span>Qty</span><span>Total</span><span />
        </div>
        {packageRows.map((row, i) => (
          <div key={`pkg-${i}`} className="item-row">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <select
                className={`svc-field__input${pkgErrors?.[i] ? " svc-field__input--error" : ""}`}
                disabled={frozen}
                value={(row as any).packageId || ""}
                onChange={(e) => {
                  const pkg = availablePackages.find((p: any) => String(p.id) === e.target.value);
                  if (pkg) onUpdatePackage(i, { ...row, packageId: pkg.id, packageName: pkg.name, price: pkg.price, qty: 1, total: pkg.price });
                }}
              >
                <option value="">Select package…</option>
                {availablePackages.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {pkgErrors?.[i] && <span className="svc-field__err">Please select a package</span>}
            </div>
            <input className="svc-field__input svc-field__input--readonly" readOnly value={row.price ? `${currencySymbol}${row.price}` : "—"} />
            <input
              className="svc-field__input"
              type="number" min={1} disabled={frozen} value={row.qty}
              onChange={(e) => onUpdatePackage(i, { ...row, qty: Number(e.target.value), total: row.price * Number(e.target.value) })}
            />
            <input className="svc-field__input svc-field__input--readonly" readOnly value={`${currencySymbol}${row.total.toFixed(2)}`} />
            {!frozen
              ? <button className="svc-del-btn" onClick={() => onRemovePackage(i)}><Trash size={13} /></button>
              : <span />}
          </div>
        ))}
      </>
    )}

    {productRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--product">
          <span>Product</span><span>Price</span><span>Qty</span><span>Total</span><span />
        </div>
        {productRows.map((row, i) => (
          <div key={`prod-${i}`} className="item-row">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <select
                className={`svc-field__input${prodErrors?.[i] ? " svc-field__input--error" : ""}`}
                disabled={frozen}
                value={(row as any).productId || ""}
                onChange={(e) => {
                  const p = availableProducts.find((pr: any) => String(pr.id) === e.target.value);
                  if (p) onUpdateProduct(i, { ...row, productId: p.id, productName: p.name, price: p.price ?? 0, qty: 1, total: p.price ?? 0 });
                }}
              >
                <option value="">Select product…</option>
                {availableProducts.map((p: any) => {
                  const oos = p.stock !== undefined && p.stock <= 0;
                  return (
                    <option key={p.id} value={p.id} style={oos ? { color: "#dc2626" } : undefined}>
                      {p.name}{oos ? " (Out of stock)" : ""}
                    </option>
                  );
                })}
              </select>
              {prodErrors?.[i] && <span className="svc-field__err">Please select a product</span>}
            </div>
            <input className="svc-field__input svc-field__input--readonly" readOnly value={row.price ? `${currencySymbol}${row.price}` : "—"} />
            <input
              className="svc-field__input"
              type="number" min={1} disabled={frozen} value={row.qty}
              onChange={(e) => onUpdateProduct(i, { ...row, qty: Number(e.target.value), total: row.price * Number(e.target.value) })}
            />
            <input className="svc-field__input svc-field__input--readonly" readOnly value={`${currencySymbol}${row.total.toFixed(2)}`} />
            {!frozen
              ? <button className="svc-del-btn" onClick={() => onRemoveProduct(i)}><Trash size={13} /></button>
              : <span />}
          </div>
        ))}
      </>
    )}

    {membershipRows.length > 0 && (
      <>
        <div className="item-section-header item-section-header--membership">
          <span>Membership</span><span>Price</span><span>Qty</span><span>Total</span><span />
        </div>
        {membershipRows.map((row, i) => (
          <div key={`mem-${i}`} className="item-row">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <select
                className={`svc-field__input${memErrors?.[i] ? " svc-field__input--error" : ""}`}
                disabled={frozen}
                value={(row as any).membershipId || ""}
                onChange={(e) => {
                  const m = availableMemberships.find((mb: any) => String(mb.id) === e.target.value);
                  if (m) onUpdateMembership(i, { ...row, membershipId: m.id, membershipName: m.name, price: m.price, qty: 1, total: m.price });
                }}
              >
                <option value="">Select membership…</option>
                {availableMemberships.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {memErrors?.[i] && <span className="svc-field__err">Please select a membership</span>}
            </div>
            <input className="svc-field__input svc-field__input--readonly" readOnly value={row.price ? `${currencySymbol}${row.price}` : "—"} />
            <input
              className="svc-field__input"
              type="number" min={1} disabled={frozen} value={row.qty}
              onChange={(e) => onUpdateMembership(i, { ...row, qty: Number(e.target.value), total: row.price * Number(e.target.value) })}
            />
            <input className="svc-field__input svc-field__input--readonly" readOnly value={`${currencySymbol}${row.total.toFixed(2)}`} />
            {!frozen
              ? <button className="svc-del-btn" onClick={() => onRemoveMembership(i)}><Trash size={13} /></button>
              : <span />}
          </div>
        ))}
      </>
    )}

    {!frozen && (
      <div className="add-row-actions">
        <button className="add-row-btn" onClick={onAddService}>+ Service</button>
        <button className="add-row-btn" onClick={onAddPackage}>+ Package</button>
        <button className="add-row-btn" onClick={onAddProduct}>+ Product</button>
        <button className="add-row-btn" onClick={onAddMembership}>+ Membership</button>
      </div>
    )}
  </div>
);

export default ServicesPanel;