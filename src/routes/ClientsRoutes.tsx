import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ClientWizardProvider } from "../features/clients/context/ClientWizardContext";

const ClientsListPage = lazy(
  () => import("../features/clients/pages/ClientsListPage"),
);
const ClientLoyaltyPage = lazy(
  () => import("../features/clients/pages/ClientLoyaltyPage"),
);
const AddClientPage = lazy(
  () => import("../features/clients/pages/AddClientPage"),
);
const ClientAddressesPage = lazy(
  () => import("../features/clients/pages/ClientAddressesPage"),
);
const ClientEmergencyContactsPage = lazy(
  () => import("../features/clients/pages/ClientEmergencyContactsPage"),
);
const ClientSettingsPage = lazy(
  () => import("../features/clients/pages/ClientSettingsPage"),
);
const ImportClientsPage = lazy(
  () => import("../features/clients/pages/ImportClientsPage"),
);
const EditClientPage = lazy(
  () => import("../features/clients/pages/EditClientPage"),
);

import { PageLoader } from "../components/ui";

export const ClientsRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<Navigate to="list" replace />} />
      <Route path="list" element={<ClientsListPage />} />
      <Route path="loyalty" element={<ClientLoyaltyPage />} />
      <Route path="import" element={<ImportClientsPage />} />
      <Route path="edit/:id" element={<EditClientPage />} />

      <Route
        path="*"
        element={
          <ClientWizardProvider>
            <Routes>
              <Route path="add" element={<AddClientPage />} />
              <Route path="addresses" element={<ClientAddressesPage />} />
              <Route
                path="emergency"
                element={<ClientEmergencyContactsPage />}
              />
              <Route path="settings" element={<ClientSettingsPage />} />
            </Routes>
          </ClientWizardProvider>
        }
      />
    </Routes>
  </Suspense>
);
