import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Portal } from "@/components/ui/Portal";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type DashboardDrawerAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: Href;
  tone: keyof ReturnType<typeof getActionTone>;
};

type DashboardSideDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

const ACTIONS: DashboardDrawerAction[] = [
  { icon: "grid-outline", label: "Catalog", route: "/catalog" as Href, tone: "primary" },
  { icon: "stats-chart-outline", label: "Reports", route: "/reports" as Href, tone: "gold" },
  { icon: "person-add-outline", label: "Add Client", route: "/clients/new" as Href, tone: "green" },
  { icon: "people-outline", label: "Add Staff", route: "/team/new" as Href, tone: "indigo" },
  { icon: "pricetag-outline", label: "Add Service", route: "/services/new" as Href, tone: "warning" },
  { icon: "cube-outline", label: "Add Product", route: "/stock/new" as Href, tone: "blue" },
  { icon: "clipboard-outline", label: "Attendance", route: "/team/attendance" as Href, tone: "info" },
  { icon: "receipt-outline", label: "Expense", route: "/sales" as Href, tone: "error" },
];

const getActionTone = (Colors: ThemeColors) => ({
  blue: { accent: Colors.accentBlue, surface: Colors.accentBlueSoft },
  error: { accent: Colors.error, surface: Colors.errorBg },
  gold: { accent: Colors.gold, surface: Colors.warningBg },
  green: { accent: Colors.accentGreen, surface: Colors.accentGreenSoft },
  indigo: { accent: Colors.accentIndigo, surface: Colors.accentIndigoSoft },
  info: { accent: Colors.info, surface: Colors.infoBg },
  primary: { accent: Colors.primary, surface: Colors.backgroundSelected },
  purple: { accent: Colors.purple, surface: Colors.purpleBg },
  sky: { accent: Colors.accentSky, surface: Colors.accentSkySoft },
  warning: { accent: Colors.warning, surface: Colors.warningBg },
});

const withAlpha = (hexColor: string, alpha: number) => {
  const hex = hexColor.replace("#", "");

  if (hex.length !== 6) {
    return hexColor;
  }

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const triggerHapticFallback = () => {
  if (Platform.OS !== "web") {
    Vibration.vibrate(8);
  }
};

export function DashboardSideDrawer({ visible, onClose }: DashboardSideDrawerProps) {
  const Colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.82, 340);
  const styles = useMemo(
    () => createStyles(Colors, drawerWidth, insets.top, insets.bottom),
    [Colors, drawerWidth, insets.bottom, insets.top],
  );
  const actionTone = useMemo(() => getActionTone(Colors), [Colors]);
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearCloseTimer();

    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        duration: 300,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        toValue: 1,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      duration: 280,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      toValue: 0,
      useNativeDriver: true,
    }).start();

    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
    }, 280);
  }, [clearCloseTimer, progress, visible]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  useEffect(() => {
    if (!mounted) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [mounted, onClose]);

  const handleActionPress = (route: Href) => {
    triggerHapticFallback();
    onClose();
    router.push(route);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Portal>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents={visible ? "auto" : "none"}
          style={[
            styles.backdrop,
            {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Close quick actions drawer"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          accessibilityLabel="Quick actions drawer"
          accessibilityRole="menu"
          pointerEvents={visible ? "auto" : "none"}
          style={[
            styles.drawer,
            {
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-drawerWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient colors={[Colors.card, Colors.bg2]} style={StyleSheet.absoluteFill} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>SalonOX</Text>
              <Text style={styles.title}>Quick Actions</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close quick actions drawer"
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons color={Colors.heading} name="close" size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.actionList}
            showsVerticalScrollIndicator={false}
          >
            {ACTIONS.map((action, index) => {
              const tone = actionTone[action.tone];
              const itemProgress = progress.interpolate({
                inputRange: [0, 0.18 + index * 0.045, 1],
                outputRange: [0, 0, 1],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={action.label}
                  style={{
                    opacity: itemProgress,
                    transform: [
                      {
                        translateX: itemProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-12, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    accessibilityRole="menuitem"
                    activeOpacity={0.82}
                    onPress={() => handleActionPress(action.route)}
                    style={styles.action}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: tone.surface }]}>
                      <Ionicons color={tone.accent} name={action.icon} size={20} />
                    </View>
                    <Text numberOfLines={1} style={styles.actionLabel}>
                      {action.label}
                    </Text>
                    <Ionicons color={Colors.hint} name="chevron-forward" size={18} />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Portal>
  );
}

const createStyles = (
  Colors: ThemeColors,
  drawerWidth: number,
  topInset: number,
  bottomInset: number,
) => StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: Colors.backgroundElement,
    borderColor: Colors.border,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.055,
    shadowRadius: 16,
    elevation: 2,
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: Radius.lg,
    height: 42,
    justifyContent: "center",
    marginRight: Spacing.md,
    width: 42,
  },
  actionLabel: {
    backgroundColor: "transparent",
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    fontWeight: Typography.fontWeights.bold,
    lineHeight: 20,
    minWidth: 0,
  },
  actionList: {
    gap: Spacing.sm,
    paddingBottom: Math.max(bottomInset, Spacing.lg) + Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withAlpha(Colors.shadow, 0.46),
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.backgroundElement,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  drawer: {
    backgroundColor: Colors.card,
    borderBottomRightRadius: Radius.xxl,
    borderColor: Colors.border,
    borderRightWidth: 1,
    borderTopRightRadius: Radius.xxl,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 12, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    top: 0,
    width: drawerWidth,
    elevation: 18,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 1.4,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Math.max(topInset, Spacing.lg) + Spacing.lg,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.md,
  },
  title: {
    color: Colors.heading,
    fontFamily: Typography.fontFamilies.display,
    fontSize: 28,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: 34,
    marginTop: Spacing.xs,
  },
});
