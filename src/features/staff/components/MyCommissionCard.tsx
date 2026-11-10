import { useCallback, useEffect, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { DateRangeField } from "@/components/ui/DateRangeField";
import { useRegionalPreferences } from "@/localization/preferences";
import { useSettingsStyles } from "@/features/settings/SettingsUI";
import { staffCommissionsService } from "@/services/staffCommissions.service";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";
import { formatAppDate } from "@/utils/dateTime";
import { formatCurrency as money } from "@/utils/currency";

type Props={compact?:boolean;dateRange?:{startDate:string;endDate:string};refreshKey?:number;staffId?:string|null;staffName:string};
const dateKey=(date:Date)=>date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
export function MyCommissionCard({compact=false,dateRange,refreshKey=0,staffId,staffName}:Props){
 "use no memo";
 useRegionalPreferences();
 const ui=useSettingsStyles();
 const [range,setRange]=useState(()=>{const today=dateKey(new Date());return {startDate:compact?today.slice(0,8)+"01":today,endDate:today};});
 const appliedRange=dateRange??range;
 const [entries,setEntries]=useState<CommissionHistoryEntry[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
 const version=useRef(0);
 const load=useCallback(async()=>{
  if(!staffId)return;
  const request=++version.current;setLoading(true);setError(null);
  try{const rows=await staffCommissionsService.getCommissionHistoryForRange(staffId,appliedRange.startDate,appliedRange.endDate);if(request===version.current)setEntries(rows);}
  catch(cause){if(request===version.current)setError(cause instanceof Error?cause.message:"Unable to load your commissions.");}
  finally{if(request===version.current)setLoading(false);}
 },[staffId,appliedRange.startDate,appliedRange.endDate]);
 useEffect(()=>{void load();return()=>{version.current+=1;};},[load,refreshKey]);
 const total=entries.reduce((sum,entry)=>sum+entry.amount,0);
 const known=entries.every(entry=>["paid","settled","pending","unpaid"].includes(entry.status.toLowerCase()));
 const paid=entries.filter(entry=>["paid","settled"].includes(entry.status.toLowerCase())).reduce((sum,entry)=>sum+entry.amount,0);
 const unavailable=loading||!!error;
 return <View style={ui.formCard}>
  <View style={{flexDirection:"row",justifyContent:"space-between"}}><Text translate style={ui.title}>{dateRange?"Commission":"My commission"}</Text>{compact&&!dateRange&&<Text translate style={ui.muted}>This month</Text>}</View>
  {!compact&&<><Text style={ui.muted}>{staffName}</Text><DateRangeField startDate={range.startDate} endDate={range.endDate} maximumDate={new Date()} disabled={loading} onChange={(startDate,endDate)=>setRange({startDate,endDate})}/></>}
  {dateRange?<View style={{flexDirection:"row",gap:8}}>{[["Earned",unavailable?"—":money(total)],["Paid",unavailable||!known?"—":money(paid)],["Unpaid",unavailable||!known?"—":money(total-paid)]].map(([label,value])=><View key={label} style={{flex:1,gap:6}}><Text translate style={ui.muted}>{label}</Text><Text style={ui.title}>{value}</Text></View>)}</View>:<>
   <Text style={ui.muted}>Earned · {formatAppDate(new Date(appliedRange.startDate))} – {formatAppDate(new Date(appliedRange.endDate))}</Text>
   <Text style={[ui.heading,{fontSize:28}]}>{unavailable?"—":money(total)}</Text>
   {compact&&<Text style={ui.muted}>{unavailable||!known?"—":money(total-paid)} still to be paid</Text>}
  </>}
  {!!error&&<TouchableOpacity onPress={()=>void load()}><Text style={ui.error}>{error}</Text><Text translate style={ui.muted}>Tap to retry</Text></TouchableOpacity>}
  {!compact&&!unavailable&&entries.map(entry=><View key={entry.id} style={{flexDirection:"row",justifyContent:"space-between",gap:10,paddingVertical:8}}><View style={{flex:1}}><Text style={ui.title}>{entry.category||"Commission"}</Text><Text style={ui.muted}>{entry.period} · {entry.status}</Text></View><Text style={ui.title}>{money(entry.amount)}</Text></View>)}
 </View>;
}
