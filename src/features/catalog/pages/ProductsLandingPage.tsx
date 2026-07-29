import React from "react";
import { useNavigate } from "react-router-dom";
import { Check2, BoxSeam } from "react-bootstrap-icons";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/ProductsLandingPage.scss";

const ProductsLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  return (
    <div className="products-landing-page">
      <div className="container-fluid py-4 px-4">
        {/* Page Header */}
        <div className="row align-items-center mb-4">
          <div className="col">
            <h4 className="products-landing-page__title fw-bold mb-0">
              Products
            </h4>
            <p className="text-muted small mb-0">
              Manage your inventory and retail products
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="products-landing-page__hero row align-items-center">
          {/* Left: Copy */}
          <div className="col-12 col-lg-6 products-landing-page__hero-copy">
            <span className="products-landing-page__badge mb-3 d-inline-block">
              New Feature
            </span>
            <h2 className="products-landing-page__headline fw-bold mb-3">
              Track your inventory
              <br />
              and sales
            </h2>
            <p className="products-landing-page__subtext mb-4">
              Keep track of stock levels, manage suppliers, and grow your retail
              revenue with ease.
            </p>

            <ul className="products-landing-page__checklist list-unstyled mb-4">
              {[
                "Monitor real-time stock levels and low-stock alerts",
                "Manage multiple suppliers and purchase orders",
                "Analyze product performance and retail trends",
              ].map((item) => (
                <li key={item} className="d-flex align-items-start gap-2 mb-2">
                  <Check2 className="products-landing-page__check-icon mt-1 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <button
                className="btn products-landing-page__cta-btn"
                onClick={() => navigate("/dashboard/catalog/products/create")}
              >
                Start now
              </button>
              <LearnMoreLink topic="products-landing" className="btn products-landing-page__learn-btn">
                Learn more
              </LearnMoreLink>
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="col-12 col-lg-6 d-flex justify-content-center justify-content-lg-end mt-5 mt-lg-0">
            <div className="products-landing-page__illustration-wrap">
              {/* Product stack card */}
              <div className="products-landing-page__product-stack shadow-lg">
                <div className="fw-bold small mb-3 border-bottom pb-2">
                  Top Sellers
                </div>
                {[
                  {
                    name: "Organic Shampoo",
                    price: formatAmount(850),
                    stock: 24,
                    status: "OK",
                  },
                  {
                    name: "Hair Wax Pro",
                    price: formatAmount(450),
                    stock: 5,
                    status: "LOW",
                  },
                  {
                    name: "Conditioner Lite",
                    price: formatAmount(650),
                    stock: 12,
                    status: "OK",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="products-landing-page__item-row"
                  >
                    <div className="flex-grow-1">
                      <div className="small fw-bold">{item.name}</div>
                      <div className="text-muted extra-small">{item.price}</div>
                    </div>
                    <div
                      className={`products-landing-page__status products-landing-page__status--${item.status.toLowerCase()}`}
                    >
                      {item.stock} left
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating inventory card */}
              <div className="products-landing-page__inventory-card shadow-lg">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <BoxSeam className="text-primary" />
                  <div className="fw-bold small">Inventory Summary</div>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Total Items</span>
                  <span className="fw-bold small">142</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Low Stock</span>
                  <span className="text-danger fw-bold small">3</span>
                </div>
                <div className="progress mt-3" style={{ height: "6px" }}>
                  <div
                    className="progress-bar bg-primary"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsLandingPage;
