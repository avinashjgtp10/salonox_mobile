import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Colors, Spacing, Radius } from "../../constants/theme";
import { QUICK_SERVICES } from "../../data/dashboardData";

const ICON_MAP: Record<string, string> = {
  cut: "✂️",
  sparkle: "✨",
  droplet: "💧",
  wind: "💨",
  scissors: "✂️",
  hand: "🤲",
};

export default function QuickSaleSection() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const total = QUICK_SERVICES.filter((s) => selected.includes(s.id)).reduce(
    (sum, s) => sum + s.price,
    0
  );

  const handleCheckout = () => {
    router.push({
      pathname: "/quick-sale/checkout",
      params: { serviceIds: selected.join(","), total: total.toString() },
    } as any);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Walk-in ready</Text>
          <Text style={styles.sectionTitle}>Quick Sale</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/quick-sale" as any)}>
          <Text style={styles.link}>All services</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerIcon}>
            <Text style={{ fontSize: 20 }}>⚡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tap a service · bill instantly</Text>
            <Text style={styles.headerSub}>No booking needed · straight to checkout</Text>
          </View>
        </View>

        {/* Service grid */}
        <View style={styles.grid}>
          {QUICK_SERVICES.map((svc, i) => {
            const isSelected = selected.includes(svc.id);
            const isRight = i % 2 === 1;
            return (
              <TouchableOpacity
                key={svc.id}
                style={[
                  styles.serviceItem,
                  isRight && styles.serviceItemRight,
                  isSelected && styles.serviceItemSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => toggle(svc.id)}
              >
                <View
                  style={[styles.serviceIcon, { backgroundColor: svc.iconBg }]}
                >
                  <Text style={{ fontSize: 16 }}>
                    {ICON_MAP[svc.icon] ?? "✦"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.servicePrice}>₹{svc.price}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkDot}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/quick-sale" as any)}
          >
            <Text style={styles.browseBtnText}>⊞ Browse all 42 services</Text>
          </TouchableOpacity>
          <Text style={styles.footerTotal}>
            Today:{" "}
            <Text style={styles.footerTotalValue}>₹1,240</Text>
          </Text>
        </View>

        {/* Checkout CTA */}
        {selected.length > 0 && (
          <View style={styles.ctaWrapper}>
            <TouchableOpacity
              style={styles.ctaBtn}
              activeOpacity={0.85}
              onPress={handleCheckout}
            >
              <Text style={styles.ctaText}>
                Proceed to checkout · ₹{total.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.text2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.heading,
    marginTop: 2,
  },
  link: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  serviceItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderLeftWidth: 0,
  },
  serviceItemRight: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  serviceItemSelected: {
    backgroundColor: "#EEF4F1",
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.text,
  },
  servicePrice: {
    fontSize: 11,
    color: Colors.text2,
    marginTop: 1,
  },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  browseBtn: {},
  browseBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  footerTotal: {
    fontSize: 11,
    color: Colors.text2,
  },
  footerTotalValue: {
    fontWeight: "700",
    color: Colors.heading,
  },
  ctaWrapper: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
