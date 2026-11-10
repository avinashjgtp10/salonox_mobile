import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { router, type Href } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Text } from "@/components/ui/AppTypography";
import { SettingsButton, useSettingsStyles } from "@/features/settings/SettingsUI";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { useStaffDetails } from "@/features/staff/hooks/useStaffDetails";
import { useAvatarUpload } from "@/features/profile/hooks/useAvatarUpload";
import { useProfilePhotoUrl } from "@/features/profile/utils/ownerProfilePhoto";
import { useAppToast } from "@/hooks/useAppToast";
import { StaffAddressSection } from "@/features/staff/components/StaffAddressSection";
import { EmergencyContactsSection } from "@/features/staff/components/EmergencyContactsSection";

export function StaffSelfProfileSheet({ onClose }: { onClose:()=>void }) {
 const ui=useSettingsStyles(), p=usePearlPalette();
 const user=useAppSelector(selectCurrentUser), current=useAppSelector(selectCurrentStaff);
 const { staffMember, detailsLoading, detailsError, refresh, emergencyContacts }=useStaffDetails(current?.id);
 const profile=staffMember??current, toast=useAppToast();
 const photo=useAvatarUpload({avatarUrl:useProfilePhotoUrl(user),onError:toast.showError,onStart:()=>undefined,onSuccess:toast.showSuccess});
 const [details,setDetails]=useState(false);
 return <BottomSheet visible pearlStyle centered={false} avoidKeyboard title="My profile" onClose={onClose}
  footer={<View style={{flex:1}}><SettingsButton label="Done" onPress={onClose} /></View>}>
  <View style={{gap:16}}>
   <TouchableOpacity accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={photo.isUploading} onPress={photo.changePhoto} style={{alignSelf:"center",alignItems:"center",gap:8}}>
    <View style={{width:64,height:64,borderRadius:22,backgroundColor:p.accentTint,alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{photo.avatarUri?<Image source={{uri:photo.avatarUri}} style={{width:64,height:64}}/>:<Text style={[ui.heading,{color:p.accentDeep}]}>{profile?.initials??""}</Text>}</View>
    <Text translate style={{color:p.accentDeep,fontSize:12,fontWeight:"700"}}>Change photo</Text>
   </TouchableOpacity>
   {[["Mobile *",profile?.phone??user?.phone],["Email *",profile?.email??user?.email],["Emergency contact name",emergencyContacts[0]?.fullName],["Emergency contact phone",emergencyContacts[0]?.phone]].map(([label,value])=><View key={label} style={{gap:7}}><Text translate style={ui.body}>{label}</Text><View style={[ui.input,{justifyContent:"center"}]}><Text style={ui.body}>{value||"—"}</Text></View></View>)}
   <Text translate style={ui.muted}>Contact your manager to update your contact details.</Text>
   {!!detailsError&&<TouchableOpacity onPress={refresh}><Text style={ui.error}>{detailsError}</Text><Text translate style={ui.muted}>Retry</Text></TouchableOpacity>}
   {detailsLoading&&<Text translate style={ui.muted}>Loading profile…</Text>}
   <TouchableOpacity onPress={()=>setDetails(value=>!value)} style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:8}}><Text translate style={ui.title}>Employment details</Text><Ionicons name={details?"chevron-up":"chevron-down"} color={p.muted} size={18}/></TouchableOpacity>
   {details&&profile&&<View style={{gap:12}}>{[["Name",profile.name],["Role",profile.role],["Staff ID",profile.employeeCode],["Joining date",profile.joiningDate],["Working hours",profile.workingHours],["Availability",profile.availabilityLabel]].map(([label,value])=><View key={label} style={{gap:4}}><Text translate style={ui.muted}>{label}</Text><Text style={ui.body}>{value||"—"}</Text></View>)}<StaffAddressSection readOnly staffId={profile.id}/><EmergencyContactsSection readOnly staffId={profile.id}/></View>}
  </View>
 </BottomSheet>;
}
export function StaffSelfProfileScreen(){return <StaffSelfProfileSheet onClose={()=>router.canGoBack()?router.back():router.replace("/(staff)/more" as Href)}/>;}
