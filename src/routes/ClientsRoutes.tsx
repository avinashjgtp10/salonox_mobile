import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { ClientWizardProvider } from "../features/clients/context/ClientWizardContext"

const ClientsListPage           = lazy(() => import("../features/clients/pages/ClientsListPage"))
const ClientLoyaltyPage         = lazy(() => import("../features/clients/pages/ClientLoyaltyPage"))
const AddClientPage             = lazy(() => import("../features/clients/pages/AddClientPage"))
const ClientAddressesPage       = lazy(() => import("../features/clients/pages/ClientAddressesPage"))
const ClientEmergencyContactsPage = lazy(() => import("../features/clients/pages/ClientEmergencyContactsPage"))
const ClientSettingsPage        = lazy(() => import("../features/clients/pages/ClientSettingsPage"))
const ImportClientsPage         = lazy(() => import("../features/clients/pages/ImportClientsPage"))

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
    <div className="spinner-border text-primary" role="status" />
  </div>
)

export const ClientsRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<ClientsListPage />} />
      <Route path="list" element={<ClientsListPage />} />
      <Route path="loyalty" element={<ClientLoyaltyPage />} />
      <Route path="import" element={<ImportClientsPage />} />

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
    </Routes>
  </Suspense>
)

