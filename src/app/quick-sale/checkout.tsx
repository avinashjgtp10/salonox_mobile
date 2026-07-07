import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { fetchSaleByIdThunk } from "@/middleware/sales/sales.thunk";
import { selectSaleDetail } from "@/store/sales/sales.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

export default function QuickSaleCheckoutScreen() {
  const params = useLocalSearchParams<{
    amountPaid?: string;
    mode?: string;
    paymentMethod?: string;
    receipt?: string;
    saleId?: string;
    total?: string;
  }>();
  const dispatch = useAppDispatch();
  const saleDetail = useAppSelector(selectSaleDetail);

  // Params render instantly; the authoritative record (once loaded) refreshes
  // the numbers in the background without blocking this confirmation screen.
  useEffect(() => {
    if (params.saleId) {
      void dispatch(fetchSaleByIdThunk(params.saleId));
    }
  }, [dispatch, params.saleId]);

  const authoritativeSale =
    saleDetail && params.saleId && saleDetail.id === params.saleId ? saleDetail : null;

  const isPreview = params.mode === "preview";
  const receipt = authoritativeSale?.receiptNumber ?? params.receipt ?? "QS-0001";
  const amountPaid = authoritativeSale?.amountPaid ?? Number(params.amountPaid ?? 0);
  const total = authoritativeSale?.total ?? Number(params.total ?? amountPaid);
  const paymentMethod = authoritativeSale?.paymentMethod ?? params.paymentMethod ?? "Cash";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={isPreview ? "receipt-outline" : "checkmark-done-outline"}
              size={30}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {isPreview ? "Receipt Ready to Print or Share" : "Sale Completed Successfully"}
          </Text>
          <Text style={styles.subtitle}>
            {isPreview
              ? "Your draft receipt is ready. You can print it, share it, or return to the sale."
              : "Payment has been captured and the receipt is ready for the front desk."}
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Receipt Number</Text>
              <Text style={styles.summaryValue}>{receipt}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{isPreview ? "Grand Total" : "Amount Paid"}</Text>
              <Text style={styles.summaryValue}>{formatCurrency(isPreview ? total : amountPaid)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <Text style={styles.summaryValue}>{paymentMethod}</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Print Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.86} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Share Receipt</Text>
          </TouchableOpacity>

          {params.saleId ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push(`/sales/${params.saleId}` as Href)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>View Full Invoice</Text>
            </TouchableOpacity>
          ) : null}

          {!isPreview ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() =>
                router.replace({
                  pathname: "/quick-sale",
                  params: { resetSale: String(Date.now()) },
                })
              }
              style={styles.ghostButton}
            >
              <Text style={styles.ghostButtonText}>New Sale</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.back()}
              style={styles.ghostButton}
            >
              <Text style={styles.ghostButtonText}>Back to Sale</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.replace("/dashboard" as Href)}
            style={styles.linkButton}
          >
            <Text style={styles.linkButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  successCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  title: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "800",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    width: "100%",
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 48,
    width: "100%",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: Spacing.sm,
    minHeight: 48,
    width: "100%",
  },
  secondaryButtonText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.sm,
    minHeight: 48,
    width: "100%",
  },
  ghostButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  linkButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    minHeight: 42,
  },
  linkButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
});
