// src/features/catalog/components/SellMembershipCalendarModal.tsx
//
// Pops the membership-creation form up as an overlay directly over the
// Calendar instead of navigating away to the Catalog page — same pattern as
// SellPackageModal.tsx / ClientHistoryModal.tsx. Reuses MembershipCreateForm
// as-is (already a standalone, prop-driven component) — this is a new entry
// point into it, not a second implementation of membership creation.
import { useEffect, useState } from "react";
import MembershipCreateForm from "./MembershipCreateForm";
import type { ClientSearchResult } from "../../clients/components/ClientSearchInput";
import "../../clients/styles/ClientHistoryModal.scss";
import "../../../components/packages/SellPackageModal.scss";

interface SellMembershipCalendarModalProps {
  /** The client already selected on the Calendar — pre-fills the form. */
  initialClient: ClientSearchResult;
  onClose: () => void;
  onSaved?: (result: { membershipId: string; name: string }) => void;
}

export default function SellMembershipCalendarModal({
  initialClient, onClose, onSaved,
}: SellMembershipCalendarModalProps) {
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
          <MembershipCreateForm
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            onCancel={onClose}
            onSaved={(result) => { onSaved?.(result); onClose(); }}
          />
        </div>
      </div>
    </div>
  );
}
