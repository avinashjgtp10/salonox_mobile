// Catalog → Membership → Add / Edit.
//
// Feature parity with the web "Add Membership" modal
// (salon_mgm_frontend/src/features/catalog/components/AddMembershipModal.tsx):
// one of three plan types, chosen with the cards at the top, with the field
// list below switching to match. Same fields, same validation, same payload to
// the same endpoints, so a plan created here and one created on web are
// indistinguishable.
//
//   Wallet (value)       — pay a fee, credit a spendable wallet balance
//                          (fee + optional bonus credit).
//   Discount Balance     — pay a fee, get N% off; the discount GIVEN either
//   (percentage)           depletes a configurable pool or runs until expiry.
//   Loyalty              — free/automatic; crossing a visit threshold unlocks
//                          that tier's discount, highest crossed tier only.
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";
import {
  createMembershipThunk,
  fetchMembershipByIdThunk,
  fetchMembershipsThunk,
  updateMembershipThunk,
} from "@/middleware/membership/membership.thunk";
import {
  selectMembershipById,
  selectMembershipDetailsError,
  selectMembershipDetailsLoading,
  selectMembershipMutationError,
  selectMembershipMutationLoading,
  selectMembershipsQuery,
} from "@/store/membership/membership.slice";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { productService } from "@/services/product.service";
import { serviceService } from "@/services/service.service";
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import type {
  CreateMembershipRequest,
  MembershipAppliesTo,
  MembershipBenefitType,
  MembershipPricingType,
} from "@/types/membership";
import type { ServiceCategoryItem } from "@/types/service";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { StickyFooterLayout } from "@/components/ui/StickyFooterLayout";
import {
  MembershipItemRestrictionPicker,
  type PickerItem,
} from "@/features/membership/components/MembershipItemRestrictionPicker";
import {
  buildMembershipDescription,
  DEFAULT_MEMBERSHIP_VALID_DAYS,
  getMembershipMeta,
  MAX_VALID_DAYS,
  parseValidForToDays,
} from "@/features/membership/membershipMeta";
import { currencySymbol, formatCurrency } from "@/utils/currency";
import { formatAppDate } from "@/utils/dateTime";
import { toTitleCase } from "@/utils/titleCase";

type MembershipFormScreenProps = {
  membershipId?: string;
  mode: "create" | "edit";
};

/** Every plan is created through the web's conventions so both clients agree. */
const DEFAULT_COLOUR = "#1a1a2e";
const DESCRIPTION_MAX = 250;
/** How many services/products the restriction pickers preload. */
const PICKER_PAGE_SIZE = 200;

const APPLIES_TO_OPTIONS: { label: string; value: MembershipAppliesTo }[] = [
  { label: "Services only", value: "services" },
  { label: "Products only", value: "products" },
  { label: "Both", value: "both" },
];

type FormErrors = Record<string, string>;

/** One tier row as edited in the form — parsed to numbers on save. */
type LoyaltyTierInput = {
  discount: string;
  threshold: string;
};

const emptyTier = (): LoyaltyTierInput => ({ discount: "", threshold: "" });

type FormState = {
  appliesTo: MembershipAppliesTo;
  /** "percentage" only — which of the two mutually exclusive benefit models the
   *  plan runs on. "discount_balance" spends the pool below down to zero and
   *  stops; "validity" has no pool and keeps discounting until expiry. */
  benefitType: MembershipBenefitType;
  /** value only — extra wallet credit on top of the fee. */
  bonusCredit: string;
  description: string;
  /** percentage only — loyalty uses loyaltyTiers instead. */
  discount: string;
  /** "percentage" + "discount_balance" only — the pool of discount the plan
   *  hands out over its life. Blank defaults to the membership fee, which is
   *  what the pool always silently was before the field was exposed. */
  discountBalance: string;
  loyaltyTiers: LoyaltyTierInput[];
  name: string;
  /** value: price paid; percentage: membership fee. */
  price: string;
  productCategoryIds: string[];
  productIds: string[];
  serviceCategoryIds: string[];
  serviceIds: string[];
  /** How many days the plan stays valid, counted from each client's purchase
   *  date — value + percentage only, loyalty has no expiry. */
  validForDays: string;
};

const emptyForm = (): FormState => ({
  appliesTo: "services",
  benefitType: "discount_balance",
  bonusCredit: "",
  description: "",
  discount: "",
  discountBalance: "",
  loyaltyTiers: [emptyTier()],
  name: "",
  price: "",
  productCategoryIds: [],
  productIds: [],
  serviceCategoryIds: [],
  serviceIds: [],
  validForDays: String(DEFAULT_MEMBERSHIP_VALID_DAYS),
});

