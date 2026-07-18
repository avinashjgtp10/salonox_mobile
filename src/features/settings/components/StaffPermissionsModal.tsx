import { useState, useEffect } from "react";
import { X, Loader2, RotateCcw, ShieldCheck, Shield } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { updateStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  defaultPermissions,
  PERM_CATEGORIES,
  buildPermissions,
  permsToRecord,
  type Permission,
} from "../data/permissionMatrix";
import type { EntityId } from "../../../types/common.types";

interface StaffMember {
  id: EntityId;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  custom_permissions?: Record<string, boolean> | null;
  [key: string]: any;
}

interface Props {
  staff: StaffMember;
  /** Current global role permissions — used as fallback defaults */
  globalPermissions: Permission[];
  onClose: () => void;
  /** Called after a successful save so the parent can update its list */
  onSaved: (staffId: EntityId, customPerms: Record<string, boolean> | null) => void;
}

export default function StaffPermissionsModal({
  staff,
  globalPermissions,
  onClose,
  onSaved,
}: Props) {
  const dispatch = useAppDispatch();

  const hasCustom = staff.custom_permissions != null;

  // Local permissions state — seeded from custom or global defaults
  const [perms, setPerms] = useState<Permission[]>(() =>
    buildPermissions(globalPermissions, staff.custom_permissions)
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [isCustom, setIsCustom] = useState(hasCustom);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // Re-seed if the staff prop changes (e.g. parent reloads data)
  useEffect(() => {
    setPerms(buildPermissions(globalPermissions, staff.custom_permissions));
    setIsCustom(staff.custom_permissions != null);
  }, [staff.id]);

  const displayName = [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email || "Staff member";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Save helper ──────────────────────────────────────────────────────────────
  const saveCustomPerms = async (nextPerms: Permission[]): Promise<boolean> => {
    const record = permsToRecord(nextPerms);
    const result = await dispatch(updateStaffThunk({ id: staff.id, data: { custom_permissions: record } }));
    if (updateStaffThunk.fulfilled.match(result)) {
      onSaved(staff.id, record);
      return true;
    }
    return false;
  };

  const clearCustomPerms = async (): Promise<boolean> => {
    const result = await dispatch(updateStaffThunk({ id: staff.id, data: { custom_permissions: null } }));
    if (updateStaffThunk.fulfilled.match(result)) {
      onSaved(staff.id, null);
      return true;
    }
    return false;
  };

  // ── Toggle a single permission ───────────────────────────────────────────────
  const togglePerm = async (key: string) => {
    if (savingKey || resetting) return;

    const nextPerms = perms.map((p) => p.key === key ? { ...p, staff: !p.staff } : p);
    const newVal = nextPerms.find((p) => p.key === key)!.staff;
    const label = perms.find((p) => p.key === key)!.label;

    setPerms(nextPerms);
    setIsCustom(true);
    setSavingKey(key);

    const ok = await saveCustomPerms(nextPerms);
    setSavingKey(null);

    if (ok) {
      showSuccess(`${label} ${newVal ? "enabled" : "disabled"} for ${displayName}`);
    } else {
      setPerms(perms); // rollback
      showError("Failed to update permission");
    }
  };

  // ── Reset to role defaults ───────────────────────────────────────────────────
  const handleReset = async () => {
    if (resetting || savingKey) return;
    setResetting(true);

    const ok = await clearCustomPerms();

    if (ok) {
      setPerms(buildPermissions(globalPermissions, null));
      setIsCustom(false);
      showSuccess(`${displayName} reset to role defaults`);
    } else {
      showError("Failed to reset permissions");
    }
    setResetting(false);
  };

  return (
    <div className="spm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {overlay}
      <div className="spm-panel">
        {/* Header */}
        <div className="spm-header">
          <div className="spm-header-info">
            <div className="spm-avatar">
              {staff.avatar_url
                ? <img src={staff.avatar_url} alt={displayName} />
                : initials}
            </div>
            <div>
              <p className="spm-name">{displayName}</p>
              <p className="spm-email">{staff.email || "—"}</p>
            </div>
          </div>
          <button className="spm-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Custom / default indicator */}
        <div className={`spm-mode-banner ${isCustom ? "custom" : "default"}`}>
          {isCustom ? (
            <>
              <ShieldCheck size={15} />
              <span>This staff member has <strong>custom permissions</strong> that override the role defaults.</span>
              <button
                className="spm-reset-link"
                onClick={handleReset}
                disabled={resetting || !!savingKey}
              >
                {resetting
                  ? <Loader2 size={12} className="perm-spin" />
                  : <RotateCcw size={12} />}
                Reset to role defaults
              </button>
            </>
          ) : (
            <>
              <Shield size={15} />
              <span>Using <strong>role defaults</strong>. Toggle any permission to create custom overrides.</span>
            </>
          )}
        </div>

        {/* Permission list */}
        <div className="spm-body">
          {PERM_CATEGORIES.map((cat) => (
            <div key={cat} className="spm-category">
              <p className="spm-cat-label">{cat}</p>
              {perms.filter((p) => p.category === cat).map((perm) => (
                <div key={perm.key} className="spm-perm-row">
                  <div className="spm-perm-info">
                    <p className="spm-perm-name">{perm.label}</p>
                    <p className="spm-perm-desc">{perm.desc}</p>
                  </div>
                  <div className="spm-perm-toggle">
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={perm.staff}
                        disabled={savingKey === perm.key || resetting}
                        onChange={() => togglePerm(perm.key)}
                      />
                      <span className="settings-toggle-slider" />
                    </label>
                    {savingKey === perm.key && (
                      <Loader2 size={13} className="perm-spin perm-saving-icon" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
