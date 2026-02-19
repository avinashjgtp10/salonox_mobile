import { Routes, Route } from "react-router-dom"

import LoginPage from "./features/auth/pages/LoginPage"
import RegisterPage from "./features/auth/pages/RegisterPage"
import AccountTypePage from "./features/auth/pages/AccountTypePage"
import BusinessNamePage from "./features/auth/pages/BusinessNamePage"
import ServiceTypePage from "./features/auth/pages/ServiceTypePage"
import TeamSetupPage from "./features/auth/pages/TeamSetupPage.tsx"
import BusinessLocationPage from "./features/auth/pages/BusinessLocationPage"

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

    </Routes>
  )
}

export default App
