import { pearl } from "@/components/auth/pearl/themedPearl";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { InfiniteScrollLoader } from "@/components/ui/InfiniteScrollLoader";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";
import { ClientOptionRow } from "@/features/quickSale/components/ClientOptionRow";
import { EmptyState, ErrorState } from "@/features/quickSale/components/StateViews";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { uniqueById } from "@/features/quickSale/utils/unique";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { ClientSheetActions, ClientSheetFields, type ClientSheetFormErrors, type ClientSheetFormValues } from "@/features/clients/components/ClientSheetForm";
import { splitPhone } from "@/features/quickSale/components/EditClientSheet";
import { getCountryCallingCode, isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import { toClientDatePayload, validateClientDates } from "@/utils/clientDates";
import { createClientThunk } from "@/middleware/client/client.thunk";
import { clientService } from "@/services/client.service";
import { useClientRequiredFields } from "@/services/clientRequiredFields";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import {
  selectClientCreateError,
  selectClientCreating,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ClientListItem } from "@/types/client";
import {
  EMAIL_INVALID_MESSAGE,
  isValidEmail,
  isValidPersonName,
  PERSON_NAME_INVALID_MESSAGE,
  PHONE_INPUT_MAX_LENGTH,
  sanitizePhoneDigits,
} from "@/utils/validation";

// Pearl palette for this sheet. The sheet chrome is already pearl (StaffBottomSheet
// passes pearlStyle); the body used the old theme, so the fields and buttons inside
// came out in the previous colours.
const PICKER_COLORS = {
  bg2: pearl.field,
  border: pearl.fieldBorder,
  error: pearl.dangerText,
  heading: pearl.ink,
  onPrimary: pearl.white,
  placeholder: pearl.placeholder,
  primary: pearl.accent,
  primaryText: pearl.accentDeep,
  text2: pearl.ink2,
} as const;

const normalizePhoneForCompare = (value: string) => value.replace(/\D/g, "");
const DEFAULT_COUNTRY = "IN" as const;
// Quick Sale hands over whatever was typed in the client search. Digits (and the
// punctuation people type into a number) mean a phone was searched; anything else
// is a name, first word first. A searched number becomes E.164, which is what
// the shared form's PhoneInput reads.
const splitPrefill = (value: string) => {
  const text = value.trim();
  if (!text) return { firstName: "", lastName: "", phone: "" };
  if (/^[+()\d\s-]+$/.test(text)) {
    const digits = sanitizePhoneDigits(text).slice(0, PHONE_INPUT_MAX_LENGTH);
    return {
      firstName: "",
      lastName: "",
      phone: digits ? (text.trim().startsWith("+") ? `+${digits}` : `+${getCountryCallingCode(DEFAULT_COUNTRY)}${digits}`) : "",
    };
  }
  const [first, ...rest] = text.split(/\s+/);
  return { firstName: first, lastName: rest.join(" "), phone: "" };
};

const EMPTY_NEW_CLIENT: ClientSheetFormValues = {
  anniversary: "",
  clientSource: "walk_in",
  dob: "",
  email: "",
  firstName: "",
  gender: "",
  lastName: "",
  phone: "",
  phoneCountry: DEFAULT_COUNTRY,
};

type ClientPickerSheetProps = {
  onClose: () => void;
  onSelect: (client: ClientListItem | null) => void;
  // What the caller's search box held when "Add client" was tapped.
  prefillQuery?: string;
  renderInline?: boolean;
  selectedClientId?: string | null;
  startInCreateMode?: boolean;
  visible: boolean;
};

export function ClientPickerSheet({
  onClose,
  onSelect,
  prefillQuery,
  renderInline = false,
  selectedClientId,
  startInCreateMode,
  visible,
}: ClientPickerSheetProps) {
  const Colors = PICKER_COLORS;
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
  const [newClient, setNewClient] = useState<ClientSheetFormValues>(EMPTY_NEW_CLIENT);
  const [formErrors, setFormErrors] = useState<ClientSheetFormErrors>({});
  // Clients screen toggles: DOB / anniversary mandatory for new clients.
  const { config: requiredDates } = useClientRequiredFields();

  const trimmedQuery = debouncedQuery.trim();
  const visibleClients = useMemo(() => uniqueById(clients), [clients]);

  const applyPrefill = useCallback((value: string) => {
    const { firstName, lastName, phone } = splitPrefill(value);
    setNewClient({ ...EMPTY_NEW_CLIENT, firstName, lastName, phone });
    setFormErrors({});
  }, []);

  // A changed field clears its own error; the two dates validate against each
  // other, so either one clears both.
  const handleNewClientChange = (patch: Partial<ClientSheetFormValues>) => {
    setNewClient((current) => ({ ...current, ...patch }));
    setFormErrors((current) => {
      const next = { ...current, form: undefined };
      for (const key of Object.keys(patch)) {
        if (key === "dob" || key === "anniversary") {
          next.anniversary = undefined;
          next.dob = undefined;
        } else if (key in next) {
          next[key as keyof ClientSheetFormErrors] = undefined;
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (visible) {
      setIsCreating(Boolean(startInCreateMode));
      // Carry the search term into the form, so the name or number the user
      // already typed isn't lost when they tap "Add client".
      if (startInCreateMode) applyPrefill(prefillQuery ?? "");
    }
  }, [applyPrefill, prefillQuery, startInCreateMode, visible]);

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
    const trimmedFirstName = newClient.firstName.trim();
    const trimmedLastName = newClient.lastName.trim();
    const trimmedPhone = newClient.phone.trim();
    const trimmedEmail = newClient.email.trim();
    const nextErrors: ClientSheetFormErrors = {};

    if (!trimmedFirstName) nextErrors.firstName = "First name is required.";
    else if (!isValidPersonName(trimmedFirstName)) nextErrors.firstName = PERSON_NAME_INVALID_MESSAGE;
    if (trimmedLastName && !isValidPersonName(trimmedLastName)) nextErrors.lastName = PERSON_NAME_INVALID_MESSAGE;
    // Same rule as the edit sheet now that both share a country-aware field.
    if (!trimmedPhone) {
      nextErrors.phone = "Phone number is required.";
    } else {
      const parsed = isValidPhoneNumber(trimmedPhone) ? parsePhoneNumber(trimmedPhone) : null;
      if (!parsed || parsed.countryCallingCode !== getCountryCallingCode(newClient.phoneCountry)) {
        nextErrors.phone = "Enter a valid phone number for the selected country.";
      }
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) nextErrors.email = EMAIL_INVALID_MESSAGE;
    if (!newClient.gender) nextErrors.gender = "Select a gender.";
    Object.assign(nextErrors, validateClientDates(newClient.dob, newClient.anniversary));
    if (requiredDates.require_dob && !newClient.dob) nextErrors.dob = "Date of birth is required.";
    if (requiredDates.require_doa && !newClient.anniversary) nextErrors.anniversary = "Anniversary date is required.";

    if (Object.values(nextErrors).some(Boolean)) {
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});

    // The stored phone is the national number, so compare against that rather
    // than the E.164 the field holds, or every number looks new.
    const { phone_country_code, phone_number } = splitPhone(trimmedPhone);
    const normalizedNewPhone = normalizePhoneForCompare(phone_number);
    const isDuplicatePhone = visibleClients.some(
      (client) => normalizePhoneForCompare(client.phone) === normalizedNewPhone,
    );

    if (isDuplicatePhone) {
      setFormErrors({ phone: "A client with this phone number already exists." });
      return;
    }

    const result = await dispatch(
      createClientThunk({
        client_source: newClient.clientSource || null,
        email: trimmedEmail || null,
        first_name: trimmedFirstName,
        gender: newClient.gender,
        last_name: trimmedLastName,
        phone_country_code: phone_country_code ?? `+${getCountryCallingCode(newClient.phoneCountry)}`,
        phone_number,
        ...(newClient.dob || newClient.anniversary ? toClientDatePayload(newClient.dob, newClient.anniversary) : {}),
      }),
    );

    if (createClientThunk.rejected.match(result)) {
      return;
    }

    onSelect(result.payload.client);
    setIsCreating(false);
    setNewClient(EMPTY_NEW_CLIENT);
    setFormErrors({});
    setQuery("");
    onClose();
  };

  const handleClose = () => {
    setIsCreating(false);
    setFormErrors({});
    onClose();
  };

  // A failed create reports through the store, a failed validation locally.
  const createFormErrors = formErrors.form || !createError
    ? formErrors
    : { ...formErrors, form: createError };

  return (
    <StaffBottomSheet
      // Inside the Calendar booking pop-up the add-client form has to present
      // itself exactly like the edit-client sheet next to it, which is centered
      // when inline — otherwise one floats mid-form and the other sits on the
      // footer with a drag handle. The client LIST keeps the footer position,
      // where picking from a list belongs. (The booking form always passes
      // startInCreateMode, so it only ever sees the centered form.)
      centered={renderInline && isCreating}
      // Cancel / Create stay pinned below the scrolling fields.
      footer={isCreating ? (
        <ClientSheetActions
          formError={createFormErrors.form}
          // Opened straight into the form (Quick Sale's "Add Client"), so
          // Cancel goes back to the sale rather than to a client list.
          onCancel={startInCreateMode ? handleClose : () => setIsCreating(false)}
          onSubmit={() => void handleCreateClient()}
          submitLabel="Create"
          submitting={creating}
        />
      ) : undefined}
      onClose={handleClose}
      renderInline={renderInline}
      // The new-client form scrolls (and keeps the focused field above the
      // keyboard); the client list keeps its own FlatList scrolling.
      scrollable={isCreating}
      // Adding a client is its own modal, matching the Edit client sheet.
      subtitle={isCreating ? "New client details" : "Select who this sale is for"}
      title={isCreating ? "Add client" : "Choose Client"}
      visible={visible}
    >
      {isCreating ? (
        <ClientSheetFields
          anniversaryLabel={requiredDates.require_doa ? "Anniversary Date *" : "Anniversary Date"}
          dobLabel={requiredDates.require_dob ? "Date of Birth *" : "Date of Birth"}
          errors={createFormErrors}
          genderLabel="Gender *"
          onChange={handleNewClientChange}
          submitting={creating}
          values={newClient}
        />
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
            onPress={() => { applyPrefill(query); setIsCreating(true); }}
            style={styles.newClientButton}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.primaryText} />
            <Text translate style={styles.newClientButtonText}>New Client</Text>
          </TouchableOpacity>



          {error && visibleClients.length === 0 ? (
            <ErrorState message={error} onRetry={handleRetry} />
          ) : loading && visibleClients.length === 0 ? (
            <ActivityIndicator color={pearl.accentDeep} size="small" style={styles.loadingSpacer} />
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
                <InfiniteScrollLoader loading={loadingMore} />
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
                  phone={`${maskPhone(item.phone)}${item.membership ? ` - ${item.membership}` : ""}`}
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

const createStyles = (Colors: typeof PICKER_COLORS) => StyleSheet.create({
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
    color: Colors.primaryText,
    fontSize: 12,
    fontWeight: "800",
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
});
