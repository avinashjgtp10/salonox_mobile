import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ClientOptionRow } from "@/features/quickSale/components/ClientOptionRow";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { uniqueById } from "@/features/quickSale/utils/unique";
import { clientService } from "@/services/client.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import type { ClientListItem } from "@/types/client";
import { maskPhone } from "@/utils/maskPhone";

const MIN_QUERY_LENGTH = 1;
const RESULT_LIMIT = 5;

// Same Quick Sale reference tokens as QuickSaleForm.
const c = { bg: "#FAF6F8", line: "#E9DFE5", fg: "#000000", muted: "#6B5D66", plum: "#A3467F" };

type ClientSearchFieldProps = {
  onAddClient: () => void;
  onSelect: (client: ClientListItem) => void;
};

/** Quick Sale client step, as on the web: search an existing client or add a
 * new one. There is no walk-in option, every sale belongs to a client. */
export function ClientSearchField({ onAddClient, onSelect }: ClientSearchFieldProps) {
  const salonId = useAppSelector(selectActiveBranchId);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isQueryReady = debouncedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isQueryReady) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError(null);
    clientService
      .searchClients(
        { inactive: false, limit: RESULT_LIMIT, offset: 0, search: debouncedQuery, sort_by: "created_at", sort_order: "desc" },
        salonId,
      )
      .then((response) => {
        if (!cancelled) setResults(uniqueById(response.clients).slice(0, RESULT_LIMIT));
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

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View style={s.searchBox}>
          <Ionicons color={c.muted} name="search" size={18} />
          <TextInput
            accessibilityLabel="Search client"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search client"
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
        <Pressable accessibilityRole="button" onPress={onAddClient} style={s.addButton}>
          <Ionicons color="#000000" name="person-add-outline" size={16} />
          <Text style={s.addText}>Add Client</Text>
        </Pressable>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}
      {isQueryReady && !isSearching && !error && results.length === 0 ? (
        <Pressable onPress={onAddClient} style={s.empty}>
          <Text style={s.muted}>No clients found. </Text>
          <Text style={s.link}>Add a new client</Text>
        </Pressable>
      ) : null}
      {results.length > 0 ? (
        <View style={s.results}>
          {results.map((client, index) => (
            <ClientOptionRow
              initials={client.initials}
              key={client.id}
              onPress={() => {
                setQuery("");
                onSelect(client);
              }}
              phone={`${maskPhone(client.phone)}${client.membership ? ` - ${client.membership}` : ""}`}
              title={client.fullName}
              withBorder={index < results.length - 1}
            />
          ))}
        </View>
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
  results: { borderColor: c.line, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  empty: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", paddingVertical: 4 },
  muted: { color: c.muted, fontSize: 13 },
  link: { color: c.plum, fontSize: 13, fontWeight: "700" },
  error: { color: "#E5484D", fontSize: 12 },
});
