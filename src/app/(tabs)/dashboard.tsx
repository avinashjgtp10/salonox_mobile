import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout } from "@/constants/layout";
import AppointmentsList from "@/components/dashboard/AppointmentsList";
import DashboardHero from "@/components/dashboard/DashboardHero";
import InventoryAlerts from "@/components/dashboard/InventoryAlerts";
import QuickActions from "@/components/dashboard/QuickActions";
import QuickSaleSection from "@/components/dashboard/QuickSaleSection";
import RevenueGoal from "@/components/dashboard/RevenueGoal";
import StaffWorkload from "@/components/dashboard/StaffWorkload";
import TopClientCard from "@/components/dashboard/TopClientCard";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectDashboardError,
  selectDashboardIsLoading,
  selectDashboardIsStale,
  selectDashboardRefreshing,
  selectDashboardStatus,
} from "@/store/dashboard/dashboard.slice";

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const dashboardError = useAppSelector(selectDashboardError);
  const isDashboardLoading = useAppSelector(selectDashboardIsLoading);
  const isDashboardRefreshing = useAppSelector(selectDashboardRefreshing);
  const isDashboardStale = useAppSelector(selectDashboardIsStale);
  const dashboardStatus = useAppSelector(selectDashboardStatus);
  const showErrorState = dashboardStatus === "failed";

  const fetchDashboard = useCallback(async () => {
    await dispatch(fetchDashboardThunk());
  }, [dispatch]);

  useEffect(() => {
    if (dashboardStatus === "idle") {
      void fetchDashboard();
    }
  }, [dashboardStatus, fetchDashboard]);

  useFocusEffect(
    useCallback(() => {
      if (dashboardStatus !== "idle" && isDashboardStale && !isDashboardLoading) {
        void fetchDashboard();
      }
    }, [dashboardStatus, fetchDashboard, isDashboardLoading, isDashboardStale]),
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => {
              void fetchDashboard();
            }}
            refreshing={isDashboardRefreshing}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={showErrorState ? [] : [1]}
      >
        {showErrorState ? (
          <View style={styles.errorWrap}>
            <View style={styles.errorIcon}>
              <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
            </View>
            <Text style={styles.errorTitle}>Unable to load dashboard</Text>
            <Text style={styles.errorSubtitle}>
              {dashboardError ?? "Please try again in a moment."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void fetchDashboard()}
              style={styles.errorButton}
            >
              <Text style={styles.errorButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <DashboardHero />
            <View style={styles.stickyActions}>
              <QuickActions />
            </View>
            <RevenueGoal />
            <AppointmentsList />
            <QuickSaleSection />
            <StaffWorkload />
            <TopClientCard />
            <InventoryAlerts />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.primaryDark,
    flex: 1,
  },
  content: {
    backgroundColor: Colors.bg,
    paddingBottom: AppLayout.contentBottomPadding,
  },
  stickyActions: {
    backgroundColor: Colors.card,
    zIndex: 10,
  },
  errorWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 54,
  },
  errorTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  errorSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  errorButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
