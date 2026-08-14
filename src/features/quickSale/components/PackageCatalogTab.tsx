import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import { Badge } from "@/components/ui/Badge";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { EmptyState, ErrorState, SkeletonBlock } from "@/features/quickSale/components/StateViews";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { packageService } from "@/services/package.service";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientPackage, PackageListItem } from "@/types/package";

const SKELETON_KEYS = ["package-one", "package-two", "package-three", "package-four"];

const isActiveCatalogPackage = (item: PackageListItem) => {
  const status = item.status.trim().toLowerCase();
  return !status || status === "active";
};

type PackageCatalogTabProps = {
  activeClientPackages: ClientPackage[];
  onSelect: (item: PackageListItem) => void;
  salonId?: string | null;
  search: string;
};

function PackageCardComponent({ onPress, item }: { item: PackageListItem; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View entering={FadeInUp.duration(200)} layout={LinearTransition.duration(200)} style={styles.rowWrap}>
      <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons name="albums-outline" size={18} color={Colors.goldDark} />
        </View>
        <View style={styles.rowCopy}>
          <Text numberOfLines={1} style={styles.rowTitle}>{item.name}</Text>
          <View style={styles.rowMetaRow}>
            <Text style={styles.rowPrice}>{formatCurrency(item.basePrice)}</Text>
            {item.category ? <Badge bg={Colors.bg2} color={Colors.text2} label={item.category} size="sm" /> : null}
          </View>
        </View>
        <View style={styles.addButton}>
          <Ionicons name="add" size={16} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const PackageCard = memo(PackageCardComponent);

export function PackageCatalogTab({ activeClientPackages, onSelect, salonId, search }: PackageCatalogTabProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [items, setItems] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPackages = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await packageService.getPackages(
        { limit: 50, search: debouncedSearch.trim() },
        salonId,
      );
      setItems(result.items.filter(isActiveCatalogPackage));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load packages.");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, salonId]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const activePackages = activeClientPackages.filter((item) => item.status.toLowerCase() === "active");

  return (
    <View style={styles.wrap}>
      {activePackages.length > 0 ? (
        <View style={styles.activeCard}>
          <Text style={styles.sectionLabel}>Active Client Packages</Text>
          {activePackages.slice(0, 3).map((item) => (
            <View key={`client-package-${item.id}`} style={styles.activeRow}>
              <Text numberOfLines={1} style={styles.activeName}>{item.packageName}</Text>
              <Text style={styles.activeMeta}>
                {item.services.reduce((total, service) => total + Math.max(service.remainingSessions, 0), 0)} sessions left
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => loadPackages()} />
      ) : loading && items.length === 0 ? (
        <View style={styles.skeletonStack}>
          {SKELETON_KEYS.map((key) => (
            <View key={key} style={styles.skeletonRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonCopy}>
                <SkeletonBlock height={13} width="62%" />
                <SkeletonBlock height={11} width="38%" />
              </View>
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState description="Try another search." icon="albums-outline" title="No packages found" />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(item) => `package-card-${item.id}`}
          refreshControl={
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={() => loadPackages(true)}
              refreshing={refreshing}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => <PackageCard item={item} onPress={() => onSelect(item)} />}
          ListFooterComponent={loading ? <ActivityIndicator color={Colors.primary} /> : null}
          removeClippedSubviews
          windowSize={7}
        />
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  activeCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    gap: 8,
    padding: Spacing.md,
  },
  activeMeta: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  activeName: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  activeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  listContent: {
    paddingBottom: 132,
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    elevation: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
  },
  rowCopy: {
    flex: 1,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  rowMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 3,
  },
  rowPrice: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  rowTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  rowWrap: {
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonIcon: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 44,
    width: 44,
  },
  skeletonRow: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  skeletonStack: {
    gap: Spacing.sm,
  },
  wrap: {
    flex: 1,
    gap: Spacing.sm,
  },
});
