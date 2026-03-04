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
      
      {/* DASHBOARD (Layout + Pages) */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="sales/daily" element={<DailySalesPage />} />
        {/* Later: calendar, clients, reports... */}
        {/* <Route path="calendar" element={<CalendarPage />} /> */}
      </Route>
    </Routes>
  )
}

export default App
