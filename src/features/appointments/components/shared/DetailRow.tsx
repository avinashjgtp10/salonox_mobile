import { Text } from "@/components/ui/AppTypography";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { View } from "react-native";

/** Same emptiness rule DetailRow itself uses, exported so a card can figure out
 * which of its rows is the real last one when some are conditional. */
export function isDetailRowVisible(value?: string | number | null): boolean {
  if (value === undefined || value === null) return false;
  const strValue = String(value).trim();
  return strValue !== "" && strValue !== "-" && strValue.toLowerCase() !== "null";
}

/**
 * Which entry in an ordered group is the one that will actually render last —
 * several rows in a card are conditional, so the JSX's last line is not
 * always the one that ends up drawn at the bottom. Only that one entry's
 * divider should be dropped; everyone else keeps theirs.
 */
export function lastVisibleFlags(values: (string | number | null | undefined)[]): boolean[] {
  let lastVisibleIndex = -1;
  values.forEach((value, index) => {
    if (isDetailRowVisible(value)) lastVisibleIndex = index;
  });
  return values.map((_, index) => index === lastVisibleIndex);
}

export function DetailRow({ label, value, last = false }: { label: string; value?: string | number | null; last?: boolean }) {
  const { styles } = useAppointmentStyles();

  if (!isDetailRowVisible(value)) {
    return null;
  }
  const strValue = String(value).trim();
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text translate style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{strValue}</Text>
    </View>
  );
}
