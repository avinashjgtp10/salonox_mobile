import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { ConsumablesSection } from "@/features/services/components/ConsumablesSection";
import { fetchServiceByIdThunk, fetchServicesThunk, updateServiceThunk } from "@/middleware/service/service.thunk";
import {
  selectServiceById,
  selectServiceDetailsError,
  selectServiceDetailsLoading,
  selectServiceUpdateError,
  selectServiceUpdating,
  selectServicesQuery,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableRecipeItem } from "@/types/consumable";
import { useValidationScroll } from "@/hooks/useValidationScroll";

type ServiceEditField = "duration" | "name" | "price";
type ServiceEditFieldErrors = Partial<Record<ServiceEditField, string>>;
const VALIDATION_FIELD_ORDER: ServiceEditField[] = ["name", "price", "duration"];

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export default function EditServiceScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();

  const liveService = useAppSelector((state) => selectServiceById(state, id));
  const detailsLoading = useAppSelector(selectServiceDetailsLoading);
  const detailsError = useAppSelector(selectServiceDetailsError);
  const serviceUpdating = useAppSelector(selectServiceUpdating);
  const serviceUpdateError = useAppSelector(selectServiceUpdateError);
  const servicesQuery = useAppSelector(selectServicesQuery);
  const { scrollToFirstError, scrollViewRef, setFieldRef } = useValidationScroll(VALIDATION_FIELD_ORDER);

  const [category, setCategory] = useState("");
  const [consumables, setConsumables] = useState<ConsumableRecipeItem[]>([]);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ServiceEditFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const hasPrefilledRef = useRef(false);

  const isSubmitting = serviceUpdating || isFinishing;
  const displayedError = formError ?? serviceUpdateError;

  useEffect(() => {
    if (id) {
      void dispatch(fetchServiceByIdThunk(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (!hasPrefilledRef.current && liveService) {
      setName(liveService.name);
      setPrice(String(liveService.price));
      setDurationMinutes(liveService.durationMinutes ? String(liveService.durationMinutes) : "");
      setCategory(liveService.category ?? "");
      setConsumables(liveService.consumablesUsed ?? []);
      hasPrefilledRef.current = true;
    }
  }, [liveService]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/services" as Href);
  };

  const handleSubmit = async () => {
    if (!id) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedPrice = price.trim();
    const trimmedDuration = durationMinutes.trim();
    const trimmedCategory = category.trim();

    setFormError(null);
    setSuccessMessage(null);

    const nextErrors: ServiceEditFieldErrors = {};
    if (!trimmedName) nextErrors.name = "Service name is required.";
    const parsedPrice = Number(trimmedPrice);
    if (!trimmedPrice) nextErrors.price = "Price is required.";
    else if (!Number.isFinite(parsedPrice) || parsedPrice < 0) nextErrors.price = "Enter a valid price.";

    let parsedDuration: number | undefined;

    if (trimmedDuration) {
      parsedDuration = Number(trimmedDuration);

      if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
        nextErrors.duration = "Enter a valid duration in minutes.";
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    const resultAction = await dispatch(
      updateServiceThunk({
        serviceId: id,
        updates: {
          ...(trimmedCategory ? { category: trimmedCategory } : {}),
          consumables_used: consumables.map((item) => ({
            product_id: item.productId,
            qty: item.qty,
            unit: item.unit,
          })),
          ...(typeof parsedDuration === "number" ? { duration_minutes: parsedDuration } : {}),
          name: trimmedName,
          price: parsedPrice,
        },
      }),
    );

    if (updateServiceThunk.rejected.match(resultAction)) {
      setFormError(getRejectedMessage(resultAction.payload, "Unable to update service."));
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Service updated successfully.");
    setIsFinishing(true);

    try {
      await dispatch(
        fetchServicesThunk({
          isActive: servicesQuery.isActive,
          limit: servicesQuery.limit,
          offset: 0,
          reset: true,
          search: servicesQuery.search,
          sort_by: servicesQuery.sort_by,
          sort_order: servicesQuery.sort_order,
        }),
      );
    } finally {
      setTimeout(() => {
        handleBack();
        setIsFinishing(false);
      }, 650);
    }
  };

  if (detailsLoading && !liveService) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.centeredWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Service</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailsError && !liveService) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.centeredWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Service</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Unable to load service</Text>
            <Text style={styles.notFoundSubtitle}>{detailsError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.flex}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmitting}
              hitSlop={AppLayout.headerActionHitSlop}
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Service</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <View style={styles.formCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="create-outline" size={24} color={Colors.primary} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Service Name</Text>
              <View style={[styles.inputContainer, fieldErrors.name && styles.inputContainerError]}>
                <Ionicons name="pricetag-outline" size={18} color={fieldErrors.name ? Colors.error : Colors.text2} />
                <TextInput
                  ref={(input) => setFieldRef("name", input)}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                  onChangeText={(value) => { setName(value); setFieldErrors((current) => ({ ...current, name: undefined })); }}
                  placeholder="Enter service name"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={name}
                />
              </View>
              {fieldErrors.name ? <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price</Text>
              <View style={[styles.inputContainer, fieldErrors.price && styles.inputContainerError]}>
                <Ionicons name="cash-outline" size={18} color={fieldErrors.price ? Colors.error : Colors.text2} />
                <TextInput
                  ref={(input) => setFieldRef("price", input)}
                  editable={!isSubmitting}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => { setPrice(value); setFieldErrors((current) => ({ ...current, price: undefined })); }}
                  placeholder="Enter price"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={price}
                />
              </View>
              {fieldErrors.price ? <Text style={styles.fieldErrorText}>{fieldErrors.price}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <View style={[styles.inputContainer, fieldErrors.duration && styles.inputContainerError]}>
                <Ionicons name="time-outline" size={18} color={fieldErrors.duration ? Colors.error : Colors.text2} />
                <TextInput
                  ref={(input) => setFieldRef("duration", input)}
                  editable={!isSubmitting}
                  keyboardType="number-pad"
                  onChangeText={(value) => { setDurationMinutes(value); setFieldErrors((current) => ({ ...current, duration: undefined })); }}
                  placeholder="Enter duration in minutes"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={durationMinutes}
                />
              </View>
              {fieldErrors.duration ? <Text style={styles.fieldErrorText}>{fieldErrors.duration}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="layers-outline" size={18} color={Colors.text2} />
                <TextInput
                  autoCapitalize="words"
                  editable={!isSubmitting}
                  onChangeText={setCategory}
                  placeholder="Enter category (optional)"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="done"
                  style={styles.textInput}
                  value={category}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Consumables</Text>
              <ConsumablesSection disabled={isSubmitting} onChange={setConsumables} value={consumables} />
            </View>

            {displayedError ? (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.errorText}>{displayedError}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successContainer} accessibilityRole="alert">
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  centeredWrap: {
    flex: 1,
    padding: Spacing.lg,
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    width: AppLayout.headerActionSize,
  },
  backButtonPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  iconWrap: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 56,
    justifyContent: "center",
    marginBottom: Spacing.xl,
    width: 56,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  inputContainerError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  textInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    marginLeft: Spacing.sm,
    minHeight: 50,
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  errorText: {
    color: Colors.error,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
  successContainer: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  successText: {
    color: Colors.success,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: AppLayout.cardPadding,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: Spacing.sm,
  },
  notFoundCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  notFoundTitle: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  notFoundSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
