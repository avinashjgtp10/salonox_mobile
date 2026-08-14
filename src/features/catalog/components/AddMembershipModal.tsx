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
  ChevronDown, X,
  AwardFill, Percent, Award,
  PlusLg, Trash3,
} from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { createMembershipThunk, updateMembershipThunk } from "../../../middleware/membership/membership.thunk";
import { selectMembershipsSubmitting, selectMembershipsError } from "../../../store/selectors/membership.selectors";
import { clearMembershipError } from "../../../store/membershipSlice";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { selectAllCategories } from "../../../store/selectors/slices.selectors";
import type { MembershipPricingType, MembershipAppliesTo, LoyaltyTier } from "../../../services/api/endpoints/memberships.endpoints";
import api from "../../../services/api/axios";
import Dropdown from "../../../components/ui/Dropdown";
import "../styles/AddMembershipModal.scss";

const DEFAULT_COLOUR = "#1a1a2e";
const DESC_MAX = 250;

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The plan's expiry is stored as a relative "valid for N days" duration (the
// backend applies it from whenever a client actually buys it, not from now) —
// picking a calendar date here is just a friendlier way to say "N days from
// today" than asking staff to do the day-count math themselves.
function daysFromToday(isoDate: string): number {
  if (!isoDate) return 0;
  const picked = new Date(`${isoDate}T00:00:00`);
  return Math.round((picked.getTime() - todayMidnight().getTime()) / 86400000);
}

// Reads an existing plan's stored validFor back into a calendar date for the
// picker — handles the new "N days" format plus the legacy fixed buckets
// older plans may still carry.
function parseValidForToDate(validFor: string | undefined | null): string {
  const daysMatch = /^(\d+)\s*days?$/i.exec((validFor ?? "").trim());
  if (daysMatch) return toIsoDate(addDays(todayMidnight(), parseInt(daysMatch[1], 10)));
  switch (validFor) {
    case "1 month":  return toIsoDate(addDays(todayMidnight(), 30));
    case "3 months": return toIsoDate(addDays(todayMidnight(), 90));
    case "6 months": return toIsoDate(addDays(todayMidnight(), 180));
    case "1 year":   return toIsoDate(addDays(todayMidnight(), 365));
    case "lifetime": return toIsoDate(addDays(todayMidnight(), 365 * 50));
    default:          return toIsoDate(addDays(todayMidnight(), 365));
  }
}

const APPLIES_TO_OPTIONS: { label: string; value: MembershipAppliesTo }[] = [
  { label: "Services only", value: "services" },
  { label: "Products only", value: "products" },
  { label: "Both",          value: "both"     },
];

/** One tier row as edited in the form — parsed to numbers on save. */
interface LoyaltyTierInput {
  threshold: string;
  discount: string;
}

const emptyTier = (): LoyaltyTierInput => ({ threshold: "", discount: "" });

interface FormState {
  name: string;
  description: string;
  price: string;             // value: price paid; percentage: membership fee
  bonusCredit: string;       // value only — extra wallet credit on top of price
  discount: string;          // percentage only — loyalty uses loyaltyTiers instead
  loyaltyTiers: LoyaltyTierInput[];
  /** ISO date (yyyy-mm-dd) picked via the Expire calendar — value + percentage
   *  only, loyalty has no expiry. Converted to a "N days from today" duration
   *  on save; see daysFromToday(). */
  expiryDate: string;
  appliesTo: MembershipAppliesTo;
  /** Optional narrowing of appliesTo to specific service_categories ids —
   *  empty means unrestricted (every category within appliesTo's scope). */
  categoryIds: string[];
}

