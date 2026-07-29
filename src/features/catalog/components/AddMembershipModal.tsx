// src/features/catalog/components/AddMembershipModal.tsx
//
// "Add Membership" modal matching the Value/Percentage pricing-type design:
// both columns are shown side by side at all times (divided by "OR"), the
// selected type's radio card is highlighted, and its column is the one that
// actually gets validated/saved. Plain membership-plan creation only (name,
// description, price, expiry, online visibility) — client selection /
// payment collection stay on the existing "Sell Membership" flows.
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown, InfoCircleFill, PhoneFill, Globe2, X,
  AwardFill, Percent,
} from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { createMembershipThunk, updateMembershipThunk } from "../../../middleware/membership/membership.thunk";
import { selectMembershipsSubmitting, selectMembershipsError } from "../../../store/selectors/membership.selectors";
import { clearMembershipError } from "../../../store/membershipSlice";
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

type PricingType = "value" | "percentage";

interface ColumnState {
  name: string;
  description: string;
  offerPrice: string;
  actualPrice: string;   // value column only
  discount: string;      // percentage column only
  validity: string;
  showMobileApp: boolean;
  showBookingPage: boolean;
}

const emptyColumn = (): ColumnState => ({
  name: "", description: "", offerPrice: "", actualPrice: "", discount: "",
  validity: "1 year", showMobileApp: true, showBookingPage: true,
});

interface Props {
  editId?: string;
  onCancel: () => void;
  onSaved: (result: { membershipId: string; name: string }) => void;
}

