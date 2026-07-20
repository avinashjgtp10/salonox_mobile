import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardIsLoading,
  selectDashboardQuickSaleRevenueToday,
  selectDashboardQuickSaleServices,
} from "@/store/dashboard/dashboard.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

const getServiceTileStyles = (
  Colors: ThemeColors,
): { icon: keyof typeof Ionicons.glyphMap; iconBg: string }[] => [
  { icon: "cut-outline", iconBg: Colors.bg2 },
  { icon: "sparkles-outline", iconBg: Colors.warningBg },
  { icon: "water-outline", iconBg: Colors.successBg },
  { icon: "hand-left-outline", iconBg: Colors.purpleBg },
  { icon: "airplane-outline", iconBg: Colors.infoBg },
];

export default function QuickSaleSection() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const serviceTileStyles = useMemo(() => getServiceTileStyles(Colors), [Colors]);
  const getServiceTileStyle = (index: number) => serviceTileStyles[index % serviceTileStyles.length];
  const quickSaleServices = useAppSelector(selectDashboardQuickSaleServices);
  const quickSaleRevenueToday = useAppSelector(selectDashboardQuickSaleRevenueToday);
  const isLoading = useAppSelector(selectDashboardIsLoading);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  };

  const total = quickSaleServices
    .filter((service) => selected.includes(service.id))
    .reduce((sum, service) => sum + service.price, 0);

  const handleCheckout = () => {
    router.push({
      pathname: "/quick-sale/checkout",
      params: { serviceIds: selected.join(","), total: total.toString() },
    } as Href);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Walk-in ready</Text>
          <Text style={styles.sectionTitle}>Quick Sale</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/quick-sale")}>
          <Text style={styles.link}>All services</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerIcon}>
            <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Tap a service - bill instantly</Text>
            <Text style={styles.headerSub}>No booking needed - straight to checkout</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="small" />
          </View>
        ) : quickSaleServices.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No quick sale services available.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {quickSaleServices.map((service, index) => {
              const isSelected = selected.includes(service.id);
              const isRight = index % 2 === 1;
              const tileStyle = getServiceTileStyle(index);

              return (
                <TouchableOpacity
                  key={service.id}
                  activeOpacity={0.7}
                  onPress={() => toggle(service.id)}
                  style={[
                    styles.serviceItem,
                    isRight && styles.serviceItemRight,
                    isSelected && styles.serviceItemSelected,
                  ]}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: tileStyle.iconBg }]}>
                    <Ionicons name={tileStyle.icon} size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.serviceCopy}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.servicePrice}>Rs. {service.price}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkDot}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push("/quick-sale")}>
            <Text style={styles.browseBtnText}>Browse all services</Text>
          </TouchableOpacity>
          <Text style={styles.footerTotal}>
            Today:{" "}
            <Text style={styles.footerTotalValue}>
              Rs. {quickSaleRevenueToday.toLocaleString("en-IN")}
            </Text>
          </Text>
        </View>

        {selected.length > 0 && (
          <View style={styles.ctaWrapper}>
            <TouchableOpacity activeOpacity={0.85} onPress={handleCheckout} style={styles.ctaBtn}>
              <Text style={styles.ctaText}>
                Proceed to checkout - Rs. {total.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  link: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  headerSub: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 10,
    marginTop: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  serviceItem: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    width: "50%",
  },
  serviceItemRight: {
    borderLeftColor: Colors.border,
    borderLeftWidth: 1,
  },
  serviceItemSelected: {
    backgroundColor: Colors.bg2,
  },
  serviceIcon: {
    alignItems: "center",
    borderRadius: Radius.sm,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  serviceCopy: {
    flex: 1,
  },
  serviceName: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "500",
  },
  servicePrice: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 1,
  },
  checkDot: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  footer: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  browseBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  footerTotal: {
    color: Colors.text2,
    fontSize: 11,
  },
  footerTotalValue: {
    color: Colors.heading,
    fontWeight: "700",
  },
  ctaWrapper: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  ctaBtn: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
