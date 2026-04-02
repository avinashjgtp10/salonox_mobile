import { Routes, Route } from "react-router-dom"
import ClientsListPage from "../features/clients/pages/ClientsListPage"
import ClientLoyaltyPage from "../features/clients/pages/ClientLoyaltyPage"
import AddClientPage from "../features/clients/pages/AddClientPage"
import ClientAddressesPage from "../features/clients/pages/ClientAddressesPage"
import ClientEmergencyContactsPage from "../features/clients/pages/ClientEmergencyContactsPage"
import ClientSettingsPage from "../features/clients/pages/ClientSettingsPage"
import ImportClientsPage from "../features/clients/pages/ImportClientsPage"
import { ClientWizardProvider } from "../features/clients/context/ClientWizardContext"

export const ClientsRoutes = () => (
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
)
