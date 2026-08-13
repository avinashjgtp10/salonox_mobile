import { selectNetworkState } from "@/store/network/network.slice";

import { useAppSelector } from "@/store/hooks";

export const useNetworkStatus = () => useAppSelector(selectNetworkState);
