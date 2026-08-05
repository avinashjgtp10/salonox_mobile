import { useState } from "react";

// Shared draft/Apply/Clear/× lifecycle for every report's Filters modal.
// Dropdowns inside the modal only ever edit `draft` — nothing reaches the
// report's real filter state (and triggers a refetch) until `apply()` is
// called. `clear()` resets both the draft AND the real committed filters and
// closes; closing any other way (×, overlay click) just discards the draft.
//
// `committed`/`setCommitted` are the report's own already-existing filter
// state (however many separate useState calls that is) — bundle them into
// one object when calling this hook, e.g.:
//
//   const [serviceFilter, setServiceFilter] = useState("All");
//   const [staffFilters, setStaffFilters] = useState<string[]>([]);
//   const filters = useDraftFilters(
//     { service: serviceFilter, staff: staffFilters },
//     (v) => { setServiceFilter(v.service); setStaffFilters(v.staff); },
//     { service: "All", staff: [] },
//   );
//
// Then in the modal: value={filters.draft.service} onChange={v => filters.setDraftField("service", v)}
export function useDraftFilters<T extends Record<string, any>>(
  committed: T,
  setCommitted: (value: T) => void,
  defaults: T,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<T>(committed);

  const setDraftField = <K extends keyof T>(key: K, value: T[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const openPanel = () => {
    setDraft(committed);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const apply = () => {
    setCommitted(draft);
    setIsOpen(false);
  };

  const clear = () => {
    setDraft(defaults);
    setCommitted(defaults);
    setIsOpen(false);
  };

  return { isOpen, draft, setDraft, setDraftField, openPanel, closePanel, apply, clear };
}
