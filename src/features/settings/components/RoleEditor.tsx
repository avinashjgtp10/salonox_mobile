import { useState, useMemo } from "react";
import { X, Loader2, Search } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { createRoleThunk, updateRoleThunk } from "../../../middleware/roles/roles.thunk";
import type { RoleWithPermissions } from "../../../types/roles.types";

interface Props {
  /** undefined = creating a new role */
  role?: RoleWithPermissions;
  onClose: () => void;
  onSaved: () => void;
}

const riskBadgeClass: Record<string, string> = {
  low: "s-badge-gray",
  medium: "s-badge-info",
  high: "s-badge-warning",
  critical: "s-badge-danger",
};

export default function RoleEditor({ role, onClose, onSaved }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const catalog = useAppSelector((s) => s.roles.permissions);

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Record<string, boolean>>(role?.permissions ?? {});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const modules = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byModule = new Map<string, typeof catalog>();
    for (const perm of catalog) {
      if (q && !perm.name.toLowerCase().includes(q) && !perm.key.toLowerCase().includes(q)) continue;
      if (!byModule.has(perm.module)) byModule.set(perm.module, []);
      byModule.get(perm.module)!.push(perm);
    }
    return Array.from(byModule.entries());
  }, [catalog, search]);

  const togglePerm = (key: string) => {
    setPerms((prev) => {
      const next = !prev[key];
      const updated = { ...prev, [key]: next };
      // Dependency auto-enable: turning a permission on also turns on
      // whatever it depends_on (e.g. Edit Clients -> View Clients).
      if (next) {
        const meta = catalog.find((p) => p.key === key);
        for (const dep of meta?.depends_on ?? []) updated[dep] = true;
      }
      return updated;
    });
  };

  const setAllInModule = (modulePerms: typeof catalog, value: boolean) => {
    setPerms((prev) => {
      const updated = { ...prev };
      for (const p of modulePerms) {
        updated[p.key] = value;
        if (value) for (const dep of p.depends_on ?? []) updated[dep] = true;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError("Role name is required");
      return;
    }
    setSaving(true);
    const result = role
      ? await dispatch(updateRoleThunk({ id: role.id, name: name.trim(), description, permissions: perms }))
      : await dispatch(createRoleThunk({ name: name.trim(), description, permissions: perms }));
    setSaving(false);
    const ok = role ? updateRoleThunk.fulfilled.match(result) : createRoleThunk.fulfilled.match(result);
    if (ok) {
      showSuccess(role ? "Role updated" : "Role created");
      onSaved();
    } else {
      const message = (result as any)?.payload ?? `Failed to ${role ? "update" : "create"} role`;
      showError(message);
    }
  };

  const grantedCount = Object.values(perms).filter(Boolean).length;

  return (
    <div className="spm-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      {overlay}
      <div className="spm-panel" style={{ maxWidth: 680 }}>
        <div className="spm-header">
          <div className="spm-header-info">
            <div>
              <p className="spm-name">{role ? "Edit Role" : "Create Role"}</p>
              {role && <p className="spm-email">{role.staff_count} staff member{role.staff_count === 1 ? "" : "s"} assigned</p>}
            </div>
          </div>
          <button className="spm-close-btn" onClick={onClose} aria-label="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Role name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Stylist"
              style={{ width: "100%", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, marginTop: 4 }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 8, top: 8, color: "#9ca3af" }} />
            <input
              type="text"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "6px 8px 6px 28px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <p style={{ fontSize: 12, color: "#6b7280" }}>{grantedCount} permission{grantedCount === 1 ? "" : "s"} granted</p>
        </div>

        <div className="spm-body">
          {modules.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: 20 }}>No permissions match your search.</p>
          ) : (
            modules.map(([moduleName, modulePerms]) => (
              <div key={moduleName} className="spm-category">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="spm-cat-label" style={{ margin: 0 }}>{moduleName}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="spm-reset-link" style={{ fontSize: 11 }} onClick={() => setAllInModule(modulePerms, true)}>All on</button>
                    <button className="spm-reset-link" style={{ fontSize: 11 }} onClick={() => setAllInModule(modulePerms, false)}>All off</button>
                  </div>
                </div>
                {modulePerms.map((perm) => (
                  <div key={perm.key} className="spm-perm-row">
                    <div className="spm-perm-info">
                      <p className="spm-perm-name">
                        {perm.name}
                        {(perm.risk_level === "high" || perm.risk_level === "critical") && (
                          <span className={`s-badge ${riskBadgeClass[perm.risk_level]}`} style={{ fontSize: 10, marginLeft: 6 }}>{perm.risk_level}</span>
                        )}
                      </p>
                      {perm.description && <p className="spm-perm-desc">{perm.description}</p>}
                    </div>
                    <div className="spm-perm-toggle">
                      <label className="settings-toggle">
                        <input type="checkbox" checked={!!perms[perm.key]} onChange={() => togglePerm(perm.key)} />
                        <span className="settings-toggle-slider" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} className="perm-spin" /> : role ? "Save changes" : "Create role"}
          </button>
        </div>
      </div>
    </div>
  );
}
