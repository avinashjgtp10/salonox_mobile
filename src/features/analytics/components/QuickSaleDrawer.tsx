import { Search, X, Sliders } from "react-bootstrap-icons";
import "../styles/QuickSaleDrawer.scss";
import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSaleDrawer({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState("quick");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="quick-sale-overlay">
      <div className="quick-sale-panel">
        {/* HEADER */}
        <div className="quick-sale-header">
          <div>
            <div className="breadcrumb">
              <span>Cart</span>
              <span>›</span>
              <span>Tip</span>
              <span>›</span>
              <span className="muted">Payment</span>
            </div>
            <h3>Add to cart</h3>
          </div>

          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="quick-sale-body">
          {/* LEFT SIDE */}
          <div className="quick-sale-left">
            {/* SEARCH */}
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search" />
            </div>

            {/* TABS */}
            <div className="quick-tabs">
              <button
                className={activeTab === "quick" ? "active" : ""}
                onClick={() => setActiveTab("quick")}
              >
                Quick Sale
              </button>

              <button
                className={activeTab === "appointments" ? "active" : ""}
                onClick={() => setActiveTab("appointments")}
              >
                Appointments
              </button>

              <button
                className={activeTab === "services" ? "active" : ""}
                onClick={() => setActiveTab("services")}
              >
                Services
              </button>

              <button
                className={activeTab === "products" ? "active" : ""}
                onClick={() => setActiveTab("products")}
              >
                Products
              </button>

              <button
                className={activeTab === "memberships" ? "active" : ""}
                onClick={() => setActiveTab("memberships")}
              >
                Memberships
              </button>

              <button
                className={activeTab === "giftcards" ? "active" : ""}
                onClick={() => setActiveTab("giftcards")}
              >
                Gift cards
              </button>
            </div>

            {/* QUICK SALE */}
            {activeTab === "quick" && (
              <div className="empty-box">
                <div className="empty-icon">🏷️</div>
                <h4>No quick sale items</h4>
                <p>Try adding quick sale items to get started</p>
              </div>
            )}

            {/* APPOINTMENTS */}
            {activeTab === "appointments" && (
              <>
                <div className="appointments-top">
                  <button className="filter-btn">Today</button>
                  <button className="filter-icon-btn">
                    <Sliders size={16} />
                  </button>
                </div>

                <div className="empty-box">
                  <div className="empty-icon">📅</div>
                  <h4>No appointments to checkout</h4>
                  <p>
                    Try selecting a different date period or show the last 7
                    days to see more results.
                  </p>
                </div>
              </>
            )}

            {/* SERVICES */}
            {activeTab === "services" && (
              <div className="services-list">
                <div className="service-card">
                  <div className="service-left">
                    <h5>Haircut</h5>
                    <p>1h 30min</p>
                  </div>
                  <div className="service-price">₹25</div>
                </div>

                <div className="service-card">
                  <div className="service-left">
                    <h5>Blow Dry</h5>
                    <p>1h 30min</p>
                  </div>
                  <div className="service-price">₹25</div>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {activeTab === "products" && (
              <div className="empty-box">
                <div className="empty-icon">🛍️</div>
                <h4>No products set up</h4>
                <p className="manage-link">Manage products</p>
              </div>
            )}

            {/* MEMBERSHIPS */}
            {activeTab === "memberships" && (
              <>
                <div className="membership-filter-row">
                  <div></div>

                  <div className="membership-controls">
                    <button className="all-btn">All ▾</button>

                    <button className="filter-icon-btn">
                      <Sliders size={16} />
                    </button>
                  </div>
                </div>

                <div className="empty-box">
                  <div className="empty-icon">🔄</div>
                  <h4>No memberships added yet</h4>
                  <p className="manage-link">
                    Click here to add and manage your memberships.
                  </p>
                </div>
              </>
            )}
            {activeTab === "giftcards" && (
              <div className="empty-box">
                <div className="empty-icon">🎁</div>
                <h4>No gift cards set up</h4>
                <p className="manage-link">Manage gift cards</p>
              </div>
            )}
          </div>
          {/* GIFT CARDS */}

          {/* RIGHT SIDE */}
          <div className="quick-sale-right">
            <div className="add-client-card">
              <div>
                <h5>Add client</h5>
                <p>Leave empty for walk-ins</p>
              </div>
              <div className="client-icon">+</div>
            </div>

            <div className="right-divider" />

            <div className="cart-empty">
              <div className="cart-icon">🛒</div>
              <h4>Your cart is empty</h4>
              <p>
                Tap an item to add to cart or add an existing client for smart
                recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
