import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useState } from "react";
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
import { createClientThunk, fetchClientsThunk } from "@/middleware/client/client.thunk";
import {
  selectClientCreateError,
  selectClientCreating,
  selectClientsQuery,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export default function NewClientScreen() {
  const dispatch = useAppDispatch();
  const clientCreating = useAppSelector(selectClientCreating);
  const clientCreateError = useAppSelector(selectClientCreateError);
  const clientsQuery = useAppSelector(selectClientsQuery);

  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number] | "">("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [phone, setPhone] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSubmitting = clientCreating || isFinishing;
  const displayedError = formError ?? clientCreateError;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/clients" as Href);
  };

  const handleSubmit = async () => {
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    setFormError(null);
    setSuccessMessage(null);

    if (!trimmedFullName) {
      setFormError("Client name is required.");
      return;
    }

    if (!trimmedPhone) {
      setFormError("Phone number is required.");
      return;
    }

    const resultAction = await dispatch(
      createClientThunk({
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        full_name: trimmedFullName,
        ...(gender ? { gender } : {}),
        phone: trimmedPhone,
      }),
    );

    if (createClientThunk.rejected.match(resultAction)) {
      setFormError(getRejectedMessage(resultAction.payload, "Unable to create client."));
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Client created successfully.");
    setIsFinishing(true);

    try {
      await dispatch(
        fetchClientsThunk({
          inactive: clientsQuery.inactive,
          limit: clientsQuery.limit,
          offset: 0,
          reset: true,
          search: clientsQuery.search,
          sort_by: clientsQuery.sort_by,
          sort_order: clientsQuery.sort_order,
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
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmitting}
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Client</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <View style={styles.formCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color={Colors.text2} />
                <TextInput
                  autoCapitalize="words"
                  editable={!isSubmitting}
                  onChangeText={setFullName}
                  placeholder="Enter client name"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  textContentType="name"
                  value={fullName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={18} color={Colors.text2} />
                <TextInput
                  editable={!isSubmitting}
                  keyboardType="phone-pad"
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  textContentType="telephoneNumber"
                  value={phone}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={Colors.text2} />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="next"
                  style={styles.textInput}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => {
                  const isSelected = gender === option;

                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.82}
                      disabled={isSubmitting}
                      onPress={() => setGender(option)}
                      style={[styles.genderChip, isSelected && styles.genderChipSelected]}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          isSelected && styles.genderChipTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
                {isSubmitting ? "Saving..." : "Save Client"}
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
    shadowColor: Colors.primaryDark,
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
    minHeight: 42,
    justifyContent: "center",
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
    borderColor: "rgba(75, 143, 104, 0.22)",
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
