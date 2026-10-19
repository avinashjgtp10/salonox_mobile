import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { router, type Href, useFocusEffect } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { InfiniteScrollLoader } from "@/components/ui/InfiniteScrollLoader";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { canPerformProductAudit, canViewProductAudit } from "@/utils/permissions";
import { productAuditService as service } from "@/services/productAudit.service";
import { getApiErrorMessage } from "@/services/api";
import { salonService } from "@/services/salon.service";
import type {
  AuditBranch,
  AuditPerson,
  AuditListRow,
  AuditStatus,
} from "@/types/productAudit";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  AuditPage,
  AuditCard,
  AuditField,
  AuditButton,
  auditStyles,
  auditStatusLabel,
} from "./AuditUI";
import { AuditPersonField } from "./AuditPersonField";

export default function ProductAuditListScreen() {
  const user = useAppSelector(selectCurrentUser);
  const salonId = useAppSelector(selectActiveBranchId);
  return <List key={`${user?.id}:${salonId}`} />;
}
function List() {
  const user = useAppSelector(selectCurrentUser);
  const salonId = useAppSelector(selectActiveBranchId);
  const c = useThemeColors();
  const canView = canViewProductAudit(user);
  const canCreate = canPerformProductAudit(user);
  const [rows, setRows] = useState<AuditListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<AuditStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [branches, setBranches] = useState<AuditBranch[]>([]);
  const [branchId, setBranchId] = useState("");
  const currentPerson: AuditPerson = { id: user?.id ?? "", name: user?.fullName || user?.firstName || user?.email || "You" };
  const [auditor, setAuditor] = useState<AuditPerson | null>(null);
  const sequence = useRef(0);
  const mutationLock = useRef(false);
  const requestLock = useRef(false);
  const nextPage = useRef(1);
  const hasMore = useRef(false);
  const pageFailed = useRef(false);
  const listRef = useRef<FlatList<AuditListRow>>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const load = useCallback(
    async (mode: "reset" | "refresh" | "more" = "reset") => {
      if (
        !canView ||
        (mode === "more" && (requestLock.current || !hasMore.current))
      )
        return;
      const seq = mode === "more" ? sequence.current : ++sequence.current;
      const requestedPage = mode === "more" ? nextPage.current : 1;
      requestLock.current = true;
      pageFailed.current = false;
      if (mode !== "more") {
        nextPage.current = 1;
        hasMore.current = false;
      }
      if (mode === "reset") {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        setRows([]);
        setTotal(0);
      }
      setLoading(true);
      setRefreshing(mode === "refresh");
      setError("");
      try {
        const result = await service.list({
          search: term || undefined,
          status,
          page: requestedPage,
          limit: 20,
        });
        if (seq === sequence.current) {
          setRows((previous) =>
            mode === "more"
              ? [
                  ...new Map(
                    [...previous, ...result.data].map((row) => [row.id, row]),
                  ).values(),
                ]
              : result.data,
          );
          setTotal(result.total);
          nextPage.current = requestedPage + 1;
          hasMore.current =
            result.data.length > 0 && requestedPage * 20 < result.total;
        }
      } catch (e) {
        if (seq === sequence.current) {
          if (mode === "reset") setRows([]);
          pageFailed.current = mode === "more";
          setError(getApiErrorMessage(e));
        }
      } finally {
        if (seq === sequence.current) {
          requestLock.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [canView, term, status],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        sequence.current++;
      };
    }, [load]),
  );
  const openCreate = async () => {
    if (saving) return;
    setError("");
    setBranches([]);
    setBranchId("");
    setCreating(true);
    setAuditor(currentPerson);
    setSaving(true);
    try {
      const id =
        user?.salonId || salonId || (await salonService.getSalonMe()).id;
      const result = await service.branches(id);
      setBranches(result);
      setBranchId(result.find((b) => b.is_main)?.id ?? result[0]?.id ?? "");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const create = async () => {
    if (!branchId || !name.trim() || mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    setError("");
    try {
      if (name.trim().length > 200) throw new Error("Audit names must be 200 characters or fewer.");
      const audit = await service.create({
        branch_id: branchId,
        name: name.trim(),
        notes: notes.trim() || undefined,
        auditor_id: auditor?.id || undefined,
      });
      setCreating(false);
      setName("");
      setNotes("");
      router.push(`/product-audits/${audit.id}` as Href);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };
  if (!canView)
    return (
      <AuditPage title="Product Audit">
        <Text>
          Your account does not have permission to view product audits.
        </Text>
      </AuditPage>
    );
  return (
    <AuditPage title="Product Audit" scrollable={false}>
      <RefreshViewport>
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => row.id}
          contentContainerStyle={auditStyles.body}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (!pageFailed.current) void load("more");
          }}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              colors={[c.primary]}
              tintColor={c.primary}
              refreshing={refreshing}
              onRefresh={() => void load("refresh")}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: 14 }}>
              <Text style={{ color: c.text2 }}>
                Count physical packs, explain differences, and submit for
                independent review.
              </Text>
              {canCreate && (
                <AuditButton
                  label="New audit"
                  disabled={saving}
                  onPress={() => void openCreate()}
                />
              )}
              <AuditField
                label="Search audits"
                value={search}
                onChange={setSearch}
              />
              <View style={auditStyles.row}>
                {(
                  [
                    undefined,
                    "in_progress",
                    "pending_review",
                    "complete",
                    "rejected",
                  ] as const
                ).map((s) => (
                  <TouchableOpacity
                    key={s ?? "all"}
                    accessibilityRole="button"
                    onPress={() => {
                      setStatus(s);
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor:
                        status === s ? c.backgroundSelected : c.card,
                    }}
                  >
                    <Text style={{ color: c.text }}>
                      {s ? auditStatusLabel(s) : "All"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!error && !creating && (
                <Text style={{ color: c.error }}>{error}</Text>
              )}
              <Text style={{ color: c.text2 }}>{total} audits</Text>
            </View>
          }
          renderItem={({ item: row }) => (
            <TouchableOpacity
              key={row.id}
              accessibilityRole="button"
              onPress={() => router.push(`/product-audits/${row.id}` as Href)}
            >
              <AuditCard>
                <Text
                  style={{ color: c.heading, fontWeight: "800", fontSize: 17 }}
                >
                  {row.name}
                </Text>
                <Text style={{ color: c.primaryText }}>
                  {auditStatusLabel(row.status)}
                </Text>
                <Text style={{ color: c.text2 }}>
                  {row.item_count} products · {row.diff_count} differences ·{" "}
                  {row.auditor_name ?? "Auditor"}
                </Text>
                <Text style={{ color: c.text2 }}>Updated: {new Date(row.updated_at).toLocaleString()}</Text>
              </AuditCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator />
            ) : error ? (
              <AuditButton label="Retry" onPress={() => void load()} />
            ) : (
              <Text style={{ color: c.text2 }}>No audits found.</Text>
            )
          }
          ListFooterComponent={
            <>
              <InfiniteScrollLoader
                loading={loading && rows.length > 0 && !refreshing}
                label="Loading audits"
              />
              {error && rows.length > 0 && (
                <AuditButton
                  label="Retry"
                  disabled={loading}
                  onPress={() =>
                    void load(pageFailed.current ? "more" : "refresh")
                  }
                />
              )}
            </>
          }
        />
      </RefreshViewport>
      <Modal
        visible={creating}
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setCreating(false);
        }}
      >
        <AuditPage
          title="New audit"
          onBack={() => {
            if (!saving) setCreating(false);
          }}
        >
          <AuditField label="Audit name" value={name} onChange={setName} />
          <AuditField
            label="Notes (optional)"
            value={notes}
            onChange={setNotes}
          />
          <AuditPersonField label="Auditor" value={auditor} onChange={setAuditor} currentUser={currentPerson} disabled={saving} />
          <Text style={{ color: c.text }}>Inventory branch</Text>
          <ScrollView>
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                disabled={saving}
                onPress={() => setBranchId(b.id)}
                style={{
                  padding: 14,
                  backgroundColor:
                    b.id === branchId ? c.backgroundSelected : c.card,
                }}
              >
                <Text style={{ color: c.text }}>
                  {b.id === branchId ? "✓ " : ""}
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!!error && <Text style={{ color: c.error }}>{error}</Text>}
          <AuditButton
            label={saving ? "Please wait…" : "Create audit"}
            disabled={saving || !name.trim() || !branchId}
            onPress={() => void create()}
          />
          <AuditButton
            label="Cancel"
            disabled={saving}
            onPress={() => setCreating(false)}
          />
        </AuditPage>
      </Modal>
    </AuditPage>
  );
}
