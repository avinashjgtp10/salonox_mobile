import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AttendanceCheckModal } from "@/features/attendance/components/AttendanceCheckModal";
import { AttendanceStaffRow } from "@/features/attendance/components/AttendanceStaffRow";
import { AttendanceSummaryCards } from "@/features/attendance/components/AttendanceSummaryCards";
import { AttendanceToast } from "@/features/attendance/components/AttendanceToast";
import { EditAttendanceModal } from "@/features/attendance/components/EditAttendanceModal";
import { useAttendanceActions } from "@/features/attendance/hooks/useAttendanceActions";
import { type AttendanceStaffRowData, useAttendanceScreen } from "@/features/attendance/hooks/useAttendanceScreen";
import { formatAttendanceDate, getAttendanceAction } from "@/features/attendance/utils/attendanceStatus";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { canManageStaffLifecycle } from "@/utils/userProfile";

type CheckModalState = {
  mode: "checkIn" | "checkOut";
  staffId: string;
} | null;

const toDateValue = (dateKey: string) => {
  const parsed = new Date(`${dateKey}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function AttendanceScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
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
  const canManageAttendance = canManageStaffLifecycle(currentUser?.role);
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [checkModal, setCheckModal] = useState<CheckModalState>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const selectedDateLabel = formatAttendanceDate(selectedDate);

  const modalRow = rows.find((row) => row.staffMember.id === editStaffId) ?? null;
  const checkModalRow = rows.find((row) => row.staffMember.id === checkModal?.staffId) ?? null;

  const handlePrimaryAction = async (row: AttendanceStaffRowData) => {
    const action = getAttendanceAction(row.record);

    if (action.kind === "edit") {
      if (canManageAttendance) {
        setEditStaffId(row.staffMember.id);
      }
      return;
    }

    setCheckModal({ mode: action.kind, staffId: row.staffMember.id });
  };

  const handleCheckSubmit = async ({ isoTime, note }: { isoTime?: string; note?: string }) => {
    if (!checkModalRow || !checkModal) {
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

    onSelectDate([
      selected.getFullYear(),
      String(selected.getMonth() + 1).padStart(2, "0"),
      String(selected.getDate()).padStart(2, "0"),
    ].join("-"));
  };

  const renderItem: ListRenderItem<AttendanceStaffRowData> = ({ item }) => (
    <AttendanceStaffRow
      canManageAttendance={canManageAttendance}
      isBusy={isStaffBusy(item.staffMember.id)}
      onOpenModal={() => setEditStaffId(item.staffMember.id)}
      onPrimaryAction={() => void handlePrimaryAction(item)}
      record={item.record}
      staffMember={item.staffMember}
    />
  );

  const listHeader = (
    <View>
      <View style={styles.header}>
        <AppBackButton style={styles.headerButtonPosition} />
        <Text style={styles.headerTitle}>Staff Attendance</Text>
      </View>

      <AttendanceSummaryCards summary={summary} />

      <View style={styles.dateNavCard}>
        <TouchableOpacity activeOpacity={0.84} onPress={onPreviousDay} style={styles.dateNavButton}>
          <Ionicons name="chevron-back" size={16} color={Colors.primaryDark} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => setIsDatePickerVisible(true)}
          style={styles.datePickerButton}
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.text2} />
          <Text style={styles.datePickerText}>{selectedDateLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={isTodaySelected}
          onPress={onNextDay}
          style={[styles.dateNavButton, isTodaySelected && styles.dateNavButtonDisabled]}
        >
          <Ionicons name="chevron-forward" size={16} color={Colors.primaryDark} />
        </TouchableOpacity>
        {!isTodaySelected ? (
          <TouchableOpacity activeOpacity={0.84} onPress={onToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.text2} />
        <TextInput
          onChangeText={onSearchChange}
          placeholder="Search staff by name or role"
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          value={search}
        />
        {search ? (
          <TouchableOpacity activeOpacity={0.84} onPress={() => onSearchChange("")}>
            <Ionicons name="close-circle" size={17} color={Colors.text2} />
          </TouchableOpacity>
        ) : null}
      </View>

      {recordsError ? <Text style={styles.errorText}>{recordsError}</Text> : null}

      {isInitialLoading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={styles.listLoading} />
      ) : null}

      {!isInitialLoading && rows.length === 0 ? (
        <Text style={styles.emptyText}>No active staff members found.</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.content}
        data={isInitialLoading ? [] : rows}
        keyExtractor={(item) => item.staffMember.id}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => void handlePullToRefresh()}
            refreshing={isRefreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      <EditAttendanceModal
        attendanceDate={selectedDate}
        onClose={() => setEditStaffId(null)}
        record={modalRow?.record ?? null}
        staffMember={modalRow?.staffMember ?? null}
        visible={Boolean(modalRow)}
      />

      <AttendanceCheckModal
        date={selectedDate}
        isSaving={checkModalRow ? isStaffBusy(checkModalRow.staffMember.id) : false}
        mode={checkModal?.mode ?? "checkIn"}
        onClose={() => setCheckModal(null)}
        onSubmit={handleCheckSubmit}
        staffMember={checkModalRow?.staffMember ?? null}
        visible={Boolean(checkModalRow)}
      />

      {isDatePickerVisible && Platform.OS === "android" ? (
        <DateTimePicker
          maximumDate={new Date()}
          mode="date"
          onChange={handleDateChange}
          value={toDateValue(selectedDate)}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal animationType="fade" onRequestClose={() => setIsDatePickerVisible(false)} transparent visible={isDatePickerVisible}>
          <Pressable onPress={() => setIsDatePickerVisible(false)} style={styles.modalBackdrop}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker
                display="spinner"
                maximumDate={new Date()}
                mode="date"
                onChange={handleDateChange}
                value={toDateValue(selectedDate)}
              />
              <TouchableOpacity activeOpacity={0.84} onPress={() => setIsDatePickerVisible(false)} style={styles.modalDoneButton}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      <AttendanceToast />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: AppLayout.headerMarginBottom,
    marginTop: Spacing.md,
    position: "relative",
  },
  headerButtonPosition: {
    left: 0,
    position: "absolute",
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  dateNavCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
    padding: 10,
  },
  dateNavButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  dateNavButtonDisabled: {
    opacity: 0.45,
  },
  datePickerButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 38,
    justifyContent: "center",
  },
  datePickerText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.control,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 46,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  listLoading: {
    marginVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: 18,
    width: "100%",
  },
  modalTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  modalDoneButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.control,
    marginTop: 12,
    paddingVertical: 12,
  },
  modalDoneText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
