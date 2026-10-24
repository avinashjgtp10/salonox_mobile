import { Text } from "@/components/ui/AppTypography";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatCurrency, formatDurationLabel, getServicePricingTotals } from "@/features/appointments/utils/appointmentForm";
import type { AppointmentItemKind, AppointmentSelectedService } from "@/features/appointments/types/appointmentForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";

const ITEM_KIND_META: Record<AppointmentItemKind, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  membership: { icon: "card-outline", label: "Membership" },
  package: { icon: "albums-outline", label: "Package" },
  product: { icon: "cube-outline", label: "Product" },
};

export function SelectedServicesPanel({
  onRemove,
  pricingTotals,
  services,
  totalDuration,
  totalPrice,
}: {
  onRemove: (serviceId: string) => void;
  pricingTotals: ReturnType<typeof getServicePricingTotals>;
  services: AppointmentSelectedService[];
  totalDuration: number;
  totalPrice: number;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            activeOpacity={0.84}
            onPress={() => onRemove(service.id)}
            style={[styles.selectedServiceCard, styles.selectedServiceCardActive]}
          >
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
          </TouchableOpacity>
        ))}
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
