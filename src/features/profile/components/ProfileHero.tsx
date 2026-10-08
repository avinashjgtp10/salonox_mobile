import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { formatValue } from "@/features/profile/utils/profileFormat";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { UserProfile } from "@/types/profile";

type ProfileHeroProps = {
  avatarUri: string | null;
  initials: string;
  isUploadingAvatar: boolean;
  onChangePhoto: () => void;
  profile: UserProfile;
};

export function ProfileHero({ avatarUri, initials, isUploadingAvatar, onChangePhoto, profile }: ProfileHeroProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        accessibilityLabel="Change profile photo"
        activeOpacity={0.85}
        disabled={isUploadingAvatar}
        onPress={onChangePhoto}
        style={styles.avatarWrap}
      >
        {avatarUri ? (
          <Image cachePolicy="none" contentFit="cover" source={{ uri: avatarUri }} style={styles.avatarImage} />
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
      <Text style={styles.name}>{formatValue(profile.fullName)}</Text>
      {profile.email ? <Text style={styles.email}>{profile.email}</Text> : null}
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
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
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
  name: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  email: {
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
});
