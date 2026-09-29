import { Ionicons } from "@expo/vector-icons";
import { useMemo, type RefObject } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { ProfileCard } from "@/features/profile/components/ProfileSections";
import type { ProfileEditState } from "@/features/profile/utils/profileFormat";
import { useThemeColors } from "@/theme/ThemeProvider";
import { PHONE_DIGIT_COUNT, sanitizePhoneDigits } from "@/utils/validation";

export type ProfileFieldErrors = Partial<Record<"fullName" | "phone", string>>;

export type ProfileInputRefs = Record<keyof ProfileEditState, RefObject<TextInput | null>>;

type ProfileEditFormProps = {
  fieldErrors: ProfileFieldErrors;
  inputRefs: ProfileInputRefs;
  isSaving: boolean;
  onChangeField: (key: keyof ProfileEditState, value: string) => void;
  onSave: () => void;
  values: ProfileEditState;
};

export function ProfileEditForm({
  fieldErrors,
  inputRefs,
  isSaving,
  onChangeField,
  onSave,
  values,
}: ProfileEditFormProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <>
      <ProfileCard icon="person-outline" subtitle="Your name, email and contact details" title="Personal Information">
        <FormField
          error={fieldErrors.fullName}
          inputRef={inputRefs.fullName}
          label="Full Name"
          onChangeText={(value) => onChangeField("fullName", value)}
          onSubmitEditing={() => inputRefs.phone.current?.focus()}
          placeholder="Enter full name"
          value={values.fullName}
        />
        <FormField
          error={fieldErrors.phone}
          inputRef={inputRefs.phone}
          keyboardType="phone-pad"
          label="Phone Number"
          maxLength={PHONE_DIGIT_COUNT}
          onChangeText={(value) => onChangeField("phone", sanitizePhoneDigits(value))}
          onSubmitEditing={() => inputRefs.businessName.current?.focus()}
          placeholder="Enter phone number"
          value={values.phone}
        />
      </ProfileCard>

      <ProfileCard icon="business-outline" iconTone="purple" subtitle="Your salon's business details and location" title="Salon Information">
        <FormField
          inputRef={inputRefs.businessName}
          label="Salon Name"
          onChangeText={(value) => onChangeField("businessName", value)}
          onSubmitEditing={() => inputRefs.address.current?.focus()}
          placeholder="Enter salon name"
          value={values.businessName}
        />
        <FormField
          inputRef={inputRefs.address}
          label="Address"
          onChangeText={(value) => onChangeField("address", value)}
          onSubmitEditing={onSave}
          placeholder="Enter address"
          returnKeyType="done"
          value={values.address}
        />
      </ProfileCard>

      <TouchableOpacity
        activeOpacity={0.88}
        disabled={isSaving}
        onPress={onSave}
        style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
        )}
        <Text style={styles.submitButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
      </TouchableOpacity>
    </>
  );
}

function FormField({
  error,
  inputRef,
  keyboardType,
  label,
  maxLength,
  onChangeText,
  onSubmitEditing,
  placeholder,
  returnKeyType = "next",
  value,
}: {
  error?: string;
  inputRef: RefObject<TextInput | null>;
  keyboardType?: "default" | "phone-pad";
  label: string;
  maxLength?: number;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType?: "done" | "next";
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        ref={inputRef}
        returnKeyType={returnKeyType}
        blurOnSubmit={returnKeyType === "done"}
        style={[styles.textInput, error && styles.textInputError]}
        value={value}
      />
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  textInputError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
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
