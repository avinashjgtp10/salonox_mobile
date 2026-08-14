import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CountryCode } from "libphonenumber-js";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { DateField } from "@/components/ui/DateField";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { PasswordField } from "@/components/ui/PasswordField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { useStaffDetails } from "@/features/staff/hooks/useStaffDetails";
import { useStaffForm } from "@/features/staff/hooks/useStaffForm";
import { generateTimeOptions } from "@/features/staff/utils/timeUtils";
import { STAFF_GENDER_OPTIONS, STAFF_ROLE_OPTIONS } from "@/features/staff/validation/staff.validation";
import { getApiErrorMessage } from "@/services/api";
import { useThemeColors } from "@/theme/ThemeProvider";

const TIME_OPTIONS = generateTimeOptions();

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_SIZE_ERROR_MESSAGE = "Profile image must be 2 MB or smaller.";
const AVATAR_TYPE_ERROR_MESSAGE = "Unsupported file type. Please choose a PNG, JPG, or GIF image.";
const ACCEPTED_AVATAR_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif"]);

const STAFF_LOGIN_HELPER_TEXT =
  "Set a password so this staff member can log in with their email above right away. Leave blank to send an email invite instead — they'll set their own password and get the same permissions once they accept it.";

type StaffFormScreenProps = {
  mode: "create" | "edit";
};

const sanitizeDecimalInput = (text: string) => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDotIndex = cleaned.indexOf(".");

  if (firstDotIndex === -1) {
    return cleaned;
  }

  return cleaned.slice(0, firstDotIndex + 1) + cleaned.slice(firstDotIndex + 1).replace(/\./g, "");
};

const sanitizeIntegerInput = (text: string) => text.replace(/[^0-9]/g, "");

const guessMimeTypeFromUri = (uri: string) => {
  const extension = uri.split("?")[0].split(".").pop()?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";

  return "";
};

const getInitials = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "S";

const getAssetSizeBytes = async (uri: string, fileSize?: number | null): Promise<number | null> => {
  if (typeof fileSize === "number" && Number.isFinite(fileSize)) {
    return fileSize;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return blob.size;
  } catch {
    return null;
  }
};

