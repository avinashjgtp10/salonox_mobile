import { useCallback, useRef, useState } from "react";
import { Modal, View } from "react-native";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { KeyboardAwareFlatList } from "@/components/ui/KeyboardAwareScrollView";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { hasInventoryPermission } from "@/utils/permissions";
import { productAuditService as service } from "@/services/productAudit.service";
import { getApiErrorMessage } from "@/services/api";
import type { ProductAudit } from "@/types/productAudit";
import { auditUpdates, parseAuditCount } from "./auditHelpers";
import {
  AuditButton,
  AuditCard,
  AuditField,
  AuditPage,
  auditStyles,
  auditStatusLabel,
} from "./AuditUI";
import { SmartProductScanner } from "./SmartProductScanner";

export default function ProductAuditDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAppSelector(selectCurrentUser);
  const salonId = useAppSelector(selectActiveBranchId);
  // Reset all local drafts and camera state if the authenticated context changes.
  return <Details key={`${user?.id}:${salonId}:${id}`} id={id} />;
}
function Details({ id }: { id: string }) {
  const user = useAppSelector(selectCurrentUser);
  const c = useThemeColors();
  const canView = hasInventoryPermission(user, "view_product_audit");
  const canPerform = hasInventoryPermission(user, "create_product_audit");
  const canApprove = hasInventoryPermission(user, "approve_product_audit");
  const canCreateProduct =
    (hasInventoryPermission(user, "view_products") &&
      hasInventoryPermission(user, "create_products")) ||
    hasInventoryPermission(user, "add_consumable");
  const [audit, setAudit] = useState<ProductAudit | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { count: string; reason: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scanner, setScanner] = useState(false);
  const [confirm, setConfirm] = useState<
    "submit" | "approve" | "delete" | null
  >(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const lock = useRef(false);
  const sequence = useRef(0);
  const apply = (next: ProductAudit) => {
    setAudit(next);
    setDrafts((prev) =>
      next.status !== "in_progress"
        ? {}
        : Object.fromEntries(
            Object.entries(prev).filter(([itemId]) =>
              next.items.some((i) => i.id === itemId),
            ),
          ),
    );
  };
  const load = useCallback(async () => {
    if (!canView || !id) {
      setLoading(false);
      return;
    }
    const seq = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const next = await service.get(id);
      if (seq === sequence.current) apply(next);
    } catch (e) {
      if (seq === sequence.current) setError(getApiErrorMessage(e));
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, [canView, id]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        sequence.current++;
      };
    }, [load]),
  );
  const mutate = async (action: () => Promise<ProductAudit>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      apply(await action());
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const editable = audit?.status === "in_progress" && canPerform;
  const reviewable =
    audit?.status === "pending_review" &&
    canApprove &&
    audit.auditor_id !== user?.id;
  const updateDraft = (
    itemId: string,
    field: "count" | "reason",
    value: string,
  ) => {
    const item = audit?.items.find((i) => i.id === itemId);
    if (!item) return;
    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? {
          count:
            item.physical_qty === null ? "" : String(Number(item.physical_qty)),
          reason: item.reason ?? "",
        }),
        [field]: value,
      },
    }));
  };
  const performConfirmed = async () => {
    const action = confirm;
    setConfirm(null);
    if (!audit) return;
    if (action === "submit")
      await mutate(() => service.submit(id, auditUpdates(audit.items, drafts)));
    if (action === "approve") await mutate(() => service.approve(id));
    if (action === "delete" && !lock.current) {
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        await service.delete(id);
        router.replace("/product-audits" as Href);
      } catch (e) {
        setError(getApiErrorMessage(e));
      } finally {
        lock.current = false;
        setBusy(false);
      }
    }
  };
  if (!canView)
    return (
      <AuditPage title="Product Audit">
        <Text>You do not have permission to view this audit.</Text>
      </AuditPage>
    );
  return (
    <AuditPage title={audit?.name ?? "Product Audit"} scrollable={false}>
      {editable && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <AuditButton
            label="Submit for review"
            disabled={busy || loading || !audit?.items.length}
            onPress={() => setConfirm("submit")}
          />
        </View>
      )}
      <KeyboardAwareFlatList
        autoReveal
        data={audit?.items ?? []}
        extraData={{ drafts, busy, loading, editable }}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 14 }}>
            {loading && <ActivityIndicator />}
            {!!error && <Text style={{ color: c.error }}>{error}</Text>}
            {audit && (
              <>
                <AuditCard>
                  <Text style={{ color: c.primary, fontWeight: "800" }}>
                    {auditStatusLabel(audit.status)}
                  </Text>
                  <Text style={{ color: c.text2 }}>
                    Auditor: {audit.auditor_name ?? "Unknown"}
                    {audit.status !== "in_progress" && (
                      <> · Reviewer: {audit.reviewer_name ?? "Not reviewed"}</>
                    )}
                  </Text>
                  {audit.notes && (
                    <Text style={{ color: c.text }}>{audit.notes}</Text>
                  )}
                  {audit.rejection_reason && (
                    <Text style={{ color: c.error }}>
                      Rejected: {audit.rejection_reason}
                    </Text>
                  )}
                  <Text style={{ color: c.text2 }}>
                    Counts are in packs / bottles. Stock is updated only after
                    approval.
                  </Text>
                </AuditCard>
                {editable && (
                  <AuditButton
                    label="Scan or find a product"
                    disabled={busy || loading}
                    onPress={() => setScanner(true)}
                  />
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const count =
            drafts[item.id]?.count ??
            (item.physical_qty === null
              ? ""
              : String(Number(item.physical_qty)));
          const reason = drafts[item.id]?.reason ?? item.reason ?? "";
          let difference: number | null = null;
          try {
            const physical = parseAuditCount(count);
            if (physical !== null)
              difference = physical - Number(item.system_qty);
          } catch {
            /* inline field retains invalid value for correction */
          }
          return (
            <AuditCard key={item.id}>
              <Text
                style={{ color: c.heading, fontSize: 17, fontWeight: "800" }}
              >
                {item.product_name}
              </Text>
              <Text style={{ color: c.text2 }}>
                System: {Number(item.system_qty)} packs
                {difference !== null
                  ? ` · Difference: ${difference > 0 ? "+" : ""}${difference}`
                  : ""}
              </Text>
              <AuditField
                label="Physical count (packs)"
                numeric
                value={count}
                onChange={(v) => updateDraft(item.id, "count", v)}
                editable={!!editable && !busy && !loading}
              />
              <AuditField
                label="Reason for difference"
                value={reason}
                onChange={(v) => updateDraft(item.id, "reason", v)}
                editable={!!editable && !busy && !loading}
              />
              {editable && (
                <View style={auditStyles.row}>
                  <AuditButton
                    label="Save count"
                    disabled={busy || loading}
                    onPress={() =>
                      void mutate(async () => {
                        const physical_qty = parseAuditCount(count);
                        const next = await service.updateItem(id, item.id, {
                          physical_qty,
                          reason: reason.trim() || null,
                        });
                        setDrafts((prev) => {
                          const copy = { ...prev };
                          delete copy[item.id];
                          return copy;
                        });
                        return next;
                      })
                    }
                  />
                  <AuditButton
                    label="Remove"
                    danger
                    disabled={busy || loading}
                    onPress={() =>
                      void mutate(() => service.removeItem(id, item.id))
                    }
                  />
                </View>
              )}
            </AuditCard>
          );
        }}
        ListEmptyComponent={
          audit && !loading ? (
            <Text style={{ color: c.text2 }}>
              Add products to begin counting.
            </Text>
          ) : null
        }
        ListFooterComponent={
          <View style={{ gap: 14, marginTop: 14 }}>
            {audit && (
              <>
                {reviewable && (
                  <View style={auditStyles.row}>
                    <AuditButton
                      label="Approve and reconcile stock"
                      disabled={busy || loading}
                      onPress={() => setConfirm("approve")}
                    />
                    <AuditButton
                      label="Reject"
                      danger
                      disabled={busy || loading}
                      onPress={() => setRejectOpen(true)}
                    />
                  </View>
                )}
                {audit.status === "pending_review" &&
                  audit.auditor_id === user?.id && (
                    <Text style={{ color: c.text2 }}>
                      Another authorized reviewer must approve or reject your
                      audit.
                    </Text>
                  )}
                {audit.status === "rejected" && canPerform && (
                  <AuditButton
                    label="Reopen for recount"
                    disabled={busy || loading}
                    onPress={() => void mutate(() => service.reopen(id))}
                  />
                )}
                <Text
                  style={{ color: c.heading, fontSize: 18, fontWeight: "800" }}
                >
                  Audit history
                </Text>
                {audit.history.map((h) => (
                  <AuditCard key={h.id}>
                    <Text style={{ color: c.text }}>
                      {h.action} · {h.actor_name ?? "Unknown"}
                    </Text>
                    {h.note && <Text style={{ color: c.text2 }}>{h.note}</Text>}
                    <Text style={{ color: c.text2 }}>
                      {new Date(h.created_at).toLocaleString()}
                    </Text>
                  </AuditCard>
                ))}
                {["salon_owner", "admin"].includes(
                  user?.role?.toLowerCase() ?? "",
                ) && (
                  <AuditButton
                    label="Delete audit"
                    danger
                    disabled={busy || loading}
                    onPress={() => setConfirm("delete")}
                  />
                )}
              </>
            )}
            <AuditButton
              label="Refresh"
              disabled={busy || loading}
              onPress={() => void load()}
            />
          </View>
        }
      />
      {scanner && audit && (
        <SmartProductScanner
          auditId={id}
          canCreateProduct={canCreateProduct}
          onClose={() => setScanner(false)}
          onSelect={async (productId) => {
            if (lock.current)
              throw new Error("Please wait for the current change to finish.");
            lock.current = true;
            setBusy(true);
            try {
              apply(await service.addItems(id, [productId]));
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        />
      )}
      <ConfirmationModal
        visible={!!confirm}
        title={
          confirm === "approve"
            ? "Reconcile inventory?"
            : confirm === "delete"
              ? "Delete this audit?"
              : "Submit for review?"
        }
        description={
          confirm === "approve"
            ? "This sets official stock to the physical counts and writes stock ledger adjustments."
            : confirm === "delete"
              ? "The audit record will be deleted permanently."
              : "Your counts will be saved and the audit will become read-only until reviewed."
        }
        cancelLabel="Cancel"
        confirmVariant={confirm === "delete" ? "destructive" : "default"}
        confirmLabel={
          confirm === "approve"
            ? "Approve"
            : confirm === "delete"
              ? "Delete"
              : "Submit"
        }
        onCancel={() => setConfirm(null)}
        onConfirm={performConfirmed}
      />
      <Modal
        visible={rejectOpen}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setRejectOpen(false);
        }}
      >
        <AuditPage
          title="Reject audit"
          onBack={() => {
            if (!busy) setRejectOpen(false);
          }}
        >
          <AuditField
            label="Rejection reason"
            value={rejectReason}
            onChange={setRejectReason}
          />
          {!!error && <Text style={{ color: c.error }}>{error}</Text>}
          <AuditButton
            label="Reject audit"
            danger
            disabled={busy || !rejectReason.trim()}
            onPress={() =>
              void mutate(async () => {
                const next = await service.reject(id, rejectReason.trim());
                setRejectOpen(false);
                setRejectReason("");
                return next;
              })
            }
          />
          <AuditButton
            label="Cancel"
            disabled={busy}
            onPress={() => setRejectOpen(false)}
          />
        </AuditPage>
      </Modal>
    </AuditPage>
  );
}
