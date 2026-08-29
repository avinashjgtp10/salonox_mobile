import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { AppLayout, AppRadius } from "@/constants/layout";
import { type ThemeColors } from "@/constants/theme";
import { CategorySelectModal } from "@/features/services/components/CategorySelectModal";
import { createServiceThunk, fetchServicesThunk } from "@/middleware/service/service.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectServiceCreateError,
  selectServiceCreating,
  selectServicesQuery,
} from "@/store/service/service.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceCategoryItem } from "@/types/service";

type FieldErrors = {
  categoryId?: string;
  duration?: string;
  name?: string;
  price?: string;
  reminderDays?: string;
};

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const parseNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function NewServiceScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const serviceCreating = useAppSelector(selectServiceCreating);
  const serviceCreateError = useAppSelector(selectServiceCreateError);
  const servicesQuery = useAppSelector(selectServicesQuery);

  const [active, setActive] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState("0");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [name, setName] = useState("");
  const [onlineBooking, setOnlineBooking] = useState(true);
  const [price, setPrice] = useState("");
  const [reminderDays, setReminderDays] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSubmitting = serviceCreating || isFinishing;
  const displayedError = formError ?? serviceCreateError;
  const parsedHours = Math.max(0, parseNumber(durationHours) ?? 0);
  const parsedMinutes = Math.max(0, parseNumber(durationMinutes) ?? 0);
  const totalDuration = parsedHours * 60 + parsedMinutes;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/services" as Href);
  };

  const validate = () => {
    const errors: FieldErrors = {};
    const trimmedName = name.trim();
    const numericPrice = parseNumber(price);
    const hours = parseNumber(durationHours);
    const minutes = parseNumber(durationMinutes);
    const reminder = reminderDays.trim() ? parseNumber(reminderDays) : 0;

    if (!trimmedName) errors.name = "Service Name is required.";
    if (!selectedCategory?.id) errors.categoryId = "Category is required.";
    if (numericPrice === null || numericPrice < 0) errors.price = "Price is required.";
    if (hours === null || minutes === null || hours < 0 || minutes < 0 || hours * 60 + minutes <= 0) {
      errors.duration = "Duration is required.";
    }
    if (reminder === null || reminder < 0) errors.reminderDays = "Service Reminder must be zero or more.";

    setFieldErrors(errors);
    return errors;
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSuccessMessage(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) return;

    const reminder = reminderDays.trim() ? Number(reminderDays.trim()) : undefined;
    const resultAction = await dispatch(
      createServiceThunk({
        category: selectedCategory?.name,
        category_id: selectedCategory?.id,
        description: description.trim() || undefined,
        duration_minutes: totalDuration,
        is_active: active,
        is_online_booking: onlineBooking,
        name: name.trim(),
        price: Number(price.trim()),
        service_reminder_days: reminder,
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Service</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity activeOpacity={0.84} disabled={isSubmitting} onPress={handleBack} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={() => void handleSubmit()} style={[styles.saveButton, isSubmitting && styles.disabled]}>
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Details</Text>

            <Field
              editable={!isSubmitting}
              error={fieldErrors.name}
              label="Service Name *"
              onChangeText={setName}
              value={name}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={isSubmitting}
                onPress={() => setCategoryModalOpen(true)}
                style={[styles.input, styles.selectInput, Boolean(fieldErrors.categoryId) && styles.inputError]}
              >
                <Text style={[styles.selectText, !selectedCategory && styles.placeholder]}>
                  {selectedCategory?.name ?? "Search category..."}
                </Text>
                <Ionicons color={Colors.text2} name="chevron-down" size={17} />
              </TouchableOpacity>
              {fieldErrors.categoryId ? <Text style={styles.fieldError}>{fieldErrors.categoryId}</Text> : null}
            </View>

            <TouchableOpacity activeOpacity={0.8} disabled={isSubmitting} onPress={() => setCategoryModalOpen(true)}>
              <Text style={styles.inlineLink}>+ Add a category</Text>
            </TouchableOpacity>

            <Field
              editable={!isSubmitting}
              inputStyle={styles.textArea}
              label="Description"
              multiline
              onChangeText={setDescription}
              value={description}
            />

            <View style={styles.priceDurationRow}>
              <Field
                editable={!isSubmitting}
                error={fieldErrors.price}
                keyboardType="decimal-pad"
                label="Price *"
                onChangeText={setPrice}
                value={price}
              />
              <View style={styles.durationWrap}>
                <Text style={styles.label}>Duration *</Text>
                <View style={styles.durationInputs}>
                  <UnitInput
                    editable={!isSubmitting}
                    error={Boolean(fieldErrors.duration)}
                    onChangeText={setDurationHours}
                    suffix="hr"
                    value={durationHours}
                  />
                  <UnitInput
                    editable={!isSubmitting}
                    error={Boolean(fieldErrors.duration)}
                    onChangeText={setDurationMinutes}
                    suffix="min"
                    value={durationMinutes}
                  />
                </View>
                <Text style={styles.durationTotal}>{totalDuration} min total</Text>
                {fieldErrors.duration ? <Text style={styles.fieldError}>{fieldErrors.duration}</Text> : null}
              </View>
            </View>

            <Field
              editable={!isSubmitting}
              error={fieldErrors.reminderDays}
              keyboardType="number-pad"
              label="Service Reminder (days)"
              onChangeText={setReminderDays}
              placeholder="e.g. 30"
              value={reminderDays}
            />
            <Text style={styles.helperText}>Optional - remind the client to redo this service after this many days. Leave blank if it has no redo cadence.</Text>

            <Text style={styles.availabilityTitle}>Availability</Text>
            <CheckboxRow checked={onlineBooking} disabled={isSubmitting} label="Available for online booking" onPress={() => setOnlineBooking((current) => !current)} />
            <CheckboxRow checked={active} disabled={isSubmitting} label="Active (appears when booking appointments)" onPress={() => setActive((current) => !current)} />

            {displayedError ? (
              <View style={styles.errorContainer} accessibilityRole="alert">
                <Ionicons color={Colors.error} name="alert-circle-outline" size={18} />
                <Text style={styles.errorText}>{displayedError}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successContainer} accessibilityRole="alert">
                <Ionicons color={Colors.success} name="checkmark-circle-outline" size={18} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      <CategorySelectModal
        onClose={() => setCategoryModalOpen(false)}
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          setFieldErrors((current) => ({ ...current, categoryId: undefined }));
        }}
        selectedCategoryId={selectedCategory?.id}
        type="service"
        visible={categoryModalOpen}
      />
    </SafeAreaView>
  );
}

function Field({
  error,
  inputStyle,
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { error?: string; inputStyle?: object; label: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, props.multiline && styles.multilineInput, Boolean(error) && styles.inputError, inputStyle]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function UnitInput({
  editable,
  error,
  onChangeText,
  suffix,
  value,
}: {
  editable: boolean;
  error: boolean;
  onChangeText: (value: string) => void;
  suffix: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={[styles.unitInput, error && styles.inputError]}>
      <TextInput
        editable={editable}
        keyboardType="number-pad"
        onChangeText={onChangeText}
        placeholderTextColor={Colors.placeholder}
        style={styles.unitTextInput}
        value={value}
      />
      <Text style={styles.unitSuffix}>{suffix}</Text>
    </View>
  );
}

function CheckboxRow({
  checked,
  disabled,
  label,
  onPress,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={0.84} disabled={disabled} onPress={onPress} style={styles.checkboxRow}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons color="#FFFFFF" name="checkmark" size={15} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  content: { paddingBottom: AppLayout.contentBottomPadding, paddingHorizontal: 16 },
  header: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -16,
    marginBottom: 30,
    minHeight: 72,
    paddingHorizontal: 16,
  },
  headerTitle: { color: Colors.heading, flex: 1, fontSize: 21, fontWeight: "800" },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 12 },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 24,
  },
  closeText: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 28,
  },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: { color: Colors.heading, fontSize: 18, fontWeight: "800", marginBottom: 18 },
  field: { marginBottom: 18 },
  label: { color: Colors.text2, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  input: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  inputError: { borderColor: Colors.error },
  multilineInput: { minHeight: 96, textAlignVertical: "top" },
  textArea: { minHeight: 96 },
  selectInput: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  selectText: { color: Colors.heading, flex: 1, fontSize: 15 },
  placeholder: { color: Colors.placeholder },
  inlineLink: { color: Colors.primary, fontSize: 14, fontWeight: "800", marginBottom: 24 },
  priceDurationRow: { flexDirection: "row", gap: 14 },
  durationWrap: { flex: 1, marginBottom: 18 },
  durationInputs: { flexDirection: "row", gap: 10 },
  durationTotal: { color: Colors.text2, fontSize: 13, marginTop: 8 },
  unitInput: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 10,
  },
  unitTextInput: { color: Colors.heading, flex: 1, fontSize: 15, minHeight: 46, paddingVertical: 8 },
  unitSuffix: { color: Colors.text2, fontSize: 15, marginLeft: 8 },
  helperText: { color: Colors.text2, fontSize: 14, lineHeight: 20, marginBottom: 20, marginTop: -10 },
  availabilityTitle: { color: Colors.text2, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  checkboxRow: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 14 },
  checkbox: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxLabel: { color: Colors.heading, flex: 1, fontSize: 15, fontWeight: "700" },
  fieldError: { color: Colors.error, fontSize: 12, fontWeight: "600", marginTop: 6 },
  errorContainer: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: Colors.error, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  successContainer: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: { color: Colors.success, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  disabled: { opacity: 0.72 },
});
