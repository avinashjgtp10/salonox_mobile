import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { type ReactNode, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const TAB_BAR_DESIGN_SPACING = 10;
const TAB_BAR_CONTENT_HEIGHT = 60;

export type AppTabItem = {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  title: string;
};

type AppTabLayoutProps = {
  children?: ReactNode;
  tabs: AppTabItem[];
};

type TabIconProps = {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
  compact: boolean;
};

function TabIcon({ compact, focused, name }: TabIconProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors, 0, compact), [Colors, compact]);

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={20} color={focused ? Colors.onPrimary : Colors.hint} style={focused ? undefined : styles.iconDimmed} />
    </View>
  );
}

export function AppTabLayout({ children, tabs }: AppTabLayoutProps) {
  const Colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compactTabs = tabs.length >= 5 && width < 400;
  const bottomInset = Math.max(insets.bottom, TAB_BAR_DESIGN_SPACING);
  const styles = useMemo(() => createStyles(Colors, bottomInset, compactTabs), [Colors, bottomInset, compactTabs]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text2,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => <TabIcon compact={compactTabs} focused={focused} name={tab.icon} />,
          }}
        />
      ))}
      {children}
    </Tabs>
  );
}

const createStyles = (Colors: ThemeColors, bottomInset = 0, compactTabs = false) => StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.dashboardCard,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    borderWidth: 0,
    height: (compactTabs ? 56 : TAB_BAR_CONTENT_HEIGHT) + bottomInset,
    paddingBottom: bottomInset,
    paddingHorizontal: 10,
    paddingTop: compactTabs ? 8 : 10,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  label: {
    fontSize: compactTabs ? 9 : 10,
    fontWeight: "800",
  },
  tabBarItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
  },
  iconDimmed: {
    opacity: 0.55,
  },
});
