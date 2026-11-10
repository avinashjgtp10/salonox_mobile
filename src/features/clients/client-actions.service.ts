import { api } from "@/services/api";
import { CLIENT } from "@/services/api/endpoints/client.endpoints";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { fromByteArray } from "base64-js";

/** Existing web/backend routes; all requests use the app's authenticated salon context. */
export const clientActionsService = {
  async addNote(clientId: string, note: string, staffName?: string) {
    await api.post(CLIENT.NOTES(clientId), { note, ...(staffName ? { staff_name: staffName } : {}) });
  },
  async addWalletMoney(clientId: string, amount: number, paymentMethod: "upi" | "cash" | "card") {
    await api.post(`/ewallet/${encodeURIComponent(clientId)}/topup`, { amount, payment_method: paymentMethod });
  },
  async exportExcel(params: Record<string, unknown>) {
    const response = await api.get<ArrayBuffer>("/clients/export", { params: { ...params, format: "excel" }, responseType: "arraybuffer" });
    if (!FileSystem.cacheDirectory) throw new Error("File storage is unavailable.");
    const uri = `${FileSystem.cacheDirectory}clients-${Date.now()}.xlsx`;
    await FileSystem.writeAsStringAsync(uri, fromByteArray(new Uint8Array(response.data)), { encoding: FileSystem.EncodingType.Base64 });
    if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is unavailable on this device.");
    await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", UTI: "org.openxmlformats.spreadsheetml.sheet", dialogTitle: "Export to Excel" });
  },
};
