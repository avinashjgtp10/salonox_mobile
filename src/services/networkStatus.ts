export type NetworkSnapshot = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOnline: boolean;
  lastChangedAt: number;
};

type NetworkListener = (snapshot: NetworkSnapshot) => void;

const DEFAULT_SNAPSHOT: NetworkSnapshot = {
  isConnected: true,
  isInternetReachable: true,
  isOnline: true,
  lastChangedAt: Date.now(),
};

let currentSnapshot = DEFAULT_SNAPSHOT;
const listeners = new Set<NetworkListener>();
const onlineWaiters = new Set<() => void>();

export const getNetworkSnapshot = () => currentSnapshot;

export const isNetworkOnline = () => currentSnapshot.isOnline;

export const addNetworkStatusListener = (listener: NetworkListener) => {
  listeners.add(listener);
  listener(currentSnapshot);

  return () => {
    listeners.delete(listener);
  };
};

export const setNetworkSnapshot = (snapshot: Omit<NetworkSnapshot, "lastChangedAt">) => {
  const wasOnline = currentSnapshot.isOnline;

  currentSnapshot = {
    ...snapshot,
    lastChangedAt: Date.now(),
  };

  listeners.forEach((listener) => listener(currentSnapshot));

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
