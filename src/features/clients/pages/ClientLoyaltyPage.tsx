import { useState } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/ClientLoyaltyPage.scss";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  accountType: string;
  firstName: string;
  lastName: string;
  address: string;
  vat: string;
}

interface FormErrors {
  cardName?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
}

// ─── Screen 1 – Loyalty Landing ───────────────────────────────────────────────
function LoyaltyLanding({ onStartNow }: { onStartNow: () => void }) {
  return (
    <div className="loyalty-landing">
      <div className="landing-content">
        {/* Left */}
        <div className="landing-left">
          <div className="addon-badge mb-3">
            <span className="diamond-icon">💎</span>
            <span>Client Loyalty add-on</span>
          </div>

          <h1 className="landing-title">Turn all clients into regulars</h1>

          <p className="landing-desc">
            Watch your sales skyrocket with a custom loyalty program –
            encouraging repeat visits and larger purchases.
          </p>

          <ul className="feature-list">
            <li>
              Offer the ultimate loyalty experience with points, tiers and
              referrals
            </li>
            <li>
              Reward your clients with exclusive offers, discounts and
              incentives to celebrate their loyalty
            </li>
            <li>
              Allow clients to easily track their progress and redeem rewards
              online
            </li>
          </ul>

          <div className="pricing-block mt-4 mb-4">
            <span className="save-badge">Save 20%</span>
            <div className="price-row mt-2">
              <span className="price-old">₹5,000.00</span>
              <span className="price-current">
                ₹4,000.00 per location, per month
              </span>
            </div>
            <p className="trial-text mt-1">Try it FREE for 7 days!</p>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-landing-start rounded-pill"
              onClick={onStartNow}
            >
              Start now
            </button>
            <button className="btn btn-link learn-link p-0">Learn more</button>
          </div>
        </div>

        {/* Right – Animated Diamond */}
        <div className="landing-right">
          <div className="diamond-wrap">
            <svg viewBox="0 0 220 240" width="220" height="240">
              <defs>
                <linearGradient
                  id="hexGrad1"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f9a8d4" />
                  <stop offset="50%" stopColor="#e879a0" />
                  <stop offset="100%" stopColor="#c026d3" />
                </linearGradient>
                <linearGradient
                  id="hexGrad2"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <polygon
                points="110,10 200,60 200,160 110,210 20,160 20,60"
                fill="url(#hexGrad1)"
                opacity="0.9"
              />
              <polygon
                points="110,35 180,75 180,150 110,190 40,150 40,75"
                fill="url(#hexGrad2)"
                opacity="0.55"
              />
              <polygon
                points="110,60 150,100 110,160 70,100"
                fill="white"
                opacity="0.92"
              />
              <polygon
                points="110,60 150,100 110,90"
                fill="white"
                opacity="0.45"
              />
              <polygon
                points="70,100 110,90 110,160"
                fill="#e0e0e0"
                opacity="0.65"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2 – Enable Form ───────────────────────────────────────────────────
function EnableForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormData>({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    accountType: "Individual / Self-employed",
    firstName: "",
    lastName: "",
    address: "",
    vat: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [toasts, setToasts] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof FormData, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => {
      const n = { ...p };
      delete n[key as keyof FormErrors];
      return n;
    });
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.cardName.trim()) e.cardName = "This field is required";
    if (!form.cardNumber.trim()) e.cardNumber = "This field is required";
    if (!form.expiry.trim()) e.expiry = "This field is required";
    if (!form.cvv.trim()) e.cvv = "This field is required";
    if (!form.firstName.trim()) e.firstName = "This field is required";
    if (!form.lastName.trim()) e.lastName = "This field is required";
    if (!form.address.trim()) e.address = "This address is required";
    setErrors(e);
    if (Object.keys(e).length) {
      setToasts([
        "Please correct all form errors",
        "Please correct all form errors",
        "Please correct all form errors",
      ]);
      setTimeout(() => setToasts([]), 3500);
      return false;
    }
    return true;
  };

  const handleEnable = () => {
    if (validate()) setSubmitted(true);
  };

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="enable-page d-flex flex-column align-items-center justify-content-center">
        <div className="success-circle mb-4">
          <svg viewBox="0 0 60 60" width="72">
            <circle
              cx="30"
              cy="30"
              r="29"
              fill="#dcfce7"
              stroke="#86efac"
              strokeWidth="2"
            />
            <path
              d="M18 30l9 9 15-18"
              stroke="#16a34a"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <h2 className="fw-bold mb-2">Client Loyalty Enabled!</h2>
        <p className="text-muted mb-4">
          Your 7-day free trial has started. Enjoy!
        </p>
        <button className="btn btn-dark rounded-pill px-4" onClick={onClose}>
          Back to Loyalty
        </button>
      </div>
    );
  }

  return (
    <div className="enable-page">
      {/* ── Toast Stack ── */}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t, i) => (
            <div key={i} className="form-toast">
              <span>{t}</span>
              <button
                onClick={() => setToasts((p) => p.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="enable-topbar d-flex justify-content-between align-items-center px-4 py-3">
        <h5 className="enable-topbar__title mb-0">
          Enable Client Loyalty add-on
        </h5>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary btn-sm rounded-pill"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-dark btn-sm rounded-pill"
            onClick={handleEnable}
          >
            Enable
          </button>
        </div>
      </div>

      {/* ── Form Body ── */}
      <div className="enable-body container">
        <div className="row g-4 justify-content-center">
          {/* Left column */}
          <div className="col-lg-6">
            {/* Card details */}
            <div className="form-card mb-4">
              <div className="mb-3">
                <label className="form-label">Card holder full name</label>
                <input
                  type="text"
                  className={`form-control ${errors.cardName ? "is-invalid" : ""}`}
                  placeholder="Add card holder full name"
                  value={form.cardName}
                  onChange={(e) => set("cardName", e.target.value)}
                />
                {errors.cardName && (
                  <div className="invalid-feedback">{errors.cardName}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Card number</label>
                <div
                  className={`card-input-wrap ${errors.cardNumber ? "card-input-wrap--error" : ""}`}
                >
                  <input
                    type="text"
                    className="form-control border-0 shadow-none"
                    placeholder="Credit or debit card number"
                    value={form.cardNumber}
                    onChange={(e) => set("cardNumber", e.target.value)}
                    maxLength={19}
                  />
                  <div className="card-badges">
                    <span className="visa-badge">VISA</span>
                    <span className="mc-badge" />
                  </div>
                </div>
                {errors.cardNumber && (
                  <p className="field-err">{errors.cardNumber}</p>
                )}
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label">Expiry date</label>
                  <input
                    type="text"
                    className={`form-control ${errors.expiry ? "is-invalid" : ""}`}
                    placeholder="MM/YY"
                    value={form.expiry}
                    onChange={(e) => set("expiry", e.target.value)}
                    maxLength={5}
                  />
                  {errors.expiry && (
                    <div className="invalid-feedback">{errors.expiry}</div>
                  )}
                </div>
                <div className="col-6">
                  <label className="form-label">CVV</label>
                  <input
                    type="text"
                    className={`form-control ${errors.cvv ? "is-invalid" : ""}`}
                    placeholder="3 digits"
                    value={form.cvv}
                    onChange={(e) => set("cvv", e.target.value)}
                    maxLength={3}
                  />
                  {errors.cvv && (
                    <div className="invalid-feedback">{errors.cvv}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Billing details */}
            <div className="form-card">
              <h6 className="billing-title">Billing details</h6>
              <p className="billing-sub mb-3">
                Provide the details that you would like to appear on your
                invoice
              </p>

              <div className="mb-3">
                <label className="form-label">Account Type</label>
                <select
                  className="form-select"
                  value={form.accountType}
                  onChange={(e) => set("accountType", e.target.value)}
                >
                  <option>Individual / Self-employed</option>
                  <option>Business</option>
                  <option>Partnership</option>
                </select>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                    placeholder="Enter your first name"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                  {errors.firstName && (
                    <div className="invalid-feedback">{errors.firstName}</div>
                  )}
                </div>
                <div className="col-6">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
                    placeholder="Enter your last name"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                  {errors.lastName && (
                    <div className="invalid-feedback">{errors.lastName}</div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Address</label>
                <div
                  className={`address-wrap ${errors.address ? "address-wrap--error" : ""}`}
                >
                  <span className="address-pin">📍</span>
                  <input
                    type="text"
                    className="form-control border-0 shadow-none"
                    placeholder="Search address"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </div>
                {errors.address && (
                  <p className="field-err">{errors.address}</p>
                )}
              </div>

              <div className="mb-2">
                <label className="form-label d-flex justify-content-between">
                  <span>
                    VAT number{" "}
                    <span className="text-muted fw-normal">(Optional)</span>
                  </span>
                  <span className="text-muted">{form.vat.length}/18</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={form.vat}
                  onChange={(e) => set("vat", e.target.value.slice(0, 18))}
                />
              </div>
            </div>
          </div>

          {/* Right column – Order Summary */}
          <div className="col-lg-4">
            <div className="order-summary">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="summary-gem">💎</div>
                <div>
                  <div className="summary-name">Client Loyalty</div>
                  <div className="summary-tagline">
                    Turn all clients into regulars
                  </div>
                </div>
              </div>

              <div className="trial-banner mb-3">
                7 days free trial, ending 14 Mar 2026
              </div>

              <div className="summary-row">
                <div>
                  <p className="summary-loc">1 x location</p>
                  <p className="summary-loc-price">
                    <span className="striked">₹5,000.00</span> ₹4,000.00 per
                    location, monthly
                  </p>
                </div>
                <div className="text-end">
                  <p className="summary-amount">₹4,000.00</p>
                  <p className="striked small">₹5,000.00</p>
                </div>
              </div>

              <hr className="summary-hr" />

              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="total-label">Total monthly</span>
                <span className="total-value">₹4,000.00</span>
              </div>

              <p className="summary-note">
                Your first month will be billed pro-rata.
              </p>
              <p className="summary-note">
                Price calculated monthly based on number of locations in your
                workspace on the billing date, starting from 15 Mar 2026. Your
                plan will automatically renew until canceled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ClientLoyaltyPage() {
  const [screen, setScreen] = useState<"landing" | "form">("landing");

  return (
    <div className="client-loyalty-page">
      {screen === "landing" && (
        <LoyaltyLanding onStartNow={() => setScreen("form")} />
      )}
      {screen === "form" && <EnableForm onClose={() => setScreen("landing")} />}
    </div>
  );
}
