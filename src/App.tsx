import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { PageLoader } from "./components/ui";
import { AuthRoutes, OnboardingRoutes, DashboardRoutes } from "./routes";
import SalonOxBot from './features/bot/SalonOxBot';

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Suspense fallback={<PageLoader fullHeight />}>
        <Routes>
          {AuthRoutes}
          {OnboardingRoutes}

          {/* ROOT */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          

          {DashboardRoutes}
        </Routes>
      </Suspense>
      <SalonOxBot />

    </>
  );
}

export default App;
