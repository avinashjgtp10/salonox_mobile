import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { useThemeColors } from "@/theme/ThemeProvider";

type ProfileStateViewProps =
  | { kind: "loading" }
  | { kind: "error"; message: string; onRetry: () => void }
  | { kind: "empty"; onRetry: () => void };

/** Full-screen loading, error, and "no profile" states. */
export function ProfileStateView(props: ProfileStateViewProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <View style={styles.wrap}>
        <ProfileHeader />
        {props.kind === "loading" ? (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.card}>
            {props.kind === "error" ? (
              <View style={styles.iconError}>
                <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
              </View>
            ) : (
              <View style={styles.iconNeutral}>
                <Ionicons name="person-outline" size={26} color={Colors.primary} />
              </View>
            )}
            <Text style={styles.title}>
              {props.kind === "error" ? "Unable to load profile" : "Profile not available"}
            </Text>
            <Text style={styles.subtitle}>
              {props.kind === "error"
                ? props.message
                : "We couldn't find profile details for your account."}
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={props.onRetry} style={styles.button}>
              <Text style={styles.buttonText}>{props.kind === "error" ? "Retry" : "Reload"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  wrap: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  iconError: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 54,
  },
  iconNeutral: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 54,
  },
  title: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
