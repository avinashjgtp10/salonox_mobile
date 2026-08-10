import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { generateReceiptHtml, type ReceiptData } from "@/utils/receiptGenerator";

export const printerService = {
  /**
   * Generates HTML and triggers native print dialog using expo-print.
   * Works across Bluetooth thermal printers, AirPrint, Wi-Fi, USB.
   */
  async printReceipt(data: ReceiptData): Promise<void> {
    const html = generateReceiptHtml(data);
    await Print.printAsync({
      html,
    });
  },

  /**
   * Generates PDF file for receipt using expo-print and shares via native share sheet.
   */
  async shareReceipt(data: ReceiptData): Promise<void> {
    const html = generateReceiptHtml(data);
    const { uri } = await Print.printToFileAsync({
      html,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Receipt - ${data.invoice.invoiceNumber}`,
      });
    } else {
      throw new Error("Sharing is not available on this device.");
    }
  },

  /**
   * Returns HTML string for rendering in WebView preview.
   */
  getReceiptHtml(data: ReceiptData): string {
    return generateReceiptHtml(data);
  },
};
