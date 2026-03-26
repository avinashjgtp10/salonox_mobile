import { Search, X, ChevronLeft, Trash, Pencil, Plus, Dash, ThreeDotsVertical, JournalText, Tag, CashCoin, Percent } from "react-bootstrap-icons";
import { useEffect, useState } from "react";
import "../styles/QuickSaleDrawer.scss";

// UI Components
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import { useSale, type SaleItem } from "../context/SaleContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSaleDrawer({ isOpen, onClose }: Props) {
  const { cart, client, addToCart, removeFromCart, setClient, getTotal, saveDraft } = useSale();
  const [activeTab, setActiveTab] = useState("quick");
  const [showClientSelection, setShowClientSelection] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showConfigureQuickSale, setShowConfigureQuickSale] = useState(false);
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showServiceChargeModal, setShowServiceChargeModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'tip' | 'payment'>('cart');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [showSplitPaymentView, setShowSplitPaymentView] = useState(false);
  const [showSplitSelectionModal, setShowSplitSelectionModal] = useState(false);
  const [addedPayments, setAddedPayments] = useState<{ type: string, amount: number }[]>([]);
  const [tipInput, setTipInput] = useState("0");
  const [tipType, setTipType] = useState<"amount" | "percent">("amount");
  const [cashInput, setCashInput] = useState("0");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setShowClientSelection(false);
      setShowFilters(false);
      setShowConfigureQuickSale(false);
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const quickSaleItems = [
    { id: "q1", name: "Haircut", price: 40, type: "quick" as const },
    { id: "q2", name: "Hair Color", price: 57, type: "quick" as const },
    { id: "q3", name: "Blow Dry", price: 35, type: "quick" as const },
    { id: "q4", name: "Balayage", price: 150, type: "quick" as const }
  ];

  const filteredQuickItems = quickSaleItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNumpad = (val: string, target: "tip" | "cash") => {
    const setter = target === "tip" ? setTipInput : setCashInput;
    setter(prev => {
      if (val === "back") {
        if (prev.length <= 1) return "0";
        return prev.slice(0, -1);
      }
      if (val === ".") {
        if (prev.includes(".")) return prev;
        return prev + ".";
      }
      if (prev === "0") return val;
      if (prev.includes(".") && prev.split(".")[1].length >= 2) return prev;
      return prev + val;
    });
  };

  const calculatedTipPercent = tipType === "percent" ? parseFloat(tipInput) : (getTotal() > 0 ? (parseFloat(tipInput) / getTotal() * 100) : 0);
  const calculatedTipAmount = tipType === "amount" ? parseFloat(tipInput) : (getTotal() * parseFloat(tipInput) / 100);

  const cashAmount = parseFloat(cashInput);
  const leftToPay = Math.max(0, getTotal() - addedPayments.reduce((acc, p) => acc + p.amount, 0));

  return (
    <div className={`quick-sale-overlay ${showConfigureQuickSale ? 'is-configuring' : ''}`}>
      <div className="quick-sale-panel">
        {/* HEADER */}
        <div className="quick-sale-header d-flex align-items-center justify-content-between p-3 border-bottom">
          {!showConfigureQuickSale ? (
            <>
              <div className="flex-grow-1">
                <div className="breadcrumb small text-muted mb-1">
                  <span className={`cursor-pointer ${checkoutStep === 'cart' ? 'fw-bold text-dark' : 'hover-text-dark'}`} onClick={() => setCheckoutStep('cart')}>Cart</span>
                  <span className="mx-2 opacity-50">›</span>
                  <span className={`cursor-pointer ${checkoutStep === 'tip' ? 'fw-bold text-dark' : 'hover-text-dark'}`} onClick={() => setCheckoutStep('tip')}>Tip</span>
                  <span className="mx-2 opacity-50">›</span>
                  <span className={`cursor-pointer ${checkoutStep === 'payment' ? 'fw-bold text-dark' : 'hover-text-dark'}`} onClick={() => setCheckoutStep('payment')}>Payment</span>
                </div>
                <h3 className="h5 mb-0 fw-bold">
                  {checkoutStep === 'cart' && "Add to cart"}
                  {checkoutStep === 'tip' && "Select tip"}
                  {checkoutStep === 'payment' && "Select payment"}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                iconLeft={<X size={20} />}
                className="p-1"
              />
            </>
          ) : (
            <>
              <div className="flex-grow-1"></div>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-dark"
                  size="sm"
                  pill
                  className="px-4"
                  onClick={() => setShowConfigureQuickSale(false)}
                >
                  Close
                </Button>
                <Button
                  variant="dark"
                  size="sm"
                  pill
                  className="px-4"
                  onClick={() => setShowConfigureQuickSale(false)}
                >
                  Save
                </Button>
              </div>
            </>
          )}
        </div>

        {/* BODY */}
        <div className="quick-sale-body">
          {showConfigureQuickSale ? (
            <div className="configure-view p-5 w-100">
              <div className="configure-content mx-auto" style={{ maxWidth: '800px' }}>
                <h2 className="h2 fw-bold mb-2">Quick sale items</h2>
                <p className="text-muted mb-4">Search for sellable items to add to your quick sale layout. Drag and drop to rearrange.</p>

                <div className="search-wrapper mb-4">
                  <Input
                    placeholder="Search"
                    className="mb-0 py-3"
                    containerClass="mb-0"
                    iconLeft={<Search size={18} />}
                  />
                </div>

                <div className="configure-grid">
                  {quickSaleItems.map(item => (
                    <div key={item.id} className="configure-item-card d-flex align-items-center justify-content-between p-3 border rounded-3 bg-white shadow-sm mb-3">
                      <div>
                        <div className="fw-bold small">{item.name}</div>
                        <div className="extra-small text-muted">₹{item.price}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="trash-btn text-muted p-1">
                        <Trash size={16} />
                      </Button>
                    </div>
                  ))}

                  {/* Empty slots placeholders */}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={`empty-${i}`} className="configure-empty-slot border border-dashed rounded-3 mb-3 d-flex align-items-center justify-content-center text-muted" style={{ height: '70px', opacity: 0.3 }}>
                      {/* Empty slot */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* LEFT SIDE */}
              <div className="quick-sale-left">
                {checkoutStep === 'cart' && (
                  <>
                    {/* SEARCH */}
                    <div className="search-wrapper mb-3">
                      <Input
                        placeholder="Search"
                        className="mb-0"
                        containerClass="mb-0"
                        iconLeft={<Search size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                          variant={activeTab === tab.id ? "dark" : "light"}
                          size="sm"
                          onClick={() => setActiveTab(tab.id)}
                          className="text-nowrap"
                          pill
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </div>

                    {/* QUICK SALE CONTENT (TABS) */}
                    {activeTab === "quick" && (
                      <div className="quick-sale-grid-wrapper">
                        <div className="quick-sale-grid">
                          {filteredQuickItems.map(item => (
                            <div
                              key={item.id}
                              className="quick-item-card"
                              onClick={() => addToCart(item)}
                            >
                              <div className="quick-item-info">
                                <div className="quick-item-name">{item.name}</div>
                                <div className="quick-item-price">₹{item.price}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="edit-items-link mt-4">
                          <span
                            className="cursor-pointer small hover-underline"
                            onClick={() => setShowConfigureQuickSale(true)}
                          >
                            Edit items
                          </span>
                        </div>
                      </div>
                    )}

                    {activeTab === "appointments" && (
                      <div className="empty-box">
                        <div className="empty-icon">📅</div>
                        <h4>No appointments found</h4>
                        <p>Try a different date range</p>
                      </div>
                    )}

                    {activeTab === "services" && (
                      <div className="services-list d-flex flex-column gap-2 mt-2">
                        {[
                          { id: "s1", name: "Haircut", duration: "1h 30min", price: 25, type: "service" as const },
                          { id: "s2", name: "Blow Dry", duration: "1h 30min", price: 25, type: "service" as const }
                        ].filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(service => (
                          <Button
                            key={service.id}
                            variant="ghost"
                            fullWidth
                            className="service-card p-3 border rounded-3 text-start d-flex align-items-center justify-content-between hover-bg-light"
                            onClick={() => addToCart(service)}
                          >
                            <div>
                              <h5 className="h6 mb-1 fw-bold">{service.name}</h5>
                              <p className="small text-muted mb-0">{service.duration}</p>
                            </div>
                            <div className="fw-bold">₹{service.price}</div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {checkoutStep === 'tip' && (
                  <div className="select-tip-view p-2">
                    <div className="tip-header mb-4">
                      <h4 className="h5 fw-bold mb-1">Select tip</h4>
                      <p className="extra-small text-muted mb-0">Select an amount for dhumal dipak</p>
                    </div>

                    <div className="tip-selection-grid d-grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <div className="tip-option-card rounded-3 cursor-pointer text-center border-primary shadow-sm" style={{ borderColor: '#6366f1', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="fw-bold small">No tip</div>
                      </div>
                      <div className="tip-option-card border rounded-3 cursor-pointer text-center hover-bg-light p-3" style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="fw-bold small">10%</div>
                        <div className="extra-small text-muted">₹5.70</div>
                      </div>
                      <div className="tip-option-card border rounded-3 cursor-pointer text-center hover-bg-light p-3" style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="fw-bold small">18%</div>
                        <div className="extra-small text-muted">₹10.26</div>
                      </div>
                      <div className="tip-option-card border rounded-3 cursor-pointer text-center hover-bg-light p-3" style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="fw-bold small">25%</div>
                        <div className="extra-small text-muted">₹14.25</div>
                      </div>
                      <div className="tip-option-card border rounded-3 cursor-pointer text-center hover-bg-light p-3" style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTipModal(true)}>
                        <div className="d-flex align-items-center justify-content-center gap-1 mb-1">
                          <Plus size={16} />
                        </div>
                        <div className="fw-bold small">Custom tip</div>
                      </div>
                    </div>
                  </div>
                )}

                {checkoutStep === 'payment' && (
                  !showSplitPaymentView ? (
                    <div className="select-payment-view p-2">
                      <div className="numpad-grid d-grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <div
                          className="payment-method-card border rounded-3 p-4 text-center cursor-pointer hover-bg-light"
                          onClick={() => setShowCashModal(true)}
                        >
                          <CashCoin size={24} className="text-success mb-2" />
                          <div className="fw-bold small">Cash</div>
                        </div>
                        <div
                          className="payment-method-card border rounded-3 p-4 text-center cursor-pointer hover-bg-light"
                          onClick={() => setShowGiftCardModal(true)}
                        >
                          <Tag size={24} className="text-success mb-2" />
                          <div className="fw-bold small">Gift card</div>
                        </div>
                        <div
                          className="payment-method-card border border-dashed rounded-3 p-4 text-center cursor-pointer hover-bg-light"
                          onClick={() => setShowSplitPaymentView(true)}
                        >
                          <div className="text-muted mb-2">◰</div>
                          <div className="fw-bold small">Split payment</div>
                        </div>
                        <div
                          className={`payment-method-card border rounded-3 p-4 text-center cursor-pointer hover-bg-light ${addedPayments.some(p => p.type === 'Other') ? 'border-primary shadow-sm' : ''}`}
                          style={{ borderColor: addedPayments.some(p => p.type === 'Other') ? '#6366f1' : '' }}
                          onClick={() => setAddedPayments([{ type: 'Other', amount: getTotal() }])}
                        >
                          <div className="text-primary mb-2">ⓢ</div>
                          <div className="fw-bold small">Other</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="split-payment-view p-2">
                      <div className="d-flex align-items-center gap-3 mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => setShowSplitPaymentView(false)}
                          iconLeft={<ChevronLeft size={20} />}
                        />
                        <h4 className="h5 mb-0 fw-bold">Split payment</h4>
                      </div>

                      <div
                        className="add-payment-method-row border rounded-3 p-3 bg-white d-flex align-items-center gap-3 cursor-pointer hover-bg-light transition-all mb-3"
                        style={{ color: '#6366f1' }}
                        onClick={() => setShowSplitSelectionModal(true)}
                      >
                        <div className="plus-icon-circle border rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px', borderColor: '#6366f1' }}>
                          <Plus size={20} />
                        </div>
                        <span className="small fw-bold">Add payment method</span>
                      </div>
                    </div>
                  )
                )}
              </div>

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
                      {client ? (
                        <div className="d-flex align-items-center gap-3">
                          <div className="client-avatar rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '40px', height: '40px' }}>
                            {client.initials}
                          </div>
                          <div>
                            <h5 className="h6 mb-0 fw-bold">{client.name}</h5>
                            <p className="extra-small text-muted mb-0">{client.phone}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h5 className="h6 mb-1 fw-bold">Add client</h5>
                          <p className="small text-muted mb-0">Leave empty for walk-ins</p>
                        </div>
                      )}
                      <div className="client-icon rounded-circle d-flex align-items-center justify-content-center">
                        {client ? <X size={20} onClick={(e) => { e.stopPropagation(); setClient(null); }} /> : "+"}
                      </div>
                    </Button>

                    <div className="right-divider" />

                    <div className="cart-content flex-grow-1 overflow-auto">
                      {cart.length > 0 ? (
                        <div className="cart-items-list d-flex flex-column gap-3">
                          {cart.map(item => (
                            <div
                              key={item.id}
                              className="cart-item d-flex justify-content-between align-items-start cursor-pointer hover-bg-light p-2 rounded-2"
                              onClick={() => setEditingItem(item)}
                            >
                              <div className="d-flex gap-2">
                                <div className="item-qty fw-bold text-muted small mt-1">{item.quantity}×</div>
                                <div>
                                  <div className="item-name fw-bold small">{item.name}</div>
                                  <div className="item-price extra-small text-muted">₹{item.price} each</div>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <div className="item-total fw-bold small">₹{item.price * (item.quantity || 1)}</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 text-muted"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item);
                                  }}
                                >
                                  <Pencil size={14} />
                                </Button>
                                <X
                                  className="text-muted cursor-pointer"
                                  size={16}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromCart(item.id);
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="cart-empty d-flex flex-column align-items-center justify-content-center text-center py-5">
                          <div className="cart-icon h1 mb-3 opacity-25">🛒</div>
                          <h4 className="h5 fw-bold mb-2">Your cart is empty</h4>
                          <p className="small text-muted mb-0 px-4">
                            Tap an item to add to cart or add an existing client for
                            smart recommendations
                          </p>
                        </div>
                      )}
                    </div>

                    {cart.length > 0 && (
                      <div className="cart-footer border-top pt-4 mt-4 px-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small text-muted fw-bold">Subtotal</span>
                          <span className="small text-muted fw-bold">₹{getTotal()}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-muted fw-bold">Tax</span>
                          <span className="small text-muted fw-bold">₹0</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <span className="h5 mb-0 fw-bold">Total</span>
                          <span className="h5 mb-0 fw-bold">₹{getTotal()}</span>
                        </div>

                        {addedPayments.length > 0 && (
                          <div className="added-payments-list pt-3 border-top mb-4">
                            {addedPayments.map((p, idx) => (
                              <div key={idx} className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="small fw-bold">{p.type}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 text-muted"
                                    onClick={() => setAddedPayments(prev => prev.filter((_, i) => i !== idx))}
                                  >
                                    <Trash size={14} />
                                  </Button>
                                </div>
                                <span className="small fw-bold">₹{p.amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="d-flex align-items-center gap-2">
                          <div className="position-relative">
                            <Button
                              variant="ghost"
                              className="border rounded-circle p-2 d-flex align-items-center justify-content-center"
                              style={{ width: '48px', height: '48px' }}
                              onClick={() => setShowQuickActions(!showQuickActions)}
                            >
                              <ThreeDotsVertical size={20} />
                            </Button>

                            {showQuickActions && (
                              <div className="quick-actions-menu shadow-lg border rounded-3 bg-white position-absolute mb-2" style={{ bottom: '100%', left: 0, width: '220px', zIndex: 100 }}>
                                <div className="p-2 border-bottom extra-small text-muted fw-bold bg-light rounded-top-3">Quick actions</div>
                                <div className="p-1">
                                  <div className="action-item d-flex align-items-center gap-2 p-2 hover-bg-light cursor-pointer rounded-2 small" onClick={() => { setShowTipModal(true); setShowQuickActions(false); }}>
                                    <CashCoin size={16} /> Add tip
                                  </div>
                                  <div className="action-item d-flex align-items-center gap-2 p-2 hover-bg-light cursor-pointer rounded-2 small" onClick={() => { setShowDiscountModal(true); setShowQuickActions(false); }}>
                                    <Tag size={16} /> Add cart discount
                                  </div>
                                  <div className="action-item d-flex align-items-center gap-2 p-2 hover-bg-light cursor-pointer rounded-2 small" onClick={() => { setShowNoteModal(true); setShowQuickActions(false); }}>
                                    <JournalText size={16} /> Add sale note
                                  </div>
                                  <div className="action-item d-flex align-items-center gap-2 p-2 hover-bg-light cursor-pointer rounded-2 small" onClick={() => { setShowServiceChargeModal(true); setShowQuickActions(false); }}>
                                    <Percent size={16} /> Add service charge
                                  </div>
                                  <div className="border-top my-1"></div>
                                  <div className="action-item p-2 hover-bg-light cursor-pointer rounded-2 small" onClick={() => {
                                    saveDraft({ cart, client });
                                    onClose();
                                  }}>Save as draft</div>
                                  <div className="action-item p-2 hover-text-danger cursor-pointer rounded-2 small text-danger" onClick={() => { removeFromCart('all'); setShowQuickActions(false); }}>Cancel sale</div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-grow-1 flex-column d-flex gap-2">
                            {checkoutStep === 'payment' && addedPayments.length > 0 && (
                              <div className="text-center extra-small fw-bold text-dark mb-1">Full payment added</div>
                            )}
                            <Button
                              variant={checkoutStep === 'payment' && addedPayments.length === 0 ? "outline-dark" : "dark"}
                              fullWidth
                              pill
                              size="lg"
                              className="fw-bold py-3"
                              style={{ height: '48px' }}
                              onClick={() => {
                                if (checkoutStep === 'cart') setCheckoutStep('tip');
                                else if (checkoutStep === 'tip') setCheckoutStep('payment');
                                else if (addedPayments.length > 0) console.log('Finalizing payment...');
                                else console.log('Saving unpaid...');
                              }}
                            >
                              {checkoutStep === 'payment' ? (addedPayments.length > 0 ? "Pay now" : "Save unpaid") : "Continue to payment"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
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
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="client-list flex-grow-1 overflow-auto px-2">
                      {[
                        { id: "c1", initials: "AJ", name: "Avinash J", phone: "+91 98765 43210" },
                        { id: "c2", initials: "JD", name: "John Doe", phone: "+91 98765 43211" },
                        { id: "c3", initials: "JS", name: "Jane Smith", phone: "+91 98765 43212" }
                      ].filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                        c.phone.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(client => (
                          <Button
                            key={client.id}
                            variant="ghost"
                            fullWidth
                            className="client-item p-3 mb-2 border rounded-3 text-start d-flex align-items-center gap-3 hover-bg-light"
                            onClick={() => {
                              setClient(client);
                              setShowClientSelection(false);
                            }}
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
            </>
          )}
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

      {/* EDIT ITEM MODAL */}
      <Modal
        show={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={editingItem ? `Edit ${editingItem.name}` : "Edit Item"}
        size="md"
      >
        {editingItem && (
          <div className="edit-item-content p-2">
            <div className="row g-4 pt-2">
              <div className="col-7">
                <Input
                  label="Price"
                  type="number"
                  defaultValue={editingItem.price.toFixed(2)}
                  iconLeft={<span className="fw-bold">₹</span>}
                  containerClass="mb-0"
                />
              </div>
              <div className="col-5">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Quantity</label>
                <div className="input-group quantity-input-group shadow-none border rounded-3 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Decrement logic here if state was available
                    }}
                  >
                    <Dash size={16} />
                  </Button>
                  <div className="form-control border-0 text-center fw-bold bg-transparent shadow-none p-0 d-flex align-items-center justify-content-center" style={{ height: "32px", minWidth: "24px" }}>
                    {editingItem.quantity || 1}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Increment logic here if state was available
                    }}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <div className="col-12 mt-4">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Discounts</label>
                <select className="form-select border-1 rounded-3 px-3">
                  <option>None available</option>
                </select>
              </div>

              <div className="col-12 mt-4">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Team member</label>
                <select className="form-select border-1 rounded-3 px-3">
                  <option>dhumal dipak</option>
                </select>
              </div>
            </div>

            <div className="edit-modal-footer d-flex align-items-center justify-content-between mt-5 pt-4 border-top">
              <div className="item-total-display">
                <div className="extra-small text-muted fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>Item total</div>
                <div className="h4 mb-0 fw-bold">₹{editingItem.price * (editingItem.quantity || 1)}</div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="ghost"
                  className="trash-action-btn p-0 border rounded-circle d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '44px', 
                    height: '44px', 
                    backgroundColor: '#fff', 
                    border: '1px solid #fee2e2', 
                    color: '#ef4444' 
                  }}
                  onClick={() => {
                    removeFromCart(editingItem.id);
                    setEditingItem(null);
                  }}
                >
                  <Trash size={18} />
                </Button>
                <Button
                  variant="dark"
                  pill
                  className="px-5 py-2 fw-bold"
                  style={{ height: '44px', minWidth: '130px' }}
                  onClick={() => setEditingItem(null)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ADD TIP MODAL */}
      <Modal
        show={showTipModal}
        onClose={() => setShowTipModal(false)}
        title="Add a tip"
        size="md"
      >
        <div className="tip-modal-content p-4 text-center">
          <div className="amount-display-wrapper mb-4">
            <h1 className="display-4 fw-bold mb-0">
              {tipType === "amount" ? "₹" : "%"} {tipInput}
            </h1>
            <div className="calculated-secondary small text-muted mt-1 fw-semibold">
              {tipType === "amount" 
                ? `${calculatedTipPercent.toFixed(2)}% tip` 
                : `₹${calculatedTipAmount.toFixed(2)} tip`}
            </div>
          </div>

          <div className="d-flex justify-content-center mb-5">
            <div className="tip-toggle d-flex border rounded-3 overflow-hidden bg-light p-1" style={{ height: "48px", minWidth: "160px" }}>
              <button 
                className={`btn flex-grow-1 border-0 rounded-2 transition-all ${tipType === "amount" ? "bg-white shadow-sm fw-bold text-dark" : "text-muted"}`}
                onClick={() => {
                  setTipType("amount");
                  setTipInput("0");
                }}
              >
                ₹
              </button>
              <button 
                className={`btn flex-grow-1 border-0 rounded-2 transition-all ${tipType === "percent" ? "bg-white shadow-sm fw-bold text-dark" : "text-muted"}`}
                onClick={() => {
                  setTipType("percent");
                  setTipInput("0");
                }}
              >
                %
              </button>
            </div>
          </div>

          <div className="numpad-grid d-grid gap-3 mb-5 mx-auto" style={{ maxWidth: "320px", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "back"].map(val => (
              <Button 
                key={val} 
                variant="light" 
                className="numpad-btn border-0 d-flex align-items-center justify-content-center"
                style={{ 
                  width: "80px", 
                  height: "80px", 
                  borderRadius: "50%", 
                  fontSize: "24px", 
                  fontWeight: "600",
                  backgroundColor: "#f8f9fa"
                }}
                onClick={() => handleNumpad(val.toString(), "tip")}
              >
                {val === 'back' ? <Dash size={24} /> : val}
              </Button>
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-between pt-4 border-top mt-4 px-2">
            <div className="text-start">
              <div className="extra-small text-muted fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>Tip amount</div>
              <div className="h5 mb-0 fw-bold">₹{calculatedTipAmount.toFixed(2)}</div>
            </div>
            <Button 
              variant="dark" 
              pill 
              className="px-5 py-2 fw-bold" 
              style={{ height: "48px", minWidth: "140px" }}
              onClick={() => {
                if (calculatedTipAmount > 0) {
                  setAddedPayments(prev => [...prev, { type: "Tip", amount: calculatedTipAmount }]);
                }
                setTipInput("0");
                setShowTipModal(false);
              }}
            >
              Add tip
            </Button>
          </div>
        </div>
      </Modal>

      {/* ADD DISCOUNT MODAL */}
      <Modal
        show={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        title="Add cart discount"
        size="md"
      >
        <div className="discount-modal-content p-4">
          <p className="extra-small text-muted mb-4">Taxes will be recalculated after the discount has been applied.</p>
          <div className="d-flex gap-3 align-items-end mb-5">
            <div className="flex-grow-1">
              <label className="form-label small fw-bold">Amount</label>
              <Input placeholder="% 0" className="py-2 mb-0" containerClass="mb-0" />
            </div>
            <div className="tip-toggle d-flex border rounded-3 overflow-hidden h-100" style={{ height: '44px' }}>
              <button className="btn btn-light active px-3 border-0 rounded-0"><CashCoin size={18} /></button>
              <button className="btn btn-light px-3 border-0 rounded-0"><Percent size={18} /></button>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between pt-4 border-top">
            <div className="text-start">
              <div className="extra-small text-muted fw-bold">Total after discount</div>
              <div className="fw-bold fs-5">₹40.00</div>
            </div>
            <Button variant="dark" pill className="px-5 py-2 fw-bold" onClick={() => setShowDiscountModal(false)}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* ADD NOTE MODAL */}
      <Modal
        show={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Add a note"
        size="md"
      >
        <div className="note-modal-content p-4">
          <div className="position-relative mb-4">
            <label className="form-label small fw-bold">Sale note</label>
            <span className="position-absolute end-0 top-0 extra-small text-muted">0/200</span>
            <textarea className="form-control border-1 rounded-3 p-3" rows={5} placeholder="Note will be added to the sale receipt"></textarea>
          </div>
          <Button variant="dark" fullWidth pill className="py-3 fw-bold" onClick={() => setShowNoteModal(false)}>Add</Button>
        </div>
      </Modal>

      {/* ADD SERVICE CHARGE MODAL */}
      <Modal
        show={showServiceChargeModal}
        onClose={() => setShowServiceChargeModal(false)}
        title="Add service charge"
        size="md"
      >
        <div className="service-charge-content p-5">
          <div className="alert alert-warning border-0 rounded-3 d-flex gap-3 p-4" style={{ backgroundColor: '#fffbeb', color: '#92400e' }}>
            <JournalText size={24} />
            <div>
              <h6 className="fw-bold mb-1">You haven't added any service charges yet</h6>
              <p className="small mb-0">To set up any additional service charges that apply to services and items sold at checkout, go to <span className="text-decoration-underline cursor-pointer">Service charges</span>.</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* ADD CASH MODAL */}
      <Modal
        show={showCashModal}
        onClose={() => setShowCashModal(false)}
        title="Add cash amount"
        size="md"
      >
        <div className="cash-modal-content p-4 text-center">
          <div className="amount-display-wrapper mb-4">
            <h1 className="display-3 fw-bold mb-1">₹ {cashInput}</h1>
            {cashAmount < 0.01 && (
              <div className="extra-small text-danger fw-bold">Amount must be 0.01 or higher</div>
            )}
          </div>

          <div className="quick-amounts-chips d-flex flex-wrap gap-2 justify-content-center mb-5">
            {[10, 20, 50, 100, 200, 500].map(amt => (
              <Button 
                key={amt} 
                variant="outline-dark" 
                size="sm" 
                pill 
                className="px-4 py-2 border-1 fw-bold"
                onClick={() => setCashInput(amt.toString())}
              >
                ₹{amt}
              </Button>
            ))}
          </div>

          <div className="numpad-grid d-grid gap-3 mb-5 mx-auto" style={{ maxWidth: "320px", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "back"].map(val => (
              <Button 
                key={val} 
                variant="light" 
                className="numpad-btn border-0 d-flex align-items-center justify-content-center"
                style={{ 
                  width: "80px", 
                  height: "80px", 
                  borderRadius: "50%", 
                  fontSize: "24px", 
                  fontWeight: "600",
                  backgroundColor: "#f8f9fa"
                }}
                onClick={() => handleNumpad(val.toString(), "cash")}
              >
                {val === 'back' ? <Dash size={24} /> : val}
              </Button>
            ))}
          </div>

          <div className="extra-small text-muted mb-4 text-start px-2">
            Cash received by <span className="fw-bold text-dark">dhumal dipak</span>
          </div>

          <div className="d-flex align-items-center justify-content-between pt-4 border-top px-2">
            <div className="text-start">
              <div className="extra-small text-muted fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>Remaining</div>
              <div className="h5 mb-0 fw-bold">₹{Math.max(0, leftToPay - cashAmount).toFixed(2)}</div>
            </div>
            <Button 
              variant="dark" 
              pill 
              className="px-5 py-2 fw-bold" 
              style={{ height: "48px", minWidth: "140px" }}
              disabled={cashAmount < 0.01}
              onClick={() => {
                setAddedPayments(prev => [...prev, { type: "Cash", amount: cashAmount }]);
                setCashInput("0");
                setShowCashModal(false);
              }}
            >
              Add payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* REDEEM GIFT CARD MODAL */}
      <Modal
        show={showGiftCardModal}
        onClose={() => setShowGiftCardModal(false)}
        title="Redeem gift card"
        size="md"
      >
        <div className="gift-card-modal-content p-4">
          <div className="mb-4">
            <label className="form-label small fw-bold">Find gift card</label>
            <Input placeholder="Enter gift card code" className="py-2 mb-0" containerClass="mb-0" />
          </div>

          <div className="d-flex align-items-center gap-2">
            <Button variant="outline-dark" fullWidth pill className="py-2 fw-bold" onClick={() => setShowGiftCardModal(false)}>Cancel</Button>
            <Button variant="dark" fullWidth pill className="py-2 fw-bold" onClick={() => setShowGiftCardModal(false)}>Find</Button>
          </div>
        </div>
      </Modal>

      {/* SPLIT PAYMENT SELECTION MODAL */}
      <Modal
        show={showSplitSelectionModal}
        onClose={() => setShowSplitSelectionModal(false)}
        title="Select payment"
        size="md"
      >
        <div className="split-selection-modal-content p-4">
          <div className="d-flex justify-content-between gap-3 mb-5">
            <div className="flex-grow-1 border rounded-3 p-4 text-center cursor-pointer hover-bg-light" style={{ minWidth: '120px' }} onClick={() => setShowSplitSelectionModal(false)}>
              <CashCoin size={24} className="text-success mb-2" />
              <div className="fw-bold small">Cash</div>
            </div>
            <div className="flex-grow-1 border rounded-3 p-4 text-center cursor-pointer hover-bg-light" style={{ minWidth: '120px' }} onClick={() => setShowSplitSelectionModal(false)}>
              <Tag size={24} className="text-success mb-2" />
              <div className="fw-bold small">Gift card</div>
            </div>
            <div className="flex-grow-1 border rounded-3 p-4 text-center cursor-pointer hover-bg-light" style={{ minWidth: '120px' }} onClick={() => setShowSplitSelectionModal(false)}>
              <div className="text-primary mb-2">ⓢ</div>
              <div className="fw-bold small">Other</div>
            </div>
          </div>

          <div className="text-end">
            <Button variant="outline-dark" pill className="px-4 py-2 fw-bold" onClick={() => setShowSplitSelectionModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
