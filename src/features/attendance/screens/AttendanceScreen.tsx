import { useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlTones } from "@/components/auth/pearl/tokens";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  StaffAvatar,
  StaffButton,
  StaffHeader,
  staffUi,
} from "@/features/staff/components/StaffPearl";
import {
  useAttendanceScreen,
  type AttendanceStaffRowData,
} from "../hooks/useAttendanceScreen";
import { useAttendanceActions } from "../hooks/useAttendanceActions";
import {
  getAttendanceAction,
  formatAttendanceDate,
  formatAttendanceTime,
  getWorkingHoursLabel,
  parseAttendanceDateTime,
} from "../utils/attendanceStatus";
import { AttendanceCheckModal } from "../components/AttendanceCheckModal";
import { EditAttendanceModal } from "../components/EditAttendanceModal";
import { AttendanceToast } from "../components/AttendanceToast";
import { AttendanceActivityDetails } from "../components/AttendanceActivityDetails";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canManageStaffLifecycle } from "@/utils/userProfile";
type CheckModalState = { mode: "checkIn" | "checkOut"; staffId: string } | null;
const toDateValue = (key: string) => new Date(key + "T00:00:00");
export default function AttendanceScreen() {
  const {
    handlePullToRefresh,
    isInitialLoading,
    isRefreshing,
    isTodaySelected,
    isStaffBusy,
    onNextDay,
    onPreviousDay,
    onSearchChange,
    onSelectDate,
    onToday,
    recordsError,
    rows,
    search,
    selectedDate,
    summary,
  } = useAttendanceScreen();
  const { checkIn, checkOut } = useAttendanceActions();
  const currentUser = useAppSelector(selectCurrentUser);
  const canManageAttendance =
    Boolean(currentUser?.role) && canManageStaffLifecycle(currentUser?.role);
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [checkModal, setCheckModal] = useState<CheckModalState>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const selectedDateLabel = formatAttendanceDate(selectedDate);

  const modalRow =
    rows.find((row) => row.staffMember.id === editStaffId) ?? null;
  const checkModalRow =
    rows.find((row) => row.staffMember.id === checkModal?.staffId) ?? null;

  const handlePrimaryAction = async (row: AttendanceStaffRowData) => {
    if (!canManageAttendance) return;
    const action = getAttendanceAction(row.record);

    if (action.kind === "edit") {
      if (canManageAttendance) {
        setEditStaffId(row.staffMember.id);
      }
      return;
    }

    setCheckModal({ mode: action.kind, staffId: row.staffMember.id });
  };

  const handleCheckSubmit = async ({
    isoTime,
    note,
  }: {
    isoTime?: string;
    note?: string;
  }) => {
    if (!canManageAttendance || !checkModalRow || !checkModal) {
      return;
    }

    if (checkModal.mode === "checkIn") {
      await checkIn({
        checkInTime: isoTime,
        date: selectedDate,
        notes: note,
        staffId: checkModalRow.staffMember.id,
      });
    } else {
      const start = parseAttendanceDateTime(checkModalRow.record?.checkInTime);
      if (start && isoTime && new Date(isoTime).getTime() < start.getTime()) {
        throw new Error(
          "Check-out cannot be before check-in. Use Edit Attendance for an overnight shift.",
        );
      }
      await checkOut({
        checkOutTime: isoTime,
        date: selectedDate,
        notes: note,
        staffId: checkModalRow.staffMember.id,
      });
    }

    setCheckModal(null);
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setIsDatePickerVisible(false);
    }

    if (event.type === "dismissed" || !selected) {
      return;
    }

    onSelectDate(
      [
        selected.getFullYear(),
        String(selected.getMonth() + 1).padStart(2, "0"),
        String(selected.getDate()).padStart(2, "0"),
      ].join("-"),
    );
  };

  const dayKeys = Array.from({ length: 5 }, (_, index) => {
    const date = toDateValue(selectedDate);
    date.setDate(date.getDate() + index - 4);
    return {
      date,
      key: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-"),
    };
  });
  const header = (
    <View style={{ gap: 14 }}>
      <StaffHeader
        title="Attendance"
        subtitle={selectedDateLabel}
        right={
          <TouchableOpacity
            accessibilityLabel="Attendance rules"
            style={staffUi.icon}
            onPress={() => router.push("/team/attendance-tools")}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={pearl.accentDeep}
            />
          </TouchableOpacity>
        }
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(
          [
            ["Present", summary.present, "rose"],
            ["Late", summary.late, "peach"],
            ["Absent", summary.absent, "lilac"],
          ] as const
        ).map(([label, value, tone]) => (
          <View
            key={label}
            style={[staffUi.formCard, { flex: 1, padding: 13, gap: 6 }]}
          >
            <View
              style={[staffUi.icon, { backgroundColor: pearlTones[tone].bg }]}
            >
              <Ionicons
                name={
                  label === "Present"
                    ? "checkmark-circle-outline"
                    : label === "Late"
                      ? "time-outline"
                      : "close-circle-outline"
                }
                size={19}
                color={pearlTones[tone].fg}
              />
            </View>
            <Text style={staffUi.muted}>{label}</Text>
            <Text style={staffUi.title}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TouchableOpacity
          accessibilityLabel="Previous day"
          onPress={onPreviousDay}
        >
          <Ionicons name="chevron-back" size={18} color={pearl.ink} />
        </TouchableOpacity>
        {dayKeys.map(({ key, date }) => (
          <TouchableOpacity
            key={key}
            onPress={() => onSelectDate(key)}
            style={{
              flex: 1,
              alignItems: "center",
              padding: 8,
              gap: 5,
              borderRadius: 16,
              backgroundColor:
                key === selectedDate ? pearl.accentWash : pearl.glass,
              borderWidth: 1,
              borderColor:
                key === selectedDate ? pearl.accentTint : pearl.glassBorder,
            }}
          >
            <Text style={staffUi.muted}>
              {date.toLocaleDateString("en-IN", { weekday: "short" })}
            </Text>
            <Text style={staffUi.rowTitle}>{date.getDate()}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          disabled={isTodaySelected}
          accessibilityLabel="Next day"
          onPress={onNextDay}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isTodaySelected ? pearl.muted : pearl.ink}
          />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity
          onPress={() => setIsDatePickerVisible(true)}
          style={[
            staffUi.input,
            { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={pearl.accentDeep}
          />
          <Text style={staffUi.rowTitle}>{selectedDateLabel}</Text>
        </TouchableOpacity>
        <StaffButton secondary label="Today" onPress={onToday} />
      </View>
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search staff"
        placeholderTextColor={pearl.placeholder}
        style={staffUi.input}
      />
      {recordsError ? <Text style={staffUi.error}>{recordsError}</Text> : null}
    </View>
  );
  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "bottom"]} style={staffUi.screen}>
        <AppStatusBar />
        <FlatList
          data={isInitialLoading ? [] : rows}
          keyExtractor={(row) => row.staffMember.id}
          contentContainerStyle={staffUi.content}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            isInitialLoading ? (
              <ActivityIndicator />
            ) : (
              <Text style={staffUi.muted}>No active staff members found.</Text>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handlePullToRefresh()}
              tintColor={pearl.accent}
            />
          }
          renderItem={({ item: row }) => {
            const record = row.record,
              action = getAttendanceAction(record),
              status = record?.onApprovedLeave
                ? "On leave"
                : record?.activity?.current_status === "ON_BREAK"
                  ? "On break"
                  : record?.statusKey === "notMarked" || !record
                    ? "Not marked"
                    : record.statusKey === "halfDay"
                      ? "Half day"
                      : record.statusKey.charAt(0).toUpperCase() +
                        record.statusKey.slice(1);
            return (
              <View
                style={[
                  staffUi.formCard,
                  { padding: 14, gap: 12, marginTop: 4 },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <StaffAvatar
                    initials={row.staffMember.initials}
                    uri={row.staffMember.avatarUrl}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={staffUi.rowTitle}>{row.staffMember.name}</Text>
                    <Text style={staffUi.muted}>
                      {row.staffMember.workingHours &&
                      row.staffMember.workingHours !== "-"
                        ? "Shift " + row.staffMember.workingHours
                        : "Shift not set"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 20,
                      backgroundColor:
                        status === "Present"
                          ? pearl.successBg
                          : status === "Late"
                            ? pearl.warningBg
                            : pearl.glass,
                      color:
                        status === "Present" ? pearl.successText : pearl.ink2,
                    }}
                  >
                    {status}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, flexDirection: "row", gap: 18 }}>
                    {[
                      [
                        "In",
                        record?.checkInTime
                          ? formatAttendanceTime(record.checkInTime)
                          : "\u2014",
                      ],
                      [
                        "Out",
                        record?.checkOutTime
                          ? formatAttendanceTime(record.checkOutTime)
                          : "\u2014",
                      ],
                      ["Hours", getWorkingHoursLabel(record)],
                    ].map(([label, value]) => (
                      <View key={label}>
                        <Text style={staffUi.muted}>{label}</Text>
                        <Text style={staffUi.rowTitle}>{value}</Text>
                      </View>
                    ))}
                  </View>
                  {canManageAttendance ? (
                    <TouchableOpacity
                      disabled={isStaffBusy(row.staffMember.id)}
                      onPress={() => void handlePrimaryAction(row)}
                      style={[
                        staffUi.icon,
                        { width: action.kind === "edit" ? 38 : 90 },
                      ]}
                    >
                      {action.kind === "edit" ? (
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={pearl.accentDeep}
                        />
                      ) : (
                        <Text
                          style={{
                            fontSize: 12,
                            color: pearl.accentDeep,
                            fontWeight: "700",
                          }}
                        >
                          {action.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
                <AttendanceActivityDetails
                  activity={record?.activity}
                  finalCheckout={record?.checkOutTime}
                />
              </View>
            );
          }}
        />
        <EditAttendanceModal
          attendanceDate={selectedDate}
          onClose={() => setEditStaffId(null)}
          record={modalRow?.record ?? null}
          staffMember={modalRow?.staffMember ?? null}
          visible={!!modalRow}
        />
        <AttendanceCheckModal
          date={selectedDate}
          isSaving={
            checkModalRow ? isStaffBusy(checkModalRow.staffMember.id) : false
          }
          mode={checkModal?.mode ?? "checkIn"}
          onClose={() => setCheckModal(null)}
          onSubmit={handleCheckSubmit}
          staffMember={checkModalRow?.staffMember ?? null}
          visible={!!checkModalRow}
        />
        {isDatePickerVisible && Platform.OS === "android" ? (
          <DateTimePicker
            maximumDate={new Date()}
            mode="date"
            onChange={handleDateChange}
            value={toDateValue(selectedDate)}
          />
        ) : null}
        <BottomSheet
          pearlStyle
          centered={false}
          title="Select date"
          visible={Platform.OS === "ios" && isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
        >
          {Platform.OS === "ios" ? (
            <DateTimePicker
              display="spinner"
              maximumDate={new Date()}
              mode="date"
              onChange={handleDateChange}
              value={toDateValue(selectedDate)}
            />
          ) : null}
          <StaffButton
            label="Done"
            onPress={() => setIsDatePickerVisible(false)}
          />
        </BottomSheet>
        <AttendanceToast />
      </SafeAreaView>
    </PearlBackground>
  );
}
