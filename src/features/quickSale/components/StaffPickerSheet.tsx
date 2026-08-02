import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { PosStaffMember } from "@/types/sales";

type StaffPickerSheetProps = {
  onClose: () => void;
  onSelect: (staffId: string, staffName: string) => void;
  selectedStaffId: string | null;
  staff: PosStaffMember[];
  visible: boolean;
};

export function StaffPickerSheet({ onClose, onSelect, selectedStaffId, staff, visible }: StaffPickerSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <BottomSheet
      onClose={onClose}
      scrollable={false}
      subtitle="Who performed this item?"
      title="Assign Staff"
      visible={visible}
    >
      <View style={styles.listWrap}>
        {staff.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={22} color={Colors.text2} />
            <Text style={styles.emptyStateText}>No staff available for this branch.</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={staff}
            keyExtractor={(item) => `staff-picker-${item.id}`}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedStaffId;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onSelect(item.id, item.name)}
                  style={[styles.staffRow, isSelected && styles.staffRowSelected]}
                >
                  <View style={[styles.staffAvatar, { backgroundColor: item.avatarBg }]}>
                    <Text style={[styles.staffAvatarText, { color: item.avatarColor }]}>{item.initials}</Text>
                  </View>
                  <View style={styles.staffCopy}>
                    <Text numberOfLines={1} style={styles.staffName}>
                      {item.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.staffMeta}>
                      {item.role ?? item.status}
                    </Text>
                  </View>
                  {isSelected ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                </TouchableOpacity>
              );
            }}
            style={styles.list}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    listWrap: {
      maxHeight: 420,
      minHeight: 200,
    },
    list: {
      marginTop: 4,
    },
    listContent: {
      paddingBottom: Spacing.sm,
    },
    staffRow: {
      alignItems: "center",
      borderRadius: Radius.md,
      flexDirection: "row",
      gap: Spacing.sm,
      minHeight: 56,
      paddingHorizontal: 4,
      paddingVertical: 10,
    },
    staffRowSelected: {
      backgroundColor: Colors.bg2,
    },
    staffAvatar: {
      alignItems: "center",
      borderRadius: Radius.md,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    staffAvatarText: {
      fontSize: 12,
      fontWeight: "800",
    },
    staffCopy: {
      flex: 1,
    },
    staffName: {
      color: Colors.heading,
      fontSize: 13,
      fontWeight: "700",
    },
    staffMeta: {
      color: Colors.text2,
      fontSize: 11,
      marginTop: 2,
    },
    emptyState: {
      alignItems: "center",
      gap: 8,
      paddingVertical: Spacing.xl,
    },
    emptyStateText: {
      color: Colors.text2,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
    },
  });
