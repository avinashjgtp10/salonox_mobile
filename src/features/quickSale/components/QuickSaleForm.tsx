import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { itemTimeLabel, localItemTime } from "../utils/itemTime";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { KeyboardAwareForm, type KeyboardAwareFormHandle } from "@/components/ui/KeyboardAwareForm";
import { ClientSearchField } from "./ClientSearchField";
import { StaffPickerSheet } from "./StaffPickerSheet";
import type { ClientListItem } from "@/types/client";
import type { CheckoutSheetProps } from "./checkout/types";
import type { useCart } from "../hooks/useCart";
import { getPackageCoveredQuantity } from "../utils/packageCoverage";
import { buildPricingLine } from "../utils/calculations";
import { formatCurrency, parseAmount } from "../utils/money";
import type { CatalogTab } from "../constants";
import { maskPhone } from "@/utils/maskPhone";

// Visual tokens from the supplied Quick Sale reference.
const c = { bg: "#FAF6F8", card: "#FFFFFF", line: "#E9DFE5", fg: "#000000", muted: "#000000", plum: "#A3467F", soft: "#F3E6EE" };
const types: Record<string, { label: string; color: string; bg: string }> = {
  service: { label: "Service", color: "#6D4DE0", bg: "#ECE9FB" },
  product: { label: "Product", color: "#2F64E6", bg: "#E3ECFF" },
  package: { label: "Package", color: "#B87A00", bg: "#FDF0C8" },
  membership: { label: "Membership", color: "#178A5C", bg: "#DFF4EA" },
};
type Props = Pick<CheckoutSheetProps, "selectedClient" | "redemptions" | "staffOptions" | "onSetQuantity" | "onRemoveItem" | "productStockErrors" | "renderInline"> & {
  cart: ReturnType<typeof useCart>;
  /** Opens the new-client form. */
  onAddClient: () => void;
  /** Drops the chosen client so another can be searched. */
  onClearClient: () => void;
  onSelectClient: (client: ClientListItem) => void;
  notes: string;
  onChangeNotes: (value: string) => void;
  onAdd: (tab: CatalogTab) => void;
  /** Opens the selected client's Date of Birth / Anniversary editor. */
  onEditClientDates?: () => void;
  packageBanner?: ReactNode;
  pricingError?: string | null;
  isPricingLoading?: boolean;
  defaultTime?: string;
};

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return <View style={s.section}><View style={s.row}><Text style={s.title}>{title}</Text>{aside}</View>{children}</View>;
}