const todayMidnight = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export function MembershipFormScreen({ membershipId, mode }: MembershipFormScreenProps) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const membership = useAppSelector((state) => (membershipId ? selectMembershipById(membershipId)(state) : null));
  const detailsLoading = useAppSelector(selectMembershipDetailsLoading);
  const detailsError = useAppSelector(selectMembershipDetailsError);
  const mutationLoading = useAppSelector(selectMembershipMutationLoading);
  const mutationError = useAppSelector(selectMembershipMutationError);
  const query = useAppSelector(selectMembershipsQuery);
  const branchId = useAppSelector(selectActiveBranchId);
  const hasPrefilledRef = useRef(false);
  // The error field order decides which input is focused (and so scrolled to)
  // when Save fails validation.
  const fieldRefs = useRef<Record<string, TextInput | null>>({});

  const [pricingType, setPricingType] = useState<MembershipPricingType>("value");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  // Catalog lists for the restriction pickers. Kept local rather than in the
  // shared service/product slices, which the Services and Stock screens own —
  // preloading 200 rows into those would clobber their paginated state.
  const [categories, setCategories] = useState<ServiceCategoryItem[]>([]);
  const [serviceItems, setServiceItems] = useState<PickerItem[]>([]);
  const [productItems, setProductItems] = useState<PickerItem[]>([]);

  const isSubmitting = mutationLoading || isFinishing;

  useEffect(() => {
    if (mode === "edit" && membershipId) {
      void dispatch(fetchMembershipByIdThunk(membershipId));
    }
  }, [dispatch, membershipId, mode]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const [categoryResult, serviceResult, productResult] = await Promise.allSettled([
        serviceService.getAllCategories(branchId),
        serviceService.getServices(
          { limit: PICKER_PAGE_SIZE, offset: 0, search: "", sort_by: "name", sort_order: "asc" },
          branchId,
        ),
        productService.fetchProducts(
          { limit: PICKER_PAGE_SIZE, offset: 0, search: "", sort_by: "name", sort_order: "asc" },
          branchId,
        ),
      ]);

      if (!active) return;

      if (categoryResult.status === "fulfilled") setCategories(categoryResult.value);
      if (serviceResult.status === "fulfilled") {
        setServiceItems(
          serviceResult.value.services.map((service) => ({
            categoryId: service.categoryId,
            id: service.id,
            name: service.name,
          })),
        );
      }
      if (productResult.status === "fulfilled") {
        setProductItems(
          productResult.value.products.map((product) => ({
            categoryId: product.categoryId,
            id: product.id,
            name: product.name,
          })),
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [branchId]);

  // service_categories is one shared table — a category tagged "both" is a
  // valid pick on either side, so each side takes everything not exclusive to
  // the other. Entries with no stored type are unknown, not excluded.
  const serviceCategories = useMemo(
    () => categories.filter((category) => category.type !== "product"),
    [categories],
  );
  const productCategories = useMemo(
    () => categories.filter((category) => category.type !== "service"),
    [categories],
  );

  // Scopes each picker's own item list to things belonging to a category of
  // that type — independent of which array a selected category id is stored in.
  const serviceCategoryIdSet = useMemo(
    () => new Set(serviceCategories.map((category) => category.id)),
    [serviceCategories],
  );
  const productCategoryIdSet = useMemo(
    () => new Set(productCategories.map((category) => category.id)),
    [productCategories],
  );
  const serviceOptions = useMemo(
    () => serviceItems.filter((item) => item.categoryId && serviceCategoryIdSet.has(item.categoryId)),
    [serviceItems, serviceCategoryIdSet],
  );
  const productOptions = useMemo(
    () => productItems.filter((item) => item.categoryId && productCategoryIdSet.has(item.categoryId)),
    [productItems, productCategoryIdSet],
  );

  useEffect(() => {
    if (mode !== "edit" || !membership || hasPrefilledRef.current) return;

    const meta = getMembershipMeta(membership);
    const type = membership.pricingType ?? "value";

    setPricingType(type);
    setForm({
      appliesTo: membership.appliesTo ?? "services",
      // Anything not explicitly "validity" is the balance model — the default
      // for every plan created before benefit types existed.
      benefitType: membership.benefitType === "validity" ? "validity" : "discount_balance",
      bonusCredit: meta.bonusCredit !== undefined ? String(meta.bonusCredit) : "",
      description: meta.description ?? "",
      discount: type === "percentage" && membership.discountPercent ? String(membership.discountPercent) : "",
      discountBalance: membership.discountBalance != null ? String(membership.discountBalance) : "",
      loyaltyTiers: membership.loyaltyTiers?.length
        ? membership.loyaltyTiers.map((tier) => ({
            discount: String(tier.discountPercent),
            threshold: String(tier.thresholdValue),
          }))
        : [emptyTier()],
      name: membership.name,
      price: membership.price ? String(membership.price) : "",
      productCategoryIds: membership.productCategoryIds ?? [],
      productIds: membership.productIds ?? [],
      serviceCategoryIds: membership.serviceCategoryIds ?? [],
      serviceIds: membership.serviceIds ?? [],
      validForDays: parseValidForToDays(membership.validFor),
    });
    hasPrefilledRef.current = true;
  }, [membership, mode]);

  const patch = (next: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...next }));
    // Field names line up 1:1 with error keys — clear a field's inline error as
    // soon as it is edited, otherwise a message set by Save sits there forever
    // even after the value is fixed.
    setErrors((current) => {
      const keys = Object.keys(next).filter((key) => key in current);
      if (keys.length === 0) return current;

      const remaining = { ...current };
      keys.forEach((key) => delete remaining[key]);
      return remaining;
    });
  };

  const priceNumber = parseFloat(form.price) || 0;
  const bonusCreditNumber = parseFloat(form.bonusCredit) || 0;
  const discountNumber = parseFloat(form.discount) || 0;
  // Blank = "same as the fee", which is exactly what the pool always was before
  // this became an editable field — so leaving it alone reproduces the old
  // behaviour rather than creating an instantly-dead zero plan.
  const discountBalanceNumber =
    form.discountBalance.trim() === "" ? priceNumber : parseFloat(form.discountBalance) || 0;
  const validDaysNumber = parseInt(form.validForDays, 10) || 0;
  // Preview only — the countdown really starts on the client's purchase date.
  const previewExpiry =
    validDaysNumber > 0 ? formatAppDate(addDays(todayMidnight(), validDaysNumber).toISOString(), "—") : "—";
  const walletValue = priceNumber + bonusCreditNumber;

  const addTier = () => patch({ loyaltyTiers: [...form.loyaltyTiers, emptyTier()] });

  const removeTier = (index: number) =>
    patch({ loyaltyTiers: form.loyaltyTiers.filter((_, tierIndex) => tierIndex !== index) });

  const patchTier = (index: number, next: Partial<LoyaltyTierInput>) => {
    patch({
      loyaltyTiers: form.loyaltyTiers.map((tier, tierIndex) => (tierIndex === index ? { ...tier, ...next } : tier)),
    });
    // Tier errors are keyed tier{i}Threshold / tier{i}Discount, which patch()'s
    // generic clearing can't match — clear them on the edit that touches them.
    setErrors((current) => {
      const remaining = { ...current };
      let changed = false;

      if ("threshold" in next && `tier${index}Threshold` in remaining) {
        delete remaining[`tier${index}Threshold`];
        changed = true;
      }
      if ("discount" in next && `tier${index}Discount` in remaining) {
        delete remaining[`tier${index}Discount`];
        changed = true;
      }

      return changed ? remaining : current;
    });
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) nextErrors.name = "Membership name is required";

    if (pricingType === "value") {
      if (!priceNumber || priceNumber <= 0) nextErrors.price = "Price must be greater than 0";
    }

    if (pricingType === "percentage") {
      if (!priceNumber || priceNumber <= 0) nextErrors.price = "Membership fee must be greater than 0";
      if (!discountNumber || discountNumber <= 0 || discountNumber > 100) {
        nextErrors.discount = "Enter a valid discount %";
      }
      // Only the balance model has a pool to validate — a validity plan with no
      // pool is correct, not broken.
      if (form.benefitType === "discount_balance" && discountBalanceNumber <= 0) {
        nextErrors.discountBalance = "Discount balance must be greater than 0";
      }
    }

    if (pricingType === "loyalty") {
      let previousThreshold = 0;

      form.loyaltyTiers.forEach((tier, index) => {
        const threshold = parseInt(tier.threshold, 10) || 0;
        const percent = parseFloat(tier.discount) || 0;

        if (!threshold || threshold <= 0) nextErrors[`tier${index}Threshold`] = "Enter a valid threshold";
        else if (threshold <= previousThreshold) {
          nextErrors[`tier${index}Threshold`] = "Must be greater than the previous tier";
        }
        if (!percent || percent <= 0 || percent > 100) nextErrors[`tier${index}Discount`] = "Enter a valid discount %";

        previousThreshold = threshold || previousThreshold;
      });
    } else {
      if (!validDaysNumber) nextErrors.validForDays = "Enter how many days the plan stays valid";
      else if (validDaysNumber > MAX_VALID_DAYS) nextErrors.validForDays = `Must be ${MAX_VALID_DAYS} days or fewer`;
    }

    setErrors(nextErrors);
    return nextErrors;
  };

  const buildPayload = (): CreateMembershipRequest => ({
    name: toTitleCase(form.name.trim()),
    // The plan's description and its (wallet-only) bonus credit share the one
    // stored string — there is no bonusCredit column server-side.
    description: buildMembershipDescription(
      form.description,
      pricingType === "value" ? bonusCreditNumber : undefined,
    ),
    includedServices: [],
    sessionType: "unlimited",
    // Loyalty has no expiry concept (free, evergreen) — "lifetime" satisfies the
    // backend's required validFor without exposing a validity field. The other
    // types send the typed day count straight through; the backend applies it
    // from whenever a client actually buys the plan.
    validFor: pricingType === "loyalty" ? "lifetime" : `${validDaysNumber} days`,
    price: pricingType === "loyalty" ? 0 : priceNumber,
    colour: DEFAULT_COLOUR,
    pricingType,
    ...(pricingType === "percentage" ? { discountPercent: discountNumber } : {}),
    // Only meaningful for "percentage"; the others always send the default so
    // the column never holds something misleading for a wallet/loyalty plan.
    benefitType: pricingType === "percentage" ? form.benefitType : "discount_balance",
    // A validity plan has no pool at all — omitting it keeps the column NULL so
    // the two models can't both look configured.
    ...(pricingType === "percentage" && form.benefitType === "discount_balance"
      ? { discountBalance: discountBalanceNumber }
      : {}),
    ...(pricingType === "loyalty"
      ? {
          loyaltyTiers: form.loyaltyTiers.map((tier) => ({
            discountPercent: parseFloat(tier.discount) || 0,
            thresholdValue: parseInt(tier.threshold, 10) || 0,
          })),
        }
      : {}),
    enableOnlineSales: true,
    enableOnlineRedemption: true,
    appliesTo: form.appliesTo,
    // Always send the real array, even empty: the backend's update only touches
    // columns whose key is present in the body, so an omitted restriction array
    // left an old one stuck in place forever on edit. An empty array reaches the
    // backend and is normalized to "no restriction" there.
    serviceCategoryIds: form.serviceCategoryIds,
    productCategoryIds: form.productCategoryIds,
    serviceIds: form.serviceIds,
    productIds: form.productIds,
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/memberships" as Href);
  };

  const refreshList = () => dispatch(fetchMembershipsThunk({ ...query, refresh: true, reset: true }));

  // Pricing type is fixed once the membership exists. Each type funds a
  // different benefit, and memberships already sold snapshot the type they were
  // bought under — switching it on the template can't convert those, it only
  // makes the plan disagree with its own sold memberships.
  const typeLocked = mode === "edit";

  // Switching type while creating starts the form over: the three types don't
  // share a form, so carrying entries across left values that no longer applied
  // still being submitted, and stale errors pointing at inputs no longer shown.
  // No-op for the type already selected, so a re-tap can't wipe a filled form.
  const selectPricingType = (type: MembershipPricingType) => {
    if (typeLocked || type === pricingType) return;

    setPricingType(type);
    setForm(emptyForm());
    setErrors({});
    setFormError(null);
  };

  const submit = async () => {
    Keyboard.dismiss();
    setFormError(null);
    setSuccessMessage(null);

    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      // Focus the first invalid input; the form scrolls it into view itself.
      const order = [
        "name",
        "validForDays",
        "price",
        "discount",
        "discountBalance",
        ...form.loyaltyTiers.flatMap((_, index) => [`tier${index}Threshold`, `tier${index}Discount`]),
      ];
      const firstInvalid = order.find((key) => nextErrors[key]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    const payload = buildPayload();
    const result =
      mode === "create"
        ? await dispatch(createMembershipThunk(payload))
        : membershipId
          ? await dispatch(updateMembershipThunk({ membershipId, data: payload }))
          : null;

    if (!result) return;

    if (createMembershipThunk.rejected.match(result) || updateMembershipThunk.rejected.match(result)) {
      setFormError(getRejectedMessage(result.payload, "Unable to save membership."));
      return;
    }

    setSuccessMessage(mode === "create" ? "Membership created successfully." : "Membership updated successfully.");
    setIsFinishing(true);
    await refreshList();
    setTimeout(() => {
      setIsFinishing(false);
      goBack();
    }, 550);
  };

  if (mode === "edit" && detailsLoading && !membership) {
    return (
      <PearlBackground>
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <AppStatusBar />
          <View style={styles.centered}>
            <ActivityIndicator color={pearl.accentDeep} size="large" />
          </View>
        </SafeAreaView>
      </PearlBackground>
    );
  }

  const symbol = currencySymbol();

  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <AppStatusBar />
        <StickyFooterLayout
          contentContainerStyle={styles.content}
          header={
            <View style={styles.headerRow}>
              <AppBackButton activeOpacity={0.84} disabled={isSubmitting} hitSlop={12} onPress={goBack} />
              <Text translate style={styles.headerTitle}>
                {mode === "create" ? "Add membership" : "Edit membership"}
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          }
          headerStyle={styles.headerWrap}
          footer={
            <>
              <TouchableOpacity disabled={isSubmitting} onPress={goBack} style={styles.cancelButton}>
                <Text translate style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isSubmitting}
                onPress={() => void submit()}
                style={[styles.saveButton, isSubmitting && styles.disabled]}
              >
                <LinearGradient
                  colors={pearlGradients.primary}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text translate style={styles.saveText}>{isSubmitting ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </>
          }
        >
          {formError || mutationError || detailsError ? (
            <View style={styles.messageError}>
              <Ionicons color={Colors.error} name="alert-circle-outline" size={18} />
              <Text style={styles.messageErrorText}>{formError ?? mutationError ?? detailsError}</Text>
            </View>
          ) : null}
          {successMessage ? (
            <View style={styles.messageSuccess}>
              <Ionicons color={Colors.success} name="checkmark-circle-outline" size={18} />
              <Text style={styles.messageSuccessText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Membership Type — the three plan types. */}
          <View style={styles.card}>
            <Text translate style={styles.cardTitle}>Membership Type</Text>
            <View style={styles.typeList}>
              <TypeCard
                icon="wallet-outline"
                locked={typeLocked}
                onPress={() => selectPricingType("value")}
                selected={pricingType === "value"}
                subtitle="Pay a fee, credit a spendable wallet"
                title="Wallet"
              />
              <TypeCard
                icon="pricetag-outline"
                locked={typeLocked}
                onPress={() => selectPricingType("percentage")}
                selected={pricingType === "percentage"}
                subtitle="Pay a fee, get % off every service"
                title="Discount Balance"
              />
              <TypeCard
                icon="ribbon-outline"
                locked={typeLocked}
                onPress={() => selectPricingType("loyalty")}
                selected={pricingType === "loyalty"}
                subtitle="Free — unlocks a discount after N visits"
                title="Loyalty"
              />
            </View>
            {typeLocked ? (
              <Text translate style={styles.lockedNote}>
                Membership type can&apos;t be changed after the plan is created. Create a new membership if you need a
                different type.
              </Text>
            ) : null}
          </View>

          {/* 1 — Basic Information. */}
          <View style={styles.card}>
            <Text translate style={styles.cardTitle}>Basic Information</Text>

            <Field
              error={errors.name}
              icon="sparkles-outline"
              label="Membership Name"
              onChangeText={(value) => patch({ name: value })}
              placeholder="Enter membership name"
              ref={(input) => {
                fieldRefs.current.name = input;
              }}
              required
              value={form.name}
            />

            {pricingType !== "loyalty" ? (
              <Field
                error={errors.validForDays}
                hint={`Expires ${previewExpiry} if bought today — the ${validDaysNumber || 0} days run from each client's purchase date.`}
                icon="calendar-outline"
                keyboardType="number-pad"
                label="Validity (Days)"
                maxLength={5}
                onChangeText={(value) => patch({ validForDays: value.replace(/\D/g, "") })}
                placeholder="365"
                ref={(input) => {
                  fieldRefs.current.validForDays = input;
                }}
                required
                value={form.validForDays}
              />
            ) : null}

            <View style={styles.group}>
              <Text translate style={styles.label}>Applies To</Text>
              <View style={styles.segmented}>
                {APPLIES_TO_OPTIONS.map((option) => {
                  const active = option.value === form.appliesTo;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.84}
                      key={option.value}
                      // Categories/items picked under the old scope may not
                      // exist in the new one, so clear rather than carry over a
                      // selection the pickers can no longer show.
                      onPress={() =>
                        patch({
                          appliesTo: option.value,
                          productCategoryIds: [],
                          productIds: [],
                          serviceCategoryIds: [],
                          serviceIds: [],
                        })
                      }
                      style={[styles.segment, active && styles.segmentActive]}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text translate style={styles.hint}>
                {pricingType === "value"
                  ? "What the wallet balance can be spent on."
                  : "What the discount can be applied to."}
              </Text>
            </View>

            {form.appliesTo !== "products" && serviceCategories.length > 0 ? (
              <View style={styles.group}>
                <Text translate style={styles.label}>Services</Text>
                <MembershipItemRestrictionPicker
                  categories={serviceCategories}
                  categoryIds={form.serviceCategoryIds}
                  itemIds={form.serviceIds}
                  items={serviceOptions}
                  label="Services"
                  onChangeCategoryIds={(ids) => patch({ serviceCategoryIds: ids })}
                  onChangeItemIds={(ids) => patch({ serviceIds: ids })}
                />
              </View>
            ) : null}

            {form.appliesTo !== "services" && productCategories.length > 0 ? (
              <View style={styles.group}>
                <Text translate style={styles.label}>Products</Text>
                <MembershipItemRestrictionPicker
                  categories={productCategories}
                  categoryIds={form.productCategoryIds}
                  itemIds={form.productIds}
                  items={productOptions}
                  label="Products"
                  onChangeCategoryIds={(ids) => patch({ productCategoryIds: ids })}
                  onChangeItemIds={(ids) => patch({ productIds: ids })}
                />
              </View>
            ) : null}
          </View>

          {/* 2 — Benefit Configuration: fields switch per selected type. */}
          <View style={styles.card}>
            <Text translate style={styles.cardTitle}>Benefit Configuration</Text>

            {pricingType === "value" ? (
              <>
                <Field
                  error={errors.price}
                  keyboardType="decimal-pad"
                  label="Membership Fee"
                  onChangeText={(value) => patch({ price: value })}
                  placeholder="0"
                  prefix={symbol}
                  ref={(input) => {
                    fieldRefs.current.price = input;
                  }}
                  required
                  value={form.price}
                />
                <Field
                  keyboardType="decimal-pad"
                  label="Bonus Credit"
                  onChangeText={(value) => patch({ bonusCredit: value })}
                  placeholder="0"
                  prefix={symbol}
                  value={form.bonusCredit}
                />
                <View style={styles.preview}>
                  <Text translate style={styles.previewLabel}>Total Wallet Value</Text>
                  <Text style={styles.previewValue}>{formatCurrency(walletValue)}</Text>
                </View>
              </>
            ) : null}

            {pricingType === "percentage" ? (
              <>
                <Field
                  error={errors.price}
                  keyboardType="decimal-pad"
                  label="Membership Fee"
                  onChangeText={(value) => patch({ price: value })}
                  placeholder="0"
                  prefix={symbol}
                  ref={(input) => {
                    fieldRefs.current.price = input;
                  }}
                  required
                  value={form.price}
                />
                <Field
                  error={errors.discount}
                  icon="pricetag-outline"
                  keyboardType="decimal-pad"
                  label="Discount %"
                  onChangeText={(value) => patch({ discount: value })}
                  placeholder="Enter discount %"
                  ref={(input) => {
                    fieldRefs.current.discount = input;
                  }}
                  required
                  value={form.discount}
                />

                {/* The two benefit models are mutually exclusive by
                    construction: one value, and only that model's fields
                    render below it. Always switchable, unlike the pricing type
                    — changing it doesn't invalidate anything already sold,
                    since client memberships snapshot their model at purchase. */}
                <View style={styles.group}>
                  <Text translate style={styles.label}>Benefit Type <Text style={styles.required}>*</Text></Text>
                  <View style={styles.benefitList}>
                    <TypeCard
                      onPress={() => patch({ benefitType: "discount_balance" })}
                      selected={form.benefitType === "discount_balance"}
                      subtitle="Discount is consumed from a set pool, and stops at zero"
                      title="Discount Balance"
                    />
                    <TypeCard
                      onPress={() => patch({ benefitType: "validity" })}
                      selected={form.benefitType === "validity"}
                      subtitle="Discount applies to every eligible bill until the membership expires"
                      title="Validity Based"
                    />
                  </View>
                </View>

                {form.benefitType === "discount_balance" ? (
                  <>
                    <Field
                      error={errors.discountBalance}
                      hint="Total discount this plan can hand out. Leave blank to match the membership fee."
                      keyboardType="decimal-pad"
                      label="Discount Balance"
                      onChangeText={(value) => patch({ discountBalance: value })}
                      placeholder={form.price || "0"}
                      prefix={symbol}
                      ref={(input) => {
                        fieldRefs.current.discountBalance = input;
                      }}
                      required
                      value={form.discountBalance}
                    />
                    <View style={styles.preview}>
                      <Text translate style={styles.previewLabel}>Total Discount Balance</Text>
                      <Text style={styles.previewValue}>{formatCurrency(discountBalanceNumber)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.preview}>
                    <Text style={styles.previewLabel}>{`${form.discount || 0}% off every eligible bill`}</Text>
                    <Text style={styles.previewValue}>{`${validDaysNumber || 0} days`}</Text>
                  </View>
                )}
              </>
            ) : null}

            {pricingType === "loyalty" ? (
              <>
                {form.loyaltyTiers.map((tier, index) => (
                  <View key={index} style={styles.tierRow}>
                    <View style={styles.tierFields}>
                      <Field
                        error={errors[`tier${index}Threshold`]}
                        icon="footsteps-outline"
                        keyboardType="number-pad"
                        label="Visit Threshold"
                        onChangeText={(value) => patchTier(index, { threshold: value.replace(/\D/g, "") })}
                        placeholder="e.g. 10"
                        ref={(input) => {
                          fieldRefs.current[`tier${index}Threshold`] = input;
                        }}
                        required
                        value={tier.threshold}
                      />
                      <Field
                        error={errors[`tier${index}Discount`]}
                        icon="pricetag-outline"
                        keyboardType="decimal-pad"
                        label="Discount %"
                        onChangeText={(value) => patchTier(index, { discount: value })}
                        placeholder="Enter discount %"
                        ref={(input) => {
                          fieldRefs.current[`tier${index}Discount`] = input;
                        }}
                        required
                        value={tier.discount}
                      />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      disabled={form.loyaltyTiers.length <= 1}
                      onPress={() => removeTier(index)}
                      style={[styles.tierRemove, form.loyaltyTiers.length <= 1 && styles.disabled]}
                    >
                      <Ionicons color={Colors.error} name="trash-outline" size={15} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity activeOpacity={0.84} onPress={addTier} style={styles.tierAdd}>
                  <Ionicons color={Colors.primaryText} name="add" size={16} />
                  <Text translate style={styles.tierAddText}>Add Tier</Text>
                </TouchableOpacity>

                <Text translate style={styles.hint}>
                  Every client is automatically eligible. Once they reach a tier&apos;s visit count, the highest
                  eligible tier discount is applied during checkout. Tiers do not stack.
                </Text>
              </>
            ) : null}
          </View>

          {/* 3 — Membership Description, after all configuration. */}
          <View style={styles.card}>
            <Text translate style={styles.cardTitle}>Membership Description</Text>
            <Field
              icon="document-text-outline"
              label=""
              maxLength={DESCRIPTION_MAX}
              multiline
              onChangeText={(value) => patch({ description: value })}
              placeholder="Enter additional information about this membership plan."
              value={form.description}
            />
            <Text style={styles.charCount}>{`${form.description.length} / ${DESCRIPTION_MAX} characters`}</Text>
          </View>
        </StickyFooterLayout>
      </SafeAreaView>
    </PearlBackground>
  );
}

function TypeCard({
  icon,
  locked,
  onPress,
  selected,
  subtitle,
  title,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  locked?: boolean;
  onPress: () => void;
  selected: boolean;
  subtitle: string;
  title: string;
}) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const disabled = Boolean(locked) && !selected;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      disabled={disabled}
      onPress={onPress}
      style={[styles.typeCard, selected && styles.typeCardSelected, disabled && styles.disabled]}
    >
      {icon ? (
        <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
          <Ionicons color={selected ? Colors.onPrimary : Colors.primaryText} name={icon} size={16} />
        </View>
      ) : null}
      <View style={styles.typeCopy}>
        <Text translate style={styles.typeTitle}>{title}</Text>
        <Text translate style={styles.typeSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

type FieldProps = {
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  prefix?: string;
  required?: boolean;
} & React.ComponentProps<typeof TextInput>;

const Field = forwardRef<TextInput, FieldProps>(function Field(
  { error, hint, icon, label, prefix, required, ...props },
  ref,
) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.group}>
      {label ? (
        <Text style={styles.label}>
          <Text translate style={styles.label}>{label}</Text>
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          props.multiline && styles.inputContainerMultiline,
          error && styles.inputContainerError,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        {icon ? <Ionicons color={error ? Colors.error : Colors.text2} name={icon} size={18} /> : null}
        <TextInput
          placeholderTextColor={Colors.placeholder}
          ref={ref}
          style={[styles.textInput, props.multiline && styles.textArea]}
          {...props}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text translate style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { paddingBottom: Spacing.lg, paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.sm },
  headerWrap: { paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.sm },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
  headerSpacer: { width: AppLayout.headerActionSize },
  headerTitle: { color: Colors.heading, flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 28, borderWidth: 1, marginBottom: Spacing.md, padding: AppLayout.cardPadding },
  cardTitle: { color: Colors.heading, fontSize: 14, fontWeight: "800", marginBottom: Spacing.md },
  group: { marginBottom: Spacing.lg },
  label: { color: Colors.text2, fontSize: 13, fontWeight: "800", marginBottom: Spacing.sm },
  required: { color: Colors.error, fontSize: 13, fontWeight: "800" },
  hint: { color: Colors.text2, fontSize: 11, fontWeight: "600", marginTop: 6 },
  errorText: { color: Colors.error, fontSize: 12, fontWeight: "700", marginTop: 6 },
  inputContainer: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", gap: Spacing.sm, minHeight: 52, paddingHorizontal: Spacing.md },
  inputContainerError: { borderColor: Colors.error, borderWidth: 1.5 },
  inputContainerMultiline: { alignItems: "flex-start", paddingTop: 14 },
  prefix: { color: Colors.text2, fontSize: 14, fontWeight: "800" },
  textInput: { color: Colors.heading, flex: 1, fontSize: 15, minHeight: 50 },
  textArea: { minHeight: 86, textAlignVertical: "top" },
  charCount: { color: Colors.text2, fontSize: 11, fontWeight: "600", textAlign: "right" },
  typeList: { gap: Spacing.sm },
  benefitList: { gap: Spacing.sm },
  typeCard: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", gap: Spacing.sm, padding: Spacing.md },
  typeCardSelected: { backgroundColor: Colors.backgroundSelected, borderColor: Colors.primary, borderWidth: 1.5 },
  typeIcon: { alignItems: "center", backgroundColor: Colors.card, borderRadius: Radius.full, height: 32, justifyContent: "center", width: 32 },
  typeIconSelected: { backgroundColor: Colors.primary },
  typeCopy: { flex: 1, gap: 2 },
  typeTitle: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  typeSubtitle: { color: Colors.text2, fontSize: 11, fontWeight: "600" },
  radio: { alignItems: "center", borderColor: Colors.border, borderRadius: Radius.full, borderWidth: 1.5, height: 20, justifyContent: "center", width: 20 },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { backgroundColor: Colors.primary, borderRadius: Radius.full, height: 10, width: 10 },
  lockedNote: { color: Colors.text2, fontSize: 11, fontWeight: "600", marginTop: Spacing.sm },
  segmented: { backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: Radius.md, flex: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 6 },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { color: Colors.text2, fontSize: 11, fontWeight: "800", textAlign: "center" },
  segmentTextActive: { color: Colors.onPrimary },
  preview: { alignItems: "center", backgroundColor: Colors.backgroundSelected, borderRadius: AppRadius.control, flexDirection: "row", justifyContent: "space-between", minHeight: 52, paddingHorizontal: Spacing.md },
  previewLabel: { color: Colors.primaryText, flex: 1, fontSize: 12, fontWeight: "700" },
  previewValue: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  tierRow: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.sm },
  tierFields: { flex: 1 },
  tierRemove: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: AppRadius.control, height: 40, justifyContent: "center", marginTop: 26, width: 40 },
  tierAdd: { alignItems: "center", alignSelf: "flex-start", borderColor: Colors.primary, borderRadius: AppRadius.pill, borderWidth: 1, flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  tierAddText: { color: Colors.primaryText, fontSize: 12, fontWeight: "800" },
  messageError: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: AppRadius.control, flexDirection: "row", marginBottom: Spacing.md, padding: Spacing.md },
  messageErrorText: { color: Colors.error, flex: 1, fontSize: 13, fontWeight: "700", marginLeft: Spacing.sm },
  messageSuccess: { alignItems: "center", backgroundColor: Colors.successBg, borderRadius: AppRadius.control, flexDirection: "row", marginBottom: Spacing.md, padding: Spacing.md },
  messageSuccessText: { color: Colors.success, flex: 1, fontSize: 13, fontWeight: "700", marginLeft: Spacing.sm },
  cancelButton: { alignItems: "center", backgroundColor: pearl.glass, borderColor: "rgba(126,120,176,0.45)", borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 50, paddingHorizontal: 20 },
  cancelText: { color: pearl.accentDeep, fontSize: 14, fontWeight: "700" },
  saveButton: { alignItems: "center", borderRadius: 16, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, overflow: "hidden" },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.65 },
});
