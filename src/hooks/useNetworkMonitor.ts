import NetInfo from "@react-native-community/netinfo";
import { useEffect } from "react";

import { getNetworkSnapshot, setNetworkSnapshot, subscribeNetworkSnapshot } from "@/services/networkStatus";
import { useAppDispatch } from "@/store/hooks";
import { networkStatusChanged } from "@/store/network/network.slice";

const toOnlineState = (isConnected: boolean | null, isInternetReachable: boolean | null) =>
  isConnected === false || isInternetReachable === false
    ? false
    : isConnected === true ? true : getNetworkSnapshot().isOnline;

export const useNetworkMonitor = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const updateNetworkState = (isConnected: boolean | null, isInternetReachable: boolean | null) => {
      const snapshot = {
        isConnected,
        isInternetReachable,
        isOnline: toOnlineState(isConnected, isInternetReachable),
      };

      const current = getNetworkSnapshot();
      if (current.isConnected === isConnected && current.isInternetReachable === isInternetReachable && current.isOnline === snapshot.isOnline) {
        // Keep Redux aligned after a session reset without changing timestamps
        // or notifying pending requests for duplicate reachability events.
        dispatch(networkStatusChanged(current));
        return;
      }

      setNetworkSnapshot(snapshot);
    };

    // Every snapshot change, including ones the API layer detects, reaches Redux.
    const unsubscribeSnapshot = subscribeNetworkSnapshot((snapshot) => dispatch(networkStatusChanged(snapshot)));
    let active = true;
    void NetInfo.fetch().then((state) => {
      if (!active) return;
      updateNetworkState(state.isConnected, state.isInternetReachable);
    }).catch(() => { /* An unsuccessful reachability check does not prove offline. */ });

    const unsubscribe = NetInfo.addEventListener((state) => {
      updateNetworkState(state.isConnected, state.isInternetReachable);
    });
    return () => { active = false; unsubscribe(); unsubscribeSnapshot(); };
  }, [dispatch]);
};
