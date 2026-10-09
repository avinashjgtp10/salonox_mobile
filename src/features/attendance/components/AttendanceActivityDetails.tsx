import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AttendanceActivity } from "@/types/attendance";
import { formatAttendanceTime } from "../utils/attendanceStatus";

export const formatAttendanceDuration = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
};

export function AttendanceActivityDetails({ activity, finalCheckout }: { activity?: AttendanceActivity; finalCheckout?: string | null }) {
  const Colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  if (!activity) return null;
  return <View style={{ gap: 6, marginTop: 12 }}>
    {activity.scheduled_start && activity.scheduled_end ? <Text style={{ color: Colors.text2, fontSize: 12 }}>
      Shift: {formatAttendanceTime(activity.scheduled_start)} – {formatAttendanceTime(activity.scheduled_end)} · {formatAttendanceDuration(activity.scheduled_seconds ?? 0)} scheduled
    </Text> : null}
    <Text style={{ color: Colors.text, fontSize: 12 }}>Worked: {formatAttendanceDuration(activity.total_worked_seconds)} · Break: {formatAttendanceDuration(activity.total_break_seconds)} · {activity.break_count} breaks</Text>
    {activity.active_break ? <Text style={{ color: Colors.warning, fontSize: 13 }}>
      On Break since {formatAttendanceTime(activity.active_break.actual_start)} · Expected return {formatAttendanceTime(activity.active_break.planned_end)}
    </Text> : null}
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ paddingVertical: 8 }}>
      <Text style={{ color: Colors.primary, fontWeight: "700" }}>{expanded ? "Hide activity" : "View attendance activity"}</Text>
    </TouchableOpacity>
    {expanded ? <View style={{ borderLeftWidth: 2, borderColor: Colors.border, paddingLeft: 12, gap: 10 }}>
      {activity.sessions.map((session, index) => <View key={`${session.type}:${session.start_time}`}>
        <Text style={{ color: Colors.heading, fontSize: 13 }}>{formatAttendanceTime(session.start_time)} · {session.type === "BREAK" ? "Break Started" : index === 0 ? "Checked In" : "Checked In — Returned"}</Text>
        {session.type === "BREAK" ? <Text style={{ color: Colors.text2, fontSize: 12 }}>Expected return {formatAttendanceTime(activity.breaks.find(item => item.actual_start === session.start_time)?.planned_end)}</Text> : null}
        {session.type === "BREAK" && activity.breaks.find(item => item.actual_start === session.start_time)?.note ? <Text style={{ color: Colors.text2, fontSize: 12 }}>Note: {activity.breaks.find(item => item.actual_start === session.start_time)?.note}</Text> : null}
      </View>)}
      {finalCheckout ? <Text style={{ color: Colors.heading, fontSize: 13 }}>{formatAttendanceTime(finalCheckout)} · Checked Out</Text> : null}
    </View> : null}
  </View>;
}
