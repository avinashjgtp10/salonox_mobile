import React from "react";
import { ScrollView, View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing } from "../../constants/theme";

import DashboardHero from "../../components/dashboard/DashboardHero";
import QuickActions from "../../components/dashboard/QuickActions";
import RevenueGoal from "../../components/dashboard/RevenueGoal";
import AppointmentsList from "../../components/dashboard/AppointmentsList";
import QuickSaleSection from "../../components/dashboard/QuickSaleSection";
import StaffWorkload from "../../components/dashboard/StaffWorkload";
import TopClientCard from "../../components/dashboard/TopClientCard";
import InventoryAlerts from "../../components/dashboard/InventoryAlerts";

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Hero + stats — sticky on scroll */}
        <View>
          <DashboardHero />
        </View>

        {/* Quick action row */}
        <QuickActions />

        {/* Scrollable sections */}
        <View style={styles.sections}>
          <RevenueGoal earned={4320} target={6000} />
          <AppointmentsList />
          <QuickSaleSection />
          <StaffWorkload />
          <TopClientCard />
          <InventoryAlerts />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flexGrow: 1,
  },
  sections: {
    paddingTop: Spacing.md,
  },
});
