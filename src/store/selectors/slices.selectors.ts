import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { createCRUDSelectors } from "./utils.selectors";
import type { ClientItem } from "../../types/client.types";

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────
const selectAuthState = (state: RootState) => state.auth;

export const selectAccessToken = createSelector(
  selectAuthState,
  (a) => a.accessToken,
);
export const selectRefreshToken = createSelector(
  selectAuthState,
  (a) => a.refreshToken,
);
export const selectIsAuthenticated = createSelector(
  selectAccessToken,
  (t) => t !== null,
);
export const selectIsOnboardingComplete = createSelector(
  selectAuthState,
  (a) => a.isOnboardingComplete,
);
// Individual loading flags — avoids returning a new object reference on every render
export const selectAuthLoginLoading = createSelector(selectAuthState, (a) => a.loading.login);
export const selectAuthRegisterLoading = createSelector(selectAuthState, (a) => a.loading.register);
export const selectAuthSendOtpLoading = createSelector(selectAuthState, (a) => a.loading.sendOtp);
export const selectAuthVerifyOtpLoading = createSelector(selectAuthState, (a) => a.loading.verifyOtp);
export const selectAuthForgotSendOtpLoading = createSelector(selectAuthState, (a) => a.loading.forgotSendOtp);
export const selectAuthForgotVerifyOtpLoading = createSelector(selectAuthState, (a) => a.loading.forgotVerifyOtp);
export const selectAuthForgotResetLoading = createSelector(selectAuthState, (a) => a.loading.forgotReset);
/** @deprecated Use the individual selectAuth*Loading selectors to avoid unnecessary rerenders */
export const selectAuthLoading = createSelector(selectAuthState, (a) => a.loading);
export const selectAuthError = createSelector(selectAuthState, (a) => a.error);

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────
const selectUserState = (state: RootState) => state.user;

export const selectUserProfile = createSelector(
  selectUserState,
  (u) => u.profile,
);
// Individual loading flags — avoids returning a new object reference on every render
export const selectUserFetchLoading = createSelector(selectUserState, (u) => u.loading.fetch);
export const selectUserUpdateLoading = createSelector(selectUserState, (u) => u.loading.update);
export const selectUserAvatarLoading = createSelector(selectUserState, (u) => u.loading.avatar);
export const selectUserChangePasswordLoading = createSelector(selectUserState, (u) => u.loading.changePassword);
/** @deprecated Use the individual selectUser*Loading selectors to avoid unnecessary rerenders */
export const selectUserLoading = createSelector(selectUserState, (u) => u.loading);
export const selectUserError = createSelector(selectUserState, (u) => u.error);
export const selectIsUserLoaded = createSelector(
  selectUserProfile,
  (p) => p !== null,
);

// ─────────────────────────────────────────────────────────────────────────────
// Salon
// ─────────────────────────────────────────────────────────────────────────────
const selectSalonState = (state: RootState) => state.salon;

export const selectCurrentSalon = createSelector(
  selectSalonState,
  (s) => s.currentSalon,
);
export const selectSalonLoading = createSelector(
  selectSalonState,
  (s) => s.loading,
);
export const selectSalonError = createSelector(
  selectSalonState,
  (s) => s.error,
);
export const selectIsSalonLoaded = createSelector(
  selectCurrentSalon,
  (s) => s !== null,
);

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────
const clientBase = createCRUDSelectors((s: RootState) => s.client);

export const selectAllClients = clientBase.selectItems;
export const selectSelectedClient = clientBase.selectSelectedItem;
export const selectClientLoading = clientBase.selectLoading;
export const selectClientError = clientBase.selectError;
export const selectClientCount = clientBase.selectCount;
export const selectIsClientEmpty = clientBase.selectIsEmpty;

/** Only clients where isBlocked === true */
export const selectBlockedClients = createSelector(
  selectAllClients,
  (clients) => clients.filter((c) => c.isBlocked === true),
);

