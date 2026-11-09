import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { SettingsButton, useSettingsStyles } from "@/features/settings/SettingsUI";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, FlatList, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBackButton, AppBackButtonPlaceholder } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { StateIllustration } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePearlColors as useThemeColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
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
  const settingsUi = useSettingsStyles();
  const insets = useSafeAreaInsets();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const allContactsSelected = contacts.length > 0 && selectedCount === contacts.length;

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

  const selectAllContacts = () => {
    setSelectedIds(new Set(contacts.map((contact) => contact.deviceContactId)));
  };

  const deselectAllContacts = () => {
    setSelectedIds(new Set());
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
    <PearlBackground><SafeAreaView edges={stage === "preview" ? ["top"] : ["top", "bottom"]} style={[styles.safeArea, { backgroundColor: "transparent" }]}>
      <AppStatusBar />
      <View style={styles.headerRow}>
        {stage === "importing" ? (
          <AppBackButtonPlaceholder />
        ) : (
          <AppBackButton onPress={handleDone} />
        )}
        <Text translate style={styles.headerTitle}>Import contacts</Text>
      </View>

      {stage === "checking" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primaryText} size="large" />
        </View>
      ) : null}

      {stage === "request" ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20, gap: 16 }}>
          <View style={{ alignItems: "center", gap: 10 }}><View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: pearl.infoBg, alignItems: "center", justifyContent: "center" }}><Ionicons name="people-outline" size={30} color={pearl.accentDeep} /></View><Text translate style={[settingsUi.heading, { textAlign: "center" }]}>Bring your clients in</Text><Text translate style={[settingsUi.body, { textAlign: "center" }]}>SalonOX reads names, phone numbers and emails from your phone to create client profiles. Nothing is messaged without your say.</Text></View>
          <View style={settingsUi.card}><View style={settingsUi.row}><Ionicons name="checkmark-circle-outline" size={22} color={pearl.accentDeep} /><View style={{ flex: 1 }}><Text translate style={settingsUi.title}>Only contacts you pick</Text><Text translate style={settingsUi.muted}>Choose who to import on the next screen</Text></View></View><View style={settingsUi.row}><Ionicons name="shield-checkmark-outline" size={22} color={pearl.accentDeep} /><View style={{ flex: 1 }}><Text translate style={settingsUi.title}>Stays private</Text><Text translate style={settingsUi.muted}>Never shared or sold</Text></View></View></View>
          <SettingsButton label="Allow contacts access" onPress={handleAllowAccess} />
          <TouchableOpacity accessibilityRole="button" onPress={openDeviceSettings} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text translate style={{ color: pearl.accentDeep }}>Denied earlier? Open phone settings</Text></TouchableOpacity>
        </ScrollView>
      ) : null}

      {stage === "denied" ? (
        <View style={styles.centerFill}>
          <StateIllustration Colors={Colors} accent="error" icon="lock-closed-outline" />
          <Text translate style={styles.stateTitle}>Contacts access denied</Text>
          <Text translate style={styles.stateDescription}>
            {canAskAgain
              ? "SalonOX can't import your contacts without permission. You can try again."
              : "Contacts permission was permanently denied. Enable it from your device settings to continue."}
          </Text>
          {canAskAgain ? (
            <TouchableOpacity activeOpacity={0.88} onPress={handleAllowAccess} style={styles.primaryButton}><LinearGradient pointerEvents="none" colors={pearlGradients.primary} style={StyleSheet.absoluteFill} />
              <Text translate style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.88} onPress={openDeviceSettings} style={styles.primaryButton}><LinearGradient pointerEvents="none" colors={pearlGradients.primary} style={StyleSheet.absoluteFill} />
              <Text translate style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {stage === "loading" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primaryText} size="large" />
          <Text translate style={styles.loadingText}>Reading your contacts…</Text>
        </View>
      ) : null}

      {stage === "load-error" ? (
        <View style={styles.centerFill}>
          <StateIllustration Colors={Colors} accent="error" icon="alert-circle-outline" />
          <Text translate style={styles.stateTitle}>Couldn&apos;t load contacts</Text>
          <Text style={styles.stateDescription}>{loadError}</Text>
          <TouchableOpacity activeOpacity={0.88} onPress={loadContacts} style={styles.primaryButton}><LinearGradient pointerEvents="none" colors={pearlGradients.primary} style={StyleSheet.absoluteFill} />
            <Text translate style={styles.primaryButtonText}>Retry</Text>
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
            <View style={styles.selectionActions}>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={allContactsSelected}
                onPress={selectAllContacts}
                style={[styles.selectionAction, allContactsSelected && styles.selectionActionDisabled]}
              >
                <Ionicons color={Colors.primaryText} name="checkbox-outline" size={18} />
                <Text translate style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={selectedCount === 0}
                onPress={deselectAllContacts}
                style={[styles.selectionAction, selectedCount === 0 && styles.selectionActionDisabled]}
              >
                <Ionicons color={Colors.text2} name="square-outline" size={18} />
                <Text translate style={styles.selectAllText}>Deselect All</Text>
              </TouchableOpacity>
            </View>
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

          <PearlActionFooter bottomInset={insets.bottom}><View style={{ flex: 1 }}><SettingsButton disabled={selectedCount === 0} onPress={handleStartImport} label={selectedCount === 0 ? "Select contacts to import" : `Import ${selectedCount} Contact${selectedCount === 1 ? "" : "s"}`} /></View></PearlActionFooter>
        </>
      ) : null}

      {stage === "importing" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primaryText} size="large" />
          <Text style={styles.progressCount}>
            {importProgress} / {importTotal}
          </Text>
          <Text translate style={styles.stateDescription}>Importing contacts — please don&apos;t leave this screen.</Text>
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
          <Text translate style={styles.stateTitle}>Import Complete</Text>
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
              <Text translate style={styles.failedToggleText}>
                {showFailedDetails ? "Hide failed contacts" : "View failed contacts"}
              </Text>
              <Ionicons
                color={Colors.primaryText}
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
                <Text translate style={styles.secondaryButtonText}>Retry Failed</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity activeOpacity={0.88} onPress={handleDone} style={styles.primaryButton}><LinearGradient pointerEvents="none" colors={pearlGradients.primary} style={StyleSheet.absoluteFill} />
              <Text translate style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView></PearlBackground>
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
        color={isSelected ? Colors.primaryText : Colors.text2}
        name={isSelected ? "checkbox" : "square-outline"}
        size={20}
      />
      <View style={styles.contactCopy}>
        <Text numberOfLines={1} style={styles.contactName}>{contact.displayName}</Text>
        <Text numberOfLines={1} style={styles.contactMeta}>
          {maskPhone(contact.phoneDisplay)}
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
      <Text translate style={styles.progressStatLabel}>{label}</Text>
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
      <Text translate style={styles.resultLabel}>{label}</Text>
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
      overflow: "hidden",
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: 16,
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
      color: Colors.onPrimary,
      fontSize: 14,
      fontWeight: "800",
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: 16,
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
    selectionActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.lg,
      paddingVertical: Spacing.xs,
    },
    selectionAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    selectionActionDisabled: {
      opacity: 0.4,
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
      color: Colors.primaryText,
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
