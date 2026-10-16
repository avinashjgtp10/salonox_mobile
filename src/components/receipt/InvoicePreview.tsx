import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { ReceiptData } from "@/utils/receiptGenerator";
import { invoiceMoney, invoiceRowStaff, invoiceStatus, invoiceSummary } from "@/utils/invoiceDocument";

/** Scrollable A4 companion to the web invoice used by print and share. */
export function InvoicePreview({ data }: { data: ReceiptData }) {
  const field = (label: string, value?: string) => <View key={label} style={styles.field}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value || "—"}</Text></View>;
  const columns = [28, 204, 66, 66, 66, 28, 70, 64, 64, 74];
  const cell = (value: string | number, index: number, header = false) => <Text key={index} style={[styles.cell, { width: columns[index], textAlign: index >= 6 ? "right" : index === 1 ? "left" : "center" }, header && styles.columnHeader]}>{value}</Text>;
  return <View style={styles.page}>
    <View pointerEvents="none" style={styles.watermark}><Text style={styles.watermarkText}>{data.salon.name}</Text></View>
    <View style={styles.top}>
      <View style={styles.salonBlock}>
        {data.salon.logoUrl ? <Image source={{ uri: data.salon.logoUrl }} style={styles.logo} /> : <View style={[styles.logo, styles.placeholder]}><Text style={styles.initial}>{data.salon.name.charAt(0).toUpperCase()}</Text></View>}
        <View style={{ flex: 1 }}><Text style={styles.salonName}>{data.salon.name}</Text>
          {[ [data.salon.address, data.salon.city, data.salon.state, data.salon.postalCode, data.salon.country].filter(Boolean).join(", "), data.salon.phone && `Ph: ${data.salon.phone}`, data.salon.email, data.salon.website, data.salon.gstin && `GSTIN: ${data.salon.gstin}`].filter(Boolean).map((line, i) => <Text key={i} style={styles.meta}>{line}</Text>)}
        </View>
      </View>
      <View style={styles.titleBlock}><Text style={styles.title}>INVOICE</Text><Text style={styles.meta}>Invoice No: {data.invoice.invoiceNumber}</Text><Text style={styles.meta}>Invoice Date: {data.invoice.date}</Text><Text style={styles.value}>{invoiceStatus(data)}</Text></View>
    </View>
    <View style={styles.info}>
      <View style={styles.infoCol}><Text style={styles.section}>BILL TO</Text>{field("Name", data.client.name)}{field("Phone", data.client.phone)}{field("Email", data.client.email)}</View>
      <View style={[styles.infoCol, styles.infoRight]}><Text style={styles.section}>APPOINTMENT DETAILS</Text>{field("Date", data.invoice.date)}{field("Time", data.invoice.time)}{field("Staff", data.staffName)}{field("Payment Method", data.invoice.paymentMethod)}{field("Payment Status", invoiceStatus(data))}</View>
    </View>
    <View style={styles.items}><Text style={styles.section}>SERVICES &amp; ITEMS</Text><View style={styles.row}>{["#", "Item Name", "Type", "Staff", "Time", "Qty", "Rate", "Disc.", "Tax", "Amount"].map((value, i) => cell(value, i, true))}</View>
      {data.items.map((item, i) => <View key={i} style={[styles.row, i % 2 === 1 && styles.alternate]}>{[i + 1, item.name, item.type || "—", invoiceRowStaff(data, item), data.invoice.time, item.qty, invoiceMoney(item.price), invoiceMoney(item.discount ?? 0), item.tax === undefined ? "—" : invoiceMoney(item.tax), invoiceMoney(item.total)].map((value, index) => cell(value, index))}</View>)}
      <Text style={styles.itemsTotal}>Items Total    {invoiceMoney(data.items.reduce((sum, item) => sum + item.total, 0))}</Text>
    </View>
    <View style={styles.bottom}><View style={styles.notes}>{data.notes ? <><Text style={styles.section}>NOTES</Text><Text style={styles.value}>{data.notes}</Text></> : null}</View><View style={styles.summary}><Text style={styles.section}>PAYMENT SUMMARY</Text>{invoiceSummary(data).map((row, i) => <View key={i} style={styles.summaryRow}><Text style={[styles.summaryLabel, row.bold && styles.bold]}>{row.label}</Text><Text style={[styles.value, row.bold && styles.bold]}>{row.value}</Text></View>)}</View></View>
    <View style={styles.footer}><View><Text style={styles.bold}>Thank you for choosing {data.salon.name}!</Text><Text style={styles.meta}>We look forward to seeing you again.</Text></View><Text style={[styles.meta, { textAlign: "right" }]}>This is a computer-generated receipt.{"\n"}No signature required.{"\n"}Powered by SalonoX</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  page: { width: 794, minHeight: 1122, backgroundColor: "#fff" },
  watermark: { position: "absolute", top: "45%", left: 0, right: 0, alignItems: "center", transform: [{ rotate: "-30deg" }], zIndex: 1 },
  watermarkText: { fontSize: 52, fontWeight: "800", color: "rgba(107,114,128,0.14)", letterSpacing: 2 },
  top: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 20, borderBottomWidth: 2, borderColor: "#111827", flexDirection: "row", justifyContent: "space-between", gap: 20 },
  salonBlock: { flexDirection: "row", gap: 14, width: 430 },
  logo: { width: 68, height: 68, borderRadius: 8, resizeMode: "contain" },
  placeholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 26, fontWeight: "800", color: "#374151" },
  salonName: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 4 },
  meta: { fontSize: 10.5, color: "#6b7280", lineHeight: 19 },
  titleBlock: { alignItems: "flex-end", flex: 1 }, title: { fontSize: 26, fontWeight: "800", color: "#111827", letterSpacing: 2, marginBottom: 10 },
  info: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e5e7eb" },
  infoCol: { width: "50%", paddingVertical: 16, paddingHorizontal: 32 }, infoRight: { borderLeftWidth: 1, borderColor: "#e5e7eb" },
  section: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: "#111827", marginBottom: 12 },
  field: { marginBottom: 10 }, label: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", color: "#6b7280", marginBottom: 2 }, value: { fontSize: 12, color: "#111827", lineHeight: 17 },
  items: { marginHorizontal: 32, marginTop: 18, marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "stretch" }, alternate: { backgroundColor: "#f9fafb" },
  cell: { padding: 6, fontSize: 10, color: "#111827", borderWidth: 0.5, borderColor: "#e5e7eb" }, columnHeader: { backgroundColor: "#f9fafb", fontWeight: "700" },
  itemsTotal: { fontSize: 11.5, fontWeight: "700", textAlign: "right", padding: 8, color: "#111827", backgroundColor: "#f9fafb" },
  bottom: { flexDirection: "row", gap: 32, paddingHorizontal: 32, paddingBottom: 24 }, notes: { flex: 1 }, summary: { width: 260 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, padding: 8, borderWidth: 0.5, borderColor: "#e5e7eb" }, summaryLabel: { flex: 1, fontSize: 12, color: "#111827" }, bold: { fontWeight: "700", color: "#111827" },
  footer: { marginTop: "auto", borderTopWidth: 2, borderColor: "#111827", padding: 24, flexDirection: "row", justifyContent: "space-between", gap: 16 },
});
