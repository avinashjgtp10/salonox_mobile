import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { XLg } from "react-bootstrap-icons";
import "../styles/CreateProductPage.scss";

// UI Components
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

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
            <div className="cpp__topbar d-flex align-items-center justify-content-between px-4 shadow-sm border-bottom">
                <Button variant="ghost" onClick={() => navigate(-1)} className="cpp__close-btn p-0 border-0">
                    <XLg size={20} />
                </Button>
                <h5 className="cpp__topbar-title mb-0 fw-bold">Create a product</h5>
                <Button 
                    variant="dark" 
                    onClick={handleSubmit} 
                    disabled={!productName.trim()}
                    className="cpp__submit-btn"
                >
                    Create product
                </Button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="cpp__body">
                <div className="container-narrow">
                    
                    {/* 1. Basic info */}
                    <Card title="Basic info" className="mb-4">
                        <Input 
                            label="Product name"
                            placeholder="e.g. Organic Shampoo"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            required
                        />

                        <div className="row g-3">
                            <div className="col-6">
                                <Input 
                                    label="SKU"
                                    placeholder="Add SKU"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                />
                            </div>
                            <div className="col-6">
                                <Input 
                                    label="Barcode"
                                    placeholder="Add Barcode"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                />
                            </div>
                        </div>

                        <Input 
                            multiline
                            label="Description (optional)"
                            rows={3}
                            placeholder="Add product description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Card>

                    {/* 2. Pricing and Tax */}
                    <Card title="Pricing" className="mb-4">
                        <div className="row g-3">
                            <div className="col-6">
                                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Cost price</label>
                                <div className="cpp__price-wrap position-relative">
                                    <span className="cpp__currency">₹</span>
                                    <input 
                                        type="number"
                                        className="form-control"
                                        style={{ paddingLeft: "2.5rem" }}
                                        placeholder="0.00"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Retail price</label>
                                <div className="cpp__price-wrap position-relative">
                                    <span className="cpp__currency">₹</span>
                                    <input 
                                        type="number"
                                        className="form-control"
                                        style={{ paddingLeft: "2.5rem" }}
                                        placeholder="0.00"
                                        value={retailPrice}
                                        onChange={(e) => setRetailPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 col-6">
                            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Tax rate</label>
                            <select 
                                className="form-select"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                            >
                                <option>No tax</option>
                                <option>5%</option>
                                <option>12%</option>
                                <option>18%</option>
                            </select>
                        </div>
                    </Card>

                    {/* 3. Inventory */}
                    <Card title="Inventory" className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                                <div className="fw-bold small">Track stock levels</div>
                                <div className="text-muted extra-small">Automatically update stock on sales</div>
                            </div>
                            <div className="form-check form-switch m-0">
                                <input 
                                    className="form-check-input" 
                                    type="checkbox" 
                                    role="switch" 
                                    checked={trackStock}
                                    onChange={() => setTrackStock(!trackStock)}
                                    style={{ cursor: "pointer", width: "2.5rem", height: "1.25rem" }}
                                />
                            </div>
                        </div>

                        {trackStock && (
                            <div className="mt-4 col-6">
                                <Input 
                                    type="number"
                                    label="Current stock"
                                    value={stockLevel}
                                    onChange={(e) => setStockLevel(Number(e.target.value))}
                                />
                            </div>
                        )}
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default CreateProductPage;

