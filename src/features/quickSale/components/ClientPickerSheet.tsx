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
import { splitFullName } from "@/utils/name";
import {
  isValidPersonName,
  isValidPhoneDigits,
  PERSON_NAME_INVALID_MESSAGE,
  PHONE_INVALID_MESSAGE,
} from "@/utils/validation";

const normalizePhoneForCompare = (value: string) => value.replace(/\D/g, "");

type ClientPickerSheetProps = {
  onClose: () => void;
  onSelect: (client: ClientListItem | null) => void;
  selectedClientId?: string | null;
  startInCreateMode?: boolean;
  visible: boolean;
};

export function ClientPickerSheet({
  onClose,
  onSelect,
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
  const [pagination, setPagination] = useState({ hasMore: true, limit: 20, nextOffset: 0, offset: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
      limit: 20,
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
    const trimmedName = newName.trim();
    const trimmedPhone = newPhone.trim();

    setFormError(null);

    if (!trimmedName) {
      setFormError("Client name is required.");
      return;
    }

    if (!isValidPersonName(trimmedName)) {
      setFormError(PERSON_NAME_INVALID_MESSAGE);
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

    const normalizedNewPhone = normalizePhoneForCompare(trimmedPhone);
    const isDuplicatePhone = visibleClients.some(
      (client) => normalizePhoneForCompare(client.phone) === normalizedNewPhone,
    );

    if (isDuplicatePhone) {
      setFormError("A client with this phone number already exists.");
      return;
    }

    const namePayload = splitFullName(trimmedName);
    const result = await dispatch(
      createClientThunk({
        first_name: namePayload.first_name,
        last_name: namePayload.last_name,
        phone: trimmedPhone,
      }),
    );

    if (createClientThunk.rejected.match(result)) {
      return;
    }

    onSelect(result.payload.client);
    setIsCreating(false);
    setNewName("");
    setNewPhone("");
    setQuery("");
  };

  const handleClose = () => {
    setIsCreating(false);
    setFormError(null);
    onClose();
  };

  return (
    <StaffBottomSheet
      onClose={handleClose}
      scrollable={false}
      subtitle="Select who this sale is for"
      title="Choose Client"
      visible={visible}
    >
      {isCreating ? (
        <View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setNewName}
              placeholder="Client name"
              placeholderTextColor={Colors.placeholder}
              style={styles.textInput}
              value={newName}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setNewPhone}
              placeholder="Phone number"
              placeholderTextColor={Colors.placeholder}
              style={styles.textInput}
              value={newPhone}
            />
          </View>
          {formError || createError ? <Text style={styles.errorText}>{formError ?? createError}</Text> : null}
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
                <Text style={styles.saveButtonText}>Create &amp; Select</Text>
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
