import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { Text, View } from "react-native";

export function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const { styles } = useAppointmentStyles();

  if (value === undefined || value === null) {
    return null;
  }
  const strValue = String(value).trim();
  if (strValue === "" || strValue === "-" || strValue.toLowerCase() === "null") {
    return null;
  }
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{strValue}</Text>
    </View>
  );
}
