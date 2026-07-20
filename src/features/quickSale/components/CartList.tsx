import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { CartItemRow } from "@/features/quickSale/components/CartItemRow";
import { uniqueByKey } from "@/features/quickSale/utils/unique";
import type { CartItem } from "@/features/quickSale/types";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { PosStaffMember } from "@/types/sales";

type CartListProps = {
  allowPriceOverride: boolean;
  items: CartItem[];
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

export function CartList({
  allowPriceOverride,
  items,
  onChangeService,
  onDuplicate,
  onRemove,
  onSetDiscount,
  onSetNote,
  onSetPrice,
  onSetQuantity,
  onSetStaff,
  staffOptions,
}: CartListProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const visibleItems = useMemo(() => uniqueByKey(items, (item) => item.lineId), [items]);

  if (visibleItems.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="cart-outline" size={22} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Bill is empty</Text>
        <Text style={styles.emptyDescription}>Add services or products to start this sale.</Text>
      </View>
    );
  }

  return (
    <View>
      {visibleItems.map((item) => (
        <CartItemRow
          allowPriceOverride={allowPriceOverride}
          item={item}
          key={`bill-line-${item.lineId}`}
          onChangeService={onChangeService}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onSetDiscount={onSetDiscount}
          onSetNote={onSetNote}
          onSetPrice={onSetPrice}
          onSetQuantity={onSetQuantity}
          onSetStaff={onSetStaff}
          staffOptions={staffOptions}
        />
      ))}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  emptyWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 186,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 16,
    elevation: 1,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 48,
    justifyContent: "center",
    marginBottom: Spacing.sm,
    width: 48,
  },
  emptyTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyDescription: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 220,
    textAlign: "center",
  },
});
