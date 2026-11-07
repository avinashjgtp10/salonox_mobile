import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { Icon } from "@/components/pearl/Icon";
import { pearl } from "@/components/auth/pearl/tokens";
import { formatCurrency } from "@/features/quickSale/utils/money";
export function PearlCatalogRow({ name, detail, price, selected, first = false, last = false, disabled = false, onPress }: { name: string; detail?: string; price: number; selected: boolean; first?: boolean; last?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[s.row, first && { borderTopLeftRadius: 20, borderTopRightRadius: 20 }, last && { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderBottomWidth: 0 }, disabled && { opacity: 0.5 }]}>
    <View style={s.copy}><Text style={s.name}>{name}</Text>{detail ? <Text style={s.detail}>{detail}</Text> : null}</View>
    <Text style={s.price}>{formatCurrency(price)}</Text>
    <View style={[s.add, selected && s.selected]}><Icon name={selected ? "check" : "plus"} size={18} color={selected ? "#fff" : pearl.accentDeep} /></View>
  </Pressable>;
}
const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",gap:10,padding:14,backgroundColor:pearl.glass,borderBottomWidth:1,borderBottomColor:pearl.divider},copy:{flex:1,minWidth:0},name:{fontSize:14.5,fontWeight:"700",color:pearl.ink},detail:{fontSize:12,color:pearl.muted,marginTop:3},price:{fontSize:14,fontWeight:"700",color:pearl.ink},add:{width:32,height:32,borderRadius:11,backgroundColor:"rgba(255,255,255,0.8)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:pearl.glassBorder},selected:{backgroundColor:pearl.accent}});
