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
import schedulerReducer from "./schedulerSlice";
import marketingReducer from "./marketingSlice";
import reportReducer from "./reportSlice";
import servicesReducer from "./servicesSlice";
import categoriesReducer from "./categoriesSlice";
import serviceFiltersReducer from "./serviceFiltersSlice";
import membershipReducer from "./membershipSlice";
import inventoryReducer from "./inventorySlice";
import { membershipsApi } from "../services/api/endpoints/memberships.endpoints";
import { packagesApi } from "../services/api/endpoints/packages.endpoints";
import productsReducer from "./productsSlice";
import shiftReducer from "./shiftSlice";
import payRunReducer from "./payRunSlice";
import dashboardReducer from "./dashboardSlice";

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
    scheduler: schedulerReducer,
    marketing: marketingReducer,
    report: reportReducer,
    services: servicesReducer,
    categories: categoriesReducer,
    serviceFilters: serviceFiltersReducer,
    memberships: membershipReducer,
    inventory: inventoryReducer,
    [membershipsApi.reducerPath]: membershipsApi.reducer,
    [packagesApi.reducerPath]: packagesApi.reducer,
    products: productsReducer,
    shift: shiftReducer,
    payRun: payRunReducer,
    dashboard: dashboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(membershipsApi.middleware)
      .concat(packagesApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
