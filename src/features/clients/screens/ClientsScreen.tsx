import { clientBirthdayLabel } from "../utils/clientBirthday";
import { ClientBottomNav } from "../components/ClientBottomNav";
import { clientActionsService } from "../client-actions.service";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlTones, pearlGradients } from "@/components/auth/pearl/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ClientButton, ClientChips, ClientMenuRow, clientUi } from "../components/ClientPearl";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";


import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, RefreshControl, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AppLayout, AppRadius } from "@/constants/layout";
import { ErrorState } from "@/components/ui/StateViews";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import {
  deleteClientThunk,
  filterClientsThunk,
  fetchClientsThunk,
  fetchDuplicatesThunk,
  mergeClientsThunk,
  mergeAllDuplicatesThunk,
  type FetchClientsArgs,
} from "@/middleware/client/client.thunk";
import { useAppToast } from "@/hooks/useAppToast";
import { useClientRequiredFields, type ClientRequiredFields } from "@/services/clientRequiredFields";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canSettleCommission as isOwnerOrAdmin } from "@/utils/userProfile";
import {
  selectClients,
  selectClientDeletingIds,
  selectClientsError,
  selectClientsLoading,
  selectClientsLoadingMore,
  selectClientsPagination,
  selectClientsRefreshing,
  selectClientsTotalCount,
  selectClientDuplicates,
  selectClientDuplicatesLoading,
  selectClientDuplicatesError,
  selectClientMerging,
  selectClientMergingAll,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import type { ClientListItem } from "@/types/client";
import {
  CLIENT_SORT_OPTIONS,
  DEFAULT_MEMBERSHIP_FILTER,
  DEFAULT_SORT_OPTION,
  DEFAULT_STATUS_FILTER,
  MEMBERSHIP_FILTERS,
  STATUS_FILTERS,
  getClientListKey,
  getFilterValue,
  getMembershipQueryValue,
  getSortQuery,
  getStatusQueryValue,
  isCreatedToday,
  type ClientMembershipFilter,
  type ClientSortOption,
  type ClientStatusFilter,
} from "@/features/clients/utils/clientList";

function SwipeActionButton({
  backgroundColor,
  color,
  icon,
  label,
  disabled = false,
  onPress,
}: {
  backgroundColor: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={[styles.swipeActionButton, { backgroundColor }]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.swipeActionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ClientCard({ client, index, isLast, isDeleting, onBook, onDelete, onEdit, onOpen, onQuickSale }: { client: ClientListItem; index: number; isLast: boolean; isDeleting: boolean; onBook: () => void; onDelete: () => void; onEdit: () => void; onOpen: () => void; onQuickSale: () => void }) {
  const tone = [pearlTones.rose, pearlTones.lilac, pearlTones.peach][index % 3];
  return <Swipeable containerStyle={{ overflow: "hidden", borderTopLeftRadius: index === 0 ? 22 : 0, borderTopRightRadius: index === 0 ? 22 : 0, borderBottomLeftRadius: isLast ? 22 : 0, borderBottomRightRadius: isLast ? 22 : 0 }} overshootLeft={false} overshootRight={false}
    renderLeftActions={() => <View style={{ flexDirection: "row" }}><SwipeActionButton backgroundColor={pearl.successBg} color={pearl.successText} icon="calendar-outline" label="Book" onPress={onBook} /><SwipeActionButton backgroundColor={pearl.accentWash} color={pearl.accentDeep} icon="flash-outline" label="Sale" onPress={onQuickSale} /></View>}
    renderRightActions={() => <View style={{ flexDirection: "row" }}><SwipeActionButton backgroundColor={pearl.accentWash} color={pearl.accentDeep} icon="create-outline" label="Edit" onPress={onEdit} /><SwipeActionButton backgroundColor={pearl.dangerBg} color={pearl.dangerText} icon="trash-outline" label="Delete" onPress={onDelete} disabled={isDeleting} /></View>}>
    <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: pearl.glass, borderBottomWidth: 1, borderBottomColor: pearl.divider }}>
      <LinearGradient colors={tone.avatar} style={{ width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>{client.initials}</Text></LinearGradient>
      <View style={{ flex: 1 }}><View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}><Text style={clientUi.rowTitle}>{client.fullName}</Text>{client.membership ? <Text style={{ fontSize: 10, color: "#94640F", backgroundColor: pearl.warningBg, borderRadius: 8, paddingHorizontal: 6 }}>{client.membership}</Text> : isCreatedToday(client.createdAt) ? <Text style={{ fontSize: 10, color: pearl.successText }}>New</Text> : null}</View>
        <Text style={clientUi.muted}>{client.totalVisits} {client.totalVisits === 1 ? "visit" : "visits"}</Text>
        {client.birthdayDayMonth ? <Text style={{ color: pearlTones.lilac.fg, fontSize: 11 }}>Birthday {clientBirthdayLabel(client.birthdayDayMonth)}</Text> : null}
      </View><Ionicons name="chevron-forward" size={18} color={pearl.muted} />
    </TouchableOpacity>
  </Swipeable>;
}

function ClientSkeletonCard({ index }: { index: number }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(Math.min(index * 35, 140))}
      style={styles.swipeRow}
    >
      <View style={styles.clientCard}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.clientCopy}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonMetaRow}>
            <View style={styles.skeletonMeta} />
            <View style={styles.skeletonMeta} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function EmptyState({ onAdd, queryActive }: { onAdd: () => void; queryActive: boolean }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="people-outline" size={26} color={Colors.primaryText} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No Clients Found</Text>
      <Text style={styles.emptySubtitle}>
        {queryActive
          ? "Try a different search, filter, or sort to find the right client."
          : "Add your first client to start building your salon client list."}
      </Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onAdd} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Add First Client</Text>
      </TouchableOpacity>
    </View>
  );
}

