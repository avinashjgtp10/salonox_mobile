import { useRegionalPreferences } from "@/localization/preferences";
import { pearl } from "@/components/auth/pearl/tokens";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { getApiErrorMessage } from "@/services/api";
import { formatCurrency, currencyLabel } from "@/utils/currency";
import { clientActionsService } from "../client-actions.service";
import { ClientButton, ClientChips, clientUi } from "./ClientPearl";

export function ClientEntrySheets({ clientId, walletBalance, kind, onClose, onSaved, staffName }: { clientId: string; walletBalance: number; kind: "wallet" | "note" | null; onClose: () => void; onSaved: (kind: "wallet" | "note") => void; staffName?: string }) {
  "use no memo";
  useRegionalPreferences();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (kind) { setAmount(""); setMethod("UPI"); setNote(""); setError(""); } }, [kind]);
  const save = async () => {
    if (!kind || saving) return;
    const value = Number(amount.replace(/,/g, ""));
    if (kind === "wallet" && (!/^\d+(\.\d{1,2})?$/.test(amount.replace(/,/g, "")) || value < 100 || value > 50000)) { setError(currencyLabel("Enter an amount between ₹100 and ₹50,000.")); return; }
    if (kind === "note" && (note.trim().length < 3 || note.trim().length > 500)) { setError("Enter a note between 3 and 500 characters."); return; }
    setSaving(true); setError("");
    try {
      if (kind === "wallet") await clientActionsService.addWalletMoney(clientId, value, method.toLowerCase() as "upi" | "cash" | "card");
      else await clientActionsService.addNote(clientId, note.trim(), staffName);
      onSaved(kind); onClose();
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setSaving(false); }
  };
  return <BottomSheet pearlStyle centered={false} avoidKeyboard title={kind === "wallet" ? "Add to wallet" : "New note"} visible={!!kind} onClose={() => { if (!saving) onClose(); }}>
    <View style={{ gap: 16 }}>
      {kind === "wallet" ? <>
        <View><Text translate style={clientUi.label}>Amount to add *</Text><TextInput placeholderTextColor={pearl.placeholder} accessibilityLabel="Amount to add" editable={!saving} keyboardType="decimal-pad" placeholder={currencyLabel("₹0")} value={amount} onChangeText={setAmount} style={clientUi.input} /><Text style={clientUi.muted}>{currencyLabel("Between ₹100 and ₹50,000 · current balance ")}{formatCurrency(walletBalance)}</Text></View>
        <ClientChips options={[currencyLabel("₹500"), currencyLabel("₹1,000"), currencyLabel("₹2,000"), currencyLabel("₹5,000")]} selected={amount ? `${currencyLabel("\u20b9")}${Number(amount.replace(/,/g, "")).toLocaleString("en-IN")}` : ""} onSelect={(value) => { if (!saving) setAmount(value.replace(/[^\d]/g, "")); }} />
        <View><Text translate style={clientUi.label}>Paid by</Text><ClientChips options={["UPI", "Cash", "Card"]} selected={method} onSelect={(value) => { if (!saving) setMethod(value); }} /></View>
      </> : <View><Text translate style={clientUi.label}>Note *</Text><TextInput placeholderTextColor={pearl.placeholder} accessibilityLabel="Note" editable={!saving} maxLength={500} multiline placeholder="e.g. Allergic to ammonia-based colour…" value={note} onChangeText={setNote} style={[clientUi.input, { minHeight: 110, textAlignVertical: "top" }]} /><Text style={[clientUi.muted, { textAlign: "right" }]}>{note.length} / 500</Text></View>}
      {error ? <Text translate accessibilityRole="alert" style={clientUi.error}>{error}</Text> : null}
      <ClientButton label={saving ? "Saving…" : kind === "wallet" ? "Add to wallet" : "Save note"} loading={saving} onPress={() => void save()} />
    </View>
  </BottomSheet>;
}
