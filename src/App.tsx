import { Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"

import { AuthRoutes, OnboardingRoutes, DashboardRoutes } from "./routes"

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    <div className="spinner-border text-primary" role="status" />
  </div>
)

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {AuthRoutes}
          {OnboardingRoutes}

          {/* ROOT */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {DashboardRoutes}
        </Routes>
      </Suspense>
    </>
  )
}

export default App