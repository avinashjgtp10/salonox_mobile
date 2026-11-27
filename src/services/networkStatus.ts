import NetInfo from "@react-native-community/netinfo";

import { environmentConfig } from "@/config/environment";

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

// NetInfo decides isInternetReachable by probing a URL, and its default is
// https://clients3.google.com/generate_204. On a connection where that probe
// is slow, filtered or blocked — common on salon Wi-Fi and some Indian ISPs —
// the whole app declares itself offline while every other app, and our own
// API, work perfectly. Probe our own API host instead: that is the only
// reachability this app actually cares about.
//
// Any answer from the host proves the connection works, a 404 included; only
// a server error or no answer at all counts as unreachable.
NetInfo.configure({
  reachabilityUrl: `${environmentConfig.apiBaseUrl}/health`,
  reachabilityTest: async (response) => response.status < 500,
  reachabilityRequestTimeout: 10_000,
  // While unreachable, re-check often so recovery is picked up quickly; while
  // reachable, rarely, so thousands of phones aren't polling our own server
  // once a minute. A successful API call marks us online in between anyway.
  reachabilityShortTimeout: 10_000,
  reachabilityLongTimeout: 5 * 60_000,
});

// How long a queued read waits for the connection to come back before it is
// sent anyway. Without a bound, one wrong "offline" verdict leaves the request
// parked forever and the screen spinning, because the axios timeout cannot
// start until the request is actually sent.
const ONLINE_WAIT_TIMEOUT_MS = 8000;

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

/**
 * A request that succeeds is proof the connection works, whatever the probe
 * thinks. Positive evidence from a real API call outranks the probe, so one
 * bad reachability result cannot keep the app stuck in offline mode.
 */
export const markNetworkOnline = () => {
  if (currentSnapshot.isOnline) {
    return;
  }

  setNetworkSnapshot({ isConnected: true, isInternetReachable: true, isOnline: true });
};

export const waitForNetworkOnline = (timeoutMs = ONLINE_WAIT_TIMEOUT_MS) => {
  if (currentSnapshot.isOnline) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      onlineWaiters.delete(finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);

    onlineWaiters.add(finish);
  });
};
