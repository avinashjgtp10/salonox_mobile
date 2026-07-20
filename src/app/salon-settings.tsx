import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
import { fetchSalonMeThunk, updateSalonThunk } from "@/middleware/salon/salon.thunk";
import {
  selectSalonById,
  selectSalonDetailsError,
  selectSalonDetailsLoading,
  selectSalonUpdating,
} from "@/store/salon/salon.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import {
  EMAIL_INVALID_MESSAGE,
  isValidEmail,
  isValidPhoneDigits,
  PHONE_INVALID_MESSAGE,
} from "@/utils/validation";

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

function FormField({
  autoCapitalize,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  autoCapitalize?: "none" | "words";
  keyboardType?: "default" | "email-address" | "phone-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "-"}</Text>
    </View>
  );
}

export default function SalonSettingsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const [loadedSalonId, setLoadedSalonId] = useState<string | null>(null);
  const salon = useAppSelector((state) =>
    selectSalonById(state, loadedSalonId ?? currentUser?.salonId),
  );
  const detailsLoading = useAppSelector(selectSalonDetailsLoading);
  const detailsError = useAppSelector(selectSalonDetailsError);
  const isUpdating = useAppSelector(selectSalonUpdating);

  const [address, setAddress] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const hasPrefilledRef = useRef(false);

  const loadSalon = useCallback(async () => {
    const resultAction = await dispatch(fetchSalonMeThunk());

    if (fetchSalonMeThunk.fulfilled.match(resultAction)) {
      setLoadedSalonId(resultAction.payload.id);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadSalon();
  }, [loadSalon]);

  useEffect(() => {
    if (!hasPrefilledRef.current && salon) {
      setBusinessName(salon.businessName || salon.name);
      setEmail(salon.email);
      setPhone(salon.phone);
      setAddress(salon.address);
      setCity(salon.city);
      setPostalCode(salon.postalCode);
      hasPrefilledRef.current = true;
    }
  }, [salon]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/more" as Href);
  };

  const handleSave = async () => {
    if (!salon) {
      return;
    }

    const trimmedBusinessName = businessName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    setFormError(null);
    setSuccessMessage(null);

    if (!trimmedBusinessName) {
      setFormError("Business name is required.");
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setFormError(EMAIL_INVALID_MESSAGE);
      return;
    }

    if (trimmedPhone && !isValidPhoneDigits(trimmedPhone)) {
      setFormError(PHONE_INVALID_MESSAGE);
      return;
    }

    const resultAction = await dispatch(
      updateSalonThunk({
        formFields: {
          address: address.trim(),
          businessName: trimmedBusinessName,
          city: city.trim(),
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
          name: trimmedBusinessName,
          phone: trimmedPhone,
          postalCode: postalCode.trim(),
        },
        salonId: salon.id,
      }),
    );

    if (updateSalonThunk.rejected.match(resultAction)) {
      setFormError(getRejectedMessage(resultAction.payload, "Unable to update salon."));
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Salon updated successfully.");
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isUpdating}
        onPress={handleBack}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={18} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Salon Settings</Text>
      <View style={styles.backButtonPlaceholder} />
    </View>
  );

  if (detailsLoading && !salon) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailsError && !salon) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load salon</Text>
            <Text style={styles.stateSubtitle}>{detailsError}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void loadSalon()}
              style={styles.stateButton}
            >
              <Text style={styles.stateButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!salon) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Salon not available</Text>
            <Text style={styles.stateSubtitle}>
              We couldn&apos;t find salon details for your account.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void loadSalon()}
              style={styles.stateButton}
            >
              <Text style={styles.stateButtonText}>Reload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
          refreshControl={
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={() => void loadSalon()}
              refreshing={detailsLoading && Boolean(salon)}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}

          <View style={styles.formCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="storefront-outline" size={24} color={Colors.primary} />
            </View>

            <FormField
              autoCapitalize="words"
              label="Business Name"
              onChangeText={setBusinessName}
              placeholder="Enter business name"
              value={businessName}
            />

            <FormField
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="Enter salon email"
              value={email}
            />

            <FormField
              keyboardType="phone-pad"
              label="Phone Number"
              onChangeText={setPhone}
              placeholder="Enter phone number"
              value={phone}
            />

            <FormField
              autoCapitalize="words"
              label="Address"
              onChangeText={setAddress}
              placeholder="Enter address"
              value={address}
            />

            <FormField
              autoCapitalize="words"
              label="City"
              onChangeText={setCity}
              placeholder="Enter city"
              value={city}
            />

            <FormField
              label="Postal Code"
              onChangeText={setPostalCode}
              placeholder="Enter postal code"
              value={postalCode}
            />

            {formError ? (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.errorText}>{formError}</Text>
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
              disabled={isUpdating}
              onPress={handleSave}
              style={[styles.submitButton, isUpdating && styles.submitButtonDisabled]}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.submitButtonText}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Salon Information</Text>
            <DetailRow label="Status" value={salon.status} />
            <DetailRow label="Country" value={salon.country} />
            <DetailRow label="State" value={salon.state} />
            <DetailRow label="Timezone" value={salon.timezone} />
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
  stateWrap: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
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
  textInput: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: "rgba(114, 106, 99, 0.18)",
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
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
  },
  successContainer: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderColor: "rgba(28, 25, 23, 0.12)",
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
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
  infoCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 13,
  },
  detailValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  stateSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  stateButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
