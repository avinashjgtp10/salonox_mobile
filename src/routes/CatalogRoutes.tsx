import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import PermissionGuard from "../components/guards/PermissionGuard";
import PlanFeatureGuard from "../components/guards/PlanFeatureGuard";

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
const PackagesPage = lazy(
  () => import("../features/catalog/pages/Packages"),
);
const EditPackagePage = lazy(
  () => import("../features/catalog/pages/EditPackagePage"),
);
const PackageModule = lazy(
  () => import("../components/packages/PackageModule"),
);

import { PageLoader } from "../components/ui";

// Inventory moved out from under Catalog to its own top-level section — see
// InventoryRoutes.tsx. Old /dashboard/catalog/inventory/... links (bookmarks,
// shared URLs) still work: this rewrites the prefix and hands off to the
// new location instead of 404ing or bouncing to the Catalog service menu.
function LegacyInventoryRedirect() {
  const location = useLocation();
  const target = location.pathname.replace(
    /^\/dashboard\/catalog\/inventory/,
    "/dashboard/inventory",
  );
  return <Navigate to={`${target}${location.search}`} replace />;
}

export const CatalogRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Default: catalog index → service menu */}
      <Route index element={<Navigate to="/dashboard/catalog/services" replace />} />
      {/* Inventory lives at /dashboard/inventory/* now — see InventoryRoutes.tsx */}
      <Route path="inventory/*" element={<LegacyInventoryRedirect />} />

      {/* view_catalog (outer) — read-only screens */}
      <Route path="services" element={<ServicesListPage />} />
      <Route path="products" element={<ProductsListPage />} />
      <Route path="products/landing" element={<ProductsLandingPage />} />

      <Route element={<PlanFeatureGuard featureKey="memberships" label="Memberships" />}>
        <Route path="memberships" element={<MembershipsListPage />} />
        <Route path="memberships/list" element={<MembershipsListPage />} />
      </Route>
      <Route element={<PlanFeatureGuard featureKey="packages" label="Packages" />}>
        <Route path="packages" element={<PackageModule />} />
        <Route path="packages/legacy" element={<PackagesPage />} />
      </Route>

      {/* edit_catalog required for service/product/membership write operations */}
      <Route element={<PermissionGuard permKey="edit_catalog" />}>
        <Route path="services/add" element={<ServiceFormPage />} />
        <Route path="services/:id/edit" element={<ServiceFormPage />} />
        <Route path="services/categories" element={<CategoriesPage />} />
        <Route path="products/create" element={<ProductFormPage />} />
        <Route path="products/edit/:id" element={<ProductFormPage />} />
        <Route path="products/import" element={<ImportProductsPage />} />
        <Route element={<PlanFeatureGuard featureKey="memberships" label="Memberships" />}>
          <Route path="memberships/create" element={<CreateMembershipPage />} />
          <Route path="memberships/edit/:id" element={<CreateMembershipPage />} />
        </Route>
        <Route element={<PlanFeatureGuard featureKey="packages" label="Packages" />}>
          <Route path="packages/:id" element={<EditPackagePage />} />
        </Route>
      </Route>

      {/* Catch-all → service menu */}
      <Route path="*" element={<Navigate to="/dashboard/catalog/services" replace />} />
    </Routes>
  </Suspense>
);
