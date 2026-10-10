import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { KeyboardAwareForm, type KeyboardAwareFormHandle } from "@/components/ui/KeyboardAwareForm";
import { StaffPickerSheet } from "./StaffPickerSheet";
import type { CheckoutSheetProps } from "./checkout/types";
import type { useCart } from "../hooks/useCart";
import { useBenefitCards } from "../hooks/useBenefitCards";
import { getPackageCoveredQuantity } from "../utils/packageCoverage";
import { buildPricingLine } from "../utils/calculations";
import { formatCurrency, parseAmount } from "../utils/money";
import type { CatalogTab } from "../constants";
import { maskPhone } from "@/utils/maskPhone";

// Visual tokens from the supplied Quick Sale reference.
const c = { bg: "#FAF6F8", card: "#FFFFFF", line: "#E9DFE5", fg: "#1D1520", muted: "#6F6574", plum: "#A3467F", soft: "#F3E6EE" };
const types: Record<string, { label: string; color: string; bg: string }> = {
  service: { label: "Service", color: "#6D4DE0", bg: "#ECE9FB" },
  product: { label: "Product", color: "#2F64E6", bg: "#E3ECFF" },
  package: { label: "Package", color: "#B87A00", bg: "#FDF0C8" },
  membership: { label: "Membership", color: "#178A5C", bg: "#DFF4EA" },
};
type Props = Pick<CheckoutSheetProps, "selectedClient" | "redemptions" | "totals" | "staffOptions" | "tipInput" | "onChangeTip" | "extraCharges" | "onChangeExtraCharge" | "overallDiscountInput" | "overallDiscountType" | "overallDiscountPercent" | "onChangeOverallDiscount" | "onChangeCustomer" | "onSetQuantity" | "onRemoveItem" | "productStockErrors" | "renderInline"> & {
  cart: ReturnType<typeof useCart>;
  notes: string;
  onChangeNotes: (value: string) => void;
  onAdd: (tab: CatalogTab) => void;
  onMoreCharges: () => void;
  packageBanner?: ReactNode;
  pricingError?: string | null;
  isPricingLoading?: boolean;
};

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return <View style={s.section}><View style={s.row}><Text style={s.title}>{title}</Text>{aside}</View>{children}</View>;
}