/** Only clients where isBlocked is false or unset */
export const selectActiveClients = createSelector(selectAllClients, (clients) =>
  clients.filter((c) => !c.isBlocked),
);

// ─────────────────────────────────────────────────────────────────────────────
// Staff
// ─────────────────────────────────────────────────────────────────────────────
const staffBase = createCRUDSelectors((s: RootState) => s.staff);

export const selectAllStaff = staffBase.selectItems;
export const selectSelectedStaff = staffBase.selectSelectedItem;
export const selectStaffLoading = staffBase.selectLoading;
export const selectStaffError = staffBase.selectError;
export const selectStaffCount = staffBase.selectCount;
export const selectIsStaffEmpty = staffBase.selectIsEmpty;

// ─────────────────────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────────────────────
const catalogBase = createCRUDSelectors((s: RootState) => s.catalog);

export const selectAllCatalogItems = catalogBase.selectItems;
export const selectSelectedCatalogItem = catalogBase.selectSelectedItem;
export const selectCatalogLoading = catalogBase.selectLoading;
export const selectCatalogError = catalogBase.selectError;
export const selectCatalogCount = catalogBase.selectCount;

/** Items where active is not explicitly false */
export const selectActiveCatalogItems = createSelector(
  selectAllCatalogItems,
  (items) => items.filter((i) => i.active !== false),
);

// ─────────────────────────────────────────────────────────────────────────────
// Setting
// ─────────────────────────────────────────────────────────────────────────────
const settingBase = createCRUDSelectors((s: RootState) => s.setting);

export const selectAllSettings = settingBase.selectItems;
export const selectSelectedSetting = settingBase.selectSelectedItem;
export const selectSettingLoading = settingBase.selectLoading;
export const selectSettingError = settingBase.selectError;
export const selectSettingCount = settingBase.selectCount;

// ─────────────────────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────────────────────
const servicesBase = createCRUDSelectors((s: RootState) => s.services);

export const selectAllServices = servicesBase.selectItems;
export const selectSelectedService = servicesBase.selectSelectedItem;
export const selectServicesLoading = servicesBase.selectLoading;
export const selectServicesError = servicesBase.selectError;
export const selectServicesPagination = servicesBase.selectPagination;
export const selectServicesCount = servicesBase.selectCount;


// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────
const categoriesBase = createCRUDSelectors((s: RootState) => s.categories);

export const selectAllCategories = categoriesBase.selectItems;
export const selectSelectedCategory = categoriesBase.selectSelectedItem;
export const selectCategoriesLoading = categoriesBase.selectLoading;
export const selectCategoriesError = categoriesBase.selectError;
export const selectCategoriesCount = categoriesBase.selectCount;

// Derived selector: categories with their service count pre-computed.
// Memoized so the .map() + .filter() only runs when services or categories change.
export const selectCategoriesWithServiceCount = createSelector(
  [selectAllServices, selectAllCategories],
  (services, categories) =>
    categories.map((cat) => ({
      ...cat,
      serviceCount: (services as Array<{ category_id?: string | number | null }>).filter(
        (svc) => String(svc.category_id) === String(cat.id),
      ).length,
    })),
);

// ─────────────────────────────────────────────────────────────────────────────
// App (External Integrations)
// ─────────────────────────────────────────────────────────────────────────────
const appBase = createCRUDSelectors((s: RootState) => s.app);

export const selectAllApps = appBase.selectItems;
export const selectSelectedApp = appBase.selectSelectedItem;
export const selectAppLoading = appBase.selectLoading;
export const selectAppError = appBase.selectError;
export const selectAppCount = appBase.selectCount;

export const selectClientItems = (state: RootState): ClientItem[] => {
  const raw = state.client.items;
  return Array.isArray(raw) ? raw
    : Array.isArray((raw as any)?.items) ? (raw as any).items
      : Array.isArray((raw as any)?.data) ? (raw as any).data
        : [];
};
