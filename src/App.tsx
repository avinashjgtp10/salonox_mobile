import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { PageLoader } from "./components/ui";
import { AuthRoutes, OnboardingRoutes, DashboardRoutes } from "./routes";
import { LandingRoutes } from "./routes/LandingRoutes";
import SalonOxBot from './features/bot/SalonOxBot';
import { ThemeProvider } from './features/marketing-site/context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Suspense fallback={<PageLoader fullHeight />}>
        <Routes>
          {/* PUBLIC — landing site */}
          {LandingRoutes}

          {/* AUTH */}
          {AuthRoutes}
          {OnboardingRoutes}

          {/* DASHBOARD (AuthGuard protected) */}
          {DashboardRoutes}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <SalonOxBot />
    </ThemeProvider>
  );
}

export default App;