import { pearl } from "@/components/auth/pearl/tokens";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectStaffMembers } from "@/store/staff/staff.slice";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { ScreenShell } from "../shared/ScreenShell";

type Check = { branchId: string | null | undefined; attempt: number; status: "loading" | "empty" | "ready" | "error"; message?: string };

export function CalendarStaffGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const branchId = useAppSelector(selectActiveBranchId);
  const colors = usePearlColors();
  const [check, setCheck] = useState<Check>({ branchId, attempt: -1, status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const loadedStaffCount = useAppSelector(selectStaffMembers).length;
  // The branch whose staff were actually read from the server. Staff already in
  // the store only count for the branch they were loaded for — after a branch
  // switch they are the previous salon's and have to be fetched again.
  const verifiedBranch = useRef<string | null | undefined>(undefined);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    // Staff already in the store answer "does this salon have anyone?" on their
    // own. Re-fetching would reset the shared list to its first page of 10 while
    // the calendar's own useAllStaffMembers is still paging through everyone,
    // and whichever landed last decided how many columns the grid got — so a
    // salon with more than ten staff could lose the rest of them on any focus.
    if (loadedStaffCount > 0 && verifiedBranch.current === branchId) {
      setCheck({ branchId, attempt, status: "ready" });
      return () => { cancelled = true; };
    }
    setCheck({ branchId, attempt, status: "loading" });
    // `all` so that an empty store is filled with every staff member, not a
    // first page the calendar would then have to correct.
    void dispatch(fetchStaffThunk({ all: true, page: 1, reset: true })).then((result) => {
      if (cancelled) return;
      if (fetchStaffThunk.fulfilled.match(result)) {
        verifiedBranch.current = branchId;
        setCheck({ branchId, attempt, status: result.payload.staffMembers.length ? "ready" : "empty" });
      } else {
        setCheck({ branchId, attempt, status: "error", message: result.payload?.message ?? "Unable to check staff. Please retry." });
      }
    });
    return () => { cancelled = true; };
  }, [branchId, dispatch, attempt, loadedStaffCount]));

  if (check.branchId === branchId && check.attempt === attempt && check.status === "ready") return <>{children}</>;
  const loading = check.branchId !== branchId || check.attempt !== attempt || check.status === "loading";
  return (
    <ScreenShell title="Calendar" hideHeader scrollable={false} contentBottomPadding={0} safeAreaEdges={["top"]}>
      <View style={styles.container}>
        {loading ? <ActivityIndicator accessibilityLabel="Checking staff" color={pearl.accentDeep} size="large" /> : <>
          {check.status === "error" ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.error }]}>{check.message}</Text> : null}
          <TouchableOpacity accessibilityRole="button" style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => {
            if (check.status === "error") setAttempt((value) => value + 1);
            else router.push({ pathname: "/team/new", params: { fromCalendar: "true" } });
          }}><Text translate style={styles.buttonText}>{check.status === "error" ? "Retry" : "Add Staff"}</Text></TouchableOpacity>
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
