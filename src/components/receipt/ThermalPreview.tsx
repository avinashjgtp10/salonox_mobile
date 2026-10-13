import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { ReceiptData } from "@/utils/receiptGenerator";
import { invoiceMoney, invoiceSummary } from "@/utils/invoiceDocument";

export function ThermalPreview({ data }: { data: ReceiptData }) {
  const rows = invoiceSummary(data);
  const totalIndex = rows.findIndex(row => row.label === "Grand Total");
  const pair = (label: string, value: string, bold = false, key = label) => <View key={key} style={styles.row}><Text style={[styles.text, styles.label, bold && styles.bold]}>{label}</Text><Text style={[styles.text, bold && styles.bold]}>{value}</Text></View>;
  return <View style={[styles.paper, { width: data.paperSize === "58mm" ? 260 : 320 }]}>
    {data.salon.logoUrl ? <Image source={{ uri: data.salon.logoUrl }} style={styles.logo} /> : null}
    <Text style={styles.name}>{data.salon.name}</Text>
    {[ [data.salon.address, data.salon.city, data.salon.state, data.salon.postalCode, data.salon.country].filter(Boolean).join(", "), data.salon.phone && `Ph: ${data.salon.phone}`, data.salon.gstin && `GSTIN: ${data.salon.gstin}`].filter(Boolean).map((line, i) => <Text key={i} style={styles.center}>{line}</Text>)}
    <View style={styles.rule} />
    {pair("Invoice", data.invoice.invoiceNumber)}{pair("Date", `${data.invoice.date} ${data.invoice.time}`)}{pair("Client", data.client.name)}{data.client.phone ? pair("Phone", data.client.phone) : null}{data.staffName ? pair("Staff", data.staffName) : null}{pair("Payment Method", data.invoice.paymentMethod)}
    <View style={styles.rule} />
    <View style={styles.row}><Text style={[styles.text, styles.label, styles.bold]}>ITEM</Text><Text style={[styles.text, styles.qty, styles.bold]}>QTY</Text><Text style={[styles.text, styles.amount, styles.bold]}>AMOUNT</Text></View>
    {data.items.map((item, i) => <View key={i} style={styles.row}><View style={styles.label}><Text style={styles.text}>{item.name}</Text><Text style={styles.small}>{[item.type, item.staffName].filter(Boolean).join(" · ")}</Text></View><Text style={[styles.text, styles.qty]}>{item.qty}</Text><Text style={[styles.text, styles.amount]}>{invoiceMoney(item.total)}</Text></View>)}
    <View style={styles.rule} />
    {rows.slice(0, totalIndex).map((row, i) => pair(row.label, row.value, row.bold, `sum-${i}`))}
    <View style={styles.rule} />{pair("TOTAL", invoiceMoney(data.pricing.grandTotal), true)}<View style={styles.rule} />
    {rows.slice(totalIndex + 2).map((row, i) => pair(row.label, row.value, row.bold, `pay-${i}`))}
    {data.upiQrUrl ? <Image source={{ uri: data.upiQrUrl }} style={styles.logo} /> : null}
    <Text style={[styles.center, { marginTop: 12 }]}>{data.footerMessage || "Thank You!"}</Text>
  </View>;
}
const styles = StyleSheet.create({
  paper: { backgroundColor: "#fff", padding: 16 }, name: { fontSize: 16, fontWeight: "800", textAlign: "center", color: "#000" },
  logo: { width: 60, height: 60, resizeMode: "contain", alignSelf: "center", marginBottom: 4 },
  center: { textAlign: "center", fontSize: 10, color: "#000", lineHeight: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 6, marginVertical: 3 },
  text: { fontSize: 11, color: "#000" }, label: { flex: 1 }, qty: { width: 28, textAlign: "center" }, amount: { width: 76, textAlign: "right" },
  small: { fontSize: 9, color: "#000" }, bold: { fontWeight: "700" }, rule: { borderTopWidth: 1, borderStyle: "dashed", borderColor: "#000", marginVertical: 6 },
});