const AddMembershipModal: React.FC<Props> = ({ editId, onCancel, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);

  const submitting = useSelector(selectMembershipsSubmitting);
  const apiError   = useSelector(selectMembershipsError);

  useEffect(() => () => { dispatch(clearMembershipError()); }, [dispatch]);

  const [pricingType, setPricingType] = useState<PricingType>("value");
  const [value,       setValue]       = useState<ColumnState>(emptyColumn());
  const [percentage,  setPercentage]  = useState<ColumnState>(emptyColumn());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const active = pricingType === "value" ? value : percentage;

  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/memberships/${editId}`).then(res => {
      const d = res.data?.data ?? res.data;
      if (!d) return;
      let actualPrice = "";
      let description = d.description ?? "";
      try {
        const meta = JSON.parse(d.description ?? "{}");
        if (meta.description !== undefined) description = meta.description;
        if (meta.actualPrice) actualPrice = String(meta.actualPrice);
      } catch { /* plain text description */ }
      const type: PricingType = d.pricingType === "percentage" ? "percentage" : "value";
      const discount = d.discountPercent ? String(d.discountPercent) : "";
      setPricingType(type);
      const col: ColumnState = {
        name: d.name ?? "",
        description,
        offerPrice: String(d.price ?? ""),
        actualPrice,
        discount,
        validity: d.validFor ?? "1 year",
        showMobileApp: d.enableOnlineSales ?? true,
        showBookingPage: d.enableOnlineRedemption ?? true,
      };
      if (type === "value") setValue(col); else setPercentage(col);
    }).catch(() => {});
  }, [editId]);

  const offerPriceNum  = parseFloat(active.offerPrice)  || 0;
  const actualPriceNum = parseFloat(active.actualPrice) || 0;
  const discountNum    = parseFloat(active.discount)    || 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!active.name.trim()) e.name = "Membership name is required";
    if (!offerPriceNum || offerPriceNum <= 0) e.offerPrice = "Special offer price must be greater than 0";
    if (pricingType === "value" && (!actualPriceNum || actualPriceNum <= 0)) e.actualPrice = "Actual price must be greater than 0";
    if (pricingType === "percentage" && (!discountNum || discountNum <= 0 || discountNum > 100)) e.discount = "Enter a valid discount %";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const metaDescription = JSON.stringify({
      description: active.description,
      ...(pricingType === "value" ? { actualPrice: actualPriceNum } : {}),
    });

    const payload = {
      name: active.name.trim(),
      description: metaDescription,
      includedServices: [],
      sessionType: "unlimited",
      validFor: active.validity,
      price: offerPriceNum,
      taxRate: undefined,
      colour: DEFAULT_COLOUR,
      pricingType,
      discountPercent: pricingType === "percentage" ? discountNum : undefined,
      enableOnlineSales: active.showMobileApp,
      enableOnlineRedemption: active.showBookingPage,
      termsAndConditions: undefined,
      appliesToProducts: false,
    };

    const result = editId
      ? await dispatch(updateMembershipThunk({ id: editId, data: payload }))
      : await dispatch(createMembershipThunk(payload));

    if (createMembershipThunk.fulfilled.match(result) || updateMembershipThunk.fulfilled.match(result)) {
      const saved = (result as any).payload;
      onSaved({ membershipId: String(saved?.id ?? editId ?? ""), name: active.name.trim() });
    }
  };

  const renderColumn = (type: PricingType, state: ColumnState, setState: React.Dispatch<React.SetStateAction<ColumnState>>) => {
    const isActive = pricingType === type;
    const patch = (p: Partial<ColumnState>) => setState((prev) => ({ ...prev, ...p }));
    return (
      <div className={`amm__col amm__col--${type}${isActive ? " amm__col--on" : ""}`}>
        <button
          type="button"
          className={`amm__type-card${isActive ? " amm__type-card--on" : ""}`}
          onClick={() => setPricingType(type)}
        >
          <span className="amm__type-icon">
            {type === "value" ? <CurrencyIcon size={16} /> : <Percent size={15} />}
          </span>
          <span className="amm__type-copy">
            <span className="amm__type-title">{type === "value" ? "Value" : "Percentage"}</span>
            <span className="amm__type-sub">{type === "value" ? "Set membership with actual price" : "Set membership with discount"}</span>
          </span>
          <span className="amm__radio" />
        </button>

        <div className="amm__field">
          <label className="amm__label">Membership Name <span className="amm__req">*</span></label>
          <input
            className={`amm__input${isActive && errors.name ? " amm__input--err" : ""}`}
            placeholder="Enter membership name"
            value={state.name}
            disabled={!isActive}
            onChange={(e) => patch({ name: e.target.value })}
          />
          {isActive && errors.name && <p className="amm__err">{errors.name}</p>}
        </div>

        <div className="amm__field">
          <label className="amm__label">Membership Description</label>
          <div className="amm__textarea-wrap">
            <textarea
              className="amm__textarea"
              placeholder="Enter membership description"
              maxLength={DESC_MAX}
              value={state.description}
              disabled={!isActive}
              onChange={(e) => patch({ description: e.target.value })}
            />
            <span className="amm__char-count">{state.description.length}/{DESC_MAX}</span>
          </div>
        </div>

        <div className="amm__grid2">
          <div className="amm__field">
            <label className="amm__label">Special Offer Price <span className="amm__req">*</span></label>
            <div className="amm__pfx-wrap">
              <span className="amm__pfx">{currencySymbol}</span>
              <input
                type="number" min={0} step={1}
                className={`amm__input amm__input--pfx${isActive && errors.offerPrice ? " amm__input--err" : ""}`}
                placeholder="0"
                value={state.offerPrice}
                disabled={!isActive}
                onChange={(e) => patch({ offerPrice: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            {isActive && errors.offerPrice && <p className="amm__err">{errors.offerPrice}</p>}
          </div>

          {type === "value" ? (
            <div className="amm__field">
              <label className="amm__label">Actual Price <span className="amm__req">*</span></label>
              <div className="amm__pfx-wrap">
                <span className="amm__pfx">{currencySymbol}</span>
                <input
                  type="number" min={0} step={1}
                  className={`amm__input amm__input--pfx${isActive && errors.actualPrice ? " amm__input--err" : ""}`}
                  placeholder="0"
                  value={state.actualPrice}
                  disabled={!isActive}
                  onChange={(e) => patch({ actualPrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              {isActive && errors.actualPrice && <p className="amm__err">{errors.actualPrice}</p>}
            </div>
          ) : (
            <div className="amm__field">
              <label className="amm__label">Discount % <span className="amm__req">*</span></label>
              <input
                type="number" min={0} max={100} step={1}
                className={`amm__input${isActive && errors.discount ? " amm__input--err" : ""}`}
                placeholder="Enter discount %"
                value={state.discount}
                disabled={!isActive}
                onChange={(e) => patch({ discount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
              />
              {isActive && errors.discount && <p className="amm__err">{errors.discount}</p>}
            </div>
          )}
        </div>

        <div className="amm__field">
          <label className="amm__label">Expire <span className="amm__req">*</span></label>
          <div className="amm__sel-wrap">
            <select className="amm__select" value={state.validity} disabled={!isActive} onChange={(e) => patch({ validity: e.target.value })}>
              {VALIDITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="amm__sel-icon" />
          </div>
        </div>

        <div className="amm__section-label amm__section-label--mt">Where To Show This Package</div>

        <div className="amm__toggle-row">
          <span className="amm__toggle-icon"><PhoneFill size={13} /></span>
          <span className="amm__toggle-text">
            <span className="amm__toggle-title">Customize Mobile App</span>
            <span className="amm__toggle-sub">iOS &amp; Android</span>
          </span>
          <label className="amm__switch">
            <input type="checkbox" checked={state.showMobileApp} disabled={!isActive} onChange={() => patch({ showMobileApp: !state.showMobileApp })} />
            <span className="amm__switch-track" />
          </label>
        </div>

        <div className="amm__toggle-row">
          <span className="amm__toggle-icon"><Globe2 size={13} /></span>
          <span className="amm__toggle-text">
            <span className="amm__toggle-title">Booking Page</span>
            <span className="amm__toggle-sub">Visible on your online booking page</span>
          </span>
          <label className="amm__switch">
            <input type="checkbox" checked={state.showBookingPage} disabled={!isActive} onChange={() => patch({ showBookingPage: !state.showBookingPage })} />
            <span className="amm__switch-track" />
          </label>
        </div>
      </div>
    );
  };

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

          <div className="amm__columns">
            {renderColumn("value", value, setValue)}
            <div className="amm__or-wrap"><span className="amm__or">OR</span></div>
            {renderColumn("percentage", percentage, setPercentage)}
          </div>

          <div className="amm__info-banner">
            <InfoCircleFill size={15} className="amm__info-icon" />
            <p>
              Choose "Value" if you want to set a flat price for the membership.<br />
              Choose "Percentage" if you want to offer a discount on the actual price.
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
