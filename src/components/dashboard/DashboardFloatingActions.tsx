import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type DashboardFabAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: Href;
};

const ACTIONS: DashboardFabAction[] = [
  { icon: "calendar-outline", label: "New Appointment", route: "/bookings/new" as Href },
  { icon: "flash-outline", label: "Quick Sale", route: "/quick-sale" as Href },
  { icon: "person-add-outline", label: "Add Client", route: "/clients/new" as Href },
  { icon: "people-outline", label: "Add Staff", route: "/team/new" as Href },
  { icon: "pricetag-outline", label: "Add Service", route: "/services/new" as Href },
  { icon: "cube-outline", label: "Add Product", route: "/stock/new" as Href },
  { icon: "clipboard-outline", label: "Attendance", route: "/team/attendance" as Href },
  { icon: "diamond-outline", label: "Membership", route: "/memberships" as Href },
  { icon: "receipt-outline", label: "Expense", route: "/sales" as Href },
  { icon: "notifications-outline", label: "Reminder", route: "/notifications" as Href },
];

const triggerHapticFallback = () => {
  if (Platform.OS !== "web") {
    Vibration.vibrate(8);
  }
};

export function DashboardFloatingActions() {
  const Colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(Colors, insets.bottom), [Colors, insets.bottom]);
  const [expanded, setExpanded] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: expanded ? 220 : 170,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      toValue: expanded ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [expanded, progress]);

  const toggleMenu = () => {
    triggerHapticFallback();
    setExpanded((current) => !current);
  };

  const closeMenu = () => {
    setExpanded(false);
  };

  const handleActionPress = (route: Href) => {
    triggerHapticFallback();
    setExpanded(false);
    router.push(route);
  };

  const plusRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {expanded ? (
        <Pressable
          accessibilityLabel="Close quick actions"
          onPress={closeMenu}
          style={styles.backdrop}
        />
      ) : null}

      <View pointerEvents="box-none" style={styles.wrap}>
        <Animated.View
          pointerEvents={expanded ? "auto" : "none"}
          style={[
            styles.menu,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {ACTIONS.map((action, index) => {
            const itemProgress = progress.interpolate({
              inputRange: [0, 0.22 + index * 0.045, 1],
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
                      translateY: itemProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => handleActionPress(action.route)}
                  style={[
                    styles.action,
                    index < ACTIONS.length - 1 && styles.actionWithDivider,
                  ]}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name={action.icon} size={18} color={Colors.heading} />
                  </View>
                  <Text numberOfLines={1} style={styles.actionLabel}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>

        <TouchableOpacity
          accessibilityLabel={expanded ? "Close quick actions" : "Open quick actions"}
          accessibilityRole="button"
          activeOpacity={0.86}
          onPress={toggleMenu}
          style={styles.fab}
        >
          <Animated.View style={{ transform: [{ rotate: plusRotation }] }}>
            <Ionicons name="add" size={34} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors, bottomInset: number) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28, 25, 23, 0.08)",
  },
  wrap: {
    alignItems: "flex-end",
    bottom: Math.max(bottomInset, 10) + 18,
    position: "absolute",
    right: Spacing.lg,
    zIndex: 50,
  },
  menu: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    width: 218,
    elevation: 10,
  },
  action: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 42,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  actionWithDivider: {
    borderBottomColor: Colors.divider,
    borderBottomWidth: 1,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  actionLabel: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 9,
  },
  fab: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 62,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    width: 62,
    elevation: 12,
  },
});
