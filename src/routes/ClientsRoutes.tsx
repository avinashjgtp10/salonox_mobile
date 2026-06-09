import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ClientWizardProvider } from "../features/clients/context/ClientWizardContext";
import PermissionGuard from "../components/guards/PermissionGuard";

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
      {/* view_clients (outer) — read-only screens */}
      <Route index element={<ClientsListPage />} />
      <Route path="list" element={<ClientsListPage />} />
      <Route path="loyalty" element={<ClientLoyaltyPage />} />

      {/* edit_clients required for all write operations */}
      <Route element={<PermissionGuard permKey="edit_clients" />}>
        <Route path="import" element={<ImportClientsPage />} />
        <Route path="edit/:id" element={<EditClientPage />} />
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
      </Route>
    </Routes>
  </Suspense>
);
