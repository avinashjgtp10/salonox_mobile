import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { pearl, pearlType } from "@/components/auth/pearl/tokens";
import { Card, ListRow, Tile } from "@/components/pearl/ui";
import { Ionicons } from "@expo/vector-icons";
import { invoiceDateLabel } from "@/utils/receipt";
import { formatCurrency } from "@/utils/currency";
import type { SaleDetail, SaleLineItem } from "@/types/sales";
export function SaleCompleteContent({ sale, lines, total, receipt, preview, paymentMethod, clientName, staff, busy, onShare, onPrint, onInvoice, onBook }: { sale: SaleDetail; lines: SaleLineItem[]; total: number; receipt: string; preview: boolean; paymentMethod: string; clientName: string; staff: boolean; busy: boolean; onShare: () => void; onPrint: () => void; onInvoice: () => void; onBook: () => void }) {
 return <View style={{ gap: 16 }}>
  <View style={s.success}><View style={s.badge}><Ionicons name={preview ? "receipt-outline" : "checkmark"} color={pearl.accentDeep} size={38} /></View><Text style={[pearlType.h2, { textAlign: "center" }]}>{preview ? "Invoice" : formatCurrency(staff ? total : sale.amountPaid) + " collected"}</Text><Text style={[pearlType.small, { textAlign: "center" }]}>{receipt} {"\u00b7"} {paymentMethod}</Text>{clientName ? <Text style={pearlType.small}>{clientName}</Text> : null}</View>
  <View style={s.row}><Text style={pearlType.small}>Date</Text><Text style={s.price}>{invoiceDateLabel(sale)}</Text></View>
  <Card>{lines.map(item => <View style={s.row} key={item.id}><Text style={s.name}>{item.name}{item.quantity > 1 ? ' \u00d7 ' + item.quantity : ''}</Text><Text style={s.price}>{formatCurrency(item.totalPrice)}</Text></View>)}{sale.outstandingAmount > 0 && !staff ? <View style={s.row}><Text style={pearlType.small}>Outstanding</Text><Text style={s.price}>{formatCurrency(sale.outstandingAmount)}</Text></View> : null}</Card>
  {!staff ? <><View style={s.actions}><Pressable disabled={busy} onPress={onShare} style={s.action}><Ionicons name="share-outline" size={18} color={pearl.accentDeep} /><Text style={pearlType.link}>Share</Text></Pressable><Pressable disabled={busy} onPress={onPrint} style={s.action}><Ionicons name="print-outline" size={18} color={pearl.accentDeep} /><Text style={pearlType.link}>Print</Text></Pressable></View>
   <Card><ListRow left={<Tile icon="calendar" tone="lilac" size={36} />} title="Book next visit" subtitle="Schedule the next appointment" onPress={onBook} chevron /></Card>
   <Pressable onPress={onInvoice} style={{ alignItems: "center", padding: 8 }}><Text style={pearlType.link}>View invoice</Text></Pressable></> : null}
 </View>;
}
const s=StyleSheet.create({success:{alignItems:"center",gap:10,paddingVertical:24},badge:{height:82,width:82,borderRadius:41,backgroundColor:pearl.glass,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:pearl.glassBorder,marginBottom:8},row:{flexDirection:"row",alignItems:"center",gap:12,justifyContent:"space-between",padding:16,borderBottomWidth:1,borderBottomColor:pearl.divider},name:{flex:1,fontSize:14,color:pearl.ink,fontWeight:"600"},price:{fontSize:14,color:pearl.ink,fontWeight:"700"},actions:{flexDirection:"row",gap:8},action:{flex:1,flexDirection:"row",gap:8,justifyContent:"center",alignItems:"center",minHeight:48,borderRadius:16,backgroundColor:pearl.glass,borderWidth:1,borderColor:pearl.glassBorder}});
