import NetInfo from "@react-native-community/netinfo";
import { useEffect } from "react";

import { setNetworkSnapshot } from "@/services/networkStatus";
import { useAppDispatch } from "@/store/hooks";
import { networkStatusChanged } from "@/store/network/network.slice";

const toOnlineState = (isConnected: boolean | null, isInternetReachable: boolean | null) =>
  Boolean(isConnected) && isInternetReachable !== false;

export const useNetworkMonitor = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const updateNetworkState = (isConnected: boolean | null, isInternetReachable: boolean | null) => {
      const snapshot = {
        isConnected,
        isInternetReachable,
        isOnline: toOnlineState(isConnected, isInternetReachable),
      };

      setNetworkSnapshot(snapshot);
      dispatch(networkStatusChanged({ ...snapshot, lastChangedAt: Date.now() }));
    };

    void NetInfo.fetch().then((state) => {
      updateNetworkState(state.isConnected, state.isInternetReachable);
    });

    return NetInfo.addEventListener((state) => {
      updateNetworkState(state.isConnected, state.isInternetReachable);
    });
  }, [dispatch]);
};
