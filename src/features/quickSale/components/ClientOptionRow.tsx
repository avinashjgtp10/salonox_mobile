import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type ClientOptionRowProps = {
  initials: string;
  isSelected?: boolean;
  onPress: () => void;
  phone: string;
  title: string;
  withBorder?: boolean;
};

function ClientOptionRowComponent({
  initials,
  isSelected = false,
  onPress,
  phone,
  title,
  withBorder = false,
}: ClientOptionRowProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[
        styles.row,
        withBorder && styles.rowBorder,
        isSelected && styles.rowSelected,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.phone}>
          {phone}
        </Text>
      </View>
      <Ionicons
        name={isSelected ? "checkmark-circle" : "chevron-forward"}
        size={18}
        color={isSelected ? Colors.primary : Colors.text2}
      />
    </TouchableOpacity>
  );
}

export const ClientOptionRow = memo(ClientOptionRowComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  avatarText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  phone: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 62,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  rowSelected: {
    backgroundColor: Colors.bg2,
  },
});
