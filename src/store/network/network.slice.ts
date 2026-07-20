import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "@/store";
import type { NetworkSnapshot } from "@/services/networkStatus";

type NetworkState = NetworkSnapshot & {
  retryCount: number;
};

const initialState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  isOnline: true,
  lastChangedAt: Date.now(),
  retryCount: 0,
};

const networkSlice = createSlice({
  name: "network",
  initialState,
  reducers: {
    networkStatusChanged(state, action: PayloadAction<NetworkSnapshot>) {
      const wasOnline = state.isOnline;

      state.isConnected = action.payload.isConnected;
      state.isInternetReachable = action.payload.isInternetReachable;
      state.isOnline = action.payload.isOnline;
      state.lastChangedAt = action.payload.lastChangedAt;

      if (!wasOnline && action.payload.isOnline) {
        state.retryCount += 1;
      }
    },
  },
});

export const { networkStatusChanged } = networkSlice.actions;

export const selectNetworkState = (state: RootState) => state.network;
export const selectIsOnline = (state: RootState) => state.network.isOnline;
export const selectNetworkRetryCount = (state: RootState) => state.network.retryCount;

export default networkSlice.reducer;
