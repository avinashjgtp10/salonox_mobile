import { useState } from "react";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";

// Shared bulk-select + bulk-delete logic for report tables whose rows map to
// real appointments (Appointment Detail, Sales Summary, Daily Sheet). Deletion
// itself goes through the real Appointment API (POST /bulk-delete), never raw
// SQL here — unlike report reads, a delete is a mutating write with business
// rules (hard delete of the appointment plus its payments/sale/commissions,
// and stock restore) that must stay centralized in appointments.service.ts.
export function useBulkAppointmentDelete(onDeleted: () => void) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const confirmDelete = async () => {
    setDeleting(true);
    setError(null);
    const count = selectedIds.size;
    try {
      await api.post(BOOKING.BULK_DELETE, { ids: Array.from(selectedIds) });
      setShowConfirm(false);
      clearSelection();
      onDeleted();
      setSuccessMessage(`${count} appointment${count !== 1 ? "s" : ""} deleted successfully`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to delete selected appointments");
    } finally {
      setDeleting(false);
    }
  };

  return {
    selectedIds, toggleOne, toggleAll, clearSelection,
    showConfirm, setShowConfirm, deleting, error, setError,
    successMessage, confirmDelete,
  };
}
