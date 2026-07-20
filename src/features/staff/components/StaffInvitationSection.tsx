import { useEffect, useMemo } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import {
  cancelInviteThunk,
  fetchInvitationStatusThunk,
  resendInviteThunk,
} from "@/middleware/staff/staffInvitations.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectInvitationStatus,
  selectInvitationStatusError,
  selectInvitationStatusLoaded,
  selectInvitationStatusLoading,
  selectInviteCanceling,
  selectInviteCancelError,
  selectInviteResendError,
  selectInviteResending,
} from "@/store/staff/staffInvitations.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { isValidStaffId } from "@/utils/staffIds";
import { canManageStaffLifecycle } from "@/utils/userProfile";

type StaffInvitationSectionProps = {
  staffId?: string | null;
};

function getStatusPalette(status: string, Colors: ThemeColors) {
  switch (status.toLowerCase()) {
    case "accepted":
      return { backgroundColor: Colors.successBg, color: Colors.success };
    case "expired":
    case "cancelled":
      return { backgroundColor: Colors.errorBg, color: Colors.error };
    case "pending":
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
    default:
      return { backgroundColor: Colors.bg2, color: Colors.text2 };
  }
}

export function StaffInvitationSection({ staffId }: StaffInvitationSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const canManage = canManageStaffLifecycle(currentUser?.role);

  const status = useAppSelector((state) => selectInvitationStatus(state, staffId));
  const loaded = useAppSelector((state) => selectInvitationStatusLoaded(state, staffId));
  const loading = useAppSelector((state) => selectInvitationStatusLoading(state, staffId));
  const listError = useAppSelector((state) => selectInvitationStatusError(state, staffId));
  const resending = useAppSelector((state) => selectInviteResending(state, staffId));
  const resendError = useAppSelector((state) => selectInviteResendError(state, staffId));
  const canceling = useAppSelector((state) => selectInviteCanceling(state, staffId));
  const cancelError = useAppSelector((state) => selectInviteCancelError(state, staffId));

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !loaded && !loading) {
      void dispatch(fetchInvitationStatusThunk(staffId));
    }
  }, [dispatch, loaded, loading, staffId]);

  const handleRetry = () => {
    if (staffId) {
      void dispatch(fetchInvitationStatusThunk(staffId));
    }
  };

  const handleResend = async () => {
    if (!staffId) {
      return;
    }

    const resultAction = await dispatch(resendInviteThunk(staffId));

    if (resendInviteThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to resend invite",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert("Invite resent", resultAction.payload.message ?? "The invitation has been resent.");
    handleRetry();
  };

  const handleCancel = () => {
    if (!canManage) {
      Alert.alert("Permission required", "You don't have permission to cancel this invitation.");
      return;
    }

    Alert.alert(
      "Cancel Invitation",
      "Are you sure you want to cancel this staff invitation?",
      [
        { style: "cancel", text: "Keep Invitation" },
        { onPress: () => void handleConfirmCancel(), style: "destructive", text: "Cancel Invite" },
      ],
    );
  };

  const handleConfirmCancel = async () => {
    if (!staffId) {
      return;
    }

    const resultAction = await dispatch(cancelInviteThunk(staffId));

    if (cancelInviteThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to cancel invite",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert("Invitation cancelled", resultAction.payload.message ?? "The invitation has been cancelled.");
  };

  if (listError) {
    return (
      <StaffSectionCard title="Invitation">
        <StaffStateView
          actionLabel="Retry"
          description={listError}
          onAction={handleRetry}
          title="Unable to load invitation status"
          variant="error"
        />
      </StaffSectionCard>
    );
  }

  if (loading && !loaded) {
    return (
      <StaffSectionCard title="Invitation">
        <StaffStateView description="Fetching invitation status." loading title="Loading invitation" />
      </StaffSectionCard>
    );
  }

  const invitationStatus = status?.status ?? "none";
  const palette = getStatusPalette(invitationStatus, Colors);
  const canResend = invitationStatus === "pending" || invitationStatus === "expired";
  const canCancel = invitationStatus === "pending";

  return (
    <StaffSectionCard title="Invitation">
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status</Text>
        <View style={[styles.statusPill, { backgroundColor: palette.backgroundColor }]}>
          <Text style={[styles.statusPillText, { color: palette.color }]}>{invitationStatus}</Text>
        </View>
      </View>
      {status?.email ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Invited Email</Text>
          <Text style={styles.detailValue}>{status.email}</Text>
        </View>
      ) : null}
      {status?.invitedAt ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Invited At</Text>
          <Text style={styles.detailValue}>{status.invitedAt}</Text>
        </View>
      ) : null}
      {status?.expiresAt ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expires At</Text>
          <Text style={styles.detailValue}>{status.expiresAt}</Text>
        </View>
      ) : null}

      {resendError ? <Text style={styles.errorText}>{resendError}</Text> : null}
      {cancelError ? <Text style={styles.errorText}>{cancelError}</Text> : null}

      {invitationStatus === "none" ? (
        <Text style={styles.hintText}>No invitation has been sent to this staff member yet.</Text>
      ) : (
        <View style={styles.footer}>
          {canCancel ? (
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={canceling}
              onPress={handleCancel}
              style={[styles.cancelButton, canceling && styles.buttonDisabled]}
            >
              {canceling ? (
                <ActivityIndicator color={Colors.error} size="small" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Invite</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {canResend ? (
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={resending}
              onPress={() => void handleResend()}
              style={[styles.resendButton, resending && styles.buttonDisabled]}
            >
              {resending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.resendButtonText}>Resend Invite</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  statusLabel: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  detailRow: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 12,
  },
  detailValue: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  hintText: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.md,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  cancelButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "800",
  },
  resendButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  resendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
