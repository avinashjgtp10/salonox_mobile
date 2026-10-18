import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { guideStorage } from "@/features/userGuide/guideStorage";
import { useAppToast } from "@/hooks/useAppToast";
import { useIsOnHomeScreen } from "@/hooks/useIsOnHomeScreen";
import { useThemeColors } from "@/theme/ThemeProvider";
import { appRatingStorage } from "./appRatingStorage";

// Reviews always go to the production listing; dev/QA builds aren't on the stores.
const IOS_APP_ID = "6814854823";
const ANDROID_PACKAGE = "com.salonox.app";
const STORE_REVIEW_URLS = Platform.select({
  ios: [
    `itms-apps://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`,
    `https://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`,
  ],
  default: [
    `market://details?id=${ANDROID_PACKAGE}`,
    `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
  ],
});
const STORE_NAME = Platform.OS === "ios" ? "App Store" : "Play Store";

// Let the home screen settle before asking.
const PROMPT_DELAY_MS = 2500;
const STAR_COLOR = "#F5B400";
const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

const openStoreReview = async () => {
  for (const url of STORE_REVIEW_URLS) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // Try the web listing when the store app can't be opened.
    }
  }
  return false;
};

function AppRatingSheet({ onDismiss, onSubmit, visible }: { onDismiss: () => void; onSubmit: () => void; visible: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment("");
    }
  }, [visible]);

  const canSubmit = rating > 0;

  return (
    <BottomSheet
      avoidKeyboard
      footer={
        <>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.84} onPress={onDismiss} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            activeOpacity={canSubmit ? 0.84 : 1}
            disabled={!canSubmit}
            onPress={onSubmit}
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>Submit</Text>
          </TouchableOpacity>
        </>
      }
      onClose={onDismiss}
      subtitle="How has your experience been? Your rating helps us improve."
      title="Enjoying SalonOX?"
      visible={visible}
    >
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity
            key={value}
            accessibilityLabel={`${value} star${value === 1 ? "" : "s"}`}
            accessibilityRole="button"
            accessibilityState={{ selected: rating === value }}
            activeOpacity={0.7}
            hitSlop={{ bottom: 6, left: 4, right: 4, top: 6 }}
            onPress={() => setRating(value)}
          >
            <Ionicons color={value <= rating ? STAR_COLOR : Colors.border} name={value <= rating ? "star" : "star-outline"} size={36} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingLabel}>{rating ? RATING_LABELS[rating] : "Tap a star to rate"}</Text>

      <Text style={styles.label}>Your feedback (optional)</Text>
      <TextInput
        maxLength={500}
        multiline
        numberOfLines={4}
        onChangeText={setComment}
        placeholder="Tell us what you like or what we can improve"
        placeholderTextColor={Colors.placeholder}
        style={styles.input}
        value={comment}
      />
      <Text style={styles.hint}>After you submit, the {STORE_NAME} opens so you can post your review.</Text>
    </BottomSheet>
  );
}

/** Asks owners and staff to rate the app on their home screen; see appRatingStorage for the schedule. */
export function AppRatingPrompt({ enabled }: { enabled: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const toast = useAppToast();
  const onHome = useIsOnHomeScreen();
  const userId = user?.id ?? "";
  const [dueFor, setDueFor] = useState<string | null>(null);
  const [visibleFor, setVisibleFor] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDueFor(null);
    if (isAuthenticated && !isLoading && userId) {
      // A brand-new account gets the welcome guide first; ask on a later launch.
      void Promise.all([appRatingStorage.shouldShow(userId), guideStorage.shouldShow(userId)]).then(([due, guidePending]) => {
        if (active && due && !guidePending) setDueFor(userId);
      });
    }
    return () => { active = false; };
  }, [isAuthenticated, isLoading, userId]);

  useEffect(() => {
    if (!enabled || !onHome || !userId || dueFor !== userId) return undefined;
    const timer = setTimeout(() => {
      // Once per launch at most; the stored dismissal decides the next one.
      setDueFor(null);
      setVisibleFor(userId);
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dueFor, enabled, onHome, userId]);

  const handleDismiss = () => {
    setVisibleFor(null);
    void appRatingStorage.markDismissed(userId);
  };

  const handleSubmit = async () => {
    setVisibleFor(null);
    await appRatingStorage.markSubmitted(userId);
    if (await openStoreReview()) {
      toast.showSuccess("Thanks for rating SalonOX!");
    } else {
      toast.showError(`Couldn't open the ${STORE_NAME}. Please try again later.`);
    }
  };

  return (
    <AppRatingSheet
      onDismiss={handleDismiss}
      onSubmit={() => void handleSubmit()}
      visible={Boolean(userId) && visibleFor === userId}
    />
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    starRow: {
      flexDirection: "row",
      gap: Spacing.sm,
      justifyContent: "center",
    },
    ratingLabel: {
      color: Colors.text2,
      fontSize: 13,
      fontWeight: "700",
      marginTop: Spacing.sm,
      textAlign: "center",
    },
    label: {
      color: Colors.heading,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 8,
      marginTop: Spacing.lg,
    },
    input: {
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      color: Colors.heading,
      fontSize: 14,
      minHeight: 96,
      paddingHorizontal: 14,
      paddingVertical: 12,
      textAlignVertical: "top",
    },
    hint: {
      color: Colors.text2,
      fontSize: 12,
      lineHeight: 18,
      marginTop: Spacing.sm,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 14,
    },
    secondaryButtonText: {
      color: Colors.heading,
      fontSize: 14,
      fontWeight: "800",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: Radius.md,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 14,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
  });
