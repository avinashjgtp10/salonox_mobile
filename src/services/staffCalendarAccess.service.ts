import { staffPermissionsService } from "@/services/staffPermissions.service";
const keys = ["view_calendar","access_quick_sale"];
export const staffCalendarAccessService = {
 async getOwnCalendarAccess() { const permissions = await staffPermissionsService.own(); return keys.every(key => permissions[key] === true); },
 async getStaffCalendarAccess(staffId: string) { const view = await staffPermissionsService.get(staffId); return keys.every(key => view.permissions.some(p => p.key === key && p.effective)); },
 async setStaffCalendarAccess(staffId: string, enabled: boolean) { const view = await staffPermissionsService.save(staffId, Object.fromEntries(keys.map(key => [key, enabled]))); return keys.every(key => view.permissions.some(p => p.key === key && p.effective)); },
};