function TimeSelectField({
  error,
  label,
  onPress,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  onPress: () => void;
  placeholder: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.timeGroup}>
      <Text style={styles.timeLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={onPress}
        style={[styles.inputButton, error ? styles.inputButtonError : null]}
      >
        <Text style={[styles.pickerValue, !value ? styles.pickerPlaceholder : null]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.text2} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function SectionHeading({ title }: { title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return <Text style={styles.sectionHeading}>{title}</Text>;
}

function ChipRow<T extends string>({
  disabled,
  onSelect,
  options,
  value,
}: {
  disabled?: boolean;
  onSelect: (option: T | "") => void;
  options: readonly T[];
  value: T | "";
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const isSelected = value === option;

        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.82}
            disabled={disabled}
            // Tapping the already-selected chip clears it instead of being a no-op.
            onPress={() => onSelect(isSelected ? "" : option)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function StaffFormScreen({ mode }: StaffFormScreenProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const staffId = mode === "edit" ? id : null;
  const form = useStaffForm(staffId);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<"work_start_time" | "work_end_time">("work_start_time");
  const [avatarValidationError, setAvatarValidationError] = useState<string | null>(null);

  useStaffDetails(staffId);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/team" as Href);
  };

  const handleOpenTimePicker = (field: "work_start_time" | "work_end_time") => {
    setPickerField(field);
    setIsPickerVisible(true);
  };

  const handleSelectTime = (time: string) => {
    form.updateField(pickerField, time);
    setIsPickerVisible(false);
  };

  const uploadPickedAsset = async (result: ImagePicker.ImagePickerResult) => {
    const asset = result.canceled ? undefined : result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

    const mimeType = (asset.mimeType || guessMimeTypeFromUri(asset.uri)).toLowerCase();

    if (!ACCEPTED_AVATAR_MIME_TYPES.has(mimeType)) {
      setAvatarValidationError(AVATAR_TYPE_ERROR_MESSAGE);
      return;
    }

    const sizeBytes = await getAssetSizeBytes(asset.uri, asset.fileSize);

    if (sizeBytes != null && sizeBytes > MAX_AVATAR_SIZE_BYTES) {
      setAvatarValidationError(AVATAR_SIZE_ERROR_MESSAGE);
      return;
    }

    setAvatarValidationError(null);
    await form.uploadAvatar({ fileName: asset.fileName, mimeType, uri: asset.uri });
  };

  const pickAvatarFromSource = async (source: "camera" | "library") => {
    setAvatarValidationError(null);

    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          Alert.alert("Camera access needed", "Enable camera access in settings to take a photo.");
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          mediaTypes: ["images"],
          quality: 0.7,
        });

        await uploadPickedAsset(result);
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Photo access needed", "Enable photo library access in settings to choose a photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.7,
      });

      await uploadPickedAsset(result);
    } catch (pickerError) {
      Alert.alert("Something went wrong", getApiErrorMessage(pickerError));
    }
  };

  const handlePickAvatar = () => {
    if (form.avatarUploading) {
      return;
    }

    const options: { onPress?: () => void; style?: "cancel" | "destructive"; text: string }[] = [
      { onPress: () => void pickAvatarFromSource("camera"), text: "Take Photo" },
      { onPress: () => void pickAvatarFromSource("library"), text: "Choose from Library" },
    ];

    if (form.values.avatarUrl) {
      options.push({
        onPress: () => {
          setAvatarValidationError(null);
          form.removeAvatar();
        },
        style: "destructive",
        text: "Remove Photo",
      });
    }

    options.push({ style: "cancel", text: "Cancel" });

    Alert.alert("Profile Photo", "Add a profile photo for this staff member", options);
  };

  const avatarDisplayError = avatarValidationError ?? form.avatarError;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primaryDark} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{mode === "edit" ? "Edit Staff" : "Add Staff"}</Text>
            <Text style={styles.subtitle}>
              {mode === "edit"
                ? "Update team profile and work details"
                : "Create a new team profile for your salon"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeading title="Profile Image" />
          <View style={styles.avatarRow}>
            <TouchableOpacity
              accessibilityLabel="Change profile photo"
              activeOpacity={0.85}
              disabled={form.avatarUploading}
              onPress={handlePickAvatar}
              style={styles.avatarWrap}
            >
              {form.values.avatarUrl ? (
                <Image contentFit="cover" source={{ uri: form.values.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>{getInitials(form.values.fullName)}</Text>
                </View>
              )}
              {form.avatarUploading ? (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              ) : (
                <View style={styles.avatarCameraBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.avatarCopy}>
              <Text style={styles.avatarHint}>Accepted formats: PNG, GIF or JPG. Maximum file size is 2.0MB.</Text>
              {avatarDisplayError ? <Text style={styles.avatarError}>{avatarDisplayError}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeading title="Staff Details" />
          <StaffTextField
            autoCapitalize="words"
            error={form.validationErrors.fullName}
            label="Full Name *"
            onChangeText={(value) => form.updateField("fullName", value)}
            placeholder="Staff full name"
            value={form.values.fullName}
          />

          <StaffTextField
            autoCapitalize="none"
            error={form.validationErrors.email}
            keyboardType="email-address"
            label="Email *"
            onChangeText={(value) => form.updateField("email", value)}
            placeholder="Email address"
            value={form.values.email}
          />

          <View style={styles.timeGroup}>
            <Text style={styles.timeLabel}>Contact *</Text>
            <PhoneInput
              country={form.values.phoneCountry as CountryCode}
              error={form.validationErrors.phone}
              onChange={(e164) => form.updateField("phone", e164)}
              onCountryChange={(code) => form.updateField("phoneCountry", code)}
              required
              value={form.values.phone}
            />
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => form.updateField("isAutoGenerate", !form.values.isAutoGenerate)}
              style={styles.checkboxContainer}
            >
              <Ionicons
                name={form.values.isAutoGenerate ? "checkbox" : "square-outline"}
                size={20}
                color={form.values.isAutoGenerate ? Colors.primary : Colors.text2}
              />
              <Text style={styles.toggleLabel}>Auto-generate Employee Code</Text>
            </TouchableOpacity>
          </View>

          <StaffTextField
            autoCapitalize="characters"
            editable={!form.values.isAutoGenerate}
            error={form.validationErrors.employeeCode}
            label="Employee Code"
            onChangeText={(value) => form.updateField("employeeCode", value)}
            placeholder={
              form.values.isAutoGenerate
                ? `Auto-generated: ${form.autoEmployeeCode}`
                : "Enter custom employee code"
            }
            value={form.values.isAutoGenerate ? "" : form.values.employeeCode}
            style={form.values.isAutoGenerate ? styles.disabledInput : null}
          />

          <DateField
            error={form.validationErrors.dob}
            label="Date of Birth"
            maximumDate={new Date()}
            onChange={(value) => form.updateField("dob", value)}
            placeholder="Select date of birth"
            value={form.values.dob}
          />

          <DateField
            error={form.validationErrors.joiningDate}
            label="Date of Joining"
            maximumDate={new Date()}
            onChange={(value) => form.updateField("joiningDate", value)}
            placeholder="Select joining date"
            value={form.values.joiningDate}
          />

          <StaffTextField
            error={form.validationErrors.address}
            label="Address"
            multiline
            onChangeText={(value) => form.updateField("address", value)}
            placeholder="Street, city, state"
            value={form.values.address}
          />

          <View style={styles.timeGroup}>
            <Text style={styles.timeLabel}>Gender *</Text>
            <ChipRow
              onSelect={(option) => form.updateField("gender", option)}
              options={STAFF_GENDER_OPTIONS}
              value={form.values.gender as (typeof STAFF_GENDER_OPTIONS)[number] | ""}
            />
            {form.validationErrors.gender ? (
              <Text style={styles.errorText}>{form.validationErrors.gender}</Text>
            ) : null}
          </View>

          <StaffTextField
            autoCapitalize="words"
            error={form.validationErrors.designation}
            label="Designation"
            onChangeText={(value) => form.updateField("designation", value)}
            placeholder="Stylist, manager, assistant"
            value={form.values.designation}
          />

          <View style={styles.timeGroup}>
            <Text style={styles.timeLabel}>Role</Text>
            <ChipRow
              onSelect={(option) => form.updateField("roleLevel", option)}
              options={STAFF_ROLE_OPTIONS}
              value={form.values.roleLevel}
            />
          </View>

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <StaffTextField
                error={form.validationErrors.hourlyRate}
                keyboardType="decimal-pad"
                label="Hourly Rate"
                onChangeText={(value) => form.updateField("hourlyRate", sanitizeDecimalInput(value))}
                placeholder="Optional"
                value={form.values.hourlyRate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <StaffTextField
                error={form.validationErrors.fixedSalary}
                keyboardType="decimal-pad"
                label="Fixed Salary"
                onChangeText={(value) => form.updateField("fixedSalary", sanitizeDecimalInput(value))}
                placeholder="Optional"
                value={form.values.fixedSalary}
              />
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <StaffTextField
                error={form.validationErrors.workingHoursPerDay}
                keyboardType="decimal-pad"
                label="Working Hours/Day"
                onChangeText={(value) => form.updateField("workingHoursPerDay", sanitizeDecimalInput(value))}
                placeholder="Optional"
                value={form.values.workingHoursPerDay}
              />
            </View>
            <View style={{ flex: 1 }}>
              <StaffTextField
                error={form.validationErrors.holidays}
                keyboardType="number-pad"
                label="Holidays"
                onChangeText={(value) => form.updateField("holidays", sanitizeIntegerInput(value))}
                placeholder="Optional"
                value={form.values.holidays}
              />
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <TimeSelectField
                error={form.validationErrors.work_start_time}
                label="Start Time"
                onPress={() => handleOpenTimePicker("work_start_time")}
                placeholder="Select start"
                value={form.values.work_start_time}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TimeSelectField
                error={form.validationErrors.work_end_time}
                label="End Time"
                onPress={() => handleOpenTimePicker("work_end_time")}
                placeholder="Select end"
                value={form.values.work_end_time}
              />
            </View>
          </View>

          {form.values.work_start_time && form.values.work_end_time && !form.validationErrors.work_end_time ? (
            <View style={styles.rangePreview}>
              <Ionicons name="time-outline" size={14} color={Colors.primary} />
              <Text style={styles.rangePreviewText}>
                Working Hours: {form.values.work_start_time} – {form.values.work_end_time}
              </Text>
            </View>
          ) : null}

          <StaffTextField
            label="Notes"
            multiline
            onChangeText={(value) => form.updateField("notes", value)}
            placeholder="Internal notes"
            value={form.values.notes}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.loginHeaderRow}>
            <Text style={styles.sectionHeading}>Staff Login</Text>
            <Switch
              onValueChange={(value) => form.updateField("isLoginEnabled", value)}
              thumbColor="#FFFFFF"
              trackColor={{ false: Colors.border, true: Colors.primary }}
              value={form.values.isLoginEnabled}
            />
          </View>

          {form.values.isLoginEnabled ? (
            <>
              <PasswordField
                error={form.validationErrors.password}
                label="Password"
                onChangeText={(value) => form.updateField("password", value)}
                placeholder="Password"
                value={form.values.password}
              />
              <PasswordField
                error={form.validationErrors.confirmPassword}
                label="Confirm Password"
                onChangeText={(value) => form.updateField("confirmPassword", value)}
                placeholder="Confirm Password"
                value={form.values.confirmPassword}
              />
              <Text style={styles.loginHint}>{STAFF_LOGIN_HELPER_TEXT}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          {form.error ? <Text style={styles.error}>{form.error}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={form.submitting}
            onPress={form.submit}
            style={[styles.saveButton, form.submitting && styles.saveButtonDisabled]}
          >
            {form.submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {mode === "edit" ? "Update Staff" : "Create Staff"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <StaffBottomSheet
        title={`Select ${pickerField === "work_start_time" ? "Start" : "End"} Time`}
        subtitle="Choose a time at 30-minute intervals"
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.timeOptionsContainer}>
          {TIME_OPTIONS.map((timeOption) => {
            const isSelected =
              pickerField === "work_start_time"
                ? form.values.work_start_time === timeOption
                : form.values.work_end_time === timeOption;

            return (
              <TouchableOpacity
                key={timeOption}
                activeOpacity={0.84}
                onPress={() => handleSelectTime(timeOption)}
                style={[styles.timeOptionItem, isSelected ? styles.timeOptionItemActive : null]}
              >
                <Text style={[styles.timeOptionText, isSelected ? styles.timeOptionTextActive : null]}>
                  {timeOption}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </StaffBottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: AppLayout.headerMarginBottom,
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
  headerCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: AppLayout.headerSubtitleFontSize,
    lineHeight: 20,
    marginTop: AppLayout.headerSubtitleMarginTop,
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: AppLayout.cardPadding,
  },
  sectionHeading: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  error: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    justifyContent: "center",
    minHeight: 50,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  disabledInput: {
    opacity: 0.65,
  },
  toggleRow: {
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  toggleLabel: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  timeGroup: {
    marginBottom: Spacing.md,
  },
  timeLabel: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  inputButton: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  inputButtonError: {
    borderColor: Colors.error,
  },
  pickerValue: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "500",
  },
  pickerPlaceholder: {
    color: Colors.placeholder,
  },
  errorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  timeRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  rangePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.successBg,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: Spacing.md,
  },
  rangePreviewText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  timeOptionsContainer: {
    gap: 2,
    paddingBottom: Spacing.xl,
  },
  timeOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  timeOptionItemActive: {
    backgroundColor: Colors.bg2,
  },
  timeOptionText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  timeOptionTextActive: {
    color: Colors.primary,
    fontWeight: "800",
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  chip: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "800",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  avatarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  avatarWrap: {
    height: 72,
    width: 72,
  },
  avatarImage: {
    backgroundColor: Colors.bg2,
    borderRadius: 36,
    height: 72,
    width: 72,
  },
  avatarPlaceholder: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  avatarPlaceholderText: {
    color: Colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
  },
  avatarCameraBadge: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.card,
    borderRadius: 13,
    borderWidth: 2,
    bottom: -2,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 26,
  },
  avatarUploadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 32, 0.45)",
    borderRadius: 36,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  avatarCopy: {
    flex: 1,
  },
  avatarHint: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 17,
  },
  avatarError: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  loginHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  loginHint: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
});
