import { useEffect, useRef, useState } from "react";
import { AppSwitch } from "@/components/ui/AppSwitch";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { staffPermissionsService, type StaffPermission } from "@/services/staffPermissions.service";
import { getApiErrorMessage } from "@/services/api";
import { cascadeOnKeys, cascadeOffKeys, lockedByMaster } from "../utils/permissionCascade";
import { sortModuleNames, sortGroupNames } from "../utils/permissionModuleOrder";
import { StaffButton, staffUi } from "./StaffPearl";
import { pearl } from "@/components/auth/pearl/themedPearl";

export function StaffFormPermissions({ role, staffId, overrides, onChange, onReady, disabled = false, notice }: {
  role: "Staff" | "Manager";
  staffId?: string | null;
  overrides: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
  onReady: (value: boolean) => void;
  disabled?: boolean;
  /** Why the toggles are locked, shown in place of the usual hint. */
  notice?: string;
}) {
  const [catalog, setCatalog] = useState<StaffPermission[]>([]);
  const [effective, setEffective] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;
  useEffect(() => {
    let active = true;
    onReady(false);
    setError("");
    setCatalog([]);
    setEffective({});
    setExpanded({});
    Promise.all([staffPermissionsService.catalog(), staffId
      ? staffPermissionsService.get(staffId).then(view => Object.fromEntries(view.permissions.map(p => [p.key, p.effective])))
      : staffPermissionsService.roleDefaults(role)])
      .then(([items, defaults]) => {
        if (!active) return;
        setCatalog(items);
        setEffective({ ...defaults, ...overridesRef.current });
        onReady(true);
      }).catch(e => { if (active) setError(getApiErrorMessage(e)); });
    return () => { active = false; };
  }, [role, staffId, retry, onChange, onReady]);
  const toggle = (key: string) => setExpanded(current => ({ ...current, [key]: !current[key] }));
  const changePermission = (key: string, enabled: boolean) => {
    const keys = enabled ? cascadeOnKeys(catalog, key) : cascadeOffKeys(catalog, key);
    keys.add(key);
    const changes = Object.fromEntries([...keys].map(item => [item, enabled]));
    setEffective(current => ({ ...current, ...changes }));
    onChange({ ...overridesRef.current, ...changes });
  };
  const rows = (permissions: StaffPermission[]) => permissions.map(permission => {
    const locked = lockedByMaster(permission.key, key => effective[key] === true);
    return (
      <View key={permission.key} style={[staffUi.menuRow, { borderBottomWidth: 0, opacity: locked ? 0.6 : 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={staffUi.rowTitle}>{permission.name}</Text>
          {permission.description ? <Text style={staffUi.muted}>{permission.description}</Text> : null}
          {locked ? <Text style={staffUi.muted}>Enable {catalog.find(item => item.key === locked)?.name ?? locked} first</Text> : null}
        </View>
        <AppSwitch
          accessibilityLabel={permission.name}
          disabled={disabled || !!locked}
          value={effective[permission.key] === true}
          onValueChange={value => changePermission(permission.key, value)}
        />
      </View>
    );
  });
  const modules = sortModuleNames([...new Set(catalog.map(permission => permission.module))], name => name);
  return <View style={staffUi.formCard}>
    <Text translate style={staffUi.heading}>Permissions</Text>
    {notice ? (
      <Text translate accessibilityRole="alert" style={staffUi.error}>{notice}</Text>
    ) : (
      <Text translate style={staffUi.muted}>Choose what this staff member can access. Permissions save with the staff form.</Text>
    )}
    {error ? <><Text style={staffUi.error}>{error}</Text><StaffButton secondary label="Retry" onPress={() => setRetry(n => n + 1)} /></> : null}
    {catalog.length === 0 && !error ? <Text translate style={staffUi.muted}>Loading permissions…</Text> : null}
    {modules.map(module => {
      const items = catalog.filter(p => p.module === module);
      const groups = sortGroupNames(module, [...new Set(items.map(p => p.group_name))], name => name);
      const moduleKey = JSON.stringify([module]);
      return <View key={module} style={staffUi.card}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ expanded: !!expanded[moduleKey] }}
          disabled={disabled}
          onPress={() => toggle(moduleKey)}
          style={[staffUi.menuRow, { borderBottomWidth: 0 }]}
        >
          <Text style={[staffUi.rowTitle, { flex: 1 }]}>{module}</Text>
          <Text style={staffUi.muted}>{items.filter(p => effective[p.key]).length} / {items.length}</Text>
          <Ionicons name={expanded[moduleKey] ? "chevron-up" : "chevron-down"} size={16} color={pearl.muted} />
        </TouchableOpacity>
        {expanded[moduleKey] ? groups.length > 1 ? groups.map(group => {
          const groupKey = JSON.stringify([module, group]);
          return <View key={groupKey}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: !!expanded[groupKey] }}
              disabled={disabled}
              onPress={() => toggle(groupKey)}
              style={[staffUi.menuRow, { borderBottomWidth: 0 }]}
            >
              <Text style={[staffUi.label, { flex: 1, marginBottom: 0 }]}>{group ?? "General"}</Text>
              <Ionicons name={expanded[groupKey] ? "chevron-up" : "chevron-down"} size={15} color={pearl.muted} />
            </TouchableOpacity>
            {expanded[groupKey] ? rows(items.filter(p => p.group_name === group)) : null}
          </View>;
        }) : rows(items) : null}
      </View>;
    })}
  </View>;
}
