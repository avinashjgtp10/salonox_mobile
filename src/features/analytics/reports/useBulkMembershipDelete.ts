import { useState } from "react";
import api from "../../../services/api/axios";

// Shared bulk-select + bulk-delete logic for the Membership Sale Report —
// mirrors useBulkAppointmentDelete.ts's shape exactly (same field names) so
// it drops into BulkDeleteBar/BulkDeleteConfirmModal unchanged, but deletes
// client_memberships rows one at a time via DELETE /api/v1/client-memberships/:id
// (there's no bulk endpoint for memberships, unlike the Appointment API's
// POST /bulk-delete) since each delete also reverses that membership's own
// sale/commission/usage history — the same per-row cleanup the single-row
// delete already did, just looped.
export function useBulkMembershipDelete(onDeleted: () => void) {
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

  const selectAll = (ids: string[]) => {
    setSelectedIds(prev => new Set([...prev, ...ids]));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const confirmDelete = async () => {
    setDeleting(true);
    setError(null);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map(id => api.delete(`/api/v1/client-memberships/${id}`)),
    );
    const failed = results.filter(r => r.status === "rejected").length;
    setDeleting(false);
    if (failed > 0 && failed === ids.length) {
      setError("Failed to delete selected memberships");
      return;
    }
    setShowConfirm(false);
    clearSelection();
    onDeleted();
    if (failed > 0) {
      setSuccessMessage(`${ids.length - failed} of ${ids.length} memberships deleted — ${failed} failed`);
    } else {
      setSuccessMessage(`${ids.length} membership${ids.length !== 1 ? "s" : ""} deleted successfully`);
    }
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return {
    selectedIds, toggleOne, toggleAll, selectAll, clearSelection,
    showConfirm, setShowConfirm, deleting, error, setError,
    successMessage, confirmDelete,
  };
}
