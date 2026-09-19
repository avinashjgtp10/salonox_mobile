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
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown, X,
  AwardFill, Percent, Award,
  PlusLg, Trash3,
} from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { toTitleCase } from "../../../utils/titleCase";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { createMembershipThunk, updateMembershipThunk } from "../../../middleware/membership/membership.thunk";
import { selectMembershipsSubmitting, selectMembershipsError } from "../../../store/selectors/membership.selectors";
import { clearMembershipError } from "../../../store/membershipSlice";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import { searchProductsThunk } from "../../../middleware/catalog/products.thunk";
import { selectServiceCategories, selectProductCategories, selectAllServices } from "../../../store/selectors/slices.selectors";
import type { MembershipPricingType, MembershipBenefitType, MembershipAppliesTo, LoyaltyTier } from "../../../services/api/endpoints/memberships.endpoints";
import api from "../../../services/api/axios";
import Dropdown from "../../../components/ui/Dropdown";
import ItemRestrictionPicker from "./ItemRestrictionPicker";
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

// The plan's expiry is stored as a relative "valid for N days" duration — the
// backend applies it from whenever a client actually BUYS the plan, not from
// now (see computeExpiryDate in client-memberships.repository.ts), so the day
// count is the real setting and a calendar date is only ever a preview of it.
// This used to be entered as a date and back-converted to days; staff now type
// the duration itself and the date under the field is what's derived.
const DEFAULT_VALID_DAYS = 365;
const MAX_VALID_DAYS = 36500; // 100 years — well past the legacy "lifetime" bucket

