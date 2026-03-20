import React from "react";
import { ChevronDown, BoxSeam } from "react-bootstrap-icons";
import "../styles/StockOrdersListPage.scss";

const StockOrdersListPage: React.FC = () => {
  return (
    <div className="stock-orders-page">
      <div className="container-fluid">
        
        {/* --- Header --- */}
        <header className="stock-orders-page__header">
          <div className="header-left">
            <h1>Stock orders <span className="text-muted fw-normal fs-6 ms-1">(0)</span></h1>
            <p className="subtext mb-0">
              Add and manage your stock orders. <a href="#">Learn more</a>
            </p>
          </div>

          <div className="header-actions">
            <div className="dropdown">
              <button 
                className="btn btn-options dropdown-toggle border" 
                type="button" 
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Options
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 py-2">
                <li><button className="dropdown-item py-2 px-3 fw-medium">Manage products</button></li>
                <li><button className="dropdown-item py-2 px-3 fw-medium">Manage suppliers</button></li>
              </ul>
            </div>
          </div>
        </header>

        {/* --- Empty State --- */}
        <div className="stock-orders-page__empty-state shadow-sm bg-white">
          <div className="illustration text-primary bg-opacity-10">
            <BoxSeam size={32} />
          </div>
          <h3>No products created yet</h3>
          <p>
            Add products in minutes and start creating stock orders.
          </p>
          <button className="btn btn-learn">
            Learn more
          </button>
        </div>

      </div>
    </div>
  );
};

export default StockOrdersListPage;
