import { useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { Text } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { SettingsButton, useSettingsStyles } from "@/features/settings/SettingsUI";
import { StaffBookingRow } from "@/features/staff/components/StaffBookingRow";
import { useFooterClearance } from "@/hooks/useFooterClearance";
import { useFetchAppointments } from "../hooks/useAppointmentList";
import { todayIsoDate } from "../utils/appointmentDateTime";
import { isAssignedToStaff } from "../utils/staffAssignment";
import { isStaffAppointmentCompleted } from "../utils/staffAppointmentRows";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff, selectCurrentStaffError } from "@/store/staff/staff.slice";
import { selectAppointments, selectAppointmentsError, selectAppointmentsIsLoading, selectAppointmentsLoadingMore, selectAppointmentsPagination, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";

export function StaffMyAppointmentsScreen() {
 const ui = useSettingsStyles(), p = usePearlPalette(), clearance = useFooterClearance();
 const staff = useAppSelector(selectCurrentStaff), staffError = useAppSelector(selectCurrentStaffError);
 const appointments = useAppSelector(selectAppointments), error = useAppSelector(selectAppointmentsError);
 const loading = useAppSelector(selectAppointmentsIsLoading), loadingMore = useAppSelector(selectAppointmentsLoadingMore);
 const pagination = useAppSelector(selectAppointmentsPagination), refreshing = useAppSelector(selectAppointmentsRefreshing);
 const { fetchAppointments, fetchNext } = useFetchAppointments();
 const [tab,setTab] = useState("Today");
 const today = todayIsoDate();
 useEffect(() => { if (staff?.id) void fetchAppointments({ reset: true, staffId: staff.id }); }, [staff?.id, fetchAppointments]);
 const mine = staff ? appointments.filter(item => isAssignedToStaff(item, staff)) : [];
 const matchesTab = (item: (typeof mine)[number], label: string) => {
  const date = (item.scheduledAt ?? item.startTime ?? "").slice(0, 10);
  if (label === "Done") return isStaffAppointmentCompleted(item);
  if (label === "No-show") return item.status === "No Show" && date === today;
  return !isStaffAppointmentCompleted(item) && !["Cancelled", "Deleted", "No Show"].includes(item.status)
   && (label === "Today" ? date === today : date > today);
 };
 const filtered = mine.filter(item => matchesTab(item, tab))
  .sort((a,b) => String(a.scheduledAt ?? a.startTime).localeCompare(String(b.scheduledAt ?? b.startTime)));
 return <PearlBackground><SafeAreaView edges={["top"]} style={{ flex: 1 }}><AppStatusBar />
  <FlatList data={filtered} keyExtractor={item=>item.id} contentContainerStyle={{ padding:16, gap:12, paddingBottom:clearance+20 }} showsVerticalScrollIndicator={false}
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { if(staff?.id) void fetchAppointments({ reset:true,refresh:true,staffId:staff.id }); }} colors={[p.accent]} tintColor={p.accent} />}
   ListHeaderComponent={<View style={{gap:16,paddingVertical:8}}><Text translate style={ui.heading}>My bookings</Text><Text style={ui.muted}>{new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"short"})}</Text>
    <View style={{flexDirection:"row",gap:10}}>{["Today","Upcoming","Done"].map(label=><View key={label} style={[ui.formCard,{flex:1,padding:12,gap:6}]}><Text translate style={ui.muted}>{label}</Text><Text style={[ui.heading,{fontSize:22}]}>{mine.filter(item => matchesTab(item, label)).length}</Text></View>)}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{["Today","Upcoming","Done","No-show"].map(label=><TouchableOpacity key={label} accessibilityRole="tab" accessibilityState={{selected:tab===label}} onPress={()=>setTab(label)} style={{borderRadius:20,paddingHorizontal:15,paddingVertical:10,backgroundColor:tab===label?p.accentWash:p.glass}}><Text translate style={{color:tab===label?p.accentDeep:p.muted,fontSize:13,fontWeight:"600"}}>{label}</Text></TouchableOpacity>)}</ScrollView>
   </View>}
   renderItem={({item,index})=><StaffBookingRow appointment={item} upcoming={tab==="Upcoming"} next={tab==="Today"&&index===0} />}
   ListEmptyComponent={<View style={ui.formCard}><Text translate style={ui.title}>{loading?"Loading bookings…":staffError||error?"Unable to load bookings":tab==="No-show"?"No no-shows today":"No bookings found"}</Text><Text style={ui.muted}>{staffError||error|| (tab==="No-show"?"Past no-shows live in Reports.":"Your assigned bookings will appear here.")}</Text>{!!(staffError||error)&&<SettingsButton label="Retry" onPress={()=>{if(staff?.id)void fetchAppointments({reset:true,staffId:staff.id});}} />}</View>}
   ListFooterComponent={pagination.hasMore?<SettingsButton secondary label={loadingMore?"Loading…":"Load more"} loading={loadingMore} onPress={()=>{if(staff?.id)void fetchNext({staffId:staff.id});}} />:null}
  />
 </SafeAreaView></PearlBackground>;
}
