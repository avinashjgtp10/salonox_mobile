import Modal from "../../../components/ui/Modal";
import { StaffHistoryContent } from "../pages/StaffHistoryDetailPage";
import type { TabKey } from "../pages/StaffHistoryDetailPage";
import "../styles/StaffHistoryPage.scss";

interface Props {
  staffId: string | null;
  onClose: () => void;
  /** Defaults to "sales" — this modal's one caller so far (the Staff
   *  Performance report) is itself a sales/revenue view, so landing on the
   *  Sales tab first matches what the user came here to check. */
  initialTab?: TabKey;
}

// Same tabbed staff-history content as the full StaffHistoryDetailPage route,
// opened as a popup instead — used where clicking a row (e.g. the Staff
// Performance report) should show the history without navigating away.
export default function StaffHistoryModal({ staffId, onClose, initialTab = "sales" }: Props) {
  return (
    <Modal show={!!staffId} onClose={onClose} title="Staff History" size="xl">
      {staffId && <StaffHistoryContent staffId={staffId} initialTab={initialTab} />}
    </Modal>
  );
}
