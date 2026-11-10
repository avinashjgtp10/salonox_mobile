import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import type { AttendanceRecord } from "@/types/attendance";

type PunchLocations = Pick<AttendanceRecord, "checkInTime" | "checkOutTime" | "checkInLocation" | "checkOutLocation">;

/** Show the saved punch location, never the salon address or the viewer's GPS. */
export function AttendancePunchLocations({ record }: { record?: PunchLocations | null }) {
  const p = usePearlPalette();
  if (!record?.checkInTime) return null;
  const punches = [
    { label: "Check-in location", location: record.checkInLocation },
    ...(record.checkOutTime ? [{ label: "Checkout location", location: record.checkOutLocation }] : []),
  ];
  return <View style={{ gap: 6, marginTop: 6 }}>{punches.map(punch => <View key={punch.label} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
    <Ionicons name="location-outline" size={14} color={p.accentDeep} style={{ marginTop: 2 }} />
    <View style={{ flex: 1, gap: 2 }}><Text translate style={{ color: p.accentDeep, fontSize: 11, fontWeight: "600" }}>{punch.label}</Text><Text selectable style={{ color: p.muted, fontSize: 12, lineHeight: 17 }}>{punch.location?.trim() || "Not captured"}</Text></View>
  </View>)}</View>;
}
