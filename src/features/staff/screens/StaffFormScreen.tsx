import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { useStaffDetails } from "@/features/staff/hooks/useStaffDetails";
import { useStaffForm } from "@/features/staff/hooks/useStaffForm";
import { generateTimeOptions } from "@/features/staff/utils/timeUtils";

const TIME_OPTIONS = generateTimeOptions();

type StaffFormScreenProps = {
  mode: "create" | "edit";
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

export function StaffFormScreen({ mode }: StaffFormScreenProps) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const staffId = mode === "edit" ? id : null;
  const form = useStaffForm(staffId);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<"work_start_time" | "work_end_time">("work_start_time");

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

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
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
          <StaffTextField
            autoCapitalize="words"
            error={form.validationErrors.fullName}
            label="Full Name"
            onChangeText={(value) => form.updateField("fullName", value)}
            placeholder="Staff full name"
            value={form.values.fullName}
          />

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

          <StaffTextField
            error={form.validationErrors.phone}
            keyboardType="phone-pad"
            label="Phone"
            onChangeText={(value) => form.updateField("phone", value)}
            placeholder="Phone number"
            value={form.values.phone}
          />
          <StaffTextField
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => form.updateField("email", value)}
            placeholder="Email address"
            value={form.values.email}
          />
          <StaffTextField
            autoCapitalize="words"
            label="Role"
            onChangeText={(value) => form.updateField("role", value)}
            placeholder="Stylist, manager, assistant"
            value={form.values.role}
          />
          <StaffTextField
            autoCapitalize="words"
            label="Gender"
            onChangeText={(value) => form.updateField("gender", value)}
            placeholder="Optional"
            value={form.values.gender}
          />
          <StaffTextField
            label="Joining Date"
            onChangeText={(value) => form.updateField("joining_date", value)}
            placeholder="YYYY-MM-DD"
            value={form.values.joining_date}
          />

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

          {form.error ? <Text style={styles.error}>{form.error}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!form.isValid || form.submitting}
            onPress={form.submit}
            style={[styles.saveButton, (!form.isValid || form.submitting) && styles.saveButtonDisabled]}
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
      </ScrollView>

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

const styles = StyleSheet.create({
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
    padding: AppLayout.cardPadding,
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
    backgroundColor: "#F0F7F4",
    borderColor: "#E1EFEA",
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
});
