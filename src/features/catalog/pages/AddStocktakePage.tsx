import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Shop,
  CheckCircleFill,
  BoxSeam,
  Tags,
  Search,
  Check,
  XLg,
} from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import api from "../../../services/api/axios";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchBranchesThunk, createBranchThunk } from "../../../middleware/salon/salon.thunk";
import { fetchCatalogThunk } from "../../../middleware/catalog/catalog.thunk";
import { createStocktakeThunk, processStockTakeThunk } from "../../../middleware/inventory/inventory.thunk";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import "../styles/AddStocktakePage.scss";

// Removing MOCK_PRODUCTS as we'll use state

const AddStocktakePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentSalon, branches } = useSelector((state: RootState) => state.salon);
  const { items: catalogItems } = useSelector((state: RootState) => state.catalog);
  const { loading: inventoryLoading } = useSelector((state: RootState) => state.inventory);

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 State
  const [stocktakeName, setStocktakeName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // New Branch Form
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchCity, setNewBranchCity] = useState("");
  const [newBranchState, setNewBranchState] = useState("");
  const [newBranchPincode, setNewBranchPincode] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // Initialize selectedBranchId once branches are loaded
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      const mainBranchId = branches.find(b => b.is_main)?.id || branches[0].id;
      setSelectedBranchId(mainBranchId);
    }
  }, [branches, selectedBranchId]);

  // Step 2 State
  const [selectionType, setSelectionType] = useState<"all" | "category" | "manual" | null>(null);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});

  // Step 3 State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Fetch products and branches on mount
  React.useEffect(() => {
    dispatch(fetchCatalogThunk());
    if (currentSalon?.id) {
      dispatch(fetchBranchesThunk(currentSalon.id));
    }
  }, [dispatch, currentSalon?.id]);

  // Fetch stocktake data if editing
  useEffect(() => {
    if (id) {
      const fetchStocktake = async () => {
        try {
          const res = await api.get(`/api/v1/inventory/stock-takes/${id}`);
          const data = res.data?.data || res.data;
          if (data) {
            setStocktakeName(data.name || "");
            setDescription(data.description || "");
            setSelectionType(data.selection_type || "all");
            // If selection_type was manual, we'd need the product IDs too
            if (data.items) {
              setSelectedProductIds(data.items.map((i: any) => String(i.product_id)));
            }
          }
        } catch (error) {
          console.error("Error fetching stocktake:", error);
        }
      };
      fetchStocktake();
    }
  }, [id]);

  const handleClose = () => {
    navigate("/dashboard/catalog/inventory/stocktakes");
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const errors: Record<string, string> = {};
      if (!stocktakeName.trim()) errors.name = "Stocktake name is required";
      if (!selectedBranchId) errors.location = "Please select a location";

      if (Object.keys(errors).length > 0) {
        setStep1Errors(errors);
        showError("Please fill in the required fields");
        return;
      }
      setStep1Errors({});
    }

    if (currentStep === 2) {
      if (!selectionType) {
        setStep2Errors({ selection: "Please select what you would like to count" });
        showError("Please select a counting method");
        return;
      }
      setStep2Errors({});
    }

    if (currentStep === 3) {
      if (selectedProductIds.length === 0) {
        setStep3Errors({ products: "Please select at least one product" });
        showError("No products selected");
        return;
      }
      setStep3Errors({});
    }

    if (currentStep === 2 && selectionType === "all") {
      setCurrentStep(4); // Skip to review
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    if (currentStep === 4 && selectionType === "all") {
      setCurrentStep(2);
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleStartStocktake = async () => {
    if (!currentSalon) return;

    try {
      // 1. Create the stocktake event record
      const activeBranchId = selectedBranchId;
      
      if (!activeBranchId) {
        showError("Please select a location first.");
        return;
      }

      const stocktakeEvent = await dispatch(createStocktakeThunk({
        branch_id: activeBranchId,
        name: stocktakeName,
        description: description,
        selection_type: selectionType || undefined
      })).unwrap();

      // 2. Process the actual quantities
      // If "all" products, we'd need to send all IDs. For now, we process selected ones.
      const itemsToProcess = (selectionType === "all" ? catalogItems : catalogItems.filter((p: any) => selectedProductIds.includes(p.id)))
        .map((p: any) => ({
          product_id: p.id,
          actual_qty: Math.max(0, Math.round(Number(p.amount) || 0)),
          notes: selectionType === "all" ? "Full stocktake" : "Manual selection"
        }));

      if (itemsToProcess.length === 0) {
        throw new Error("No products available to stocktake. Please add products to your catalog first.");
      }

      await dispatch(processStockTakeThunk({
        stocktake_id: stocktakeEvent.id,
        branch_id: activeBranchId,
        items: itemsToProcess
      })).unwrap();

      showSuccess("Stocktake started successfully");
      navigate("/dashboard/catalog/inventory/stocktakes");
    } catch (error: any) {
      console.error("Failed to process stocktake:", error);
      showError(error?.message || "Failed to start stocktake. Please check your network connection.");
    }
  };

  // Step 3 Logic
  const filteredProducts = useMemo(() => {
    return catalogItems.filter((p: any) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [catalogItems, searchQuery]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleAddLocation = async () => {
    if (!currentSalon) return;
    
    // Validation
    const errors: Record<string, string> = {};
    if (!newBranchName.trim()) errors.name = "Branch name is required";
    if (!newBranchAddress.trim()) errors.address = "Address is required";
    if (!newBranchCity.trim()) errors.city = "City is required";
    if (!newBranchState.trim()) errors.state = "State is required";
    if (!newBranchPincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(newBranchPincode.trim())) {
      errors.pincode = "Pincode must be exactly 6 digits";
    }

    if (Object.keys(errors).length > 0) {
      setLocationErrors(errors);
      showError("Please correct the errors before proceeding");
      return;
    }

    setLocationErrors({});
    setCreatingBranch(true);
    try {
      const newBranch = await dispatch(createBranchThunk({
        salon_id: currentSalon.id,
        name: newBranchName,
        address_line1: newBranchAddress,
        city: newBranchCity,
        state: newBranchState,
        pincode: newBranchPincode,
        is_main: branches.length === 0 // Make main if it's the first one
      })).unwrap();

      showSuccess("Location added successfully");
      setSelectedBranchId(newBranch.id);
      setIsAddingLocation(false);
      setIsLocationModalOpen(false);

      // Reset form
      setNewBranchName("");
      setNewBranchAddress("");
      setNewBranchCity("");
      setNewBranchState("");
      setNewBranchPincode("");
    } catch (error: any) {
      showError(error || "Failed to add location");
    } finally {
      setCreatingBranch(false);
    }
  };

  return (
    <div className="add-stocktake-page">
      {overlay}
      {/* HEADER */}
      <header className="add-stocktake-page__header">
        <div className="header-content">
          <div className="header-left">
            <button className="btn-close-circle" onClick={currentStep === 1 ? handleClose : prevStep}>
              <ArrowLeft size={20} />
            </button>
            <h5 className="ms-3 mb-0 fw-bold">{id ? "Edit stocktake" : "New stocktake"}</h5>
          </div>

          <div className="step-progress d-none d-md-flex">
            <div className={`step-item ${currentStep === 1 ? "active" : "completed"}`}>
              <span className="number">{currentStep > 1 ? <Check /> : "1"}</span>
              <span>Info</span>
            </div>
            <div className="separator"></div>
            <div className={`step-item ${currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""}`}>
              <span className="number">{currentStep > 2 ? <Check /> : "2"}</span>
              <span>Selection</span>
            </div>
            {selectionType !== "all" && (
              <>
                <div className="separator"></div>
                <div className={`step-item ${currentStep === 3 ? "active" : currentStep > 3 ? "completed" : ""}`}>
                  <span className="number">{currentStep > 3 ? <Check /> : "3"}</span>
                  <span>Products</span>
                </div>
              </>
            )}
            <div className="separator"></div>
            <div className={`step-item ${currentStep === 4 ? "active" : ""}`}>
              <span className="number">4</span>
              <span>Review</span>
            </div>
          </div>

          <div className="header-right">
            <button className="btn-cancel" onClick={handleClose}>Cancel</button>
            {currentStep < 4 ? (
              <button
                className="btn-next"
                onClick={nextStep}
              >
                Next
              </button>
            ) : (
              <button className="btn-start" onClick={handleStartStocktake} disabled={inventoryLoading}>
                {inventoryLoading ? "Processing..." : "Start stocktake"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="add-stocktake-page__main">
        <div className="form-wrap">

          {/* STEP 1: INFO */}
          {currentStep === 1 && (
            <div className="step-card animated-in">
              <header>
                <h1>{id ? "Edit stocktake info" : "Add stocktake info"}</h1>
                <p>Start a full inventory count to keep accurate stock levels. <a href="#">Learn more</a></p>
              </header>

              <div className={`location-card ${step1Errors.location ? "location-card--error" : ""}`}>
                <div className="location-info">
                  <div className="icon-box"><Shop size={22} /></div>
                  <div className="details">
                    <h6>{branches.find(b => b.id === selectedBranchId)?.name || currentSalon?.business_name || "Select Location"}</h6>
                    <p>{branches.find(b => b.id === selectedBranchId)?.address_line1 || "No business address added"}</p>
                  </div>
                </div>
                <button className="btn-change" onClick={() => setIsLocationModalOpen(true)}>Change</button>
              </div>
              {step1Errors.location && <div className="error-text mb-4">{step1Errors.location}</div>}

              <div className={`form-group ${step1Errors.name ? "form-group--error" : ""}`}>
                <label>Stocktake name <span className="required-mark">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Monthly Inventory - April"
                  value={stocktakeName}
                  onChange={(e) => {
                    setStocktakeName(e.target.value);
                    if (step1Errors.name) setStep1Errors(prev => ({ ...prev, name: "" }));
                  }}
                />
                {step1Errors.name && <span className="error-message">{step1Errors.name}</span>}
              </div>

              <div className="form-group">
                <label>
                  Stocktake description <span className="optional">(Optional)</span>
                  <span className="char-count">{description.length}/200</span>
                </label>
                <textarea
                  className="form-control"
                  maxLength={200}
                  placeholder="Add details about this stocktake..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: SELECTION TYPE */}
          {currentStep === 2 && (
            <div className="step-card animated-in">
              <header>
                <h1>What would you like to count?</h1>
                <p>Select which products should be included in this stocktake.</p>
              </header>

              <div className={`selection-grid-container ${step2Errors.selection ? "selection-grid-container--error" : ""}`}>
                <div className="selection-grid">
                  <div
                    className={`selection-card ${selectionType === "all" ? "selected" : ""}`}
                    onClick={() => {
                      setSelectionType("all");
                      if (step2Errors.selection) setStep2Errors({});
                    }}
                  >
                    <div className="icon-box"><BoxSeam size={24} /></div>
                    <h3>All products</h3>
                    <p>Count every product currently in your inventory.</p>
                  </div>
                  <div
                    className={`selection-card ${selectionType === "category" ? "selected" : ""}`}
                    onClick={() => {
                      setSelectionType("category");
                      if (step2Errors.selection) setStep2Errors({});
                    }}
                  >
                    <div className="icon-box"><Tags size={24} /></div>
                    <h3>By category</h3>
                    <p>Select specific categories of products to count.</p>
                  </div>
                  <div
                    className={`selection-card ${selectionType === "manual" ? "selected" : ""}`}
                    onClick={() => {
                      setSelectionType("manual");
                      if (step2Errors.selection) setStep2Errors({});
                    }}
                  >
                    <div className="icon-box"><CheckCircleFill size={24} /></div>
                    <h3>Specific products</h3>
                    <p>Manually pick each product you want to include.</p>
                  </div>
                </div>
              </div>
              {step2Errors.selection && <div className="error-text mt-3 text-center">{step2Errors.selection}</div>}
            </div>
          )}

          {/* STEP 3: PRODUCT SELECTION */}
          {currentStep === 3 && (
            <div className="step-card animated-in">
              <header>
                <h1>Select products</h1>
                <p className={`${step3Errors.products ? "error-text" : ""}`}>
                  {step3Errors.products ? step3Errors.products : `${selectedProductIds.length} products selected`}
                </p>
              </header>

              <div className={`search-compact mb-4 ${step3Errors.products ? "border border-danger rounded-3" : ""}`}>
                <Search className="icon" size={16} />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (step3Errors.products) setStep3Errors({}); }}
                />
              </div>

              <div className={`product-selection-table ${step3Errors.products ? "border-danger" : ""}`}>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}></th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>In stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p: any) => (
                        <tr
                          key={p.id}
                          className={selectedProductIds.includes(p.id) ? "selected" : ""}
                          onClick={() => toggleProduct(p.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedProductIds.includes(p.id)}
                              readOnly
                            />
                          </td>
                          <td>
                            <div className="product-info">
                              <span className="name">{p.name}</span>
                              <span className="sku">{p.sku}</span>
                            </div>
                          </td>
                          <td>{p.category || "No category"}</td>
                          <td>{p.amount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 4 && (
            <div className="step-card animated-in text-center">
              <header>
                <div className="mb-4 text-success"><CheckCircleFill size={64} /></div>
                <h1>Ready to start?</h1>
                <p>Review the details below before launching the stocktake.</p>
              </header>

              <div className="review-summary text-start bg-light p-4 rounded-4 border mt-4">
                <div className="row g-4">
                  <div className="col-6">
                    <label className="small text-muted fw-bold text-uppercase">Stocktake Name</label>
                    <p className="mb-0 fw-medium">{stocktakeName || "Untitled Stocktake"}</p>
                  </div>
                  <div className="col-6">
                    <label className="small text-muted fw-bold text-uppercase">Location</label>
                    <p className="mb-0 fw-medium">
                      {branches.find(b => b.id === selectedBranchId)?.name || "Not selected"}
                    </p>
                  </div>
                  <div className="col-6">
                    <label className="small text-muted fw-bold text-uppercase">Scope</label>
                    <p className="mb-0 fw-medium">
                      {selectionType === "all" ? "All Products" :
                        selectionType === "category" ? "Categorized Selection" : "Specific Products"}
                    </p>
                  </div>
                  <div className="col-6">
                    <label className="small text-muted fw-bold text-uppercase">Item Count</label>
                    <p className="mb-0 fw-medium">
                      {selectionType === "all" ? "Whole Inventory" : `${selectedProductIds.length} items`}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-muted small">
                Once started, your current stock levels will be recorded. At the end of the stocktake, they will be updated based on your counts.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* LOCATION SELECTION MODAL */}
      {isLocationModalOpen && (
        <div className="location-modal-overlay" onClick={() => {
          setIsLocationModalOpen(false);
          setIsAddingLocation(false);
        }}>
          <div className="location-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div className="d-flex align-items-center gap-2">
                {isAddingLocation && (
                  <button className="btn-back" onClick={() => setIsAddingLocation(false)}>
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 className="mb-0">{isAddingLocation ? "Add new location" : "Select location"}</h2>
              </div>
              <button className="close-btn" onClick={() => {
                setIsLocationModalOpen(false);
                setIsAddingLocation(false);
              }}>
                <XLg size={20} />
              </button>
            </header>

            {!isAddingLocation ? (
              <div className="branch-list">
                {/* NEW LOCATION BUTTON */}
                <div 
                  className="branch-item branch-item--add"
                  onClick={() => setIsAddingLocation(true)}
                >
                  <div className="branch-info">
                    <div className="icon-box-small">
                      <XLg size={16} style={{ transform: "rotate(45deg)" }} />
                    </div>
                    <div>
                      <div className="name fw-bold">Add new location</div>
                      <div className="address">Create a new branch for your salon</div>
                    </div>
                  </div>
                </div>

                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className={`branch-item ${selectedBranchId === branch.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedBranchId(branch.id);
                      setIsLocationModalOpen(false);
                    }}
                  >
                    <div className="branch-info">
                      <Shop size={20} className="icon" />
                      <div>
                        <div className="name">{branch.name} {branch.is_main && <span className="badge-main">Main</span>}</div>
                        <div className="address">{branch.address_line1}, {branch.city}</div>
                      </div>
                    </div>
                    {selectedBranchId === branch.id && <Check size={24} className="check-icon" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="add-branch-form p-4">
                <div className={`form-group mb-3 ${locationErrors.name ? "form-group--error" : ""}`}>
                  <label className="small fw-bold mb-1">Branch name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Downtown Branch"
                    value={newBranchName}
                    onChange={(e) => {
                      setNewBranchName(e.target.value);
                      if (locationErrors.name) setLocationErrors(prev => ({ ...prev, name: "" }));
                    }}
                  />
                  {locationErrors.name && <span className="error-message">{locationErrors.name}</span>}
                </div>
                <div className={`form-group mb-3 ${locationErrors.address ? "form-group--error" : ""}`}>
                  <label className="small fw-bold mb-1">Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Street address, building..."
                    value={newBranchAddress}
                    onChange={(e) => {
                      setNewBranchAddress(e.target.value);
                      if (locationErrors.address) setLocationErrors(prev => ({ ...prev, address: "" }));
                    }}
                  />
                  {locationErrors.address && <span className="error-message">{locationErrors.address}</span>}
                </div>
                <div className="row g-3">
                  <div className="col-6">
                    <div className={`form-group mb-3 ${locationErrors.city ? "form-group--error" : ""}`}>
                      <label className="small fw-bold mb-1">City</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="City"
                        value={newBranchCity}
                        onChange={(e) => {
                          setNewBranchCity(e.target.value);
                          if (locationErrors.city) setLocationErrors(prev => ({ ...prev, city: "" }));
                        }}
                      />
                      {locationErrors.city && <span className="error-message">{locationErrors.city}</span>}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className={`form-group mb-3 ${locationErrors.state ? "form-group--error" : ""}`}>
                      <label className="small fw-bold mb-1">State</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="State"
                        value={newBranchState}
                        onChange={(e) => {
                          setNewBranchState(e.target.value);
                          if (locationErrors.state) setLocationErrors(prev => ({ ...prev, state: "" }));
                        }}
                      />
                      {locationErrors.state && <span className="error-message">{locationErrors.state}</span>}
                    </div>
                  </div>
                </div>
                <div className={`form-group mb-4 ${locationErrors.pincode ? "form-group--error" : ""}`}>
                  <label className="small fw-bold mb-1">Pincode</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="6-digit pincode"
                    value={newBranchPincode}
                    onChange={(e) => {
                      setNewBranchPincode(e.target.value);
                      if (locationErrors.pincode) setLocationErrors(prev => ({ ...prev, pincode: "" }));
                    }}
                  />
                  {locationErrors.pincode && <span className="error-message">{locationErrors.pincode}</span>}
                </div>
                <button 
                  className="btn btn-dark w-100 rounded-pill py-2 fw-bold"
                  onClick={handleAddLocation}
                  disabled={creatingBranch}
                >
                  {creatingBranch ? "Adding Location..." : "Add Location"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default AddStocktakePage;
