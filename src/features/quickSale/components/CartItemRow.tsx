import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { formatCurrency, parseAmount } from "@/features/quickSale/utils/money";
import { uniqueById } from "@/features/quickSale/utils/unique";
import type { CartItem } from "@/features/quickSale/types";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { PosStaffMember } from "@/types/sales";

type CartItemRowProps = {
  allowPriceOverride: boolean;
  item: CartItem;
  onChangeService: (lineId: string) => void;
  onDuplicate: (lineId: string) => void;
  onRemove: (lineId: string) => void;
  onSetDiscount: (lineId: string, amount: number) => void;
  onSetNote: (lineId: string, note: string) => void;
  onSetPrice: (lineId: string, price: number) => void;
  onSetQuantity: (lineId: string, quantity: number) => void;
  onSetStaff: (lineId: string, staffId: string | null, staffName: string | null) => void;
  staffOptions: PosStaffMember[];
};

function CartItemRowComponent({
  allowPriceOverride,
  item,
  onChangeService,
  onDuplicate,
  onRemove,
  onSetDiscount,
  onSetNote,
  onSetPrice,
  onSetQuantity,
  onSetStaff,
  staffOptions,
}: CartItemRowProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleStaffOptions = useMemo(() => uniqueById(staffOptions), [staffOptions]);
  const lineTotal = Math.max(0, item.unitPrice * item.quantity - item.discountAmount);
  const isOverridden = item.unitPrice !== item.originalUnitPrice;

  return (
    <Animated.View entering={FadeIn.duration(160)} layout={LinearTransition.springify().damping(18)} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {formatCurrency(item.unitPrice)}
            {isOverridden ? " (overridden)" : ""}
            {item.staffName ? ` - ${item.staffName}` : item.itemType === "service" ? " - No staff assigned" : ""}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel={isExpanded ? "Collapse item details" : "Expand item details"}
          onPress={() => setIsExpanded((current) => !current)}
          style={styles.expandButton}
        >
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.stepper}>
          <TouchableOpacity
            accessibilityLabel="Decrease quantity"
            disabled={item.quantity <= 1}
            onPress={() => onSetQuantity(item.lineId, item.quantity - 1)}
            style={styles.stepperButton}
          >
            <Ionicons name="remove" size={14} color={item.quantity <= 1 ? Colors.text2 : Colors.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{item.quantity}</Text>
          <TouchableOpacity
            accessibilityLabel="Increase quantity"
            onPress={() => onSetQuantity(item.lineId, item.quantity + 1)}
            style={styles.stepperButton}
          >
            <Ionicons name="add" size={14} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        <Text style={styles.lineTotal}>{formatCurrency(lineTotal)}</Text>

        <TouchableOpacity accessibilityLabel="Duplicate item" onPress={() => onDuplicate(item.lineId)} style={styles.iconButton}>
          <Ionicons name="copy-outline" size={16} color={Colors.text2} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Remove item" onPress={() => onRemove(item.lineId)} style={styles.iconButton}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {isExpanded ? (
        <Animated.View entering={FadeIn.duration(140)} style={styles.detailsWrap}>
          {item.itemType === "service" ? (
            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Staff</Text>
              <ScrollView contentContainerStyle={styles.staffRow} horizontal showsHorizontalScrollIndicator={false}>
                {visibleStaffOptions.map((staff) => {
                  const isActive = staff.id === item.staffId;

                  return (
                    <TouchableOpacity
                      key={`staff-option-${item.lineId}-${staff.id}`}
                      activeOpacity={0.84}
                      onPress={() => onSetStaff(item.lineId, staff.id, staff.name)}
                      style={[styles.staffChip, isActive && styles.staffChipActive]}
                    >
                      <Text style={[styles.staffChipText, isActive && styles.staffChipTextActive]}>{staff.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.detailRowTwoCol}>
            <View style={styles.detailGroupHalf}>
              <Text style={styles.detailLabel}>Item Discount</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) => onSetDiscount(item.lineId, parseAmount(value))}
                placeholder="0"
                placeholderTextColor={Colors.placeholder}
                style={styles.detailInput}
                value={item.discountAmount ? String(item.discountAmount) : ""}
              />
            </View>
            {allowPriceOverride ? (
              <View style={styles.detailGroupHalf}>
                <Text style={styles.detailLabel}>Price Override</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => onSetPrice(item.lineId, parseAmount(value) || item.originalUnitPrice)}
                  placeholder={String(item.originalUnitPrice)}
                  placeholderTextColor={Colors.placeholder}
                  style={styles.detailInput}
                  value={isOverridden ? String(item.unitPrice) : ""}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.detailGroup}>
            <Text style={styles.detailLabel}>Note</Text>
            <TextInput
              onChangeText={(value) => onSetNote(item.lineId, value)}
              placeholder="Add a note for this item"
              placeholderTextColor={Colors.placeholder}
              style={styles.detailInput}
              value={item.note}
            />
          </View>

          {item.itemType === "service" ? (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => onChangeService(item.lineId)}
              style={styles.changeServiceButton}
            >
              <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primaryDark} />
              <Text style={styles.changeServiceText}>Change Service</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export const CartItemRow = memo(CartItemRowComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 1,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  copy: {
    flex: 1,
  },
  name: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 2,
  },
  expandButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  controlsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepper: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperButton: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  stepperValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    minWidth: 16,
    textAlign: "center",
  },
  lineTotal: {
    color: Colors.primaryDark,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  detailsWrap: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  detailGroup: {
    marginBottom: Spacing.sm,
  },
  detailRowTwoCol: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  detailGroupHalf: {
    flex: 1,
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  detailInput: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  staffRow: {
    gap: 8,
  },
  staffChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  staffChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  staffChipText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
  },
  staffChipTextActive: {
    color: "#FFFFFF",
  },
  changeServiceButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    minHeight: 40,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  changeServiceText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
});
