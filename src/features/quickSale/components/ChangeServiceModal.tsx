import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { ServiceCatalogTab } from "@/features/quickSale/components/ServiceCatalogTab";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceListItem } from "@/types/service";

type ChangeServiceModalProps = {
  onClose: () => void;
  onSelect: (service: ServiceListItem) => void;
  visible: boolean;
};

// A dedicated full Modal (not the ScrollView-based StaffBottomSheet) because
// this hosts ServiceCatalogTab's own FlatList — nesting a FlatList inside a
// ScrollView breaks scrolling and triggers RN's "VirtualizedLists should
// never be nested" warning.
export function ChangeServiceModal({ onClose, onSelect, visible }: ChangeServiceModalProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [search, setSearch] = useState("");

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.84} onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={Colors.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.title}>Change Service</Text>
          <View style={styles.closeButtonPlaceholder} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.text2} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Search services"
            placeholderTextColor={Colors.placeholder}
            style={styles.searchInput}
            value={search}
          />
        </View>

        <View style={styles.content}>
          <ServiceCatalogTab
            onSelect={(service) => {
              onSelect(service);
              onClose();
            }}
            search={search}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeButtonPlaceholder: {
    width: 36,
  },
  title: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginHorizontal: AppLayout.contentHorizontalPadding,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
});
