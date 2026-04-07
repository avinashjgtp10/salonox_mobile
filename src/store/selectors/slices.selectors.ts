import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "../store"
import { createCRUDSelectors } from "./utils.selectors"

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────
const selectAuthState = (state: RootState) => state.auth

export const selectAccessToken          = createSelector(selectAuthState, (a) => a.accessToken)
export const selectRefreshToken         = createSelector(selectAuthState, (a) => a.refreshToken)
export const selectIsAuthenticated      = createSelector(selectAccessToken, (t) => t !== null)
export const selectIsOnboardingComplete = createSelector(selectAuthState, (a) => a.isOnboardingComplete)
export const selectAuthLoading          = createSelector(selectAuthState, (a) => a.loading)
export const selectAuthError            = createSelector(selectAuthState, (a) => a.error)

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────
const selectUserState = (state: RootState) => state.user

export const selectUserProfile  = createSelector(selectUserState, (u) => u.profile)
export const selectUserLoading  = createSelector(selectUserState, (u) => u.loading)
export const selectUserError    = createSelector(selectUserState, (u) => u.error)
export const selectIsUserLoaded = createSelector(selectUserProfile, (p) => p !== null)

// ─────────────────────────────────────────────────────────────────────────────
// Salon
// ─────────────────────────────────────────────────────────────────────────────
const selectSalonState = (state: RootState) => state.salon

export const selectCurrentSalon  = createSelector(selectSalonState, (s) => s.currentSalon)
export const selectSalonLoading  = createSelector(selectSalonState, (s) => s.loading)
export const selectSalonError    = createSelector(selectSalonState, (s) => s.error)
export const selectIsSalonLoaded = createSelector(selectCurrentSalon, (s) => s !== null)

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────
const clientBase = createCRUDSelectors((s: RootState) => s.client)

export const selectAllClients     = clientBase.selectItems
export const selectSelectedClient = clientBase.selectSelectedItem
export const selectClientLoading  = clientBase.selectLoading
export const selectClientError    = clientBase.selectError
export const selectClientCount    = clientBase.selectCount
export const selectIsClientEmpty  = clientBase.selectIsEmpty

/** Only clients where isBlocked === true */
export const selectBlockedClients = createSelector(
  selectAllClients,
  (clients) => clients.filter((c) => c.isBlocked === true)
)

/** Only clients where isBlocked is false or unset */
export const selectActiveClients = createSelector(
  selectAllClients,
  (clients) => clients.filter((c) => !c.isBlocked)
)

// ─────────────────────────────────────────────────────────────────────────────
// Staff
// ─────────────────────────────────────────────────────────────────────────────
const staffBase = createCRUDSelectors((s: RootState) => s.staff)

export const selectAllStaff      = staffBase.selectItems
export const selectSelectedStaff = staffBase.selectSelectedItem
export const selectStaffLoading  = staffBase.selectLoading
export const selectStaffError    = staffBase.selectError
export const selectStaffCount    = staffBase.selectCount
export const selectIsStaffEmpty  = staffBase.selectIsEmpty

// ─────────────────────────────────────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────────────────────────────────────
const bookingBase = createCRUDSelectors((s: RootState) => s.booking)

export const selectAllBookings     = bookingBase.selectItems
export const selectSelectedBooking = bookingBase.selectSelectedItem
export const selectBookingLoading  = bookingBase.selectLoading
export const selectBookingError    = bookingBase.selectError
export const selectBookingCount    = bookingBase.selectCount

export const selectPendingBookings   = createSelector(selectAllBookings, (bs) => bs.filter((b) => b.status === "pending"))
export const selectConfirmedBookings = createSelector(selectAllBookings, (bs) => bs.filter((b) => b.status === "confirmed"))
export const selectCompletedBookings = createSelector(selectAllBookings, (bs) => bs.filter((b) => b.status === "completed"))
export const selectCancelledBookings = createSelector(selectAllBookings, (bs) => bs.filter((b) => b.status === "cancelled"))

// ─────────────────────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────────────────────
const catalogBase = createCRUDSelectors((s: RootState) => s.catalog)

export const selectAllCatalogItems     = catalogBase.selectItems
export const selectSelectedCatalogItem = catalogBase.selectSelectedItem
export const selectCatalogLoading      = catalogBase.selectLoading
export const selectCatalogError        = catalogBase.selectError
export const selectCatalogCount        = catalogBase.selectCount

/** Items where active is not explicitly false */
export const selectActiveCatalogItems = createSelector(
  selectAllCatalogItems,
  (items) => items.filter((i) => i.active !== false)
)

// ─────────────────────────────────────────────────────────────────────────────
// Sale
// ─────────────────────────────────────────────────────────────────────────────
const saleBase = createCRUDSelectors((s: RootState) => s.sale)

export const selectAllSales     = saleBase.selectItems
export const selectSelectedSale = saleBase.selectSelectedItem
export const selectSaleLoading  = saleBase.selectLoading
export const selectSaleError    = saleBase.selectError
export const selectSaleCount    = saleBase.selectCount

// ─────────────────────────────────────────────────────────────────────────────
// Calendar
// ─────────────────────────────────────────────────────────────────────────────
const calendarBase = createCRUDSelectors((s: RootState) => s.calendar)

export const selectAllCalendarEvents     = calendarBase.selectItems
export const selectSelectedCalendarEvent = calendarBase.selectSelectedItem
export const selectCalendarLoading       = calendarBase.selectLoading
export const selectCalendarError         = calendarBase.selectError
export const selectCalendarCount         = calendarBase.selectCount

// ─────────────────────────────────────────────────────────────────────────────
// Setting
// ─────────────────────────────────────────────────────────────────────────────
const settingBase = createCRUDSelectors((s: RootState) => s.setting)

export const selectAllSettings     = settingBase.selectItems
export const selectSelectedSetting = settingBase.selectSelectedItem
export const selectSettingLoading  = settingBase.selectLoading
export const selectSettingError    = settingBase.selectError
export const selectSettingCount    = settingBase.selectCount

// ─────────────────────────────────────────────────────────────────────────────
// App (External Integrations)
// ─────────────────────────────────────────────────────────────────────────────
const appBase = createCRUDSelectors((s: RootState) => s.app)

export const selectAllApps     = appBase.selectItems
export const selectSelectedApp = appBase.selectSelectedItem
export const selectAppLoading  = appBase.selectLoading
export const selectAppError    = appBase.selectError
export const selectAppCount    = appBase.selectCount
