import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";
import { type ThemeColors } from "@/constants/theme";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { getApiErrorMessage } from "@/services/api";
import { serviceService } from "@/services/service.service";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceListItem } from "@/types/service";

type Props = {
  query: string;
  salonId?: string | null;
  selectedServiceIds: ReadonlySet<string>;
  onSelect: (service: ServiceListItem) => void;
  onDismiss: () => void;
};

export function ServiceSearchDropdown({ query, salonId, selectedServiceIds, onSelect, onDismiss }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const id = ++requestId.current;
    setItems([]);
    setNextOffset(null);
    setError(null);
    setLoading(true);
    busy.current = true;
    const timeout = setTimeout(() => {
      void serviceService.getServices({
        search: query.trim(), isActive: true, limit: 20, offset: 0,
        sort_by: "name", sort_order: "asc",
      }, salonId).then((result) => {
        if (requestId.current !== id) return;
        setItems(result.services);
        setNextOffset(result.pagination.hasMore ? result.pagination.nextOffset : null);
      }).catch((reason: unknown) => {
        if (requestId.current === id) setError(getApiErrorMessage(reason));
      }).finally(() => {
        if (requestId.current !== id) return;
        busy.current = false;
        setLoading(false);
      });
    }, 300);
    return () => { clearTimeout(timeout); requestId.current += 1; };
  }, [query, salonId, retry]);

  const loadMore = async () => {
    if (busy.current || nextOffset === null) return;
    const id = requestId.current;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await serviceService.getServices({
        search: query.trim(), isActive: true, limit: 20, offset: nextOffset,
        sort_by: "name", sort_order: "asc",
      }, salonId);
      if (requestId.current !== id) return;
      setItems((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...result.services.filter((item) => !ids.has(item.id))];
      });
      setNextOffset(result.pagination.hasMore && result.pagination.nextOffset > nextOffset
        ? result.pagination.nextOffset : null);
    } catch (reason) {
      if (requestId.current === id) setError(getApiErrorMessage(reason));
    } finally {
      if (requestId.current === id) { busy.current = false; setLoading(false); }
    }
  };

  return (
    <View style={styles.dropdown}>
      <View style={styles.header}>
        <Text style={styles.heading}>Matching services</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close search results" onPress={onDismiss} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.text2} />
        </Pressable>
      </View>
      <FlatList
        style={styles.list}
        data={items}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        keyExtractor={(item) => item.id}
        ListEmptyComponent={!loading && !error ? <Text style={styles.message}>No services found.</Text> : null}
        renderItem={({ item }) => {
          const selected = selectedServiceIds.has(item.id);
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`${selected ? "Added" : "Add"} ${item.name}`} disabled={selected} onPress={() => onSelect(item)} style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.durationMinutes ? `${item.durationMinutes} min · ` : ""}{formatCurrency(item.price)}</Text>
              </View>
              <Ionicons name={selected ? "checkmark-circle" : "add-circle-outline"} size={24} color={colors.primary} />
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View>
            {error ? <Text style={styles.message}>{error}</Text> : null}
            {loading ? <ActivityIndicator style={styles.message} color={colors.primary} /> : error || nextOffset !== null ? (
              <Pressable accessibilityRole="button" onPress={() => { if (items.length) void loadMore(); else setRetry((value) => value + 1); }} style={styles.footer}>
                <Text style={styles.heading}>{error ? "Try again" : "Show more services"}</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, zIndex: 30, elevation: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  list: { maxHeight: 280 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  copy: { flex: 1 },
  name: { color: colors.heading, fontSize: 14, fontWeight: "600" },
  meta: { color: colors.text2, fontSize: 12, marginTop: 4 },
  message: { color: colors.text2, padding: 16 },
  footer: { alignItems: "center", padding: 14 },
});
