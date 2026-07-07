import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
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

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  CLIENT_FILTERS,
  CLIENT_SORT_OPTIONS,
  type ClientFilter,
  type ClientSortOption,
} from "@/data/clientData";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { clientService } from "@/services/client.service";
import {
  selectClients,
  selectClientsError,
  selectClientsLoading,
  selectClientsLoadingMore,
  selectClientsPagination,
  selectClientsQuery,
  selectClientsRefreshing,
  selectClientsTotalCount,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ClientListItem } from "@/types/client";

function matchesFilter(client: ClientListItem, filter: ClientFilter) {
  switch (filter) {
    case "All":
      return true;
    case "New":
      return client.joinedDaysAgo !== null && client.joinedDaysAgo <= 30;
    case "Regular":
      return !client.inactive && !client.isVip && !client.membership;
    case "VIP":
      return client.isVip || client.membership?.toLowerCase().includes("vip") === true;
    case "Membership":
      return Boolean(client.membership);
    case "Inactive":
      return client.inactive || client.status.toLowerCase() === "inactive";
    default:
      return true;
  }
}

function isCreatedToday(createdAt: string | null) {
  if (!createdAt) {
    return false;
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    parsedDate.getFullYear() === today.getFullYear() &&
    parsedDate.getMonth() === today.getMonth() &&
    parsedDate.getDate() === today.getDate()
  );
}

function sortClients(clients: ClientListItem[], sortOption: ClientSortOption) {
  const sortedClients = [...clients];

  switch (sortOption) {
    case "Last Visit":
      return sortedClients.sort((left, right) => {
        const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;

        return rightDate - leftDate;
      });
    case "Alphabetical (A-Z)":
      return sortedClients.sort((left, right) => left.fullName.localeCompare(right.fullName));
    case "Most Visits":
      return sortedClients.sort((left, right) => right.totalVisits - left.totalVisits);
    case "Recently Added":
    default:
      return sortedClients.sort((left, right) => {
        const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;

        return rightDate - leftDate;
      });
  }
}

function getSortQuery(sortOption: ClientSortOption) {
  switch (sortOption) {
    case "Alphabetical (A-Z)":
      return {
        sort_by: "full_name",
        sort_order: "asc" as const,
      };
    case "Most Visits":
      return {
        sort_by: "total_visits",
        sort_order: "desc" as const,
      };
    case "Last Visit":
      return {
        sort_by: "created_at",
        sort_order: "desc" as const,
      };
    case "Recently Added":
    default:
      return {
        sort_by: "created_at",
        sort_order: "desc" as const,
      };
  }
}

function SwipeActionButton({
  backgroundColor,
  color,
  icon,
  label,
  onPress,
}: {
  backgroundColor: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
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
  onBook,
  onDelete,
  onEdit,
  onQuickSale,
}: {
  client: ClientListItem;
  index: number;
  onBook: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onQuickSale: () => void;
}) {
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
              backgroundColor="#EAF5EF"
              color={Colors.primaryDark}
              icon="calendar-outline"
              label="Book"
              onPress={onBook}
            />
            <SwipeActionButton
              backgroundColor="#FBF3E5"
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
              backgroundColor="#EEF4F1"
              color={Colors.primaryDark}
              icon="create-outline"
              label="Edit"
              onPress={onEdit}
            />
            <SwipeActionButton
              backgroundColor="#FEECEC"
              color={Colors.error}
              icon="trash-outline"
              label="Delete"
              onPress={onDelete}
            />
          </View>
        )}
      >
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => router.push(`/clients/${client.id}` as Href)}
          style={styles.clientCard}
        >
          <View style={[styles.avatar, { backgroundColor: avatarTone.background }]}>
            <Text style={[styles.avatarText, { color: avatarTone.color }]}>{client.initials}</Text>
          </View>

          <View style={styles.clientCopy}>
            <View style={styles.nameRow}>
              <Text style={styles.clientName}>{client.fullName}</Text>
              <View
                style={[
                  styles.statusBadge,
                  statusIsInactive ? styles.statusBadgeInactive : styles.statusBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    statusIsInactive
                      ? styles.statusBadgeTextInactive
                      : styles.statusBadgeTextActive,
                  ]}
                >
                  {client.status}
                </Text>
              </View>
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
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