function ClientsScreenContent() {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const insets = useSafeAreaInsets();
  // Salon-wide rule, so only owner/admin get the switches (same as the web's client form toggles).
  const canConfigureClientForm = isOwnerOrAdmin(useAppSelector(selectCurrentUser)?.role);
  const { config: requiredDates, toggle: toggleRequiredDate } = useClientRequiredFields();
  const handleToggleRequiredDate = (field: keyof ClientRequiredFields) => {
    toggleRequiredDate(field).catch(() => toast.showError("Couldn't update the setting. Please try again."));
  };
  const clients = useAppSelector(selectClients);
  const deletingClientIds = useAppSelector(selectClientDeletingIds);
  const clientsError = useAppSelector(selectClientsError);
  const clientsLoading = useAppSelector(selectClientsLoading);
  const clientsLoadingMore = useAppSelector(selectClientsLoadingMore);
  const clientsPagination = useAppSelector(selectClientsPagination);
  const clientsRefreshing = useAppSelector(selectClientsRefreshing);
  const totalCount = useAppSelector(selectClientsTotalCount);

  const duplicates = useAppSelector(selectClientDuplicates);
  const duplicatesLoading = useAppSelector(selectClientDuplicatesLoading);
  const duplicatesError = useAppSelector(selectClientDuplicatesError);
  const isMerging = useAppSelector(selectClientMerging);
  const isMergingAll = useAppSelector(selectClientMergingAll);

  const didHandleInitialFocusRef = useRef(false);
  const [genderFilter, setGenderFilter] = useState("Any");
  const [sourceFilter, setSourceFilter] = useState("Any");
  const [draftGender, setDraftGender] = useState("Any");
  const [draftSource, setDraftSource] = useState("Any");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>(DEFAULT_STATUS_FILTER);
  const [membershipFilter, setMembershipFilter] = useState<ClientMembershipFilter>(DEFAULT_MEMBERSHIP_FILTER);
  const [draftStatusFilter, setDraftStatusFilter] = useState<ClientStatusFilter>(DEFAULT_STATUS_FILTER);
  const [draftMembershipFilter, setDraftMembershipFilter] = useState<ClientMembershipFilter>(DEFAULT_MEMBERSHIP_FILTER);
  const [draftSortOption, setDraftSortOption] = useState<ClientSortOption>(DEFAULT_SORT_OPTION);
  const { mergeFor } = useLocalSearchParams<{ mergeFor?: string }>();
  const [toolsVisible, setToolsVisible] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isDuplicatesVisible, setIsDuplicatesVisible] = useState(false);
  useEffect(() => { if (mergeFor) { setIsDuplicatesVisible(true); router.setParams({ mergeFor: undefined }); } }, [mergeFor]);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<ClientSortOption>(DEFAULT_SORT_OPTION);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const sortQuery = useMemo(() => getSortQuery(sortOption), [sortOption]);
  const statusQueryValue = useMemo(() => getStatusQueryValue(statusFilter), [statusFilter]);
  const membershipQueryValue = useMemo(() => getMembershipQueryValue(membershipFilter), [membershipFilter]);
  const filterValue = useMemo(() => getFilterValue(statusFilter, membershipFilter), [membershipFilter, statusFilter]);
  const duplicatePhoneQuery = debouncedQuery.trim();
  const genderQuery = genderFilter === "Women" ? "female" : genderFilter === "Men" ? "male" : undefined;
  const activeFilterCount =
    (genderFilter !== "Any" ? 1 : 0) + (sourceFilter !== "Any" ? 1 : 0) +
    (statusFilter !== DEFAULT_STATUS_FILTER ? 1 : 0) +
    (membershipFilter !== DEFAULT_MEMBERSHIP_FILTER ? 1 : 0) +
    (sortOption !== DEFAULT_SORT_OPTION ? 1 : 0);

  const openFilterSheet = useCallback(() => {
    setDraftGender(genderFilter); setDraftSource(sourceFilter);
    setDraftStatusFilter(statusFilter);
    setDraftMembershipFilter(membershipFilter);
    setDraftSortOption(sortOption);
    setIsFilterSheetVisible(true);
  }, [genderFilter, sourceFilter, membershipFilter, sortOption, statusFilter]);

  const resetDraftFilters = useCallback(() => {
    setDraftGender("Any"); setDraftSource("Any");
    setDraftStatusFilter(DEFAULT_STATUS_FILTER);
    setDraftMembershipFilter(DEFAULT_MEMBERSHIP_FILTER);
    setDraftSortOption(DEFAULT_SORT_OPTION);
  }, []);

  const applyDraftFilters = useCallback(() => {
    startTransition(() => {
      setGenderFilter(draftGender); setSourceFilter(draftSource);
      setStatusFilter(draftStatusFilter);
      setMembershipFilter(draftMembershipFilter);
      setSortOption(draftSortOption);
    });
    setIsFilterSheetVisible(false);
  }, [draftGender, draftSource, draftMembershipFilter, draftSortOption, draftStatusFilter]);

  const fetchClientList = useCallback(
    (options: { offset?: number; refresh?: boolean; reset?: boolean } = {}) => {
      const args: FetchClientsArgs = {
        gender: genderQuery, source: sourceFilter === "Any" ? undefined : sourceFilter,
        inactive:
          statusFilter === "Active"
            ? false
            : statusFilter === "Inactive"
              ? true
              : undefined,
        limit: options.offset ? clientsPagination.limit : 10,
        offset: options.offset ?? 0,
        refresh: options.refresh,
        reset: options.reset,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      };

      if (filterValue) {
        void dispatch(
          filterClientsThunk({
            ...args,
            filter: filterValue,
            membership: membershipQueryValue,
            status: statusQueryValue,
          }),
        );
      } else {
        void dispatch(fetchClientsThunk(args));
      }
    },
    [
      genderQuery, sourceFilter,
      clientsPagination.limit,
      debouncedQuery,
      dispatch,
      filterValue,
      membershipQueryValue,
      sortQuery.sort_by,
      sortQuery.sort_order,
      statusFilter,
      statusQueryValue,
    ],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    fetchClientList({ reset: true });
  }, [fetchClientList]);

  useFocusEffect(
    useCallback(() => {
      if (!didHandleInitialFocusRef.current) {
        didHandleInitialFocusRef.current = true;
        return;
      }

      fetchClientList({ refresh: true });
    }, [fetchClientList]),
  );

  useEffect(() => {
    if (isDuplicatesVisible) {
      void dispatch(fetchDuplicatesThunk(duplicatePhoneQuery));
    }
  }, [duplicatePhoneQuery, isDuplicatesVisible, dispatch]);

  const handleMergeGroup = (primaryId: string, secondaryId: string) => {
    Alert.alert(
      "Merge Clients",
      "Are you sure you want to merge these two duplicate clients? All visits, appointments, and spend data will be combined into the primary client record.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            const res = await dispatch(mergeClientsThunk({ primaryId, secondaryId }));
            if (mergeClientsThunk.fulfilled.match(res)) {
              toast.showSuccess("Clients merged successfully.");
              void dispatch(fetchDuplicatesThunk(duplicatePhoneQuery));
              handleRefresh();
            } else {
              Alert.alert("Error", "Unable to merge clients.");
            }
          },
          text: "Merge",
        },
      ]
    );
  };

  const handleMergeAll = () => {
    Alert.alert(
      "Merge All Duplicates",
      "Are you sure you want to merge all identified duplicate clients? This combines profiles that share matches.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            const res = await dispatch(mergeAllDuplicatesThunk());
            if (mergeAllDuplicatesThunk.fulfilled.match(res)) {
              toast.showSuccess("All duplicates merged successfully.");
              setIsDuplicatesVisible(false);
              handleRefresh();
            } else {
              Alert.alert("Error", "Unable to merge all duplicates.");
            }
          },
          text: "Merge All",
        },
      ]
    );
  };

  const todayNewClients = useMemo(
    () => clients.filter((client) => isCreatedToday(client.createdAt)).length,
    [clients],
  );

  const handleAddClient = () => router.push("/clients/new");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  const handleRefresh = () => {
    fetchClientList({ refresh: true });
  };

  const warnInvalidClientId = () => {
    Alert.alert(
      "Unable to open client",
      "This client record is missing a valid backend ID. Refresh the list and try again.",
    );
  };

  const handleOpenClient = (client: ClientListItem) => {
    if (!client.hasValidId) {
      warnInvalidClientId();
      return;
    }

    router.push(`/clients/${client.id}` as Href);
  };

  const handleEditClient = (client: ClientListItem) => {
    if (!client.hasValidId) {
      warnInvalidClientId();
      return;
    }

    router.push(`/clients/${client.id}/edit` as Href);
  };

  const handleLoadMore = () => {
    if (
      clientsLoading ||
      clientsLoadingMore ||
      clientsRefreshing ||
      !clientsPagination.hasMore
    ) {
      return;
    }

    fetchClientList({ offset: clientsPagination.nextOffset });
  };

  const handleDeleteClient = (client: ClientListItem) => {
    if (!client.hasValidId) {
      warnInvalidClientId();
      return;
    }

    Alert.alert(
      "Delete Client",
      `Are you sure you want to delete "${client.fullName}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            const resultAction = await dispatch(deleteClientThunk(client.id));

            if (deleteClientThunk.rejected.match(resultAction)) {
              Alert.alert(
                "Unable to delete client",
                resultAction.payload?.message ?? "Something went wrong. Please try again.",
              );
              return;
            }

            toast.showSuccess("Client deleted successfully.");
          },
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  };

  const isQueryActive = Boolean(query.trim()) || activeFilterCount > 0;
  const showInitialLoading = clientsLoading && clients.length === 0;
  const showErrorState = Boolean(clientsError) && clients.length === 0 && !showInitialLoading;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <PearlBackground><SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />

        <RefreshViewport><FlatList
          ListEmptyComponent={
            showInitialLoading ? (
              <View>
                {Array.from({ length: 5 }).map((_, index) => (
                  <ClientSkeletonCard key={`client-skeleton-${index}`} index={index} />
                ))}
              </View>
            ) : showErrorState ? (
              <ErrorState
                message={clientsError ?? "Please try again in a moment."}
                onRetry={handleRefresh}
              />
            ) : (
              <EmptyState onAdd={handleAddClient} queryActive={isQueryActive} />
            )
          }
          ListFooterComponent={
            <View style={styles.footerWrap}>
              {clients.length > 0 ? (
                <PaginationControls
                  currentPage={Math.max(1, Math.ceil(clients.length / clientsPagination.limit))}
                  hasNextPage={clientsPagination.hasMore}
                  hasPreviousPage={false}
                  loading={clientsLoadingMore}
                  onNext={clientsPagination.hasMore ? handleLoadMore : undefined}
                  totalItems={totalCount}
                  totalPages={Math.max(1, Math.ceil(totalCount / clientsPagination.limit))}
                  visibleItems={clients.length}
                />
              ) : null}
              <View style={{ height: 112 + insets.bottom }} />
            </View>
          }
          ListHeaderComponent={<View style={{ gap: 14, paddingBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><AppBackButton onPress={handleBack} /><View style={{ flex: 1 }}><Text style={{ color: pearl.ink, fontSize: 23, fontWeight: "800" }}>Clients</Text><Text style={clientUi.muted}>{totalCount} total · {todayNewClients} new today</Text></View><TouchableOpacity accessibilityLabel="More" onPress={() => setToolsVisible(true)} style={newStyles.iconButton}><Ionicons name="ellipsis-horizontal" size={20} color={pearl.ink} /></TouchableOpacity></View>
            <View style={{ flexDirection: "row", gap: 8 }}><View style={newStyles.search}><Ionicons name="search-outline" size={19} color={pearl.muted} /><TextInput accessibilityLabel="Search name or mobile" placeholder="Search name or mobile" placeholderTextColor={pearl.muted} value={query} onChangeText={setQuery} style={{ flex: 1, paddingVertical: 12, color: pearl.ink, fontSize: 14 }} /></View><TouchableOpacity accessibilityLabel="Filters" onPress={openFilterSheet} style={newStyles.iconButton}><Ionicons name="options-outline" size={20} color={pearl.accentDeep} />{activeFilterCount ? <Text style={{ color: pearl.accentDeep, fontSize: 10 }}>{activeFilterCount}</Text> : null}</TouchableOpacity></View>
            <ClientChips options={["All " + totalCount, "Active"]} selected={statusFilter === "Active" ? "Active" : "All " + totalCount} onSelect={(value) => setStatusFilter(value === "Active" ? "Active" : "All")} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={clientUi.muted}>Sorted by {sortOption === "Recent" ? "recently added" : sortOption === "Name A-Z" ? "name" : sortOption.toLowerCase()}</Text><TouchableOpacity accessibilityLabel="Sort name A–Z" onPress={() => setSortOption(sortOption === "Name A-Z" ? "Recent" : "Name A-Z")}><Ionicons name="swap-vertical-outline" size={20} color={pearl.muted} /></TouchableOpacity></View>
          </View>}
          contentContainerStyle={styles.listContent}
          data={clients}
          initialNumToRender={10}
          keyExtractor={getClientListKey}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={handleRefresh}
              refreshing={clientsRefreshing}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ index, item }) => (
            <ClientCard
              client={item}
              index={index}
              isLast={index === clients.length - 1}
              isDeleting={deletingClientIds.includes(item.id)}
              onBook={() => router.push("/bookings/new")}
              onDelete={() => handleDeleteClient(item)}
              onEdit={() => handleEditClient(item)}
              onOpen={() => handleOpenClient(item)}
              onQuickSale={() => router.push("/quick-sale")}
            />
          )}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          windowSize={8}
        /></RefreshViewport>

        <View style={[styles.stickyButtonWrap, { bottom: insets.bottom + 116, left: undefined, right: 20 }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleAddClient}
            style={newStyles.fab}
          >
            <LinearGradient pointerEvents="none" colors={pearlGradients.primary} style={StyleSheet.absoluteFill} /><Ionicons name="add" size={20} color="#FFFFFF" /><Text style={newStyles.fabText}>Add client</Text>
          </TouchableOpacity>
        </View>

        <ClientBottomNav />
        <BottomSheet pearlStyle centered={false} title="Filter clients" visible={isFilterSheetVisible} onClose={() => setIsFilterSheetVisible(false)} footer={<View style={{ flex: 1, flexDirection: "row", gap: 10 }}><ClientButton secondary label="Reset" onPress={resetDraftFilters} /><View style={{ flex: 1 }}><ClientButton label="Show clients" onPress={applyDraftFilters} /></View></View>}>
          <View style={{ gap: 18 }}><View><Text style={clientUi.label}>Status</Text><ClientChips options={STATUS_FILTERS} selected={draftStatusFilter} onSelect={(value) => setDraftStatusFilter(value as ClientStatusFilter)} /></View><View><Text style={clientUi.label}>Membership</Text><ClientChips options={MEMBERSHIP_FILTERS} selected={draftMembershipFilter} onSelect={(value) => setDraftMembershipFilter(value as ClientMembershipFilter)} /></View><View><Text style={clientUi.label}>Gender</Text><ClientChips options={["Any", "Women", "Men"]} selected={draftGender} onSelect={setDraftGender} /></View><View><Text style={clientUi.label}>Source</Text><ClientChips options={["Any", "Walk-in", "Instagram", "Referral", "Google"]} selected={draftSource} onSelect={setDraftSource} /></View><View><Text style={clientUi.label}>Sort by</Text><ClientChips options={CLIENT_SORT_OPTIONS.filter((option) => option !== "Last Visit")} selected={draftSortOption} onSelect={(value) => setDraftSortOption(value as ClientSortOption)} /></View></View>
        </BottomSheet>
        <BottomSheet pearlStyle centered={false} title="Client tools" visible={toolsVisible} onClose={() => setToolsVisible(false)}>
          <View style={clientUi.card}><ClientMenuRow icon="cloud-upload-outline" title="Import contacts" onPress={() => { setToolsVisible(false); router.push("/clients/import-contacts"); }} /><ClientMenuRow tone="peach" showChevron={false} icon="download-outline" title={exporting ? "Exporting…" : "Export to Excel"} onPress={() => { if (exporting) return; setExporting(true); void clientActionsService.exportExcel({ limit: 2000, gender: genderQuery, source: sourceFilter === "Any" ? undefined : sourceFilter, blocked_status: statusFilter === "Blocked" ? "blocked" : undefined, package_membership: membershipFilter === "Has Membership" ? "has_membership" : undefined, search: debouncedQuery, inactive: statusFilter === "Inactive", sort_by: sortQuery.sort_by, sort_order: sortQuery.sort_order }).catch((e) => Alert.alert("Export unavailable", e instanceof Error ? e.message : "Please try again.")).finally(() => setExporting(false)); }} />{canConfigureClientForm ? <ClientMenuRow tone="rose" icon="options-outline" title="Client form rules" onPress={() => { setToolsVisible(false); setRulesVisible(true); }} /> : null}<ClientMenuRow icon="copy-outline" title="Merge duplicates" onPress={() => { setToolsVisible(false); setIsDuplicatesVisible(true); }} /></View>
        </BottomSheet>
        <BottomSheet pearlStyle centered={false} title="Client form rules" visible={rulesVisible} onClose={() => setRulesVisible(false)}>
          <View style={{ gap: 14 }}><Text style={clientUi.muted}>Choose which fields are required when adding a client in Quick Sale, Calendar or Add client.</Text><View style={clientUi.card}>{([["require_dob", "Date of birth"], ["require_doa", "Anniversary"]] as const).map(([field, label]) => <View key={field} style={clientUi.menuRow}><View style={{ flex: 1 }}><Text style={clientUi.rowTitle}>{label}</Text><Text style={clientUi.muted}>{requiredDates[field] ? "Required" : "Optional"}</Text></View><Switch accessibilityLabel={label + " required"} value={requiredDates[field]} onValueChange={() => handleToggleRequiredDate(field)} thumbColor="#FFFFFF" trackColor={{ false: pearl.divider, true: pearl.accent }} /></View>)}</View><Text style={clientUi.muted}>Mobile number is always required so bills and reminders can be sent.</Text></View>
        </BottomSheet>
        <Modal
          animationType="slide"
          onRequestClose={() => setIsDuplicatesVisible(false)}
          visible={isDuplicatesVisible}
        >
          <PearlBackground><SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDuplicatesVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.primaryText} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Duplicate Clients</Text>
              <View style={{ width: 40 }} />
            </View>

            {duplicatesLoading ? (
              <View style={styles.centeredLoader}>
                <ActivityIndicator size="large" color={Colors.primaryText} />
                <Text style={styles.loaderText}>Checking for duplicates...</Text>
              </View>
            ) : duplicatesError ? (
              <View style={styles.centeredLoader}>
                <Text style={styles.errorText}>{duplicatesError}</Text>
              </View>
            ) : !duplicates || duplicates.length === 0 ? (
              <View style={styles.centeredLoader}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color={Colors.success} />
                <Text style={styles.successText}>No duplicates found!</Text>
              </View>
            ) : (
              <View style={styles.duplicatesContent}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleMergeAll}
                  style={styles.mergeAllButton}
                  disabled={isMergingAll}
                >
                  {isMergingAll ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="git-merge-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.mergeAllButtonText}>Merge All Duplicates</Text>
                    </>
                  )}
                </TouchableOpacity>

                <FlatList
                  data={duplicates}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 24 }}
                  renderItem={({ item }) => (
                    <View style={styles.duplicateGroupCard}>
                      <View style={styles.duplicateGroupHeader}>
                        <Ionicons name="alert-circle" size={16} color={Colors.goldDark} />
                        <Text style={styles.duplicateGroupTitle}>
                          Duplicate {item.type}: {item.value}
                        </Text>
                      </View>

                      {item.clients.map((dupClient, idx) => (
                        <View key={dupClient.id} style={[styles.duplicateClientRow, idx > 0 && styles.borderTop]}>
                          <View style={styles.dupClientInfo}>
                            <Text style={styles.dupClientName}>{dupClient.fullName}</Text>
                            <Text style={styles.dupClientMeta}>Phone: {maskPhone(dupClient.phone)}</Text>
                            <Text style={styles.dupClientMeta}>Email: {dupClient.email}</Text>
                          </View>
                        </View>
                      ))}

                      {item.clients.length >= 2 ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleMergeGroup(item.clients[0].id, item.clients[1].id)}
                          style={styles.mergeGroupButton}
                          disabled={isMerging}
                        >
                          <Text style={styles.mergeGroupButtonText}>Merge These Two</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                />
              </View>
            )}
          </SafeAreaView></PearlBackground>
        </Modal>
      </SafeAreaView></PearlBackground>
    </GestureHandlerRootView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: { flex: 1,
  },
  listContent: {
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  swipeRow: {
    marginBottom: Spacing.sm,
  },
  swipeActionButton: {
    alignItems: "center",
    borderRadius: Radius.xl,
    justifyContent: "center",
    minWidth: 88,
    paddingHorizontal: 10,
  },
  swipeActionText: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
  },
  clientCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 0,
  },
  clientCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  skeletonAvatar: {
    backgroundColor: Colors.bg2,
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  skeletonName: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 16,
    width: "58%",
  },
  skeletonLine: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 12,
    marginTop: 8,
    width: "74%",
  },
  skeletonBadge: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 24,
    marginTop: 10,
    width: 112,
  },
  skeletonMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  skeletonMeta: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 12,
    width: 88,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyIllustration: {
    alignItems: "center",
    height: 96,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 96,
  },
  emptyIllustrationHalo: {
    backgroundColor: Colors.bg2,
    borderRadius: 48,
    height: 96,
    opacity: 0.9,
    position: "absolute",
    width: 96,
  },
  emptyIllustrationCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    transform: [{ rotate: "-7deg" }],
    width: 54,
  },
  emptyTitle: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  emptyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  emptyButtonText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  footerWrap: {
    paddingBottom: 0,
  },
  stickyButtonWrap: {
    left: AppLayout.floatingButtonRight,
    position: "absolute",
    right: AppLayout.floatingButtonRight,
  },
  modalSafeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  modalHeader: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalCloseButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  modalHeaderTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  centeredLoader: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
    justifyContent: "center",
  },
  loaderText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: "center",
  },
  successText: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: "800",
    marginTop: Spacing.md,
  },
  duplicatesContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  mergeAllButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  mergeAllButtonText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  duplicateGroupCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  duplicateGroupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  duplicateGroupTitle: {
    color: Colors.goldDark,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  duplicateClientRow: {
    paddingVertical: Spacing.sm,
  },
  borderTop: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  dupClientInfo: {
    gap: 2,
  },
  dupClientName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  dupClientMeta: {
    color: Colors.text2,
    fontSize: 12,
  },
  mergeGroupButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
    paddingVertical: 10,
  },
  mergeGroupButtonText: {
    color: Colors.primaryText,
    fontSize: 13,
    fontWeight: "700",
  },
});

export default ClientsScreenContent;

const newStyles = StyleSheet.create({ iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, alignItems: "center", justifyContent: "center" }, search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder }, fab: { overflow: "hidden", minHeight: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 18 }, fabText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 } });
