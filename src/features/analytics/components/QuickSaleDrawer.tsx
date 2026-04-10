import {
  Search,
  X,
  ChevronLeft,
  ChevronDown,
  Trash,
  Pencil,
  Plus,
  Dash,
  ThreeDotsVertical,
  JournalText,
  Tag,
  CashCoin,
  Percent,
  Sliders,
} from "react-bootstrap-icons";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "../styles/QuickSaleDrawer.scss";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import { useSale, type SaleItem } from "../context/SaleContext";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  createSaleThunk,
  checkoutSaleThunk,
} from "../../../middleware/sale/sale.thunk";
import type { PaymentMethod } from "../../../types/sale.types";

// ─── Static data ──────────────────────────────────────────────────────────────
const QUICK_SALE_ITEMS = [
  { id: "q1", name: "Haircut", price: 40, type: "quick" as const },
  { id: "q2", name: "Hair Color", price: 57, type: "quick" as const },
  { id: "q3", name: "Blow Dry", price: 35, type: "quick" as const },
  { id: "q4", name: "Balayage", price: 150, type: "quick" as const },
];
const SERVICE_ITEMS = [
  {
    id: "s1",
    name: "Haircut",
    duration: "1h 30min",
    price: 25,
    type: "service" as const,
  },
  {
    id: "s2",
    name: "Blow Dry",
    duration: "1h 30min",
    price: 25,
    type: "service" as const,
  },
];
const CLIENT_LIST = [
  { id: "c1", initials: "AJ", name: "Avinash J", phone: "+91 98765 43210" },
  { id: "c2", initials: "JD", name: "John Doe", phone: "+91 98765 43211" },
  { id: "c3", initials: "JS", name: "Jane Smith", phone: "+91 98765 43212" },
];
const TABS = [
  { id: "quick", label: "Quick Sale" },
  { id: "appointments", label: "Appointments" },
  { id: "services", label: "Services" },
  { id: "products", label: "Products" },
  { id: "memberships", label: "Memberships" },
  { id: "giftcards", label: "Gift cards" },
];

const CalendarIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="16" fill="url(#calendar_grad)" />
    <path
      d="M16 18C16 16.8954 16.8954 16 18 16H46C47.1046 16 48 16.8954 48 18V24H16V18Z"
      fill="white"
      fillOpacity="0.2"
    />
    <rect
      x="16"
      y="16"
      width="32"
      height="32"
      rx="4"
      fill="white"
      fillOpacity="0.1"
    />
    <circle cx="24" cy="32" r="2" fill="white" fillOpacity="0.8" />
    <circle cx="32" cy="32" r="2" fill="white" fillOpacity="0.8" />
    <circle cx="40" cy="32" r="2" fill="white" fillOpacity="0.8" />
    <circle cx="24" cy="40" r="2" fill="white" fillOpacity="0.8" />
    <circle cx="32" cy="40" r="2" fill="white" fillOpacity="0.8" />
    <circle cx="40" cy="40" r="2" fill="white" fillOpacity="0.8" />
    <defs>
      <linearGradient
        id="calendar_grad"
        x1="0"
        y1="0"
        x2="64"
        y2="64"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#A855F7" />
        <stop offset="1" stopColor="#6366F1" />
      </linearGradient>
    </defs>
  </svg>
);

const ProductIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="16" fill="url(#product_grad)" />
    <path
      d="M26 22H38V18C38 16.8954 37.1046 16 36 16H28C26.8954 16 26 16.8954 26 18V22Z"
      fill="white"
      fillOpacity="0.2"
    />
    <path
      d="M22 26C22 23.7909 23.7909 22 26 22H38C40.21 22 42 23.7909 42 26V44C42 46.2091 40.21 48 38 48H26C23.7909 48 22 46.2091 22 44V26Z"
      fill="white"
      fillOpacity="0.1"
    />
    <rect
      x="28"
      y="30"
      width="8"
      height="2"
      rx="1"
      fill="white"
      fillOpacity="0.4"
    />
    <rect
      x="28"
      y="34"
      width="8"
      height="2"
      rx="1"
      fill="white"
      fillOpacity="0.4"
    />
    <defs>
      <linearGradient
        id="product_grad"
        x1="0"
        y1="0"
        x2="64"
        y2="64"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#C084FC" />
        <stop offset="1" stopColor="#818CF8" />
      </linearGradient>
    </defs>
  </svg>
);

const MembershipIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="16" fill="url(#mem_grad)" />
    <rect
      x="16"
      y="22"
      width="32"
      height="20"
      rx="4"
      fill="white"
      fillOpacity="0.1"
    />
    <circle
      cx="40"
      cy="32"
      r="6"
      stroke="white"
      strokeWidth="2"
      strokeOpacity="0.5"
    />
    <path
      d="M40 29V32H43"
      stroke="white"
      strokeWidth="1.5"
      strokeOpacity="0.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient
        id="mem_grad"
        x1="0"
        y1="0"
        x2="64"
        y2="64"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F472B6" />
        <stop offset="1" stopColor="#A855F7" />
      </linearGradient>
    </defs>
  </svg>
);

const GiftCardIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="16" fill="url(#gift_grad)" />
    <path
      d="M22 30V44C22 46.2091 23.7909 48 26 48H38C40.21 48 42 46.2091 42 44V30H22Z"
      fill="white"
      fillOpacity="0.1"
    />
    <rect
      x="20"
      y="24"
      width="24"
      height="6"
      rx="2"
      fill="white"
      fillOpacity="0.2"
    />
    <rect x="30" y="24" width="4" height="24" fill="white" fillOpacity="0.1" />
    <path
      d="M32 24C34.2091 24 36 22.2091 36 20C36 17.7909 34.2091 16 32 16C29.7909 16 28 17.7909 28 20C28 22.2091 29.7909 24 32 24Z"
      stroke="white"
      strokeWidth="2"
      strokeOpacity="0.4"
    />
    <defs>
      <linearGradient
        id="gift_grad"
        x1="0"
        y1="0"
        x2="64"
        y2="64"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#818CF8" />
        <stop offset="1" stopColor="#C084FC" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalName =
  | "tip"
  | "discount"
  | "note"
  | "serviceCharge"
  | "cash"
  | "giftCard"
  | "splitSelection"
  | "filters"
  | null;

type DateRange =
  | "Today"
  | "Yesterday"
  | "Last 7 days"
  | "Last 30 days"
  | "Last 90 days"
  | "Last year"
  | "Week to date"
  | "Month to date"
  | "Quarter to date"
  | "Year to date"
  | "Tomorrow"
  | "Next 7 days"
  | "Next 30 days"
  | "Next 90 days"
  | "All to date";

