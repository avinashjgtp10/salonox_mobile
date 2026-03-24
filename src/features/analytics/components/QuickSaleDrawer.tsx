import { Search, X, Sliders, ChevronLeft, ChevronDown } from "react-bootstrap-icons";
import "../styles/QuickSaleDrawer.scss";
import { useEffect, useState, useRef } from "react";

// UI Components
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";

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
        <div className="quick-sale-header d-flex align-items-center justify-content-between p-3 border-bottom">
          <div className="flex-grow-1">
            <div className="breadcrumb small text-muted mb-1">
              <span className="cursor-pointer hover-text-dark">Cart</span>
              <span className="mx-2">›</span>
              <span className="cursor-pointer hover-text-dark">Tip</span>
              <span className="mx-2">›</span>
              <span className="text-muted opacity-50">Payment</span>
            </div>
            <h3 className="h5 mb-0 fw-bold">Add to cart</h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            iconLeft={<X size={20} />}
            className="p-1"
          />
        </div>

        {/* BODY */}
        <div className="quick-sale-body">
          {/* LEFT SIDE */}
          <div className="quick-sale-left">
            {/* SEARCH */}
            <div className="search-wrapper mb-3">
              <Input
                placeholder="Search"
                className="mb-0"
                containerClass="mb-0"
                iconLeft={<Search size={16} />}
              />
            </div>

            {/* TABS */}
            <div className="quick-tabs d-flex gap-1 mb-4 overflow-auto pb-1 no-scrollbar">
              {[
                { id: "quick", label: "Quick Sale" },
                { id: "appointments", label: "Appointments" },
                { id: "services", label: "Services" },
                { id: "products", label: "Products" },
                { id: "memberships", label: "Memberships" },
                { id: "giftcards", label: "Gift cards" }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "dark" : "outline-dark"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="text-nowrap"
                  pill
                >
                  {tab.label}
                </Button>
              ))}
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
                <div className="appointments-top d-flex align-items-center justify-content-between gap-2 mb-3">
                  <div className="date-selector-container position-relative flex-grow-1" ref={dateDropdownRef}>
                    <Button
                      variant="outline-dark"
                      fullWidth
                      className="text-start d-flex justify-content-between align-items-center"
                      onClick={() => setShowDateDropdown(!showDateDropdown)}
                      iconRight={<ChevronDown size={14} className={`ms-auto transition-all ${showDateDropdown ? 'rotate-180' : ''}`} />}
                    >
                      {selectedDateLabel}
                    </Button>

                    {showDateDropdown && (
                      <div className="date-dropdown-menu shadow-lg border position-absolute start-0 w-100 mt-1 bg-white z-2 overflow-auto" style={{ maxHeight: '300px' }}>
                        {dateOptions.map((option) => (
                          <div
                            key={option}
                            className={`date-dropdown-item p-2 cursor-pointer small ${selectedDateLabel === option ? "bg-light fw-bold" : "hover-bg-light"}`}
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

                  <Button
                    variant="outline-dark"
                    onClick={() => setShowFilters(true)}
                    iconLeft={<Sliders size={16} />}
                  />
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
              <div className="services-list d-flex flex-column gap-2 mt-2">
                {[
                  { id: 1, name: "Haircut", duration: "1h 30min", price: "₹25" },
                  { id: 2, name: "Blow Dry", duration: "1h 30min", price: "₹25" }
                ].map(service => (
                  <Button
                    key={service.id}
                    variant="ghost"
                    fullWidth
                    className="service-card p-3 border rounded-3 text-start d-flex align-items-center justify-content-between hover-bg-light"
                    onClick={() => console.log("Select service", service.name)}
                  >
                    <div>
                      <h5 className="h6 mb-1 fw-bold">{service.name}</h5>
                      <p className="small text-muted mb-0">{service.duration}</p>
                    </div>
                    <div className="fw-bold">{service.price}</div>
                  </Button>
                ))}
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
                <div className="membership-filter-row d-flex align-items-center justify-content-between mb-3 mt-2">
                  <div></div>

                  <div className="membership-controls d-flex align-items-center gap-2">
                    <div
                      className="membership-selector-container position-relative"
                      ref={membershipDropdownRef}
                    >
                      <Button
                        variant="outline-dark"
                        size="sm"
                        onClick={() => setShowMembershipDropdown(!showMembershipDropdown)}
                        iconRight={<ChevronDown size={14} className={`ms-2 ${showMembershipDropdown ? 'rotate-180' : ''}`} />}
                      >
                        {selectedMembershipLabel}
                      </Button>

                      {showMembershipDropdown && (
                        <div className="membership-dropdown-menu shadow border position-absolute end-0 mt-1 bg-white z-2 overflow-auto" style={{ width: '150px' }}>
                          {membershipOptions.map((option) => (
                            <div
                              key={option}
                              className={`membership-dropdown-item p-2 cursor-pointer small ${selectedMembershipLabel === option ? "bg-light fw-bold" : "hover-bg-light"}`}
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

                    <Button
                      variant="outline-dark"
                      size="sm"
                      onClick={() => setShowFilters(true)}
                      iconLeft={<Sliders size={16} />}
                    />
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
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowClientSelection(true)}
                  className="add-client-card p-3 border rounded-3 text-start d-flex align-items-center justify-content-between mb-3 hover-bg-light"
                >
                  <div>
                    <h5 className="h6 mb-1 fw-bold">Add client</h5>
                    <p className="small text-muted mb-0">Leave empty for walk-ins</p>
                  </div>
                  <div className="client-icon rounded-circle border d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                    +
                  </div>
                </Button>

                <div className="right-divider" />

                <div className="cart-empty flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4">
                  <div className="cart-icon h1 mb-3 opacity-25">🛒</div>
                  <h4 className="h5 fw-bold mb-2">Your cart is empty</h4>
                  <p className="small text-muted mb-0">
                    Tap an item to add to cart or add an existing client for
                    smart recommendations
                  </p>
                </div>
              </>
            ) : (
              <div className="client-selection-view h-100 d-flex flex-column">
                <div className="client-selection-header d-flex align-items-center gap-3 mb-3 p-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowClientSelection(false)}
                    iconLeft={<ChevronLeft size={20} />}
                    className="p-1"
                  />
                  <h4 className="h5 mb-0 fw-bold">Select client</h4>
                </div>

                <div className="client-search-wrapper mb-3 px-2">
                  <Input
                    placeholder="Search by name, email or..."
                    className="mb-0"
                    containerClass="mb-0"
                    iconLeft={<Search size={16} />}
                  />
                </div>

                <div className="client-list flex-grow-1 overflow-auto px-2">
                  {[
                    { initials: "AJ", name: "Avinash J", phone: "+91 98765 43210" },
                    { initials: "JD", name: "John Doe", phone: "+91 98765 43211" },
                    { initials: "JS", name: "Jane Smith", phone: "+91 98765 43212" }
                  ].map(client => (
                    <Button
                      key={client.phone}
                      variant="ghost"
                      fullWidth
                      className="client-item p-3 mb-2 border rounded-3 text-start d-flex align-items-center gap-3 hover-bg-light"
                    >
                      <div className="client-avatar rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold" style={{ minWidth: '40px', height: '40px' }}>
                        {client.initials}
                      </div>
                      <div className="client-info">
                        <div className="client-name fw-bold small">{client.name}</div>
                        <div className="client-phone extra-small text-muted">{client.phone}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="client-selection-footer p-3 border-top mt-auto">
                  <Button
                    variant="dark"
                    fullWidth
                    pill
                    onClick={() => console.log("New client")}
                    iconLeft={<span className="me-1">+</span>}
                  >
                    New client
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC FILTERS MODAL */}
      <Modal
        show={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        footer={
          <div className="d-flex align-items-center justify-content-between w-100">
            <Button
              variant="ghost"
              onClick={() => setShowFilters(false)}
            >
              Clear filters
            </Button>
            <Button
              variant="dark"
              pill
              onClick={() => setShowFilters(false)}
              className="px-4"
            >
              Apply
            </Button>
          </div>
        }
      >
        <div className="filters-content">
          {activeTab === "appointments" && (
            <div className="filter-group mb-4">
              <label className="form-label small fw-bold">Team member</label>
              <select className="form-select border-1 rounded-3 px-3 py-2">
                <option>All team members</option>
              </select>
            </div>
          )}

          {activeTab === "memberships" && (
            <>
              <div className="filter-group mb-4">
                <label className="form-label small fw-bold">Sessions</label>
                <select className="form-select border-1 rounded-3 px-3 py-2">
                  <option>Any number of sessions</option>
                </select>
              </div>

              <div className="filter-group mb-4">
                <label className="form-label small fw-bold">Valid for</label>
                <select className="form-select border-1 rounded-3 px-3 py-2">
                  <option>Any period</option>
                </select>
              </div>

              <div className="filter-group-checkbox d-flex align-items-start gap-2">
                <input
                  type="checkbox"
                  id="cover-all-services"
                  className="form-check-input mt-1"
                />
                <label htmlFor="cover-all-services" className="small text-muted mb-0">
                  Display only memberships which cover all services
                </label>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

