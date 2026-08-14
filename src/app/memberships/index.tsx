import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { deleteMembershipThunk, fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import {
  selectDeletingMembershipIds,
  selectMemberships,
  selectMembershipsEmpty,
  selectMembershipsError,
  selectMembershipsHasMore,
  selectMembershipsLoading,
  selectMembershipsLoadingMore,
  selectMembershipsPagination,
  selectMembershipsQuery,
  selectMembershipsRefreshing,
  selectMembershipsTotal,
} from "@/store/membership/membership.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Membership } from "@/types/membership";
import { formatAppDate } from "@/utils/dateTime";

type FilterKey = "All" | "Active" | "Expired" | "Expiring Soon";

const FILTERS: FilterKey[] = ["All", "Active", "Expired", "Expiring Soon"];

const formatMoney = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

const formatDate = (value: string) => {
  return formatAppDate(value, "-");
};

const getStatus = (membership: Membership) => {
  if (membership.enableOnlineSales || membership.enableOnlineRedemption) return "Active";
  return "Inactive";
};

const filterMemberships = (items: Membership[], filter: FilterKey) => {
  if (filter === "Active") return items.filter((item) => getStatus(item) === "Active");
  if (filter === "Expired" || filter === "Expiring Soon") return [];
  return items;
};

function SkeletonCard() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.card}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonGrid}>
        <View style={styles.skeletonPill} />
        <View style={styles.skeletonPill} />
      </View>
    </View>
  );
}

