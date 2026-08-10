import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { formatAppDate } from "@/utils/dateTime";
import { fetchServiceByIdThunk } from "@/middleware/service/service.thunk";
import {
  selectServiceById,
  selectServiceDetailsError,
  selectServiceDetailsLoading,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatDuration(durationMinutes: number | null) {
  return durationMinutes && durationMinutes > 0 ? `${durationMinutes} min` : "Duration pending";
}

function formatCreatedDate(createdAt: string | null) {
  return formatAppDate(createdAt, "-");
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ServiceDetailsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();

  const liveService = useAppSelector((state) => selectServiceById(state, id));
  const detailsLoading = useAppSelector(selectServiceDetailsLoading);
  const detailsError = useAppSelector(selectServiceDetailsError);

  useEffect(() => {
    if (id) {
      void dispatch(fetchServiceByIdThunk(id));
    }
  }, [id, dispatch]);

  const service = useMemo(() => {
    if (!liveService) {
      return null;
    }

    return {
      category: liveService.category ?? "-",
      createdLabel: formatCreatedDate(liveService.createdAt),
      durationLabel: formatDuration(liveService.durationMinutes),
      id: liveService.id,
      isActive: liveService.isActive,
      name: liveService.name,
      priceLabel: formatPrice(liveService.price),
    };
  }, [liveService]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/services" as Href);
  };

  if (detailsLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Service Details</Text>
            <View style={[styles.backButton, { opacity: 0 }]} />
          </View>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailsError) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Service Details</Text>
            <View style={[styles.backButton, { opacity: 0 }]} />
          </View>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Unable to load service</Text>
            <Text style={styles.notFoundSubtitle}>{detailsError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Service not found</Text>
            <Text style={styles.notFoundSubtitle}>
              This service could not be found.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Details</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/services/${service.id}/edit` as Href)}
            style={styles.backButton}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Ionicons name="cut-outline" size={28} color={Colors.primaryDark} />
          </View>
          <Text style={styles.serviceName}>{service.name}</Text>
          <View
            style={[
              styles.statusBadge,
              service.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                service.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
              ]}
            >
              {service.isActive ? "Active" : "Inactive"}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{service.priceLabel}</Text>
              <Text style={styles.statLabel}>Price</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{service.durationLabel}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>
        </View>

        <Section title="Service Information">
          <DetailRow label="Category" value={service.category} />
          <DetailRow label="Price" value={service.priceLabel} />
          <DetailRow label="Duration" value={service.durationLabel} />
          <DetailRow label="Status" value={service.isActive ? "Active" : "Inactive"} />
          <DetailRow label="Created" value={service.createdLabel} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding + Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  serviceName: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "800",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  statusBadge: {
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeActive: {
    backgroundColor: Colors.backgroundElement,
  },
  statusBadgeInactive: {
    backgroundColor: Colors.errorBg,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusBadgeTextActive: {
    color: Colors.primaryDark,
  },
  statusBadgeTextInactive: {
    color: Colors.error,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  statValue: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 13,
  },
  detailValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  notFoundWrap: {
    flex: 1,
    padding: Spacing.lg,
  },
  notFoundCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  notFoundTitle: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  notFoundSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
