import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PermissionGuard from "../components/guards/PermissionGuard";

const ServicesListPage = lazy(
  () => import("../features/catalog/pages/ServicesListPage"),
);
// One page serves both create and edit, same as ProductFormPage.
const ServiceFormPage = lazy(
  () => import("../features/catalog/pages/ServiceFormPage"),
);
const CategoriesPage = lazy(
  () => import("../features/catalog/pages/CategoriesPage"),
);
const MembershipsListPage = lazy(
  () => import("../features/catalog/pages/MembershipsListPage"),
);
const CreateMembershipPage = lazy(
  () => import("../features/catalog/pages/CreateMembershipPage"),
);
const ProductsListPage = lazy(
  () => import("../features/catalog/pages/ProductsListPage"),
);
const ProductsLandingPage = lazy(
  () => import("../features/catalog/pages/ProductsLandingPage"),
);
const ProductFormPage = lazy(
  () => import("../features/catalog/pages/ProductFormPage"),
);
const ImportProductsPage = lazy(
  () => import("../features/catalog/pages/ImportProductsPage"),
);
const StocktakesListPage = lazy(
  () => import("../features/catalog/pages/StocktakesListPage"),
);
const AddStocktakePage = lazy(
  () => import("../features/catalog/pages/AddStocktakePage"),
);
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
const PackagesPage = lazy(
  () => import("../features/catalog/pages/Packages"),
);
const EditPackagePage = lazy(
  () => import("../features/catalog/pages/EditPackagePage"),
);
const PackageModule = lazy(
  () => import("../components/packages/PackageModule"),
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

export const CatalogRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Default: catalog index → service menu */}
      <Route index element={<Navigate to="/dashboard/catalog/services" replace />} />
      {/* Inventory parent → stocktakes */}
      <Route path="inventory" element={<Navigate to="/dashboard/catalog/inventory/stocktakes" replace />} />

      {/* view_catalog (outer) — read-only screens */}
      <Route path="services" element={<ServicesListPage />} />
      <Route path="memberships" element={<MembershipsListPage />} />
      <Route path="memberships/list" element={<MembershipsListPage />} />
      <Route path="packages" element={<PackageModule />} />
      <Route path="packages/legacy" element={<PackagesPage />} />
      <Route path="products" element={<ProductsListPage />} />
      <Route path="products/landing" element={<ProductsLandingPage />} />

      {/* edit_catalog required for service/product/membership write operations */}
      <Route element={<PermissionGuard permKey="edit_catalog" />}>
        <Route path="services/add" element={<ServiceFormPage />} />
        <Route path="services/:id/edit" element={<ServiceFormPage />} />
        <Route path="services/categories" element={<CategoriesPage />} />
        <Route path="memberships/create" element={<CreateMembershipPage />} />
        <Route path="memberships/edit/:id" element={<CreateMembershipPage />} />
        <Route path="packages/:id" element={<EditPackagePage />} />
        <Route path="products/create" element={<ProductFormPage />} />
        <Route path="products/edit/:id" element={<ProductFormPage />} />
        <Route path="products/import" element={<ImportProductsPage />} />
      </Route>

      {/* manage_inventory required for stock operations */}
      <Route element={<PermissionGuard permKey="manage_inventory" />}>
        <Route path="inventory/stocktakes" element={<StocktakesListPage />} />
        <Route path="inventory/stocktakes/new" element={<AddStocktakePage />} />
        <Route path="inventory/stocktakes/edit/:id" element={<AddStocktakePage />} />
        {/* Orders is now its own concept (a PO document, no stock movement) —
            sibling to Purchase History rather than an alias for it. */}
        <Route path="inventory/orders" element={<OrdersListPage />} />
        <Route path="inventory/orders/new-order" element={<NewOrderPage />} />
        <Route path="inventory/orders/:id/edit" element={<NewOrderPage />} />
        <Route path="inventory/orders/:id" element={<OrderDetailPage />} />
        <Route path="inventory/suppliers" element={<SuppliersListPage />} />
        <Route path="inventory/suppliers/new" element={<AddSupplierPage />} />
        <Route path="inventory/suppliers/edit/:id" element={<AddSupplierPage />} />
        <Route path="inventory/suppliers/:id/edit" element={<AddSupplierPage />} />
        <Route path="inventory/suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="inventory/products" element={<ProductInventoryPage />} />
        <Route path="inventory/audit" element={<ProductAuditPage />} />
        <Route path="inventory/consumables" element={<ConsumableInventoryPage />} />
        <Route path="inventory/consumables/add" element={<ProductFormPage />} />
        <Route path="inventory/consumables/edit/:id" element={<ProductFormPage />} />
        <Route path="inventory/consumables/usage-history" element={<ConsumableUsageHistoryPage />} />
        <Route path="inventory/ledger" element={<StockLedgerPage />} />
        <Route path="inventory/ledger/add-stock" element={<AddStockPage />} />
        <Route path="inventory/ledger/edit/:id" element={<AddStockPage />} />
        {/* Redesigned as Consumable Inventory — old URL kept working */}
        <Route path="inventory/stock-reconciliation" element={<Navigate to="/dashboard/catalog/inventory/consumables" replace />} />
      </Route>

      {/* Catch-all → service menu */}
      <Route path="*" element={<Navigate to="/dashboard/catalog/services" replace />} />
    </Routes>
  </Suspense>
);
