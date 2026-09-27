import { resolveKeys } from "../../../hooks/usePermissions";

// Evaluates a permission key against a DRAFT map (the Roles & Permissions
// editor's current, possibly-unsaved in-memory state) instead of the real
// logged-in user's Redux-sourced effective_permissions — same VIRTUAL_PERMS
// umbrella-OR resolution as the live usePermissions().can(), reused via
// resolveKeys() so preview results can never drift from production
// semantics. Pure and stateless — safe to call from a modal with no Redux
// involvement.
export function canWith(draft: Record<string, boolean>, permKey: string): boolean {
  return resolveKeys(permKey).some((k) => draft[k] ?? false);
}
