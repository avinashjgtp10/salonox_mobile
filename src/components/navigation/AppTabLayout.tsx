import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { type ReactNode, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ThemeColors } from "@/constants/theme";
import { AppFonts } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

const TAB_BAR_DESIGN_SPACING = 10;
const TAB_BAR_CONTENT_HEIGHT = 58;

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
  const filledName = name.replace(/-outline$/, "");
  const activeIcon = Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, filledName)
    ? filledName as keyof typeof Ionicons.glyphMap
    : name;

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? activeIcon : name} size={23} color={focused ? Colors.focusBorder : Colors.text2} />
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
        freezeOnBlur: true,
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
        tabBarActiveTintColor: Colors.focusBorder,
        tabBarInactiveTintColor: Colors.text2,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.label,
        tabBarLabelPosition: "below-icon",
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
    backgroundColor: Colors.bg,
    borderTopWidth: 0,
    borderWidth: 0,
    height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
    paddingBottom: bottomInset,
    paddingHorizontal: compactTabs ? 4 : 12,
    paddingTop: 0,
    elevation: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  label: {
    fontFamily: AppFonts.semibold,
    fontSize: compactTabs ? 11 : 12,
    fontWeight: "normal",
    lineHeight: 16,
    marginTop: 3,
  },
  tabBarItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: compactTabs ? 48 : 56,
  },
  iconWrapActive: {
    backgroundColor: Colors.backgroundSelected,
  },
});
