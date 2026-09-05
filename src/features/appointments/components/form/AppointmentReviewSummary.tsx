import type { StaffMember } from "@/data/teamData";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { minutesToDisplayTime, parseClockToMinutes, validateDate, validateTime } from "@/features/appointments/utils/appointmentDateTime";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceListItem } from "@/types/service";
import { formatAppDate } from "@/utils/dateTime";
import { useMemo } from "react";
import { Text, View } from "react-native";

export function AppointmentReviewSummary({
  clientLabel,
  date,
  pricingTotals,
  selectedStaff,
  services,
  startTime,
  totalDuration,
}: {
  clientLabel: string;
  date: string;
  pricingTotals: {
    subtotal: number;
    grandTotal: number;
    discount?: number;
    totalDisc?: number;
    tax?: number;
    gstAmount?: number;
    taxBreakdown?: { name: string; rate: number; amount: number; inclusive: boolean }[];
  };
  selectedStaff: StaffMember | undefined;
  services: ServiceListItem[];
  startTime: string;
  totalDuration: number;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const serviceLabel = services.length > 0 ? services.map((service) => service.name).join(", ") : "-";
  const dateLabel = validateDate(date) ? formatAppDate(`${date}T00:00:00`) : "-";
  const timeLabel = validateTime(startTime) ? minutesToDisplayTime(parseClockToMinutes(startTime) ?? 0) : "-";
  const taxValue = pricingTotals.tax !== undefined ? pricingTotals.tax : (pricingTotals.gstAmount ?? 0);
  const discountValue = pricingTotals.discount !== undefined ? pricingTotals.discount : (pricingTotals.totalDisc ?? 0);

  const taxRows: [string, string][] = pricingTotals.taxBreakdown && pricingTotals.taxBreakdown.length > 0
    ? pricingTotals.taxBreakdown.map((t) => [`${t.name} (${t.rate}%)${t.inclusive ? " (Incl.)" : ""}`, formatCurrency(t.amount)])
    : [["Tax", formatCurrency(taxValue)]];

  const reviewRows: [string, string][] = [
    ["Client", clientLabel],
    ["Services", serviceLabel],
    ["Assigned Staff", selectedStaff?.name ?? "-"],
    ["Date", dateLabel],
    ["Time", timeLabel],
    ["Duration", totalDuration > 0 ? `${totalDuration} min` : "-"],
    ["Subtotal", formatCurrency(pricingTotals.subtotal)],
    ["Discount", formatCurrency(discountValue)],
    ...taxRows,
    ["Grand Total", formatCurrency(pricingTotals.grandTotal)],
  ];

  return (
    <View style={styles.serviceBreakdownCard}>
      {reviewRows.map(([label, value]) => (
        <View key={label} style={styles.availabilityRow}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowLabel}>{label}</Text>
          <Text ellipsizeMode="tail" numberOfLines={2} style={styles.availabilityRowValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}
