import React, { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import type { AssignedServiceRow } from "../../../types/inventory.types";
import "../styles/AssignedServicesPopup.scss";

interface Props {
  productId: string;
  productName: string;
  onClose: () => void;
}

// Thin Service/Usage list for the Consumable Inventory table's "Assigned
// Services" click — a lighter-weight fetch than opening the full side panel
// (which also loads usage stats, recent consumption, unit conversions).
const AssignedServicesPopup: React.FC<Props> = ({ productId, productName, onClose }) => {
  const [rows, setRows] = useState<AssignedServiceRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(INVENTORY.CONSUMABLE_ASSIGNED_SERVICES(productId));
        if (!cancelled) setRows(res.data?.data ?? []);
      } catch {
        if (!cancelled) setError("Failed to load assigned services — try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  return (
    <div className="asp-overlay" onClick={onClose}>
      <div className="asp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="asp-modal__header">
          <h3>Assigned Services</h3>
          <button type="button" className="asp-modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="asp-modal__subtitle">{productName}</p>

        {error && <p className="asp-modal__error">{error}</p>}

        {!error && rows === null ? (
          <p className="asp-modal__empty">Loading…</p>
        ) : !error && rows!.length === 0 ? (
          <p className="asp-modal__empty">Not assigned to any service.</p>
        ) : !error ? (
          <div className="asp-table">
            <div className="asp-table__header">
              <span>Service</span>
              <span>Usage</span>
            </div>
            {rows!.map((r) => (
              <div className="asp-table__row" key={r.service_id}>
                <span>{r.name}</span>
                <span>{r.qty} {r.unit || ""}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AssignedServicesPopup;
