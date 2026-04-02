import { Routes, Route, Navigate } from "react-router-dom"
import ServicesListPage from "../features/catalog/pages/ServicesListPage"
import AddServicePage from "../features/catalog/pages/AddServicePage"
import CategoriesPage from "../features/catalog/pages/CategoriesPage"
import MembershipsLandingPage from "../features/catalog/pages/MembershipsLandingPage"
import CreateMembershipPage from "../features/catalog/pages/CreateMembershipPage"
import ProductsListPage from "../features/catalog/pages/ProductsListPage"
import ProductsLandingPage from "../features/catalog/pages/ProductsLandingPage"
import CreateProductPage from "../features/catalog/pages/CreateProductPage"
import ImportProductsPage from "../features/catalog/pages/ImportProductsPage"
import StocktakesListPage from "../features/catalog/pages/StocktakesListPage"
import AddStocktakePage from "../features/catalog/pages/AddStocktakePage"
import StockOrdersListPage from "../features/catalog/pages/StockOrdersListPage"
import SuppliersListPage from "../features/catalog/pages/SuppliersListPage"
import AddSupplierPage from "../features/catalog/pages/AddSupplierPage"

export const CatalogRoutes = () => (
    <Routes>
      <Route path="services" element={<ServicesListPage />} />
      <Route path="services/add" element={<AddServicePage />} />
      <Route path="services/categories" element={<CategoriesPage />} />
      <Route path="memberships" element={<MembershipsLandingPage />} />
      <Route path="memberships/create" element={<CreateMembershipPage />} />
      <Route path="products" element={<ProductsListPage />} />
      <Route path="products/landing" element={<ProductsLandingPage />} />
      <Route path="products/create" element={<CreateProductPage />} />
      <Route path="products/import" element={<ImportProductsPage />} />
      <Route path="inventory/stocktakes" element={<StocktakesListPage />} />
      <Route path="inventory/stocktakes/new" element={<AddStocktakePage />} />
      <Route path="inventory/stock-orders" element={<StockOrdersListPage />} />
      <Route path="inventory/orders" element={<Navigate to="/dashboard/catalog/inventory/stock-orders" replace />} />
      <Route path="inventory/suppliers" element={<SuppliersListPage />} />
      <Route path="inventory/suppliers/new" element={<AddSupplierPage />} />
    </Routes>
)
