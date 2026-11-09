import { View } from "react-native";
import { router, type Href } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { appAlert } from "@/services/appAlert";
import { useAppToast } from "@/hooks/useAppToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canManageStaffLifecycle } from "@/utils/userProfile";
import {
  deleteStaffThunk,
  setStaffActiveStatusThunk,
} from "@/middleware/staff/staff.thunk";
import type { StaffMember } from "@/data/teamData";
import { StaffButton, StaffMenuItem, staffUi } from "./StaffPearl";
export function StaffActionsSheet({
  member,
  onClose,
  onDeleted,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const dispatch = useAppDispatch(),
    toast = useAppToast();
  const user = useAppSelector(selectCurrentUser);
  const canManage = canManageStaffLifecycle(user?.role);
  const navigate = (route: string) => {
    onClose();
    router.push(route as Href);
  };
  const perform = (kind: "status" | "delete") => {
    if (!member || !canManage) return;
    const target = member;
    onClose();
    const label =
      kind === "delete"
        ? "Delete permanently"
        : target.status === "Inactive"
          ? "Reactivate"
          : "Deactivate";
    appAlert.alert(label, label + " " + target.name + "?", [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        style: kind === "delete" ? "destructive" : "default",
        onPress: async () => {
          const result =
            kind === "delete"
              ? await dispatch(deleteStaffThunk(target.id))
              : await dispatch(
                  setStaffActiveStatusThunk({
                    staffId: target.id,
                    nextStatus:
                      target.status === "Inactive" ? "active" : "inactive",
                  }),
                );
          if (result.meta.requestStatus === "fulfilled") {
            toast.showSuccess(
              kind === "delete" ? "Staff deleted" : "Staff status updated",
            );
            if (kind === "delete") onDeleted?.();
          } else
            toast.showError(
              (result.payload as { message?: string })?.message ??
                "Unable to update staff.",
            );
        },
      },
    ]);
  };
  return (
    <BottomSheet
      pearlStyle
      centered={false}
      title={member?.name ?? "Staff actions"}
      visible={!!member}
      onClose={onClose}
    >
      <View style={{ gap: 16 }}>
        <View style={staffUi.card}>
          {canManage ? (
            <StaffMenuItem
              label="Edit profile"
              icon="create-outline"
              onPress={() => navigate("/team/" + member?.id + "/edit")}
            />
          ) : null}
          <StaffMenuItem
            label="Permissions"
            icon="shield-checkmark-outline"
            tone="rose"
            onPress={() => navigate("/team/permissions?staffId=" + member?.id)}
          />
          {canManage ? (
            <StaffMenuItem
              label="Reset login password"
              icon="key-outline"
              tone="peach"
              onPress={() => navigate("/team/" + member?.id + "/edit?step=3")}
            />
          ) : null}
        </View>
        {canManage ? (
          <>
            <Text translate style={staffUi.label}>Careful</Text>
            <StaffButton
              danger
              label={
                member?.status === "Inactive" ? "Reactivate" : "Deactivate"
              }
              onPress={() => perform("status")}
            />
            <StaffButton
              danger
              label="Delete permanently"
              onPress={() => perform("delete")}
            />
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}
