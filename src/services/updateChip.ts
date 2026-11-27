/**
 * "Update available" chip state (prototype: .update-chip on the dashboard).
 *
 * The update popup lives in a Portal from the root layout, but the chip it leaves
 * behind sits inline on the dashboard under the date. This tiny store is the link
 * between the two: the popup publishes the chip, the dashboard renders it.
 */
export type UpdateChipState = {
  /** Latest version, shown in the chip label when the server sent one. */
  version?: string | null;
  /** Reopens the update popup. */
  open: () => void;
};

let state: UpdateChipState | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach(listener => listener());
};

export const updateChip = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): UpdateChipState | null {
    return state;
  },
  show(next: UpdateChipState) {
    state = next;
    emit();
  },
  hide() {
    if (!state) return;
    state = null;
    emit();
  },
};
