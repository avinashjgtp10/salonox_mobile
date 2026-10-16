export type NetworkSnapshot = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOnline: boolean;
  lastChangedAt: number;
};

const DEFAULT_SNAPSHOT: NetworkSnapshot = {
  isConnected: true,
  isInternetReachable: true,
  isOnline: true,
  lastChangedAt: Date.now(),
};

let currentSnapshot = DEFAULT_SNAPSHOT;
const onlineWaiters = new Set<() => void>();
const snapshotListeners = new Set<(snapshot: NetworkSnapshot) => void>();

export const subscribeNetworkSnapshot = (listener: (snapshot: NetworkSnapshot) => void) => {
  snapshotListeners.add(listener);
  return () => {
    snapshotListeners.delete(listener);
  };
};

export const getNetworkSnapshot = () => currentSnapshot;

export const isNetworkOnline = () => currentSnapshot.isOnline;

export const setNetworkSnapshot = (snapshot: Omit<NetworkSnapshot, "lastChangedAt">) => {
  const wasOnline = currentSnapshot.isOnline;

  currentSnapshot = {
    ...snapshot,
    lastChangedAt: Date.now(),
  };

  snapshotListeners.forEach((listener) => listener(currentSnapshot));

  if (!wasOnline && currentSnapshot.isOnline) {
    const waiters = Array.from(onlineWaiters);
    onlineWaiters.clear();
    waiters.forEach((resolve) => resolve());
  }
};

export const waitForNetworkOnline = () => {
  if (currentSnapshot.isOnline) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    onlineWaiters.add(resolve);
  });
};
