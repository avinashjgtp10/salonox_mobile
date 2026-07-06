import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AppointmentModal from "../../bookings/components/modals/AppointmentModal";
import type { RootState } from "../../../store/store";

// Quick Sale now reuses the same AppointmentModal used by the Calendar, so a
// quick sale is just a walk-in appointment that skips straight to payment —
// it always creates a real appointment, visible on the calendar.
export default function QuickSalePage() {
  const navigate = useNavigate();
  const salonId  = useSelector((s: RootState) => (s as any).salon?.currentSalon?.id);

  const handleClose = useCallback(() => {
    navigate("/dashboard/sales/list");
  }, [navigate]);

  return (
    <AppointmentModal
      isOpen
      quickSale
      salonId={salonId}
      onClose={handleClose}
    />
  );
}
