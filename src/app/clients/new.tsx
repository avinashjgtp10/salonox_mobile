import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  createClientThunk,
  filterClientsThunk,
  fetchClientByIdThunk,
  fetchClientsThunk,
  searchClientsThunk,
  updateClientThunk,
} from "@/middleware/client/client.thunk";
import {
  selectClientById,
  selectClientCreateError,
  selectClientCreating,
  selectClientDetailsError,
  selectClientDetailsLoading,
  selectClientUpdateError,
  selectClientUpdating,
  selectClientsActiveFilter,
  selectClientsQuery,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { EMAIL_INVALID_MESSAGE, isValidEmail, isValidPhoneDigits, PHONE_INVALID_MESSAGE } from "@/utils/validation";
import { splitFullName } from "@/utils/name";

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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const dispatch = useAppDispatch();
  const client = useAppSelector((state) => selectClientById(state, id));
  const clientCreating = useAppSelector(selectClientCreating);
  const clientCreateError = useAppSelector(selectClientCreateError);
  const clientDetailsError = useAppSelector(selectClientDetailsError);
  const clientDetailsLoading = useAppSelector(selectClientDetailsLoading);
  const clientUpdateError = useAppSelector(selectClientUpdateError);
  const clientUpdating = useAppSelector(selectClientUpdating);
  const clientsActiveFilter = useAppSelector(selectClientsActiveFilter);
  const clientsQuery = useAppSelector(selectClientsQuery);
  const hasPrefilledRef = useRef(false);

  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number] | "">("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [phone, setPhone] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditMode = Boolean(id);
  const isSubmitting = clientCreating || clientUpdating || isFinishing;
  const displayedError = formError ?? (isEditMode ? clientUpdateError : clientCreateError);

  useEffect(() => {
    if (id) {
      void dispatch(fetchClientByIdThunk(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!hasPrefilledRef.current && client) {
      setFullName(client.fullName);
      setPhone(client.phone === "-" ? "" : client.phone);
      setEmail(client.email === "-" ? "" : client.email);
      setGender(
        GENDER_OPTIONS.includes(client.gender as (typeof GENDER_OPTIONS)[number])
          ? (client.gender as (typeof GENDER_OPTIONS)[number])
          : "",
      );
      hasPrefilledRef.current = true;
    }
  }, [client]);

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

    if (!isValidPhoneDigits(trimmedPhone)) {
      setFormError(PHONE_INVALID_MESSAGE);
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setFormError(EMAIL_INVALID_MESSAGE);
      return;
    }

    const namePayload = splitFullName(trimmedFullName);
    const clientPayload = {
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      first_name: namePayload.first_name,
      ...(gender ? { gender } : {}),
      last_name: namePayload.last_name,
      phone: trimmedPhone,
    };

    if (id) {
      const resultAction = await dispatch(
        updateClientThunk({ clientId: id, updates: clientPayload }),
      );

      if (updateClientThunk.rejected.match(resultAction)) {
        setFormError(getRejectedMessage(resultAction.payload, "Unable to update client."));
        return;
      }

      setSuccessMessage(resultAction.payload.message ?? "Client updated successfully.");
      setIsFinishing(true);

      setTimeout(() => {
        if (returnTo === "booking") {
          router.replace({ pathname: "/bookings/new", params: { clientId: id } } as Href);
        } else {
          handleBack();
        }
        setIsFinishing(false);
      }, 650);
      return;
    }

    const resultAction = await dispatch(createClientThunk(clientPayload));

    if (createClientThunk.rejected.match(resultAction)) {
      setFormError(getRejectedMessage(resultAction.payload, "Unable to create client."));
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Client created successfully.");
    setIsFinishing(true);

    try {
      const refreshArgs = {
        inactive: clientsQuery.inactive,
        limit: clientsQuery.limit,
        offset: 0,
        reset: true,
        search: clientsQuery.search,
        sort_by: clientsQuery.sort_by,
        sort_order: clientsQuery.sort_order,
      };

      if (clientsActiveFilter) {
        await dispatch(filterClientsThunk({ ...refreshArgs, filter: clientsActiveFilter }));
      } else if (clientsQuery.search) {
        await dispatch(searchClientsThunk(refreshArgs));
      } else {
        await dispatch(fetchClientsThunk(refreshArgs));
      }
    } finally {
      setTimeout(() => {
        if (returnTo === "booking") {
          router.replace({ pathname: "/bookings/new", params: { clientId: resultAction.payload.client.id } } as Href);
        } else {
          handleBack();
        }
        setIsFinishing(false);
      }, 650);
    }
  };

  if (isEditMode && clientDetailsLoading && !client) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isEditMode && clientDetailsError && !client) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>{clientDetailsError}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={handleBack} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Go Back</Text>
          </TouchableOpacity>
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
            <Text style={styles.headerTitle}>{isEditMode ? "Edit Client" : "New Client"}</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <View style={styles.formCard}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={isEditMode ? "create-outline" : "person-add-outline"}
                size={24}
                color={Colors.primary}
              />
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
                {isSubmitting ? "Saving..." : isEditMode ? "Update Client" : "Save Client"}
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
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.lg,
    justifyContent: "center",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
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
    borderColor: "rgba(114, 106, 99, 0.18)",
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
    borderColor: "rgba(28, 25, 23, 0.12)",
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
