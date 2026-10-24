// One-shot "open Quick Sale" request from the dashboard to the Calendar tab.
// Kept outside navigation params: pushing params into an already-mounted tab
// is unreliable, while this reaches the Calendar whether it is mounted or not.

let pendingRequest: number | null = null;
const listeners = new Set<() => void>();

/** Ask the Calendar to open Quick Sale (staff picked in Quick Sale itself). */
export function requestQuickSaleLaunch() {
  pendingRequest = Date.now();
  listeners.forEach((listener) => listener());
}

export function subscribeQuickSaleLaunch(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getQuickSaleLaunch = () => pendingRequest;

/** Mark the request handled so it never opens Quick Sale twice. */
export function consumeQuickSaleLaunch() {
  pendingRequest = null;
  listeners.forEach((listener) => listener());
}
