import React, { useState } from "react";
import { ArrowLeft, Shop } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import "../styles/AddStocktakePage.scss";

const AddStocktakePage: React.FC = () => {
  const navigate = useNavigate();
  const [stocktakeName, setStocktakeName] = useState("");
  const [description, setDescription] = useState("");

  const handleClose = () => {
    navigate("/dashboard/catalog/inventory/stocktakes");
  };

  const handleStartStocktake = () => {
    // Navigate somewhere or save
    navigate("/dashboard/catalog/inventory/stocktakes");
  };

  return (
    <div className="add-stocktake-page">
      {/* Top Header */}
      <header className="add-stocktake-page__header">
        <div className="header-progress-bar"></div>
        <div className="header-content d-flex justify-content-between align-items-center px-4 py-3 border-bottom bg-white">
          <div className="header-left">
            <button className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center" onClick={handleClose} style={{ width: '40px', height: '40px' }}>
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="header-right d-flex gap-3 align-items-center">
            <button className="btn fw-medium text-dark" onClick={handleClose}>
              Close
            </button>
            <button className="btn btn-dark rounded-pill px-4" onClick={handleStartStocktake}>
              Start stocktake
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="add-stocktake-page__main d-flex justify-content-center mt-5">
        <div className="form-container" style={{ width: "100%", maxWidth: "600px" }}>
          
          <div className="mb-4">
            <span className="text-muted fs-6">Create a new stocktake</span>
            <h1 className="fw-bold mt-1 mb-2 fs-2">Add the stocktake info</h1>
            <p className="text-muted">
              Start a full inventory count to keep accurate stock levels. <a href="#" className="text-primary text-decoration-none">Learn more</a>
            </p>
          </div>

          {/* Location Card */}
          <div className="location-card border rounded-3 p-3 d-flex justify-content-between align-items-center mb-5 bg-light">
            <div className="d-flex align-items-center gap-3">
              <div className="icon-wrapper bg-white border rounded p-2 text-primary">
                <Shop size={20} />
              </div>
              <div>
                <h6 className="mb-0 fw-bold">xyz</h6>
                <p className="mb-0 text-muted small">No business address added</p>
              </div>
            </div>
            <button className="btn btn-link text-primary fw-medium text-decoration-none p-0">
              Change
            </button>
          </div>

          <h5 className="fw-bold mb-3">Stocktake info</h5>

          {/* Form */}
          <div className="mb-3">
            <label className="form-label fw-medium text-dark small mb-1">Stocktake name (Optional)</label>
            <input 
              type="text" 
              className="form-control" 
              value={stocktakeName}
              onChange={(e) => setStocktakeName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label fw-medium text-dark small mb-0">Stocktake description (Optional)</label>
              <span className="text-muted small">{description.length}/200</span>
            </div>
            <textarea 
              className="form-control" 
              rows={4} 
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AddStocktakePage;
