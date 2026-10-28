import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { generateReceiptHtml, type ReceiptData } from "@/utils/receiptGenerator";
import { receiptPaper } from "@/utils/receiptPaper";
import { receiptAssetUrl } from "@/utils/receiptAssets";

async function embeddedImage(value?: string): Promise<string | undefined> {
  const url = receiptAssetUrl(value);
  if (!url || url.startsWith("data:")) return url;
  let localUri = url;
  let temporaryUri: string | undefined;
  let mime = /\.jpe?g(?:\?|$)/i.test(url) ? "image/jpeg" : /\.svg(?:\?|$)/i.test(url) ? "image/svg+xml" : "image/png";
  try {
    if (!url.startsWith("file:")) {
      if (!FileSystem.cacheDirectory) throw new Error("Invoice image cache is unavailable.");
      temporaryUri = `${FileSystem.cacheDirectory}invoice-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await FileSystem.downloadAsync(url, temporaryUri);
      if (result.status !== 200) throw new Error("Unable to load the salon logo for this invoice.");
      const contentType = Object.entries(result.headers).find(([key]) => key.toLowerCase() === "content-type")?.[1]?.split(";")[0];
      if (contentType?.startsWith("image/")) mime = contentType;
      localUri = result.uri;
    }
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:${mime};base64,${base64}`;
  } finally {
    if (temporaryUri) await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
  }
}

/** An image that can't be fetched (e.g. a removed logo) is left off the invoice
 * instead of failing the whole print or share. */
const optionalEmbeddedImage = (value?: string) => embeddedImage(value).catch(() => undefined);

/** Inline images so the exported invoice retains its logo on Android and iOS. */
async function exportData(data: ReceiptData): Promise<ReceiptData> {
  const [logoUrl, upiQrUrl] = await Promise.all([optionalEmbeddedImage(data.salon.logoUrl), optionalEmbeddedImage(data.upiQrUrl)]);
  return { ...data, salon: { ...data.salon, logoUrl }, upiQrUrl };
}

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
    const { uri } = await Print.printToFileAsync(fileOptions(await exportData(data)));
    await Print.printAsync({
      uri,
    });
  },

  async shareReceipt(data: ReceiptData): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device.");
    }
    // Generate the PDF in the background; only printReceipt opens a print dialog.
    const { uri: generatedUri } = await Print.printToFileAsync(fileOptions(await exportData(data)));
    // Name the file after the invoice (not expo-print's random id) so it reads well in the chat or email.
    const invoiceName = (data.invoice.invoiceNumber || "Receipt").replace(/[^\w-]+/g, "_");
    const uri = generatedUri.replace(/[^/]+\.pdf$/i, `${invoiceName}.pdf`);
    if (uri !== generatedUri) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      await FileSystem.moveAsync({ from: generatedUri, to: uri });
    }
    await Sharing.shareAsync(uri, {
      UTI: "com.adobe.pdf",
      mimeType: "application/pdf",
      dialogTitle: `Share Receipt - ${data.invoice.invoiceNumber}`,
    });
  },

  getReceiptHtml(data: ReceiptData): string {
    return generateReceiptHtml({ ...data, salon: { ...data.salon, logoUrl: receiptAssetUrl(data.salon.logoUrl) } });
  },
};
