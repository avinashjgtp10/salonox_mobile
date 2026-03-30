import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    Sliders,
    BoxSeam,
    X,
    Tag,
    Folder2,
    BoxArrowInDown,
    FileText,
    FileEarmarkSpreadsheet
} from "react-bootstrap-icons";
import "../styles/ProductsListPage.scss";

// Mock data for products
const MOCK_PRODUCTS = [
    { id: "1", name: "Shampoo 500ml", sku: "SH001", category: "Hair Care", supplier: "Beauty Care Inc", retailPrice: 850, stock: 15 },
    { id: "2", name: "Hair Wax Pro", sku: "HW002", category: "Styling", supplier: "Style Brands", retailPrice: 450, stock: 3 },
    { id: "3", name: "Conditioner 400ml", sku: "CN003", category: "Hair Care", supplier: "Beauty Care Inc", retailPrice: 720, stock: 22 },
    { id: "4", name: "Keratin Treatment", sku: "KT004", category: "Hair Care", supplier: "ProHair Ltd", retailPrice: 1800, stock: 8 },
    { id: "5", name: "Styling Gel Strong", sku: "SG005", category: "Styling", supplier: "Style Brands", retailPrice: 360, stock: 18 },
    { id: "6", name: "Hair Serum 100ml", sku: "HS006", category: "Hair Care", supplier: "Luxe Beauty", retailPrice: 950, stock: 11 },
    { id: "7", name: "Pomade Classic", sku: "PM007", category: "Styling", supplier: "Style Brands", retailPrice: 520, stock: 4 },
    { id: "8", name: "Argan Oil 50ml", sku: "AO008", category: "Hair Care", supplier: "Luxe Beauty", retailPrice: 1200, stock: 7 },
    { id: "9", name: "Face Moisturizer SPF", sku: "FM009", category: "Skin Care", supplier: "GlowSkin Co", retailPrice: 680, stock: 30 },
    { id: "10", name: "Exfoliating Scrub", sku: "ES010", category: "Skin Care", supplier: "GlowSkin Co", retailPrice: 550, stock: 14 },
    { id: "11", name: "Nail Polish Set (12)", sku: "NP011", category: "Nail Care", supplier: "NailArt Pro", retailPrice: 1100, stock: 6 },
    { id: "12", name: "Cuticle Oil 30ml", sku: "CO012", category: "Nail Care", supplier: "NailArt Pro", retailPrice: 290, stock: 20 },
    { id: "13", name: "Heat Protectant Spray", sku: "HP013", category: "Styling", supplier: "ProHair Ltd", retailPrice: 620, stock: 9 },
    { id: "14", name: "Hair Colour – Chestnut", sku: "HC014", category: "Hair Care", supplier: "ColorMix India", retailPrice: 480, stock: 25 },
    { id: "15", name: "Hair Colour – Blonde", sku: "HC015", category: "Hair Care", supplier: "ColorMix India", retailPrice: 480, stock: 2 },
    { id: "16", name: "Toning Shampoo", sku: "TS016", category: "Hair Care", supplier: "Beauty Care Inc", retailPrice: 790, stock: 12 },
    { id: "17", name: "Sea Salt Spray", sku: "SS017", category: "Styling", supplier: "Style Brands", retailPrice: 410, stock: 17 },
    { id: "18", name: "Under-Eye Cream 20ml", sku: "UE018", category: "Skin Care", supplier: "GlowSkin Co", retailPrice: 860, stock: 0 },
];

const ProductsListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'none' | 'brands' | 'add_brand' | 'categories' | 'add_category'>('none');
    const ROWS_PER_PAGE = 8;

    const filteredProducts = useMemo(() => {
        return MOCK_PRODUCTS.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [searchQuery]);

    // Reset to page 1 whenever the search filter changes
    React.useEffect(() => { setCurrentPage(1); }, [filteredProducts.length]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProducts(paginatedProducts.map(p => p.id));
        } else {
            setSelectedProducts([]);
        }
    };

    const handleSelectProduct = (id: string) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ROWS_PER_PAGE));
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ROWS_PER_PAGE,
        currentPage * ROWS_PER_PAGE
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
                    <div className="dropdown">
                        <button className="btn-options dropdown-toggle" data-bs-toggle="dropdown">
                            Options
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3 py-2" style={{ minWidth: '220px' }}>
                            <li><button className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark" onClick={() => setActiveModal('brands')}><Tag size={16} /> Manage my brands</button></li>
                            <li><button className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark" onClick={() => setActiveModal('categories')}><Folder2 size={16} /> Manage my categories</button></li>
                            <li><button className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark" onClick={() => navigate("/dashboard/catalog/products/import")}><BoxArrowInDown size={16} /> Import products</button></li>
                            <li><hr className="dropdown-divider my-2" /></li>
                            <li className="px-3 py-1 text-muted fw-bold" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Export</li>
                            <li><button className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"><FileText size={16} /> CSV</button></li>
                            <li><button className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"><FileEarmarkSpreadsheet size={16} /> Excel</button></li>
                        </ul>
                    </div>
                    <button className="btn-add" onClick={() => navigate("/dashboard/catalog/products/create")}>
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
                <button className="filter-btn flex-shrink-0" onClick={() => setIsFilterModalOpen(true)}>
                    Filters <Sliders size={16} />
                </button>

                {selectedProducts.length > 0 && (
                    <div className="bulk-actions d-flex align-items-center gap-3 ms-auto bg-light px-3 py-2 rounded-3 border">
                        <div className="d-flex align-items-center gap-2 fw-medium text-dark">
                            <span className="fs-6 d-flex align-items-center">{selectedProducts.length === filteredProducts.length ? 'All products selected' : `${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} selected`}</span>
                            <button className="btn btn-sm btn-link text-dark p-0 ms-1 d-flex align-items-center text-decoration-none" onClick={() => setSelectedProducts([])}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="dropdown d-flex align-items-center border-start ps-3 ms-1">
                            <button className="btn btn-outline-secondary dropdown-toggle bg-white d-flex align-items-center gap-2 fw-medium text-dark border shadow-sm" data-bs-toggle="dropdown">
                                Bulk edit
                            </button>
                            <ul className="dropdown-menu shadow">
                                <li><button className="dropdown-item py-2 fw-medium text-dark">Edit retail price</button></li>
                                <li><button className="dropdown-item py-2 fw-medium text-dark">Edit supply price</button></li>
                            </ul>
                        </div>
                        <button className="btn text-danger fw-medium px-2">Delete</button>
                    </div>
                )}
            </div>

            <main className="products-list-page__content">
                <table className="product-table">
                    <thead>
                        <tr>
                            <th className="checkbox-cell" style={{ width: '48px', paddingRight: 0 }}>
                                <input
                                    type="checkbox"
                                    className="form-check-input shadow-none"
                                    checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.includes(p.id))}
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
                            paginatedProducts.map((p) => (
                                <tr key={p.id} className={selectedProducts.includes(p.id) ? 'selected-row bg-light' : ''}>
                                    <td className="checkbox-cell" style={{ width: '48px', paddingRight: 0 }}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input shadow-none"
                                            checked={selectedProducts.includes(p.id)}
                                            onChange={() => handleSelectProduct(p.id)}
                                        />
                                    </td>
                                    <td className="product-name-cell">
                                        <div className="product-icon">
                                            <BoxSeam size={20} />
                                        </div>
                                        <div className="name-info">
                                            <span className="name">{p.name}</span>
                                            <span className="sku">{p.sku}</span>
                                        </div>
                                    </td>
                                    <td>{p.category}</td>
                                    <td className={`stock-cell ${p.stock < 5 ? 'stock-cell--low' : ''}`}>
                                        {p.stock} in stock
                                    </td>
                                    <td className="price-cell">₹{p.retailPrice.toLocaleString()}</td>
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
            </main>

            <footer className="products-list-page__pagination">
                <span className="page-info">
                    {filteredProducts.length === 0
                        ? 'No results'
                        : `Viewing ${startItem}–${endItem} of ${filteredProducts.length} results`}
                </span>
                {totalPages > 1 && (
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            ← Prev
                        </button>
                        {pageNumbers.map(page => (
                            <button
                                key={page}
                                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            className="pagination-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </footer>

            {isFilterModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
                    <div className="bg-white rounded-4 shadow-lg d-flex flex-column" style={{ width: '480px', maxWidth: '90vw' }}>
                        <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                            <h5 className="mb-0 fw-bold fs-5 text-dark">Filters</h5>
                            <button className="btn-close shadow-none" onClick={() => setIsFilterModalOpen(false)}></button>
                        </div>

                        <div className="p-4 pt-2 d-flex flex-column gap-3">
                            <div className="d-flex flex-column gap-2 mb-2">
                                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: '14px' }}>Categories</label>
                                <select className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select" style={{ fontSize: '15px' }}>
                                    <option>All categories</option>
                                    <option>No category</option>
                                </select>
                            </div>
                            <div className="d-flex flex-column gap-2 mb-2">
                                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: '14px' }}>Brands</label>
                                <select className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select" style={{ fontSize: '15px' }}>
                                    <option>All brands</option>
                                    <option>No brand</option>
                                </select>
                            </div>
                            <div className="d-flex flex-column gap-2 mb-2">
                                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: '14px' }}>Suppliers</label>
                                <select className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select" style={{ fontSize: '15px' }}>
                                    <option>All suppliers</option>
                                    <option>No supplier</option>
                                </select>
                            </div>
                            <div className="d-flex flex-column gap-2 mb-2">
                                <label className="form-label mb-0 fw-medium text-dark" style={{ fontSize: '14px' }}>Stock</label>
                                <select className="form-select form-select-lg shadow-none border-secondary-subtle custom-focus-select" style={{ fontSize: '15px' }}>
                                    <option>All products</option>
                                    <option>Low in stock</option>
                                    <option>Out of stock</option>
                                </select>
                            </div>
                        </div>

                        <div className="d-flex justify-content-end p-4 pt-1 gap-3">
                            <button className="btn btn-outline-dark rounded-pill px-4 fw-medium border shadow-sm" onClick={() => setIsFilterModalOpen(false)}>
                                Clear filters
                            </button>
                            <button className="btn btn-dark rounded-pill px-4 fw-medium shadow-sm" style={{ backgroundColor: '#101828', borderColor: '#101828' }} onClick={() => setIsFilterModalOpen(false)}>
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Brands Modal */}
            {activeModal === 'brands' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
                    <div className="bg-white rounded-4 shadow-lg d-flex flex-column" style={{ width: '480px', maxWidth: '90vw', minHeight: '320px' }}>
                        <div className="d-flex justify-content-between align-items-center p-4 pb-0">
                            <h5 className="mb-0 fw-bold fs-5 text-dark">My brands</h5>
                            <button className="btn-close shadow-none" onClick={() => setActiveModal('none')}></button>
                        </div>
                        <div className="p-4 d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center">
                            <div className="mb-3" style={{ color: '#6366f1' }}>
                                <Search size={48} />
                            </div>
                            <h5 className="fw-bold mb-1 text-dark">No brands here yet.</h5>
                            <p className="text-muted mb-4 small">Your brands will appear here</p>
                            <button className="btn btn-dark rounded-pill px-4 fw-medium" onClick={() => setActiveModal('add_brand')}>
                                Add a brand
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Brand Modal */}
            {activeModal === 'add_brand' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
                    <div className="bg-white rounded-4 shadow-lg d-flex flex-column" style={{ width: '480px', maxWidth: '90vw' }}>
                        <div className="d-flex justify-content-between align-items-center p-4 pb-0">
                            <h5 className="mb-0 fw-bold fs-5 text-dark">Add a brand</h5>
                            <button className="btn-close shadow-none" onClick={() => setActiveModal('none')}></button>
                        </div>
                        <div className="p-4 py-3">
                            <label className="form-label mb-2 fw-medium text-dark" style={{ fontSize: '13px' }}>Brand name</label>
                            <input type="text" className="form-control form-control-lg shadow-none border-secondary-subtle" placeholder="e.g. salonox" style={{ fontSize: '15px' }} />
                        </div>
                        <div className="d-flex justify-content-end p-4 pt-2 gap-3">
                            <button className="btn btn-light rounded-pill px-4 fw-medium border shadow-sm" style={{ backgroundColor: '#fff' }} onClick={() => setActiveModal('brands')}>
                                Go back
                            </button>
                            <button className="btn btn-dark rounded-pill px-4 fw-medium shadow-sm" onClick={() => setActiveModal('none')}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Categories Modal */}
            {activeModal === 'categories' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
                    <div className="bg-white rounded-4 shadow-lg d-flex flex-column" style={{ width: '480px', maxWidth: '90vw', minHeight: '320px' }}>
                        <div className="d-flex justify-content-between align-items-center p-4 pb-0">
                            <h5 className="mb-0 fw-bold fs-5 text-dark">My categories</h5>
                            <button className="btn-close shadow-none" onClick={() => setActiveModal('none')}></button>
                        </div>
                        <div className="p-4 d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center">
                            <div className="mb-3" style={{ color: '#6366f1' }}>
                                <Search size={48} />
                            </div>
                            <h5 className="fw-bold mb-1 text-dark">No categories here yet.</h5>
                            <p className="text-muted mb-4 small">Your categories will appear here</p>
                            <button className="btn btn-dark rounded-pill px-4 fw-medium" onClick={() => setActiveModal('add_category')}>
                                Add a category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {activeModal === 'add_category' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
                    <div className="bg-white rounded-4 shadow-lg d-flex flex-column" style={{ width: '480px', maxWidth: '90vw' }}>
                        <div className="d-flex justify-content-between align-items-center p-4 pb-0">
                            <h5 className="mb-0 fw-bold fs-5 text-dark">Add a category</h5>
                            <button className="btn-close shadow-none" onClick={() => setActiveModal('none')}></button>
                        </div>
                        <div className="p-4 py-3">
                            <label className="form-label mb-2 fw-medium text-dark" style={{ fontSize: '13px' }}>Category name</label>
                            <input type="text" className="form-control form-control-lg shadow-none border-secondary-subtle" placeholder="e.g. salonox" style={{ fontSize: '15px' }} />
                        </div>
                        <div className="d-flex justify-content-end p-4 pt-2 gap-3">
                            <button className="btn btn-light rounded-pill px-4 fw-medium border shadow-sm" style={{ backgroundColor: '#fff' }} onClick={() => setActiveModal('none')}>
                                Cancel
                            </button>
                            <button className="btn btn-dark rounded-pill px-4 fw-medium shadow-sm" onClick={() => setActiveModal('none')}>
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
