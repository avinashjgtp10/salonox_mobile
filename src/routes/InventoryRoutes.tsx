import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PermissionGuard from "../components/guards/PermissionGuard";
import PlanFeatureGuard from "../components/guards/PlanFeatureGuard";

const SuppliersListPage = lazy(
  () => import("../features/catalog/pages/SuppliersListPage"),
);
const AddSupplierPage = lazy(
  () => import("../features/catalog/pages/AddSupplierPage"),
);
const SupplierDetailPage = lazy(
  () => import("../features/catalog/pages/SupplierDetailPage"),
);
const NewOrderPage = lazy(
  () => import("../features/catalog/pages/NewOrderPage"),
);
const OrdersListPage = lazy(
  () => import("../features/catalog/pages/OrdersListPage"),
);
const OrderDetailPage = lazy(
  () => import("../features/catalog/pages/OrderDetailPage"),
);
const ConsumableInventoryPage = lazy(
  () => import("../features/catalog/pages/ConsumableInventoryPage"),
);
// Retail-stock counterpart to Consumable Inventory above.
const ProductInventoryPage = lazy(
  () => import("../features/catalog/pages/ProductInventoryPage"),
);
const ConsumableUsageHistoryPage = lazy(
  () => import("../features/catalog/pages/ConsumableUsageHistoryPage"),
);
// Same form used by Catalog's Products create/edit — see CatalogRoutes.
const ProductFormPage = lazy(
  () => import("../features/catalog/pages/ProductFormPage"),
);
const ProductAuditPage = lazy(
  () => import("../features/catalog/pages/ProductAuditPage"),
);
const StockLedgerPage = lazy(
  () => import("../features/catalog/pages/StockLedgerPage"),
);
const AddStockPage = lazy(
  () => import("../features/catalog/pages/AddStockPage"),
);

import { PageLoader } from "../components/ui";

export const InventoryRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Default: inventory index → suppliers */}
      <Route index element={<Navigate to="/dashboard/inventory/suppliers" replace />} />

      {/* Plan-feature gate (featureKey "inventory") wraps the permission
          gate — a salon whose plan lacks Inventory sees the upgrade screen
          regardless of staff permissions; one that has it still needs
          the right permission per-staff as before. */}
      <Route element={<PlanFeatureGuard featureKey="inventory" label="Inventory Management" />}>
        {/* Suppliers has its own independent permissions now (see the
            Warehouse -> Suppliers ticket) — split out from the shared
            manage_inventory guard below, which still covers every other
            Warehouse screen until they get the same treatment. */}
        <Route element={<PermissionGuard permKey="view_suppliers" />}>
          <Route path="suppliers" element={<SuppliersListPage />} />
          <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="create_suppliers" />}>
          <Route path="suppliers/new" element={<AddSupplierPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="edit_suppliers" />}>
          <Route path="suppliers/edit/:id" element={<AddSupplierPage />} />
          <Route path="suppliers/:id/edit" element={<AddSupplierPage />} />
        </Route>

        {/* Orders now has its own independent permissions too (see the
            Warehouse -> Orders ticket) — split out from the shared
            manage_inventory guard below, same pattern as Suppliers. */}
        <Route element={<PermissionGuard permKey="view_orders" />}>
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="create_order" />}>
          <Route path="orders/new-order" element={<NewOrderPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="edit_order" />}>
          <Route path="orders/:id/edit" element={<NewOrderPage />} />
        </Route>

        {/* manage_inventory required for every other inventory screen, read or write */}
        <Route element={<PermissionGuard permKey="manage_inventory" />}>
          <Route path="products" element={<ProductInventoryPage />} />
          <Route path="audit" element={<ProductAuditPage />} />
          <Route path="consumables" element={<ConsumableInventoryPage />} />
          <Route path="consumables/add" element={<ProductFormPage />} />
          <Route path="consumables/edit/:id" element={<ProductFormPage />} />
          <Route path="consumables/usage-history" element={<ConsumableUsageHistoryPage />} />
          <Route path="ledger" element={<StockLedgerPage />} />
          <Route path="ledger/add-stock" element={<AddStockPage />} />
          <Route path="ledger/edit/:id" element={<AddStockPage />} />
          {/* Redesigned as Consumable Inventory — old URL kept working */}
          <Route path="stock-reconciliation" element={<Navigate to="/dashboard/inventory/consumables" replace />} />
        </Route>
      </Route>

      {/* Catch-all → suppliers */}
      <Route path="*" element={<Navigate to="/dashboard/inventory/suppliers" replace />} />
    </Routes>
  </Suspense>
);
