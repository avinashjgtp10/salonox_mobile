import { Search, X, Sliders, ChevronLeft } from "react-bootstrap-icons";
import "../styles/QuickSaleDrawer.scss";
import { useEffect, useState, useRef } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSaleDrawer({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState("quick");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [selectedDateLabel, setSelectedDateLabel] = useState("Today");
  const [showMembershipDropdown, setShowMembershipDropdown] = useState(false);
  const [selectedMembershipLabel, setSelectedMembershipLabel] = useState("All");
  const [showClientSelection, setShowClientSelection] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const membershipDropdownRef = useRef<HTMLDivElement>(null);

  const membershipOptions = ["All", "Recurring", "One-off"];

  const dateOptions = [
    "Today",
    "Yesterday",
    "Last 7 days",
    "Last 30 days",
    "Last 90 days",
    "Last year",
    "Week to date",
    "Month to date",
    "Quarter to date",
    "Year to date",
    "Tomorrow",
    "Next 7 days",
    "Next 30 days",
    "Next 90 days",
    "All to date",
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setShowDateDropdown(false);
      setShowMembershipDropdown(false);
      setShowClientSelection(false);
      setShowFilters(false);
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Click outside to close date dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDateDropdown(false);
      }
      if (
        membershipDropdownRef.current &&
        !membershipDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMembershipDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                  <div className="date-selector-container" ref={dateDropdownRef}>
                    <button
                      className="filter-btn"
                      onClick={() => setShowDateDropdown(!showDateDropdown)}
                    >
                      {selectedDateLabel}
                    </button>

                    {showDateDropdown && (
                      <div className="date-dropdown-menu">
                        {dateOptions.map((option) => (
                          <div
                            key={option}
                            className={`date-dropdown-item ${selectedDateLabel === option ? "active" : ""
                              }`}
                            onClick={() => {
                              setSelectedDateLabel(option);
                              setShowDateDropdown(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="filter-icon-btn"
                    onClick={() => setShowFilters(true)}
                  >
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
                    <div
                      className="membership-selector-container"
                      ref={membershipDropdownRef}
                    >
                      <button
                        className="all-btn"
                        onClick={() =>
                          setShowMembershipDropdown(!showMembershipDropdown)
                        }
                      >
                        {selectedMembershipLabel} ▾
                      </button>

                      {showMembershipDropdown && (
                        <div className="membership-dropdown-menu">
                          {membershipOptions.map((option) => (
                            <div
                              key={option}
                              className={`membership-dropdown-item ${
                                selectedMembershipLabel === option
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedMembershipLabel(option);
                                setShowMembershipDropdown(false);
                              }}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      className="filter-icon-btn"
                      onClick={() => setShowFilters(true)}
                    >
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
            {!showClientSelection ? (
              <>
                <div
                  className="add-client-card"
                  onClick={() => setShowClientSelection(true)}
                >
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
                    Tap an item to add to cart or add an existing client for
                    smart recommendations
                  </p>
                </div>
              </>
            ) : (
              <div className="client-selection-view">
                <div className="client-selection-header">
                  <button
                    className="back-btn"
                    onClick={() => setShowClientSelection(false)}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h4>Select client</h4>
                </div>

                <div className="client-search-wrapper">
                  <Search size={16} className="search-icon" />
                  <input type="text" placeholder="Search by name, email or..." />
                </div>

                <div className="client-list">
                  <div className="client-item">
                    <div className="client-avatar">AJ</div>
                    <div className="client-info">
                      <div className="client-name">Avinash J</div>
                      <div className="client-phone">+91 98765 43210</div>
                    </div>
                  </div>
                  <div className="client-item">
                    <div className="client-avatar">JD</div>
                    <div className="client-info">
                      <div className="client-name">John Doe</div>
                      <div className="client-phone">+91 98765 43211</div>
                    </div>
                  </div>
                  <div className="client-item">
                    <div className="client-avatar">JS</div>
                    <div className="client-info">
                      <div className="client-name">Jane Smith</div>
                      <div className="client-phone">+91 98765 43212</div>
                    </div>
                  </div>
                </div>

                <div className="client-selection-footer">
                  <button className="new-client-btn">
                    <span>+</span> New client
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC FILTERS MODAL */}
      {showFilters && (
        <div className="filters-modal-overlay">
          <div className={`filters-modal ${activeTab}-filters-modal`}>
            <div className="filters-header">
              <h4>Filters</h4>
              <button
                className="close-filters"
                onClick={() => setShowFilters(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="filters-content">
              {activeTab === "appointments" && (
                <div className="filter-group mb-4">
                  <label>Team member</label>
                  <select className="form-select border-1 rounded-3 px-3 py-2">
                    <option>All team members</option>
                  </select>
                </div>
              )}

              {activeTab === "memberships" && (
                <>
                  <div className="filter-group mb-4">
                    <label>Sessions</label>
                    <select className="form-select border-1 rounded-3 px-3 py-2">
                      <option>Any number of sessions</option>
                    </select>
                  </div>

                  <div className="filter-group mb-4">
                    <label>Valid for</label>
                    <select className="form-select border-1 rounded-3 px-3 py-2">
                      <option>Any period</option>
                    </select>
                  </div>

                  <div className="filter-group-checkbox d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      id="cover-all-services"
                      className="form-check-input"
                    />
                    <label htmlFor="cover-all-services" className="mb-0">
                      Display only memberships which cover all services
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="filters-footer">
              <button
                className="btn btn-link text-dark text-decoration-none fw-semibold"
                onClick={() => setShowFilters(false)}
              >
                Clear filters
              </button>
              <button
                className="btn btn-dark rounded-pill px-4 fw-semibold"
                onClick={() => setShowFilters(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

