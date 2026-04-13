import React, { useState, useMemo, useEffect } from "react";
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
  FiletypeCsv
} from "react-bootstrap-icons";
import { Dropdown } from "react-bootstrap";
import { useProducts } from "../hooks/useProducts";
import "../styles/ProductsListPage.scss";

interface FilterState {
  category: string;
  brand: string;
  stock: string;
}

const DEFAULT_FILTERS: FilterState = { category: "", brand: "", stock: "" };

const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    products, brands, categories, loading, error,
    fetchProducts, fetchBrands, fetchCategories,
    createBrand, deleteCategory,
    createCategory, deleteProduct,
    exportCSV, exportExcel, exportPDF,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Pending filter state (inside modal, not yet applied)
  const [pendingFilters, setPendingFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // Applied filter state (used to actually filter the list)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const [activeModal, setActiveModal] = useState<
    "none" | "brands" | "add_brand" | "categories" | "add_category"
  >("none");
  const [brandName, setBrandName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const ROWS_PER_PAGE = 8;

  useEffect(() => {
    fetchProducts();
    fetchBrands();
    fetchCategories();
  }, [fetchProducts, fetchBrands, fetchCategories]);

  // Build a lookup map from category_id -> category name
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      // Text search
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        !appliedFilters.category ||
        appliedFilters.category === "none"
          ? appliedFilters.category === "none"
            ? !p.category_id
            : true
          : p.category_id === appliedFilters.category;

      // Brand filter
      const matchesBrand =
        !appliedFilters.brand ||
        appliedFilters.brand === "none"
          ? appliedFilters.brand === "none"
            ? !p.brand_id
            : true
          : p.brand_id === appliedFilters.brand;

      // Stock filter
      const amount = p.amount ?? 0;
      const matchesStock =
        !appliedFilters.stock ||
        (appliedFilters.stock === "low" ? amount > 0 && amount < 5 : true) ||
        (appliedFilters.stock === "out" ? amount === 0 : true);

      return matchesSearch && matchesCategory && matchesBrand && matchesStock;
    });
  }, [products, searchQuery, appliedFilters]);

  // Reset to page 1 whenever the filtered list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts.length]);

  const hasActiveFilters =
    !!appliedFilters.category || !!appliedFilters.brand || !!appliedFilters.stock;

  const handleOpenFilter = () => {
    setPendingFilters(appliedFilters);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(pendingFilters);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setPendingFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setIsFilterModalOpen(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(paginatedProducts.map((p: any) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ROWS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );
  const startItem = filteredProducts.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, filteredProducts.length);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

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
              <Dropdown.Item onClick={exportPDF} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkPdf size={16} /> Download PDF
              </Dropdown.Item>
              <Dropdown.Item onClick={exportExcel} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkExcel size={16} /> Download Excel
              </Dropdown.Item>
              <Dropdown.Item onClick={exportCSV} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
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
            placeholder="Search by product name or SKU"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className={`filter-btn flex-shrink-0${hasActiveFilters ? " filter-btn--active" : ""}`}
          onClick={handleOpenFilter}
        >
          Filters <Sliders size={16} />
          {hasActiveFilters && (
            <span className="ms-1 badge bg-dark rounded-pill" style={{ fontSize: "10px" }}>
              {[appliedFilters.category, appliedFilters.brand, appliedFilters.stock].filter(Boolean).length}
            </span>
          )}
        </button>

        {selectedProducts.length > 0 && (
          <div className="bulk-actions d-flex align-items-center gap-3 ms-auto bg-light px-3 py-2 rounded-3 border">
            <div className="d-flex align-items-center gap-2 fw-medium text-dark">
              <span className="fs-6 d-flex align-items-center">
                {selectedProducts.length === filteredProducts.length
                  ? "All products selected"
                  : `${selectedProducts.length} product${selectedProducts.length > 1 ? "s" : ""} selected`}
              </span>
              <button
                className="btn btn-sm btn-link text-dark p-0 ms-1 d-flex align-items-center text-decoration-none"
                onClick={() => setSelectedProducts([])}
              >
                <X size={20} />
              </button>
            </div>
            <div className="dropdown d-flex align-items-center border-start ps-3 ms-1">
              <button
                className="btn btn-outline-secondary dropdown-toggle bg-white d-flex align-items-center gap-2 fw-medium text-dark border shadow-sm"
                data-bs-toggle="dropdown"
              >
                Bulk edit
              </button>
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
              onClick={() => {
                selectedProducts.forEach((id) => deleteProduct(id));
                setSelectedProducts([]);
              }}>
              Delete
            </button>
          </div>
        )}
      </div>

      <main className="products-list-page__content">
        {loading.fetchAll ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark" />
          </div>
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
                      paginatedProducts.length > 0 &&
                      paginatedProducts.every((p: any) => selectedProducts.includes(p.id))
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Product name & SKU</th>
                <th>Category</th>
                <th>Stock level</th>
                <th>Retail price</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p: any) => (
                  <tr
                    key={p.id}
                    className={selectedProducts.includes(p.id) ? "selected-row bg-light" : ""}
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
                    <td className={`stock-cell ${(p.amount ?? 0) < 5 ? "stock-cell--low" : ""}`}>
                      {p.amount ?? 0} in stock
                    </td>
                    <td className="price-cell">₹{(p.retail_price ?? 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>

      <footer className="products-list-page__pagination">
        <span className="page-info">
          {filteredProducts.length === 0
            ? "No results"
            : `Viewing ${startItem}–${endItem} of ${filteredProducts.length} results`}
        </span>
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ← Prev
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </footer>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw" }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-3">
              <h5 className="mb-0 fw-bold fs-5 text-dark">Filters</h5>
              <button
                className="btn-close shadow-none"
                onClick={() => setIsFilterModalOpen(false)}
              ></button>
            </div>

            <div className="p-4 pt-2 d-flex flex-column gap-3">
              {/* Categories */}
              <div className="d-flex flex-column gap-2 mb-2">
                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: "14px" }}>
                  Categories
                </label>
                <select
                  className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select"
                  style={{ fontSize: "15px" }}
                  value={pendingFilters.category}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">All categories</option>
                  <option value="none">No category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Brands */}
              <div className="d-flex flex-column gap-2 mb-2">
                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: "14px" }}>
                  Brands
                </label>
                <select
                  className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select"
                  style={{ fontSize: "15px" }}
                  value={pendingFilters.brand}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, brand: e.target.value }))}
                >
                  <option value="">All brands</option>
                  <option value="none">No brand</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Stock */}
              <div className="d-flex flex-column gap-2 mb-2">
                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: "14px" }}>
                  Stock
                </label>
                <select
                  className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select"
                  style={{ fontSize: "15px" }}
                  value={pendingFilters.stock}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, stock: e.target.value }))}
                >
                  <option value="">All products</option>
                  <option value="low">Low in stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-end p-4 pt-1 gap-3">
              <button
                className="btn btn-outline-dark rounded-pill px-4 fw-medium border shadow-sm"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
              <button
                className="btn btn-dark rounded-pill px-4 fw-medium shadow-sm"
                style={{ backgroundColor: "#101828", borderColor: "#101828" }}
                onClick={handleApplyFilters}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brands Modal */}
      {activeModal === "brands" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw", minHeight: "320px" }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-0">
              <h5 className="mb-0 fw-bold fs-5 text-dark">My brands</h5>
              <button className="btn-close shadow-none" onClick={() => setActiveModal("none")} />
            </div>
            <div className="p-4 d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center">
              {brands.length === 0 ? (
                <>
                  <div className="mb-3" style={{ color: "#6366f1" }}>
                    <Search size={48} />
                  </div>
                  <h5 className="fw-bold mb-1 text-dark">No brands here yet.</h5>
                  <p className="text-muted mb-4 small">Your brands will appear here</p>
                  <button
                    className="btn btn-dark rounded-pill px-4 fw-medium"
                    onClick={() => setActiveModal("add_brand")}
                  >
                    Add a brand
                  </button>
                </>
              ) : (
                <div className="w-100 mt-3 text-start">
                  {brands.map((b: any) => (
                    <div key={b.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>{b.name}</span>
                    </div>
                  ))}
                  <div className="text-center mt-4">
                    <button
                      className="btn btn-dark rounded-pill px-4 mt-3"
                      onClick={() => setActiveModal("add_brand")}
                    >
                      Add a brand
                    </button>
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
              <button
                className="btn btn-light rounded-pill px-4 fw-medium border shadow-sm"
                style={{ backgroundColor: "#fff" }}
                onClick={() => setActiveModal("brands")}
              >
                Go back
              </button>
              <button
                className="btn btn-dark rounded-pill px-4 fw-medium shadow-sm"
                onClick={async () => {
                  if (brandName.trim()) {
                    await createBrand(brandName.trim());
                    setBrandName("");
                    setActiveModal("brands");
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {activeModal === "categories" && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        >
          <div
            className="bg-white rounded-4 shadow-lg d-flex flex-column"
            style={{ width: "480px", maxWidth: "90vw", minHeight: "320px" }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 pb-0">
              <h5 className="mb-0 fw-bold fs-5 text-dark">My categories</h5>
              <button className="btn-close shadow-none" onClick={() => setActiveModal("none")} />
            </div>
            <div className="p-4 d-flex flex-column flex-grow-1">
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
                  <button
                    className="btn btn-dark rounded-pill px-4 fw-medium"
                    onClick={() => setActiveModal("add_category")}
                  >
                    Add a category
                  </button>
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
                    <button
                      className="btn btn-dark rounded-pill px-4 mt-3"
                      onClick={() => setActiveModal("add_category")}
                    >
                      Add a category
                    </button>
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
              <button className="btn-close shadow-none" onClick={() => setActiveModal("none")} />
            </div>
            <div className="p-4 py-3">
              <label className="form-label mb-2 fw-medium text-dark" style={{ fontSize: "13px" }}>
                Category name
              </label>
              <input
                type="text"
                className="form-control form-control-lg shadow-none border-secondary-subtle"
                placeholder="e.g. Hair care"
                style={{ fontSize: "15px" }}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-end p-4 pt-2 gap-3">
              <button
                className="btn btn-light rounded-pill px-4 fw-medium border shadow-sm"
                style={{ backgroundColor: "#fff" }}
                onClick={() => setActiveModal("categories")}
              >
                Go back
              </button>
              <button
                className="btn btn-dark rounded-pill px-4 fw-medium shadow-sm"
                onClick={async () => {
                  if (categoryName.trim()) {
                    await createCategory(categoryName.trim());
                    setCategoryName("");
                    setActiveModal("categories");
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsListPage;