function EmptyState({ filter, onCreate }: { filter: FilterKey; onCreate: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name="diamond-outline" size={30} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No memberships found</Text>
      <Text style={styles.emptyText}>
        {filter === "All"
          ? "Create polished salon plans with benefits, validity, and online redemption."
          : "No plans match this status yet."}
      </Text>
      {filter === "All" ? (
        <TouchableOpacity activeOpacity={0.88} onPress={onCreate} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Create Membership</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function MembershipCard({
  expanded,
  isDeleting,
  membership,
  onDelete,
  onEdit,
  onToggleExpanded,
  onView,
}: {
  expanded: boolean;
  isDeleting: boolean;
  membership: Membership;
  onDelete: () => void;
  onEdit: () => void;
  onToggleExpanded: () => void;
  onView: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const status = getStatus(membership);
  const benefits = membership.includedServices.map((service) => service.serviceName);
  const visibleBenefits = expanded ? benefits : benefits.slice(0, 2);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onView} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.planMark, { backgroundColor: Colors.bg2 }]}>
          <Ionicons name="diamond-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text numberOfLines={1} style={styles.cardTitle}>{membership.name}</Text>
          <Text style={styles.cardSubtitle}>{membership.sessionType} membership</Text>
        </View>
        <TouchableOpacity activeOpacity={0.82} onPress={() => setMenuOpen(true)} style={styles.iconMenu}>
          {isDeleting ? <ActivityIndicator color={Colors.error} size="small" /> : <Ionicons name="ellipsis-horizontal" size={18} color={Colors.text2} />}
        </TouchableOpacity>
      </View>

      <View style={styles.metricGrid}>
        <Metric label="Price" value={formatMoney(membership.price)} />
        <Metric label="Validity" value={membership.validFor} />
        <Metric label="Clients" value="Not tracked" />
        <Metric label="Updated" value={formatDate(membership.updatedAt)} />
      </View>

      <View style={styles.benefitsWrap}>
        <Text style={styles.sectionMini}>Included Benefits</Text>
        {visibleBenefits.length > 0 ? (
          visibleBenefits.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
              <Text numberOfLines={1} style={styles.benefitText}>{benefit}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.mutedText}>No benefits added yet</Text>
        )}
        {benefits.length > 2 ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onToggleExpanded} style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>{expanded ? "View Less" : `View More (${benefits.length - 2})`}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, status === "Active" ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusText, status === "Active" ? styles.statusTextActive : styles.statusTextInactive]}>{status}</Text>
        </View>
        <Text style={styles.updatedText}>Last updated {formatDate(membership.updatedAt)}</Text>
      </View>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable onPress={() => setMenuOpen(false)} style={styles.menuOverlay}>
          <Pressable style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{membership.name}</Text>
            <MenuAction icon="eye-outline" label="View" onPress={() => { setMenuOpen(false); onView(); }} />
            <MenuAction icon="create-outline" label="Edit" onPress={() => { setMenuOpen(false); onEdit(); }} />
            <MenuAction danger icon="trash-outline" label="Delete" onPress={() => { setMenuOpen(false); onDelete(); }} />
          </Pressable>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.metricBox}>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MenuAction({ danger, icon, label, onPress }: { danger?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.menuAction}>
      <Ionicons name={icon} size={18} color={danger ? Colors.error : Colors.primary} />
      <Text style={[styles.menuActionText, danger && { color: Colors.error }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function MembershipsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const items = useAppSelector(selectMemberships);
  const error = useAppSelector(selectMembershipsError);
  const isEmpty = useAppSelector(selectMembershipsEmpty);
  const hasMore = useAppSelector(selectMembershipsHasMore);
  const loading = useAppSelector(selectMembershipsLoading);
  const loadingMore = useAppSelector(selectMembershipsLoadingMore);
  const pagination = useAppSelector(selectMembershipsPagination);
  const queryState = useAppSelector(selectMembershipsQuery);
  const refreshing = useAppSelector(selectMembershipsRefreshing);
  const total = useAppSelector(selectMembershipsTotal);
  const deletingIds = useAppSelector(selectDeletingMembershipIds);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Membership | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    void dispatch(fetchMembershipsThunk({ limit: 20, reset: true, search: debouncedQuery }));
  }, [debouncedQuery, dispatch]);

  const visibleItems = useMemo(() => filterMemberships(items, filter), [filter, items]);
  const activeCount = items.filter((item) => getStatus(item) === "Active").length;
  const revenue = items.reduce((sum, item) => sum + item.price, 0);

  const refresh = () => {
    void dispatch(fetchMembershipsThunk({ ...queryState, refresh: true }));
  };

  const loadMore = () => {
    if (!hasMore || loading || loadingMore || refreshing) return;
    void dispatch(fetchMembershipsThunk({ ...queryState, page: pagination.page + 1 }));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await dispatch(deleteMembershipThunk(deleteTarget.id));
    if (deleteMembershipThunk.fulfilled.match(result)) {
      setToast("Membership deleted successfully.");
      setTimeout(() => setToast(null), 2200);
    } else {
      setToast("Unable to delete membership.");
      setTimeout(() => setToast(null), 2200);
    }
    setDeleteTarget(null);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.content}
        data={loading && items.length === 0 ? [] : visibleItems}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl colors={[Colors.primary]} tintColor={Colors.primary} refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace("/more" as Href))} style={styles.headerButton}>
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.title}>Memberships</Text>
              <View style={styles.headerButtonGhost} />
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={Colors.text2} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search memberships" placeholderTextColor={Colors.placeholder} style={styles.searchInput} />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.placeholder} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {FILTERS.map((item) => {
                const active = item === filter;
                return (
                  <TouchableOpacity key={item} activeOpacity={0.84} onPress={() => setFilter(item)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.summaryGrid}>
              <SummaryCard icon="albums-outline" label="Total Memberships" value={String(total)} />
              <SummaryCard icon="pulse-outline" label="Active" value={String(activeCount)} />
              <SummaryCard icon="hourglass-outline" label="Expired" value="0" />
              <SummaryCard icon="cash-outline" label="Revenue" value={formatMoney(revenue)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View>{Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}</View>
          ) : error && items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cloud-offline-outline" size={32} color={Colors.error} />
              <Text style={styles.emptyTitle}>Unable to load memberships</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity activeOpacity={0.84} onPress={refresh} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : isEmpty || visibleItems.length === 0 ? (
            <EmptyState filter={filter} onCreate={() => router.push("/memberships/new" as Href)} />
          ) : null
        }
        ListFooterComponent={
          <View style={{ paddingBottom: insets.bottom + 96 }}>
            {loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingMoreText}>Loading more memberships...</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <MembershipCard
            expanded={expandedIds.includes(item.id)}
            isDeleting={deletingIds.includes(item.id)}
            membership={item}
            onDelete={() => setDeleteTarget(item)}
            onEdit={() => router.push(`/memberships/${item.id}/edit` as Href)}
            onToggleExpanded={() => setExpandedIds((ids) => (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]))}
            onView={() => router.push(`/memberships/${item.id}` as Href)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/memberships/new" as Href)} style={[styles.fab, { bottom: insets.bottom + 18 }]}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <DeleteDialog membership={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
      {toast ? <View style={[styles.toast, { bottom: insets.bottom + 86 }]}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function SummaryCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}><Ionicons name={icon} size={16} color={Colors.primary} /></View>
      <Text numberOfLines={1} style={styles.summaryValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function DeleteDialog({ membership, onCancel, onConfirm }: { membership: Membership | null; onCancel: () => void; onConfirm: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Modal transparent animationType="fade" visible={Boolean(membership)} onRequestClose={onCancel}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialog}>
          <View style={styles.dialogIcon}><Ionicons name="trash-outline" size={24} color={Colors.error} /></View>
          <Text style={styles.dialogTitle}>Delete membership?</Text>
          <Text style={styles.dialogText}>
            This will remove &quot;{membership?.name}&quot; from your catalog. This action cannot be undone.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity activeOpacity={0.84} onPress={onCancel} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity activeOpacity={0.84} onPress={onConfirm} style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  content: { paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.sm },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.lg },
  headerButton: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, height: AppLayout.headerActionSize, justifyContent: "center", width: AppLayout.headerActionSize },
  headerButtonGhost: { width: AppLayout.headerActionSize },
  title: { color: Colors.heading, fontSize: AppLayout.headerTitleFontSize, fontWeight: "800" },
  searchWrap: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.search, borderWidth: 1, flexDirection: "row", gap: Spacing.sm, minHeight: AppLayout.searchBarHeight, paddingHorizontal: Spacing.md },
  searchInput: { color: Colors.heading, flex: 1, fontSize: 14, minHeight: AppLayout.searchBarHeight },
  chipsRow: { gap: Spacing.sm, paddingVertical: Spacing.md },
  chip: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text2, fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: Radius.lg, borderWidth: 1, flexBasis: "48%", flexGrow: 1, padding: Spacing.md },
  summaryIcon: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.md, height: 30, justifyContent: "center", width: 30 },
  summaryValue: { color: Colors.heading, fontSize: 17, fontWeight: "900", marginTop: Spacing.sm },
  summaryLabel: { color: Colors.text2, fontSize: 11, fontWeight: "700", marginTop: 3 },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, marginBottom: Spacing.md, padding: Spacing.lg, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 2 },
  cardTop: { alignItems: "center", flexDirection: "row" },
  planMark: { alignItems: "center", borderRadius: Radius.lg, height: 46, justifyContent: "center", width: 46 },
  cardTitleWrap: { flex: 1, marginLeft: Spacing.md },
  cardTitle: { color: Colors.heading, fontSize: 16, fontWeight: "900" },
  cardSubtitle: { color: Colors.text2, fontSize: 12, fontWeight: "700", marginTop: 3, textTransform: "capitalize" },
  iconMenu: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.md },
  metricBox: { backgroundColor: Colors.bg, borderRadius: Radius.md, flexBasis: "47%", flexGrow: 1, padding: Spacing.md },
  metricValue: { color: Colors.heading, fontSize: 13, fontWeight: "900" },
  metricLabel: { color: Colors.text2, fontSize: 10, fontWeight: "700", marginTop: 4 },
  benefitsWrap: { marginTop: Spacing.md },
  sectionMini: { color: Colors.text2, fontSize: 11, fontWeight: "900", marginBottom: Spacing.sm, textTransform: "uppercase" },
  benefitRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 5 },
  benefitText: { color: Colors.heading, flex: 1, fontSize: 12, fontWeight: "700" },
  mutedText: { color: Colors.text2, fontSize: 12, fontWeight: "600" },
  viewMoreButton: { alignSelf: "flex-start", marginTop: Spacing.sm },
  viewMoreText: { color: Colors.primary, fontSize: 12, fontWeight: "900" },
  cardFooter: { alignItems: "center", borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: Spacing.md, paddingTop: Spacing.md },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  statusActive: { backgroundColor: Colors.successBg },
  statusInactive: { backgroundColor: Colors.errorBg },
  statusText: { fontSize: 10, fontWeight: "900" },
  statusTextActive: { color: Colors.success },
  statusTextInactive: { color: Colors.error },
  updatedText: { color: Colors.text2, fontSize: 11, fontWeight: "700" },
  skeletonTitle: { backgroundColor: Colors.bg2, borderRadius: Radius.full, height: 18, width: "62%" },
  skeletonLine: { backgroundColor: Colors.bg2, borderRadius: Radius.full, height: 12, marginTop: 12, width: "82%" },
  skeletonGrid: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg },
  skeletonPill: { backgroundColor: Colors.bg2, borderRadius: Radius.md, flex: 1, height: 46 },
  emptyCard: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, marginTop: Spacing.lg, padding: Spacing.xxl },
  emptyIcon: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.xl, height: 64, justifyContent: "center", width: 64 },
  emptyTitle: { color: Colors.heading, fontSize: 19, fontWeight: "900", marginTop: Spacing.md, textAlign: "center" },
  emptyText: { color: Colors.text2, fontSize: 13, lineHeight: 20, marginTop: Spacing.sm, textAlign: "center" },
  emptyButton: { backgroundColor: Colors.primary, borderRadius: Radius.full, marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: 13 },
  emptyButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  loadingMore: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: Spacing.lg },
  loadingMoreText: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
  fab: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.full, height: 58, justifyContent: "center", position: "absolute", right: Spacing.lg, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 18, width: 58 },
  menuOverlay: { backgroundColor: "rgba(0,0,0,0.28)", flex: 1, justifyContent: "flex-end", padding: Spacing.lg },
  menuSheet: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.lg },
  menuTitle: { color: Colors.heading, fontSize: 16, fontWeight: "900", marginBottom: Spacing.sm },
  menuAction: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 13 },
  menuActionText: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  dialogOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.34)", flex: 1, justifyContent: "center", padding: Spacing.lg },
  dialog: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.xl, width: "100%" },
  dialogIcon: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: Radius.lg, height: 52, justifyContent: "center", width: 52 },
  dialogTitle: { color: Colors.heading, fontSize: 20, fontWeight: "900", marginTop: Spacing.md },
  dialogText: { color: Colors.text2, fontSize: 13, lineHeight: 20, marginTop: Spacing.sm },
  dialogActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xl },
  cancelButton: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.full, flex: 1, paddingVertical: 13 },
  deleteButton: { alignItems: "center", backgroundColor: Colors.error, borderRadius: Radius.full, flex: 1, paddingVertical: 13 },
  cancelText: { color: Colors.heading, fontSize: 13, fontWeight: "900" },
  deleteText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  toast: { alignSelf: "center", backgroundColor: Colors.heading, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 12, position: "absolute" },
  toastText: { color: Colors.bg, fontSize: 12, fontWeight: "900" },
});
