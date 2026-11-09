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
    () =>
      Object.fromEntries(
        view?.permissions.map((p) => [p.key, p.effective]) ?? [],
      ),
    [view],
  );
  const save = async (key: string, enabled: boolean) => {
    if (!selected || !view || saving) return;
    const staffId = selected;
    setSaving(true);
    setError("");
    const keys = enabled
      ? cascadeOnKeys(catalog, key)
      : cascadeOffKeys(catalog, key);
    keys.add(key);
    try {
      const result = await staffPermissionsService.save(
        staffId,
        Object.fromEntries([...keys].map((k) => [k, enabled])),
      );
      if (selectedRef.current === staffId) setView(result);
    } catch (e) {
      if (selectedRef.current === staffId) setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
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
              <Text accessibilityRole="alert" style={staffUi.error}>
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
            <Text style={staffUi.muted}>No staff yet.</Text>
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
                              <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityState={{
                                  expanded: !!expanded[module],
                                }}
                                onPress={() => toggle(module)}
                                style={[
                                  staffUi.menuRow,
                                  { borderBottomWidth: 0 },
                                ]}
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
                        {saving ? (
                          <Text style={staffUi.muted}>
                            Saving permissions for {member?.name}…
                          </Text>
                        ) : null}
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
