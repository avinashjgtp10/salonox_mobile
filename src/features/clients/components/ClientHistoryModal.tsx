// src/features/clients/components/ClientHistoryModal.tsx
//
// Pops the client history view up as an overlay instead of navigating away —
// used by the calendar's "View History" button so staff stay on the calendar.
import { useEffect } from "react";
import ClientHistoryDetail, { type TabKey } from "./ClientHistoryDetail";
import "../styles/ClientHistoryPage.scss";
import "../styles/ClientHistoryModal.scss";

interface ClientHistoryModalProps {
  clientId: string;
  onClose: () => void;
  /** Which tab to land on when opened — defaults to "history" (Visit History). */
  initialTab?: TabKey;
}

export default function ClientHistoryModal({ clientId, onClose, initialTab }: ClientHistoryModalProps) {
  // Close on Escape, same convention as the app's other modals/drawers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="chm-overlay" onClick={onClose}>
      <div className="chm-panel" onClick={(e) => e.stopPropagation()}>
        {/* Reuses .chp-root's own CSS cascade (chp-content-wrap/chp-idle/etc. are
            all SCSS-nested under it) — the --modal modifier just drops the
            sidebar-flex layout the full page uses, nothing else changes. */}
        <div className="chp-root chp-root--modal">
          <ClientHistoryDetail clientId={clientId} onClose={onClose} initialTab={initialTab} />
        </div>
      </div>
    </div>
  );
}
