import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import {
  fetchProfileThunk,
  updateProfileThunk,
  uploadAvatarThunk,
} from "@/middleware/profile/profile.thunk";
import {
  selectProfile,
  selectProfileAvatarError,
  selectProfileError,
  selectProfileLoading,
  selectProfileRefreshing,
  selectProfileSaveError,
  selectProfileSaving,
  selectProfileUploadingAvatar,
} from "@/store/profile/profile.slice";
import { getApiErrorMessage } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { UpdateProfileRequest, UserProfile } from "@/types/profile";

const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;

const isValidDateOfBirth = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getInitials = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SO";

const formatValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
};

const formatGender = (value: string | null) => {
  if (!value) {
    return "-";
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

type EditState = {
  address: string;
  businessName: string;
  dateOfBirth: string;
  fullName: string;
  gender: string;
  phone: string;
};

const toEditState = (profile: UserProfile): EditState => ({
  address: profile.address ?? "",
  businessName: profile.businessName ?? "",
  dateOfBirth: profile.dateOfBirth ?? "",
  fullName: profile.fullName ?? "",
  gender: profile.gender ?? "",
  phone: profile.phone ?? "",
});

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FormField({
  editable = true,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  editable?: boolean;
  keyboardType?: "default" | "phone-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const userId = currentUser?.id ?? "";
  const profile = useAppSelector(selectProfile);
  const isLoading = useAppSelector(selectProfileLoading);
  const isRefreshing = useAppSelector(selectProfileRefreshing);
  const error = useAppSelector(selectProfileError);
  const isSaving = useAppSelector(selectProfileSaving);
  const saveError = useAppSelector(selectProfileSaveError);
  const isUploadingAvatar = useAppSelector(selectProfileUploadingAvatar);
  const avatarError = useAppSelector(selectProfileAvatarError);

  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      void dispatch(fetchProfileThunk({ userId }));
    }
  }, [dispatch, userId]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/dashboard" as Href);
  };

  const handleRefresh = () => {
    if (userId) {
      void dispatch(fetchProfileThunk({ refresh: true, userId }));
    }
  };

  const handleStartEditing = () => {
    if (!profile) {
      return;
    }
    setEditState(toEditState(profile));
    setFormError(null);
    setSuccessMessage(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditState(null);
    setFormError(null);
  };

  const updateField = (key: keyof EditState, value: string) => {
    setEditState((current) => (current ? { ...current, [key]: value } : current));
    setFormError(null);
  };

  const handleSave = async () => {
    if (!editState || !userId) {
      return;
    }

    const trimmedName = editState.fullName.trim();
    const trimmedDob = editState.dateOfBirth.trim();

    setFormError(null);
    setSuccessMessage(null);

    if (!trimmedName) {
      setFormError("Full name is required.");
      return;
    }

    if (trimmedDob && !isValidDateOfBirth(trimmedDob)) {
      setFormError("Enter date of birth as YYYY-MM-DD.");
      return;
    }

    const updates: UpdateProfileRequest = {
      address: editState.address.trim(),
      businessName: editState.businessName.trim(),
      dateOfBirth: trimmedDob,
      fullName: trimmedName,
      gender: editState.gender.trim(),
      phone: editState.phone.trim(),
    };

    const resultAction = await dispatch(updateProfileThunk({ updates }));

    if (updateProfileThunk.rejected.match(resultAction)) {
      setFormError(resultAction.payload?.message ?? "Unable to update profile.");
      return;
    }

    setSuccessMessage(resultAction.payload.message ?? "Profile updated successfully.");
    setIsEditing(false);
    setEditState(null);

    // Refresh the Profile screen from GET /profile/:id after the successful update.
    void dispatch(fetchProfileThunk({ refresh: true, userId }));
  };

  const uploadPickedAsset = async (result: ImagePicker.ImagePickerResult) => {
    const asset = result.canceled ? undefined : result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    const resultAction = await dispatch(
      uploadAvatarThunk({
        asset: { fileName: asset.fileName, mimeType: asset.mimeType, uri: asset.uri },
      }),
    );

    if (uploadAvatarThunk.fulfilled.match(resultAction)) {
      setSuccessMessage(resultAction.payload.message ?? "Profile photo updated.");
    }
  };

  const pickFromSource = async (source: "camera" | "library") => {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          Alert.alert("Camera access needed", "Enable camera access in settings to take a photo.");
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          mediaTypes: ["images"],
          quality: 0.7,
        });

        await uploadPickedAsset(result);
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Photo access needed", "Enable photo library access in settings to choose a photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.7,
      });

      await uploadPickedAsset(result);
    } catch (pickerError) {
      Alert.alert("Something went wrong", getApiErrorMessage(pickerError));
    }
  };

  const handleChangePhoto = () => {
    if (isUploadingAvatar) {
      return;
    }

    Alert.alert("Profile Photo", "Choose a new profile picture", [
      { onPress: () => void pickFromSource("camera"), text: "Take Photo" },
      { onPress: () => void pickFromSource("library"), text: "Choose from Library" },
      { style: "cancel", text: "Cancel" },
    ]);
  };

  const initials = useMemo(() => getInitials(profile?.fullName ?? currentUser?.fullName ?? ""), [
    profile?.fullName,
    currentUser?.fullName,
  ]);

  const showInitialLoading = isLoading && !profile;
  const showErrorState = Boolean(error) && !profile && !showInitialLoading;

  const renderHeader = (rightAction?: React.ReactNode) => (
    <View style={styles.headerRow}>
      <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={18} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profile</Text>
      {rightAction ?? <View style={styles.headerButton} />}
    </View>
  );

  if (showInitialLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showErrorState) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
            </View>
            <Text style={styles.stateTitle}>Unable to load profile</Text>
            <Text style={styles.stateSubtitle}>{error ?? "Please try again in a moment."}</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={handleRefresh} style={styles.stateButton}>
              <Text style={styles.stateButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.stateWrap}>
          {renderHeader()}
          <View style={styles.stateCard}>
            <View style={styles.stateIconNeutral}>
              <Ionicons name="person-outline" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.stateTitle}>Profile not available</Text>
            <Text style={styles.stateSubtitle}>We couldn&apos;t find profile details for your account.</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={handleRefresh} style={styles.stateButton}>
              <Text style={styles.stateButtonText}>Reload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const editRightAction = isEditing ? (
    <TouchableOpacity activeOpacity={0.8} onPress={handleCancelEditing} style={styles.headerTextButton}>
      <Text style={styles.headerTextButtonLabel}>Cancel</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity activeOpacity={0.8} onPress={handleStartEditing} style={styles.headerButton}>
      <Ionicons name="create-outline" size={18} color={Colors.primary} />
    </TouchableOpacity>
  );

  const banner = formError ?? saveError ?? avatarError ?? successMessage;
  const bannerIsError = Boolean(formError ?? saveError ?? avatarError);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
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
          {renderHeader(editRightAction)}

          <View style={styles.heroCard}>
            <TouchableOpacity
              accessibilityLabel="Change profile photo"
              activeOpacity={0.85}
              disabled={isUploadingAvatar}
              onPress={handleChangePhoto}
              style={styles.avatarWrap}
            >
              {profile.avatarUrl ? (
                <Image contentFit="cover" source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {isUploadingAvatar ? (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              ) : (
                <View style={styles.avatarCameraBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.profileName}>{formatValue(profile.fullName)}</Text>
            {profile.email ? <Text style={styles.profileEmail}>{profile.email}</Text> : null}
            <View style={styles.badgeRow}>
              {profile.role ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{profile.role.toUpperCase()}</Text>
                </View>
              ) : null}
              {profile.isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              ) : null}
            </View>
          </View>

          {banner ? (
            <View
              style={[styles.banner, bannerIsError ? styles.bannerError : styles.bannerSuccess]}
              accessibilityRole="alert"
            >
              <Ionicons
                name={bannerIsError ? "alert-circle-outline" : "checkmark-circle-outline"}
                size={18}
                color={bannerIsError ? Colors.error : Colors.success}
              />
              <Text style={[styles.bannerText, bannerIsError ? styles.bannerTextError : styles.bannerTextSuccess]}>
                {banner}
              </Text>
            </View>
          ) : null}

          {isEditing && editState ? (
            <>
              <Section title="Personal Information">
                <FormField
                  label="Full Name"
                  onChangeText={(value) => updateField("fullName", value)}
                  placeholder="Enter full name"
                  value={editState.fullName}
                />
                <FormField
                  keyboardType="phone-pad"
                  label="Phone Number"
                  onChangeText={(value) => updateField("phone", value)}
                  placeholder="Enter phone number"
                  value={editState.phone}
                />
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((option) => {
                      const isSelected = editState.gender.toLowerCase() === option.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={option}
                          activeOpacity={0.82}
                          onPress={() => updateField("gender", option)}
                          style={[styles.genderChip, isSelected && styles.genderChipSelected]}
                        >
                          <Text style={[styles.genderChipText, isSelected && styles.genderChipTextSelected]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <FormField
                  label="Date of Birth"
                  onChangeText={(value) => updateField("dateOfBirth", value)}
                  placeholder="YYYY-MM-DD"
                  value={editState.dateOfBirth}
                />
              </Section>

              <Section title="Business">
                <FormField
                  label="Business Name"
                  onChangeText={(value) => updateField("businessName", value)}
                  placeholder="Enter business name"
                  value={editState.businessName}
                />
                <FormField
                  label="Address"
                  onChangeText={(value) => updateField("address", value)}
                  placeholder="Enter address"
                  value={editState.address}
                />
              </Section>

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isSaving}
                onPress={handleSave}
                style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.submitButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Section title="Personal Information">
                <DetailRow label="Full Name" value={formatValue(profile.fullName)} />
                <DetailRow label="Email" value={formatValue(profile.email)} />
                <DetailRow label="Phone" value={formatValue(profile.phone)} />
                <DetailRow label="Gender" value={formatGender(profile.gender)} />
                <DetailRow label="Date of Birth" value={formatValue(profile.dateOfBirth)} />
                <DetailRow label="Role" value={formatValue(profile.role)} />
              </Section>

              <Section title="Business">
                <DetailRow label="Business Name" value={formatValue(profile.businessName)} />
                <DetailRow label="Address" value={formatValue(profile.address)} />
                <DetailRow label="Country" value={formatValue(profile.country)} />
                <DetailRow
                  label="Account Status"
                  value={profile.isActive === false ? "Inactive" : "Active"}
                />
              </Section>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  headerTextButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: AppLayout.headerActionSize,
    paddingHorizontal: Spacing.sm,
  },
  headerTextButtonLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding + Spacing.sm,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatarWrap: {
    height: 72,
    width: 72,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  avatarImage: {
    backgroundColor: Colors.bg2,
    borderRadius: 36,
    height: 72,
    width: 72,
  },
  avatarCameraBadge: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.card,
    borderRadius: 13,
    borderWidth: 2,
    bottom: -2,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 26,
  },
  avatarUploadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(36, 59, 52, 0.45)",
    borderRadius: 36,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  avatarText: {
    color: Colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },
  profileName: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  profileEmail: {
    color: Colors.text2,
    fontSize: 13,
    marginTop: 4,
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  roleBadge: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verifiedBadgeText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: "800",
  },
  banner: {
    alignItems: "center",
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  bannerError: {
    backgroundColor: Colors.errorBg,
    borderColor: "rgba(214, 91, 91, 0.22)",
  },
  bannerSuccess: {
    backgroundColor: Colors.successBg,
    borderColor: "rgba(75, 143, 104, 0.22)",
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  bannerTextError: {
    color: Colors.error,
  },
  bannerTextSuccess: {
    color: Colors.success,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 13,
  },
  detailValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  genderChip: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  genderChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderChipText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "800",
  },
  genderChipTextSelected: {
    color: "#FFFFFF",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 52,
    paddingHorizontal: AppLayout.cardPadding,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: Spacing.sm,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 54,
  },
  stateIconNeutral: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 54,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  stateSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  stateButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
