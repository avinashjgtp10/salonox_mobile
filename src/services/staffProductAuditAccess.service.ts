import { staffPermissionsService } from "@/services/staffPermissions.service";
const keys = ["view_product_audit","create_product_audit"];
export const staffProductAuditAccessService = {
 async getOwnProductAuditAccess() { const permissions = await staffPermissionsService.own(); return keys.every(key => permissions[key] === true); },
 async getStaffProductAuditAccess(staffId: string) { const view = await staffPermissionsService.get(staffId); return keys.every(key => view.permissions.some(p => p.key === key && p.effective)); },
 async setStaffProductAuditAccess(staffId: string, enabled: boolean) { const view = await staffPermissionsService.save(staffId, Object.fromEntries(keys.map(key => [key, enabled]))); return keys.every(key => view.permissions.some(p => p.key === key && p.effective)); },
};
