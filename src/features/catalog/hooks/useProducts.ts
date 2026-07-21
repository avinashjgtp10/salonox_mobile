import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchProductsThunk,
  fetchBrandsThunk,
  createBrandThunk,
  deleteBrandThunk,
  updateProductThunk,
  deleteProductThunk,
  exportProductsCSVThunk,
  exportProductsExcelThunk,
  exportProductsPDFThunk,
  fetchCategoriesThunk,
  createCategoryThunk,
  deleteCategoryThunk,
  type FetchProductsParams,
  type ExportProductsParams,
} from "../../../middleware/catalog/products.thunk";

export const useProducts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: products, page, pageSize, totalRecords, totalPages, brands, categories, loading, error } = useSelector(
    (state: RootState) => state.products
  );

  const fetchProducts = useCallback((params?: FetchProductsParams) => {
    dispatch(fetchProductsThunk(params));
  }, [dispatch]);

  const fetchBrands = useCallback(() => {
    dispatch(fetchBrandsThunk());
  }, [dispatch]);

  const createBrand = useCallback((name: string) => {
    return dispatch(createBrandThunk({ name }));
  }, [dispatch]);

  const deleteBrand = useCallback((id: string) => {
    return dispatch(deleteBrandThunk(id));
  }, [dispatch]);

  const updateProduct = useCallback((id: string, data: Record<string, any>) => {
    return dispatch(updateProductThunk({ id, data }));
  }, [dispatch]);

  const deleteProduct = useCallback((id: string) => {
    return dispatch(deleteProductThunk(id));
  }, [dispatch]);

  const fetchCategories = useCallback(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  const createCategory = useCallback((name: string) => {
    return dispatch(createCategoryThunk({ name }));
  }, [dispatch]);

  const deleteCategory = useCallback((id: string) => {
    return dispatch(deleteCategoryThunk(id));
  }, [dispatch]);

  const exportCSV = useCallback((params?: ExportProductsParams) => {
    dispatch(exportProductsCSVThunk(params));
  }, [dispatch]);

  const exportExcel = useCallback((params?: ExportProductsParams) => {
    dispatch(exportProductsExcelThunk(params));
  }, [dispatch]);

  const exportPDF = useCallback((params?: ExportProductsParams) => {
    dispatch(exportProductsPDFThunk(params));
  }, [dispatch]);

  return {
    products, page, pageSize, totalRecords, totalPages, brands, categories, loading, error,
    fetchProducts, fetchBrands, fetchCategories,
    createBrand, deleteBrand,
    createCategory, deleteCategory,
    updateProduct, deleteProduct,
    exportCSV, exportExcel, exportPDF,
  };
};
