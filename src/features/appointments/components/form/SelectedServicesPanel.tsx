import { Text } from "@/components/ui/AppTypography";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatCurrency, formatDurationLabel, getServicePricingTotals } from "@/features/appointments/utils/appointmentForm";
import type { AppointmentItemKind, AppointmentSelectedService } from "@/features/appointments/types/appointmentForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { itemTimeLabel, localItemTime } from "@/features/quickSale/utils/itemTime";
import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const ITEM_KIND_META: Record<AppointmentItemKind, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  membership: { icon: "card-outline", label: "Membership" },
  package: { icon: "albums-outline", label: "Package" },
  product: { icon: "cube-outline", label: "Product" },
};

export function SelectedServicesPanel({
  defaultStaffName,
  defaultTime,
  onPickStaff,
  onPickTime,
  onRemove,
  pricingTotals,
  services,
  totalDuration,
  totalPrice,
}: {
  // Each row falls back to the booking's staff and start time until changed.
  defaultStaffName?: string;
  defaultTime?: string;
  onPickStaff: (serviceId: string) => void;
  onPickTime: (serviceId: string) => void;
  onRemove: (serviceId: string) => void;
  pricingTotals: ReturnType<typeof getServicePricingTotals>;
  services: AppointmentSelectedService[];
  totalDuration: number;
  totalPrice: number;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const rowStyles = useMemo(() => createRowStyles(Colors), [Colors]);

  if (services.length === 0) {
    return (
      <View style={styles.emptyInlineState}>
        <Ionicons name="sparkles-outline" size={18} color={Colors.text2} />
        <Text style={styles.fieldHint}>Search and add at least one service.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.selectedServiceRow}>
        {services.map((service) => {
          const staffName = service.staffName || defaultStaffName;
          const time = localItemTime(service.startTime) ?? localItemTime(defaultTime);
          return (
          <View key={service.id} style={[styles.selectedServiceCard, styles.selectedServiceCardActive, rowStyles.card]}>
            <View style={rowStyles.top}>
            <View style={styles.selectedServiceIcon}>
              <Ionicons name={service.itemKind ? ITEM_KIND_META[service.itemKind].icon : "cut-outline"} size={18} color={Colors.primaryText} />
            </View>
            <View style={styles.selectedServiceCopy}>
              <Text numberOfLines={1} style={styles.selectedServiceName}>{service.name}</Text>
              <Text style={styles.selectedServiceMeta}>
                {service.itemKind
                  ? ITEM_KIND_META[service.itemKind].label
                  : [service.itemType, formatDurationLabel(service.durationMinutes)].filter(Boolean).join(" | ")}
              </Text>
              <Text style={styles.selectedServicePrice}>{formatCurrency(service.price)}</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel={`Remove ${service.name}`}
              activeOpacity={0.8}
              onPress={() => onRemove(service.id)}
              style={styles.removeServiceButton}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.error} />
            </TouchableOpacity>
            </View>
            <View style={rowStyles.pickers}>
              <View style={rowStyles.staffField}>
                <Text style={rowStyles.label}>Staff</Text>
                <TouchableOpacity accessibilityLabel={`Select staff for ${service.name}`} accessibilityRole="button" activeOpacity={0.8} onPress={() => onPickStaff(service.id)} style={rowStyles.select}>
                  <Ionicons name="person-outline" size={15} color={Colors.primaryText} />
                  <Text numberOfLines={1} style={[rowStyles.value, !staffName && rowStyles.placeholder]}>{staffName || "Select staff"}</Text>
                  <Ionicons name="chevron-down" size={15} color={Colors.primaryText} />
                </TouchableOpacity>
              </View>
              <View style={rowStyles.timeField}>
                <Text style={rowStyles.label}>Time</Text>
                <TouchableOpacity accessibilityLabel={`Select time for ${service.name}`} accessibilityRole="button" activeOpacity={0.8} onPress={() => onPickTime(service.id)} style={rowStyles.select}>
                  <Text numberOfLines={1} style={[rowStyles.value, !time && rowStyles.placeholder]}>{time ? itemTimeLabel(time) : "Time"}</Text>
                  <Ionicons name="chevron-down" size={15} color={Colors.primaryText} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          );
        })}
      </View>
      <View style={styles.serviceTotalsCard}>
        <View style={styles.serviceTotalItem}>
          <Ionicons name="time-outline" size={20} color={Colors.heading} />
          <View>
            <Text style={styles.availabilityLabel}>Duration</Text>
            <Text style={styles.availabilityValue}>{totalDuration} min</Text>
          </View>
        </View>
        <View style={styles.serviceTotalDivider} />
        <View style={styles.serviceTotalItem}>
          <Ionicons name="cash-outline" size={20} color={Colors.heading} />
          <View>
            <Text style={styles.availabilityLabel}>Grand Total</Text>
            <Text style={styles.availabilityValue}>{formatCurrency(totalPrice)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.serviceBreakdownCard}>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityRowLabel}>Subtotal</Text>
          <Text style={styles.availabilityRowValue}>{formatCurrency(pricingTotals.subtotal)}</Text>
        </View>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityRowLabel}>Discount</Text>
          <Text style={styles.availabilityRowValue}>{formatCurrency(pricingTotals.discount)}</Text>
        </View>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityRowLabel}>Tax</Text>
          <Text style={styles.availabilityRowValue}>{formatCurrency(pricingTotals.tax)}</Text>
        </View>
      </View>
    </>
  );
}

const createRowStyles = (Colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: { flexDirection: "column", gap: 10 },
  top: { flexDirection: "row", gap: 8 },
  pickers: { flexDirection: "row", gap: 10 },
  staffField: { flex: 1, gap: 4 },
  timeField: { width: 112, gap: 4 },
  label: { color: Colors.appointmentMuted, fontSize: 12, fontWeight: "600" },
  select: { alignItems: "center", borderColor: Colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 42, paddingHorizontal: 10 },
  value: { color: Colors.heading, flex: 1, fontSize: 13, fontWeight: "600" },
  placeholder: { color: Colors.appointmentMuted },
});
