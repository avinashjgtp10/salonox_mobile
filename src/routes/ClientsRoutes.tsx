// src/routes/ClientsRoutes.tsx
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PermissionGuard from "../components/guards/PermissionGuard";
import { PageLoader } from "../components/ui";

const ClientsListPage = lazy(
  () => import("../features/clients/pages/ClientsListPage"),
);
const ClientLoyaltyPage = lazy(
  () => import("../features/clients/pages/ClientLoyaltyPage"),
);
const ClientHistoryPage = lazy(
  () => import("../features/clients/pages/ClientHistoryPage"),
);
const AddClientPage = lazy(
  () => import("../features/clients/pages/AddClientPage"),
);
const ImportClientsPage = lazy(
  () => import("../features/clients/pages/ImportClientsPage"),
);

export const ClientsRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<Navigate to="list" replace />} />

      {/* Each of the 3 Clients pages is independently permissioned — see the
          Clients permissions ticket. */}
      <Route element={<PermissionGuard permKey="view_clients" />}>
        <Route path="list" element={<ClientsListPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="view_referral_rewards" />}>
        <Route path="loyalty" element={<ClientLoyaltyPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="view_client_history" />}>
        <Route path="history" element={<ClientHistoryPage />} />
      </Route>

      {/* Add and Edit share one component (AddClientPage) but are now
          separately permissioned (create_clients / edit_clients), same
          pattern as AddStaffPage/TeamRoutes. */}
      <Route element={<PermissionGuard permKey="create_clients" />}>
        <Route path="add" element={<AddClientPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="edit_clients" />}>
        <Route path="edit/:id" element={<AddClientPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="import_clients" />}>
        <Route path="import" element={<ImportClientsPage />} />
      </Route>
    </Routes>
  </Suspense>
);