export function QuickSaleForm(p: Props) {
  const { clientName } = useClientPrivacy();
  const form = useRef<KeyboardAwareFormHandle>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [staffLine, setStaffLine] = useState<string | null>(null);
  const benefits = useBenefitCards(p);
  // Both fields are persisted in the existing sale notes field, including drafts.
  const parts = /^Staff alert:\n([\s\S]*?)\n\nNotes:(?:\n([\s\S]*))?$/.exec(p.notes);
  const alert = parts?.[1] ?? "";
  const notes = parts ? parts[2] ?? "" : p.notes;
  const changeNotes = (nextAlert: string, nextNotes: string) => p.onChangeNotes(nextAlert ? `Staff alert:\n${nextAlert}\n\nNotes:\n${nextNotes}` : nextNotes);
  const missingStaff = p.cart.items.some(item => item.itemType === "service" && !item.staffId);
  const field = (label: string, value: string, onChange: (value: string) => void, numeric = false, multiline = false) => (
    <FormField key={label} label={label} value={value} onChange={onChange} numeric={numeric} multiline={multiline} reveal={node => form.current?.revealField(node)} />
  );
  return <>
    <KeyboardAwareForm ref={form}>
      <View style={s.page}>
        <Section title="Client">
          <View style={s.row}>
            <View style={s.avatar}><Text style={s.avatarText}>{p.selectedClient.initials}</Text></View>
            <View style={s.flex}><Text style={s.name}>{clientName(p.selectedClient.name)}</Text><Text style={s.muted}>{maskPhone(p.selectedClient.phone)}</Text></View>
            <Pressable accessibilityRole="button" onPress={p.onChangeCustomer}><Text style={s.link}>Change</Text></Pressable>
          </View>
          {p.selectedClient.id ? <View style={s.row}>
            {[['Wallet', formatCurrency(p.redemptions.eWalletBalance)], ['Points', String(p.redemptions.rewardPointsBalance)], ['Membership', p.selectedClient.membership || 'None']].map(([label, value]) => <View style={s.stat} key={label}><Text style={s.muted}>{label}</Text><Text style={s.statValue}>{value}</Text></View>)}
          </View> : null}
        </Section>
        <Section title="Services & items" aside={<Text style={s.muted}>{p.cart.itemCount} items</Text>}>
          {missingStaff ? <Text style={s.warning}>Choose a staff member for each service to continue.</Text> : null}
          {!p.cart.items.length ? <View style={s.empty}><Ionicons name="bag-outline" size={26} color={c.plum}/><Text style={s.name}>No items added yet</Text><Text style={s.muted}>Add a service, product, package or membership.</Text></View> : null}
          {p.cart.items.map(item => {
            const type = types[item.itemType] ?? types.service;
            return <View key={item.lineId} style={s.lineCard}>
              <View style={[s.lineTop, { backgroundColor: type.bg }]}><Text style={[s.tag, {color: type.color}]}>{type.label}</Text><Pressable accessibilityLabel={`Remove ${item.name}`} onPress={() => p.onRemoveItem(item.lineId)} hitSlop={10}><Ionicons name="close" size={20} color="#E5484D"/></Pressable></View>
              <View style={s.lineBody}><Text style={s.name}>{item.name}</Text><Pressable onPress={() => setStaffLine(item.lineId)}><Text style={[s.muted, item.itemType === "service" && !item.staffId && s.link]}>{item.staffName || 'Choose staff'}{item.duration ? ` · ${item.duration}` : ''} · {formatCurrency(item.unitPrice)}{item.quantity > 1 ? ' each' : ''}</Text></Pressable>
                {getPackageCoveredQuantity(item) > 0 ? <Text style={s.link}>Package coverage applied</Text> : null}
                <View style={s.row}>
                  <View style={s.stepper}><Pressable accessibilityLabel={`Decrease ${item.name}`} style={s.step} onPress={() => item.quantity === 1 ? p.onRemoveItem(item.lineId) : p.onSetQuantity(item.lineId, item.quantity - 1)}><Text style={s.name}>−</Text></Pressable><Text style={s.name}>{item.quantity}</Text><Pressable accessibilityLabel={`Increase ${item.name}`} style={s.step} onPress={() => p.onSetQuantity(item.lineId, item.quantity + 1)}><Text style={s.name}>+</Text></Pressable></View>
                  <Pressable onPress={() => setEditing(editing === item.lineId ? null : item.lineId)}><Text style={s.link}>{editing === item.lineId ? 'Done' : 'Edit'}</Text></Pressable>
                  <Text style={s.total}>{formatCurrency(buildPricingLine(item).total ?? 0)}</Text>
                </View>
                {p.productStockErrors[item.lineId] ? <Text style={s.error}>{p.productStockErrors[item.lineId]}</Text> : null}
                {editing === item.lineId ? <View style={s.editor}>
                  <Pressable onPress={() => setStaffLine(item.lineId)} style={s.input}><Text style={s.muted}>Staff</Text><Text style={s.name}>{item.staffName || 'Choose staff'}</Text></Pressable>
                  <View style={s.row}>{field('Price (₹)', String(item.unitPrice), value => p.cart.setPrice(item.lineId, parseAmount(value)), true)}{field('Discount (₹)', String(item.discountAmount), value => p.cart.setDiscount(item.lineId, parseAmount(value)), true)}</View>
                </View> : null}
              </View>
            </View>;
          })}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.addRow}>
            {([['services', 'Service'], ['products', 'Product'], ['packages', 'Package'], ['membership', 'Membership']] as const).map(([tab, label]) => <Pressable key={tab} accessibilityRole="button" onPress={() => p.onAdd(tab)} style={s.add}><Text style={s.addText}>+ {label}</Text></Pressable>)}
          </ScrollView>
          {p.packageBanner}
        </Section>
        <Section title="Available benefits">
          {!p.selectedClient.id ? <Text style={s.hint}>Choose a client to see their benefits.</Text> : p.redemptions.isLoadingBalances ? <Text style={s.hint}>Loading benefits…</Text> : p.redemptions.balancesError ? <Pressable onPress={() => void p.redemptions.refreshBalances()}><Text style={s.error}>{p.redemptions.balancesError} Tap to retry.</Text></Pressable> : !benefits.length ? <Text style={s.hint}>No available benefits for this client.</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.addRow}>
            {benefits.map(b => <View key={b.key} style={[s.benefit, b.checked && s.benefitOn]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{checked:b.checked}} onPress={() => b.onToggle(!b.checked)} style={s.benefitCopy}><View style={s.row}><View style={s.benefitIcon}><Ionicons name={b.icon} size={20} color={c.plum}/></View><Ionicons name={b.checked ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={c.plum}/></View><Text style={s.name}>{b.title}</Text><Text style={s.link}>{b.value}</Text><Text style={s.muted}>{b.subtitle}</Text></Pressable>
              {b.checked && b.input ? field(b.input.suffix === 'pts' ? 'Points to use' : 'Amount to use', b.input.value, b.input.onChangeText, true) : null}
              {b.note ? <Text style={s.error}>{b.note}</Text> : null}
            </View>)}
          </ScrollView>}
        </Section>
        <Section title="Charges & discounts">
          {p.pricingError ? <Text style={s.error}>{p.pricingError}</Text> : p.isPricingLoading ? <Text style={s.muted}>Updating total…</Text> : null}
          <View style={s.row}>{field('Tip (₹)', p.tipInput, p.onChangeTip, true)}{field('Extra charges (₹)', p.extraCharges.otherCharges, value => p.onChangeExtraCharge('otherCharges', value), true)}</View>
          <View style={s.row}>{field(p.overallDiscountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)', p.overallDiscountType === 'percentage' ? String(p.overallDiscountPercent || '') : p.overallDiscountInput, value => {
            const percent = parseAmount(value);
            const amount = p.overallDiscountType === 'percentage' ? String(Math.round((p.totals.discountBase ?? p.totals.subtotal) * percent) / 100) : value;
            p.onChangeOverallDiscount(amount, p.overallDiscountType, p.overallDiscountType === 'percentage' ? percent : 0);
          }, true)}<View style={s.mode}>{(['percentage', 'flat'] as const).map(mode => <Pressable key={mode} style={[s.modeButton, mode === p.overallDiscountType && s.modeActive]} onPress={() => p.onChangeOverallDiscount('', mode, 0)}><Text style={[s.link, mode === p.overallDiscountType && s.white]}>{mode === 'percentage' ? '%' : '₹'}</Text></Pressable>)}</View></View>
          {p.overallDiscountType === 'percentage' && p.overallDiscountPercent > 100 ? <Text style={s.error}>Discount cannot exceed 100%.</Text> : null}
          <Pressable onPress={p.onMoreCharges}><Text style={s.link}>Coupon, GST & advanced charges →</Text></Pressable>
          {parseAmount(p.extraCharges.serviceCharge) + parseAmount(p.extraCharges.convenienceFee) > 0 ? <Text style={s.muted}>Additional charges: {formatCurrency(parseAmount(p.extraCharges.serviceCharge) + parseAmount(p.extraCharges.convenienceFee))}</Text> : null}
        </Section>
        <Section title="Staff alert & notes">
          {field('Staff alert', alert, value => changeNotes(value, notes), false, true)}
          {field('Notes', notes, value => changeNotes(alert, value), false, true)}
        </Section>
      </View>
    </KeyboardAwareForm>
    <StaffPickerSheet visible={Boolean(staffLine)} renderInline={p.renderInline} staff={p.staffOptions} selectedStaffId={p.cart.items.find(item => item.lineId === staffLine)?.staffId ?? null} onClose={() => setStaffLine(null)} onSelect={id => { const staff = p.staffOptions.find(item => item.id === id); if(staffLine) p.cart.setStaff(staffLine, staff?.id ?? null, staff?.name ?? null); setStaffLine(null); }}/>
  </>;
}

