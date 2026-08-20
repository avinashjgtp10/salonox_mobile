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
const StockOrdersListPage = lazy(
  () => import("../features/catalog/pages/StockOrdersListPage"),
);
const SuppliersListPage = lazy(
  () => import("../features/catalog/pages/SuppliersListPage"),
);
const AddSupplierPage = lazy(
  () => import("../features/catalog/pages/AddSupplierPage"),
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
const SoldMembershipsPage = lazy(
  () => import("../features/catalog/pages/SoldMembershipsPage"),
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
      <Route path="memberships/sold" element={<SoldMembershipsPage />} />
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
        <Route path="inventory/stock-orders" element={<StockOrdersListPage />} />
        <Route
          path="inventory/orders"
          element={
            <Navigate to="/dashboard/catalog/inventory/stock-orders" replace />
          }
        />
        <Route path="inventory/suppliers" element={<SuppliersListPage />} />
        <Route path="inventory/suppliers/new" element={<AddSupplierPage />} />
        <Route path="inventory/suppliers/edit/:id" element={<AddSupplierPage />} />
        <Route path="inventory/suppliers/:id/edit" element={<AddSupplierPage />} />
        <Route path="inventory/products" element={<ProductInventoryPage />} />
        <Route path="inventory/consumables" element={<ConsumableInventoryPage />} />
        <Route path="inventory/consumables/add" element={<ProductFormPage />} />
        <Route path="inventory/consumables/edit/:id" element={<ProductFormPage />} />
        <Route path="inventory/consumables/usage-history" element={<ConsumableUsageHistoryPage />} />
        {/* Redesigned as Consumable Inventory — old URL kept working */}
        <Route path="inventory/stock-reconciliation" element={<Navigate to="/dashboard/catalog/inventory/consumables" replace />} />
      </Route>

      {/* Catch-all → service menu */}
      <Route path="*" element={<Navigate to="/dashboard/catalog/services" replace />} />
    </Routes>
  </Suspense>
);
