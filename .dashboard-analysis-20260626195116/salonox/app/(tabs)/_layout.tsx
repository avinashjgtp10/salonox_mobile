import React from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Colors } from "../../constants/theme";

// Custom tab bar icon component
function TabIcon({
  emoji,
  focused,
  isQS,
}: {
  emoji: string;
  focused: boolean;
  isQS?: boolean;
}) {
  if (isQS) {
    return (
      <View style={styles.qsWrap}>
        <View style={styles.qsBtn}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <Text style={styles.qsLabel}>Quick Sale</Text>
      </View>
    );
  }
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconEmoji, { opacity: focused ? 1 : 0.5 }]}>
        {emoji}
      </Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text2,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⌂" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="quick-sale"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚡" focused={focused} isQS />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⋯" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  iconWrap: {
    alignItems: "center",
    gap: 2,
  },
  iconEmoji: {
    fontSize: 22,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 1,
  },
  qsWrap: {
    alignItems: "center",
    marginTop: -20,
  },
  qsBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  qsLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.primary,
    marginTop: 2,
  },
});
