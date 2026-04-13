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
import storageSession from "redux-persist/lib/storage/session";

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
import schedulerReducer from "./schedulerSlice";
import marketingReducer from "./marketingSlice";
import reportReducer from "./reportSlice";
import productsReducer from "./productsSlice";

// Security policy:
//   accessToken  → NOT persisted (15-min lifetime; re-issued by the 401 interceptor)
//   refreshToken → sessionStorage (cleared when browser tab closes, not accessible cross-tab)
//   isOnboardingComplete → sessionStorage alongside refreshToken (non-sensitive UI flag)
// localStorage is NOT used for any auth data — prevents XSS token theft via localStorage.
const authPersistConfig = {
  key: "auth",
  storage: storageSession,
  whitelist: ["refreshToken", "isOnboardingComplete"],
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
    scheduler: schedulerReducer,
    marketing: marketingReducer,
    report: reportReducer,
    products: productsReducer,
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
