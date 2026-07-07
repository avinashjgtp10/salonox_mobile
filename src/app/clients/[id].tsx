import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { clientService } from "@/services/client.service";
import { fetchClientByIdThunk } from "@/middleware/client/client.thunk";
import {
  selectClientById,
  selectClientDetailsError,
  selectClientDetailsLoading,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ClientDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();

  const liveClient = useAppSelector((state) => selectClientById(state, id));
  const detailsLoading = useAppSelector(selectClientDetailsLoading);
  const detailsError = useAppSelector(selectClientDetailsError);

  useEffect(() => {
    if (id) {
      void dispatch(fetchClientByIdThunk(id));
    }
  }, [id, dispatch]);

  const client = useMemo(() => {
    if (!liveClient) {
      return null;
    }

    const avatarTone = clientService.getAvatarTone(liveClient.id);

    return {
      avatarBg: avatarTone.background,
      avatarColor: avatarTone.color,
      city: "-",
      createdLabel: liveClient.createdDateLabel,
      email: liveClient.email,
      favoriteService: liveClient.membership ?? "No preference added",
      fullName: liveClient.fullName,
      gender: liveClient.gender,
      initials: liveClient.initials,
      membership: liveClient.membership,
      notes: "No notes added.",
      phone: liveClient.phone,
      preferredStaff: "-",
      status: liveClient.status,
      totalSpending: 0,
      totalVisits: liveClient.totalVisits,
    };
  }, [liveClient]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/clients" as Href);
  };

  if (detailsLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Client Profile</Text>
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
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.notFoundWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Client Profile</Text>
            <View style={[styles.backButton, { opacity: 0 }]} />
          </View>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Unable to load client</Text>
            <Text style={styles.notFoundSubtitle}>{detailsError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.notFoundWrap}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Client not found</Text>
            <Text style={styles.notFoundSubtitle}>
              This client profile could not be found.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Profile</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/bookings/new")} style={styles.headerAction}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: client.avatarBg }]}>
            <Text style={[styles.avatarText, { color: client.avatarColor }]}>{client.initials}</Text>
          </View>
          <Text style={styles.clientName}>{client.fullName}</Text>
          <Text style={styles.clientPhone}>{client.phone}</Text>
          {client.membership ? (
            <View style={styles.membershipBadge}>
              <Ionicons name="diamond-outline" size={12} color={Colors.goldDark} />
              <Text style={styles.membershipText}>{client.membership}</Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(client.totalSpending)}</Text>
              <Text style={styles.statLabel}>Lifetime Spend</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{client.totalVisits}</Text>
              <Text style={styles.statLabel}>Total Visits</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/bookings/new")} style={styles.quickAction}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.quickActionText}>Book</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/quick-sale")} style={styles.quickAction}>
            <Ionicons name="flash-outline" size={18} color={Colors.primary} />
            <Text style={styles.quickActionText}>Quick Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/clients/new")} style={styles.quickAction}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.quickActionText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Section title="Client Information">
          <DetailRow label="Email" value={client.email} />
          <DetailRow label="Gender" value={client.gender} />
          <DetailRow label="Membership" value={client.membership ?? "-"} />
          <DetailRow label="Status" value={client.status} />
          <DetailRow label="Favorite Service" value={client.favoriteService} />
          <DetailRow label="Preferred Staff" value={client.preferredStaff} />
          <DetailRow label="City" value={client.city} />
          <DetailRow label="Created" value={client.createdLabel} />
        </Section>

        <Section title="Notes">
          <Text style={styles.notesText}>{client.notes ?? "No notes added."}</Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerAction: {
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
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  clientName: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "800",
    marginTop: Spacing.md,
  },
  clientPhone: {
    color: Colors.text2,
    fontSize: 13,
    marginTop: 4,
  },
  membershipBadge: {
    alignItems: "center",
    backgroundColor: "#FBF3E5",
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    marginTop: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  membershipText: {
    color: Colors.goldDark,
    fontSize: 11,
    fontWeight: "700",
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
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    paddingVertical: 14,
  },
  quickActionText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
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
  notesText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
