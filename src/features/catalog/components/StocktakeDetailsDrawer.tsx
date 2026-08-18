import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { XLg, Pencil, BoxSeam, InfoCircle, Shop } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "../styles/StocktakeDetailsDrawer.scss";

interface StocktakeDetailsDrawerProps {
  stocktakeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const StocktakeDetailsDrawer: React.FC<StocktakeDetailsDrawerProps> = ({
  stocktakeId,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [stocktake, setStocktake] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && stocktakeId) {
      const fetchDetails = async () => {
        try {
          setLoading(true);
          const res = await api.get(`/api/v1/inventory/stock-takes/${stocktakeId}`);
          const data = res.data?.data || res.data;
          setStocktake(data);
        } catch (error) {
          console.error("Error fetching stocktake details:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    } else if (!isOpen) {
      setStocktake(null);
    }
  }, [isOpen, stocktakeId]);

  if (!isOpen) return null;

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Review": return "status-review";
      case "In progress": return "status-in-progress";
      case "Completed": return "status-completed";
      case "Canceled": return "status-canceled";
      default: return "";
    }
  };

  return (
    <div className={`sdd-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="sdd" onClick={(e) => e.stopPropagation()}>
        <header className="sdd__header">
          <button className="close-btn" onClick={onClose}>
            <XLg size={20} />
          </button>
          <div className="header-content">
            <div className="stocktake-icon">
              <BoxSeam size={24} />
            </div>
            <div className="title-section">
              <h3 className="stocktake-name">
                {stocktake?.name || `Stocktake #${stocktakeId?.slice(0, 6)}`}
              </h3>
              <div className={`status-badge ${getStatusClass(stocktake?.status)}`}>
                {stocktake?.status || "Pending"}
              </div>
            </div>
          </div>
          <button
            className="edit-btn"
            onClick={() => {
              navigate(`/dashboard/catalog/inventory/stocktakes/edit/${stocktakeId}`);
              onClose();
            }}
          >
            <Pencil size={14} /> Edit
          </button>
        </header>

        {loading ? (
          <div className="sdd__loading">
            <div className="spinner-border spinner-border-sm" role="status" />
            <span>Loading details...</span>
          </div>
        ) : (
          <div className="sdd__body">
            <section className="sdd__section">
              <h4 className="section-title">Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">Location</span>
                  <div className="value d-flex align-items-center gap-2">
                    <Shop size={14} className="text-muted" />
                    <span>{stocktake?.branch_name || "Main Branch"}</span>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="label">Started on</span>
                  <span className="value">
                    {stocktake?.created_at ? formatDateDDMMYYYY(new Date(stocktake.created_at)) : "–"}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Completed on</span>
                  <span className="value">
                    {stocktake?.completed_at ? formatDateDDMMYYYY(new Date(stocktake.completed_at)) : "In progress"}
                  </span>
                </div>
              </div>
            </section>

            <section className="sdd__section">
              <h4 className="section-title">Description</h4>
              <p className="description-text">
                {stocktake?.description || "No description provided."}
              </p>
            </section>

            <section className="sdd__section">
              <div className="section-header d-flex align-items-center justify-content-between mb-3">
                <h4 className="section-title mb-0">Items Counted</h4>
                <span className="badge bg-light text-dark rounded-pill">
                  {stocktake?.items?.length || 0} items
                </span>
              </div>
              <div className="items-list">
                {stocktake?.items?.length > 0 ? (
                  <div className="items-table-wrapper">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="text-end">Actual Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stocktake.items.map((item: any) => (
                          <tr key={item.id}>
                            <td>{item.product_name || "Product"}</td>
                            <td className="text-end fw-bold">{item.actual_qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state py-4 text-center">
                    <InfoCircle size={24} className="text-muted opacity-25 mb-2" />
                    <p className="text-muted small">No items recorded in this stocktake.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default StocktakeDetailsDrawer;