function FormField({ label, value, onChange, numeric, multiline, reveal }: { label: string; value: string; onChange: (value: string) => void; numeric: boolean; multiline: boolean; reveal: (node: View | null) => void }) {
  const ref = useRef<View>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!focused) setDraft(value); }, [focused, value]);
  return <View ref={ref} collapsable={false} style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={focused ? draft : value} onChangeText={next => {
    if (numeric && !/^\d*(\.\d{0,2})?$/.test(next)) return;
    setDraft(next); onChange(next);
  }} onFocus={() => { setDraft(value); setFocused(true); reveal(ref.current); }} onBlur={() => setFocused(false)} placeholder={numeric ? '0' : `Add ${label.toLowerCase()}…`} placeholderTextColor={c.muted} keyboardType={numeric ? 'decimal-pad' : 'default'} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[s.input, multiline && s.multiline]}/></View>;
}

const s = StyleSheet.create({
  page: { padding:16, paddingBottom:130, gap:14, backgroundColor:c.bg },
  section: { backgroundColor:c.card, borderWidth:1, borderColor:c.line, borderRadius:20, padding:14, gap:12 },
  row: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:10 },
  title: { color:c.fg, fontSize:16, fontWeight:'700', flex:1 }, flex:{flex:1},
  name:{color:c.fg,fontSize:16,fontWeight:'700'}, muted:{color:c.muted,fontSize:12.5,lineHeight:18},
  link:{color:c.plum,fontSize:13,fontWeight:'700'}, avatar:{width:46,height:46,borderRadius:23,backgroundColor:c.soft,alignItems:'center',justifyContent:'center'}, avatarText:{color:c.plum,fontSize:17,fontWeight:'700'},
  stat:{flex:1,backgroundColor:c.bg,borderRadius:12,padding:8,alignItems:'center'},statValue:{color:c.fg,fontWeight:'700',fontSize:13},
  empty:{borderWidth:1,borderStyle:'dashed',borderColor:c.line,borderRadius:14,padding:22,gap:8,alignItems:'center'},
  warning:{backgroundColor:'#FFF4D6',color:'#8A5A00',padding:12,borderRadius:12,fontSize:13},error:{color:'#E5484D',fontSize:12},
  lineCard:{borderWidth:1.5,borderColor:c.line,borderRadius:16,overflow:'hidden'},lineTop:{height:40,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},tag:{fontSize:11,fontWeight:'700',letterSpacing:0.7,textTransform:'uppercase'},
  lineBody:{padding:12,gap:8},stepper:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:c.line,borderRadius:10,gap:8},step:{padding:8},total:{fontSize:17,fontWeight:'700',color:c.fg},editor:{gap:10,borderTopWidth:1,borderColor:c.line,paddingTop:12},
  addRow:{gap:8,paddingVertical:2},add:{backgroundColor:c.fg,borderRadius:999,paddingHorizontal:14,paddingVertical:11},addText:{fontSize:12,fontWeight:'700',color:'white'},
  hint:{backgroundColor:c.bg,borderRadius:12,padding:12,color:c.muted,fontSize:13},benefit:{width:178,borderWidth:1.5,borderColor:c.line,borderRadius:16,padding:12,gap:8},benefitOn:{borderColor:c.plum,backgroundColor:'#FCF3F8'},benefitCopy:{gap:7},benefitIcon:{width:34,height:34,borderRadius:10,backgroundColor:c.soft,justifyContent:'center',alignItems:'center'},
  field:{flex:1,gap:6},label:{fontSize:12,fontWeight:'600',color:c.muted},input:{borderWidth:1,borderColor:c.line,borderRadius:12,paddingHorizontal:12,paddingVertical:11,color:c.fg,fontSize:14,backgroundColor:c.bg,minHeight:44},multiline:{minHeight:76},
  mode:{flexDirection:'row',borderWidth:1,borderColor:c.line,borderRadius:12,padding:4,marginTop:20},modeButton:{paddingHorizontal:18,paddingVertical:10,borderRadius:9},modeActive:{backgroundColor:c.plum},white:{color:'white'},
});
