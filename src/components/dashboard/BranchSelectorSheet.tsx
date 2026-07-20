import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { fetchBranchesThunk, selectBranchThunk } from "@/middleware/branch/branch.thunk";
import {
  selectActiveBranchId,
  selectBranchError,
  selectBranchStatus,
  selectIsSwitchingBranch,
  selectVisibleBranches,
} from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Branch } from "@/types/branch";

const SEARCH_THRESHOLD = 5;

type BranchSelectorSheetProps = {
  onClose: () => void;
  visible: boolean;
};

export function BranchSelectorSheet({ onClose, visible }: BranchSelectorSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const branches = useAppSelector(selectVisibleBranches);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const status = useAppSelector(selectBranchStatus);
  const error = useAppSelector(selectBranchError);
  const isSwitching = useAppSelector(selectIsSwitchingBranch);
  const [query, setQuery] = useState("");

  const filteredBranches = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return branches;
    }

    return branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(trimmedQuery) || branch.city.toLowerCase().includes(trimmedQuery),
    );
  }, [branches, query]);

  const handleSelect = (branch: Branch) => {
    if (branch.id === activeBranchId || isSwitching) {
      return;
    }

    void dispatch(selectBranchThunk(branch.id));
    onClose();
  };

  const handleRetry = () => {
    void dispatch(fetchBranchesThunk());
  };

  if (branches.length <= 1) {
    return null;
  }

  return (
    <BottomSheet onClose={onClose} scrollable subtitle="Choose which branch to view" title="Switch Branch" visible={visible}>
      {status === "failed" ? (
        <View style={styles.errorBanner}>
          <Ionicons color={Colors.error} name="alert-circle-outline" size={16} />
          <Text style={styles.errorText}>{error ?? "Unable to load branches."}</Text>
          <TouchableOpacity activeOpacity={0.84} onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {branches.length > SEARCH_THRESHOLD ? (
        <View style={styles.searchWrap}>
          <Ionicons color={Colors.text2} name="search-outline" size={16} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search branches"
            placeholderTextColor={Colors.placeholder}
            style={styles.searchInput}
            value={query}
          />
        </View>
      ) : null}

      {filteredBranches.length === 0 ? (
        <Text style={styles.emptyText}>
          {status === "loading" ? "Loading branches..." : "No branches found."}
        </Text>
      ) : (
        filteredBranches.map((branch) => {
          const isActive = branch.id === activeBranchId;

          return (
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={isSwitching}
              key={branch.id}
              onPress={() => handleSelect(branch)}
              style={[styles.row, isActive && styles.rowActive]}
            >
              <View style={styles.rowIcon}>
                <Ionicons color={isActive ? Colors.primary : Colors.text2} name="business-outline" size={18} />
              </View>
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={styles.rowName}>{branch.name}</Text>
                {branch.city ? (
                  <Text numberOfLines={1} style={styles.rowCity}>{branch.city}</Text>
                ) : null}
              </View>
              {isSwitching && isActive ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : isActive ? (
                <Ionicons color={Colors.primary} name="checkmark-circle" size={20} />
              ) : null}
            </TouchableOpacity>
          );
        })
      )}
    </BottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  errorBanner: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: AppRadius.card,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  retryButton: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    minHeight: 44,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    paddingVertical: Spacing.lg,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  rowActive: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.primary,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  rowCopy: {
    flex: 1,
  },
  rowName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  rowCity: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
});
