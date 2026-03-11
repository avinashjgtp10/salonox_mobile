import { Routes, Route } from "react-router-dom"

import LoginPage from "./features/auth/pages/LoginPage"
import RegisterPage from "./features/auth/pages/RegisterPage"
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
import SendRequestPage from "./features/auth/pages/SendRequestPage"
import RequestSuccessPage from "./features/auth/pages/RequestSuccessPage"
import TeamSizePage from "./features/auth/pages/TeamSizePage"
import DashboardPage from "./features/dashboard/pages/DashboardPage"
import DashboardLayout from "./features/dashboard/components/DashboardLayout"
import DailySalesPage from "./features/analytics/pages/DailySalesPage" // already in your project
import AppointmentsPage from "./features/analytics/pages/AppointmentsPage"
import SalesListPage from "./features/analytics/pages/SalesListPage"
import ClientsListPage from "./features/clients/pages/ClientsListPage"
import ClientLoyaltyPage from "./features/clients/pages/ClientLoyaltyPage"
import AddClientPage from "./features/clients/pages/AddClientPage"
import Scheduler from "./features/bookings/components/calendar/Scheduler"
import ClientAddressesPage from "./features/clients/pages/ClientAddressesPage"
import ClientEmergencyContactsPage from "./features/clients/pages/ClientEmergencyContactsPage"
import ClientSettingsPage from "./features/clients/pages/ClientSettingsPage"
import ImportClientsPage from "./features/clients/pages/ImportClientsPage"
import StaffListPage from "./features/staff/pages/StaffListPage"
import AddStaffPage from "./features/staff/pages/AddStaffPage"
import TimesheetsPage from "./features/staff/pages/TimesheetsPage"
import PayRunsPage from "./features/staff/pages/PayRunsPage"
import PayRunBreakdownPage from "./features/staff/pages/PayRunBreakdownPage"
import ScheduledShiftsPage from "./features/dashboard/pages/ScheduledShiftsPage"
import ServicesListPage from "./features/catalog/pages/ServicesListPage"
import AddServicePage from "./features/catalog/pages/AddServicePage"
import CategoriesPage from "./features/catalog/pages/CategoriesPage"

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/account-type" element={<AccountTypePage />} />
      <Route path="/business-name" element={<BusinessNamePage />} />
      <Route path="/team-setup" element={<TeamSetupPage />} />
      <Route path="/service-type" element={<ServiceTypePage />} />
      <Route path="/business-location" element={<BusinessLocationPage />} />
      <Route path="/venue-location" element={<VenueLocationPage />} />
      <Route path="/previous-software" element={<PreviousSoftwarePage />} />
      <Route path="/recommendation-source" element={<RecommendationSourcePage />} />
      <Route path="/setup-complete" element={<SetupCompletePage />} />
      <Route path="/join-business" element={<JoinBusinessPage />} />
      <Route path="/send-request" element={<SendRequestPage />} />
      <Route path="/request-success" element={<RequestSuccessPage />} />
      <Route path="/team-size" element={<TeamSizePage />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<Scheduler />} />
        <Route path="sales">
          <Route index element={<SalesListPage />} />
          <Route path="daily" element={<DailySalesPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="payments" element={<div className="p-4">Payments Page</div>} />
        </Route>

        {/* TEAM */}
        <Route path="team">
          <Route index element={<div className="p-4">Team Home</div>} />
          <Route path="members" element={<StaffListPage />} />
          <Route path="add" element={<AddStaffPage />} />
          <Route path="shifts" element={<ScheduledShiftsPage />} />
          <Route path="timesheets" element={<TimesheetsPage />} />
          <Route path="payruns" element={<PayRunsPage />} />
          <Route path="payruns/:memberId" element={<PayRunBreakdownPage />} />
        </Route>

        {/* CATALOG */}
        <Route path="catalog">
          <Route path="services" element={<ServicesListPage />} />
          <Route path="services/add" element={<AddServicePage />} />
          <Route path="services/categories" element={<CategoriesPage />} />
        </Route>

        {/* CLIENTS */}
        <Route path="clients">
          <Route index element={<ClientsListPage />} />
          <Route path="list" element={<ClientsListPage />} />
          <Route path="loyalty" element={<ClientLoyaltyPage />} />
          <Route path="add" element={<AddClientPage />} />
          <Route path="addresses" element={<ClientAddressesPage />} />
          <Route path="emergency" element={<ClientEmergencyContactsPage />} />
          <Route path="settings" element={<ClientSettingsPage />} />
          <Route path="import" element={<ImportClientsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
