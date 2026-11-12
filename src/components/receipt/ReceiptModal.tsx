import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { ThermalPreview } from "./ThermalPreview";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ZoomableInvoicePreview } from "./ZoomableInvoicePreview";
import { SafeAreaView } from "react-native-safe-area-context";
import { printerService } from "@/services/printer.service";
import type { ReceiptData } from "@/utils/receiptGenerator";
import { receiptAssetUrl } from "@/utils/receiptAssets";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearlGradients } from "@/components/auth/pearl/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { AppStatusBar } from "@/components/ui/AppStatusBar";

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
  const { clientName } = useClientPrivacy();
  const Colors = usePearlColors();
  const [paperSize, setPaperSize] = useState<"A4" | "80mm" | "58mm">(receiptData.paperSize ?? "80mm");
  // Only the tapped button shows a spinner; the other is just disabled meanwhile.
  const [activeAction, setActiveAction] = useState<"print" | "share" | null>(null);
  const isActionLoading = activeAction !== null;

  const activeData: ReceiptData = {
    ...receiptData,
    salon: { ...receiptData.salon, logoUrl: receiptAssetUrl(receiptData.salon.logoUrl) },
    client: { ...receiptData.client, name: clientName(receiptData.client.name) },
    paperSize,
  };

  const handlePrint = async () => {
    if (activeAction) return;
    try {
      setActiveAction("print");
      await printerService.printReceipt(activeData);
    } catch {
      Alert.alert("Print failed", "Could not print the invoice. Please try again.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleShare = async () => {
    if (activeAction) return;
    try {
      setActiveAction("share");
      await printerService.shareReceipt(activeData);
    } catch {
      Alert.alert("Share failed", "Could not share the invoice PDF. Please try again.");
    } finally {
      setActiveAction(null);
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
      <PearlBackground>
      <SafeAreaView style={styles.container}>
        <AppStatusBar />

        <View style={[styles.header, { borderBottomColor: Colors.border }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close receipt preview" activeOpacity={0.7} onPress={onClose} style={[styles.closeBtn, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text translate style={[styles.title, { color: Colors.text }]}>Receipt Preview</Text>
        </View>
          <View accessibilityRole="tablist" style={[styles.paperToggle, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: paperSize === "A4" }} onPress={() => setPaperSize("A4")} style={[styles.paperBadge, paperSize === "A4" && { backgroundColor: Colors.primary }]}>
              <Text translate style={[styles.paperBadgeText, { color: paperSize === "A4" ? Colors.onPrimary : Colors.text2 }]}>A4</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="tab" accessibilityState={{ selected: paperSize === "80mm" }}
              onPress={() => setPaperSize("80mm")}
              style={[
                styles.paperBadge,
                paperSize === "80mm" && { backgroundColor: Colors.primary },
              ]}
            >
              <Text translate
                style={[
                  styles.paperBadgeText,
                  { color: paperSize === "80mm" ? Colors.onPrimary : Colors.text2 },
                ]}
              >
                80mm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="tab" accessibilityState={{ selected: paperSize === "58mm" }}
              onPress={() => setPaperSize("58mm")}
              style={[
                styles.paperBadge,
                paperSize === "58mm" && { backgroundColor: Colors.primary },
              ]}
            >
              <Text translate
                style={[
                  styles.paperBadgeText,
                  { color: paperSize === "58mm" ? Colors.onPrimary : Colors.text2 },
                ]}
              >
                58mm
              </Text>
            </TouchableOpacity>
          </View>


        {paperSize === "A4" ? (
          visible && <ZoomableInvoicePreview key={receiptData.invoice.invoiceNumber} data={activeData} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThermalPreview data={activeData} />
          </ScrollView>
        )}


        <View style={[styles.footer, { borderTopColor: Colors.border, backgroundColor: Colors.card }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={handleShare}
            style={[styles.actionBtn, { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }, isActionLoading && activeAction !== "share" && styles.actionBtnIdle]}
          >
            {activeAction === "share" ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
            <>
              <Ionicons name="send-outline" size={18} color={Colors.primaryText} />
              <Text translate style={[styles.actionBtnText, { color: Colors.primaryText }]}>Send Receipt</Text>
            </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            disabled={isActionLoading}
            onPress={handlePrint}
            style={[styles.actionBtn, { backgroundColor: Colors.primary }, isActionLoading && activeAction !== "print" && styles.actionBtnIdle]}
          >
            <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            {activeAction === "print" ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="print-outline" size={18} color={Colors.onPrimary} />
                <Text translate style={[styles.actionBtnText, { color: Colors.onPrimary }]}>
                  Print Invoice
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </PearlBackground>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionBtnIdle: { opacity: 0.5 },
  container: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "bold",
  },
  paperToggle: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderWidth: 1,
    borderRadius: 18,
  },
  paperBadge: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  paperBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footer: {
    padding: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    flexShrink: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
});
