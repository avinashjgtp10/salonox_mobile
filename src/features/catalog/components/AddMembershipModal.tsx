// src/features/catalog/components/AddMembershipModal.tsx
//
// "Add Membership" modal — one of three plan types, selected via the cards at
// the top; the field list below switches to match. Plain membership-plan
// creation only (name, description, price, expiry) — client selection /
// payment collection stay on the existing "Sell Membership" flows.
//
//   Wallet (value)      — pay a fee, credit a spendable wallet balance
//                          (fee + optional bonus credit).
//   Discount Balance     — pay a fee, get N% off every service; the discount
//   (percentage)           GIVEN depletes an independently-configurable pool.
//   Loyalty              — free/automatic; unlocks N% off once a client
//                          crosses a visit-count threshold.
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown, InfoCircleFill, X,
  AwardFill, Percent, Award,
} from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { createMembershipThunk, updateMembershipThunk } from "../../../middleware/membership/membership.thunk";
import { selectMembershipsSubmitting, selectMembershipsError } from "../../../store/selectors/membership.selectors";
import { clearMembershipError } from "../../../store/membershipSlice";
import type { MembershipPricingType, MembershipAppliesTo } from "../../../services/api/endpoints/memberships.endpoints";
import api from "../../../services/api/axios";
import "../styles/AddMembershipModal.scss";

const DEFAULT_COLOUR = "#1a1a2e";
const DESC_MAX = 250;

const VALIDITY_OPTIONS = [
  { label: "1 Month",   value: "1 month"  },
  { label: "3 Months",  value: "3 months" },
  { label: "6 Months",  value: "6 months" },
  { label: "12 Months", value: "1 year"   },
  { label: "Lifetime",  value: "lifetime" },
];

const APPLIES_TO_OPTIONS: { label: string; value: MembershipAppliesTo }[] = [
  { label: "Services only", value: "services" },
  { label: "Products only", value: "products" },
  { label: "Both",          value: "both"     },
];

interface FormState {
  name: string;
  description: string;
  price: string;             // value: price paid; percentage: membership fee
  bonusCredit: string;       // value only — extra wallet credit on top of price
  discount: string;          // percentage + loyalty
  discountBalance: string;   // percentage only
  loyaltyThresholdValue: string;
  validity: string;          // value + percentage only — loyalty has no expiry
  appliesTo: MembershipAppliesTo;
}

const emptyForm = (): FormState => ({
  name: "", description: "", price: "", bonusCredit: "", discount: "",
  discountBalance: "", loyaltyThresholdValue: "",
  validity: "1 year", appliesTo: "services",
});

interface Props {
  editId?: string;
  onCancel: () => void;
  onSaved: (result: { membershipId: string; name: string }) => void;
}

