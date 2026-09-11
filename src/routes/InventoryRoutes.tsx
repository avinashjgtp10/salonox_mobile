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

        {/* Product Inventory now has its own independent View permission too
            (see the Warehouse -> Product Inventory ticket). */}
        <Route element={<PermissionGuard permKey="view_product_inventory" />}>
          <Route path="products" element={<ProductInventoryPage />} />
        </Route>

        {/* Consumable Inventory now has its own independent View/Add/Edit/
            Usage permissions too (see the Warehouse -> Consumable Inventory
            ticket). ProductFormPage's backend route (POST/PATCH /products)
            accepts add_consumable/edit_consumable as OR-alternatives to
            Catalog's create_products/edit_products — see products.routes.ts. */}
        <Route element={<PermissionGuard permKey="view_consumable_inventory" />}>
          <Route path="consumables" element={<ConsumableInventoryPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="add_consumable" />}>
          <Route path="consumables/add" element={<ProductFormPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="edit_consumable" />}>
          <Route path="consumables/edit/:id" element={<ProductFormPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="view_consumable_usage" />}>
          <Route path="consumables/usage-history" element={<ConsumableUsageHistoryPage />} />
        </Route>

        {/* Product Audit now has its own independent View permission too
            (see the Warehouse -> Product Audit ticket). */}
        <Route element={<PermissionGuard permKey="view_product_audit" />}>
          <Route path="audit" element={<ProductAuditPage />} />
        </Route>

        {/* Stock Ledger now has its own independent View/Edit/Stock
            Adjustment permissions too (see the Warehouse -> Stock Ledger
            ticket) — split out from the shared manage_inventory guard,
            same pattern as every other Warehouse section above. */}
        <Route element={<PermissionGuard permKey="view_stock_ledger" />}>
          <Route path="ledger" element={<StockLedgerPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="stock_ledger_adjustment" />}>
          <Route path="ledger/add-stock" element={<AddStockPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="edit_stock_ledger" />}>
          <Route path="ledger/edit/:id" element={<AddStockPage />} />
        </Route>

        {/* manage_inventory still covers the few legacy screens with no nav
            tab of their own anymore (stock-reconciliation redirects
            straight to Consumable Inventory). */}
        <Route element={<PermissionGuard permKey="manage_inventory" />}>
          {/* Redesigned as Consumable Inventory — old URL kept working */}
          <Route path="stock-reconciliation" element={<Navigate to="/dashboard/inventory/consumables" replace />} />
        </Route>
      </Route>

      {/* Catch-all → suppliers */}
      <Route path="*" element={<Navigate to="/dashboard/inventory/suppliers" replace />} />
    </Routes>
  </Suspense>
);
