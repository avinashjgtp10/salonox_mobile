import { configureStore, type Reducer } from "@reduxjs/toolkit";
// @ts-ignore
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
// @ts-ignore
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
import inboxReducer from "./inboxSlice";
import reportReducer from "./reportSlice";
import servicesReducer from "./servicesSlice";
import categoriesReducer from "./categoriesSlice";
import serviceFiltersReducer from "./serviceFiltersSlice";
import membershipReducer from "./membershipSlice";
import inventoryReducer from "./inventorySlice";
import { membershipsApi } from "../services/api/endpoints/memberships.endpoints";
import { packagesApi, clientPackagesApi, packageTemplatesApi } from "../services/api/endpoints/packages.endpoints";
import productsReducer from "./productsSlice";
import shiftReducer, { type ShiftState } from "./shiftSlice";
import payRunReducer from "./payRunSlice";
import dashboardReducer from "./dashboardSlice";
import billingReducer from "./billingSlice";
import marketplaceReducer from "./marketplaceSlice";
import onlineBookingReducer from "./onlineBookingSlice";
import superAdminReducer from "./superAdminSlice";
import supportReducer from "./supportSlice";

const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: ["refreshToken", "isOnboardingComplete", "custom_permissions"],
};

const shiftPersistConfig = {
  key: "shift",
  storage,
  whitelist: ["staffMembers", "shifts"],
};

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer) as unknown as Reducer<AuthState>,
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
    inbox: inboxReducer,
    report: reportReducer,
    services: servicesReducer,
    categories: categoriesReducer,
    serviceFilters: serviceFiltersReducer,
    memberships: membershipReducer,
    inventory: inventoryReducer,
    [membershipsApi.reducerPath]: membershipsApi.reducer,
    [packagesApi.reducerPath]: packagesApi.reducer,
    [clientPackagesApi.reducerPath]: clientPackagesApi.reducer,
    [packageTemplatesApi.reducerPath]: packageTemplatesApi.reducer,
    products: productsReducer,
    shift: persistReducer(shiftPersistConfig, shiftReducer) as unknown as Reducer<ShiftState>,
    payRun: payRunReducer,
    dashboard: dashboardReducer,
    billing: billingReducer,
    marketplace: marketplaceReducer,
    onlineBooking: onlineBookingReducer,
    superAdmin: superAdminReducer,
    support: supportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(membershipsApi.middleware)
      .concat(packagesApi.middleware)
      .concat(clientPackagesApi.middleware)
      .concat(packageTemplatesApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;