import SettingsScreen from "@/features/settings/SettingsScreen";
import { StaffSettingsScreen } from "@/features/staff/screens/StaffSettingsScreen";
import { useAuth } from "@/context/AuthContext";
import { isStaffAccount } from "@/utils/staffExperience";
export default function MoreScreen(){return isStaffAccount(useAuth().user)?<StaffSettingsScreen/>:<SettingsScreen/>;}
