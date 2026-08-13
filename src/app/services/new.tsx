import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
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
import { CategorySelectModal } from "@/features/services/components/CategorySelectModal";
import {
  validateServiceField,
  validateServiceForm,
  type ServiceFormErrors,
} from "@/features/services/validation/serviceValidation";
import { createServiceThunk, fetchServicesThunk } from "@/middleware/service/service.thunk";
import {
  selectServiceCreateError,
  selectServiceCreating,
  selectServicesQuery,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceCategoryItem } from "@/types/service";

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export default function NewServiceScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const serviceCreating = useAppSelector(selectServiceCreating);
  const serviceCreateError = useAppSelector(selectServiceCreateError);
  const servicesQuery = useAppSelector(selectServicesQuery);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ServiceFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSubmitting = serviceCreating || isFinishing;
  const displayedError = formError ?? serviceCreateError;

  const handleNameChange = (value: string) => {
    setName(value);
    if (fieldErrors.name !== undefined) {
      const err = validateServiceField("name", value);
      setFieldErrors((prev) => ({ ...prev, name: err }));
    }
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    if (fieldErrors.price !== undefined) {
      const err = validateServiceField("price", value);
      setFieldErrors((prev) => ({ ...prev, price: err }));
    }
  };

  const handleDurationChange = (value: string) => {
    setDurationMinutes(value);
    if (fieldErrors.durationMinutes !== undefined) {
      const err = validateServiceField("durationMinutes", value);
      setFieldErrors((prev) => ({ ...prev, durationMinutes: err }));
    }
  };

  const handleSelectCategory = (cat: ServiceCategoryItem) => {
    setSelectedCategory(cat);
    if (fieldErrors.categoryId !== undefined) {
      const err = validateServiceField("categoryId", cat.id);
      setFieldErrors((prev) => ({ ...prev, categoryId: err }));
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/services" as Href);
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSuccessMessage(null);

    const errors = validateServiceForm({
      categoryId: selectedCategory?.id,
      durationMinutes,
      name,
      price,
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedPrice = price.trim();
    const trimmedDuration = durationMinutes.trim();

    const parsedPrice = Number(trimmedPrice);
    const parsedDuration = Number(trimmedDuration);

    const resultAction = await dispatch(
      createServiceThunk({
        category: selectedCategory?.name,
        category_id: selectedCategory?.id,
        duration_minutes: parsedDuration,
        name: trimmedName,
        price: parsedPrice,
      }),
    );

    if (createServiceThunk.rejected.match(resultAction)) {
      setFormError(getRejectedMessage(resultAction.payload, "Unable to create service."));
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Service created successfully.");
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

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.flex}
      >
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmitting}
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Service</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <View style={styles.formCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="cut-outline" size={24} color={Colors.primary} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Service Name</Text>
              <View
                style={[
                  styles.inputContainer,
                  Boolean(fieldErrors.name) && styles.inputContainerError,
                ]}
              >
                <Ionicons name="pricetag-outline" size={18} color={Colors.text2} />
                <TextInput
                  autoCapitalize="words"
                  editable={!isSubmitting}
                  onChangeText={handleNameChange}
                  placeholder="Enter service name"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={name}
                />
              </View>
              {fieldErrors.name ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price</Text>
              <View
                style={[
                  styles.inputContainer,
                  Boolean(fieldErrors.price) && styles.inputContainerError,
                ]}
              >
                <Ionicons name="cash-outline" size={18} color={Colors.text2} />
                <TextInput
                  editable={!isSubmitting}
                  keyboardType="decimal-pad"
                  onChangeText={handlePriceChange}
                  placeholder="Enter price"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={price}
                />
              </View>
              {fieldErrors.price ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.price}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <View
                style={[
                  styles.inputContainer,
                  Boolean(fieldErrors.durationMinutes) && styles.inputContainerError,
                ]}
              >
                <Ionicons name="time-outline" size={18} color={Colors.text2} />
                <TextInput
                  editable={!isSubmitting}
                  keyboardType="number-pad"
                  onChangeText={handleDurationChange}
                  placeholder="Enter duration in minutes"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={durationMinutes}
                />
              </View>
              {fieldErrors.durationMinutes ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.durationMinutes}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSubmitting}
                onPress={() => setCategoryModalOpen(true)}
                style={[
                  styles.inputContainer,
                  Boolean(fieldErrors.categoryId) && styles.inputContainerError,
                ]}
              >
                <Ionicons name="layers-outline" size={18} color={Colors.text2} />
                <Text
                  style={[
                    styles.selectText,
                    !selectedCategory && styles.selectTextPlaceholder,
                  ]}
                >
                  {selectedCategory ? selectedCategory.name : "Select category"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.text2} />
              </TouchableOpacity>
              {fieldErrors.categoryId ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.categoryId}</Text>
              ) : null}
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
                {isSubmitting ? "Saving..." : "Save Service"}
              </Text>
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>

      <CategorySelectModal
        onClose={() => setCategoryModalOpen(false)}
        onSelectCategory={handleSelectCategory}
        selectedCategoryId={selectedCategory?.id}
        visible={categoryModalOpen}
      />
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
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  textInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    marginLeft: Spacing.sm,
    minHeight: 50,
  },
  selectText: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    marginLeft: Spacing.sm,
  },
  selectTextPlaceholder: {
    color: Colors.placeholder,
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
});
