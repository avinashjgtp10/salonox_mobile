import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Image, // Added for logo and QR code
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { printerService } from "@/services/printer.service";
import type { ReceiptData } from "@/utils/receiptGenerator";
import { useThemeColors } from "@/theme/ThemeProvider";

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  onClose,
  receiptData,
}) => {
  const Colors = useThemeColors();
  const [paperSize, setPaperSize] = useState<"80mm" | "58mm">("80mm");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const activeData: ReceiptData = {
    ...receiptData,
    paperSize,
  };

  const handlePrint = async () => {
    try {
      setIsActionLoading(true);
      await printerService.printReceipt(activeData);
    } catch (error) {
      console.error("[Printer] Print error:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsActionLoading(true);
      await printerService.shareReceipt(activeData);
    } catch (error) {
      console.error("[Printer] Share error:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: Colors.border }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors.text }]}>Receipt Preview</Text>
          <View style={styles.paperToggle}>
            <TouchableOpacity
              onPress={() => setPaperSize("80mm")}
              style={[
                styles.paperBadge,
                paperSize === "80mm" && { backgroundColor: Colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.paperBadgeText,
                  { color: paperSize === "80mm" ? Colors.onPrimary : Colors.hint },
                ]}
              >
                80mm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPaperSize("58mm")}
              style={[
                styles.paperBadge,
                paperSize === "58mm" && { backgroundColor: Colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.paperBadgeText,
                  { color: paperSize === "58mm" ? Colors.onPrimary : Colors.hint },
                ]}
              >
                58mm
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Thermal Receipt Visual Preview Card */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.receiptPaper,
              { width: paperSize === "58mm" ? 260 : 320 },
            ]}
          >
            {activeData.salon.logoUrl ? (
              <Image source={{ uri: activeData.salon.logoUrl }} style={styles.salonLogo} />
            ) : null}
            <Text style={styles.salonName}>{activeData.salon.name}</Text>
            {activeData.salon.address ? (
              <Text style={styles.centerText}>
                {activeData.salon.address}
                {activeData.salon.city ? `, ${activeData.salon.city}` : ""}
                {activeData.salon.state ? `, ${activeData.salon.state}` : ""}
              </Text>
            ) : null}
            {activeData.salon.phone ? (
              <Text style={styles.centerText}>Phone: {activeData.salon.phone}</Text>
            ) : null}
            {activeData.salon.email ? (
              <Text style={styles.centerText}>Email: {activeData.salon.email}</Text>
            ) : null}
            {activeData.salon.website ? (
              <Text style={styles.centerText}>{activeData.salon.website}</Text>
            ) : null}
            {activeData.salon.gstin ? (
              <Text style={[styles.centerText, styles.bold]}>
                GSTIN: {activeData.salon.gstin}
              </Text>
            ) : null}

            <View style={styles.dashedLine} />

            <Text>
              Inv #: <Text style={styles.bold}>{activeData.invoice.invoiceNumber}</Text>
            </Text>
            <Text>
              Date: <Text style={styles.bold}>{activeData.invoice.date}</Text>{" "}
              <Text style={styles.bold}>{activeData.invoice.time}</Text>
            </Text>
            <Text>Client: {activeData.client.name}</Text>
            {activeData.client.phone ? (
              <Text>
                Client Phone: <Text style={styles.bold}>{activeData.client.phone}</Text>
              </Text>
            ) : null}
            {activeData.staffName ? <Text>Staff: {activeData.staffName}</Text> : null}
            <Text>Payment: {activeData.invoice.paymentMethod.toUpperCase()}</Text>

            <View style={styles.dashedLine} />

            {activeData.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.bold}>{item.name}</Text>
                  <Text style={styles.subText}>
                    {item.qty} x ₹{item.price.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.bold}>₹{item.total.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.dashedLine} />

            <View style={styles.summaryRow}>
              <Text>Subtotal</Text>
              <Text>₹{activeData.pricing.subtotal.toFixed(2)}</Text>
            </View>

            {activeData.pricing.itemDiscountTotal && activeData.pricing.itemDiscountTotal > 0 ? (
              <View style={styles.summaryRow}>
                <Text>Item Discount</Text>
                <Text>- ₹{activeData.pricing.itemDiscountTotal.toFixed(2)}</Text>
              </View>
            ) : null}

            {activeData.pricing.manualDiscount && activeData.pricing.manualDiscount > 0 ? (
              <View style={styles.summaryRow}>
                <Text>Discount</Text>
                <Text>- ₹{activeData.pricing.manualDiscount.toFixed(2)}</Text>
              </View>
            ) : null}

            {activeData.pricing.couponDiscount && activeData.pricing.couponDiscount > 0 ? (
              <View style={styles.summaryRow}>
                <Text>Coupon Discount</Text>
                <Text>- ₹{activeData.pricing.couponDiscount.toFixed(2)}</Text>
              </View>
            ) : null}

            {activeData.pricing.taxableAmount && activeData.pricing.taxableAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text>Taxable Amount</Text>
                <Text>₹{activeData.pricing.taxableAmount.toFixed(2)}</Text>
              </View>
            ) : null}

            {/* Tax Breakdown or GST Amount */}
            {activeData.pricing.taxBreakdown && activeData.pricing.taxBreakdown.length > 0
              ? activeData.pricing.taxBreakdown.map((t, i) => (
                <View key={i} style={styles.summaryRow}>
                  <Text>{t.name} ({t.rate}%)</Text>
                  <Text>₹{t.amount.toFixed(2)}</Text>
                </View>
              ))
              : activeData.pricing.gstAmount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text>Tax (GST)</Text>
                  <Text>₹{activeData.pricing.gstAmount.toFixed(2)}</Text>
                </View>
              ) : null}

            {activeData.pricing.exCharges && activeData.pricing.exCharges > 0 ? (
              <View style={styles.summaryRow}>
                <Text>Extra Charges</Text>
                <Text>₹{activeData.pricing.exCharges.toFixed(2)}</Text>
              </View>
            ) : null}

            {activeData.pricing.tipAmount && activeData.pricing.tipAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text>Tip</Text>
                <Text>₹{activeData.pricing.tipAmount.toFixed(2)}</Text>
              </View>
            ) : null}

            {activeData.pricing.roundOff && Math.abs(activeData.pricing.roundOff) > 0.001 ? (
              <View style={styles.summaryRow}>
                <Text>Round Off</Text>
                <Text>
                  {activeData.pricing.roundOff > 0 ? "+" : "-"} ₹
                  {Math.abs(activeData.pricing.roundOff).toFixed(2)}
                </Text>
              </View>
            ) : null}

            <View style={styles.solidLine} />

            <View style={styles.summaryRow}>
              <Text style={styles.grandTotalText}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalText}>
                ₹{activeData.pricing.grandTotal.toFixed(2)}
              </Text>
            </View>

            <View style={styles.solidLine} />

            {activeData.paymentBreakdown?.map((entry, idx) => (
              <View key={idx} style={styles.summaryRow}>
                <Text>Paid via {entry.method}</Text>
                <Text>₹{entry.amount.toFixed(2)}</Text>
              </View>
            ))}

            {activeData.pricing.amountPaid && activeData.pricing.amountPaid > 0 ? (
              <View style={styles.summaryRow}>
                <Text>Amount Paid</Text>
                <Text>₹{activeData.pricing.amountPaid.toFixed(2)}</Text>
              </View>
            ) : null}

            {activeData.pricing.dueAmount && activeData.pricing.dueAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.bold}>Balance Due</Text>
                <Text style={styles.bold}>₹{activeData.pricing.dueAmount.toFixed(2)}</Text>
              </View>
            ) : null}

            {activeData.paymentBreakdown?.length || activeData.pricing.dueAmount ? (
              <View style={styles.dashedLine} />
            ) : null}

            {activeData.upiQrUrl ? (
              <Image source={{ uri: activeData.upiQrUrl }} style={styles.upiQrCode} />
            ) : null}
            <Text style={[styles.centerText, styles.footerText]}>
              {activeData.footerMessage || "Thank you for visiting!"}
            </Text>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { borderTopColor: Colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isActionLoading}
            onPress={handleShare}
            style={[styles.actionBtn, styles.shareBtn]}
          >
            {isActionLoading ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
            <>
              <Ionicons name="share-social-outline" size={18} color="#000" />
              <Text style={styles.actionBtnText}>Share PDF</Text>
            </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isActionLoading}
            onPress={handlePrint}
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
          >
            {isActionLoading ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="print-outline" size={18} color={Colors.onPrimary} />
                <Text style={[styles.actionBtnText, { color: Colors.onPrimary }]}>
                  Print Receipt
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  paperToggle: {
    flexDirection: "row",
    gap: 4,
  },
  paperBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paperBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  receiptPaper: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  salonName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 4,
    color: "#000",
  },
  salonLogo: {
    height: 48, // Example height, adjust as needed
    width: "100%", // Example width, adjust as needed
    resizeMode: "contain",
    marginBottom: 4,
  },
  upiQrCode: {
    height: 80, // Example size
    width: 80, // Example size
    alignSelf: "center", // Center the QR code
    marginVertical: 6,
  },
  centerText: {
    textAlign: "center",
    fontSize: 11,
    color: "#333",
  },
  bold: {
    fontWeight: "bold",
  },
  subText: {
    fontSize: 10,
    color: "#666",
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderColor: "#000",
    borderStyle: "dashed",
    marginVertical: 8,
  },
  solidLine: {
    borderBottomWidth: 2,
    borderColor: "#000",
    marginVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemLeft: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  grandTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  footerText: {
    marginTop: 8,
  },
  footer: {
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareBtn: {
    backgroundColor: "#E5E5E5",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
});
