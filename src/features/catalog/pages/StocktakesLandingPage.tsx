import React from "react";
import { Check2, Plus, Dash, BoxSeam } from "react-bootstrap-icons";
import "../styles/StocktakesLandingPage.scss";

const StocktakesLandingPage: React.FC = () => {
  return (
    <div className="stocktakes-landing-page">
      <div className="container-fluid py-4 px-4 px-lg-5">
        
        {/* Hero Section */}
        <div className="stocktakes-landing-page__hero row align-items-center">
          
          {/* Left: Content */}
          <div className="col-12 col-lg-6 stocktakes-landing-page__hero-copy">
            <span className="stocktakes-landing-page__badge">Free to use</span>
            <h1 className="stocktakes-landing-page__headline">
              Track and record your<br />product stock
            </h1>
            <p className="stocktakes-landing-page__subtext">
              Manage and track your product inventory down to the item, view 
              trends and insights with powerful reports.
            </p>

            <ul className="stocktakes-landing-page__checklist list-unstyled">
              {[
                "Use your barcode scanner to quickly count products",
                "Pause the stocktake anytime and resume it later",
                "Update your inventory immediately on completion",
                "Add important information with stocktake notes",
              ].map((item, idx) => (
                <li key={idx}>
                  <Check2 className="check-icon" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <button className="btn stocktakes-landing-page__cta-btn">
                Start now
              </button>
              <button className="btn stocktakes-landing-page__learn-btn">
                Learn more
              </button>
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="col-12 col-lg-6">
            <div className="stocktakes-landing-page__illustration-wrap">
              
              {/* Main stock level card */}
              <div className="stocktakes-landing-page__stock-levels-card shadow">
                <div className="card-title">Stock levels</div>
                {[
                  { name: "Fancy shampoo", stock: "144 in stock", status: "in" },
                  { name: "Perfume", stock: "15 in stock", status: "low" },
                  { name: "Branded conditioner", stock: "8 in stock", status: "low" },
                  { name: "Hair oil", stock: "139 in stock", status: "in" },
                ].map((p, i) => (
                  <div key={i} className="stocktakes-landing-page__product-row">
                    <div className="stocktakes-landing-page__product-thumb">
                       {/* Placeholder for product image */}
                       <BoxSeam size={24} className="text-muted opacity-25" />
                    </div>
                    <div className="stocktakes-landing-page__product-info">
                      <div className="name">{p.name}</div>
                      <div className={`stock stock--${p.status}`}>{p.stock}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Float adjust stock card */}
              <div className="stocktakes-landing-page__adjust-card shadow">
                <div className="card-title text-center">Adjust stock</div>
                <div className="stocktakes-landing-page__adjust-item">
                  <div className="thumb">
                    <BoxSeam size={32} className="text-primary opacity-50" />
                  </div>
                  <div className="controls">
                    <div className="btn-circle"><Dash /></div>
                    <div className="count">16</div>
                    <div className="btn-circle text-primary"><Plus /></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StocktakesLandingPage;
