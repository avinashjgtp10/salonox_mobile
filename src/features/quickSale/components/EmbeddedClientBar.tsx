import { maskPhone } from "@/utils/maskPhone";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

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

function EmbeddedClientBarComponent({
  hasSelection,
  onAddClient,
  onSearchClient,
  onSelectWalkIn,
  selectedClient,
}: EmbeddedClientBarProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingLeft}>
          <View style={styles.headingIcon}>
            <Ionicons color={Colors.primaryDark} name="person-outline" size={16} />
          </View>
          <Text style={styles.headingTitle}>Client</Text>
        </View>
        {hasSelection ? (
          <View style={styles.selectedPill}>
            <Text style={styles.selectedPillText}>SELECTED</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <TouchableOpacity activeOpacity={0.84} onPress={onSearchClient} style={styles.clientRow}>
          <View style={[styles.avatar, { backgroundColor: selectedClient.avatarBg }]}>
            <Text style={[styles.avatarText, { color: selectedClient.avatarColor }]}>
              {hasSelection && selectedClient.id ? selectedClient.initials : "WI"}
            </Text>
          </View>
          <View style={styles.clientCopy}>
            <Text numberOfLines={1} style={styles.clientName}>
              {hasSelection ? (selectedClient.id ? selectedClient.name : "Walk-in customer") : "Choose a client"}
            </Text>
            <Text numberOfLines={1} style={styles.clientDetail}>
              {hasSelection
                ? selectedClient.id
                  ? maskPhone(selectedClient.phone)
                  : "No client attached"
                : "Search by name or mobile number"}
            </Text>
            {selectedClient.membership && selectedClient.id ? (
              <Text numberOfLines={1} style={styles.membership}>{selectedClient.membership}</Text>
            ) : null}
          </View>
          <Ionicons color={Colors.primary} name="chevron-forward" size={17} />
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity activeOpacity={0.84} onPress={onSelectWalkIn} style={styles.secondaryAction}>
            <Ionicons color={Colors.text2} name="walk-outline" size={15} />
            <Text style={styles.secondaryText}>Walk-In</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.84} onPress={onAddClient} style={styles.primaryAction}>
            <Ionicons color={Colors.onPrimary} name="person-add-outline" size={15} />
            <Text style={styles.primaryText}>Add Client</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const EmbeddedClientBar = memo(EmbeddedClientBarComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 1,
  },
  heading: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  headingLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  headingIcon: {
    alignItems: "center",
    backgroundColor: Colors.backgroundSelected,
    borderRadius: 10,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  headingTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  selectedPill: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  selectedPillText: {
    color: Colors.success,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  body: {
    gap: 12,
    padding: 12,
  },
  clientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 54,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "900",
  },
  clientCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  clientName: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
  },
  clientDetail: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "500",
  },
  membership: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 40,
  },
  secondaryText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 40,
  },
  primaryText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
});
