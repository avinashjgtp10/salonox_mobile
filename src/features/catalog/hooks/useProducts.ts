import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchProductsThunk,
  fetchBrandsThunk,
  createBrandThunk,
  deleteBrandThunk,
  deleteProductThunk,
  exportProductsCSVThunk,
  exportProductsExcelThunk,
  exportProductsPDFThunk,
  fetchCategoriesThunk,
  createCategoryThunk,
  deleteCategoryThunk,
} from "../../../middleware/catalog/products.thunk";

export const useProducts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const products   = useSelector((state: RootState) => state.products.items);
  const total      = useSelector((state: RootState) => state.products.total);
  const brands     = useSelector((state: RootState) => state.products.brands);
  const categories = useSelector((state: RootState) => state.products.categories);
  const loading    = useSelector((state: RootState) => state.products.loading);
  const error      = useSelector((state: RootState) => state.products.error);

  const fetchProducts = useCallback(() => {
    dispatch(fetchProductsThunk());
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

  const exportCSV = useCallback(() => {
    dispatch(exportProductsCSVThunk());
  }, [dispatch]);

  const exportExcel = useCallback(() => {
    dispatch(exportProductsExcelThunk());
  }, [dispatch]);

  const exportPDF = useCallback(() => {
    dispatch(exportProductsPDFThunk());
  }, [dispatch]);

  return {
    products, total, brands, categories, loading, error,
    fetchProducts, fetchBrands, fetchCategories,
    createBrand, deleteBrand,
    createCategory, deleteCategory,
    deleteProduct,
    exportCSV, exportExcel, exportPDF,
  };
};
