import { AppBackButton } from "@/components/ui/AppBackButton";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { Text } from "@/components/ui/AppTypography";
import { TourScrollView } from "@/features/userGuide/DashboardTour";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout } from "@/constants/layout";
import { AppointmentSnackbar } from "@/features/appointments/components/shared/AppointmentSnackbar";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { getResponsiveHeaderTitleSize, getResponsiveHorizontalPadding, getResponsiveTopPadding } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useMemo } from "react";
import { RefreshControl, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";

export function ScreenShell({
  backFallback = "/dashboard" as Href,
  children,
  contentBottomPadding = AppLayout.contentBottomPadding,
  footer,
  hideHeader = false,
  onRefresh,
  refreshing,
  safeAreaEdges = ["top", "bottom"],
  scrollable = true,
  showCreateAction = true,
  title,
  topSurfaceColor,
  pearlBackground = false,
}: {
  backFallback?: Href;
  children: React.ReactNode;
  contentBottomPadding?: number;
  footer?: React.ReactNode;
  hideHeader?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  safeAreaEdges?: React.ComponentProps<typeof SafeAreaView>["edges"];
  scrollable?: boolean;
  showCreateAction?: boolean;
  title: string;
  topSurfaceColor?: string;
  pearlBackground?: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: getResponsiveHorizontalPadding(width),
      paddingTop: getResponsiveTopPadding(width),
    }),
    [width],
  );
  const headerTitleStyle = useMemo(
    () => ({ fontSize: getResponsiveHeaderTitleSize(width) }),
    [width],
  );
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(backFallback);
  };

  const content = (
    <>
      {!hideHeader ? <View style={styles.headerRow}>
        <AppBackButton activeOpacity={0.8} hitSlop={12} onPress={handleBack} />
        <Text style={[styles.headerTitle, headerTitleStyle]}>{title}</Text>
        {showCreateAction ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/bookings/new" as Href)}
            style={styles.iconButton}
          >
            <Ionicons name="add" size={20} color={Colors.primaryText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButtonGhost} />
        )}
      </View> : null}
      {children}
    </>
  );

  const screen = (
    <SafeAreaView edges={safeAreaEdges} style={[styles.safeArea, topSurfaceColor ? { backgroundColor: topSurfaceColor } : undefined]}>
      <AppStatusBar backgroundColor={topSurfaceColor} />
      {scrollable ? (
        <RefreshViewport><TourScrollView
          contentContainerStyle={[styles.content, contentStyle, { paddingBottom: contentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                colors={[Colors.primary]}
                onRefresh={onRefresh}
                refreshing={Boolean(refreshing)}
                tintColor={Colors.primary}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
        >
          {content}
        </TourScrollView></RefreshViewport>
      ) : (
        <View style={[styles.content, styles.fixedContent, contentStyle, { paddingBottom: contentBottomPadding }]}>{content}</View>
      )}
      {footer}
      <AppointmentSnackbar />
    </SafeAreaView>
  );
  return pearlBackground ? <PearlBackground>{screen}</PearlBackground> : screen;
}
