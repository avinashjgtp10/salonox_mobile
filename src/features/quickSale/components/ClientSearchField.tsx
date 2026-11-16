import { pearl } from "@/components/auth/pearl/tokens";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { InfiniteScrollLoader } from "@/components/ui/InfiniteScrollLoader";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ClientOptionRow } from "@/features/quickSale/components/ClientOptionRow";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { uniqueById } from "@/features/quickSale/utils/unique";
import { clientService } from "@/services/client.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import type { ClientListItem } from "@/types/client";
import { maskPhone } from "@/utils/maskPhone";

const MIN_QUERY_LENGTH = 1;
// A page at a time, loaded more on scroll — not an arbitrary cap. Matches
// web's Calendar/Quick Sale client dropdown (ClientPanel.tsx: 10 per page).
const PAGE_SIZE = 10;
const RESULTS_MAX_HEIGHT = 260;

// Same Quick Sale reference tokens as QuickSaleForm.
const c = { bg: "#FAF6F8", line: "#E9DFE5", fg: "#000000", muted: "#6B5D66", plum: "#A3467F" };

type ClientSearchFieldProps = {
  trailingAction?: ReactNode;
  pearlStyle?: boolean;
  // Receives whatever the user typed, so the new-client form opens pre-filled
  // with that name or phone instead of blank.
  onAddClient: (prefill?: string) => void;
  onSelect: (client: ClientListItem) => void;
};

/** Quick Sale client step, as on the web: search an existing client or add a
 * new one. There is no walk-in option, every sale belongs to a client. */
export function ClientSearchField({ onAddClient, onSelect, pearlStyle = false, trailingAction }: ClientSearchFieldProps) {
  const salonId = useAppSelector(selectActiveBranchId);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ hasMore: false, nextOffset: 0 });
  const [error, setError] = useState<string | null>(null);
  const isQueryReady = debouncedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isQueryReady) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      setPagination({ hasMore: false, nextOffset: 0 });
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError(null);
    clientService
      .searchClients(
        { inactive: false, limit: PAGE_SIZE, offset: 0, search: debouncedQuery, sort_by: "created_at", sort_order: "desc" },
        salonId,
      )
      .then((response) => {
        if (cancelled) return;
        setResults(uniqueById(response.clients));
        setPagination({ hasMore: response.pagination.hasMore, nextOffset: response.pagination.nextOffset });
      })
      .catch((searchError) => {
        if (!cancelled) {
          setResults([]);
          setError(searchError instanceof Error ? searchError.message : "Unable to search clients.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isQueryReady, salonId]);

  const handleLoadMore = () => {
    if (!isQueryReady || isSearching || loadingMore || !pagination.hasMore) return;
    setLoadingMore(true);
    clientService
      .searchClients(
        { inactive: false, limit: PAGE_SIZE, offset: pagination.nextOffset, search: debouncedQuery, sort_by: "created_at", sort_order: "desc" },
        salonId,
      )
      .then((response) => {
        setResults((current) => uniqueById([...current, ...response.clients]));
        setPagination({ hasMore: response.pagination.hasMore, nextOffset: response.pagination.nextOffset });
      })
      .catch(() => { /* a failed page-2 fetch keeps whatever's already shown */ })
      .finally(() => setLoadingMore(false));
  };

  return (
    <View style={s.wrap}>
      <View style={[s.row, pearlStyle && { flexDirection: "column", alignItems: "stretch" }]}>
        <View style={[s.searchBox, pearlStyle && { backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderRadius: 16, flex: 0 }]}>
          <Ionicons color={c.muted} name="search" size={18} />
          <TextInput
            accessibilityLabel="Search client"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder={pearlStyle ? "Search name or mobile" : "Search client"}
            placeholderTextColor={c.muted}
            returnKeyType="search"
            style={s.searchInput}
            value={query}
          />
          {isSearching ? (
            <ActivityIndicator color={c.plum} size="small" />
          ) : query ? (
            <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery("")}>
              <Ionicons color={c.muted} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        <View style={s.row}>
        <Pressable accessibilityRole="button" onPress={() => onAddClient(query.trim())} style={[s.addButton, pearlStyle && { alignSelf: "flex-start", borderRadius: 12, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, minHeight: 36 }]}>
          <Ionicons color="#000000" name="person-add-outline" size={16} />
          <Text translate style={[s.addText, pearlStyle && { color: pearl.accentDeep, fontSize: 13 }]}>{pearlStyle ? "New client" : "Add Client"}</Text>
        </Pressable>
        {trailingAction}
        </View>
      </View>

      {error ? <Text translate style={s.error}>{error}</Text> : null}
      {isQueryReady && !isSearching && !error && results.length === 0 ? (
        <Pressable onPress={() => onAddClient(query.trim())} style={s.empty}>
          <Text translate style={s.muted}>No clients found. </Text>
          <Text translate style={s.link}>Add a new client</Text>
        </Pressable>
      ) : null}
      {results.length > 0 ? (
        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListFooterComponent={<InfiniteScrollLoader loading={loadingMore} />}
          nestedScrollEnabled
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item, index }) => (
            <ClientOptionRow
              initials={item.initials}
              onPress={() => {
                setQuery("");
                onSelect(item);
              }}
              phone={`${maskPhone(item.phone)}${item.membership ? ` - ${item.membership}` : ""}`}
              title={item.fullName}
              withBorder={index < results.length - 1}
            />
          )}
          style={s.results}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  searchBox: {
    alignItems: "center",
    backgroundColor: c.bg,
    borderColor: c.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  searchInput: { color: c.fg, flex: 1, fontSize: 14, paddingVertical: 10 },
  addButton: {
    alignItems: "center",
    backgroundColor: "#EAC8E3",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  addText: { color: "#000000", fontSize: 13, fontWeight: "700" },
  results: { borderColor: c.line, borderRadius: 14, borderWidth: 1, maxHeight: RESULTS_MAX_HEIGHT, overflow: "hidden" },
  empty: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", paddingVertical: 4 },
  muted: { color: c.muted, fontSize: 13 },
  link: { color: c.plum, fontSize: 13, fontWeight: "700" },
  error: { color: "#E5484D", fontSize: 12 },
});
