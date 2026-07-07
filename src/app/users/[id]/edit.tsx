import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { fetchUserByIdThunk, updateUserThunk } from "@/middleware/users/users.thunk";
import {
  selectUserDetail,
  selectUserDetailError,
  selectUserDetailLoading,
  selectUserUpdating,
} from "@/store/users/users.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
const isValidDateOfBirth = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

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

export default function EditUserScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();

  const detail = useAppSelector(selectUserDetail);
  const detailLoading = useAppSelector(selectUserDetailLoading);
  const detailError = useAppSelector(selectUserDetailError);
  const isUpdating = useAppSelector(selectUserUpdating);

  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [phone, setPhone] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const hasPrefilledRef = useRef(false);

  const user = detail && detail.id === id ? detail : null;
  const isSubmitting = isUpdating || isFinishing;

  useEffect(() => {
    if (id && (!detail || detail.id !== id)) {
      void dispatch(fetchUserByIdThunk(id));
    }
  }, [detail, dispatch, id]);

  useEffect(() => {
    if (!hasPrefilledRef.current && user) {
      setFullName(user.fullName);
      setEmail(user.email === "-" ? "" : user.email);
      setPhone(user.phone === "-" ? "" : user.phone);
      setGender(user.gender ?? "");
      setDateOfBirth(user.dateOfBirth ?? "");
      setAddress(user.address ?? "");
      hasPrefilledRef.current = true;
    }
  }, [user]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/users" as Href);
  };

  const handleSubmit = async () => {
    if (!id) {
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedDob = dateOfBirth.trim();

    setFormError(null);
    setSuccessMessage(null);

    if (!trimmedName) {
      setFormError("Full name is required.");
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (trimmedDob && !isValidDateOfBirth(trimmedDob)) {
      setFormError("Enter date of birth as YYYY-MM-DD.");
      return;
    }

    const resultAction = await dispatch(
      updateUserThunk({
        updates: {
          address: address.trim(),
          dateOfBirth: trimmedDob,
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
          fullName: trimmedName,
          gender: gender.trim(),
          phone: phone.trim(),
        },
        userId: id,
      }),
    );

    if (updateUserThunk.rejected.match(resultAction)) {
      setFormError(getRejectedMessage(resultAction.payload, "Unable to update user."));
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "User updated successfully.");
    setIsFinishing(true);

    setTimeout(() => {
      handleBack();
      setIsFinishing(false);
    }, 650);
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isSubmitting}
        onPress={handleBack}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={18} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit User</Text>
      <View style={styles.backButtonPlaceholder} />
    </View>
  );

  if (detailLoading && !user) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailError && !user) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load user</Text>
            <Text style={styles.stateSubtitle}>{detailError}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => id && dispatch(fetchUserByIdThunk(id))}
              style={styles.stateButton}
            >
              <Text style={styles.stateButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}

          <View style={styles.formCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="create-outline" size={24} color={Colors.primary} />
            </View>

            <FormField
              autoCapitalize="words"
              label="Full Name"
              onChangeText={setFullName}
              placeholder="Enter full name"
              value={fullName}
            />

            <FormField
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="Enter email address"
              value={email}
            />

            <FormField
              keyboardType="phone-pad"
              label="Phone Number"
              onChangeText={setPhone}
              placeholder="Enter phone number"
              value={phone}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => {
                  const isSelected = gender.toLowerCase() === option.toLowerCase();

                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.82}
                      disabled={isSubmitting}
                      onPress={() => setGender(option)}
                      style={[styles.genderChip, isSelected && styles.genderChipSelected]}
                    >
                      <Text style={[styles.genderChipText, isSelected && styles.genderChipTextSelected]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <FormField
              label="Date of Birth"
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              value={dateOfBirth}
            />

            <FormField
              autoCapitalize="words"
              label="Address"
              onChangeText={setAddress}
              placeholder="Enter address"
              value={address}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: Colors.primaryDark,
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
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  genderChip: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  genderChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderChipText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "800",
  },
  genderChipTextSelected: {
    color: "#FFFFFF",
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: "rgba(214, 91, 91, 0.22)",
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
    borderColor: "rgba(75, 143, 104, 0.22)",
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
