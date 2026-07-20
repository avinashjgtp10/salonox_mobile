import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const TAB_BAR_DESIGN_SPACING = 10;
const TAB_BAR_CONTENT_HEIGHT = 60;

type TabIconProps = {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
};

export const unstable_settings = {
  initialRouteName: "dashboard",
};

function TabIcon({ focused, name }: TabIconProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Ionicons name={name} size={20} color={focused ? Colors.onPrimary : Colors.hint} />
    </View>
  );
}

export default function DashboardTabsLayout() {
  const Colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, TAB_BAR_DESIGN_SPACING);
  const styles = useMemo(
    () => createStyles(Colors, bottomInset),
    [Colors, bottomInset],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.heading,
        tabBarInactiveTintColor: Colors.text2,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="quick-sale"
        options={{
          title: "Quick Sale",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="flash-outline" />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="people-outline" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="menu-outline" />,
        }}
      />
    </Tabs>
  );
}

const createStyles = (Colors: ThemeColors, bottomInset = 0) => StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
    paddingBottom: bottomInset,
    paddingHorizontal: 8,
    paddingTop: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
  },
  tabBarItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 38,
  },
  iconWrapFocused: {
    backgroundColor: Colors.primaryDark,
  },
});
