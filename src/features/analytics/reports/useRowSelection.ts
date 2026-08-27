import { useState } from "react";

// Generic row-selection state shared by every report that wires in
// SendCampaignModal — mirrors useBulkAppointmentDelete.ts's selection half,
// minus the delete-specific parts, since "select rows, then act on them" is
// identical whether the action is deleting appointments or sending a
// campaign to clients.
export function useRowSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  return { selectedIds, toggleOne, toggleAll, clearSelection };
}
