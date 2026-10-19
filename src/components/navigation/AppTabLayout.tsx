import { OpalGlassBackground } from "@/components/ui/OpalGlassBackground";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { ScrollFooterContext } from "@/hooks/useScrollFooter";
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
  const translateY = useRef(new Animated.Value(0)).current;
  const hidden = useRef(false);
  const reduceMotion = useRef(false);
  const screenReader = useRef(false);
  const setFooterHidden = useCallback((next: boolean) => {
    next = next && !screenReader.current;
    if (hidden.current === next) return;
    hidden.current = next;
    translateY.stopAnimation();
    Animated.timing(translateY, {
      toValue: next ? TAB_BAR_CONTENT_HEIGHT + bottomInset + 40 : 0,
      duration: reduceMotion.current ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [bottomInset, translateY]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) reduceMotion.current = value; }).catch(() => {});
    void AccessibilityInfo.isScreenReaderEnabled().then(value => {
      if (active) { screenReader.current = value; if (value) setFooterHidden(false); }
    }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", value => { reduceMotion.current = value; });
    const reader = AccessibilityInfo.addEventListener("screenReaderChanged", value => {
      screenReader.current = value;
      if (value) setFooterHidden(false);
    });
    return () => { active = false; motion?.remove(); reader?.remove(); translateY.stopAnimation(); };
  }, [setFooterHidden, translateY]);

  return (
    <ScrollFooterContext.Provider value={setFooterHidden}>
    <Tabs
      screenListeners={{ focus: () => setFooterHidden(false) }}
      screenOptions={{
        freezeOnBlur: true,
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
        tabBarActiveTintColor: Colors.focusBorder,
        tabBarInactiveTintColor: Colors.text2,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.label,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: [styles.tabBar, { transform: [{ translateY }] }],
        tabBarBackground: () => (
          <View pointerEvents="none" style={styles.glassPill}>
            <OpalGlassBackground translucent />
          </View>
        ),
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
    </ScrollFooterContext.Provider>
  );
}

const createStyles = (Colors: ThemeColors, bottomInset = 0, compactTabs = false) => StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: compactTabs ? 10 : 16,
    right: compactTabs ? 10 : 16,
    bottom: bottomInset,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: Colors.glassEdge,
    borderWidth: 1,
    borderColor: Colors.glassEdge,
    borderRadius: 999,
    height: TAB_BAR_CONTENT_HEIGHT + 12,
    paddingBottom: 6,
    paddingHorizontal: compactTabs ? 8 : 14,
    paddingTop: 6,
    elevation: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  glassPill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: "hidden",
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
    borderWidth: 1,
    borderColor: Colors.glassEdge,
  },
});
