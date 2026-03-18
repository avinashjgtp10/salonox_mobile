import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronDown,
    Search,
    Sliders,
    BoxSeam,
} from "react-bootstrap-icons";
import "../styles/ProductsListPage.scss";

// Mock data for products
const MOCK_PRODUCTS = [
    {
        id: "1",
        name: "Shampoo 500ml",
        sku: "SH001",
        category: "Hair Care",
        supplier: "Beauty Care Inc",
        retailPrice: 850,
        stock: 15,
    },
    {
        id: "2",
        name: "Hair Wax Pro",
        sku: "HW002",
        category: "Styling",
        supplier: "Style Brands",
        retailPrice: 450,
        stock: 3,
    }
];

const ProductsListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredProducts = useMemo(() => {
        return MOCK_PRODUCTS.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 p.sku.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [searchQuery]);

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
                        <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 py-2">
                            <li><button className="dropdown-item py-2 px-3 fw-medium">Export to CSV</button></li>
                            <li><button className="dropdown-item py-2 px-3 fw-medium">Inventory settings</button></li>
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
                <button className="filter-btn">
                    Filters <Sliders size={16} />
                </button>
            </div>

            <main className="products-list-page__content">
                <table className="product-table">
                    <thead>
                        <tr>
                            <th>Product name & SKU</th>
                            <th>Category</th>
                            <th>Stock level</th>
                            <th>Retail price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                                <tr key={p.id}>
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
                                <td colSpan={4} className="text-center py-5">
                                    No products found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>

            <footer className="products-list-page__pagination">
                <span className="page-info">1 of 1</span>
            </footer>
        </div>
    );
};

export default ProductsListPage;
