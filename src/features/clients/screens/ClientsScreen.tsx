import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AppLayout, AppRadius } from "@/constants/layout";
import { Badge } from "@/components/ui/Badge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { ErrorState } from "@/components/ui/StateViews";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import {
  deleteClientThunk,
  filterClientsThunk,
  fetchClientsThunk,
  searchClientsThunk,
  fetchDuplicatesThunk,
  mergeClientsThunk,
  mergeAllDuplicatesThunk,
  type FetchClientsArgs,
} from "@/middleware/client/client.thunk";
import { useAppToast } from "@/hooks/useAppToast";
import { clientService } from "@/services/client.service";
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
import { useThemeColors } from "@/theme/ThemeProvider";
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
  const Colors = useThemeColors();
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

function ClientCard({
  client,
  index,
  isDeleting,
  onBook,
  onDelete,
  onEdit,
  onOpen,
  onQuickSale,
}: {
  client: ClientListItem;
  index: number;
  isDeleting: boolean;
  onBook: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onQuickSale: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const avatarTone = clientService.getAvatarTone(client.id);
  const statusIsInactive = client.inactive || client.status.toLowerCase() === "inactive";

  return (
    <Animated.View
      entering={FadeInDown.duration(240).delay(Math.min(index * 35, 180))}
      layout={LinearTransition.duration(180)}
      style={styles.swipeRow}
    >
      <Swipeable
        containerStyle={styles.swipeableContainer}
        friction={1.8}
        leftThreshold={70}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={() => (
          <View style={styles.leftActions}>
            <SwipeActionButton
              backgroundColor={Colors.successBg}
              color={Colors.primaryDark}
              icon="calendar-outline"
              label="Book"
              onPress={onBook}
            />
            <SwipeActionButton
              backgroundColor={Colors.warningBg}
              color={Colors.goldDark}
              icon="flash-outline"
              label="Quick Sale"
              onPress={onQuickSale}
            />
          </View>
        )}
        renderRightActions={() => (
          <View style={styles.rightActions}>
            <SwipeActionButton
              backgroundColor={Colors.bg2}
              color={Colors.primaryDark}
              icon="create-outline"
              label="Edit"
              onPress={onEdit}
            />
            <SwipeActionButton
              backgroundColor={Colors.errorBg}
              color={Colors.error}
              icon="trash-outline"
              label="Delete"
              disabled={isDeleting}
              onPress={onDelete}
            />
          </View>
        )}
      >
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onOpen}
          style={styles.clientCard}
        >
          <InitialsAvatar bg={avatarTone.background} color={avatarTone.color} initials={client.initials} size={44} />

          <View style={styles.clientCopy}>
            <View style={styles.nameRow}>
              <Text style={styles.clientName}>{client.fullName}</Text>
              <Badge
                bg={statusIsInactive ? Colors.errorBg : Colors.successBg}
                color={statusIsInactive ? Colors.error : Colors.primaryDark}
                label={client.status}
                size="sm"
              />
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={12} color={Colors.text2} />
              <Text style={styles.infoText}>{client.phone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={12} color={Colors.text2} />
              <Text numberOfLines={1} style={styles.infoText}>
                {client.email}
              </Text>
            </View>

            {client.membership ? (
              <View style={styles.membershipBadge}>
                <Ionicons name="diamond-outline" size={12} color={Colors.goldDark} />
                <Text style={styles.membershipBadgeText}>{client.membership}</Text>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Gender: {client.gender}</Text>
              <Text style={styles.metaText}>{client.totalVisits} Visits</Text>
            </View>

            <Text style={styles.createdText}>Created: {client.createdDateLabel}</Text>
          </View>

          <View style={styles.rightColumn}>
            <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
            <TouchableOpacity
              accessibilityLabel={`Delete ${client.fullName}`}
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={isDeleting}
              onPress={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              style={[styles.inlineDeleteButton, isDeleting && styles.inlineDeleteButtonDisabled]}
            >
              {isDeleting ? (
                <ActivityIndicator color={Colors.error} size="small" />
              ) : (
                <Ionicons name="trash-outline" size={17} color={Colors.error} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

function ClientSkeletonCard({ index }: { index: number }) {
  const Colors = useThemeColors();
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="people-outline" size={26} color={Colors.primary} />
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

export default function ClientsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const insets = useSafeAreaInsets();
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
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>(DEFAULT_STATUS_FILTER);
  const [membershipFilter, setMembershipFilter] = useState<ClientMembershipFilter>(DEFAULT_MEMBERSHIP_FILTER);
  const [draftStatusFilter, setDraftStatusFilter] = useState<ClientStatusFilter>(DEFAULT_STATUS_FILTER);
  const [draftMembershipFilter, setDraftMembershipFilter] = useState<ClientMembershipFilter>(DEFAULT_MEMBERSHIP_FILTER);
  const [draftSortOption, setDraftSortOption] = useState<ClientSortOption>(DEFAULT_SORT_OPTION);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isDuplicatesVisible, setIsDuplicatesVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<ClientSortOption>(DEFAULT_SORT_OPTION);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const sortQuery = useMemo(() => getSortQuery(sortOption), [sortOption]);
  const statusQueryValue = useMemo(() => getStatusQueryValue(statusFilter), [statusFilter]);
  const membershipQueryValue = useMemo(() => getMembershipQueryValue(membershipFilter), [membershipFilter]);
  const filterValue = useMemo(() => getFilterValue(statusFilter, membershipFilter), [membershipFilter, statusFilter]);
  const duplicatePhoneQuery = debouncedQuery.trim();
  const activeFilterCount =
    (statusFilter !== DEFAULT_STATUS_FILTER ? 1 : 0) +
    (membershipFilter !== DEFAULT_MEMBERSHIP_FILTER ? 1 : 0) +
    (sortOption !== DEFAULT_SORT_OPTION ? 1 : 0);

  const openFilterSheet = useCallback(() => {
    setDraftStatusFilter(statusFilter);
    setDraftMembershipFilter(membershipFilter);
    setDraftSortOption(sortOption);
    setIsFilterSheetVisible(true);
  }, [membershipFilter, sortOption, statusFilter]);

  const resetDraftFilters = useCallback(() => {
    setDraftStatusFilter(DEFAULT_STATUS_FILTER);
    setDraftMembershipFilter(DEFAULT_MEMBERSHIP_FILTER);
    setDraftSortOption(DEFAULT_SORT_OPTION);
  }, []);

  const applyDraftFilters = useCallback(() => {
    startTransition(() => {
      setStatusFilter(draftStatusFilter);
      setMembershipFilter(draftMembershipFilter);
      setSortOption(draftSortOption);
    });
    setIsFilterSheetVisible(false);
  }, [draftMembershipFilter, draftSortOption, draftStatusFilter]);

  const fetchClientList = useCallback(
    (options: { offset?: number; refresh?: boolean; reset?: boolean } = {}) => {
      const args: FetchClientsArgs = {
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
      } else if (debouncedQuery) {
        void dispatch(searchClientsThunk(args));
      } else {
        void dispatch(fetchClientsThunk(args));
      }
    },
    [
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

  const warnInvalidClientId = (client: ClientListItem, action: string) => {
    if (__DEV__) {
      console.warn("[Clients] Prevented client action because API row has no valid UUID", {
        action,
        clientId: client.id,
        fullName: client.fullName,
      });
    }

    Alert.alert(
      "Unable to open client",
      "This client record is missing a valid backend ID. Refresh the list and try again.",
    );
  };

  const handleOpenClient = (client: ClientListItem) => {
    if (!client.hasValidId) {
      warnInvalidClientId(client, "open");
      return;
    }

    router.push(`/clients/${client.id}` as Href);
  };

  const handleEditClient = (client: ClientListItem) => {
    if (!client.hasValidId) {
      warnInvalidClientId(client, "edit");
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
      warnInvalidClientId(client, "delete");
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
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />

        <FlatList
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
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    hitSlop={AppLayout.headerActionHitSlop}
                    onPress={handleBack}
                    style={styles.backButton}
                  >
                    <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>Clients</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    hitSlop={AppLayout.headerActionHitSlop}
                    onPress={() => setIsDuplicatesVisible(true)}
                    style={styles.backButton}
                  >
                    <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryMetric}>
                    <Text style={styles.summaryLabel}>Total Clients</Text>
                    <Text style={styles.summaryValue}>{totalCount.toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryMetric}>
                    <Text style={styles.summaryLabel}>{"Today's New Clients"}</Text>
                    <Text style={styles.summaryValue}>{todayNewClients}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.searchFilterRow}>
                <View style={styles.searchWrap}>
                  <Ionicons name="search-outline" size={20} color={Colors.text2} />
                  <TextInput
                    onChangeText={setQuery}
                    placeholder="Search by name or mobile number"
                    placeholderTextColor={Colors.placeholder}
                    style={styles.searchInput}
                    value={query}
                  />
                  {query.trim().length > 0 ? (
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setQuery("")}>
                      <Ionicons name="close-circle" size={18} color={Colors.placeholder} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={openFilterSheet}
                  style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
                >
                  <Ionicons
                    name="options-outline"
                    size={17}
                    color={activeFilterCount > 0 ? "#FFFFFF" : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      activeFilterCount > 0 && styles.filterButtonTextActive,
                    ]}
                  >
                    Filter
                  </Text>
                  {activeFilterCount > 0 ? (
                    <View style={styles.filterCountBadge}>
                      <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>

              <View style={styles.sortRow}>
                <Text style={styles.sortMeta}>
                  {`${totalCount.toLocaleString("en-IN")} client${totalCount === 1 ? "" : "s"}`}
                </Text>
                <Text style={styles.sortMeta}>Sorted by {sortOption}</Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          data={clients}
          initialNumToRender={8}
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
        />

        <View style={[styles.stickyButtonWrap, { bottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleAddClient}
            style={styles.stickyButton}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <Text style={styles.stickyButtonText}>Add Client</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="fade"
          onRequestClose={() => setIsFilterSheetVisible(false)}
          transparent
          visible={isFilterSheetVisible}
        >
          <Pressable onPress={() => setIsFilterSheetVisible(false)} style={styles.modalOverlay}>
            <Pressable style={styles.filterSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.filterSheetTitle}>Filter Clients</Text>

              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptionGrid}>
                {STATUS_FILTERS.map((option) => {
                  const isActive = option === draftStatusFilter;

                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.82}
                      onPress={() => setDraftStatusFilter(option)}
                      style={[styles.sheetOption, isActive && styles.sheetOptionActive]}
                    >
                      <Text style={[styles.sheetOptionText, isActive && styles.sheetOptionTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Membership</Text>
              <View style={styles.filterOptionGrid}>
                {MEMBERSHIP_FILTERS.map((option) => {
                  const isActive = option === draftMembershipFilter;

                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.82}
                      onPress={() => setDraftMembershipFilter(option)}
                      style={[styles.sheetOption, isActive && styles.sheetOptionActive]}
                    >
                      <Text style={[styles.sheetOptionText, isActive && styles.sheetOptionTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptionList}>
                {CLIENT_SORT_OPTIONS.map((option) => {
                  const isActive = option === draftSortOption;

                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.82}
                      onPress={() => setDraftSortOption(option)}
                      style={[styles.sheetListOption, isActive && styles.sheetListOptionActive]}
                    >
                      <Text style={[styles.sheetOptionText, isActive && styles.sheetOptionTextActive]}>
                        {option}
                      </Text>
                      {isActive ? <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.sheetActionRow}>
                <TouchableOpacity activeOpacity={0.82} onPress={resetDraftFilters} style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.86} onPress={applyDraftFilters} style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          animationType="slide"
          onRequestClose={() => setIsDuplicatesVisible(false)}
          visible={isDuplicatesVisible}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDuplicatesVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Duplicate Clients</Text>
              <View style={{ width: 40 }} />
            </View>

            {duplicatesLoading ? (
              <View style={styles.centeredLoader}>
                <ActivityIndicator size="large" color={Colors.primary} />
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
                            <Text style={styles.dupClientMeta}>Phone: {dupClient.phone}</Text>
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
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  header: {
    marginBottom: AppLayout.sectionGap,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    width: AppLayout.headerActionSize,
  },
  backButtonPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: AppLayout.cardPadding,
    paddingVertical: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  summaryMetric: {
    flex: 1,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  summaryDivider: {
    backgroundColor: Colors.border,
    height: 36,
    marginHorizontal: Spacing.md,
    width: 1,
  },
  searchFilterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 14,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    minHeight: AppLayout.searchBarHeight,
  },
  filterButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginBottom: AppLayout.sectionGap,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: Spacing.md,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  filterCountBadge: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
  },
  filterCountText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  sortRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
    marginTop: AppLayout.sectionGap,
  },
  sortMeta: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  swipeRow: {
    marginBottom: Spacing.sm,
  },
  swipeableContainer: {
    borderRadius: Radius.xl,
  },
  leftActions: {
    alignItems: "stretch",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: 0,
    marginRight: Spacing.sm,
  },
  rightActions: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
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
    elevation: 2,
  },
  clientCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clientName: {
    color: Colors.heading,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    marginRight: Spacing.sm,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  infoText: {
    color: Colors.text2,
    flex: 1,
    fontSize: 12,
  },
  membershipBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  membershipBadgeText: {
    color: Colors.goldDark,
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  metaText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
  },
  createdText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
  },
  rightColumn: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    justifyContent: "space-between",
    marginLeft: Spacing.sm,
  },
  inlineDeleteButton: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    marginTop: Spacing.md,
    width: 36,
  },
  inlineDeleteButtonDisabled: {
    opacity: 0.68,
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
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  footerWrap: {
    paddingBottom: 0,
  },
  loadingMoreWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  loadingMoreText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  stickyButtonWrap: {
    left: AppLayout.floatingButtonRight,
    position: "absolute",
    right: AppLayout.floatingButtonRight,
  },
  stickyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  stickyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    backgroundColor: "rgba(15, 23, 32, 0.12)",
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  filterSheet: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    height: 4,
    marginBottom: Spacing.md,
    width: 44,
  },
  filterSheetTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  filterSectionTitle: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: "uppercase",
  },
  filterOptionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterOptionList: {
    gap: Spacing.sm,
  },
  sheetOption: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  sheetOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sheetListOption: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  sheetListOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sheetOptionText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  sheetOptionTextActive: {
    color: "#FFFFFF",
  },
  sheetActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  resetButton: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  resetButtonText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  applyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
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
    color: "#FFFFFF",
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
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
