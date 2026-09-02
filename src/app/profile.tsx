import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, type Href } from "expo-router";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { fetchSalonMeThunk } from "@/middleware/salon/salon.thunk";
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
import { useAppToast } from "@/hooks/useAppToast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectSalonById,
  selectSalonDetailsLoading,
  selectSalons,
} from "@/store/salon/salon.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { UpdateProfileRequest, UserProfile } from "@/types/profile";
import {
  isValidPhoneDigits,
  PHONE_DIGIT_COUNT,
  PHONE_INVALID_MESSAGE,
  sanitizePhoneDigits,
} from "@/utils/validation";

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

const formatEmpty = (value: string | null | undefined, emptyText: string) => {
  const trimmed = value?.trim();
  return trimmed ? { isEmpty: false, text: trimmed } : { isEmpty: true, text: emptyText };
};

const formatMonthYear = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE_BYTES = 999 * 1024;
const PROFILE_PHOTO_SUCCESS = "Profile photo updated!";

const getPickedFileName = (uri: string, fallback: string) => {
  const fileName = uri.split("/").pop()?.split("?")[0];
  return fileName && fileName.includes(".") ? fileName : fallback;
};

const getPickedMimeType = (asset: ImagePicker.ImagePickerAsset) => {
  const fileName = asset.fileName?.trim() || getPickedFileName(asset.uri, "avatar.jpg");
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (asset.mimeType?.trim()) {
    return asset.mimeType.trim().toLowerCase();
  }

  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

const withAvatarCacheKey = (uri: string, cacheKey: number) => {
  if (!cacheKey) {
    return uri;
  }

  return `${uri}${uri.includes("?") ? "&" : "?"}v=${cacheKey}`;
};

type EditState = {
  address: string;
  businessName: string;
  fullName: string;
  phone: string;
};

const toEditState = (profile: UserProfile): EditState => ({
  address: profile.address ?? "",
  businessName: profile.businessName ?? "",
  fullName: profile.fullName ?? "",
  phone: sanitizePhoneDigits(profile.phone ?? ""),
});

function FieldBox({
  badge,
  empty,
  icon,
  label,
  value,
}: {
  badge?: string;
  empty?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.webField}>
      <Text style={styles.webFieldLabel}>{label}</Text>
      <View style={styles.webFieldValueRow}>
        <Ionicons color={Colors.hint} name={icon} size={17} />
        <Text
          numberOfLines={2}
          style={[styles.webFieldValue, empty && styles.webFieldValueEmpty]}
        >
          {value}
        </Text>
        {badge ? (
          <View style={styles.systemBadge}>
            <Text style={styles.systemBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function WebCard({
  children,
  icon,
  iconTone = "blue",
  rightAction,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  iconTone?: "blue" | "purple";
  rightAction?: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.webCard}>
      <View style={styles.webCardHeader}>
        <View style={styles.webCardHeaderLeft}>
          <View style={[styles.webIconBadge, iconTone === "purple" && styles.webIconBadgePurple]}>
            <Ionicons color={iconTone === "purple" ? Colors.purple : Colors.accentBlue} name={icon} size={18} />
          </View>
          <View style={styles.webCardTitleWrap}>
            <Text style={styles.webCardTitle}>{title}</Text>
            <Text style={styles.webCardSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {rightAction}
      </View>
      {children}
    </View>
  );
}

function WebSubsection({ children, title }: { children: React.ReactNode; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.webSubsection}>
      <Text style={styles.webSubsectionTitle}>{title}</Text>
      <View style={styles.webSubsectionRule} />
      {children}
    </View>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return <View style={styles.webFieldGrid}>{children}</View>;
}

function FormField({
  editable = true,
  keyboardType,
  label,
  maxLength,
  onChangeText,
  onFocus,
  onSubmitEditing,
  placeholder,
  returnKeyType = "next",
  inputRef,
  value,
}: {
  editable?: boolean;
  inputRef?: RefObject<TextInput | null>;
  keyboardType?: "default" | "phone-pad";
  label: string;
  maxLength?: number;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType?: "done" | "next";
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        ref={inputRef}
        returnKeyType={returnKeyType}
        blurOnSubmit={returnKeyType === "done"}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const currentUser = useAppSelector(selectCurrentUser);
  const salons = useAppSelector(selectSalons);
  const activeSalon = useAppSelector((state) => selectSalonById(state, currentUser?.salonId)) ?? salons[0] ?? null;
  const isSalonLoading = useAppSelector(selectSalonDetailsLoading);
  const fullNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const businessNameInputRef = useRef<TextInput>(null);
  const addressInputRef = useRef<TextInput>(null);
  const profileNavigationFields = useMemo(() => [
    { ref: fullNameInputRef },
    { ref: phoneInputRef },
    { ref: businessNameInputRef },
    { ref: addressInputRef },
  ], []);
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
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(null);
  const [avatarCacheKey, setAvatarCacheKey] = useState(0);

  useEffect(() => {
    if (userId) {
      void dispatch(fetchProfileThunk({ userId }));
      void dispatch(fetchSalonMeThunk());
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
      void dispatch(fetchSalonMeThunk());
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
    setFormError(null);
    setSuccessMessage(null);

    if (!trimmedName) {
      setFormError("Full name is required.");
      return;
    }

    if (editState.phone && !isValidPhoneDigits(editState.phone)) {
      setFormError(PHONE_INVALID_MESSAGE);
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

  const uploadPickedAsset = async (result: ImagePicker.ImagePickerResult) => {
    const asset = result.canceled ? undefined : result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    const mimeType = getPickedMimeType(asset);

    if (!ALLOWED_AVATAR_MIME_TYPES.has(mimeType)) {
      const message = "Only JPEG, PNG, or WebP images are supported.";
      setFormError(message);
      toast.showError(message);
      return;
    }

    if (typeof asset.fileSize === "number" && asset.fileSize > MAX_AVATAR_SIZE_BYTES) {
      const message = "Profile photo must be smaller than 999 KB.";
      setFormError(message);
      toast.showError(message);
      return;
    }

    const fileName = asset.fileName?.trim() || getPickedFileName(asset.uri, "avatar.jpg");

    setSelectedAvatarUri(asset.uri);

    try {
      const resultAction = await dispatch(
        uploadAvatarThunk({
          asset: { fileName, fileSize: asset.fileSize, mimeType, uri: asset.uri },
        }),
      );

      if (uploadAvatarThunk.rejected.match(resultAction)) {
        const message = resultAction.payload?.message ?? "Unable to upload photo.";
        setFormError(message);
        toast.showError(message);
        return;
      }

      setAvatarCacheKey(Date.now());
      setSuccessMessage(PROFILE_PHOTO_SUCCESS);
      toast.showSuccess(PROFILE_PHOTO_SUCCESS);
    } finally {
      setSelectedAvatarUri(null);
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
      toast.showError(getApiErrorMessage(pickerError));
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
  const profileAvatarUri = profile?.avatarUrl ? withAvatarCacheKey(profile.avatarUrl, avatarCacheKey) : null;
  const displayedAvatarUri = selectedAvatarUri ?? profileAvatarUri;

  const renderHeader = (rightAction?: React.ReactNode) => (
    <View style={styles.headerRow}>
      <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={18} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profile</Text>
      {rightAction ?? <View style={styles.headerButton} />}
    </View>
  );

  if (showInitialLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
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
        <AppStatusBar />
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
        <AppStatusBar />
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
    <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleStartEditing} style={styles.headerButton}>
      <Ionicons name="create-outline" size={18} color={Colors.primary} />
    </TouchableOpacity>
  );

  const banner = formError ?? saveError ?? avatarError ?? successMessage;
  const bannerIsError = Boolean(formError ?? saveError ?? avatarError);
  const memberSince = formatMonthYear(activeSalon?.createdAt);
  const countryValue = profile.countryCode ?? profile.country;
  const salonName = activeSalon?.businessName || activeSalon?.name || profile.businessName;
  const salonEmail = activeSalon?.email || profile.email;
  const salonPhone = activeSalon?.phone || profile.phone;
  const salonAddress = activeSalon?.address || profile.address;
  const website = formatEmpty(activeSalon?.websiteUrl, "No website set");
  const gstin = formatEmpty(activeSalon?.gstin, "No gst number set");
  const businessRegNo = formatEmpty(null, "No business reg. no. (pan) set");
  const businessType = formatEmpty("Hair salon", "No business type set");
  const businessCategory = formatEmpty(null, "No business category set");
  const city = formatEmpty(activeSalon?.city, "No city set");
  const state = formatEmpty(activeSalon?.state, "No state set");
  const pincode = formatEmpty(activeSalon?.postalCode, "No pincode set");
  const timezone = formatEmpty(activeSalon?.timezone || "Asia/Kolkata", "No timezone set");
  const description = formatEmpty(null, "No description set");
  const salonEditButton = (
    <TouchableOpacity activeOpacity={0.84} onPress={handleStartEditing} style={styles.webEditButton}>
      <Text style={styles.webEditButtonText}>Edit</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardNavigation={isEditing ? { fields: profileNavigationFields, hideOnLast: true, onDone: handleSave, showAccessory: false } : undefined}
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
          {renderHeader(isEditing ? editRightAction : undefined)}

          <View style={styles.heroCard}>
            <TouchableOpacity
              accessibilityLabel="Change profile photo"
              activeOpacity={0.85}
              disabled={isUploadingAvatar}
              onPress={handleChangePhoto}
              style={styles.avatarWrap}
            >
              {displayedAvatarUri ? (
                <Image contentFit="cover" source={{ uri: displayedAvatarUri }} style={styles.avatarImage} />
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
              <WebCard icon="person-outline" subtitle="Your name, email and contact details" title="Personal Information">
                <FormField
                  inputRef={fullNameInputRef}
                  label="Full Name"
                  onChangeText={(value) => updateField("fullName", value)}
                  onSubmitEditing={() => phoneInputRef.current?.focus()}
                  placeholder="Enter full name"
                  value={editState.fullName}
                />
                <FormField
                  inputRef={phoneInputRef}
                  keyboardType="phone-pad"
                  label="Phone Number"
                  maxLength={PHONE_DIGIT_COUNT}
                  onChangeText={(value) => updateField("phone", sanitizePhoneDigits(value))}
                  onSubmitEditing={() => businessNameInputRef.current?.focus()}
                  placeholder="Enter phone number"
                  value={editState.phone}
                />
              </WebCard>

              <WebCard icon="business-outline" iconTone="purple" subtitle="Your salon's business details and location" title="Salon Information">
                <FormField
                  inputRef={businessNameInputRef}
                  label="Salon Name"
                  onChangeText={(value) => updateField("businessName", value)}
                  onSubmitEditing={() => addressInputRef.current?.focus()}
                  placeholder="Enter salon name"
                  value={editState.businessName}
                />
                <FormField
                  inputRef={addressInputRef}
                  label="Address"
                  onChangeText={(value) => updateField("address", value)}
                  onSubmitEditing={handleSave}
                  placeholder="Enter address"
                  returnKeyType="done"
                  value={editState.address}
                />
              </WebCard>

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
              <WebCard icon="person-outline" subtitle="Your name, email and contact details" title="Personal Information">
                <FieldGrid>
                  <FieldBox icon="person-outline" label="FULL NAME" value={formatValue(profile.fullName)} />
                  <FieldBox icon="mail-outline" label="EMAIL ADDRESS" value={formatValue(profile.email)} />
                  <FieldBox icon="call-outline" label="PHONE NUMBER" value={formatValue(profile.phone)} />
                  <FieldBox icon="globe-outline" label="COUNTRY" value={formatValue(countryValue)} />
                  <FieldBox icon="id-card-outline" label="ROLE" value={formatValue(profile.role)} badge="SYSTEM" />
                  <FieldBox icon="checkmark-circle" label="MEMBER SINCE" value={memberSince} />
                </FieldGrid>
              </WebCard>

              <WebCard
                icon="business-outline"
                iconTone="purple"
                rightAction={salonEditButton}
                subtitle="Your salon's business details and location"
                title="Salon Information"
              >
                {isSalonLoading && !activeSalon ? (
                  <View style={styles.webLoadingRow}>
                    <ActivityIndicator color={Colors.primary} size="small" />
                    <Text style={styles.webLoadingText}>Loading salon information...</Text>
                  </View>
                ) : null}
                <WebSubsection title="BASIC DETAILS">
                  <FieldGrid>
                    <FieldBox icon="business-outline" label="SALON NAME" value={formatValue(salonName)} />
                    <FieldBox icon="mail-outline" label="SALON EMAIL" value={formatValue(salonEmail)} />
                    <FieldBox icon="call-outline" label="SALON PHONE" value={formatValue(salonPhone)} />
                    <FieldBox empty={website.isEmpty} icon="globe-outline" label="WEBSITE" value={website.text} />
                  </FieldGrid>
                </WebSubsection>

                <WebSubsection title="BUSINESS & TAX">
                  <FieldGrid>
                    <FieldBox empty={gstin.isEmpty} icon="pricetag-outline" label="GST NUMBER" value={gstin.text} />
                    <FieldBox empty={businessRegNo.isEmpty} icon="card-outline" label="BUSINESS REG. NO. (PAN)" value={businessRegNo.text} />
                    <FieldBox empty={businessType.isEmpty} icon="business-outline" label="BUSINESS TYPE" value={businessType.text} />
                    <FieldBox empty={businessCategory.isEmpty} icon="ticket-outline" label="BUSINESS CATEGORY" value={businessCategory.text} />
                  </FieldGrid>
                </WebSubsection>

                <WebSubsection title="LOCATION">
                  <FieldGrid>
                    <FieldBox icon="location-outline" label="ADDRESS" value={formatValue(salonAddress)} />
                    <FieldBox empty={city.isEmpty} icon="map-outline" label="CITY" value={city.text} />
                    <FieldBox empty={state.isEmpty} icon="map-outline" label="STATE" value={state.text} />
                    <FieldBox empty={pincode.isEmpty} icon="pricetag-outline" label="PINCODE" value={pincode.text} />
                  </FieldGrid>
                </WebSubsection>

                <WebSubsection title="REGIONAL SETTINGS">
                  <FieldGrid>
                    <FieldBox empty={timezone.isEmpty} icon="time-outline" label="TIMEZONE" value={timezone.text} />
                  </FieldGrid>
                </WebSubsection>

                <WebSubsection title="DESCRIPTION">
                  <FieldGrid>
                    <FieldBox empty={description.isEmpty} icon="document-text-outline" label="DESCRIPTION" value={description.text} />
                  </FieldGrid>
                </WebSubsection>
              </WebCard>
            </>
          )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
    shadowColor: Colors.shadow,
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
    backgroundColor: "rgba(15, 23, 32, 0.45)",
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
    letterSpacing: 0,
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
    borderColor: Colors.errorBorder,
  },
  bannerSuccess: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
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
  webCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  webCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  webCardHeaderLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  webIconBadge: {
    alignItems: "center",
    backgroundColor: Colors.accentBlueSoft,
    borderRadius: Radius.lg,
    height: 50,
    justifyContent: "center",
    marginRight: Spacing.md,
    width: 50,
  },
  webIconBadgePurple: {
    backgroundColor: Colors.purpleBg,
  },
  webCardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  webCardTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  webCardSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  webEditButton: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
  },
  webEditButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  webFieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  webField: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 250,
  },
  webFieldLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: Spacing.sm,
  },
  webFieldValueRow: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: Spacing.md,
  },
  webFieldValue: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    marginLeft: Spacing.sm,
  },
  webFieldValueEmpty: {
    color: Colors.placeholder,
    fontStyle: "italic",
  },
  systemBadge: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  systemBadgeText: {
    color: Colors.hint,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  webSubsection: {
    marginTop: Spacing.sm,
  },
  webSubsectionTitle: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  webSubsectionRule: {
    backgroundColor: Colors.border,
    height: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  webLoadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  webLoadingText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "700",
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
