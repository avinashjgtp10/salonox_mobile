import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { ClientOptionRow } from "@/features/quickSale/components/ClientOptionRow";
import { EmptyState, ErrorState } from "@/features/quickSale/components/StateViews";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { uniqueById } from "@/features/quickSale/utils/unique";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { createClientThunk } from "@/middleware/client/client.thunk";
import { clientService } from "@/services/client.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import {
  selectClientCreateError,
  selectClientCreating,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientListItem } from "@/types/client";
import {
  isValidPersonName,
  isValidPhoneDigits,
  PERSON_NAME_INVALID_MESSAGE,
  PHONE_INVALID_MESSAGE,
} from "@/utils/validation";

const normalizePhoneForCompare = (value: string) => value.replace(/\D/g, "");
const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;
type GenderOption = (typeof GENDER_OPTIONS)[number];
type ClientFormErrors = Partial<Record<"firstName" | "gender" | "lastName" | "phone" | "form", string>>;

type ClientPickerSheetProps = {
  onClose: () => void;
  onSelect: (client: ClientListItem | null) => void;
  renderInline?: boolean;
  selectedClientId?: string | null;
  startInCreateMode?: boolean;
  visible: boolean;
};

export function ClientPickerSheet({
  onClose,
  onSelect,
  renderInline = false,
  selectedClientId,
  startInCreateMode,
  visible,
}: ClientPickerSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const salonId = useAppSelector(selectActiveBranchId);
  const creating = useAppSelector(selectClientCreating);
  const createError = useAppSelector(selectClientCreateError);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ hasMore: true, limit: 10, nextOffset: 0, offset: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGender, setNewGender] = useState<GenderOption | "">("");
  const [formErrors, setFormErrors] = useState<ClientFormErrors>({});

  const trimmedQuery = debouncedQuery.trim();
  const visibleClients = useMemo(() => uniqueById(clients), [clients]);

  // Re-sync every time the sheet opens, not just on mount — the caller may
  // toggle between "browse/pick a client" and "jump straight to create" on
  // successive opens of the same already-mounted sheet instance.
  useEffect(() => {
    if (visible) {
      setIsCreating(Boolean(startInCreateMode));
    }
  }, [startInCreateMode, visible]);

  const loadClients = useCallback(async (offset = 0, append = false) => {
    const search = trimmedQuery;
    const queryPayload = {
      inactive: false,
      limit: 10,
      offset,
      search,
      sort_by: "created_at",
      sort_order: "desc" as const,
    };

    setError(null);
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = search
        ? await clientService.searchClients(queryPayload, salonId)
        : await clientService.getClients(queryPayload, salonId);

      setClients((current) => (append ? uniqueById([...current, ...response.clients]) : response.clients));
      setPagination(response.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load clients.");
      if (!append) {
        setClients([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [salonId, trimmedQuery]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void loadClients();
  }, [loadClients, reloadKey, visible]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !pagination.hasMore) {
      return;
    }

    void loadClients(pagination.nextOffset, true);
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const handleCreateClient = async () => {
    const trimmedFirstName = newFirstName.trim();
    const trimmedLastName = newLastName.trim();
    const trimmedPhone = newPhone.trim();
    const nextErrors: ClientFormErrors = {};

    if (!trimmedFirstName) nextErrors.firstName = "First name is required.";
    else if (!isValidPersonName(trimmedFirstName)) nextErrors.firstName = PERSON_NAME_INVALID_MESSAGE;
    if (trimmedLastName && !isValidPersonName(trimmedLastName)) nextErrors.lastName = PERSON_NAME_INVALID_MESSAGE;
    if (!trimmedPhone) nextErrors.phone = "Phone number is required.";
    else if (!isValidPhoneDigits(trimmedPhone)) nextErrors.phone = PHONE_INVALID_MESSAGE;
    if (!newGender) nextErrors.gender = "Select a gender.";

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});

    const normalizedNewPhone = normalizePhoneForCompare(trimmedPhone);
    const isDuplicatePhone = visibleClients.some(
      (client) => normalizePhoneForCompare(client.phone) === normalizedNewPhone,
    );

    if (isDuplicatePhone) {
      setFormErrors({ phone: "A client with this phone number already exists." });
      return;
    }

    const result = await dispatch(
      createClientThunk({
        first_name: trimmedFirstName,
        gender: newGender,
        last_name: trimmedLastName,
        phone_country_code: "+91",
        phone_number: trimmedPhone,
      }),
    );

    if (createClientThunk.rejected.match(result)) {
      return;
    }

    onSelect(result.payload.client);
    setIsCreating(false);
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setNewGender("");
    setFormErrors({});
    setQuery("");
    onClose();
  };

  const handleClose = () => {
    setIsCreating(false);
    setFormErrors({});
    onClose();
  };

  return (
    <StaffBottomSheet
      centered={renderInline}
      onClose={handleClose}
      renderInline={renderInline}
      scrollable={false}
      subtitle="Select who this sale is for"
      title="Choose Client"
      visible={visible}
    >
      {isCreating ? (
        <View>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.inputLabel}>First Name*</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={(value) => {
                  setNewFirstName(value);
                  setFormErrors((current) => ({ ...current, firstName: undefined, form: undefined }));
                }}
                placeholder="First name"
                placeholderTextColor={Colors.placeholder}
                style={[styles.textInput, formErrors.firstName && styles.inputError]}
                value={newFirstName}
              />
              {formErrors.firstName ? <Text style={styles.fieldError}>{formErrors.firstName}</Text> : null}
            </View>
            <View style={styles.nameField}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={(value) => {
                  setNewLastName(value);
                  setFormErrors((current) => ({ ...current, lastName: undefined, form: undefined }));
                }}
                placeholder="Last name"
                placeholderTextColor={Colors.placeholder}
                style={[styles.textInput, formErrors.lastName && styles.inputError]}
                value={newLastName}
              />
              {formErrors.lastName ? <Text style={styles.fieldError}>{formErrors.lastName}</Text> : null}
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number*</Text>
            <TextInput
              keyboardType="phone-pad"
              maxLength={16}
              onChangeText={(value) => {
                setNewPhone(value);
                setFormErrors((current) => ({ ...current, form: undefined, phone: undefined }));
              }}
              placeholder="Phone number"
              placeholderTextColor={Colors.placeholder}
              style={[styles.textInput, formErrors.phone && styles.inputError]}
              value={newPhone}
            />
            {formErrors.phone ? <Text style={styles.fieldError}>{formErrors.phone}</Text> : null}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender*</Text>
            <View style={[styles.genderOptions, formErrors.gender && styles.inputError]}>
              {GENDER_OPTIONS.map((option) => {
                const selected = newGender === option;
                return (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    key={option}
                    onPress={() => {
                      setNewGender(option);
                      setFormErrors((current) => ({ ...current, form: undefined, gender: undefined }));
                    }}
                    style={[styles.genderOption, selected && styles.genderOptionSelected]}
                  >
                    <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {formErrors.gender ? <Text style={styles.fieldError}>{formErrors.gender}</Text> : null}
          </View>
          {formErrors.form || createError ? <Text style={styles.errorText}>{formErrors.form ?? createError}</Text> : null}
          <View style={styles.formActions}>
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={creating}
              onPress={() => setIsCreating(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={creating}
              onPress={() => void handleCreateClient()}
              style={[styles.saveButton, creating && styles.buttonDisabled]}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.listWrap}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={Colors.text2} />
            <TextInput
              onChangeText={setQuery}
              placeholder="Search by name or phone"
              placeholderTextColor={Colors.placeholder}
              style={styles.searchInput}
              value={query}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setIsCreating(true)}
            style={styles.newClientButton}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.primaryDark} />
            <Text style={styles.newClientButtonText}>New Client</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => {
              onSelect(null);
              handleClose();
            }}
            style={styles.walkInRow}
          >
            <View style={styles.walkInAvatar}>
              <Ionicons name="walk-outline" size={16} color={Colors.primaryDark} />
            </View>
            <Text style={styles.walkInText}>Walk-in Customer</Text>
          </TouchableOpacity>

          {error && visibleClients.length === 0 ? (
            <ErrorState message={error} onRetry={handleRetry} />
          ) : loading && visibleClients.length === 0 ? (
            <ActivityIndicator color={Colors.primary} size="small" style={styles.loadingSpacer} />
          ) : visibleClients.length === 0 ? (
            <EmptyState
              description="Try another search, or create a new client."
              icon="people-outline"
              title="No clients found"
            />
          ) : (
            <FlatList
              contentContainerStyle={styles.clientListContent}
              data={visibleClients}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => `client-picker-${item.id}`}
              ListFooterComponent={
                loadingMore ? <ActivityIndicator color={Colors.primary} size="small" style={styles.loadingSpacer} /> : null
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              renderItem={({ item }) => (
                <ClientOptionRow
                  initials={item.initials}
                  isSelected={selectedClientId === item.id}
                  onPress={() => {
                    onSelect(item);
                    handleClose();
                  }}
                  phone={`${item.phone}${item.membership ? ` - ${item.membership}` : ""}`}
                  title={item.fullName}
                />
              )}
              style={styles.clientList}
            />
          )}
        </View>
      )}
    </StaffBottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  listWrap: {
    minHeight: 260,
    maxHeight: 480,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
  },
  newClientButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newClientButtonText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  walkInRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: 10,
  },
  walkInAvatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  walkInText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  clientList: {
    marginTop: 4,
  },
  clientListContent: {
    paddingBottom: Spacing.sm,
  },
  loadingSpacer: {
    marginVertical: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    gap: 10,
  },
  nameField: {
    flex: 1,
    marginBottom: Spacing.md,
    minWidth: 0,
  },
  inputLabel: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    color: Colors.error,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 4,
  },
  genderOptions: {
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  genderOption: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 4,
  },
  genderOptionSelected: {
    backgroundColor: Colors.primary,
  },
  genderOptionText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
  },
  genderOptionTextSelected: {
    color: Colors.onPrimary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
