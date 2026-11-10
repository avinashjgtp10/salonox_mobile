import { useCallback, useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StaffPage } from "@/features/staff/components/StaffScreen";
import { LunoxHeaderButton } from "@/components/lunox/LunoxHeaderButton";
import { StaffBookingRow } from "@/features/staff/components/StaffBookingRow";
import { StaffAttendanceCard } from "@/features/attendance/components/StaffAttendanceExperience";
import { MyCommissionCard } from "@/features/staff/components/MyCommissionCard";
import { useStaffSelfAttendance } from "@/features/attendance/components/StaffAttendanceGate";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentStaff, selectCurrentStaffError } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectAppointments, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";
import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchUnreadCountThunk, fetchNotificationsThunk } from "@/middleware/notification/notification.thunk";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import { isStaffAppointmentCompleted } from "@/features/appointments/utils/staffAppointmentRows";
import { todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { getUserFullName } from "@/utils/userProfile";
import { Text } from "@/components/ui/AppTypography";
import { useSettingsStyles } from "@/features/settings/SettingsUI";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";

export function StaffHomeRouteContent({ locked = false }: { locked?: boolean } = {}) {
 const dispatch = useAppDispatch(), ui = useSettingsStyles(), p = usePearlPalette();
 const user = useAppSelector(selectCurrentUser), staff = useAppSelector(selectCurrentStaff);
 const appointments = useAppSelector(selectAppointments), refreshing = useAppSelector(selectAppointmentsRefreshing);
 const error = useAppSelector(selectCurrentStaffError), attendance = useStaffSelfAttendance();
 const today = todayIsoDate();
 const name = staff?.name || getUserFullName(user);
 const load = useCallback((refresh = false) => {
  if (locked || !staff?.id) return;
  void dispatch(fetchAppointmentsThunk({ date: today, limit: 40, page: 1, refresh, reset: !refresh, staff_id: staff.id }));
  void dispatch(fetchUnreadCountThunk()); void dispatch(fetchNotificationsThunk(refresh ? { refresh: true } : undefined));
 }, [dispatch, locked, staff?.id, today]);
 useEffect(() => { load(); }, [load]);
 const mine = locked || !staff ? [] : appointments.filter(item => isAssignedToStaff(item, staff) && (item.scheduledAt ?? item.startTime ?? "").slice(0,10) === today);
 const active = mine.filter(item => !isStaffAppointmentCompleted(item) && !["Cancelled", "Deleted", "No Show"].includes(item.status)).sort((a,b) => String(a.startTime ?? a.scheduledAt).localeCompare(String(b.startTime ?? b.scheduledAt)));
 const done = mine.filter(isStaffAppointmentCompleted).length;
 return <StaffPage subtitleAbove title={"Hi, " + name.split(" ")[0]} subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
  refreshing={refreshing} onRefresh={() => { load(true); void attendance?.refresh(); }}
  right={<View style={{flexDirection:"row",alignItems:"center",gap:10}}><LunoxHeaderButton/><TouchableOpacity accessibilityLabel="Notifications" onPress={() => router.push("/(staff)/notifications" as Href)} style={[ui.icon, { backgroundColor: p.glassStrong }]}><Ionicons name="notifications-outline" size={22} color={p.ink} /></TouchableOpacity></View>}>
  {!!error && <Text style={ui.error}>{error}</Text>}
  <StaffAttendanceCard />
  {!locked && <>
   <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text translate style={ui.title}>Today’s appointments</Text><TouchableOpacity onPress={() => router.push("/(staff)/appointments" as Href)}><Text translate style={{ color: p.accentDeep, fontSize: 13 }}>All</Text></TouchableOpacity></View>
   {!!active.length && <View style={ui.card}>{active.slice(0,2).map((item,index) => <View key={item.id}>{index > 0 && <View style={{height:1,backgroundColor:p.divider,marginHorizontal:14}}/>}<StaffBookingRow embedded appointment={item} next={index === 0} /></View>)}</View>}
   {!active.length && <View style={ui.formCard}><Text translate style={ui.body}>No upcoming appointments today.</Text></View>}
   <Text translate style={ui.title}>My progress today</Text><View style={{flexDirection:"row",gap:10}}>{[["Done",done,"checkmark-circle-outline"],["Left",active.length,"time-outline"],["Rating",(()=>{const ratings=mine.map(item=>item.raw.rating??item.raw.avg_rating).filter(value=>value!==null&&value!==undefined&&value!=="").map(Number).filter(value=>Number.isFinite(value)&&value>=0&&value<=5);return ratings.length?(ratings.reduce((sum,rating)=>sum+rating,0)/ratings.length).toFixed(1):"—";})(),"star-outline"]].map(([label,value,icon])=><View key={label} style={[ui.formCard,{flex:1,padding:12,gap:8,borderRadius:20}]}><View style={{width:32,height:32,borderRadius:11,alignItems:"center",justifyContent:"center",backgroundColor:p.accentWash}}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={p.accentDeep}/></View><Text translate style={ui.muted}>{label}</Text><Text style={[ui.heading,{fontSize:24}]}>{value}</Text></View>)}</View>
   {!!staff?.id && <MyCommissionCard compact staffId={staff.id} staffName={name} />}
  </>}
 </StaffPage>;
}
export default StaffHomeRouteContent;
