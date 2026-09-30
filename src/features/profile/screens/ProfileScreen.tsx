import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { AppLayout } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { PersonalInfoCard } from "@/features/profile/components/PersonalInfoCard";
import { ProfileBanner } from "@/features/profile/components/ProfileBanner";
import {
  ProfileEditForm,
  type ProfileFieldErrors,
  type ProfileInputRefs,
} from "@/features/profile/components/ProfileEditForm";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileHero } from "@/features/profile/components/ProfileHero";
import { ProfileStateView } from "@/features/profile/components/ProfileStateView";
import { SalonInfoCard } from "@/features/profile/components/SalonInfoCard";
import { useAvatarUpload } from "@/features/profile/hooks/useAvatarUpload";
import {
  getInitials,
  toProfileEditState,
  type ProfileEditState,
} from "@/features/profile/utils/profileFormat";
import { useValidationScroll } from "@/hooks/useValidationScroll";
import { fetchProfileThunk, updateProfileThunk } from "@/middleware/profile/profile.thunk";
import { fetchSalonMeThunk } from "@/middleware/salon/salon.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectProfile,
  selectProfileAvatarError,
  selectProfileError,
  selectProfileLoading,
  selectProfileRefreshing,
  selectProfileSaveError,
  selectProfileSaving,
} from "@/store/profile/profile.slice";
import {
  selectSalonById,
  selectSalonDetailsLoading,
  selectSalons,
} from "@/store/salon/salon.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { UpdateProfileRequest } from "@/types/profile";
import { isValidPhoneDigits, PHONE_INVALID_MESSAGE } from "@/utils/validation";

const VALIDATION_FIELD_ORDER = ["fullName", "phone"] as const;

export function ProfileScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const salons = useAppSelector(selectSalons);
  const activeSalon = useAppSelector((state) => selectSalonById(state, currentUser?.salonId)) ?? salons[0] ?? null;
  const isSalonLoading = useAppSelector(selectSalonDetailsLoading);
  const userId = currentUser?.id ?? "";
  const profile = useAppSelector(selectProfile);
  const isLoading = useAppSelector(selectProfileLoading);
  const isRefreshing = useAppSelector(selectProfileRefreshing);
  const error = useAppSelector(selectProfileError);
  const isSaving = useAppSelector(selectProfileSaving);
  const saveError = useAppSelector(selectProfileSaveError);
  const avatarError = useAppSelector(selectProfileAvatarError);

  const fullNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const businessNameInputRef = useRef<TextInput>(null);
  const addressInputRef = useRef<TextInput>(null);
  const inputRefs: ProfileInputRefs = useMemo(() => ({
    address: addressInputRef,
    businessName: businessNameInputRef,
    fullName: fullNameInputRef,
    phone: phoneInputRef,
  }), []);
  const keyboardNavigationFields = useMemo(() => [
    { ref: fullNameInputRef },
    { ref: phoneInputRef },
    { ref: businessNameInputRef },
    { ref: addressInputRef },
  ], []);
  const { scrollToFirstError, scrollViewRef, setFieldRef } = useValidationScroll(VALIDATION_FIELD_ORDER);

  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<ProfileEditState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setFormError(null);
    setSuccessMessage(null);
  }, []);
  const avatar = useAvatarUpload({
    avatarUrl: profile?.avatarUrl,
    onError: setFormError,
    onStart: clearMessages,
    onSuccess: setSuccessMessage,
  });

  useEffect(() => {
    if (userId) {
      void dispatch(fetchProfileThunk({ userId }));
      void dispatch(fetchSalonMeThunk());
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (!isEditing) return;
    setFieldRef("fullName", fullNameInputRef.current);
    setFieldRef("phone", phoneInputRef.current);
  }, [isEditing, setFieldRef]);

  const handleRefresh = () => {
    if (userId) {
      void dispatch(fetchProfileThunk({ refresh: true, userId }));
      void dispatch(fetchSalonMeThunk());
    }
  };

  const handleStartEditing = () => {
    if (!profile) {
      return;
    }
    setEditState(toProfileEditState(profile));
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditState(null);
    setFormError(null);
    setFieldErrors({});
  };

  const updateField = (key: keyof ProfileEditState, value: string) => {
    setEditState((current) => (current ? { ...current, [key]: value } : current));
    setFormError(null);
    if (key === "fullName" || key === "phone") {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!editState || !userId) {
      return;
    }

    const trimmedName = editState.fullName.trim();
    setFormError(null);
    setSuccessMessage(null);

    const nextErrors: ProfileFieldErrors = {};
    if (!trimmedName) nextErrors.fullName = "Full name is required.";
    if (editState.phone && !isValidPhoneDigits(editState.phone)) {
      nextErrors.phone = PHONE_INVALID_MESSAGE;
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    const updates: UpdateProfileRequest = {
      address: editState.address.trim(),
      businessName: editState.businessName.trim(),
      fullName: trimmedName,
      phone: editState.phone.trim(),
    };

    const resultAction = await dispatch(updateProfileThunk({ updates, userId }));

    if (updateProfileThunk.rejected.match(resultAction)) {
      setFormError(resultAction.payload?.message ?? "Unable to update profile.");
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Profile updated successfully.");
    setIsEditing(false);
    setEditState(null);
  };

  const initials = useMemo(() => getInitials(profile?.fullName ?? currentUser?.fullName ?? ""), [
    profile?.fullName,
    currentUser?.fullName,
  ]);

  if (isLoading && !profile) {
    return <ProfileStateView kind="loading" />;
  }

  if (error && !profile) {
    return <ProfileStateView kind="error" message={error} onRetry={handleRefresh} />;
  }

  if (!profile) {
    return <ProfileStateView kind="empty" onRetry={handleRefresh} />;
  }

  const bannerError = formError ?? saveError ?? avatarError;
  const bannerMessage = bannerError ?? successMessage;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardNavigation={isEditing ? { fields: keyboardNavigationFields, hideOnLast: true, onDone: handleSave, showAccessory: false } : undefined}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          isEditing ? undefined : (
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={handleRefresh}
              refreshing={isRefreshing}
              tintColor={Colors.primary}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          rightAction={isEditing ? (
            <TouchableOpacity activeOpacity={0.8} onPress={handleCancelEditing} style={styles.cancelButton}>
              <Text style={styles.cancelButtonLabel}>Cancel</Text>
            </TouchableOpacity>
          ) : undefined}
        />

        <ProfileHero
          avatarUri={avatar.avatarUri}
          initials={initials}
          isUploadingAvatar={avatar.isUploading}
          onChangePhoto={avatar.changePhoto}
          profile={profile}
        />

        {bannerMessage ? <ProfileBanner isError={Boolean(bannerError)} message={bannerMessage} /> : null}

        {isEditing && editState ? (
          <ProfileEditForm
            fieldErrors={fieldErrors}
            inputRefs={inputRefs}
            isSaving={isSaving}
            onChangeField={updateField}
            onSave={handleSave}
            values={editState}
          />
        ) : (
          <>
            <PersonalInfoCard profile={profile} salon={activeSalon} />
            <SalonInfoCard
              isLoading={isSalonLoading}
              onEdit={handleStartEditing}
              profile={profile}
              salon={activeSalon}
            />
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: AppLayout.headerActionSize,
    paddingHorizontal: Spacing.sm,
  },
  cancelButtonLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
