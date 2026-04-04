import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"

import { AuthRoutes } from "./routes/AuthRoutes"
import { OnboardingRoutes } from "./routes/OnboardingRoutes"
import { DashboardRoutes } from "./routes/DashboardRoutes"

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Routes>
        {AuthRoutes}
        {OnboardingRoutes}

        {/* ROOT */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {DashboardRoutes}
      </Routes>
    </>
  )
}

export default App