export function QuickSaleForm(p: Props) {
  const { clientName } = useClientPrivacy();
  const form = useRef<KeyboardAwareFormHandle>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [staffLine, setStaffLine] = useState<string | null>(null);
  const [timeLine, setTimeLine] = useState<string | null>(null);
  const defaultTime = useRef(p.defaultTime ?? localItemTime(new Date().toISOString()) ?? "09:00").current;
  const selectedTime = p.cart.items.find(item => item.lineId === timeLine)?.startTime ?? defaultTime;
  const times = Array.from(new Set([...Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String(index % 4 * 15).padStart(2, "0")}`), selectedTime])).sort();
  // Both fields are persisted in the existing sale notes field, including drafts.
  const parts = /^Staff alert:\n([\s\S]*?)\n\nNotes:(?:\n([\s\S]*))?$/.exec(p.notes);
  const alert = parts?.[1] ?? "";
  const notes = parts ? parts[2] ?? "" : p.notes;
  const changeNotes = (nextAlert: string, nextNotes: string) => p.onChangeNotes(nextAlert ? `Staff alert:\n${nextAlert}\n\nNotes:\n${nextNotes}` : nextNotes);
  const field = (label: string, value: string, onChange: (value: string) => void, numeric = false, multiline = false) => (
    <FormField key={label} label={label} value={value} onChange={onChange} numeric={numeric} multiline={multiline} reveal={node => form.current?.revealField(node)} />
  );
  return <>
    <KeyboardAwareForm ref={form}>
      <View style={s.page}>
        <Section title="Client">
          {p.selectedClient.id ? (
            <View style={s.row}>
              <View style={s.avatar}><Text style={s.avatarText}>{p.selectedClient.initials}</Text></View>
              <View style={s.flex}><Text style={s.name}>{clientName(p.selectedClient.name)}</Text><Text style={s.muted}>{maskPhone(p.selectedClient.phone)}</Text></View>
              <Pressable accessibilityRole="button" onPress={p.onClearClient}><Text style={s.link}>Change</Text></Pressable>
            </View>
          ) : (
            <ClientSearchField onAddClient={p.onAddClient} onSelect={p.onSelectClient} />
          )}
          {p.selectedClient.id && p.onEditClientDates ? (
            <Pressable accessibilityRole="button" onPress={p.onEditClientDates} style={s.row}>
              <Ionicons name="calendar-outline" size={16} color={c.plum} />
              <Text style={s.link}>Edit DOB & Anniversary</Text>
            </Pressable>
          ) : null}
          {p.selectedClient.id ? <View style={s.row}>
            {[['Wallet', formatCurrency(p.redemptions.eWalletBalance)], ['Points', String(p.redemptions.rewardPointsBalance)], ['Membership', p.selectedClient.membership || 'None']].map(([label, value]) => <View style={s.stat} key={label}><Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={s.muted}>{label}</Text><Text style={s.statValue}>{value}</Text></View>)}
          </View> : null}
        </Section>
        <Section title="Services & items" aside={<Text style={s.muted}>{p.cart.itemCount} {p.cart.itemCount === 1 ? 'item' : 'items'}</Text>}>
          <Text style={s.muted}>Assign staff separately for each service, product, package or membership.</Text>
          {!p.cart.items.length ? <View style={s.empty}><Ionicons name="bag-outline" size={26} color={c.plum}/><Text style={s.name}>No items added yet</Text><Text style={s.muted}>Add a service, product, package or membership.</Text></View> : null}
          {p.cart.items.map(item => {
            const type = types[item.itemType] ?? types.service;
            return <View key={item.lineId} style={s.lineCard}>
              <View style={[s.lineTop, { backgroundColor: type.bg }]}><Text style={[s.tag, {color: type.color}]}>{type.label}</Text><Pressable accessibilityLabel={`Remove ${item.name}`} onPress={() => p.onRemoveItem(item.lineId)} hitSlop={10}><Ionicons name="close" size={20} color="#E5484D"/></Pressable></View>
              <View style={s.lineBody}><Text style={s.name}>{item.name}</Text>
                <Text style={s.muted}>{formatCurrency(item.unitPrice)}{item.quantity > 1 ? ' each' : ''}{item.duration ? ` · ${item.duration}` : ''}</Text>
                <View style={s.staffRow}>
                  <View style={s.staffField}><Text style={s.label}>Staff{item.itemType === "service" ? " *" : ""}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Select staff for ${item.name}`} accessibilityHint="Assigns staff to this item only" onPress={() => { Keyboard.dismiss(); setStaffLine(item.lineId); }} style={[s.staffSelect, item.itemType === "service" && !item.staffId && s.staffRequired]}>
                    <Ionicons name="person-outline" size={16} color={c.plum} />
                    <Text numberOfLines={1} style={[s.staffName, !item.staffId && s.link]}>{item.staffName || 'Select staff'}</Text>
                    {item.staffId
                      ? <Pressable accessibilityRole="button" accessibilityLabel={`Clear staff for ${item.name}`} hitSlop={10} onPress={() => p.cart.setStaff(item.lineId, null, null)}><Ionicons name="close" size={16} color={c.plum} /></Pressable>
                      : <Ionicons name="chevron-down" size={16} color={c.plum} />}
                  </Pressable></View>
                  <View style={s.timeField}><Text style={s.label}>Time</Text><Pressable accessibilityRole="button" accessibilityLabel={`Select time for ${item.name}`} onPress={() => { Keyboard.dismiss(); setTimeLine(item.lineId); }} style={s.timeSelect}><Text numberOfLines={1} style={s.timeText}>{itemTimeLabel(item.startTime ?? defaultTime)}</Text><Ionicons name="chevron-down" size={16} color={c.plum} /></Pressable></View>
                </View>
                {getPackageCoveredQuantity(item) > 0 ? <Text style={s.link}>Package coverage applied</Text> : null}
                <View style={s.row}>
                  <View style={s.stepper}><Pressable accessibilityLabel={`Decrease ${item.name}`} style={s.step} onPress={() => item.quantity === 1 ? p.onRemoveItem(item.lineId) : p.onSetQuantity(item.lineId, item.quantity - 1)}><Text style={s.name}>−</Text></Pressable><Text style={s.name}>{item.quantity}</Text><Pressable accessibilityLabel={`Increase ${item.name}`} style={s.step} onPress={() => p.onSetQuantity(item.lineId, item.quantity + 1)}><Text style={s.name}>+</Text></Pressable></View>
                  <Pressable onPress={() => setEditing(editing === item.lineId ? null : item.lineId)}><Text style={s.link}>{editing === item.lineId ? 'Done' : 'Edit'}</Text></Pressable>
                  <Text style={s.total}>{formatCurrency(buildPricingLine(item).total ?? 0)}</Text>
                </View>
                {p.productStockErrors[item.lineId] ? <Text style={s.error}>{p.productStockErrors[item.lineId]}</Text> : null}
                {editing === item.lineId ? <View style={s.editor}>
                  <View style={s.row}>{field('Price (₹)', String(item.unitPrice), value => p.cart.setPrice(item.lineId, parseAmount(value)), true)}{field('Discount (₹)', String(item.discountAmount), value => p.cart.setDiscount(item.lineId, parseAmount(value)), true)}</View>
                </View> : null}
              </View>
            </View>;
          })}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.addRow}>
            {([['services', 'Service'], ['products', 'Product'], ['packages', 'Package'], ['membership', 'Membership']] as const).map(([tab, label]) => <Pressable key={tab} accessibilityRole="button" onPress={() => p.onAdd(tab)} style={s.add}><Text style={s.addText}>+ {label}</Text></Pressable>)}
          </ScrollView>
          {p.packageBanner}
          {p.pricingError ? <Text style={s.error}>{p.pricingError}</Text> : p.isPricingLoading ? <Text style={s.muted}>Updating total…</Text> : null}
        </Section>
        <Section title="Staff alert & notes">
          {field('Staff alert', alert, value => changeNotes(value, notes), false, true)}
          {field('Notes', notes, value => changeNotes(alert, value), false, true)}
        </Section>
      </View>
    </KeyboardAwareForm>
    <StaffPickerSheet visible={Boolean(staffLine)} title="Select staff for this item" subtitle={p.cart.items.find(item => item.lineId === staffLine)?.name} renderInline={p.renderInline} staff={p.staffOptions} selectedStaffId={p.cart.items.find(item => item.lineId === staffLine)?.staffId ?? null} onClose={() => setStaffLine(null)} onSelect={id => { const staff = p.staffOptions.find(item => item.id === id); if(staffLine) p.cart.setStaff(staffLine, staff?.id ?? null, staff?.name ?? null); setStaffLine(null); }}/>
    <BottomSheet visible={Boolean(timeLine)} title="Select time" subtitle={p.cart.items.find(item => item.lineId === timeLine)?.name} onClose={() => setTimeLine(null)} renderInline={p.renderInline} scrollable={false}>
      <FlatList style={{ height: 320 }} data={times} keyExtractor={time => time} initialScrollIndex={Math.max(0, times.indexOf(selectedTime) - 2)} getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })} renderItem={({ item: time }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: time === selectedTime }} onPress={() => { if (timeLine) p.cart.setTime(timeLine, time); setTimeLine(null); }} style={[s.timeOption, time === selectedTime && { backgroundColor: c.soft }]}><Text style={s.name}>{itemTimeLabel(time)}</Text>{time === selectedTime && <Ionicons name="checkmark" size={20} color={c.plum} />}</Pressable>} />
    </BottomSheet>
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
  staffField: { flex: 1, gap: 6 },
  timeField: { width: 112, gap: 6 },
  timeSelect: { minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.bg },
  timeText: { flex: 1, color: c.fg, fontSize: 13, fontWeight: '600' },
  timeOption: { height: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10 },
  staffRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  staffSelect: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.bg },
  staffRequired: { borderColor: c.plum },
  staffName: { flex: 1, color: c.fg, fontSize: 14, fontWeight: '600' },
  page: { padding:16, paddingBottom:130, gap:14, backgroundColor:c.bg },
  section: { backgroundColor:c.card, borderWidth:1, borderColor:c.line, borderRadius:20, padding:14, gap:12 },
  row: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:10 },
  title: { color:c.fg, fontSize:16, fontWeight:'700', flex:1 }, flex:{flex:1},
  name:{color:c.fg,fontSize:16,fontWeight:'700'}, muted:{color:c.muted,fontSize:12.5,lineHeight:18},
  link:{color:c.plum,fontSize:13,fontWeight:'700'}, avatar:{width:46,height:46,borderRadius:23,backgroundColor:c.soft,alignItems:'center',justifyContent:'center'}, avatarText:{color:c.plum,fontSize:17,fontWeight:'700'},
  stat:{flex:1,backgroundColor:c.bg,borderRadius:12,padding:8,alignItems:'center'},statValue:{color:c.fg,fontWeight:'700',fontSize:13},
  empty:{borderWidth:1,borderStyle:'dashed',borderColor:c.line,borderRadius:14,padding:22,gap:8,alignItems:'center'},
  error:{color:'#E5484D',fontSize:12},
  lineCard:{borderWidth:1.5,borderColor:c.line,borderRadius:16,overflow:'hidden'},lineTop:{height:40,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},tag:{fontSize:11,fontWeight:'700',letterSpacing:0.7,textTransform:'uppercase'},
  lineBody:{padding:12,gap:8},stepper:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:c.line,borderRadius:10,gap:8},step:{padding:8},total:{fontSize:17,fontWeight:'700',color:c.fg},editor:{gap:10,borderTopWidth:1,borderColor:c.line,paddingTop:12},
  addRow:{gap:8,paddingVertical:2},add:{backgroundColor:"#EAC8E3",borderRadius:999,paddingHorizontal:14,paddingVertical:11},addText:{fontSize:12,fontWeight:'700',color:'#000000'},
  field:{flex:1,gap:6},label:{fontSize:12,fontWeight:'600',color:c.muted},input:{borderWidth:1,borderColor:c.line,borderRadius:12,paddingHorizontal:12,paddingVertical:11,color:c.fg,fontSize:14,backgroundColor:c.bg,minHeight:44},multiline:{minHeight:76},
});