const emptyForm = (): FormState => ({
  name: "", description: "", price: "", bonusCredit: "", discount: "",
  loyaltyTiers: [emptyTier()],
  expiryDate: toIsoDate(addDays(todayMidnight(), 365)),
  appliesTo: "services",
  categoryIds: [],
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
  const categories = useSelector(selectAllCategories) as { id: string | number; name: string }[];

  useEffect(() => () => { dispatch(clearMembershipError()); }, [dispatch]);
  useEffect(() => { dispatch(fetchCategoriesThunk()); }, [dispatch]);

  const [pricingType, setPricingType] = useState<MembershipPricingType>("value");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (p: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
    // Field names line up 1:1 with error keys (name/price/discount/expiryDate)
    // — clear a field's inline error as soon as it's edited, otherwise a
    // message set by validate() on Save just sits there forever even after
    // the user fixes the value, since nothing else ever touches `errors`.
    setErrors((prev) => {
      const keys = Object.keys(p).filter((k) => k in prev);
      if (keys.length === 0) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  };

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
      const loyaltyTiers: LoyaltyTierInput[] = (d.loyaltyTiers as LoyaltyTier[] | undefined)?.length
        ? d.loyaltyTiers.map((t: LoyaltyTier) => ({ threshold: String(t.thresholdValue), discount: String(t.discountPercent) }))
        : [emptyTier()];
      setForm({
        name: d.name ?? "",
        description,
        price: String(d.price ?? ""),
        bonusCredit,
        discount: type === "percentage" && d.discountPercent ? String(d.discountPercent) : "",
        loyaltyTiers,
        expiryDate: parseValidForToDate(d.validFor),
        appliesTo: d.appliesTo ?? "services",
        categoryIds: Array.isArray(d.categoryIds) ? d.categoryIds : [],
      });
    }).catch(() => {});
  }, [editId]);

  const priceNum           = parseFloat(form.price)                 || 0;
  const bonusCreditNum     = parseFloat(form.bonusCredit)            || 0;
  const discountNum        = parseFloat(form.discount)               || 0;
  const walletValue        = priceNum + bonusCreditNum;

  const addTier = () => patch({ loyaltyTiers: [...form.loyaltyTiers, emptyTier()] });
  const removeTier = (i: number) => patch({ loyaltyTiers: form.loyaltyTiers.filter((_, idx) => idx !== i) });
  const patchTier = (i: number, p: Partial<LoyaltyTierInput>) => {
    patch({ loyaltyTiers: form.loyaltyTiers.map((t, idx) => (idx === i ? { ...t, ...p } : t)) });
    // Tier errors are keyed as tier{i}Threshold/tier{i}Discount, not plain
    // field names, so patch()'s generic clearing above can't catch these —
    // clear them explicitly on the same edit that touches that tier's field.
    setErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      if ("threshold" in p && `tier${i}Threshold` in next) { delete next[`tier${i}Threshold`]; changed = true; }
      if ("discount" in p && `tier${i}Discount` in next) { delete next[`tier${i}Discount`]; changed = true; }
      return changed ? next : prev;
    });
  };

  const toggleCategory = (id: string) => patch({
    categoryIds: form.categoryIds.includes(id)
      ? form.categoryIds.filter((c) => c !== id)
      : [...form.categoryIds, id],
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Membership name is required";

    if (pricingType === "value") {
      if (!priceNum || priceNum <= 0) e.price = "Price must be greater than 0";
    }
    if (pricingType === "percentage") {
      if (!priceNum || priceNum <= 0) e.price = "Membership fee must be greater than 0";
      if (!discountNum || discountNum <= 0 || discountNum > 100) e.discount = "Enter a valid discount %";
    }
    if (pricingType === "loyalty") {
      let prevThreshold = 0;
      form.loyaltyTiers.forEach((tier, i) => {
        const threshold = parseInt(tier.threshold, 10) || 0;
        const percent = parseFloat(tier.discount) || 0;
        if (!threshold || threshold <= 0) e[`tier${i}Threshold`] = "Enter a valid threshold";
        else if (threshold <= prevThreshold) e[`tier${i}Threshold`] = "Must be greater than the previous tier";
        if (!percent || percent <= 0 || percent > 100) e[`tier${i}Discount`] = "Enter a valid discount %";
        prevThreshold = threshold || prevThreshold;
      });
    }
    if (pricingType !== "loyalty") {
      if (!form.expiryDate || daysFromToday(form.expiryDate) < 1) e.expiryDate = "Pick a future expiry date";
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
      // the backend's required validFor without exposing an Expire field. Other
      // types send the picked calendar date as a "N days" duration — the
      // backend applies it from whenever a client actually buys the plan.
      validFor: pricingType === "loyalty" ? "lifetime" : `${daysFromToday(form.expiryDate)} days`,
      price: pricingType === "loyalty" ? 0 : priceNum,
      taxRate: undefined,
      colour: DEFAULT_COLOUR,
      pricingType,
      discountPercent: pricingType === "percentage" ? discountNum : undefined,
      // The discount pool always equals the fee paid — not an independently
      // set number — so a ₹5,000 plan gives out ₹5,000 of discount (at 20%
      // off, whatever that adds up to) before it runs out.
      discountBalance: pricingType === "percentage" ? priceNum : undefined,
      loyaltyTiers: pricingType === "loyalty"
        ? form.loyaltyTiers.map((t) => ({
            thresholdValue: parseInt(t.threshold, 10) || 0,
            discountPercent: parseFloat(t.discount) || 0,
          }))
        : undefined,
      enableOnlineSales: true,
      enableOnlineRedemption: true,
      termsAndConditions: undefined,
      appliesTo: form.appliesTo,
      categoryIds: form.categoryIds.length ? form.categoryIds : undefined,
    };

    const result = editId
      ? await dispatch(updateMembershipThunk({ id: editId, data: payload }))
      : await dispatch(createMembershipThunk(payload));

    if (createMembershipThunk.fulfilled.match(result) || updateMembershipThunk.fulfilled.match(result)) {
      const saved = (result as any).payload;
      onSaved({ membershipId: String(saved?.id ?? editId ?? ""), name: form.name.trim() });
    }
  };

  // Pricing type is fixed once the membership exists. Each type funds a
  // different benefit (wallet balance vs discount % vs visit-unlocked tier),
  // and copies already sold snapshot the type they were bought under — so
  // switching it on the template can't retroactively convert those, it only
  // makes the plan disagree with its own sold memberships. Locked on edit
  // rather than merely warned about, since there's no correct outcome to
  // offer if someone proceeds.
  const typeLocked = !!editId;

  // Switching type while creating starts the form over. The three types don't
  // share a form — Wallet asks for price + bonus credit, Discount Balance for a
  // percentage, Loyalty for visit tiers and no price/expiry at all — so
  // carrying entries across meant fields that no longer applied kept values
  // that were still submitted (see the pricingType branches in the payload
  // builder), and stale validation errors pointed at inputs that were no
  // longer on screen. No-op when picking the type that's already selected, so
  // an accidental re-click can't wipe a half-filled form.
  const selectPricingType = (type: MembershipPricingType) => {
    if (typeLocked || type === pricingType) return;
    setPricingType(type);
    setForm(emptyForm());
    setErrors({});
    dispatch(clearMembershipError());
  };

  const typeCard = (type: MembershipPricingType, title: string, sub: string, icon: React.ReactNode) => {
    const selected = pricingType === type;
    const disabled = typeLocked && !selected;
    return (
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled ? "Membership type can't be changed after the plan is created" : undefined}
        className={`amm__type-card${selected ? ` amm__type-card--on amm__type-card--${type}` : ""}${disabled ? " amm__type-card--locked" : ""}`}
        onClick={() => selectPricingType(type)}
      >
        <span className="amm__type-icon">{icon}</span>
        <span className="amm__type-copy">
          <span className="amm__type-title">{title}</span>
          <span className="amm__type-sub">{sub}</span>
        </span>
        <span className="amm__radio" />
      </button>
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

          <div className="amm__card">
            <h4 className="amm__card-title">Membership Type</h4>
            <div className="amm__type-row">
              {typeCard("value", "Wallet", "Pay a fee, credit a spendable wallet", <CurrencyIcon size={16} />)}
              {typeCard("percentage", "Discount Balance", "Pay a fee, get % off every service", <Percent size={15} />)}
              {typeCard("loyalty", "Loyalty", "Free — unlocks a discount after N visits", <Award size={15} />)}
            </div>
            {typeLocked && (
              <p className="amm__type-locked-note">
                Membership type can't be changed after the plan is created. Create a new
                membership if you need a different type.
              </p>
            )}
          </div>

          <div className="amm__form">

            {/* 1 — Basic Information: name, expiry, applies to, categories */}
            <div className="amm__card">
              <h4 className="amm__card-title">Basic Information</h4>
              <div className="amm__card-body">
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

                <div className={pricingType !== "loyalty" ? "amm__grid2" : undefined}>
                  {pricingType !== "loyalty" && (
                    <div className="amm__field">
                      <label className="amm__label">Expiry <span className="amm__req">*</span></label>
                      <input
                        type="date"
                        className={`amm__input${errors.expiryDate ? " amm__input--err" : ""}`}
                        min={toIsoDate(addDays(todayMidnight(), 1))}
                        value={form.expiryDate}
                        onChange={(e) => patch({ expiryDate: e.target.value })}
                      />
                      {errors.expiryDate
                        ? <p className="amm__err">{errors.expiryDate}</p>
                        : <p className="amm__hint">Valid for {Math.max(0, daysFromToday(form.expiryDate))} days from today.</p>}
                    </div>
                  )}

                  <div className="amm__field">
                    <label className="amm__label">Applies To</label>
                    <div className="amm__sel-wrap">
                      <Dropdown
                        className="amm__select"
                        searchable={false}
                        value={form.appliesTo}
                        options={APPLIES_TO_OPTIONS.map((o) => ({ id: o.value, name: o.label }))}
                        onChange={(id) => patch({ appliesTo: id as MembershipAppliesTo })}
                      />
                      <ChevronDown size={13} className="amm__sel-icon" />
                    </div>
                    <p className="amm__hint">
                      {pricingType === "value"
                        ? "What the wallet balance can be spent on."
                        : "What the discount can be applied to."}
                    </p>
                  </div>
                </div>

                {categories.length > 0 && (
                  <div className="amm__field">
                    <label className="amm__label">Categories</label>
                    <div className="amm__sel-wrap">
                      <Dropdown
                        className="amm__select"
                        searchable={false}
                        multiple
                        value={form.categoryIds}
                        options={categories.map((c) => ({ id: String(c.id), name: c.name }))}
                        onChange={toggleCategory}
                        placeholder="All categories"
                      />
                      <ChevronDown size={13} className="amm__sel-icon" />
                    </div>
                    <p className="amm__hint">
                      {form.categoryIds.length > 0
                        ? "Only these categories get the benefit — leave none selected to cover every category."
                        : "None selected — the benefit applies to every category within Applies To."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2 — Benefit Configuration: fields switch per selected type */}
            <div className="amm__card">
              <h4 className="amm__card-title">Benefit Configuration</h4>
              <div className="amm__card-body">
                {pricingType === "value" && (
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

                    <div className="amm__wallet-preview amm__wallet-preview--value">
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

                    <div className="amm__wallet-preview amm__wallet-preview--percentage">
                      <span>Discount Balance</span>
                      <strong>{formatAmount(priceNum)}</strong>
                    </div>
                  </>
                )}

                {pricingType === "loyalty" && (
                  <div className="amm__tiers">
                    {form.loyaltyTiers.map((tier, i) => (
                      <div className="amm__tier-row" key={i}>
                        <div className="amm__field">
                          <label className="amm__label">Visit Threshold <span className="amm__req">*</span></label>
                          <input
                            type="number" min={1} step={1}
                            className={`amm__input${errors[`tier${i}Threshold`] ? " amm__input--err" : ""}`}
                            placeholder="e.g. 10"
                            value={tier.threshold}
                            onChange={(e) => patchTier(i, { threshold: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                          {errors[`tier${i}Threshold`] && <p className="amm__err">{errors[`tier${i}Threshold`]}</p>}
                        </div>

                        <div className="amm__field">
                          <label className="amm__label">Discount % <span className="amm__req">*</span></label>
                          <input
                            type="number" min={0} max={100} step={1}
                            className={`amm__input${errors[`tier${i}Discount`] ? " amm__input--err" : ""}`}
                            placeholder="Enter discount %"
                            value={tier.discount}
                            onChange={(e) => patchTier(i, { discount: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                          {errors[`tier${i}Discount`] && <p className="amm__err">{errors[`tier${i}Discount`]}</p>}
                        </div>

                        <button
                          type="button"
                          className="amm__tier-remove"
                          disabled={form.loyaltyTiers.length <= 1}
                          title="Remove tier"
                          onClick={() => removeTier(i)}
                        >
                          <Trash3 size={13} />
                        </button>
                      </div>
                    ))}

                    <button type="button" className="amm__tier-add" onClick={addTier}>
                      <PlusLg size={12} /> Add Tier
                    </button>

                    <p className="amm__hint">
                      Every client is automatically eligible. Once they reach a tier's visit count, the highest
                      eligible tier discount is applied during checkout. Tiers do not stack.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3 — Membership Description: moved to the bottom, after all configuration */}
            <div className="amm__card">
              <h4 className="amm__card-title">Membership Description</h4>
              <div className="amm__card-body">
                <div className="amm__field">
                  <div className="amm__textarea-wrap">
                    <textarea
                      className="amm__textarea"
                      placeholder="Enter additional information about this membership plan."
                      maxLength={DESC_MAX}
                      value={form.description}
                      onChange={(e) => patch({ description: e.target.value })}
                    />
                    <span className="amm__char-count">{form.description.length} / {DESC_MAX} characters</span>
                  </div>
                </div>
              </div>
            </div>

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