// Reads an existing plan's stored validFor back into a day count for the field
// — handles the "N days" format plus the legacy fixed buckets older plans may
// still carry.
function parseValidForToDays(validFor: string | undefined | null): string {
  const daysMatch = /^(\d+)\s*days?$/i.exec((validFor ?? "").trim());
  if (daysMatch) return daysMatch[1];
  switch (validFor) {
    case "1 month":  return "30";
    case "3 months": return "90";
    case "6 months": return "180";
    case "1 year":   return "365";
    case "lifetime": return String(365 * 50);
    default:         return String(DEFAULT_VALID_DAYS);
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
  /** How many days the plan stays valid, counted from each client's purchase
   *  date — value + percentage only, loyalty has no expiry. Saved verbatim as
   *  "N days"; the date shown under the field is only a preview of that. */
  validForDays: string;
  /** 'percentage' only — which of the two mutually exclusive benefit models
   *  this plan runs on. 'discount_balance' spends the pool below down to ₹0
   *  and stops; 'validity' has no pool and keeps discounting until the
   *  membership expires (validForDays above is then the only limit). */
  benefitType: MembershipBenefitType;
  /** 'percentage' + 'discount_balance' only — the pool of discount the plan
   *  hands out over its life. Blank defaults to the membership fee, which is
   *  what this always silently was before the field was exposed. Ignored
   *  entirely (and never sent) for a validity plan. */
  discountBalance: string;
  appliesTo: MembershipAppliesTo;
  /** Optional narrowing of appliesTo to specific service_categories ids —
   *  tracked independently per side: service_categories is one shared table
   *  for both service and product categories (distinguished only by a
   *  `type` column), so a category tagged 'both' is a valid pick on EITHER
   *  side — picking it here for services must never silently also restrict/
   *  allow products, or vice versa. Empty means unrestricted on that side. */
  serviceCategoryIds: string[];
  productCategoryIds: string[];
  /** Further, additive narrowing to specific services/products within (or
   *  independent of) the category ids above — empty means no individual-item narrowing. */
  serviceIds: string[];
  productIds: string[];
}

const emptyForm = (): FormState => ({
  name: "", description: "", price: "", bonusCredit: "", discount: "",
  loyaltyTiers: [emptyTier()],
  validForDays: String(DEFAULT_VALID_DAYS),
  benefitType: "discount_balance",
  discountBalance: "",
  appliesTo: "services",
  serviceCategoryIds: [],
  productCategoryIds: [],
  serviceIds: [],
  productIds: [],
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
  // service_categories is one shared table — which slice a membership should
  // offer depends on what it's redeemable against (form.appliesTo below), so
  // all three views are read here and the right one is picked once appliesTo
  // exists rather than always showing the full unscoped list.
  const serviceCategories = useSelector(selectServiceCategories) as { id: string | number; name: string }[];
  const productCategories = useSelector(selectProductCategories) as { id: string | number; name: string }[];
  // For the item-restriction picker below — not otherwise needed by this
  // modal, so fetched only here rather than assumed already loaded.
  const allServices = useSelector(selectAllServices) as { id: string | number; name: string; category_id: string | number | null }[];
  // pickerItems, not items — this modal preloads up to 200 products for its
  // own picker via searchProductsThunk, which no longer shares state with
  // the paginated Catalog → Products list page (see productsSlice.ts).
  const allProducts = useSelector((s: RootState) => s.products.pickerItems) as { id: string; name: string; category_id: string | null }[];

  useEffect(() => () => { dispatch(clearMembershipError()); }, [dispatch]);
  useEffect(() => { dispatch(fetchCategoriesThunk()); }, [dispatch]);
  useEffect(() => {
    dispatch(fetchServicesThunk());
    // searchProductsThunk (POST /products/search), not fetchProductsThunk
    // (GET /products) — the GET route's validator caps pageSize at 100 and
    // rejects 200 with "pageSize must not exceed 100".
    dispatch(searchProductsThunk({ pageSize: 200 }));
  }, [dispatch]);

  const [pricingType, setPricingType] = useState<MembershipPricingType>("value");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Scopes each picker's own `items` list to services/products actually
  // belonging to a category of that type — unrelated to which array a
  // selected category id is stored in (serviceCategoryIds/productCategoryIds
  // below are now tracked independently, so this is purely "what's pickable
  // under this picker", not a cross-filter of shared selection state).
  const serviceCategoryIdSet = useMemo(() => new Set(serviceCategories.map((c) => String(c.id))), [serviceCategories]);
  const productCategoryIdSet = useMemo(() => new Set(productCategories.map((c) => String(c.id))), [productCategories]);

  // Scoped item lists for the two pickers below — memoized because
  // allServices/allProducts can run into the thousands for a salon with a
  // large catalog. Building these inline in JSX re-ran the filter+map over
  // the FULL list on every render of this modal (every keystroke, every
  // checkbox toggle triggers a patch() → re-render), which is what made
  // selecting services feel slow — each click recomputed a multi-thousand-
  // row array just to redraw a checkbox.
  const serviceItemOptions = useMemo(
    () => allServices
      .filter((s) => s.category_id != null && serviceCategoryIdSet.has(String(s.category_id)))
      .map((s) => ({ id: String(s.id), name: s.name, categoryId: String(s.category_id) })),
    [allServices, serviceCategoryIdSet],
  );
  const productItemOptions = useMemo(
    () => allProducts
      .filter((p) => p.category_id != null && productCategoryIdSet.has(String(p.category_id)))
      .map((p) => ({ id: String(p.id), name: p.name, categoryId: String(p.category_id) })),
    [allProducts, productCategoryIdSet],
  );
  const serviceCategoryOptions = useMemo(
    () => serviceCategories.map((c) => ({ id: String(c.id), name: c.name })),
    [serviceCategories],
  );
  const productCategoryOptions = useMemo(
    () => productCategories.map((c) => ({ id: String(c.id), name: c.name })),
    [productCategories],
  );

  const patch = (p: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
    // Field names line up 1:1 with error keys (name/price/discount/validForDays)
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
        validForDays: parseValidForToDays(d.validFor),
        // Anything not explicitly 'validity' is the balance model — that's the
        // default for every plan created before benefit types existed.
        benefitType: d.benefitType === "validity" ? "validity" : "discount_balance",
        discountBalance: d.discountBalance != null ? String(d.discountBalance) : "",
        appliesTo: d.appliesTo ?? "services",
        serviceCategoryIds: Array.isArray(d.serviceCategoryIds) ? d.serviceCategoryIds : [],
        productCategoryIds: Array.isArray(d.productCategoryIds) ? d.productCategoryIds : [],
        serviceIds: Array.isArray(d.serviceIds) ? d.serviceIds : [],
        productIds: Array.isArray(d.productIds) ? d.productIds : [],
      });
    }).catch(() => {});
  }, [editId]);

  const priceNum           = parseFloat(form.price)                 || 0;
  const bonusCreditNum     = parseFloat(form.bonusCredit)            || 0;
  const discountNum        = parseFloat(form.discount)               || 0;
  // Blank = "same as the fee", which is exactly what the pool always was
  // before this became an editable field — so leaving it alone reproduces
  // today's behaviour rather than creating a ₹0 (instantly dead) plan.
  const discountBalanceNum = form.discountBalance.trim() === ""
    ? parseFloat(form.price) || 0
    : parseFloat(form.discountBalance) || 0;

  const validDaysNum       = parseInt(form.validForDays, 10)         || 0;
  // Preview only — the countdown really starts on the client's purchase date,
  // so this reads as "what a plan sold today would expire on", not as a value
  // that gets stored anywhere.
  const previewExpiry      = validDaysNum > 0 ? formatDateDDMMYYYY(addDays(todayMidnight(), validDaysNum)) : "—";
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Membership name is required";

    if (pricingType === "value") {
      if (!priceNum || priceNum <= 0) e.price = "Price must be greater than 0";
    }
    if (pricingType === "percentage") {
      if (!priceNum || priceNum <= 0) e.price = "Membership fee must be greater than 0";
      if (!discountNum || discountNum <= 0 || discountNum > 100) e.discount = "Enter a valid discount %";
      // Only the balance model has a pool to validate — a validity plan with
      // a ₹0 pool is correct, not broken.
      if (form.benefitType === "discount_balance" && discountBalanceNum <= 0) {
        e.discountBalance = "Discount balance must be greater than 0";
      }
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
      if (!validDaysNum) e.validForDays = "Enter how many days the plan stays valid";
      else if (validDaysNum > MAX_VALID_DAYS) e.validForDays = `Must be ${MAX_VALID_DAYS} days or fewer`;
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
      name: toTitleCase(form.name.trim()),
      description: metaDescription,
      includedServices: [],
      sessionType: "unlimited",
      // Loyalty has no expiry concept (free, evergreen) — "lifetime" satisfies
      // the backend's required validFor without exposing a validity field.
      // Other types send the typed day count straight through — the backend
      // applies it from whenever a client actually buys the plan.
      validFor: pricingType === "loyalty" ? "lifetime" : `${validDaysNum} days`,
      price: pricingType === "loyalty" ? 0 : priceNum,
      taxRate: undefined,
      colour: DEFAULT_COLOUR,
      pricingType,
      discountPercent: pricingType === "percentage" ? discountNum : undefined,
      // Which of the two benefit models this plan runs on. Only meaningful
      // for 'percentage'; the others always send the default so the column
      // never holds something misleading for a wallet/loyalty plan.
      benefitType: pricingType === "percentage" ? form.benefitType : "discount_balance",
      // A validity plan has no pool at all — sending undefined keeps the
      // column NULL so the two models can't both look configured. The balance
      // model sends the typed figure, which defaults to the fee (the value it
      // was permanently hardcoded to before this field existed).
      discountBalance: pricingType === "percentage" && form.benefitType === "discount_balance"
        ? discountBalanceNum
        : undefined,
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
      // Always send the real array (even empty) — `undefined` gets dropped by
      // JSON.stringify, and the backend's update only touches columns whose
      // key is actually present in the body, so an omitted restriction array
      // left an old one stuck in place forever on edit. An empty array
      // reaches the backend and is normalized to "no restriction" there.
      serviceCategoryIds: form.serviceCategoryIds,
      productCategoryIds: form.productCategoryIds,
      serviceIds: form.serviceIds,
      productIds: form.productIds,
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

  // Benefit Type picker — same card/radio affordance as the Membership Type
  // row above, but always switchable: unlike the pricing type, changing the
  // benefit model doesn't invalidate anything already sold (existing client
  // memberships keep the model they were bought under, snapshotted at
  // purchase in client_memberships.benefit_type).
  const benefitCard = (type: MembershipBenefitType, title: string, sub: string) => {
    const selected = form.benefitType === type;
    return (
      <button
        type="button"
        className={`amm__type-card amm__type-card--benefit${selected ? " amm__type-card--on amm__type-card--percentage" : ""}`}
        onClick={() => patch({ benefitType: type })}
      >
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
                      <label className="amm__label">Validity (Days) <span className="amm__req">*</span></label>
                      <input
                        className={`amm__input${errors.validForDays ? " amm__input--err" : ""}`}
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="365"
                        value={form.validForDays}
                        onChange={(e) => patch({ validForDays: e.target.value.replace(/\D/g, "") })}
                      />
                      {errors.validForDays
                        ? <p className="amm__err">{errors.validForDays}</p>
                        : <p className="amm__hint">Expires {previewExpiry} if bought today — the {validDaysNum || 0} days run from each client's purchase date.</p>}
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
                        // Categories/services/products picked under the old
                        // scope may not exist in the new one (e.g. a service
                        // category selected while "Both" was active, now that
                        // appliesTo has narrowed to Products) — clear rather
                        // than carry over a selection the picker below can no
                        // longer show.
                        onChange={(id) => patch({ appliesTo: id as MembershipAppliesTo, serviceCategoryIds: [], productCategoryIds: [], serviceIds: [], productIds: [] })}
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

                {form.appliesTo !== "products" && serviceCategories.length > 0 && (
                  <div className="amm__field">
                    <label className="amm__label">Services</label>
                    <ItemRestrictionPicker
                      label="Services"
                      categories={serviceCategoryOptions}
                      items={serviceItemOptions}
                      categoryIds={form.serviceCategoryIds}
                      itemIds={form.serviceIds}
                      onChangeCategoryIds={(ids) => patch({ serviceCategoryIds: ids })}
                      onChangeItemIds={(ids) => patch({ serviceIds: ids })}
                    />
                  </div>
                )}

                {form.appliesTo !== "services" && productCategories.length > 0 && (
                  <div className="amm__field">
                    <label className="amm__label">Products</label>
                    <ItemRestrictionPicker
                      label="Products"
                      categories={productCategoryOptions}
                      items={productItemOptions}
                      categoryIds={form.productCategoryIds}
                      itemIds={form.productIds}
                      onChangeCategoryIds={(ids) => patch({ productCategoryIds: ids })}
                      onChangeItemIds={(ids) => patch({ productIds: ids })}
                    />
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

                    {/* Benefit Type — the two models are mutually exclusive
                        by construction: one value, and only that model's
                        fields render below it. */}
                    <div className="amm__field">
                      <label className="amm__label">Benefit Type <span className="amm__req">*</span></label>
                      <div className="amm__benefit-row">
                        {benefitCard(
                          "discount_balance",
                          "Discount Balance",
                          "Discount is consumed from a set pool, and stops at ₹0",
                        )}
                        {benefitCard(
                          "validity",
                          "Validity Based",
                          "Discount applies to every eligible bill until the membership expires",
                        )}
                      </div>
                    </div>

                    {form.benefitType === "discount_balance" ? (
                      <>
                        <div className="amm__field">
                          <label className="amm__label">Discount Balance <span className="amm__req">*</span></label>
                          <div className="amm__pfx-wrap">
                            <span className="amm__pfx">{currencySymbol}</span>
                            <input
                              type="number" min={0} step={1}
                              className={`amm__input amm__input--pfx${errors.discountBalance ? " amm__input--err" : ""}`}
                              placeholder={form.price || "0"}
                              value={form.discountBalance}
                              onChange={(e) => patch({ discountBalance: e.target.value })}
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </div>
                          {errors.discountBalance
                            ? <p className="amm__err">{errors.discountBalance}</p>
                            : <p className="amm__hint">Total discount this plan can hand out. Leave blank to match the membership fee.</p>}
                        </div>

                        <div className="amm__wallet-preview amm__wallet-preview--percentage">
                          <span>Discount Balance</span>
                          <strong>{formatAmount(discountBalanceNum)}</strong>
                        </div>
                      </>
                    ) : (
                      <div className="amm__wallet-preview amm__wallet-preview--percentage">
                        <span>{form.discount || 0}% off every eligible bill</span>
                        <strong>{validDaysNum || 0} days</strong>
                      </div>
                    )}
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