const AddMembershipModal: React.FC<Props> = ({ editId, onCancel, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, currencyCode, formatAmount } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);

  const submitting = useSelector(selectMembershipsSubmitting);
  const apiError   = useSelector(selectMembershipsError);

  useEffect(() => () => { dispatch(clearMembershipError()); }, [dispatch]);

  const [pricingType, setPricingType] = useState<MembershipPricingType>("value");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/memberships/${editId}`).then(res => {
      const d = res.data?.data ?? res.data;
      if (!d) return;
      let bonusCredit = "";
      let description = d.description ?? "";
      try {
        const meta = JSON.parse(d.description ?? "{}");
        if (meta.description !== undefined) description = meta.description;
        if (meta.bonusCredit) bonusCredit = String(meta.bonusCredit);
      } catch { /* plain text description */ }
      const type: MembershipPricingType =
        d.pricingType === "percentage" ? "percentage" : d.pricingType === "loyalty" ? "loyalty" : "value";
      setPricingType(type);
      setForm({
        name: d.name ?? "",
        description,
        price: String(d.price ?? ""),
        bonusCredit,
        discount: d.discountPercent ? String(d.discountPercent) : "",
        discountBalance: d.discountBalance ? String(d.discountBalance) : "",
        loyaltyThresholdValue: d.loyaltyThresholdValue ? String(d.loyaltyThresholdValue) : "",
        validity: d.validFor ?? "1 year",
        appliesTo: d.appliesTo ?? "services",
      });
    }).catch(() => {});
  }, [editId]);

  const priceNum           = parseFloat(form.price)                 || 0;
  const bonusCreditNum     = parseFloat(form.bonusCredit)            || 0;
  const discountNum        = parseFloat(form.discount)               || 0;
  const discountBalanceNum = parseFloat(form.discountBalance)        || 0;
  const thresholdValueNum  = parseInt(form.loyaltyThresholdValue, 10) || 0;
  const walletValue        = priceNum + bonusCreditNum;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Membership name is required";

    if (pricingType === "value") {
      if (!priceNum || priceNum <= 0) e.price = "Price must be greater than 0";
    }
    if (pricingType === "percentage") {
      if (!priceNum || priceNum <= 0) e.price = "Membership fee must be greater than 0";
      if (!discountNum || discountNum <= 0 || discountNum > 100) e.discount = "Enter a valid discount %";
      if (!discountBalanceNum || discountBalanceNum <= 0) e.discountBalance = "Discount balance must be greater than 0";
    }
    if (pricingType === "loyalty") {
      if (!discountNum || discountNum <= 0 || discountNum > 100) e.discount = "Enter a valid discount %";
      if (!thresholdValueNum || thresholdValueNum <= 0) e.loyaltyThresholdValue = "Enter a valid threshold";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const metaDescription = JSON.stringify({
      description: form.description,
      ...(pricingType === "value" ? { bonusCredit: bonusCreditNum } : {}),
    });

    const payload = {
      name: form.name.trim(),
      description: metaDescription,
      includedServices: [],
      sessionType: "unlimited",
      // Loyalty has no expiry concept (free, evergreen) — "lifetime" satisfies
      // the backend's required validFor without exposing an Expire field.
      validFor: pricingType === "loyalty" ? "lifetime" : form.validity,
      price: pricingType === "loyalty" ? 0 : priceNum,
      taxRate: undefined,
      colour: DEFAULT_COLOUR,
      pricingType,
      discountPercent: pricingType !== "value" ? discountNum : undefined,
      discountBalance: pricingType === "percentage" ? discountBalanceNum : undefined,
      loyaltyThresholdValue: pricingType === "loyalty" ? thresholdValueNum : undefined,
      enableOnlineSales: true,
      enableOnlineRedemption: true,
      termsAndConditions: undefined,
      appliesTo: form.appliesTo,
    };

    const result = editId
      ? await dispatch(updateMembershipThunk({ id: editId, data: payload }))
      : await dispatch(createMembershipThunk(payload));

    if (createMembershipThunk.fulfilled.match(result) || updateMembershipThunk.fulfilled.match(result)) {
      const saved = (result as any).payload;
      onSaved({ membershipId: String(saved?.id ?? editId ?? ""), name: form.name.trim() });
    }
  };

  const typeCard = (type: MembershipPricingType, title: string, sub: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`amm__type-card${pricingType === type ? " amm__type-card--on" : ""}`}
      onClick={() => setPricingType(type)}
    >
      <span className="amm__type-icon">{icon}</span>
      <span className="amm__type-copy">
        <span className="amm__type-title">{title}</span>
        <span className="amm__type-sub">{sub}</span>
      </span>
      <span className="amm__radio" />
    </button>
  );

  return (
    <div className="amm-overlay" onClick={onCancel}>
      <div className="amm" onClick={(e) => e.stopPropagation()}>

        <div className="amm__header">
          <button className="amm__close" onClick={onCancel} aria-label="Close" type="button">
            <X size={18} />
          </button>
          <span className="amm__title-wrap">
            <span className="amm__title-icon"><AwardFill size={15} /></span>
            <h2 className="amm__title">{editId ? "Edit Membership" : "Add Membership"}</h2>
          </span>
        </div>

        <div className="amm__body">
          {apiError && <div className="amm__error-banner">{apiError}</div>}

          <div className="amm__section-label">Membership Type</div>

          <div className="amm__type-row">
            {typeCard("value", "Wallet", "Pay a fee, credit a spendable wallet", <CurrencyIcon size={16} />)}
            {typeCard("percentage", "Discount Balance", "% off every service from a discount pool", <Percent size={15} />)}
            {typeCard("loyalty", "Loyalty", "Free — unlocks a discount after N visits", <Award size={15} />)}
          </div>

          <div className="amm__form">

            <div className="amm__field">
              <label className="amm__label">Membership Name <span className="amm__req">*</span></label>
              <input
                className={`amm__input${errors.name ? " amm__input--err" : ""}`}
                placeholder="Enter membership name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
              {errors.name && <p className="amm__err">{errors.name}</p>}
            </div>

            <div className="amm__field">
              <label className="amm__label">Membership Description</label>
              <div className="amm__textarea-wrap">
                <textarea
                  className="amm__textarea"
                  placeholder="Enter membership description"
                  maxLength={DESC_MAX}
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
                <span className="amm__char-count">{form.description.length}/{DESC_MAX}</span>
              </div>
            </div>

            {pricingType === "value" && (
              <>
                <div className="amm__grid2">
                  <div className="amm__field">
                    <label className="amm__label">Price <span className="amm__req">*</span></label>
                    <div className="amm__pfx-wrap">
                      <span className="amm__pfx">{currencySymbol}</span>
                      <input
                        type="number" min={0} step={1}
                        className={`amm__input amm__input--pfx${errors.price ? " amm__input--err" : ""}`}
                        placeholder="0"
                        value={form.price}
                        onChange={(e) => patch({ price: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    {errors.price && <p className="amm__err">{errors.price}</p>}
                  </div>

                  <div className="amm__field">
                    <label className="amm__label">Bonus Credit</label>
                    <div className="amm__pfx-wrap">
                      <span className="amm__pfx">{currencySymbol}</span>
                      <input
                        type="number" min={0} step={1}
                        className="amm__input amm__input--pfx"
                        placeholder="0"
                        value={form.bonusCredit}
                        onChange={(e) => patch({ bonusCredit: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                  </div>
                </div>

                <div className="amm__wallet-preview">
                  <span>Total Wallet Value</span>
                  <strong>{formatAmount(walletValue)}</strong>
                </div>
              </>
            )}

            {pricingType === "percentage" && (
              <>
                <div className="amm__grid2">
                  <div className="amm__field">
                    <label className="amm__label">Membership Fee <span className="amm__req">*</span></label>
                    <div className="amm__pfx-wrap">
                      <span className="amm__pfx">{currencySymbol}</span>
                      <input
                        type="number" min={0} step={1}
                        className={`amm__input amm__input--pfx${errors.price ? " amm__input--err" : ""}`}
                        placeholder="0"
                        value={form.price}
                        onChange={(e) => patch({ price: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    {errors.price && <p className="amm__err">{errors.price}</p>}
                  </div>

                  <div className="amm__field">
                    <label className="amm__label">Discount % <span className="amm__req">*</span></label>
                    <input
                      type="number" min={0} max={100} step={1}
                      className={`amm__input${errors.discount ? " amm__input--err" : ""}`}
                      placeholder="Enter discount %"
                      value={form.discount}
                      onChange={(e) => patch({ discount: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    {errors.discount && <p className="amm__err">{errors.discount}</p>}
                  </div>
                </div>

                <div className="amm__field">
                  <label className="amm__label">Discount Balance <span className="amm__req">*</span></label>
                  <div className="amm__pfx-wrap">
                    <span className="amm__pfx">{currencySymbol}</span>
                    <input
                      type="number" min={0} step={1}
                      className={`amm__input amm__input--pfx${errors.discountBalance ? " amm__input--err" : ""}`}
                      placeholder="0"
                      value={form.discountBalance}
                      onChange={(e) => patch({ discountBalance: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  {errors.discountBalance && <p className="amm__err">{errors.discountBalance}</p>}
                  <p className="amm__hint">Total discount this plan may give out before it runs out — doesn't have to match the fee.</p>
                </div>
              </>
            )}

            {pricingType === "loyalty" && (
              <div className="amm__grid2">
                <div className="amm__field">
                  <label className="amm__label">Discount % <span className="amm__req">*</span></label>
                  <input
                    type="number" min={0} max={100} step={1}
                    className={`amm__input${errors.discount ? " amm__input--err" : ""}`}
                    placeholder="Enter discount %"
                    value={form.discount}
                    onChange={(e) => patch({ discount: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {errors.discount && <p className="amm__err">{errors.discount}</p>}
                </div>

                <div className="amm__field">
                  <label className="amm__label">Visit Threshold <span className="amm__req">*</span></label>
                  <input
                    type="number" min={1} step={1}
                    className={`amm__input${errors.loyaltyThresholdValue ? " amm__input--err" : ""}`}
                    placeholder="e.g. 10"
                    value={form.loyaltyThresholdValue}
                    onChange={(e) => patch({ loyaltyThresholdValue: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {errors.loyaltyThresholdValue && <p className="amm__err">{errors.loyaltyThresholdValue}</p>}
                </div>

                <p className="amm__hint" style={{ gridColumn: "1 / -1" }}>
                  Every client is automatically eligible — no purchase or enrollment. Once they reach this many
                  visits, the discount applies at checkout whenever staff opts them in.
                </p>
              </div>
            )}

            <div className="amm__field">
              <label className="amm__label">Applies To</label>
              <div className="amm__sel-wrap">
                <select
                  className="amm__select"
                  value={form.appliesTo}
                  onChange={(e) => patch({ appliesTo: e.target.value as MembershipAppliesTo })}
                >
                  {APPLIES_TO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={13} className="amm__sel-icon" />
              </div>
              <p className="amm__hint">
                {pricingType === "value"
                  ? "What the wallet balance can be spent on."
                  : "What the discount can be applied to."}
              </p>
            </div>

            {pricingType !== "loyalty" && (
              <div className="amm__field">
                <label className="amm__label">Expire <span className="amm__req">*</span></label>
                <div className="amm__sel-wrap">
                  <select className="amm__select" value={form.validity} onChange={(e) => patch({ validity: e.target.value })}>
                    {VALIDITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={13} className="amm__sel-icon" />
                </div>
              </div>
            )}

          </div>

          <div className="amm__info-banner">
            <InfoCircleFill size={15} className="amm__info-icon" />
            <p>
              {pricingType === "value" && "Client pays the price and the wallet (price + bonus credit) is credited to spend on services — deducted at face value until it runs out."}
              {pricingType === "percentage" && "Client pays the fee and gets the discount % off every service. The DISCOUNT AMOUNT GIVEN — not the service price — is deducted from the discount balance until it runs out."}
              {pricingType === "loyalty" && "Free for every client — once they cross the visit threshold, staff can apply the discount at checkout indefinitely. Never applied automatically."}
            </p>
          </div>
        </div>

        <div className="amm__footer">
          <button className="amm__btn amm__btn--outline" onClick={onCancel} type="button">Cancel</button>
          <button className="amm__btn amm__btn--dark" onClick={handleSave} disabled={submitting} type="button">
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddMembershipModal;
