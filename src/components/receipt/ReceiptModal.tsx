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
  const { clientName } = useClientPrivacy();
  const Colors = useThemeColors();
  const [paperSize, setPaperSize] = useState<"A4" | "80mm" | "58mm">(receiptData.paperSize ?? "80mm");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const activeData: ReceiptData = {
    ...receiptData,
    salon: { ...receiptData.salon, logoUrl: receiptAssetUrl(receiptData.salon.logoUrl) },
    client: { ...receiptData.client, name: clientName(receiptData.client.name) },
    paperSize,
  };

  const handlePrint = async () => {
    try {
      setIsActionLoading(true);
      await printerService.printReceipt(activeData);
    } catch {
      Alert.alert("Print failed", "Could not print the invoice. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsActionLoading(true);
      await printerService.shareReceipt(activeData);
    } catch {
      Alert.alert("Share failed", "Could not share the invoice PDF. Please try again.");
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

        <View style={[styles.header, { borderBottomColor: Colors.border }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors.text }]}>Receipt Preview</Text>
          <View style={styles.paperToggle}>
            <TouchableOpacity onPress={() => setPaperSize("A4")} style={[styles.paperBadge, paperSize === "A4" && { backgroundColor: Colors.primary }]}>
              <Text style={[styles.paperBadgeText, { color: paperSize === "A4" ? Colors.onPrimary : Colors.hint }]}>A4</Text>
            </TouchableOpacity>
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


        {paperSize === "A4" ? (
          visible && <ZoomableInvoicePreview key={receiptData.invoice.invoiceNumber} data={activeData} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThermalPreview data={activeData} />
          </ScrollView>
        )}


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
              <Ionicons name="send-outline" size={18} color="#000" />
              <Text style={styles.actionBtnText}>Send Receipt</Text>
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
                  Print Invoice
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
