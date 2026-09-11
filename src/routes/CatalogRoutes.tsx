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
const DigitalMenuPage = lazy(
  () => import("../features/catalog/pages/DigitalMenuPage"),
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

      {/* Service Menu — view_services now real (see the Service Menu ticket) */}
      <Route element={<PermissionGuard permKey="view_services" />}>
        <Route path="services" element={<ServicesListPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="create_services" />}>
        <Route path="services/add" element={<ServiceFormPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="edit_services" />}>
        <Route path="services/:id/edit" element={<ServiceFormPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="manage_categories" />}>
        <Route path="services/categories" element={<CategoriesPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="view_digital_menu" />}>
        <Route path="digital-menu" element={<DigitalMenuPage />} />
      </Route>

      {/* Products — view_products now real (see the Products ticket) */}
      <Route element={<PermissionGuard permKey="view_products" />}>
        <Route path="products" element={<ProductsListPage />} />
      </Route>
      <Route path="products/landing" element={<ProductsLandingPage />} />
      <Route element={<PermissionGuard permKey="create_products" />}>
        <Route path="products/create" element={<ProductFormPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="edit_products" />}>
        <Route path="products/edit/:id" element={<ProductFormPage />} />
      </Route>
      <Route element={<PermissionGuard permKey="import_products" />}>
        <Route path="products/import" element={<ImportProductsPage />} />
      </Route>

      {/* Membership — view_memberships now real (see the Membership ticket) */}
      <Route element={<PlanFeatureGuard featureKey="memberships" label="Memberships" />}>
        <Route element={<PermissionGuard permKey="view_memberships" />}>
          <Route path="memberships" element={<MembershipsListPage />} />
          <Route path="memberships/list" element={<MembershipsListPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="create_memberships" />}>
          <Route path="memberships/create" element={<CreateMembershipPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="edit_memberships" />}>
          <Route path="memberships/edit/:id" element={<CreateMembershipPage />} />
        </Route>
      </Route>

      {/* Packages — two independently-gated pages behind one PlanFeatureGuard
          (see the Packages ticket): Client Packages (client-packages.routes.ts,
          the default tab) and Package Templates (package-templates.routes.ts).
          Both used to live as tabs inside one ungated route/component —
          PackageModule.tsx now reads its active tab from these two real URLs
          instead of internal-only state, so each is independently reachable
          and "Not Authorized" on direct access works per page as required. */}
      <Route element={<PlanFeatureGuard featureKey="packages" label="Packages" />}>
        <Route path="packages" element={<Navigate to="/dashboard/catalog/packages/client-packages" replace />} />
        <Route element={<PermissionGuard permKey="view_client_packages" />}>
          <Route path="packages/client-packages" element={<PackageModule />} />
        </Route>
        <Route element={<PermissionGuard permKey="view_package_templates" />}>
          <Route path="packages/templates" element={<PackageModule />} />
        </Route>
        {/* Legacy Catalog package builder — untouched, out of scope for the
            Packages ticket (that covers Client Packages/Package Templates only). */}
        <Route element={<PermissionGuard permKey="view_packages" />}>
          <Route path="packages/legacy" element={<PackagesPage />} />
        </Route>
        <Route element={<PermissionGuard permKey="edit_catalog" />}>
          <Route path="packages/:id" element={<EditPackagePage />} />
        </Route>
      </Route>

      {/* Catch-all → service menu */}
      <Route path="*" element={<Navigate to="/dashboard/catalog/services" replace />} />
    </Routes>
  </Suspense>
);