function ClientSkeletonCard({ index }: { index: number }) {
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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Unable to load clients</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onAdd, queryActive }: { onAdd: () => void; queryActive: boolean }) {
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
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const clients = useAppSelector(selectClients);
  const clientsError = useAppSelector(selectClientsError);
  const clientsLoading = useAppSelector(selectClientsLoading);
  const clientsLoadingMore = useAppSelector(selectClientsLoadingMore);
  const clientsPagination = useAppSelector(selectClientsPagination);
  const clientsQuery = useAppSelector(selectClientsQuery);
  const clientsRefreshing = useAppSelector(selectClientsRefreshing);
  const totalCount = useAppSelector(selectClientsTotalCount);

  const [activeFilter, setActiveFilter] = useState<ClientFilter>("All");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<ClientSortOption>("Recently Added");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const sortQuery = useMemo(() => getSortQuery(sortOption), [sortOption]);
  const inactiveQuery = activeFilter === "Inactive";

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    setHiddenIds([]);
  }, [activeFilter, debouncedQuery, sortOption]);

  useEffect(() => {
    void dispatch(
      fetchClientsThunk({
        inactive: inactiveQuery,
        limit: 20,
        offset: 0,
        reset: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      }),
    );
  }, [debouncedQuery, dispatch, inactiveQuery, sortQuery.sort_by, sortQuery.sort_order]);

  const visibleClients = useMemo(
    () => clients.filter((client) => !hiddenIds.includes(client.id)),
    [clients, hiddenIds],
  );

  const filteredClients = useMemo(
    () => sortClients(visibleClients.filter((client) => matchesFilter(client, activeFilter)), sortOption),
    [activeFilter, sortOption, visibleClients],
  );

  const todayNewClients = useMemo(
    () => visibleClients.filter((client) => isCreatedToday(client.createdAt)).length,
    [visibleClients],
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
    setHiddenIds([]);
    void dispatch(
      fetchClientsThunk({
        inactive: inactiveQuery,
        limit: clientsQuery.limit,
        refresh: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      }),
    );
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

    void dispatch(
      fetchClientsThunk({
        inactive: inactiveQuery,
        limit: clientsPagination.limit,
        offset: clientsPagination.nextOffset,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      }),
    );
  };

  const isQueryActive = Boolean(query.trim()) || activeFilter !== "All";
  const showInitialLoading = clientsLoading && clients.length === 0;
  const showErrorState = Boolean(clientsError) && clients.length === 0 && !showInitialLoading;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

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
              {clientsLoadingMore ? (
                <View style={styles.loadingMoreWrap}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                  <Text style={styles.loadingMoreText}>Loading more clients...</Text>
                </View>
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
                    onPress={handleBack}
                    style={styles.backButton}
                  >
                    <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>Clients</Text>
                  <View style={styles.backButtonPlaceholder} />
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

              <View style={styles.filterRow}>
                {CLIENT_FILTERS.map((filter) => {
                  const isActive = filter === activeFilter;

                  return (
                    <TouchableOpacity
                      key={filter}
                      activeOpacity={0.82}
                      onPress={() =>
                        startTransition(() => {
                          setActiveFilter(filter);
                        })
                      }
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                    >
                      <Text
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.sortRow}>
                <Text style={styles.sortMeta}>
                  {activeFilter === "All"
                    ? `${totalCount.toLocaleString("en-IN")} client${totalCount === 1 ? "" : "s"}`
                    : `${filteredClients.length} client${filteredClients.length === 1 ? "" : "s"}`}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => setIsSortVisible(true)}
                  style={styles.sortButton}
                >
                  <Ionicons name="swap-vertical-outline" size={16} color={Colors.primary} />
                  <Text style={styles.sortButtonText}>{sortOption}</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          data={filteredClients}
          initialNumToRender={8}
          keyExtractor={(item) => item.id}
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
              onBook={() => router.push("/bookings/new")}
              onDelete={() =>
                startTransition(() => {
                  setHiddenIds((current) => [...current, item.id]);
                })
              }
              onEdit={() => router.push("/clients/new")}
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
          onRequestClose={() => setIsSortVisible(false)}
          transparent
          visible={isSortVisible}
        >
          <Pressable onPress={() => setIsSortVisible(false)} style={styles.modalOverlay}>
            <Pressable style={styles.sortSheet}>
              <Text style={styles.sortSheetTitle}>Sort Clients</Text>
              {CLIENT_SORT_OPTIONS.map((option, index) => {
                const isActive = option === sortOption;

                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.82}
                    onPress={() => {
                      startTransition(() => {
                        setSortOption(option);
                      });
                      setIsSortVisible(false);
                    }}
                    style={[styles.sortOptionRow, index > 0 && styles.sortOptionRowBorder]}
                  >
                    <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>
                      {option}
                    </Text>
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: Colors.primaryDark,
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
    shadowColor: Colors.primaryDark,
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
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
    shadowColor: Colors.primaryDark,
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
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 2,
    paddingRight: 0,
  },
  filterChip: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
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
  sortButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  sortButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
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
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
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
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: "#EAF5EF",
  },
  statusBadgeInactive: {
    backgroundColor: "#FEECEC",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusBadgeTextActive: {
    color: Colors.primaryDark,
  },
  statusBadgeTextInactive: {
    color: Colors.error,
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
    backgroundColor: "#FBF3E5",
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
    marginLeft: Spacing.sm,
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
    backgroundColor: "#EEF4F1",
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
    shadowColor: Colors.primaryDark,
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
    shadowColor: Colors.primaryDark,
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
    backgroundColor: "rgba(36, 59, 52, 0.24)",
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  sortSheet: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sortSheetTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  sortOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sortOptionRowBorder: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  sortOptionText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  sortOptionTextActive: {
    color: Colors.primary,
  },
});
