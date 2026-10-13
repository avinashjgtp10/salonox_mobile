import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { generateReceiptHtml, type ReceiptData } from "@/utils/receiptGenerator";
import { receiptPaper } from "@/utils/receiptPaper";

function fileOptions(data: ReceiptData) {
  const profile = receiptPaper(data.paperSize);
  return {
    html: generateReceiptHtml(data),
    width: profile.widthMm * 72 / 25.4,
    height: (profile.heightMm || 297) * 72 / 25.4,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  };
}

export const printerService = {
  async printReceipt(data: ReceiptData): Promise<void> {
    const { uri } = await Print.printToFileAsync(fileOptions(data));
    await Print.printAsync({
      uri,
    });
  },

  async shareReceipt(data: ReceiptData): Promise<void> {
    const { uri } = await Print.printToFileAsync(fileOptions(data));

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

  getReceiptHtml(data: ReceiptData): string {
    return generateReceiptHtml(data);
  },
};
