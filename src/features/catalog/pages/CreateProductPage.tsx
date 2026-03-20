import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { XLg } from "react-bootstrap-icons";
import "../styles/CreateProductPage.scss";

const CreateProductPage: React.FC = () => {
    const navigate = useNavigate();

    // Basic info
    const [productName, setProductName] = useState("");
    const [sku, setSku] = useState("");
    const [barcode, setBarcode] = useState("");
    const [description, setDescription] = useState("");

    // Pricing
    const [costPrice, setCostPrice] = useState("");
    const [retailPrice, setRetailPrice] = useState("");
    const [taxRate, setTaxRate] = useState("No tax");

    // Inventory
    const [stockLevel, setStockLevel] = useState(0);
    const [trackStock, setTrackStock] = useState(true);

    const handleSubmit = () => {
        console.log({
            productName, sku, barcode, description,
            costPrice, retailPrice, taxRate,
            stockLevel, trackStock
        });
        navigate("/dashboard/catalog/products");
    };

    return (
        <div className="cpp">
            {/* ── Top bar ── */}
            <div className="cpp__topbar d-flex align-items-center justify-content-between px-4 shadow-sm">
                <button className="cpp__close-btn" onClick={() => navigate(-1)}>
                    <XLg size={20} />
                </button>
                <h5 className="cpp__topbar-title mb-0 fw-bold">Create a product</h5>
                <button 
                    className="btn cpp__submit-btn" 
                    onClick={handleSubmit} 
                    disabled={!productName.trim()}
                >
                    Create product
                </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="cpp__body">
                <div className="container-narrow">
                    
                    {/* 1. Basic info */}
                    <div className="cpp__section shadow-sm">
                        <h6 className="cpp__section-title">Basic info</h6>
                        
                        <div className="mb-4">
                            <label className="cpp__label">Product name</label>
                            <input 
                                type="text"
                                className="cpp__input form-control"
                                placeholder="e.g. Organic Shampoo"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                            />
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <label className="cpp__label">SKU</label>
                                <input 
                                    type="text"
                                    className="cpp__input form-control"
                                    placeholder="Add SKU"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                />
                            </div>
                            <div className="col-6">
                                <label className="cpp__label">Barcode</label>
                                <input 
                                    type="text"
                                    className="cpp__input form-control"
                                    placeholder="Add Barcode"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="cpp__label">Description (optional)</label>
                            <textarea 
                                className="cpp__textarea form-control"
                                rows={3}
                                placeholder="Add product description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 2. Pricing and Tax */}
                    <div className="cpp__section shadow-sm">
                        <h6 className="cpp__section-title">Pricing</h6>
                        
                        <div className="row g-3">
                            <div className="col-6">
                                <label className="cpp__label">Cost price</label>
                                <div className="cpp__price-wrap position-relative">
                                    <span className="cpp__currency">₹</span>
                                    <input 
                                        type="number"
                                        className="cpp__input cpp__input--price form-control"
                                        placeholder="0.00"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="cpp__label">Retail price</label>
                                <div className="cpp__price-wrap position-relative">
                                    <span className="cpp__currency">₹</span>
                                    <input 
                                        type="number"
                                        className="cpp__input cpp__input--price form-control"
                                        placeholder="0.00"
                                        value={retailPrice}
                                        onChange={(e) => setRetailPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 col-6">
                            <label className="cpp__label">Tax rate</label>
                            <select 
                                className="cpp__select form-select"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                            >
                                <option>No tax</option>
                                <option>5%</option>
                                <option>12%</option>
                                <option>18%</option>
                            </select>
                        </div>
                    </div>

                    {/* 3. Inventory */}
                    <div className="cpp__section shadow-sm border-0">
                        <h6 className="cpp__section-title">Inventory</h6>
                        
                        <div className="cpp__toggle-row">
                            <div>
                                <div className="fw-bold small">Track stock levels</div>
                                <div className="text-muted extra-small">Automatically update stock on sales</div>
                            </div>
                            <div 
                                className={`cpp__toggle ${trackStock ? "cpp__toggle--on" : ""}`}
                                onClick={() => setTrackStock(!trackStock)}
                            />
                        </div>

                        {trackStock && (
                            <div className="mt-4 col-6">
                                <label className="cpp__label">Current stock</label>
                                <input 
                                    type="number"
                                    className="cpp__input form-control"
                                    value={stockLevel}
                                    onChange={(e) => setStockLevel(Number(e.target.value))}
                                />
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CreateProductPage;
