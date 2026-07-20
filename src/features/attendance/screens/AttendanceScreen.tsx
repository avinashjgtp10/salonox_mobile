import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AttendanceStaffRow } from "@/features/attendance/components/AttendanceStaffRow";
import { AttendanceSummaryCards } from "@/features/attendance/components/AttendanceSummaryCards";
import { AttendanceToast } from "@/features/attendance/components/AttendanceToast";
import { EditAttendanceModal } from "@/features/attendance/components/EditAttendanceModal";
import { useAttendanceActions } from "@/features/attendance/hooks/useAttendanceActions";
import { type AttendanceStaffRowData, useAttendanceScreen } from "@/features/attendance/hooks/useAttendanceScreen";
import { getAttendanceAction } from "@/features/attendance/utils/attendanceStatus";
import { useThemeColors } from "@/theme/ThemeProvider";

export default function AttendanceScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const {
    attendanceDate,
    handlePullToRefresh,
    isInitialLoading,
    isRefreshing,
    isStaffBusy,
    recordsError,
    rows,
    summary,
  } = useAttendanceScreen();
  const { checkIn, checkOut } = useAttendanceActions();
  const [modalStaffId, setModalStaffId] = useState<string | null>(null);

  const modalRow = rows.find((row) => row.staffMember.id === modalStaffId) ?? null;

  const handlePrimaryAction = async (row: AttendanceStaffRowData) => {
    const action = getAttendanceAction(row.record);

    if (action.kind === "edit") {
      setModalStaffId(row.staffMember.id);
      return;
    }

    try {
      if (action.kind === "checkIn") {
        await checkIn(row.staffMember.id);
      } else {
        await checkOut(row.staffMember.id);
      }
    } catch {
      // Failure is already surfaced via the shared attendance toast.
    }
  };

  const renderItem: ListRenderItem<AttendanceStaffRowData> = ({ item }) => (
    <AttendanceStaffRow
      isBusy={isStaffBusy(item.staffMember.id)}
      onOpenModal={() => setModalStaffId(item.staffMember.id)}
      onPrimaryAction={() => void handlePrimaryAction(item)}
      record={item.record}
      staffMember={item.staffMember}
    />
  );

  const listHeader = (
    <View>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.84} onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Attendance</Text>
      </View>

      <AttendanceSummaryCards summary={summary} />

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
        attendanceDate={attendanceDate}
        onClose={() => setModalStaffId(null)}
        record={modalRow?.record ?? null}
        staffMember={modalRow?.staffMember ?? null}
        visible={Boolean(modalRow)}
      />

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
  headerButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
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
});
