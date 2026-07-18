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
      {/* view_clients — read-only screens */}
      <Route index element={<Navigate to="list" replace />} />
      <Route path="list" element={<ClientsListPage />} />
      <Route path="loyalty" element={<ClientLoyaltyPage />} />
      <Route path="history" element={<ClientHistoryPage />} />

      {/* edit_clients required for all write operations — Add and Edit share
          one component (AddClientPage), same pattern as AddStaffPage/TeamRoutes. */}
      <Route element={<PermissionGuard permKey="edit_clients" />}>
        <Route path="import" element={<ImportClientsPage />} />
        <Route path="add" element={<AddClientPage />} />
        <Route path="edit/:id" element={<AddClientPage />} />
      </Route>
    </Routes>
  </Suspense>
);
