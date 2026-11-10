import { useRegionalPreferences } from "@/localization/preferences";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlType } from "@/components/auth/pearl/tokens";
import { Text } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Avatar, Card, IconButton, ListRow, StatusPill, Tile } from "@/components/pearl/ui";
import { formatCurrency } from "@/utils/currency";
import { formatInvoiceNumber, invoiceDateLabel } from "@/utils/receipt";
import { maskPhone } from "@/utils/maskPhone";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import type { SaleDetail } from "@/types/sales";
export function InvoiceDetailsView({ sale, onBack, onDelete, deleting }: { sale: SaleDetail; onBack: () => void; onDelete: () => void; deleting: boolean }) {
  "use no memo";
  useRegionalPreferences();
 const [actionsOpen, setActionsOpen] = useState(false);
 const { clientName } = useClientPrivacy();
 const name = clientName(sale.clientName);
 const draft = ["draft", "pending"].includes(sale.status.toLowerCase());
 const receipt = formatInvoiceNumber(sale.receiptNumber) ?? "Invoice";
 const go = (href: Href) => { setActionsOpen(false); router.push(href); };
 return <PearlBackground><SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
  <ScrollView contentContainerStyle={s.page}>
   <View style={s.header}><AppBackButton onPress={onBack} /><View style={{ flex: 1 }}><Text style={pearlType.h2}>{receipt}</Text><Text style={pearlType.small}>{invoiceDateLabel(sale)}</Text></View><IconButton icon="share" label="Share invoice" onPress={() => go({ pathname: "/quick-sale/checkout", params: { saleId: sale.id, shareReceipt: "1" } } as Href)} /><IconButton icon="more" label="Invoice actions" onPress={() => setActionsOpen(true)} /></View>
   <Card><ListRow left={<Avatar initials={name.split(/\s+/).slice(0,2).map(word => word[0]).join("")} tone="rose" size={38} />} title={name} subtitle={maskPhone(sale.clientPhone)} right={<StatusPill tone={draft ? "warning" : sale.status === "completed" ? "success" : "danger"} label={draft ? "Pending" : sale.status === "completed" ? "Paid" : sale.status} />} onPress={sale.clientId ? () => go(('/clients/' + sale.clientId) as Href) : undefined} /></Card>
   <Card>{sale.lineItems.map(item => <ListRow key={item.id} left={<Tile icon={item.itemType === "product" ? "box" : "scissors"} tone="rose" />} title={item.name} subtitle={[item.staffName, 'Qty ' + item.quantity].filter(Boolean).join(" \u00b7 ")} right={<Text style={s.price}>{formatCurrency(item.totalPrice)}</Text>} />)}{!sale.lineItems.length && <Text translate style={s.empty}>No items recorded for this invoice.</Text>}</Card>
   <Card><View style={s.kv}><Text translate style={pearlType.small}>Date</Text><Text style={s.price}>{invoiceDateLabel(sale)}</Text></View></Card>
   <Card>{[["Subtotal", formatCurrency(sale.subtotal)], ...(sale.discountAmount ? [["Discount", '- ' + formatCurrency(sale.discountAmount)]] : []), ["GST", formatCurrency(sale.taxAmount)], ["Paid by", sale.paymentMethod + (sale.paymentReference ? ' \u00b7 ' + sale.paymentReference : '')], ["Total", formatCurrency(sale.total)], ...(sale.outstandingAmount > 0 ? [["Outstanding", formatCurrency(sale.outstandingAmount)]] : [])].map(([label, value]) => <View key={label} style={s.kv}><Text translate style={label === "Total" ? s.price : pearlType.small}>{label}</Text><Text style={s.price}>{value}</Text></View>)}</Card>
   {sale.notes ? <Card padded><Text translate style={s.price}>Notes</Text><Text style={pearlType.small}>{sale.notes}</Text></Card> : null}
   <Pressable style={s.receipt} onPress={() => go({ pathname: "/quick-sale/checkout", params: { saleId: sale.id, openReceipt: "1" } } as Href)}><Text translate style={pearlType.link}>View receipt</Text></Pressable>
  </ScrollView>
  <BottomSheet pearlStyle centered={false} visible={actionsOpen} onClose={() => setActionsOpen(false)} title="Invoice actions">
   <Card><ListRow left={<Tile icon="edit" tone="lilac" />} title="Edit invoice" subtitle={draft ? undefined : "Unavailable for completed invoices"} onPress={draft ? () => go(('/quick-sale?draftId=' + sale.id) as Href) : undefined} />
    <ListRow left={<Tile icon="repeat" tone="peach" />} title="Refund" subtitle="Unavailable" />
    <ListRow left={<Tile icon="layers" tone="rose" />} title="Duplicate" subtitle="Unavailable" />
   </Card>
   <Pressable accessibilityRole="button" disabled={deleting} onPress={() => { setActionsOpen(false); onDelete(); }} style={s.danger}><Text translate style={s.dangerText}>{deleting ? "Deleting..." : "Delete invoice"}</Text></Pressable>
  </BottomSheet>
 </SafeAreaView></PearlBackground>;
}
const s=StyleSheet.create({page:{padding:18,gap:16,paddingBottom:40},header:{flexDirection:"row",gap:8,alignItems:"center"},price:{fontSize:14,fontWeight:"700",color:pearl.ink},kv:{paddingHorizontal:16,paddingVertical:13,flexDirection:"row",justifyContent:"space-between",gap:16,borderBottomWidth:1,borderBottomColor:pearl.divider},empty:{padding:16,color:pearl.muted},receipt:{padding:14,alignItems:"center",borderRadius:16,backgroundColor:pearl.glass},danger:{padding:15,marginTop:18,borderRadius:16,backgroundColor:"rgba(200,71,90,0.12)",alignItems:"center"},dangerText:{color:"#A8384A",fontSize:14,fontWeight:"700"}});
