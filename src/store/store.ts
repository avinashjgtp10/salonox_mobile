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
import catalogReducer from "./catalogSlice";
import settingReducer from "./settingSlice";
import appReducer from "./appSlice";
import schedulerReducer from "./schedulerSlice";
import marketingReducer from "./marketingSlice";
import inboxReducer from "./inboxSlice";
import servicesReducer from "./servicesSlice";
import categoriesReducer from "./categoriesSlice";
import serviceFiltersReducer from "./serviceFiltersSlice";
import membershipReducer from "./membershipSlice";
import clientMembershipReducer from "./clientMembershipSlice";
import inventoryReducer from "./inventorySlice";
import { packagesApi, clientPackagesApi, packageTemplatesApi } from "../services/api/endpoints/packages.endpoints";
import productsReducer from "./productsSlice";
import shiftReducer, { type ShiftState } from "./shiftSlice";
import payRunReducer from "./payRunSlice";
import dashboardReducer from "./dashboardSlice";
import billingReducer from "./billingSlice";
import marketplaceReducer from "./marketplaceSlice";
import onlineBookingReducer from "./onlineBookingSlice";
import superAdminReducer from "./superAdminSlice";
import branchOwnerReducer from "./branchOwnerSlice";
import supportReducer from "./supportSlice";
import cashCounterReducer from "./cashCounterSlice";
import spotlightReducer from "./spotlightSlice";

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

// Only persist serviceStaffCache — the local workaround for the backend not
// reliably persisting/returning per-service staff_id after a drag (see
// SchedulerContext.tsx). Without this, the correction is lost on every page
// reload, even on the device that made the edit.
const schedulerPersistConfig = {
  key: "scheduler",
  storage,
  whitelist: ["serviceStaffCache"],
};

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer) as unknown as Reducer<AuthState>,
    salon: salonReducer,
    client: clientReducer,
    user: userReducer,
    staff: staffReducer,
    catalog: catalogReducer,
    setting: settingReducer,
    app: appReducer,
    scheduler: persistReducer(schedulerPersistConfig, schedulerReducer) as unknown as Reducer<ReturnType<typeof schedulerReducer>>,
    marketing: marketingReducer,
    inbox: inboxReducer,
    services: servicesReducer,
    categories: categoriesReducer,
    serviceFilters: serviceFiltersReducer,
    memberships: membershipReducer,
    clientMemberships: clientMembershipReducer,
    inventory: inventoryReducer,
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
    branchOwner: branchOwnerReducer,
    support: supportReducer,
    cashCounter: cashCounterReducer,
    spotlight: spotlightReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(packagesApi.middleware)
      .concat(clientPackagesApi.middleware)
      .concat(packageTemplatesApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;