type ActiveView = "default" | "client" | "split" | "configure";
type CheckoutStep = "cart" | "tip" | "payment";

// ─── State shapes ─────────────────────────────────────────────────────────────
// scene  — everything that controls "what is visible on screen"
interface SceneState {
  view: ActiveView;
  modal: ModalName;
  quickActionsOpen: boolean;
  dateDropdownOpen: boolean;
  membershipDropdownOpen: boolean;
}
// numpad — both cash and tip share identical numpad logic
interface NumpadState {
  tip: string;
  tipType: "amount" | "percent";
  cash: string;
}
// ui — all search / tab / filter inputs
interface UIState {
  tab: string;
  search: string;
  clientSearch: string;
}
// checkout — step + payment list always move together
interface CheckoutState {
  step: CheckoutStep;
  payments: { type: string; amount: number }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Reset values (defined once, reused in useEffect) ────────────────────────
const INIT_SCENE: SceneState = {
  view: "default",
  modal: null,
  quickActionsOpen: false,
  dateDropdownOpen: false,
  membershipDropdownOpen: false,
};
const INIT_NUMPAD: NumpadState = { tip: "0", tipType: "amount", cash: "0" };
const INIT_UI: UIState = { tab: "quick", search: "", clientSearch: "" };
const INIT_CHECKOUT: CheckoutState = { step: "cart", payments: [] };

// ── Helper: map payment type string → backend PaymentMethod ──────────────────
function resolvePaymentMethod(
  payments: { type: string; amount: number }[],
): PaymentMethod {
  if (payments.length > 1) return "split";
  const t = (payments[0]?.type ?? "").toLowerCase();
  if (t === "cash") return "cash";
  if (t === "gift card" || t === "gift_card") return "gift_card";
  if (t === "card") return "card";
  if (t === "upi") return "upi";
  return "cash"; // default
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuickSaleDrawer({ isOpen, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const salonId = useSelector(
    (state: RootState) => state.salon.currentSalon?.id,
  );
  const isCheckingOut = useSelector(
    (state: RootState) => (state.sale as any).loading?.checkout as boolean ?? false,
  );
  const isCreatingSale = useSelector(
    (state: RootState) => (state.sale as any).loading?.create as boolean ?? false,
  );

  const {
    cart,
    client,
    addToCart,
    removeFromCart,
    setClient,
    getTotal,
    saveDraft,
    clearCart,
  } = useSale();
  const nav = useNavigate();

  // ════════════════════════════════════════
  //  5 useState calls  (was 11)
  // ════════════════════════════════════════
  const [scene, setScene] = useState<SceneState>(INIT_SCENE);
  const [numpad, setNumpad] = useState<NumpadState>(INIT_NUMPAD);
  const [ui, setUI] = useState<
    UIState & { dateRange: DateRange; membershipType: string }
  >(() => ({ ...INIT_UI, dateRange: "Today", membershipType: "All" }));
  const [checkout, setCheckout] = useState<CheckoutState>(INIT_CHECKOUT);
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);

  // ─── Scene helpers ────────────────────────────────────────────────────────
  const openModal = (modal: ModalName) =>
    setScene((s) => ({ ...s, modal, quickActionsOpen: false })); // closes menu when modal opens
  const closeModal = () => setScene((s) => ({ ...s, modal: null }));
  const setView = (view: ActiveView) => setScene((s) => ({ ...s, view }));
  const toggleQuickActions = () =>
    setScene((s) => ({ ...s, quickActionsOpen: !s.quickActionsOpen }));

  // ─── UI helpers ───────────────────────────────────────────────────────────
  const setTab = (tab: string) => setUI((s) => ({ ...s, tab }));
  const setSearch = (search: string) => setUI((s) => ({ ...s, search }));
  const setClientSearch = (clientSearch: string) =>
    setUI((s) => ({ ...s, clientSearch }));
  const setDateRange = (dateRange: DateRange) =>
    setUI((s) => ({ ...s, dateRange }));
  const setMembershipType = (membershipType: string) =>
    setUI((s) => ({ ...s, membershipType }));

  // ─── Checkout helpers ─────────────────────────────────────────────────────
  const setStep = (step: CheckoutStep) => setCheckout((s) => ({ ...s, step }));

  const updatePayments = (
    fn:
      | { type: string; amount: number }[]
      | ((
          p: { type: string; amount: number }[],
        ) => { type: string; amount: number }[]),
  ) =>
    setCheckout((s) => ({
      ...s,
      payments: typeof fn === "function" ? fn(s.payments) : fn,
    }));

  // ─── Numpad helpers ───────────────────────────────────────────────────────
  const setTipType = (tipType: "amount" | "percent") =>
    setNumpad((s) => ({ ...s, tipType, tip: "0" }));

  const handleNumpad = (val: string, target: "tip" | "cash") => {
    setNumpad((s) => {
      const prev = target === "tip" ? s.tip : s.cash;
      const next = (() => {
        if (val === "back") return prev.length <= 1 ? "0" : prev.slice(0, -1);
        if (val === ".") return prev.includes(".") ? prev : prev + ".";
        if (prev === "0") return val;
        if (prev.includes(".") && prev.split(".")[1].length >= 2) return prev;
        return prev + val;
      })();
      return target === "tip" ? { ...s, tip: next } : { ...s, cash: next };
    });
  };

  // ─── Derived values (never stored in state) ───────────────────────────────
  const tipAmount =
    numpad.tipType === "amount"
      ? parseFloat(numpad.tip)
      : (getTotal() * parseFloat(numpad.tip)) / 100;

  const tipPercent =
    numpad.tipType === "percent"
      ? parseFloat(numpad.tip)
      : getTotal() > 0
        ? (parseFloat(numpad.tip) / getTotal()) * 100
        : 0;

  const cashAmount = parseFloat(numpad.cash);
  const leftToPay = Math.max(
    0,
    getTotal() - checkout.payments.reduce((a, p) => a + p.amount, 0),
  );

  const filteredQuickItems = QUICK_SALE_ITEMS.filter((i) =>
    i.name.toLowerCase().includes(ui.search.toLowerCase()),
  );
  const filteredServiceItems = SERVICE_ITEMS.filter((s) =>
    s.name.toLowerCase().includes(ui.search.toLowerCase()),
  );
  const filteredClients = CLIENT_LIST.filter(
    (c) =>
      c.name.toLowerCase().includes(ui.clientSearch.toLowerCase()) ||
      c.phone.toLowerCase().includes(ui.clientSearch.toLowerCase()),
  );

  // ─── Pay now: create draft then checkout ──────────────────────────────────
  const handlePayNow = async () => {
    if (!salonId || cart.length === 0) return;

    const paymentMethod = resolvePaymentMethod(checkout.payments);

    // 1. Create a draft sale
    const createResult = await dispatch(
      createSaleThunk({
        salon_id: String(salonId),
        client_id: client?.id ?? null,
        status: "draft",
        items: cart.map((item) => ({
          item_type:
            item.type === "giftcard"
              ? ("gift_card" as const)
              : item.type === "quick"
                ? ("product" as const)
                : (item.type as any),
          name: item.name,
          quantity: item.quantity || 1,
          unit_price: String(item.price),
        })),
        tip_amount:
          tipAmount > 0 ? tipAmount.toFixed(2) : undefined,
      }),
    );

    if (createSaleThunk.rejected.match(createResult)) return; // bail on error

    const newSale = createResult.payload as { id: string | number };

    // 2. Checkout the draft
    const checkoutResult = await dispatch(
      checkoutSaleThunk({
        id: newSale.id,
        payment_method: paymentMethod,
      }),
    );

    if (checkoutSaleThunk.fulfilled.match(checkoutResult)) {
      clearCart();
      onClose();
    }
  };

  // ─── Save unpaid (draft without payment) ──────────────────────────────────
  const handleSaveUnpaid = async () => {
    if (!salonId || cart.length === 0) return;
    await dispatch(
      createSaleThunk({
        salon_id: String(salonId),
        client_id: client?.id ?? null,
        status: "draft",
        items: cart.map((item) => ({
          item_type:
            item.type === "giftcard"
              ? ("gift_card" as const)
              : (item.type as any),
          name: item.name,
          quantity: item.quantity || 1,
          unit_price: String(item.price),
        })),
      }),
    );
    clearCart();
    onClose();
  };

  // ─── Reset everything on close ────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    if (!isOpen) {
      setScene(INIT_SCENE);
      setNumpad(INIT_NUMPAD);
      setUI({ ...INIT_UI, dateRange: "Today", membershipType: "All" });
      setCheckout(INIT_CHECKOUT);
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`quick-sale-overlay ${scene.view === "configure" ? "is-configuring" : ""}`}
    >
      <div className="quick-sale-panel">
        {/* HEADER */}
        <div className="quick-sale-header d-flex align-items-center justify-content-between p-3 border-bottom">
          {scene.view !== "configure" ? (
            <>
              <div className="flex-grow-1">
                <div className="breadcrumb small text-muted mb-1">
                  <span
                    className={`cursor-pointer ${checkout.step === "cart" ? "fw-bold text-dark" : "hover-text-dark"}`}
                    onClick={() => setStep("cart")}
                  >
                    Cart
                  </span>
                  <span className="mx-2 opacity-50">›</span>
                  <span
                    className={`cursor-pointer ${checkout.step === "tip" ? "fw-bold text-dark" : "hover-text-dark"}`}
                    onClick={() => setStep("tip")}
                  >
                    Tip
                  </span>
                  <span className="mx-2 opacity-50">›</span>
                  <span
                    className={`cursor-pointer ${checkout.step === "payment" ? "fw-bold text-dark" : "hover-text-dark"}`}
                    onClick={() => setStep("payment")}
                  >
                    Payment
                  </span>
                </div>
                <h3 className="h5 mb-0 fw-bold">
                  {checkout.step === "cart" && "Add to cart"}
                  {checkout.step === "tip" && "Select tip"}
                  {checkout.step === "payment" && "Select payment"}
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
              <div className="flex-grow-1" />
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-dark"
                  size="sm"
                  pill
                  className="px-4"
                  onClick={() => setView("default")}
                >
                  Close
                </Button>
                <Button
                  variant="dark"
                  size="sm"
                  pill
                  className="px-4"
                  onClick={() => setView("default")}
                >
                  Save
                </Button>
              </div>
            </>
          )}
        </div>

        {/* BODY */}
        <div className="quick-sale-body">
          {scene.view === "configure" ? (
            /* ── Configure view ── */
            <div className="configure-view p-5 w-100">
              <div
                className="configure-content mx-auto"
                style={{ maxWidth: "800px" }}
              >
                <h2 className="h2 fw-bold mb-2">Quick sale items</h2>
                <p className="text-muted mb-4">
                  Search for sellable items to add to your quick sale layout.
                  Drag and drop to rearrange.
                </p>
                <div className="search-wrapper mb-4">
                  <Input
                    placeholder="Search"
                    className="mb-0 py-3"
                    containerClass="mb-0"
                    iconLeft={<Search size={18} />}
                  />
                </div>
                <div className="configure-grid">
                  {QUICK_SALE_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="configure-item-card d-flex align-items-center justify-content-between p-3 border rounded-3 bg-white shadow-sm mb-3"
                    >
                      <div>
                        <div className="fw-bold small">{item.name}</div>
                        <div className="extra-small text-muted">
                          ₹{item.price}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="trash-btn text-muted p-1"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  ))}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={`empty-${i}`}
                      className="configure-empty-slot border border-dashed rounded-3 mb-3 d-flex align-items-center justify-content-center text-muted"
                      style={{ height: "70px", opacity: 0.3 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── LEFT SIDE ── */}
              <div className="quick-sale-left">
                {/* Cart step */}
                {checkout.step === "cart" && (
                  <>
                    <div className="quick-tabs d-flex gap-1 mb-3 overflow-auto pb-1 no-scrollbar">
                      {TABS.map((tab) => (
                        <Button
                          key={tab.id}
                          variant={ui.tab === tab.id ? "dark" : "light"}
                          size="sm"
                          pill
                          className="text-nowrap"
                          onClick={() => setTab(tab.id)}
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </div>

                    {ui.tab !== "appointments" && ui.tab !== "memberships" && (
                      <div className="search-wrapper mb-4">
                        <Input
                          placeholder="Search"
                          className="mb-0"
                          containerClass="mb-0"
                          iconLeft={<Search size={16} />}
                          value={ui.search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                    )}

                    {ui.tab === "quick" && (
                      <div className="quick-sale-grid-wrapper">
                        <div className="quick-sale-grid">
                          {filteredQuickItems.map((item) => (
                            <div
                              key={item.id}
                              className="quick-item-card"
                              onClick={() => addToCart(item)}
                            >
                              <div className="quick-item-info">
                                <div className="quick-item-name">
                                  {item.name}
                                </div>
                                <div className="quick-item-price">
                                  ₹{item.price}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="edit-items-link mt-4">
                          <span
                            className="cursor-pointer small hover-underline"
                            onClick={() => setView("configure")}
                          >
                            Edit items
                          </span>
                        </div>
                      </div>
                    )}

                    {ui.tab === "appointments" && (
                      <div className="appointments-tab-view mt-1">
                        <div className="d-flex align-items-center gap-2 mb-4">
                          <div className="flex-grow-1 position-relative">
                            <Input
                              placeholder="Search"
                              className="mb-0 py-2 border-1 rounded-3"
                              containerClass="mb-0"
                              iconLeft={
                                <Search size={16} className="text-muted" />
                              }
                              value={ui.search}
                              onChange={(e) => setSearch(e.target.value)}
                            />
                          </div>
                          <div className="position-relative date-selector-container">
                            <Button
                              variant="outline-dark"
                              size="sm"
                              pill
                              className="d-flex align-items-center gap-2 px-3 border border-1 border-light-subtle text-dark bg-white hover-bg-light shadow-sm"
                              style={{ height: "42px", minWidth: "100px" }}
                              onClick={() =>
                                setScene((s) => ({
                                  ...s,
                                  dateDropdownOpen: !s.dateDropdownOpen,
                                }))
                              }
                            >
                              <span className="fw-bold small">
                                {ui.dateRange}
                              </span>
                              <ChevronDown size={12} className="text-muted" />
                            </Button>

                            {scene.dateDropdownOpen && (
                              <div className="date-dropdown-menu">
                                {[
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
                                ].map((range) => (
                                  <div
                                    key={range}
                                    className={`date-dropdown-item ${ui.dateRange === range ? "active" : ""}`}
                                    onClick={() => {
                                      setDateRange(range as DateRange);
                                      setScene((s) => ({
                                        ...s,
                                        dateDropdownOpen: false,
                                      }));
                                    }}
                                  >
                                    {range}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline-dark"
                            size="sm"
                            className="rounded-circle p-0 border border-1 border-light-subtle text-dark bg-white hover-bg-light shadow-sm"
                            style={{ width: "42px", height: "42px" }}
                            onClick={() => openModal("filters")}
                          >
                            <Sliders size={18} />
                          </Button>
                        </div>

                        <div className="empty-state-box d-flex flex-column align-items-center justify-content-center text-center py-5">
                          <div className="mb-4">
                            <CalendarIcon />
                          </div>
                          <h4 className="fw-bold mb-2">
                            No appointments to checkout
                          </h4>
                          <p
                            className="text-muted small mx-auto px-4"
                            style={{ maxWidth: "320px", lineHeight: "1.6" }}
                          >
                            Try selecting a different date period or show the{" "}
                            <span className="text-primary cursor-pointer hover-underline fw-semibold">
                              last 7 days
                            </span>{" "}
                            to see more results.
                          </p>
                        </div>
                      </div>
                    )}

                    {ui.tab === "services" && (
                      <div className="services-list d-flex flex-column gap-2 mt-2">
                        {filteredServiceItems.map((service) => (
                          <Button
                            key={service.id}
                            variant="ghost"
                            fullWidth
                            className="service-card p-3 border rounded-3 text-start d-flex align-items-center justify-content-between hover-bg-light"
                            onClick={() => addToCart(service)}
                          >
                            <div>
                              <h5 className="h6 mb-1 fw-bold">
                                {service.name}
                              </h5>
                              <p className="small text-muted mb-0">
                                {service.duration}
                              </p>
                            </div>
                            <div className="fw-bold">₹{service.price}</div>
                          </Button>
                        ))}
                      </div>
                    )}

                    {ui.tab === "products" && (
                      <div className="empty-state-box d-flex flex-column align-items-center justify-content-center text-center py-5">
                        <div className="mb-4">
                          <ProductIcon />
                        </div>
                        <h4 className="fw-bold mb-2">No products set up</h4>
                        <p className="text-primary small cursor-pointer hover-underline fw-bold">
                          Manage products
                        </p>
                      </div>
                    )}

                    {ui.tab === "memberships" && (
                      <div className="memberships-tab-view mt-1">
                        <div className="d-flex align-items-center gap-2 mb-4">
                          <div className="flex-grow-1 position-relative">
                            <Input
                              placeholder="Search"
                              className="mb-0 py-2 border-1 rounded-3"
                              containerClass="mb-0"
                              iconLeft={
                                <Search size={16} className="text-muted" />
                              }
                            />
                          </div>
                          <div className="position-relative">
                            <Button
                              variant="outline-dark"
                              size="sm"
                              pill
                              className="d-flex align-items-center gap-2 px-3 border border-1 border-light-subtle text-dark bg-white hover-bg-light shadow-sm"
                              style={{ height: "42px", minWidth: "80px" }}
                              onClick={() =>
                                setScene((s) => ({
                                  ...s,
                                  membershipDropdownOpen:
                                    !s.membershipDropdownOpen,
                                }))
                              }
                            >
                              <span className="fw-bold small">
                                {ui.membershipType}
                              </span>
                              <ChevronDown size={12} className="text-muted" />
                            </Button>

                            {scene.membershipDropdownOpen && (
                              <div
                                className="date-dropdown-menu shadow-lg border rounded-3 bg-white py-2 position-absolute"
                                style={{
                                  top: "100%",
                                  right: 0,
                                  marginTop: "8px",
                                  zIndex: 1000,
                                  width: "140px",
                                }}
                              >
                                {["All", "Recurring", "One-off"].map((m) => (
                                  <div
                                    key={m}
                                    className={`date-dropdown-item ${ui.membershipType === m ? "active" : ""}`}
                                    onClick={() => {
                                      setMembershipType(m);
                                      setScene((s) => ({
                                        ...s,
                                        membershipDropdownOpen: false,
                                      }));
                                    }}
                                  >
                                    {m}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline-dark"
                            size="sm"
                            className="rounded-circle p-0 border border-1 border-light-subtle text-dark bg-white hover-bg-light shadow-sm"
                            style={{ width: "42px", height: "42px" }}
                            onClick={() => openModal("filters")}
                          >
                            <Sliders size={18} />
                          </Button>
                        </div>

                        <div className="empty-state-box d-flex flex-column align-items-center justify-content-center text-center py-5">
                          <div className="mb-4">
                            <MembershipIcon />
                          </div>
                          <h4 className="fw-bold mb-2">
                            No memberships added yet
                          </h4>
                          <p className="small text-muted mb-0">
                            <span className="text-primary cursor-pointer hover-underline fw-bold">
                              Click here
                            </span>{" "}
                            to add and manage your memberships.
                          </p>
                        </div>
                      </div>
                    )}

                    {ui.tab === "giftcards" && (
                      <div className="empty-state-box d-flex flex-column align-items-center justify-content-center text-center py-5">
                        <div className="mb-4">
                          <GiftCardIcon />
                        </div>
                        <h4 className="fw-bold mb-2">No gift cards set up</h4>
                        <p className="text-primary small cursor-pointer hover-underline fw-bold">
                          Manage gift cards
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Tip step */}
                {checkout.step === "tip" && (
                  <div className="select-tip-view p-2">
                    <div className="tip-header mb-4">
                      <h4 className="h5 fw-bold mb-1">Select tip</h4>
                      <p className="extra-small text-muted mb-0">
                        Select an amount for dhumal dipak
                      </p>
                    </div>
                    <div
                      className="tip-selection-grid d-grid gap-3"
                      style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                    >
                      {[null, 10, 18, 25].map((pct, i) => (
                        <div
                          key={i}
                          className="tip-option-card border rounded-3 cursor-pointer text-center hover-bg-light p-3"
                          style={{
                            height: "100px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div className="fw-bold small">
                            {pct === null ? "No tip" : `${pct}%`}
                          </div>
                          {pct !== null && (
                            <div className="extra-small text-muted">
                              ₹{((getTotal() * pct) / 100).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                      <div
                        className="tip-option-card border rounded-3 cursor-pointer text-center hover-bg-light p-3"
                        style={{
                          height: "100px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => openModal("tip")}
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1 mb-1">
                          <Plus size={16} />
                        </div>
                        <div className="fw-bold small">Custom tip</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment step */}
                {checkout.step === "payment" &&
                  (scene.view !== "split" ? (
                    <div className="select-payment-view p-2">
                      <div
                        className="numpad-grid d-grid gap-3"
                        style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
                      >
                        <div
                          className="payment-method-card border rounded-3 p-4 text-center cursor-pointer hover-bg-light"
                          onClick={() => openModal("cash")}
                        >
                          <CashCoin size={24} className="text-success mb-2" />
                          <div className="fw-bold small">Cash</div>
                        </div>
                        <div
                          className="payment-method-card border rounded-3 p-4 text-center cursor-pointer hover-bg-light"
                          onClick={() => openModal("giftCard")}
                        >
                          <Tag size={24} className="text-success mb-2" />
                          <div className="fw-bold small">Gift card</div>
                        </div>
                        <div
                          className="payment-method-card border border-dashed rounded-3 p-4 text-center cursor-pointer hover-bg-light"
                          onClick={() => setView("split")}
                        >
                          <div className="text-muted mb-2">◰</div>
                          <div className="fw-bold small">Split payment</div>
                        </div>
                        <div
                          className={`payment-method-card border rounded-3 p-4 text-center cursor-pointer hover-bg-light ${checkout.payments.some((p) => p.type === "Other") ? "border-primary shadow-sm" : ""}`}
                          onClick={() =>
                            updatePayments([
                              { type: "Other", amount: getTotal() },
                            ])
                          }
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
                          onClick={() => setView("default")}
                          iconLeft={<ChevronLeft size={20} />}
                        />
                        <h4 className="h5 mb-0 fw-bold">Split payment</h4>
                      </div>
                      <div
                        className="add-payment-method-row border rounded-3 p-3 bg-white d-flex align-items-center gap-3 cursor-pointer hover-bg-light mb-3"
                        style={{ color: "#6366f1" }}
                        onClick={() => openModal("splitSelection")}
                      >
                        <div
                          className="plus-icon-circle border rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: "28px",
                            height: "28px",
                            borderColor: "#6366f1",
                          }}
                        >
                          <Plus size={20} />
                        </div>
                        <span className="small fw-bold">
                          Add payment method
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* ── RIGHT SIDE ── */}
              <div className="quick-sale-right">
                {scene.view !== "client" ? (
                  <>
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setView("client")}
                      className="add-client-card p-3 border rounded-3 text-start d-flex align-items-center justify-content-between mb-3 hover-bg-light"
                    >
                      {client ? (
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="client-avatar rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: "40px", height: "40px" }}
                          >
                            {client.initials}
                          </div>
                          <div>
                            <h5 className="h6 mb-0 fw-bold">{client.name}</h5>
                            <p className="extra-small text-muted mb-0">
                              {client.phone}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h5 className="h6 mb-1 fw-bold">Add client</h5>
                          <p className="small text-muted mb-0">
                            Leave empty for walk-ins
                          </p>
                        </div>
                      )}
                      <div className="client-icon rounded-circle d-flex align-items-center justify-content-center">
                        {client ? (
                          <X
                            size={20}
                            onClick={(e) => {
                              e.stopPropagation();
                              setClient(null);
                            }}
                          />
                        ) : (
                          "+"
                        )}
                      </div>
                    </Button>

                    <div className="right-divider" />

                    <div className="cart-content flex-grow-1 overflow-auto">
                      {cart.length > 0 ? (
                        <div className="cart-items-list d-flex flex-column gap-3">
                          {cart.map((item) => (
                            <div
                              key={item.id}
                              className="cart-item d-flex justify-content-between align-items-start cursor-pointer hover-bg-light p-2 rounded-2"
                              onClick={() => setEditingItem(item)}
                            >
                              <div className="d-flex gap-2">
                                <div className="item-qty fw-bold text-muted small mt-1">
                                  {item.quantity}×
                                </div>
                                <div>
                                  <div className="item-name fw-bold small">
                                    {item.name}
                                  </div>
                                  <div className="item-price extra-small text-muted">
                                    ₹{item.price} each
                                  </div>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <div className="item-total fw-bold small">
                                  ₹{item.price * (item.quantity || 1)}
                                </div>
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
                          <h4 className="h5 fw-bold mb-2">
                            Your cart is empty
                          </h4>
                          <p className="small text-muted mb-0 px-4">
                            Tap an item to add to cart or add an existing client
                            for smart recommendations
                          </p>
                        </div>
                      )}
                    </div>

                    {cart.length > 0 && (
                      <div className="cart-footer border-top pt-4 mt-4 px-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small text-muted fw-bold">
                            Subtotal
                          </span>
                          <span className="small text-muted fw-bold">
                            ₹{getTotal()}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-muted fw-bold">Tax</span>
                          <span className="small text-muted fw-bold">₹0</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <span className="h5 mb-0 fw-bold">Total</span>
                          <span className="h5 mb-0 fw-bold">₹{getTotal()}</span>
                        </div>

                        {checkout.payments.length > 0 && (
                          <div className="added-payments-list pt-3 border-top mb-4">
                            {checkout.payments.map((p, idx) => (
                              <div
                                key={idx}
                                className="d-flex justify-content-between align-items-center mb-2"
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <span className="small fw-bold">
                                    {p.type}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 text-muted"
                                    onClick={() =>
                                      updatePayments((prev) =>
                                        prev.filter((_, i) => i !== idx),
                                      )
                                    }
                                  >
                                    <Trash size={14} />
                                  </Button>
                                </div>
                                <span className="small fw-bold">
                                  ₹{p.amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="d-flex align-items-center gap-2">
                          <div className="position-relative">
                            <Button
                              variant="ghost"
                              className="border rounded-circle p-2 d-flex align-items-center justify-content-center"
                              style={{ width: "48px", height: "48px" }}
                              onClick={toggleQuickActions}
                            >
                              <ThreeDotsVertical size={20} />
                            </Button>

                            {scene.quickActionsOpen && (
                              <div
                                className="quick-actions-menu shadow-lg border rounded-3 bg-white position-absolute mb-2"
                                style={{
                                  bottom: "100%",
                                  left: 0,
                                  width: "220px",
                                  zIndex: 100,
                                }}
                              >
                                <div className="p-2 border-bottom extra-small text-muted fw-bold bg-light rounded-top-3">
                                  Quick actions
                                </div>
                                <div className="p-1">
                                  {[
                                    {
                                      icon: <CashCoin size={16} />,
                                      label: "Add tip",
                                      modal: "tip" as ModalName,
                                    },
                                    {
                                      icon: <Tag size={16} />,
                                      label: "Add cart discount",
                                      modal: "discount" as ModalName,
                                    },
                                    {
                                      icon: <JournalText size={16} />,
                                      label: "Add sale note",
                                      modal: "note" as ModalName,
                                    },
                                    {
                                      icon: <Percent size={16} />,
                                      label: "Add service charge",
                                      modal: "serviceCharge" as ModalName,
                                    },
                                  ].map(({ icon, label, modal }) => (
                                    <div
                                      key={label}
                                      className="action-item d-flex align-items-center gap-2 p-2 hover-bg-light cursor-pointer rounded-2 small"
                                      onClick={() => openModal(modal)}
                                    >
                                      {icon} {label}
                                    </div>
                                  ))}
                                  <div className="border-top my-1" />
                                  <div
                                    className="action-item p-2 hover-bg-light cursor-pointer rounded-2 small"
                                    onClick={async () => {
                                      await saveDraft({ cart, client });
                                      onClose();
                                    }}
                                  >
                                    Save as draft
                                  </div>
                                  <div
                                    className="action-item p-2 hover-text-danger cursor-pointer rounded-2 small text-danger"
                                    onClick={() => {
                                      removeFromCart("all");
                                      setScene((s) => ({
                                        ...s,
                                        quickActionsOpen: false,
                                      }));
                                    }}
                                  >
                                    Cancel sale
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex-grow-1 flex-column d-flex gap-2">
                            {checkout.step === "payment" &&
                              checkout.payments.length > 0 &&
                              leftToPay === 0 && (
                                <div className="text-center extra-small fw-bold text-dark mb-1">
                                  Full payment added
                                </div>
                              )}
                            <Button
                              variant={
                                checkout.step === "payment" &&
                                checkout.payments.length === 0
                                  ? "outline-dark"
                                  : "dark"
                              }
                              fullWidth
                              pill
                              size="lg"
                              className="fw-bold py-3"
                              style={{ height: "48px" }}
                              disabled={
                                isCheckingOut ||
                                isCreatingSale ||
                                (checkout.step === "payment" &&
                                  checkout.payments.length > 0 &&
                                  leftToPay > 0)
                              }
                              onClick={() => {
                                if (checkout.step === "cart") setStep("tip");
                                else if (checkout.step === "tip")
                                  setStep("payment");
                                else if (
                                  checkout.payments.length > 0 &&
                                  leftToPay === 0
                                )
                                  handlePayNow();
                                else handleSaveUnpaid();
                              }}
                            >
                              {isCheckingOut || isCreatingSale
                                ? "Processing…"
                                : checkout.step === "payment"
                                  ? checkout.payments.length > 0
                                    ? leftToPay > 0
                                      ? "Amount pending"
                                      : "Pay now"
                                    : "Save unpaid"
                                  : "Continue to payment"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Client selection view ── */
                  <div className="client-selection-view h-100 d-flex flex-column">
                    <div className="client-selection-header d-flex align-items-center gap-3 mb-3 p-2">
                      <Button
                        variant="ghost"
                        onClick={() => setView("default")}
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
                        value={ui.clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />
                    </div>
                    <div className="client-list flex-grow-1 overflow-auto px-2">
                      {filteredClients.map((c) => (
                        <Button
                          key={c.id}
                          variant="ghost"
                          fullWidth
                          className="client-item p-3 mb-2 border rounded-3 text-start d-flex align-items-center gap-3 hover-bg-light"
                          onClick={() => {
                            setClient(c);
                            setView("default");
                          }}
                        >
                          <div
                            className="client-avatar rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold"
                            style={{ minWidth: "40px", height: "40px" }}
                          >
                            {c.initials}
                          </div>
                          <div>
                            <div className="client-name fw-bold small">
                              {c.name}
                            </div>
                            <div className="client-phone extra-small text-muted">
                              {c.phone}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                    <div className="client-selection-footer p-3 border-top mt-auto">
                      <Button
                        variant="dark"
                        fullWidth
                        pill
                        onClick={() => nav("/dashboard/clients/add")}
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

      {/* ── MODALS ── */}

      <Modal
        show={scene.modal === "filters"}
        onClose={closeModal}
        title="Filters"
        size="lg"
        footer={
          <div className="d-flex align-items-center justify-content-end w-100 gap-3">
            <Button
              variant="outline-dark"
              pill
              className="fw-bold small px-4"
              onClick={closeModal}
            >
              Clear filters
            </Button>
            <Button
              variant="dark"
              pill
              onClick={closeModal}
              className="px-5 py-2 small fw-bold"
              style={{ minWidth: "120px", height: "40px" }}
            >
              Apply
            </Button>
          </div>
        }
      >
        <div className="filters-content">
          {ui.tab === "appointments" && (
            <div className="filter-group">
              <label className="form-label small fw-bold">Team member</label>
              <div className="position-relative">
                <select
                  className="form-select border rounded-3 px-3 py-2 pe-5 small shadow-none cursor-pointer"
                  style={{ appearance: "none" }}
                >
                  <option>All team members</option>
                  <option>dhumal dipak</option>
                </select>
                <ChevronDown
                  className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
                  size={14}
                />
              </div>
            </div>
          )}

          {ui.tab === "memberships" && (
            <>
              <div className="filter-group mb-4">
                <label className="form-label small fw-bold">Sessions</label>
                <div className="position-relative">
                  <select
                    className="form-select border rounded-3 px-3 py-2 pe-5 small shadow-none cursor-pointer"
                    style={{ appearance: "none" }}
                  >
                    <option>Any number of sessions</option>
                    <option>Unlimited</option>
                    <option>Limited</option>
                  </select>
                  <ChevronDown
                    className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
                    size={14}
                  />
                </div>
              </div>
              <div className="filter-group mb-4">
                <label className="form-label small fw-bold">Valid for</label>
                <div className="position-relative">
                  <select
                    className="form-select border rounded-3 px-3 py-2 pe-5 small shadow-none cursor-pointer"
                    style={{ appearance: "none" }}
                  >
                    <option>Any period</option>
                    <option>7 days</option>
                    <option>14 days</option>
                    <option>1 month</option>
                    <option>2 months</option>
                  </select>
                  <ChevronDown
                    className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
                    size={14}
                  />
                </div>
              </div>
              <div className="form-check d-flex align-items-center gap-2">
                <input
                  className="form-check-input mt-0 cursor-pointer shadow-none"
                  type="checkbox"
                  id="coverServices"
                />
                <label
                  className="form-check-label small cursor-pointer"
                  htmlFor="coverServices"
                  style={{ fontSize: "13px" }}
                >
                  Display only memberships which cover all services
                </label>
              </div>
            </>
          )}
        </div>
      </Modal>

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
                <label
                  className="form-label fw-semibold"
                  style={{ fontSize: "13px" }}
                >
                  Quantity
                </label>
                <div className="input-group quantity-input-group shadow-none border rounded-3 p-1">
                  <Button variant="ghost" size="sm" className="p-1 border-0">
                    <Dash size={16} />
                  </Button>
                  <div
                    className="form-control border-0 text-center fw-bold bg-transparent shadow-none p-0 d-flex align-items-center justify-content-center"
                    style={{ height: "32px", minWidth: "24px" }}
                  >
                    {editingItem.quantity || 1}
                  </div>
                  <Button variant="ghost" size="sm" className="p-1 border-0">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
              <div className="col-12 mt-4">
                <label
                  className="form-label fw-semibold"
                  style={{ fontSize: "13px" }}
                >
                  Discounts
                </label>
                <select className="form-select border-1 rounded-3 px-3">
                  <option>None available</option>
                </select>
              </div>
              <div className="col-12 mt-4">
                <label
                  className="form-label fw-semibold"
                  style={{ fontSize: "13px" }}
                >
                  Team member
                </label>
                <select className="form-select border-1 rounded-3 px-3">
                  <option>dhumal dipak</option>
                </select>
              </div>
            </div>
            <div className="edit-modal-footer d-flex align-items-center justify-content-between mt-5 pt-4 border-top">
              <div className="item-total-display">
                <div
                  className="extra-small text-muted fw-bold text-uppercase"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Item total
                </div>
                <div className="h4 mb-0 fw-bold">
                  ₹{editingItem.price * (editingItem.quantity || 1)}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="ghost"
                  className="trash-action-btn p-0 border rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: "#fff",
                    border: "1px solid #fee2e2",
                    color: "#ef4444",
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
                  style={{ height: "44px", minWidth: "130px" }}
                  onClick={() => setEditingItem(null)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        show={scene.modal === "tip"}
        onClose={closeModal}
        title="Add a tip"
        size="md"
      >
        <div className="tip-modal-content p-4 text-center">
          <div className="amount-display-wrapper mb-4">
            <h1 className="display-4 fw-bold mb-0">
              {numpad.tipType === "amount" ? "₹" : "%"} {numpad.tip}
            </h1>
            <div className="calculated-secondary small text-muted mt-1 fw-semibold">
              {numpad.tipType === "amount"
                ? `${tipPercent.toFixed(2)}% tip`
                : `₹${tipAmount.toFixed(2)} tip`}
            </div>
          </div>
          <div className="d-flex justify-content-center mb-5">
            <div
              className="tip-toggle d-flex border rounded-3 overflow-hidden bg-light p-1"
              style={{ height: "48px", minWidth: "160px" }}
            >
              <button
                className={`btn flex-grow-1 border-0 rounded-2 ${numpad.tipType === "amount" ? "bg-white shadow-sm fw-bold text-dark" : "text-muted"}`}
                onClick={() => setTipType("amount")}
              >
                ₹
              </button>
              <button
                className={`btn flex-grow-1 border-0 rounded-2 ${numpad.tipType === "percent" ? "bg-white shadow-sm fw-bold text-dark" : "text-muted"}`}
                onClick={() => setTipType("percent")}
              >
                %
              </button>
            </div>
          </div>
          <div
            className="numpad-grid d-grid gap-3 mb-5 mx-auto"
            style={{ maxWidth: "320px", gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "back"].map((val) => (
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
                  backgroundColor: "#f8f9fa",
                }}
                onClick={() => handleNumpad(val.toString(), "tip")}
              >
                {val === "back" ? <Dash size={24} /> : val}
              </Button>
            ))}
          </div>
          <div className="d-flex align-items-center justify-content-between pt-4 border-top mt-4 px-2">
            <div className="text-start">
              <div
                className="extra-small text-muted fw-bold text-uppercase"
                style={{ letterSpacing: "0.5px" }}
              >
                Tip amount
              </div>
              <div className="h5 mb-0 fw-bold">₹{tipAmount.toFixed(2)}</div>
            </div>
            <Button
              variant="dark"
              pill
              className="px-5 py-2 fw-bold"
              style={{ height: "48px", minWidth: "140px" }}
              onClick={() => {
                if (tipAmount > 0)
                  updatePayments((prev) => [
                    ...prev,
                    { type: "Tip", amount: tipAmount },
                  ]);
                setNumpad((s) => ({ ...s, tip: "0", tipType: "amount" }));
                closeModal();
              }}
            >
              Add tip
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        show={scene.modal === "discount"}
        onClose={closeModal}
        title="Add cart discount"
        size="md"
      >
        <div className="discount-modal-content p-4">
          <p className="extra-small text-muted mb-4">
            Taxes will be recalculated after the discount has been applied.
          </p>
          <div className="d-flex gap-3 align-items-end mb-5">
            <div className="flex-grow-1">
              <label className="form-label small fw-bold">Amount</label>
              <Input
                placeholder="% 0"
                className="py-2 mb-0"
                containerClass="mb-0"
              />
            </div>
            <div
              className="tip-toggle d-flex border rounded-3 overflow-hidden h-100"
              style={{ height: "44px" }}
            >
              <button className="btn btn-light active px-3 border-0 rounded-0">
                <CashCoin size={18} />
              </button>
              <button className="btn btn-light px-3 border-0 rounded-0">
                <Percent size={18} />
              </button>
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-between pt-4 border-top">
            <div className="text-start">
              <div className="extra-small text-muted fw-bold">
                Total after discount
              </div>
              <div className="fw-bold fs-5">₹40.00</div>
            </div>
            <Button
              variant="dark"
              pill
              className="px-5 py-2 fw-bold"
              onClick={closeModal}
            >
              Add
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        show={scene.modal === "note"}
        onClose={closeModal}
        title="Add a note"
        size="md"
      >
        <div className="note-modal-content p-4">
          <div className="position-relative mb-4">
            <label className="form-label small fw-bold">Sale note</label>
            <span className="position-absolute end-0 top-0 extra-small text-muted">
              0/200
            </span>
            <textarea
              className="form-control border-1 rounded-3 p-3"
              rows={5}
              placeholder="Note will be added to the sale receipt"
            />
          </div>
          <Button
            variant="dark"
            fullWidth
            pill
            className="py-3 fw-bold"
            onClick={closeModal}
          >
            Add
          </Button>
        </div>
      </Modal>

      <Modal
        show={scene.modal === "serviceCharge"}
        onClose={closeModal}
        title="Add service charge"
        size="md"
      >
        <div className="service-charge-content p-5">
          <div
            className="alert alert-warning border-0 rounded-3 d-flex gap-3 p-4"
            style={{ backgroundColor: "#fffbeb", color: "#92400e" }}
          >
            <JournalText size={24} />
            <div>
              <h6 className="fw-bold mb-1">
                You haven't added any service charges yet
              </h6>
              <p className="small mb-0">
                To set up any additional service charges that apply to services
                and items sold at checkout, go to{" "}
                <span className="text-decoration-underline cursor-pointer">
                  Service charges
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        show={scene.modal === "cash"}
        onClose={closeModal}
        title="Add cash amount"
        size="md"
      >
        <div className="cash-modal-content p-4 text-center">
          <div className="amount-display-wrapper mb-4">
            <h1 className="display-3 fw-bold mb-1">₹ {numpad.cash}</h1>
            {cashAmount < 0.01 && (
              <div className="extra-small text-danger fw-bold">
                Amount must be 0.01 or higher
              </div>
            )}
          </div>
          <div className="quick-amounts-chips d-flex flex-wrap gap-2 justify-content-center mb-5">
            {[10, 20, 50, 100, 200, 500].map((amt) => (
              <Button
                key={amt}
                variant="outline-dark"
                size="sm"
                pill
                className="px-4 py-2 border-1 fw-bold"
                onClick={() =>
                  setNumpad((s) => ({ ...s, cash: amt.toString() }))
                }
              >
                ₹{amt}
              </Button>
            ))}
          </div>
          <div
            className="numpad-grid d-grid gap-3 mb-5 mx-auto"
            style={{ maxWidth: "320px", gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "back"].map((val) => (
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
                  backgroundColor: "#f8f9fa",
                }}
                onClick={() => handleNumpad(val.toString(), "cash")}
              >
                {val === "back" ? <Dash size={24} /> : val}
              </Button>
            ))}
          </div>
          <div className="extra-small text-muted mb-4 text-start px-2">
            Cash received by{" "}
            <span className="fw-bold text-dark">dhumal dipak</span>
          </div>
          <div className="d-flex align-items-center justify-content-between pt-4 border-top px-2">
            <div className="text-start">
              <div
                className="extra-small text-muted fw-bold text-uppercase"
                style={{ letterSpacing: "0.5px" }}
              >
                Remaining
              </div>
              <div className="h5 mb-0 fw-bold">
                ₹{Math.max(0, leftToPay - cashAmount).toFixed(2)}
              </div>
            </div>
            <Button
              variant="dark"
              pill
              className="px-5 py-2 fw-bold"
              style={{ height: "48px", minWidth: "140px" }}
              disabled={cashAmount < 0.01}
              onClick={() => {
                updatePayments((prev) => [
                  ...prev,
                  { type: "Cash", amount: cashAmount },
                ]);
                setNumpad((s) => ({ ...s, cash: "0" }));
                closeModal();
              }}
            >
              Add payment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        show={scene.modal === "giftCard"}
        onClose={closeModal}
        title="Redeem gift card"
        size="md"
      >
        <div className="gift-card-modal-content p-4">
          <div className="mb-4">
            <label className="form-label small fw-bold">Find gift card</label>
            <Input
              placeholder="Enter gift card code"
              className="py-2 mb-0"
              containerClass="mb-0"
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-dark"
              fullWidth
              pill
              className="py-2 fw-bold"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              variant="dark"
              fullWidth
              pill
              className="py-2 fw-bold"
              onClick={closeModal}
            >
              Find
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        show={scene.modal === "splitSelection"}
        onClose={closeModal}
        title="Select payment"
        size="md"
      >
        <div className="split-selection-modal-content p-4">
          <div className="d-flex justify-content-between gap-3 mb-5">
            {[
              {
                icon: <CashCoin size={24} className="text-success mb-2" />,
                label: "Cash",
              },
              {
                icon: <Tag size={24} className="text-success mb-2" />,
                label: "Gift card",
              },
              {
                icon: <div className="text-primary mb-2">ⓢ</div>,
                label: "Other",
              },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex-grow-1 border rounded-3 p-4 text-center cursor-pointer hover-bg-light"
                style={{ minWidth: "120px" }}
                onClick={closeModal}
              >
                {icon}
                <div className="fw-bold small">{label}</div>
              </div>
            ))}
          </div>
          <div className="text-end">
            <Button
              variant="outline-dark"
              pill
              className="px-4 py-2 fw-bold"
              onClick={closeModal}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
