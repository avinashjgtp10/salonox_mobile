import { useEffect, useMemo } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { pearl } from "@/components/auth/pearl/themedPearl";
import { StaffAvatar, staffUi } from "@/features/staff/components/StaffPearl";
import { fetchStaffScheduleThunk } from "@/middleware/staff/staffSchedule.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffSchedule,
  selectStaffScheduleError,
  selectStaffScheduleLoaded,
  selectStaffScheduleLoading,
} from "@/store/staff/staffSchedule.slice";
import type { RootState } from "@/store";
import type { ScheduleDayEntry } from "@/types/staffSchedule";
import { isValidStaffId } from "@/utils/staffIds";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

type StaffLite = { id: string; name: string; initials: string; avatarUrl?: string | null };

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

/** "09:00" → "9 AM" (compact for the 7-column grid). */
const formatCompactTime = (value: string | null) => {
  if (!value) return "—";
  const [h, m] = value.split(":").map((p) => parseInt(p, 10));
  if (!Number.isFinite(h)) return value;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 || 12;
  return m ? `${hour12}:${String(m).padStart(2, "0")} ${period}` : `${hour12} ${period}`;
};

/** Build a 7-length ordered list of entries keyed by weekday, defaulting to Off. */
const orderWeek = (days: ScheduleDayEntry[] | null | undefined): ScheduleDayEntry[] => {
  const map = new Map<string, ScheduleDayEntry>();
  (days ?? []).forEach((entry) => map.set(entry.day.toLowerCase(), entry));
  return WEEK_DAYS.map((day) => map.get(day) ?? { day, endTime: null, isOff: true, startTime: null });
};

function StaffScheduleCard({ staff }: { staff: StaffLite }) {
  const dispatch = useAppDispatch();
  const schedule = useAppSelector((state: RootState) => selectStaffSchedule(state, staff.id));
  const loaded = useAppSelector((state: RootState) => selectStaffScheduleLoaded(state, staff.id));
  const loading = useAppSelector((state: RootState) => selectStaffScheduleLoading(state, staff.id));
  const error = useAppSelector((state: RootState) => selectStaffScheduleError(state, staff.id));

  useEffect(() => {
    if (!isValidStaffId(staff.id) || loaded || loading) return;
    void dispatch(fetchStaffScheduleThunk(staff.id));
  }, [dispatch, staff.id, loaded, loading]);

  const week = useMemo(() => orderWeek(schedule?.days ?? null), [schedule?.days]);

  return (
    <View style={[staffUi.formCard, styles.card]}>
      <View style={styles.cardHeader}>
        <StaffAvatar initials={staff.initials} uri={staff.avatarUrl ?? undefined} />
        <View style={{ flex: 1 }}>
          <Text style={staffUi.rowTitle}>{staff.name}</Text>
          <Text style={staffUi.muted}>Weekly shift</Text>
        </View>
      </View>

      {loading && !loaded ? (
        <View style={styles.loadingRow}><ActivityIndicator color={pearl.accentDeep} size="small" /></View>
      ) : error ? (
        <Text style={staffUi.error}>{error}</Text>
      ) : (
        <View style={styles.grid}>
          {week.map((entry, index) => (
            <View key={entry.day} style={styles.col}>
              <Text style={[styles.dayHeader, index === 6 && styles.dayHeaderSunday]}>{DAY_HEADERS[index]}</Text>
              <View style={[styles.cell, entry.isOff && styles.cellOff]}>
                {entry.isOff ? (
                  <Text translate style={styles.cellOffText}>Off</Text>
                ) : (
                  <>
                    <Text style={styles.cellTime}>{formatCompactTime(entry.startTime)}</Text>
                    <Text style={styles.cellDash}>–</Text>
                    <Text style={styles.cellTime}>{formatCompactTime(entry.endTime)}</Text>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Owner-side weekly shifts table, shown as a scrollable list of staff cards.
 * Mirrors the web ScheduleTable but laid out for mobile — a 7-column mini
 * grid per staff member so the whole week fits on-screen without side scroll.
 * Read-only here; edits still happen in the staff profile's schedule section.
 */
export function StaffWeeklyShiftsView({
  staff,
  refreshing,
  onRefresh,
  listHeader,
}: {
  staff: StaffLite[];
  refreshing: boolean;
  onRefresh: () => void;
  listHeader?: React.ReactElement | null;
}) {
  return (
    <FlatList
      data={staff}
      keyExtractor={(item) => item.id}
      contentContainerStyle={staffUi.content}
      ListHeaderComponent={listHeader}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={<Text translate style={staffUi.muted}>No staff members found.</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={pearl.accent} />}
      renderItem={({ item }) => <StaffScheduleCard staff={item} />}
    />
  );
}

const styles = themedStyles((p) => ({
  card: { gap: 12, marginTop: 4, padding: 14 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  loadingRow: { paddingVertical: 10 },
  grid: { flexDirection: "row", gap: 4, justifyContent: "space-between" },
  col: { alignItems: "center", flex: 1, gap: 4 },
  dayHeader: { color: p.ink2, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  dayHeaderSunday: { color: p.warningText },
  cell: { alignItems: "center", backgroundColor: p.glass, borderColor: p.glassBorder, borderRadius: 10, borderWidth: 1, minHeight: 50, paddingHorizontal: 3, paddingVertical: 5, width: "100%" },
  cellOff: { backgroundColor: p.warningBg, borderColor: p.warningBg },
  cellOffText: { color: p.warningText, fontSize: 10, fontWeight: "800" },
  cellTime: { color: p.ink, fontSize: 9.5, fontWeight: "700", textAlign: "center" },
  cellDash: { color: p.muted, fontSize: 9 },
}));
