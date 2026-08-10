import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { createServiceThunk, fetchServicesThunk } from "@/middleware/service/service.thunk";
import {
  selectServiceCreateError,
  selectServiceCreating,
  selectServicesQuery,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";

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

  const [category, setCategory] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSubmitting = serviceCreating || isFinishing;
  const displayedError = formError ?? serviceCreateError;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/services" as Href);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedPrice = price.trim();
    const trimmedDuration = durationMinutes.trim();
    const trimmedCategory = category.trim();

    setFormError(null);
    setSuccessMessage(null);

    if (!trimmedName) {
      setFormError("Service name is required.");
      return;
    }

    if (!trimmedPrice) {
      setFormError("Price is required.");
      return;
    }

    const parsedPrice = Number(trimmedPrice);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Enter a valid price.");
      return;
    }

    let parsedDuration: number | undefined;

    if (trimmedDuration) {
      parsedDuration = Number(trimmedDuration);

      if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
        setFormError("Enter a valid duration in minutes.");
        return;
      }
    }

    const resultAction = await dispatch(
      createServiceThunk({
        ...(trimmedCategory ? { category: trimmedCategory } : {}),
        ...(typeof parsedDuration === "number" ? { duration_minutes: parsedDuration } : {}),
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              <View style={styles.inputContainer}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.text2} />
                <TextInput
                  autoCapitalize="words"
                  editable={!isSubmitting}
                  onChangeText={setName}
                  placeholder="Enter service name"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={name}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cash-outline" size={18} color={Colors.text2} />
                <TextInput
                  editable={!isSubmitting}
                  keyboardType="decimal-pad"
                  onChangeText={setPrice}
                  placeholder="Enter price"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={price}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="time-outline" size={18} color={Colors.text2} />
                <TextInput
                  editable={!isSubmitting}
                  keyboardType="number-pad"
                  onChangeText={setDurationMinutes}
                  placeholder="Enter duration in minutes"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  value={durationMinutes}
                />
              </View>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
});
