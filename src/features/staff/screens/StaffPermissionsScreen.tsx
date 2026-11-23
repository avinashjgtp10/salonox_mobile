import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { staffService } from "@/services/staff.service";
import {
  staffPermissionsService,
  type StaffPermission,
  type StaffPermissionView,
} from "@/services/staffPermissions.service";
import { getApiErrorMessage } from "@/services/api";
import { matchesTeamSearch, type StaffMember } from "@/data/teamData";
import {
  StaffAvatar,
  StaffButton,
  StaffHeader,
  staffUi,
} from "../components/StaffPearl";
import {
  cascadeOnKeys,
  cascadeOffKeys,
  lockedByMaster,
} from "../utils/permissionCascade";
import {
  sortModuleNames,
  sortGroupNames,
} from "../utils/permissionModuleOrder";
export function StaffPermissionsScreen() {
  const params = useLocalSearchParams<{ staffId?: string }>();
  const [staff, setStaff] = useState<StaffMember[]>([]),
    [catalog, setCatalog] = useState<StaffPermission[]>([]),
    [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(
      params.staffId ?? null,
    ),
    [view, setView] = useState<StaffPermissionView | null>(null),
    [loading, setLoading] = useState(true),
    [loadingPermissions, setLoadingPermissions] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Optimistic values for the switches currently being saved. The Switch is a
  // controlled component reading `effective`, which only ever held server
  // state — so a tap animated the switch across, the immediate re-render snapped
  // it back to its old value, and the server response flipped it again once the
  // request landed. That three-step flicker is what reads as the toggle
  // "dancing". Holding the intended value here until the response arrives keeps
  // the switch where the user put it.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [changingRole, setChangingRole] = useState(false);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const request = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    if (params.staffId) setSelected(params.staffId);
  }, [params.staffId]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [permissions, members] = await Promise.all([
        staffPermissionsService.catalog(),
        (async () => {
          const all: StaffMember[] = [];
          for (let page = 1; ; page++) {
            const result = await staffService.getStaff({ page, limit: 100 });
            all.push(...result.staffMembers);
            if (!result.pagination.hasMore || !result.staffMembers.length)
              break;
          }
          return all;
        })(),
      ]);
      setCatalog(permissions);
      setStaff(members);
      // Not fatal: without it the Manager pill stays tappable and the backend
      // still rejects a second Manager with its own message.
      setManagerIds(await staffPermissionsService.managerIds().catch(() => []));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const generation = ++request.current;
    setView(null);
    setExpanded({});
    setPending({});
    if (!selected) return;
    setLoadingPermissions(true);
    setError("");
    staffPermissionsService
      .get(selected)
      .then((result) => {
        if (generation === request.current) setView(result);
      })
      .catch((e) => {
        if (generation === request.current) setError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (generation === request.current) setLoadingPermissions(false);
      });
    return () => {
      request.current = generation + 1;
    };
  }, [selected]);
  const effective = useMemo(
    () => ({
      ...Object.fromEntries(
        view?.permissions.map((p) => [p.key, p.effective]) ?? [],
      ),
      ...pending,
    }),
    [view, pending],
  );
  const saveOverrides = async (overrides: Record<string, boolean>) => {
    if (!selected || !view || saving || !Object.keys(overrides).length) return;
    const staffId = selected;
    setSaving(true);
    setError("");
    // Show the new values straight away; the response replaces them, and a
    // failure drops them so the switches fall back to the server's answer.
    setPending((current) => ({ ...current, ...overrides }));
    try {
      const result = await staffPermissionsService.save(staffId, overrides);
      if (selectedRef.current === staffId) {
        setView(result);
        setPending({});
      }
    } catch (e) {
      if (selectedRef.current === staffId) {
        setError(getApiErrorMessage(e));
        setPending({});
      }
    } finally {
      setSaving(false);
    }
  };
  /** Every key `permissions` turns on/off with itself, as one save payload. */
  const bulkOverrides = (permissions: StaffPermission[], enabled: boolean) => {
    const overrides: Record<string, boolean> = {};
    for (const permission of permissions) {
      overrides[permission.key] = enabled;
      const related = enabled
        ? cascadeOnKeys(catalog, permission.key)
        : cascadeOffKeys(catalog, permission.key);
      for (const key of related) overrides[key] = enabled;
    }
    return overrides;
  };
  const changeRole = async (roleName: "Staff" | "Manager") => {
    if (!selected || saving || changingRole || view?.role?.name === roleName) return;
    const staffId = selected;
    setChangingRole(true);
    setError("");
    try {
      const result = await staffPermissionsService.assignNamedRole(staffId, roleName);
      const owners = await staffPermissionsService.managerIds().catch(() => null);
      if (selectedRef.current === staffId) {
        setView(result);
        setPending({});
        // Keeps the Manager pill correct for every other staff member in the
        // list now that this one has taken or released the role.
        if (owners) setManagerIds(owners);
      }
    } catch (e) {
      if (selectedRef.current === staffId) setError(getApiErrorMessage(e));
    } finally {
      setChangingRole(false);
    }
  };
  const save = (key: string, enabled: boolean) => {
    const keys = enabled
      ? cascadeOnKeys(catalog, key)
      : cascadeOffKeys(catalog, key);
    keys.add(key);
    return saveOverrides(
      Object.fromEntries([...keys].map((k) => [k, enabled])),
    );
  };
  // Master switch, like the web role editor's: every permission on or off in a
  // single call. Running the cascade per key also pulls in prerequisites that
  // this screen hides from the catalog (view_sales and friends), so nothing is
  // left granted-but-unreachable.
  const allOn =
    catalog.length > 0 && catalog.every((p) => effective[p.key] === true);
  const modules = sortModuleNames(
    [...new Set(catalog.map((p) => p.module))],
    (name) => name,
  );
  const member = staff.find((m) => m.id === selected);
  const rows = (permissions: StaffPermission[]) =>
    permissions.map((p) => {
      const locked = lockedByMaster(p.key, (key) => effective[key] === true);
      return (
        <View
          key={p.key}
          style={[
            staffUi.menuRow,
            { borderBottomWidth: 0, opacity: locked?.length ? 0.6 : 1 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={staffUi.rowTitle}>{p.name}</Text>
            {p.description ? (
              <Text style={staffUi.muted}>{p.description}</Text>
            ) : null}
            {locked ? (
              <Text style={staffUi.muted}>
                Enable{" "}
                {catalog.find((item) => item.key === locked)?.name ?? locked}{" "}
                first
              </Text>
            ) : null}
          </View>
          <Switch
            accessibilityLabel={p.name}
            disabled={saving || !!locked}
            value={effective[p.key] === true}
            onValueChange={(value) => void save(p.key, value)}
            thumbColor="#FFFFFF"
            trackColor={{ false: pearl.divider, true: pearl.accent }}
          />
        </View>
      );
    });
  const toggle = (key: string) =>
    setExpanded((value) => ({ ...value, [key]: !value[key] }));
  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "bottom"]} style={staffUi.screen}>
        <AppStatusBar />
        <ScrollView
          contentContainerStyle={staffUi.content}
          keyboardShouldPersistTaps="handled"
        >
          <StaffHeader title="Permissions" subtitle="Changes save instantly" />
          <TextInput
            accessibilityLabel="Search staff"
            value={search}
            onChangeText={setSearch}
            placeholder="Search staff"
            placeholderTextColor={pearl.placeholder}
            style={staffUi.input}
          />
          {loading ? <ActivityIndicator /> : null}
          {error ? (
            <View style={staffUi.formCard}>
              <Text translate accessibilityRole="alert" style={staffUi.error}>
                {error}
              </Text>
              <StaffButton
                secondary
                label="Retry"
                onPress={() => {
                  if (selected) {
                    setSelected(null);
                    setTimeout(() => setSelected(selected), 0);
                  } else void load();
                }}
              />
            </View>
          ) : null}
          {!loading && !staff.length ? (
            <Text translate style={staffUi.muted}>No staff yet.</Text>
          ) : null}
          {staff
            .filter((m) => matchesTeamSearch(m, search))
            .map((m) => (
              <View key={m.id} style={staffUi.card}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: selected === m.id }}
                  disabled={saving}
                  onPress={() => setSelected(selected === m.id ? null : m.id)}
                  style={[staffUi.menuRow, { borderBottomWidth: 0 }]}
                >
                  <StaffAvatar initials={m.initials} uri={m.avatarUrl} />
                  <View style={{ flex: 1 }}>
                    <Text style={staffUi.rowTitle}>{m.name}</Text>
                    <Text style={staffUi.muted}>
                      {selected === m.id && view?.role
                        ? view.role.name
                        : m.permissionLevel?.toLowerCase() === "manager"
                          ? "Manager"
                          : "Staff"}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected === m.id ? "chevron-up" : "chevron-down"}
                    color={pearl.muted}
                    size={18}
                  />
                </TouchableOpacity>
                {selected === m.id ? (
                  <View style={{ gap: 10, padding: 12 }}>
                    {loadingPermissions ? <ActivityIndicator /> : null}
                    {view ? (
                      <>
                        <Text style={staffUi.label}>
                          Assigned role: {view.role?.name ?? "No role assigned"}
                        </Text>
                        {/* Role switcher, same two roles the web's Role:
                            dropdown offers. Switching reassigns the staff
                            member's role; their individual overrides stay and
                            keep overriding whatever the new role grants. */}
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {(["Staff", "Manager"] as const).map((roleName) => {
                            const active = view.role?.name === roleName;
                            // One Manager per salon: blocked when somebody else
                            // already holds it.
                            const takenByOther =
                              roleName === "Manager" &&
                              managerIds.some((id) => id !== m.id);
                            return (
                              <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityState={{
                                  disabled: takenByOther,
                                  selected: active,
                                }}
                                disabled={saving || changingRole || active || takenByOther}
                                key={roleName}
                                onPress={() => void changeRole(roleName)}
                                style={{
                                  backgroundColor: active ? pearl.accent : "transparent",
                                  borderColor: active ? pearl.accent : pearl.divider,
                                  borderRadius: 999,
                                  borderWidth: 1,
                                  opacity: changingRole || takenByOther ? 0.5 : 1,
                                  paddingHorizontal: 16,
                                  paddingVertical: 7,
                                }}
                              >
                                <Text
                                  translate
                                  style={{
                                    color: active ? "#FFFFFF" : pearl.muted,
                                    fontWeight: "600",
                                  }}
                                >
                                  {roleName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {managerIds.length > 0 && !managerIds.includes(m.id) ? (
                          <Text translate style={staffUi.muted}>
                            Only one Manager is allowed per salon. Change the
                            current Manager first.
                          </Text>
                        ) : null}
                        {/* Above the module list, not below it: at the bottom
                            of ~390 rows the save status was off screen while
                            the switch the user just tapped was in view. */}
                        {saving || changingRole ? (
                          <View
                            accessibilityRole="progressbar"
                            style={{
                              alignItems: "center",
                              flexDirection: "row",
                              gap: 8,
                            }}
                          >
                            <ActivityIndicator />
                            <Text style={staffUi.muted}>
                              {changingRole
                                ? `Updating role for ${member?.name}…`
                                : `Saving permissions for ${member?.name}…`}
                            </Text>
                          </View>
                        ) : null}
                        <View
                          style={[staffUi.menuRow, { borderBottomWidth: 0 }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text translate style={staffUi.rowTitle}>
                              All permissions
                            </Text>
                            <Text translate style={staffUi.muted}>
                              Turn every permission for this staff member on or
                              off at once.
                            </Text>
                          </View>
                          <Switch
                            accessibilityLabel="Toggle all permissions"
                            disabled={saving || catalog.length === 0}
                            value={allOn}
                            onValueChange={(value) =>
                              void saveOverrides(bulkOverrides(catalog, value))
                            }
                            thumbColor="#FFFFFF"
                            trackColor={{
                              false: pearl.divider,
                              true: pearl.accent,
                            }}
                          />
                        </View>
                        {modules.map((module) => {
                          const permissions = catalog.filter(
                            (p) => p.module === module,
                          );
                          const groups = sortGroupNames(
                            module,
                            [...new Set(permissions.map((p) => p.group_name))],
                            (name) => name,
                          );
                          return (
                            <View key={module} style={staffUi.card}>
                              {/* The expander and the module switch are
                                  siblings, not nested: with the Switch inside
                                  the TouchableOpacity, a tap on or near the
                                  switch bubbled up and expanded/collapsed the
                                  module instead of toggling it. */}
                              <View
                                style={[
                                  staffUi.menuRow,
                                  { borderBottomWidth: 0 },
                                ]}
                              >
                                <TouchableOpacity
                                  accessibilityRole="button"
                                  accessibilityState={{
                                    expanded: !!expanded[module],
                                  }}
                                  onPress={() => toggle(module)}
                                  style={{
                                    alignItems: "center",
                                    flex: 1,
                                    flexDirection: "row",
                                    gap: 8,
                                  }}
                                >
                                <Text style={[staffUi.rowTitle, { flex: 1 }]}>
                                  {module}
                                </Text>
                                <Text style={staffUi.muted}>
                                  {
                                    permissions.filter((p) => effective[p.key])
                                      .length
                                  }{" "}
                                  / {permissions.length}
                                </Text>
                                <Ionicons
                                  name={
                                    expanded[module]
                                      ? "chevron-up"
                                      : "chevron-down"
                                  }
                                  size={16}
                                  color={pearl.muted}
                                />
                                </TouchableOpacity>
                                <Switch
                                  accessibilityLabel={
                                    "Toggle all " + module + " permissions"
                                  }
                                  disabled={saving || !permissions.length}
                                  value={
                                    permissions.length > 0 &&
                                    permissions.every(
                                      (p) => effective[p.key] === true,
                                    )
                                  }
                                  onValueChange={(value) =>
                                    void saveOverrides(
                                      bulkOverrides(permissions, value),
                                    )
                                  }
                                  thumbColor="#FFFFFF"
                                  trackColor={{
                                    false: pearl.divider,
                                    true: pearl.accent,
                                  }}
                                />
                              </View>
                              {expanded[module]
                                ? groups.length > 1
                                  ? groups.map((group) => {
                                      const groupKey = module + ":" + group;
                                      return (
                                        <View key={groupKey}>
                                          <TouchableOpacity
                                            onPress={() => toggle(groupKey)}
                                            style={[
                                              staffUi.menuRow,
                                              { borderBottomWidth: 0 },
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                staffUi.label,
                                                { flex: 1, marginBottom: 0 },
                                              ]}
                                            >
                                              {group ?? "General"}
                                            </Text>
                                            <Ionicons
                                              name={
                                                expanded[groupKey]
                                                  ? "chevron-up"
                                                  : "chevron-down"
                                              }
                                              size={15}
                                              color={pearl.muted}
                                            />
                                          </TouchableOpacity>
                                          {expanded[groupKey]
                                            ? rows(
                                                permissions.filter(
                                                  (p) => p.group_name === group,
                                                ),
                                              )
                                            : null}
                                        </View>
                                      );
                                    })
                                  : rows(permissions)
                                : null}
                            </View>
                          );
                        })}
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}
        </ScrollView>
      </SafeAreaView>
    </PearlBackground>
  );
}
