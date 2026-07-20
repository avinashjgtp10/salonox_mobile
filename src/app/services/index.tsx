import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  SERVICE_FILTERS,
  SERVICE_SORT_OPTIONS,
  type ServiceFilter,
  type ServiceSortOption,
} from "@/data/serviceData";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { deleteServiceThunk, fetchServicesThunk } from "@/middleware/service/service.thunk";
import {
  selectServiceDeletingIds,
  selectServices,
  selectServicesError,
  selectServicesLoading,
  selectServicesLoadingMore,
  selectServicesPagination,
  selectServicesQuery,
  selectServicesRefreshing,
  selectServicesTotalCount,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceListItem } from "@/types/service";

function getSortQuery(sortOption: ServiceSortOption) {
  switch (sortOption) {
    case "Name (A-Z)":
      return { sort_by: "name", sort_order: "asc" as const };
    case "Price (Low-High)":
      return { sort_by: "price", sort_order: "asc" as const };
    case "Price (High-Low)":
      return { sort_by: "price", sort_order: "desc" as const };
    case "Newest":
    default:
      return { sort_by: "created_at", sort_order: "desc" as const };
  }
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatDuration(durationMinutes: number | null) {
  return durationMinutes && durationMinutes > 0 ? `${durationMinutes} min` : "Duration pending";
}

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function ServiceCard({
  isDeleting,
  onDelete,
  service,
}: {
  isDeleting: boolean;
  onDelete: () => void;
  service: ServiceListItem;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(`/services/${service.id}` as Href)}
      style={styles.serviceCard}
    >
      <View style={styles.serviceIcon}>
        <Ionicons name="cut-outline" size={20} color={Colors.primaryDark} />
      </View>

      <View style={styles.serviceCopy}>
        <View style={styles.nameRow}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <View
            style={[
              styles.statusBadge,
              service.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                service.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
              ]}
            >
              {service.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {service.category ? <Text style={styles.categoryText}>{service.category}</Text> : null}

        <View style={styles.metaRow}>
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={12} color={Colors.text2} />
            <Text style={styles.infoText}>{formatPrice(service.price)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={12} color={Colors.text2} />
            <Text style={styles.infoText}>{formatDuration(service.durationMinutes)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isDeleting}
        hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
        onPress={onDelete}
        style={styles.deleteButton}
      >
        {isDeleting ? (
          <ActivityIndicator color={Colors.error} size="small" />
        ) : (
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function ServiceSkeletonCard() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.serviceCard}>
      <View style={styles.skeletonIcon} />
      <View style={styles.serviceCopy}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Unable to load services</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ queryActive }: { queryActive: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="cut-outline" size={26} color={Colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No Services Found</Text>
      <Text style={styles.emptySubtitle}>
        {queryActive
          ? "Try a different search, filter, or sort to find the right service."
          : "Services added to your salon menu will show up here."}
      </Text>
    </View>
  );
}

export default function ServicesScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const services = useAppSelector(selectServices);
  const servicesError = useAppSelector(selectServicesError);
  const servicesLoading = useAppSelector(selectServicesLoading);
  const servicesLoadingMore = useAppSelector(selectServicesLoadingMore);
  const servicesPagination = useAppSelector(selectServicesPagination);
  const servicesQuery = useAppSelector(selectServicesQuery);
  const servicesRefreshing = useAppSelector(selectServicesRefreshing);
  const totalCount = useAppSelector(selectServicesTotalCount);
  const deletingServiceIds = useAppSelector(selectServiceDeletingIds);

  const [activeFilter, setActiveFilter] = useState<ServiceFilter>("All");
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<ServiceSortOption>("Newest");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const sortQuery = useMemo(() => getSortQuery(sortOption), [sortOption]);
  const isActiveQuery = useMemo(() => {
    if (activeFilter === "Active") return true;
    if (activeFilter === "Inactive") return false;
    return undefined;
  }, [activeFilter]);

  const activeCount = useMemo(
    () => services.filter((service) => service.isActive).length,
    [services],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    void dispatch(
      fetchServicesThunk({
        isActive: isActiveQuery,
        limit: 20,
        offset: 0,
        reset: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      }),
    );
  }, [debouncedQuery, dispatch, isActiveQuery, sortQuery.sort_by, sortQuery.sort_order]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  const handleRefresh = () => {
    void dispatch(
      fetchServicesThunk({
        isActive: isActiveQuery,
        limit: servicesQuery.limit,
        refresh: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      }),
    );
  };

  const handleConfirmDelete = async (service: ServiceListItem) => {
    const resultAction = await dispatch(deleteServiceThunk(service.id));

    if (deleteServiceThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete service",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert("Service deleted", resultAction.payload.message ?? "Service deleted successfully.");

    void dispatch(
      fetchServicesThunk({
        isActive: isActiveQuery,
        limit: servicesQuery.limit,
        offset: 0,
        reset: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      }),
    );
  };

  const handleDeleteService = (service: ServiceListItem) => {
    Alert.alert(
      "Delete Service",
      `Are you sure you want to delete "${service.name}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmDelete(service),
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  };

  const handleLoadMore = () => {
    if (
      servicesLoading ||
      servicesLoadingMore ||
      servicesRefreshing ||
      !servicesPagination.hasMore
    ) {
      return;
    }

    void dispatch(
      fetchServicesThunk({
        isActive: isActiveQuery,
        limit: servicesPagination.limit,
        offset: servicesPagination.nextOffset,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
      }),
    );
  };

  const isQueryActive = Boolean(query.trim()) || activeFilter !== "All";
  const showInitialLoading = servicesLoading && services.length === 0;
  const showErrorState = Boolean(servicesError) && services.length === 0 && !showInitialLoading;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />

      <FlatList
        ListEmptyComponent={
          showInitialLoading ? (
            <View>
              {Array.from({ length: 5 }).map((_, index) => (
                <ServiceSkeletonCard key={`service-skeleton-${index}`} />
              ))}
            </View>
          ) : showErrorState ? (
            <ErrorState message={servicesError ?? "Please try again in a moment."} onRetry={handleRefresh} />
          ) : (
            <EmptyState queryActive={isQueryActive} />
          )
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            {servicesLoadingMore ? (
              <View style={styles.loadingMoreWrap}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.loadingMoreText}>Loading more services...</Text>
              </View>
            ) : null}
            <View style={{ height: 112 + insets.bottom }} />
          </View>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Services</Text>
                <View style={styles.backButtonPlaceholder} />
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Total Services</Text>
                  <Text style={styles.summaryValue}>{totalCount.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Active</Text>
                  <Text style={styles.summaryValue}>{activeCount}</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={20} color={Colors.text2} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search services by name"
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
              {SERVICE_FILTERS.map((filter) => {
                const isActive = filter === activeFilter;

                return (
                  <TouchableOpacity
                    key={filter}
                    activeOpacity={0.82}
                    onPress={() => setActiveFilter(filter)}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sortRow}>
              <Text style={styles.sortMeta}>
                {services.length} service{services.length === 1 ? "" : "s"}
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
        data={services}
        initialNumToRender={8}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={handleRefresh}
            refreshing={servicesRefreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <ServiceCard
            isDeleting={deletingServiceIds.includes(item.id)}
            onDelete={() => handleDeleteService(item)}
            service={item}
          />
        )}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        windowSize={8}
      />

      <View style={[styles.stickyButtonWrap, { bottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push("/services/new" as Href)}
          style={styles.stickyButton}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.stickyButtonText}>Add Service</Text>
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
            <Text style={styles.sortSheetTitle}>Sort Services</Text>
            {SERVICE_SORT_OPTIONS.map((option, index) => {
              const isActive = option === sortOption;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.82}
                  onPress={() => {
                    setSortOption(option);
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
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  serviceCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  serviceIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  serviceCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
    width: 24,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  serviceName: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    marginRight: Spacing.sm,
  },
  categoryText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: Colors.successBg,
  },
  statusBadgeInactive: {
    backgroundColor: Colors.errorBg,
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
  metaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  infoText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  skeletonIcon: {
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
    backgroundColor: "rgba(28, 25, 23, 0.12)",
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
