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
import { RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
        <TouchableOpacity activeOpacity={0.8} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, headerTitleStyle]}>{title}</Text>
        {showCreateAction ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/bookings/new" as Href)}
            style={styles.iconButton}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButtonGhost} />
        )}
      </View> : null}
      {children}
    </>
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.safeArea}>
      <AppStatusBar />
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
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
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fixedContent, contentStyle, { paddingBottom: contentBottomPadding }]}>{content}</View>
      )}
      {footer}
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}
