import { Routes, Route, Navigate, Outlet } from "react-router-dom"
import { Toaster } from "react-hot-toast"

import LoginPage from "./features/auth/pages/LoginPage"
import RegisterPage from "./features/auth/pages/RegisterPage"
import OAuthSuccessPage from "./features/auth/pages/OAuthSuccessPage"
import AccountTypePage from "./features/auth/pages/AccountTypePage"
import BusinessNamePage from "./features/auth/pages/BusinessNamePage"
import ServiceTypePage from "./features/auth/pages/ServiceTypePage"
import TeamSetupPage from "./features/auth/pages/TeamSetupPage.tsx"
import BusinessLocationPage from "./features/auth/pages/BusinessLocationPage"
import VenueLocationPage from "./features/auth/pages/VenueLocationPage"
import PreviousSoftwarePage from "./features/auth/pages/PreviousSoftwarePage"
import RecommendationSourcePage from "./features/auth/pages/RecommendationSourcePage"
import SetupCompletePage from "./features/auth/pages/SetupCompletePage"
import JoinBusinessPage from "./features/auth/pages/JoinBusinessPage"
import { OnboardingProvider } from "./context/OnboardingContext"
import SendRequestPage from "./features/auth/pages/SendRequestPage"
import RequestSuccessPage from "./features/auth/pages/RequestSuccessPage"
import TeamSizePage from "./features/auth/pages/TeamSizePage"
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage"
import DashboardPage from "./features/dashboard/pages/DashboardPage"
import DashboardLayout from "./features/dashboard/components/DashboardLayout"
import DailySalesPage from "./features/analytics/pages/DailySalesPage"
import AppointmentsPage from "./features/analytics/pages/AppointmentsPage"
import SalesListPage from "./features/analytics/pages/SalesListPage"
import PaymentsPage from "./features/analytics/pages/PaymentsPage"
import GiftCardsPage from "./features/analytics/pages/GiftCardsPage"
import MembershipsPage from "./features/analytics/pages/MembershipsPage"
import ClientsListPage from "./features/clients/pages/ClientsListPage"
import ClientLoyaltyPage from "./features/clients/pages/ClientLoyaltyPage"
import AddClientPage from "./features/clients/pages/AddClientPage"
import Scheduler from "./features/bookings/components/calendar/Scheduler"
import ClientAddressesPage from "./features/clients/pages/ClientAddressesPage"
import ClientEmergencyContactsPage from "./features/clients/pages/ClientEmergencyContactsPage"
import ClientSettingsPage from "./features/clients/pages/ClientSettingsPage"
import ImportClientsPage from "./features/clients/pages/ImportClientsPage"
import { ClientWizardProvider } from "./features/clients/context/ClientWizardContext"
import StaffListPage from "./features/staff/pages/StaffListPage"
import AddStaffPage from "./features/staff/pages/AddStaffPage"
import TimesheetsPage from "./features/staff/pages/TimesheetsPage"
import PayRunsPage from "./features/staff/pages/PayRunsPage"
import PayRunBreakdownPage from "./features/staff/pages/PayRunBreakdownPage"
import ScheduledShiftsPage from "./features/dashboard/pages/ScheduledShiftsPage"
import RepeatingShiftsPage from "./features/staff/pages/RepeatingShiftsPage"
import ServicesListPage from "./features/catalog/pages/ServicesListPage"
import AddServicePage from "./features/catalog/pages/AddServicePage"
import CategoriesPage from "./features/catalog/pages/CategoriesPage"
import MembershipsLandingPage from "./features/catalog/pages/MembershipsLandingPage"
import CreateMembershipPage from "./features/catalog/pages/CreateMembershipPage"
import ProductsListPage from "./features/catalog/pages/ProductsListPage"
import ProductsLandingPage from "./features/catalog/pages/ProductsLandingPage"
import CreateProductPage from "./features/catalog/pages/CreateProductPage"
import ImportProductsPage from "./features/catalog/pages/ImportProductsPage"
import StocktakesListPage from "./features/catalog/pages/StocktakesListPage"
import AddStocktakePage from "./features/catalog/pages/AddStocktakePage"
import StockOrdersListPage from "./features/catalog/pages/StockOrdersListPage"
import SuppliersListPage from "./features/catalog/pages/SuppliersListPage"
import AddSupplierPage from "./features/catalog/pages/AddSupplierPage"
import AddOnsPage from "./features/apps/pages/AddOnsPage"
import { AuthProvider } from "./features/bookings/context/AuthContext"
import { SchedulerProvider } from "./features/bookings/store/SchedulerContext"
import { SaleProvider } from "./features/analytics/context/SaleContext"

