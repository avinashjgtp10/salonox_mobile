import { useCallback, useState, type ReactNode } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { ScreenShell } from "../shared/ScreenShell";

type Check = { branchId: string | null | undefined; attempt: number; status: "loading" | "empty" | "ready" | "error"; message?: string };

export function CalendarStaffGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const branchId = useAppSelector(selectActiveBranchId);
  const colors = useThemeColors();
  const [check, setCheck] = useState<Check>({ branchId, attempt: -1, status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // Refresh on return from staff creation, even when the calendar tab stayed mounted.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setCheck({ branchId, attempt, status: "loading" });
    void dispatch(fetchStaffThunk({ page: 1, reset: true })).then((result) => {
      if (cancelled) return;
      if (fetchStaffThunk.fulfilled.match(result)) {
        setCheck({ branchId, attempt, status: result.payload.staffMembers.length ? "ready" : "empty" });
      } else {
        setCheck({ branchId, attempt, status: "error", message: result.payload?.message ?? "Unable to check staff. Please retry." });
      }
    });
    return () => { cancelled = true; };
  }, [branchId, dispatch, attempt]));

  if (check.branchId === branchId && check.attempt === attempt && check.status === "ready") return <>{children}</>;
  const loading = check.branchId !== branchId || check.attempt !== attempt || check.status === "loading";
  return (
    <ScreenShell title="Calendar" hideHeader scrollable={false} contentBottomPadding={0} safeAreaEdges={["top"]}>
      <View style={styles.container}>
        {loading ? <ActivityIndicator accessibilityLabel="Checking staff" color={colors.primary} size="large" /> : <>
          {check.status === "error" ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.error }]}>{check.message}</Text> : null}
          <TouchableOpacity accessibilityRole="button" style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => {
            if (check.status === "error") setAttempt((value) => value + 1);
            else router.push({ pathname: "/team/new", params: { fromCalendar: "true" } });
          }}><Text style={styles.buttonText}>{check.status === "error" ? "Retry" : "Add Staff"}</Text></TouchableOpacity>
        </>}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  message: { textAlign: "center" },
  button: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
