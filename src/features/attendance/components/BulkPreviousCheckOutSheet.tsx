import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { pearl } from "@/components/auth/pearl/tokens";
import { getApiErrorMessage } from "@/services/api";
import { attendanceService } from "@/services/attendance.service";
import { StaffButton, staffUi } from "@/features/staff/components/StaffPearl";
import { StaffTimeField } from "@/features/staff/components/StaffTimeField";
import { attendanceTimeToIso } from "../utils/attendanceRules";
import { formatAttendanceTime } from "../utils/attendanceStatus";

export type BulkPreviousCheckOutRow = {
  attendanceId: string;
  checkIn: string;
  date: string;
  openBreak: { actualStart: string; id: string } | null;
  staffId: string;
  staffName: string;
};

type RowOutcome = { message?: string; ok: boolean };

/**
 * Owner-side "Check out all previous days", mirroring the web Attendance page.
 * One check-out time is applied to every earlier day that has a check-in and no
 * check-out, across all staff, each closed on its OWN date through the same
 * endpoint and the same server checks as closing one by one.
 *
 * Nothing is forced: a day whose chosen time falls before its check-in, or that
 * has an unfinished break, is skipped and shown as skipped. Breaks are never
 * invented or removed here — those days are handled individually.
 */
export function BulkPreviousCheckOutSheet({ rows, visible, onClose, onDone }: {
  rows: BulkPreviousCheckOutRow[];
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [time, setTime] = useState("18:00");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, RowOutcome>>({});

  const [hour, minute] = time.split(":").map(Number);
  const plan = rows.map((row) => {
    const iso = attendanceTimeToIso(row.date, hour, minute);
    const state: "break" | "early" | "invalid" | "ready" = row.openBreak
      ? "break"
      : !iso
        ? "invalid"
        : Date.parse(iso) <= Date.parse(row.checkIn)
          ? "early"
          : "ready";
    return { ...row, iso, state };
  });
  const ready = plan.filter((item) => item.state === "ready" && !results[item.attendanceId]?.ok);
  const touched = Object.keys(results).length > 0;
  const finish = () => (touched ? onDone() : onClose());

  const run = async () => {
    setRunning(true);
    // Oldest first, one at a time: the server rejects a day whose check-out
    // would land before an earlier day's, so order matters.
    const next = { ...results };
    for (const item of ready) {
      try {
        await attendanceService.completeCheckout(item.attendanceId, item.iso as string);
        next[item.attendanceId] = { ok: true };
      } catch (failure) {
        next[item.attendanceId] = { message: getApiErrorMessage(failure), ok: false };
      }
      setResults({ ...next });
    }
    setRunning(false);
  };

  const outcomeLabel = (item: (typeof plan)[number]) => {
    const result = results[item.attendanceId];
    if (result) return result.ok ? "Checked out" : result.message || "Failed";
    if (item.state === "break") return "Skipped: unfinished break, close this day on its own";
    if (item.state === "early") return "Skipped: this time is before the check-in";
    if (item.state === "invalid") return "Skipped: that time is not valid for this day";
    return "Will be checked out";
  };
  const outcomeColor = (item: (typeof plan)[number]) => {
    const result = results[item.attendanceId];
    if (result) return result.ok ? pearl.successText : pearl.dangerText;
    return item.state === "ready" ? pearl.accentDeep : pearl.muted;
  };

  return (
    <BottomSheet
      pearlStyle
      centered={false}
      visible={visible}
      title="Check out all previous days"
      onClose={() => { if (!running) finish(); }}
    >
      <View style={{ gap: 12 }}>
        <StaffTimeField
          disabled={running}
          label="Check-out time for every day"
          onChange={setTime}
          value={time}
        />
        <Text translate style={staffUi.muted}>
          Each day is checked out at this time, on its own date. Days that can&apos;t take
          this time are skipped and listed below.
        </Text>
        <ScrollView style={{ maxHeight: 280 }}>
          {plan.map((item) => (
            <View
              key={item.attendanceId}
              style={[staffUi.menuRow, { alignItems: "flex-start", borderBottomWidth: 0, gap: 12 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={staffUi.rowTitle}>{item.staffName}</Text>
                <Text style={staffUi.muted}>
                  {item.date} · {formatAttendanceTime(item.checkIn)} →{" "}
                  {item.iso ? formatAttendanceTime(item.iso) : "—"}
                </Text>
              </View>
              <Text style={{ color: outcomeColor(item), flex: 1, fontSize: 12.5, textAlign: "right" }}>
                {outcomeLabel(item)}
              </Text>
            </View>
          ))}
        </ScrollView>
        <StaffButton
          disabled={running || ready.length === 0}
          label={running ? "Saving…" : `Check out all (${ready.length})`}
          onPress={() => void run()}
        />
        <StaffButton secondary disabled={running} label="Close" onPress={finish} />
      </View>
    </BottomSheet>
  );
}