import GuestGuard from "./components/guards/GuestGuard"
import OnboardingGuard from "./components/guards/OnboardingGuard"
import AuthGuard from "./components/guards/AuthGuard"

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* PUBLIC UTILITY ROUTES */}
        <Route path="/send-request" element={<SendRequestPage />} />
        <Route path="/request-success" element={<RequestSuccessPage />} />

        {/* GUEST ROUTES (Only if NOT logged in) */}
        <Route element={<GuestGuard />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/oauth-success" element={<OAuthSuccessPage />} />
          <Route path="/oauth/success" element={<OAuthSuccessPage />} />
        </Route>

        {/* ONBOARDING FLOW (Must be logged in, but NOT finished) */}
        <Route element={<OnboardingGuard />}>
          <Route path="/account-type" element={<OnboardingProvider><AccountTypePage /></OnboardingProvider>} />
          <Route path="/business-name" element={<OnboardingProvider><BusinessNamePage /></OnboardingProvider>} />
          <Route path="/service-type" element={<OnboardingProvider><ServiceTypePage /></OnboardingProvider>} />
          <Route path="/team-setup" element={<OnboardingProvider><TeamSetupPage /></OnboardingProvider>} />
          <Route path="/team-size" element={<OnboardingProvider><TeamSizePage /></OnboardingProvider>} />
          <Route path="/business-location" element={<OnboardingProvider><BusinessLocationPage /></OnboardingProvider>} />
          <Route path="/venue-location" element={<OnboardingProvider><VenueLocationPage /></OnboardingProvider>} />
          <Route path="/previous-software" element={<OnboardingProvider><PreviousSoftwarePage /></OnboardingProvider>} />
          <Route path="/recommendation-source" element={<OnboardingProvider><RecommendationSourcePage /></OnboardingProvider>} />
          <Route path="/setup-complete" element={<OnboardingProvider><SetupCompletePage /></OnboardingProvider>} />
          <Route path="/join-business" element={<OnboardingProvider><JoinBusinessPage /></OnboardingProvider>} />
        </Route>

        {/* PROTECTED DASHBOARD ROUTES (Must be logged in AND finished) */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<AuthGuard />}>
          
          <Route
            path="/dashboard"
            element={
              <AuthProvider>
                <SchedulerProvider>
                  <DashboardLayout />
                </SchedulerProvider>
              </AuthProvider>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="calendar" element={<Scheduler />} />
            <Route path="apps" element={<AddOnsPage />} />
            
            <Route path="sales" element={<SaleProvider><Outlet /></SaleProvider>}>
              <Route index element={<SalesListPage />} />
              <Route path="daily" element={<DailySalesPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="gift-cards" element={<GiftCardsPage />} />
              <Route path="memberships" element={<MembershipsPage />} />
            </Route>

            {/* CATALOG */}
            <Route path="catalog">
              <Route path="services" element={<ServicesListPage />} />
              <Route path="services/add" element={<AddServicePage />} />
              <Route path="services/categories" element={<CategoriesPage />} />
              <Route path="memberships" element={<MembershipsLandingPage />} />
              <Route path="memberships/create" element={<CreateMembershipPage />} />
              <Route path="products" element={<ProductsListPage />} />
              <Route path="products/landing" element={<ProductsLandingPage />} />
              <Route path="products/create" element={<CreateProductPage />} />
              <Route path="products/import" element={<ImportProductsPage />} />
              <Route path="inventory/stocktakes" element={<StocktakesListPage />} />
              <Route path="inventory/stocktakes/new" element={<AddStocktakePage />} />
              <Route path="inventory/stock-orders" element={<StockOrdersListPage />} />
              <Route path="inventory/orders" element={<Navigate to="/dashboard/catalog/inventory/stock-orders" replace />} />
              <Route path="inventory/suppliers" element={<SuppliersListPage />} />
              <Route path="inventory/suppliers/new" element={<AddSupplierPage />} />
            </Route>

            {/* CLIENTS */}
            <Route path="clients">
              <Route index element={<ClientsListPage />} />
              <Route path="list" element={<ClientsListPage />} />
              <Route path="loyalty" element={<ClientLoyaltyPage />} />
              <Route path="import" element={<ImportClientsPage />} />

              {/* Wizard Routes wrapped in Provider */}
              <Route
                path="*"
                element={
                  <ClientWizardProvider>
                    <Routes>
                      <Route path="add" element={<AddClientPage />} />
                      <Route path="addresses" element={<ClientAddressesPage />} />
                      <Route path="emergency" element={<ClientEmergencyContactsPage />} />
                      <Route path="settings" element={<ClientSettingsPage />} />
                    </Routes>
                  </ClientWizardProvider>
                }
              />
            </Route>

            {/* TEAM */}
            <Route path="team">
              <Route index element={<StaffListPage />} />
              <Route path="members" element={<StaffListPage />} />
              <Route path="add" element={<AddStaffPage />} />
              <Route path="repeating-shifts/:id" element={<RepeatingShiftsPage />} />
              <Route path=":id" element={<AddStaffPage />} />
              <Route path="timesheets" element={<TimesheetsPage />} />
              <Route path="payruns" element={<PayRunsPage />} />
              <Route path="payruns/:id" element={<PayRunBreakdownPage />} />
              <Route path="shifts" element={<ScheduledShiftsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App

