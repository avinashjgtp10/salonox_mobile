import { configureStore, type Reducer } from "@reduxjs/toolkit";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

import authReducer, { type AuthState } from "./authSlice";
import salonReducer from "./salonSlice";
import clientReducer from "./clientSlice";
import userReducer from "./userSlice";
import staffReducer from "./staffSlice";
import saleReducer from "./saleSlice";
import catalogReducer from "./catalogSlice";
import calendarReducer from "./calendarSlice";
import bookingReducer from "./bookingSlice";
import settingReducer from "./settingSlice";
import appReducer from "./appSlice";

const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: ["accessToken", "refreshToken", "isOnboardingComplete"],
};

export const store = configureStore({
  reducer: {
    auth: persistReducer(
      authPersistConfig,
      authReducer,
    ) as unknown as Reducer<AuthState>,
    salon: salonReducer,
    client: clientReducer,
    user: userReducer,
    staff: staffReducer,
    sale: saleReducer,
    catalog: catalogReducer,
    calendar: calendarReducer,
    booking: bookingReducer,
    setting: settingReducer,
    app: appReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
