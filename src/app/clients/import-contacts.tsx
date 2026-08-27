import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton, AppBackButtonPlaceholder } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { StateIllustration } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { normalizeContactForImport, type NormalizedImportContact } from "@/utils/contactMapper";
import { requestContactsPermission } from "@/utils/contactsPermission";

type Stage =
  | "checking"
  | "request"
  | "denied"
  | "loading"
  | "load-error"
  | "preview"
  | "importing"
  | "result";

type OutcomeStatus = "failed" | "imported" | "skipped";

type ImportOutcome = {
  contact: NormalizedImportContact;
  reason?: string;
  status: OutcomeStatus;
};

// A handful of requests in flight at once — enough to feel fast without
// hammering the API with hundreds of simultaneous POST /clients calls.
const IMPORT_CONCURRENCY = 4;

const openDeviceSettings = () => {
  if (Platform.OS === "ios") {
    void Linking.openURL("app-settings:");
    return;
  }

  void Linking.openSettings();
};

const dedupeByPhone = (entries: NormalizedImportContact[]) => {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.phoneCountryCode}${entry.phoneNumber}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export default function ImportContactsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const salonId = useAppSelector(selectActiveBranchId);

  const [stage, setStage] = useState<Stage>("checking");
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<NormalizedImportContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([]);
  const [showFailedDetails, setShowFailedDetails] = useState(false);
  const importTokenRef = useRef(0);

  const loadContacts = useCallback(async () => {
    setStage("loading");
    setLoadError(null);

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      const normalized = dedupeByPhone(
        data
          .map(normalizeContactForImport)
          .filter((entry): entry is NormalizedImportContact => entry !== null),
      ).sort((a, b) => a.displayName.localeCompare(b.displayName));

      setContacts(normalized);
      setSelectedIds(new Set(normalized.map((entry) => entry.deviceContactId)));

      if (normalized.length === 0) {
        setLoadError("No contacts with a valid phone number were found on this device.");
        setStage("load-error");
        return;
      }

      setStage("preview");
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
      setStage("load-error");
    }
  }, []);

  const checkPermission = useCallback(async () => {
    setStage("checking");

    try {
      const { status, canAskAgain: askAgain } = await Contacts.getPermissionsAsync();

      if (status === Contacts.PermissionStatus.GRANTED) {
        void loadContacts();
        return;
      }

      setCanAskAgain(askAgain);
      setStage("request");
    } catch {
      setCanAskAgain(true);
      setStage("request");
    }
  }, [loadContacts]);

  useEffect(() => {
    void checkPermission();
    // Runs once on mount only — checkPermission's identity is stable enough
    // for a screen entry check, and re-running it on every re-render would
    // fight the user's own permission-flow navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent the hardware back button (and, via the header, the on-screen
  // back button) from leaving the screen mid-import — the batch keeps
  // running in the background either way, so leaving would just strand the
  // user without a progress/result view for a request that's already in flight.
  useEffect(() => {
    if (stage !== "importing") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [stage]);

  const handleAllowAccess = async () => {
    const result = await requestContactsPermission();
    setCanAskAgain(result.canAskAgain);

    if (result.granted) {
      void loadContacts();
      return;
    }

    setStage("denied");
  };

  const trimmedQuery = query.trim().toLowerCase();
  const visibleContacts = useMemo(() => {
    if (!trimmedQuery) {
      return contacts;
    }

    return contacts.filter(
      (contact) =>
        contact.displayName.toLowerCase().includes(trimmedQuery) ||
        contact.phoneNumber.includes(trimmedQuery),
    );
  }, [contacts, trimmedQuery]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    visibleContacts.length > 0 && visibleContacts.every((contact) => selectedIds.has(contact.deviceContactId));

  const toggleContact = useCallback((deviceContactId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(deviceContactId)) {
        next.delete(deviceContactId);
      } else {
        next.add(deviceContactId);
      }

      return next;
    });
  }, []);

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        visibleContacts.forEach((contact) => next.delete(contact.deviceContactId));
      } else {
        visibleContacts.forEach((contact) => next.add(contact.deviceContactId));
      }

      return next;
    });
  };

  const runImport = async (targets: NormalizedImportContact[]) => {
    const token = ++importTokenRef.current;

    setImportTotal(targets.length);
    setImportProgress(0);
    setOutcomes([]);
    setShowFailedDetails(false);
    setStage("importing");

    const results: ImportOutcome[] = [];
    let completed = 0;
    let cursor = 0;

    const worker = async () => {
      while (cursor < targets.length) {
        const contact = targets[cursor];
        cursor += 1;

        try {
          await clientService.createClient({
            ...(contact.email ? { email: contact.email } : {}),
            first_name: contact.firstName,
            ...(contact.lastName ? { last_name: contact.lastName } : {}),
            phone_country_code: contact.phoneCountryCode,
            phone_number: contact.phoneNumber,
            ...(salonId ? { salon_id: salonId } : {}),
          });
          results.push({ contact, status: "imported" });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            results.push({ contact, reason: error.message, status: "skipped" });
          } else {
            results.push({ contact, reason: getApiErrorMessage(error), status: "failed" });
          }
        } finally {
          completed += 1;
          if (importTokenRef.current === token) {
            setImportProgress(completed);
          }
        }
      }
    };

    const workerCount = Math.min(IMPORT_CONCURRENCY, targets.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (importTokenRef.current !== token) {
      return;
    }

    setOutcomes(results);
    setStage("result");

    if (results.some((result) => result.status === "imported")) {
      void dispatch(fetchClientsThunk({ refresh: true, reset: true }));
    }
  };

  const handleStartImport = () => {
    const targets = contacts.filter((contact) => selectedIds.has(contact.deviceContactId));

    if (targets.length === 0) {
      return;
    }

    void runImport(targets);
  };

  const handleImportAgain = () => {
    const retryTargets = new Set(
      outcomes.filter((outcome) => outcome.status === "failed").map((outcome) => outcome.contact.deviceContactId),
    );

    setSelectedIds(retryTargets.size > 0 ? retryTargets : new Set(contacts.map((c) => c.deviceContactId)));
    setStage("preview");
  };

  const handleDone = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/clients" as Href);
  };

  const importedCount = outcomes.filter((outcome) => outcome.status === "imported").length;
  const skippedCount = outcomes.filter((outcome) => outcome.status === "skipped").length;
  const failedOutcomes = outcomes.filter((outcome) => outcome.status === "failed");

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <View style={styles.headerRow}>
        {stage === "importing" ? (
          <AppBackButtonPlaceholder />
        ) : (
          <AppBackButton onPress={handleDone} />
        )}
        <Text style={styles.headerTitle}>Import Contacts</Text>
      </View>

      {stage === "checking" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : null}

      {stage === "request" ? (
        <View style={styles.centerFill}>
          <StateIllustration Colors={Colors} accent="blue" icon="people-outline" />
          <Text style={styles.stateTitle}>Access your phone contacts</Text>
          <Text style={styles.stateDescription}>
            SalonOX needs access to your phone contacts to import them as clients. We only read
            names, phone numbers, and emails — nothing is changed on your device.
          </Text>
          <TouchableOpacity activeOpacity={0.88} onPress={handleAllowAccess} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Allow Contacts Access</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {stage === "denied" ? (
        <View style={styles.centerFill}>
          <StateIllustration Colors={Colors} accent="error" icon="lock-closed-outline" />
          <Text style={styles.stateTitle}>Contacts access denied</Text>
          <Text style={styles.stateDescription}>
            {canAskAgain
              ? "SalonOX can't import your contacts without permission. You can try again."
              : "Contacts permission was permanently denied. Enable it from your device settings to continue."}
          </Text>
          {canAskAgain ? (
            <TouchableOpacity activeOpacity={0.88} onPress={handleAllowAccess} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.88} onPress={openDeviceSettings} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {stage === "loading" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Reading your contacts…</Text>
        </View>
      ) : null}

      {stage === "load-error" ? (
        <View style={styles.centerFill}>
          <StateIllustration Colors={Colors} accent="error" icon="alert-circle-outline" />
          <Text style={styles.stateTitle}>Couldn&apos;t load contacts</Text>
          <Text style={styles.stateDescription}>{loadError}</Text>
          <TouchableOpacity activeOpacity={0.88} onPress={loadContacts} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {stage === "preview" ? (
        <>
          <View style={styles.previewHeader}>
            <Text style={styles.previewCount}>
              {contacts.length} contact{contacts.length === 1 ? "" : "s"} found · {selectedCount} selected
            </Text>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={Colors.text2} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search by name or number"
                placeholderTextColor={Colors.text2}
                style={styles.searchInput}
                value={query}
              />
              {query.trim().length > 0 ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={16} color={Colors.text2} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity activeOpacity={0.84} onPress={toggleSelectAllVisible} style={styles.selectAllRow}>
              <Ionicons
                color={allVisibleSelected ? Colors.primary : Colors.text2}
                name={allVisibleSelected ? "checkbox" : "square-outline"}
                size={18}
              />
              <Text style={styles.selectAllText}>
                {allVisibleSelected ? "Deselect All" : "Select All"}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            contentContainerStyle={styles.listContent}
            data={visibleContacts}
            initialNumToRender={16}
            keyExtractor={(item) => item.deviceContactId}
            renderItem={({ item }) => (
              <ContactRow
                contact={item}
                isSelected={selectedIds.has(item.deviceContactId)}
                onToggle={() => toggleContact(item.deviceContactId)}
              />
            )}
            windowSize={8}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={selectedCount === 0}
              onPress={handleStartImport}
              style={[styles.primaryButton, selectedCount === 0 && styles.primaryButtonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {selectedCount === 0 ? "Select contacts to import" : `Import ${selectedCount} Contact${selectedCount === 1 ? "" : "s"}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {stage === "importing" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.progressCount}>
            {importProgress} / {importTotal}
          </Text>
          <Text style={styles.stateDescription}>Importing contacts — please don&apos;t leave this screen.</Text>
          <View style={styles.progressStatsRow}>
            <ProgressStat color={Colors.success} label="Imported" value={outcomes.filter((o) => o.status === "imported").length} />
            <ProgressStat color={Colors.text2} label="Skipped" value={outcomes.filter((o) => o.status === "skipped").length} />
            <ProgressStat color={Colors.error} label="Failed" value={outcomes.filter((o) => o.status === "failed").length} />
          </View>
        </View>
      ) : null}

      {stage === "result" ? (
        <View style={styles.centerFill}>
          <StateIllustration Colors={Colors} accent="green" icon="checkmark-circle-outline" />
          <Text style={styles.stateTitle}>Import Complete</Text>
          <View style={styles.resultCard}>
            <ResultRow color={Colors.success} icon="checkmark-circle" label="Imported" value={importedCount} />
            <ResultRow color={Colors.text2} icon="return-up-forward" label="Already Existing" value={skippedCount} />
            <ResultRow color={Colors.error} icon="close-circle" label="Failed" value={failedOutcomes.length} />
          </View>

          {failedOutcomes.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setShowFailedDetails((current) => !current)}
              style={styles.failedToggle}
            >
              <Text style={styles.failedToggleText}>
                {showFailedDetails ? "Hide failed contacts" : "View failed contacts"}
              </Text>
              <Ionicons
                color={Colors.primary}
                name={showFailedDetails ? "chevron-up" : "chevron-down"}
                size={16}
              />
            </TouchableOpacity>
          ) : null}

          {showFailedDetails ? (
            <View style={styles.failedList}>
              {failedOutcomes.map((outcome) => (
                <View key={outcome.contact.deviceContactId} style={styles.failedItem}>
                  <Text style={styles.failedItemName}>{outcome.contact.displayName}</Text>
                  <Text style={styles.failedItemReason}>{outcome.reason ?? "Unknown error"}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.resultActions}>
            {failedOutcomes.length > 0 ? (
              <TouchableOpacity activeOpacity={0.86} onPress={handleImportAgain} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Retry Failed</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity activeOpacity={0.88} onPress={handleDone} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ContactRow({
  contact,
  isSelected,
  onToggle,
}: {
  contact: NormalizedImportContact;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onToggle} style={styles.contactRow}>
      <Ionicons
        color={isSelected ? Colors.primary : Colors.text2}
        name={isSelected ? "checkbox" : "square-outline"}
        size={20}
      />
      <View style={styles.contactCopy}>
        <Text numberOfLines={1} style={styles.contactName}>{contact.displayName}</Text>
        <Text numberOfLines={1} style={styles.contactMeta}>
          {contact.phoneDisplay}
          {contact.email ? ` · ${contact.email}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ProgressStat({ color, label, value }: { color: string; label: string; value: number }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.progressStat}>
      <Text style={[styles.progressStatValue, { color }]}>{value}</Text>
      <Text style={styles.progressStatLabel}>{label}</Text>
    </View>
  );
}

function ResultRow({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.resultRow}>
      <Ionicons color={color} name={icon} size={18} />
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, { color }]}>{value}</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: Colors.bg,
      flex: 1,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingTop: Spacing.sm,
      minHeight: 58,
    },
    headerTitle: {
      color: Colors.heading,
      fontSize: 20,
      fontWeight: "800",
    },
    centerFill: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: AppLayout.contentHorizontalPadding,
    },
    stateTitle: {
      color: Colors.heading,
      fontSize: 17,
      fontWeight: "800",
      marginTop: Spacing.md,
      textAlign: "center",
    },
    stateDescription: {
      color: Colors.text2,
      fontSize: 13,
      lineHeight: 19,
      marginTop: Spacing.sm,
      textAlign: "center",
    },
    loadingText: {
      color: Colors.text2,
      fontSize: 13,
      fontWeight: "600",
      marginTop: Spacing.md,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: AppRadius.pill,
      justifyContent: "center",
      marginTop: Spacing.xl,
      minHeight: 54,
      paddingHorizontal: Spacing.xl,
      width: "100%",
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.pill,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 54,
      paddingHorizontal: Spacing.xl,
    },
    secondaryButtonText: {
      color: Colors.heading,
      fontSize: 14,
      fontWeight: "800",
    },
    previewHeader: {
      gap: Spacing.sm,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingTop: Spacing.sm,
    },
    previewCount: {
      color: Colors.text2,
      fontSize: 12,
      fontWeight: "700",
    },
    searchRow: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.control,
      borderWidth: 1,
      flexDirection: "row",
      gap: Spacing.sm,
      minHeight: 46,
      paddingHorizontal: Spacing.md,
    },
    searchInput: {
      color: Colors.heading,
      flex: 1,
      fontSize: 14,
    },
    selectAllRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      paddingVertical: Spacing.xs,
    },
    selectAllText: {
      color: Colors.heading,
      fontSize: 13,
      fontWeight: "700",
    },
    listContent: {
      paddingBottom: AppLayout.contentBottomPadding,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
    },
    contactRow: {
      alignItems: "center",
      borderBottomColor: Colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: Spacing.md,
      minHeight: 58,
      paddingVertical: 10,
    },
    contactCopy: {
      flex: 1,
      minWidth: 0,
    },
    contactName: {
      color: Colors.heading,
      fontSize: 14,
      fontWeight: "700",
    },
    contactMeta: {
      color: Colors.text2,
      fontSize: 12,
      marginTop: 2,
    },
    footer: {
      backgroundColor: Colors.bg,
      borderTopColor: Colors.border,
      borderTopWidth: 1,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    progressCount: {
      color: Colors.heading,
      fontSize: 26,
      fontWeight: "900",
      marginTop: Spacing.lg,
    },
    progressStatsRow: {
      flexDirection: "row",
      gap: Spacing.xl,
      marginTop: Spacing.lg,
    },
    progressStat: {
      alignItems: "center",
    },
    progressStatValue: {
      fontSize: 18,
      fontWeight: "900",
    },
    progressStatLabel: {
      color: Colors.text2,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 2,
    },
    resultCard: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      gap: Spacing.sm,
      marginTop: Spacing.lg,
      padding: Spacing.lg,
      width: "100%",
    },
    resultRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.sm,
    },
    resultLabel: {
      color: Colors.heading,
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
    },
    resultValue: {
      fontSize: 16,
      fontWeight: "900",
    },
    failedToggle: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      marginTop: Spacing.md,
    },
    failedToggleText: {
      color: Colors.primary,
      fontSize: 12,
      fontWeight: "800",
    },
    failedList: {
      marginTop: Spacing.sm,
      maxHeight: 160,
      width: "100%",
    },
    failedItem: {
      borderBottomColor: Colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingVertical: 8,
    },
    failedItemName: {
      color: Colors.heading,
      fontSize: 13,
      fontWeight: "700",
    },
    failedItemReason: {
      color: Colors.error,
      fontSize: 11,
      marginTop: 2,
    },
    resultActions: {
      gap: Spacing.sm,
      marginTop: Spacing.xl,
      width: "100%",
    },
  });
