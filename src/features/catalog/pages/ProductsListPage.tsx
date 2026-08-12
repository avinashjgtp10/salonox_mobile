import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Sliders,
  BoxSeam,
  X,
  Tag,
  Folder2,
  BoxArrowInDown,
  FileEarmarkExcel,
  FileEarmarkPdf,
  FiletypeCsv,
  ThreeDotsVertical,
  PencilSquare,
  Trash
} from "react-bootstrap-icons";
import { Dropdown } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchSuppliersThunk } from "../../../middleware/inventory/inventory.thunk";
import { useProducts } from "../hooks/useProducts";
import ProductDrawer from "../components/ProductDrawer";
import Pagination from "../../../components/ui/Pagination";
import UiDropdown from "../../../components/ui/Dropdown";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/ProductsListPage.scss";

interface FilterState {
  category: string;
  brand: string;
  stock: string;
  productType: string;
}

const DEFAULT_FILTERS: FilterState = { category: "", brand: "", stock: "", productType: "" };

const PRODUCT_TYPE_FILTER_OPTIONS: FilterOption[] = [
  { value: "", label: "All types" },
  { value: "retail", label: "Retail" },
  { value: "consumable", label: "Consumable" },
  { value: "both", label: "Both" },
];

interface FilterOption {
  value: string;
  label: string;
}

const formatCategoryName = (name: unknown) =>
  String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

