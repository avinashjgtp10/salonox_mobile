import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

import { DashboardColors as Colors } from "@/constants/theme";

type TabIconProps = {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
};

export const unstable_settings = {
  initialRouteName: "dashboard",
};

function TabIcon({ focused, name }: TabIconProps) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Ionicons name={name} size={20} color={focused ? "#FFFFFF" : Colors.text2} />
    </View>
  );
}

export default function DashboardTabsLayout() {
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    height: Platform.OS === "ios" ? 86 : 70,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    paddingTop: 8,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
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
    backgroundColor: Colors.primary,
  },
});
