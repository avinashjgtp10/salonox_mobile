import { StaffPage } from "../components/StaffScreen";
import { StaffAttendanceCard } from "@/features/attendance/components/StaffAttendanceExperience";
import { useStaffSelfAttendance } from "@/features/attendance/components/StaffAttendanceGate";
import { AttendanceActivityDetails } from "@/features/attendance/components/AttendanceActivityDetails";
export function StaffAttendanceScreen(){
 const attendance=useStaffSelfAttendance();
 return <StaffPage title="Attendance activity" subtitle={attendance?.state?.date} refreshing={attendance?.busy} onRefresh={()=>void attendance?.refresh()}><StaffAttendanceCard/>{attendance?.record?.activity&&<AttendanceActivityDetails activity={attendance.record.activity} finalCheckout={attendance.record.checkOutTime}/>}</StaffPage>;
}