// Native <select> popups are painted by the OS and can render past the
// browser viewport when the option list is long (e.g. many brands). This
// draws its own menu inside the drawer and gives the menu its own scrollbar.
const FilterSelect: React.FC<{
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ value, options, onChange, open, onOpenChange }) => {
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const drawer = containerRef.current.closest(".product-filter-drawer");
    const drawerRect = drawer?.getBoundingClientRect();
    const gap = 6;
    const padding = 16;
    const lowerBound = (drawerRect?.bottom ?? window.innerHeight) - padding;
    const upperBound = (drawerRect?.top ?? 0) + padding;
    const spaceBelow = lowerBound - rect.bottom - gap;
    const spaceAbove = rect.top - upperBound - gap;
    const openUpward = spaceBelow < 100 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(120, Math.min(280, availableSpace));

    setMenuStyle(
      openUpward
        ? { bottom: `calc(100% + ${gap}px)`, top: "auto", maxHeight }
        : { top: `calc(100% + ${gap}px)`, bottom: "auto", maxHeight }
    );
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    updateMenuPosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open, onOpenChange]);

  const handleToggle = () => {
    if (!open) updateMenuPosition();
    onOpenChange(!open);
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div className="filter-select" ref={containerRef}>
      <button
        type="button"
        className={`filter-select__toggle${open ? " is-open" : ""}`}
        onClick={handleToggle}
      >
        <span className="filter-select__value">{selected?.label ?? options[0]?.label}</span>
      </button>
      <div className={`filter-select__menu${open ? " is-open" : ""}`} style={menuStyle}>
        {options.map((opt) => (
          <button
            type="button"
            key={opt.value}
            className={`filter-select__option${opt.value === value ? " active" : ""}`}
            onClick={() => { onChange(opt.value); onOpenChange(false); }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const suppliers = useSelector((state: RootState) => state.inventory.suppliers);
  const { formatAmount } = useCurrency();
  const {
    products, page: currentPage, pageSize, totalRecords,
    brands, categories, loading, error,
    fetchProducts, fetchBrands, fetchCategories,
    createBrand, deleteBrand, deleteCategory,
    createCategory, deleteProduct,
    exportCSV, exportExcel, exportPDF,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [drawerProduct, setDrawerProduct] = useState<any | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pending filter state (inside modal, not yet applied)
  const [pendingFilters, setPendingFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // Applied filter state (triggers server fetch when changed)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [openFilterSelect, setOpenFilterSelect] = useState<"category" | "brand" | "productType" | null>(null);

  const [activeModal, setActiveModal] = useState<
    "none" | "brands" | "add_brand" | "categories" | "add_category"
  >("none");
  const [brandName, setBrandName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryNameError, setCategoryNameError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Build a lookup map from category_id -> category name
  const categoryMap: Record<string, string> = {};
  categories.forEach((c: any) => { categoryMap[c.id] = c.name; });

  // Build a lookup map from supplier_id -> supplier name
  const supplierMap: Record<string, string> = {};
  suppliers.forEach((s: any) => { supplierMap[s.id] = s.name; });

  const buildFilterParams = (search: string, filters: FilterState) => ({
    search: search || undefined,
    category_id: filters.category && filters.category !== "none" ? filters.category : undefined,
    brand_id: filters.brand && filters.brand !== "none" ? filters.brand : undefined,
    stock: filters.stock === "low" ? "low" : filters.stock === "out" ? "out_of_stock" : undefined,
    product_type: filters.productType || undefined,
  });

  const buildParams = (page: number, search: string, filters: FilterState, ps?: number) => ({
    page,
    pageSize: ps ?? pageSize,
    ...buildFilterParams(search, filters),
  });

  const isMountedRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchProducts(buildParams(1, searchQuery, appliedFilters));
    setSelectedProducts([]);
    fetchBrands();
    fetchCategories();
    dispatch(fetchSuppliersThunk());
    const t = setTimeout(() => { isMountedRef.current = true; }, 0);
    return () => clearTimeout(t);
  }, []);

  // Re-fetch when applied filters change (skip initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    setSelectedProducts([]);
    fetchProducts(buildParams(1, searchQuery, appliedFilters));
  }, [appliedFilters]);

  // Debounced re-fetch on search input change (skip initial mount)
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSelectedProducts([]);
      fetchProducts(buildParams(1, searchQuery, appliedFilters));
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  // Re-fetch products whenever the page becomes visible (e.g. returning from Quick Sale)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setSelectedProducts([]);
        fetchProducts(buildParams(currentPage, searchQuery, appliedFilters));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchProducts, currentPage, searchQuery, appliedFilters, pageSize]);

  const hasActiveFilters =
    !!appliedFilters.category || !!appliedFilters.brand || !!appliedFilters.stock || !!appliedFilters.productType;

  const handlePageChange = (newPage: number) => {
    setSelectedProducts([]);
    fetchProducts(buildParams(newPage, searchQuery, appliedFilters));
  };

  const handleClearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchQuery("");
    setSelectedProducts([]);
    fetchProducts(buildParams(1, "", appliedFilters));
  };

  const handleOpenFilter = () => {
    setPendingFilters(appliedFilters);
    setOpenFilterSelect(null);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setOpenFilterSelect(null);
    setAppliedFilters(pendingFilters);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setOpenFilterSelect(null);
    setPendingFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setIsFilterModalOpen(false);
  };

  const handleSaveCategory = async () => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    const isDuplicate = categories.some(
      (c: any) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCategoryNameError("A category with this name already exists.");
      return;
    }

    setSavingCategory(true);
    const result = await createCategory(trimmed) as any;
    setSavingCategory(false);

    if (result?.meta?.requestStatus === "rejected") {
      setCategoryNameError(result.payload || "Failed to create category.");
      return;
    }

    setCategoryName("");
    setCategoryNameError("");
    setActiveModal("categories");
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(products.map((p: any) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const openDeleteModal = (ids: string[]) => {
    setProductsToDelete(ids);
    setDeleteInput("");
    setDeleteModalOpen(true);
  };

  const handleDeleteProducts = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(productsToDelete.map((id) => deleteProduct(id)));
      setSelectedProducts([]);
      setDrawerProduct(null);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeleteInput("");
      setProductsToDelete([]);
    }
  };

  return (
    <div className="products-list-page">
      <header className="products-list-page__header">
        <div className="header-left">
          <h1>Products</h1>
        </div>
        <div className="header-actions">
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="btn-options bg-white border-subtle d-flex align-items-center fw-medium"
              id="options-dropdown"
            >
              Options
            </Dropdown.Toggle>
            <Dropdown.Menu
              align="end"
              className="shadow-sm border-0 rounded-3 py-2"
              style={{ minWidth: "220px" }}
            >
              <Dropdown.Item onClick={() => setActiveModal("brands")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <Tag size={16} /> Manage my brands
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setActiveModal("categories")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <Folder2 size={16} /> Manage my categories
              </Dropdown.Item>
              <Dropdown.Item onClick={() => navigate("/dashboard/catalog/products/import")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <BoxArrowInDown size={16} /> Import products
              </Dropdown.Item>
              <Dropdown.Divider className="my-2" />
              <Dropdown.Header className="px-3 py-1 text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>
                Export
              </Dropdown.Header>
              <Dropdown.Item onClick={() => exportPDF(buildFilterParams(searchQuery, appliedFilters))} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkPdf size={16} /> Download PDF
              </Dropdown.Item>
              <Dropdown.Item onClick={() => exportExcel(buildFilterParams(searchQuery, appliedFilters))} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkExcel size={16} /> Download Excel
              </Dropdown.Item>
              <Dropdown.Item onClick={() => exportCSV(buildFilterParams(searchQuery, appliedFilters))} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FiletypeCsv size={16} /> Download CSV
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <button
            className="btn-add"
            onClick={() => navigate("/dashboard/catalog/products/create")}
          >
            Add
          </button>
        </div>
      </header>

      <div className="products-list-page__controls">
        <div className="search-box">
          <Search className="search-icon-abs" size={18} />
          <input
            type="text"
            placeholder="Search by product name, SKU or supplier"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={handleClearSearch}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button
          variant={hasActiveFilters ? "primary" : "outline"}
          className={`filter-btn flex-shrink-0${hasActiveFilters ? " filter-btn--active" : ""}`}
          onClick={handleOpenFilter}
        >
          Filters <Sliders size={16} />
          {hasActiveFilters && (
            <span className="ms-1 badge bg-dark rounded-pill" style={{ fontSize: "10px" }}>
              {[appliedFilters.category, appliedFilters.brand, appliedFilters.stock, appliedFilters.productType].filter(Boolean).length}
            </span>
          )}
        </Button>

        {selectedProducts.length > 0 && (
          <div className="bulk-actions d-flex align-items-center gap-3 ms-auto bg-light px-3 py-2 rounded-3 border">
            <div className="d-flex align-items-center gap-2 fw-medium text-dark">
              <span className="fs-6 d-flex align-items-center">
                {selectedProducts.length === totalRecords
                  ? "All products selected"
                  : `${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""} selected`}
              </span>
              <button
                className="btn btn-sm btn-link text-dark p-0 ms-1 d-flex align-items-center text-decoration-none"
                onClick={() => setSelectedProducts([])}
              >
                <X size={20} />
              </button>
            </div>
            <div className="dropdown d-flex align-items-center border-start ps-3 ms-1">

              <ul className="dropdown-menu shadow">
                <li>
                  <button className="dropdown-item py-2 fw-medium text-dark">
                    Edit retail price
                  </button>
                </li>
                <li>
                  <button className="dropdown-item py-2 fw-medium text-dark">
                    Edit supply price
                  </button>
                </li>
              </ul>
            </div>
            <button className="btn text-danger fw-medium px-2"
              onClick={() => openDeleteModal(selectedProducts)}>
              Delete
            </button>
          </div>
        )}
      </div>

      <main className="products-list-page__content">
        {loading.fetchAll ? (
          <table className="product-table">
            <thead>
              <tr>
                <th className="checkbox-cell" style={{ width: "48px", paddingRight: 0 }} />
                <th>Product name & SKU</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Type</th>
                <th>Unit Size</th>
                <th>Stock  Left</th>
                <th>Retail price</th>
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="checkbox-cell" />
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Skeleton width={36} height={36} borderRadius={6} />
                      <div style={{ flex: 1 }}>
                        <Skeleton width="70%" height={13} style={{ marginBottom: 5 }} />
                        <Skeleton width="40%" height={11} />
                      </div>
                    </div>
                  </td>
                  <td><Skeleton width="60%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td className="actions-cell" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th className="checkbox-cell" style={{ width: "48px", paddingRight: 0 }}>
                  <input
                    type="checkbox"
                    className="form-check-input shadow-none"
                    checked={
                      products.length > 0 &&
                      products.every((p: any) => selectedProducts.includes(p.id))
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Product name & SKU</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Type</th>
                <th>Unit Size</th>
                <th>Stock  Left</th>
                <th>Retail price</th>
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((p: any) => (
                  <tr
                    key={p.id}
                    className={[
                      selectedProducts.includes(p.id) ? "selected-row bg-light" : "",
                      drawerProduct?.id === p.id ? "drawer-selected" : "",
                    ].filter(Boolean).join(" ")}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      // Don't open drawer when clicking the checkbox
                      if ((e.target as HTMLElement).closest(".checkbox-cell")) return;
                      setDrawerProduct(p);
                    }}
                  >
                    <td className="checkbox-cell" style={{ width: "48px", paddingRight: 0 }}>
                      <input
                        type="checkbox"
                        className="form-check-input shadow-none"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => handleSelectProduct(p.id)}
                      />
                    </td>
                    <td className="product-name-cell">
                      <div className="product-icon"><BoxSeam size={20} /></div>
                      <div className="name-info">
                        <span className="name">{p.name}</span>
                        <span className="sku">{p.barcode ?? "—"}</span>
                      </div>
                    </td>
                    <td>{p.category_id ? (categoryMap[p.category_id] ?? p.category_id) : "—"}</td>
                    <td>{p.supplier_id ? (supplierMap[p.supplier_id] ?? p.supplier_id) : "—"}</td>
                    <td>
                      {(() => {
                        const type = p.product_type || "retail";
                        const styles: Record<string, { bg: string; color: string }> = {
                          retail: { bg: "#e0e7ff", color: "#4338ca" },
                          consumable: { bg: "#dcfce7", color: "#15803d" },
                          both: { bg: "#fef3c7", color: "#b45309" },
                        };
                        const labels: Record<string, string> = {
                          retail: "Retail",
                          consumable: "Consumable",
                          both: "Both",
                        };
                        const s = styles[type] ?? styles.retail;
                        return (
                          <span
                            style={{
                              display: "inline-block",
                              background: s.bg,
                              color: s.color,
                              fontWeight: 600,
                              fontSize: "12px",
                              padding: "4px 10px",
                              borderRadius: "12px",
                            }}
                          >
                            {labels[type] ?? "Retail"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="unit-size-cell">
                      {(() => {
                        const bottleSize = parseFloat(p.bottle_size);
                        if (!isNaN(bottleSize) && bottleSize > 0) return `${bottleSize} ${p.measure_unit ?? ""}`.trim();
                        return p.size || "—";
                      })()}
                    </td>
                    <td className="stock-cell">
                      {(() => {
                        const rawAmount = parseFloat(p.amount);
                        const amount = isNaN(rawAmount) ? 0 : rawAmount;
                        const bottleSize = parseFloat(p.bottle_size);
                        // Bottle-tracked products (e.g. 100ml/bottle): show the
                        // derived bottle count here, not the raw remaining
                        // volume — same CEIL rule the Consumable Inventory page
                        // uses (a partially-used bottle still counts as 1).
                        const qty = (!isNaN(bottleSize) && bottleSize > 0) ? Math.ceil(amount / bottleSize) : amount;
                        if (qty <= 0) return (
                          <span style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", fontWeight: 600, fontSize: "12px", padding: "4px 10px", borderRadius: "12px" }}>
                            Out of stock
                          </span>
                        );
                        if (qty <= 5) return (
                          <span style={{ display: "inline-block", background: "#fef3c7", color: "#d97706", fontWeight: 600, fontSize: "12px", padding: "4px 10px", borderRadius: "12px" }}>
                            {qty} low
                          </span>
                        );
                        return (
                          <span style={{ fontWeight: 500, color: "#111" }}>{qty}</span>
                        );
                      })()}
                    </td>
                    <td className="price-cell">
                      {(() => {
                        const rp = parseFloat(p.retail_price);
                        const sp = parseFloat(p.supply_price);
                        const isValidRp = !isNaN(rp) && rp !== 0;
                        const isValidSp = !isNaN(sp) && sp !== 0;

                        if (isValidRp) return formatAmount(rp);
                        if (isValidSp) return formatAmount(sp);

                        // If it's explicitly 0 and intended, we could show a
                        // zero amount, but requirement says 'If both missing -> Price not available'
                        if (p.retail_price === 0 || p.retail_price === "0") return formatAmount(0);
                        if (p.supply_price === 0 || p.supply_price === "0") return formatAmount(0);

                        return <span className="text-muted fst-italic" style={{ fontSize: "12px" }}>Price not available</span>;
                      })()}
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          as="button"
                          bsPrefix="row-actions-toggle"
                          className="row-actions-toggle"
                          id={`row-actions-${p.id}`}
                        >
                          <ThreeDotsVertical size={16} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-2" style={{ minWidth: "160px" }}>
                          <Dropdown.Item
                            onClick={() => navigate(`/dashboard/catalog/products/edit/${p.id}`)}
                            className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                          >
                            <PencilSquare size={14} /> Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => openDeleteModal([p.id])}
                            className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-danger"
                          >
                            <Trash size={14} /> Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-5">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>

      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalRecords}
        onPageChange={handlePageChange}
        onPageSizeChange={(sz) => {
          fetchProducts(buildParams(1, searchQuery, appliedFilters, sz));
        }}
        className="products-pagination"
      />

      {/* ================= DELETE MODAL ================= */}
      <Modal
        show={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete products?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE" || isDeleting}
              loading={isDeleting}
              onClick={handleDeleteProducts}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteInput("");
              }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          Are you sure you want to delete{" "}
          {productsToDelete.length > 1
            ? `these ${productsToDelete.length} products`
            : "this product"}? This operation can't be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>

      {/* Product Drawer */}
      {drawerProduct && (
        <ProductDrawer
          product={products.find((p: any) => p.id === drawerProduct.id) ?? drawerProduct}
          brands={brands}
          categories={categories}
          loading={loading.update}
          onClose={() => setDrawerProduct(null)}
        />
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        >
          <div
            className="product-filter-drawer bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw" }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-3">
              <h5 className="mb-0 fw-bold fs-5 text-dark">Filters</h5>
              <button
                className="btn-close shadow-none"
                onClick={() => {
                  setOpenFilterSelect(null);
                  setIsFilterModalOpen(false);
                }}
              ></button>
            </div>

            <div className="p-4 pt-2 d-flex flex-column gap-3">
              {/* Categories */}
              <div className="d-flex flex-column gap-2 mb-2">
                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: "14px" }}>
                  Categories
                </label>
                <FilterSelect
                  value={pendingFilters.category}
                  onChange={(v) => setPendingFilters((f) => ({ ...f, category: v }))}
                  options={[
                    { value: "", label: "All categories" },
                    { value: "none", label: "No category" },
                    ...categories.map((c: any) => ({ value: c.id, label: formatCategoryName(c.name) })),
                  ]}
                  open={openFilterSelect === "category"}
                  onOpenChange={(nextOpen) => setOpenFilterSelect(nextOpen ? "category" : null)}
                />
              </div>

              {/* Brands */}
              <div className="d-flex flex-column gap-2 mb-2">
                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: "14px" }}>
                  Brands
                </label>
                <FilterSelect
                  value={pendingFilters.brand}
                  onChange={(v) => setPendingFilters((f) => ({ ...f, brand: v }))}
                  options={[
                    { value: "", label: "All brands" },
                    { value: "none", label: "No brand" },
                    ...brands.map((b: any) => ({ value: b.id, label: b.name })),
                  ]}
                  open={openFilterSelect === "brand"}
                  onOpenChange={(nextOpen) => setOpenFilterSelect(nextOpen ? "brand" : null)}
                />
              </div>

              {/* Stock */}
              <div className="d-flex flex-column gap-2 mb-2">
                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: "14px" }}>
                  Stock
                </label>
                <UiDropdown
                  className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select"
                  style={{ fontSize: "15px" }}
                  searchable={false}
                  value={pendingFilters.stock}
                  options={[
                    { id: "", name: "All products" },
                    { id: "low", name: "Low in stock" },
                    { id: "out", name: "Out of stock" },
                  ]}
                  onChange={(id) => setPendingFilters((f) => ({ ...f, stock: id }))}
                />
              </div>

              {/* Product type */}
              <div className="d-flex flex-column gap-2 mb-2">
                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: "14px" }}>
                  Product type
                </label>
                <FilterSelect
                  value={pendingFilters.productType}
                  onChange={(v) => setPendingFilters((f) => ({ ...f, productType: v }))}
                  options={PRODUCT_TYPE_FILTER_OPTIONS}
                  open={openFilterSelect === "productType"}
                  onOpenChange={(nextOpen) => setOpenFilterSelect(nextOpen ? "productType" : null)}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end p-4 pt-1 gap-3">
              <Button
                variant="outline"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyFilters}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Brands Modal */}
      {activeModal === "brands" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
          onClick={() => setActiveModal("none")}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw", minHeight: "320px", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-0">
              <h5 className="mb-0 fw-bold fs-5 text-dark">My brands</h5>
              <button className="btn-close shadow-none" onClick={() => setActiveModal("none")} />
            </div>
            <div className="p-4 d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center overflow-y-auto">
              {brands.length === 0 ? (
                <>
                  <div className="mb-3" style={{ color: "#6366f1" }}>
                    <Search size={48} />
                  </div>
                  <h5 className="fw-bold mb-1 text-dark">No brands here yet.</h5>
                  <p className="text-muted mb-4 small">Your brands will appear here</p>
                  <Button
                    variant="primary"
                    onClick={() => setActiveModal("add_brand")}
                  >
                    Add a brand
                  </Button>
                </>
              ) : (
                <div className="w-100 mt-3 text-start">
                  {brands.map((b: any) => (
                    <div key={b.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>{b.name}</span>
                      <button
                        className="btn btn-sm btn-link text-danger p-0"
                        onClick={() => deleteBrand(b.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="text-center mt-4">
                    <Button
                      variant="primary"
                      onClick={() => setActiveModal("add_brand")}
                    >
                      Add a brand
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Brand Modal */}
      {activeModal === "add_brand" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw" }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-0">
              <h5 className="mb-0 fw-bold fs-5 text-dark">Add a brand</h5>
              <button className="btn-close shadow-none" onClick={() => setActiveModal("none")} />
            </div>
            <div className="p-4 py-3">
              <label className="form-label mb-2 fw-medium text-dark" style={{ fontSize: "13px" }}>
                Brand name
              </label>
              <input
                type="text"
                className="form-control form-control-lg shadow-none border-secondary-subtle"
                placeholder="e.g. L'Oréal"
                style={{ fontSize: "15px" }}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-end p-4 pt-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveModal("brands")}
              >
                Go back
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (brandName.trim()) {
                    await createBrand(brandName.trim());
                    setBrandName("");
                    setActiveModal("brands");
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {activeModal === "categories" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
          onClick={() => setActiveModal("none")}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw", minHeight: "320px", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-0">
              <h5 className="mb-0 fw-bold fs-5 text-dark">My categories</h5>
              <button className="btn-close shadow-none" onClick={() => setActiveModal("none")} />
            </div>
            <div className="p-4 d-flex flex-column flex-grow-1 overflow-y-auto">
              {loading.categories ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-dark" />
                </div>
              ) : categories.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center">
                  <div className="mb-3" style={{ color: "#6366f1" }}>
                    <Search size={48} />
                  </div>
                  <h5 className="fw-bold mb-1 text-dark">No categories here yet.</h5>
                  <p className="text-muted mb-4 small">Your categories will appear here</p>
                  <Button
                    variant="primary"
                    onClick={() => setActiveModal("add_category")}
                  >
                    Add a category
                  </Button>
                </div>
              ) : (
                <div className="w-100 text-start">
                  {categories.map((c: any) => (
                    <div key={c.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>{c.name}</span>
                      <button
                        className="btn btn-sm btn-link text-danger p-0"
                        onClick={() => deleteCategory(c.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="text-center mt-4">
                    <Button
                      variant="primary"
                      onClick={() => setActiveModal("add_category")}
                    >
                      Add a category
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {activeModal === "add_category" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw" }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-0">
              <h5 className="mb-0 fw-bold fs-5 text-dark">Add a category</h5>
              <button
                className="btn-close shadow-none"
                onClick={() => { setActiveModal("none"); setCategoryNameError(""); }}
              />
            </div>
            <div className="p-4 py-3">
              <label className="form-label mb-2 fw-medium text-dark" style={{ fontSize: "13px" }}>
                Category name
              </label>
              <input
                type="text"
                className={`form-control form-control-lg shadow-none ${categoryNameError ? "border-danger" : "border-secondary-subtle"}`}
                placeholder="e.g. Hair care"
                style={{ fontSize: "15px" }}
                value={categoryName}
                onChange={(e) => { setCategoryName(e.target.value); setCategoryNameError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveCategory(); }}
              />
              {categoryNameError && (
                <div className="text-danger mt-2" style={{ fontSize: "13px" }}>{categoryNameError}</div>
              )}
            </div>
            <div className="d-flex justify-content-end p-4 pt-2 gap-3">
              <Button
                variant="outline"
                onClick={() => { setActiveModal("categories"); setCategoryNameError(""); }}
              >
                Go back
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCategory}
                disabled={!categoryName.trim() || savingCategory}
              >
                {savingCategory ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsListPage;
