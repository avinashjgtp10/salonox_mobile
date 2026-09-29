import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import type { ThemeColors } from "@/constants/theme";
import type { QuickSaleClient } from "@/features/quickSale/types";
import { useThemeColors } from "@/theme/ThemeProvider";

type EmbeddedClientBarProps = {
  hasSelection: boolean;
  onAddClient: () => void;
  onSearchClient: () => void;
  onSelectWalkIn: () => void;
  selectedClient: QuickSaleClient;
};

/**
 * Compact client picker row used when Quick Sale is embedded in the calendar
 * modal, which skips the full-screen "choose client" step.
 */
function EmbeddedClientBarComponent({
  hasSelection,
  onAddClient,
  onSearchClient,
  onSelectWalkIn,
  selectedClient,
}: EmbeddedClientBarProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const label = hasSelection
    ? selectedClient.id
      ? `${selectedClient.name} · ${selectedClient.phone}`
      : "Walk-In"
    : "Search client by name or mobile number...";

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Ionicons color={Colors.heading} name="person" size={16} />
        <Text style={styles.headingTitle}>Client</Text>
      </View>
      <View style={styles.row}>
        <TouchableOpacity activeOpacity={0.84} onPress={onSearchClient} style={styles.search}>
          <Ionicons color={Colors.text2} name="search-outline" size={16} />
          <Text numberOfLines={1} style={[styles.searchText, hasSelection && styles.searchTextSelected]}>
            {label}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.84} onPress={onSelectWalkIn} style={styles.walkInAction}>
          <Text style={styles.walkInText}>Walk-In</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.84} onPress={onAddClient} style={styles.addAction}>
          <Ionicons color={Colors.onPrimary} name="add" size={15} />
          <Text style={styles.addText}>Add Client</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const EmbeddedClientBar = memo(EmbeddedClientBarComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    overflow: "hidden",
  },
  heading: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  headingTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    padding: 8,
  },
  search: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    minWidth: 0,
    paddingHorizontal: 9,
  },
  searchText: {
    color: Colors.placeholder,
    flex: 1,
    fontSize: 10,
  },
  searchTextSelected: {
    color: Colors.heading,
    fontWeight: "700",
  },
  walkInAction: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 9,
  },
  walkInText: {
    color: Colors.heading,
    fontSize: 10,
    fontWeight: "800",
  },
  addAction: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: 7,
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8,
  },
  addText: {
    color: Colors.onPrimary,
    fontSize: 10,
    fontWeight: "800",
  },
});
