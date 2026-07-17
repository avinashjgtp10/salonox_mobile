// src/components/packages/SellPackageModal.tsx
//
// Pops the package-creation form up as an overlay directly over the Calendar
// instead of navigating away to the Catalog page — same pattern as
// ClientHistoryModal.tsx ("Opens as a popup over the calendar instead of
// navigating away... staff stay on the appointment they were working on").
// Reuses PackageCreateForm as-is (already a standalone, prop-driven
// component with its own client picker, template picker, and payment
// method picker) — this is a new entry point into it, not a second
// implementation of package creation.
import { useEffect, useState } from "react";
import PackageCreateForm from "./PackageCreateForm";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import type { ClientPackage } from "../../services/api/endpoints/packages.endpoints";
import "../../features/clients/styles/ClientHistoryModal.scss";
import "./SellPackageModal.scss";

interface SellPackageModalProps {
  /** The client already selected on the Calendar — pre-fills the form. */
  initialClient: ClientSearchResult;
  onClose: () => void;
  onSaved?: (pkg: ClientPackage) => void;
}

export default function SellPackageModal({ initialClient, onClose, onSaved }: SellPackageModalProps) {
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(initialClient);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="chm-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="chm-panel spm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="spm-scroll">
          <PackageCreateForm
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            onCancel={onClose}
            onSaved={(pkg) => { onSaved?.(pkg); onClose(); }}
          />
        </div>
      </div>
    </div>
  );
}
