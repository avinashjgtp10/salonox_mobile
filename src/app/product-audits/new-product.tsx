import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { AuditButton, AuditPage } from "@/features/productAudit/AuditUI";
import ProductFormScreen from "@/features/products/components/ProductFormScreen";
import { productAuditService } from "@/services/productAudit.service";
import { getApiErrorMessage } from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasInventoryPermission } from "@/utils/permissions";
import type { RecognizedProduct } from "@/types/productAudit";

export default function NewAuditProduct() {
  const { auditId, draft } = useLocalSearchParams<{
    auditId: string;
    draft?: string;
  }>();
  const user = useAppSelector(selectCurrentUser);
  const [productId, setProductId] = useState<string | null>(null);
  const physicalQuantity = useRef<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [prefill] = useState<Partial<RecognizedProduct>>(() => {
    try {
      const input = JSON.parse(draft ?? "{}");
      const result: Partial<RecognizedProduct> = {};
      for (const key of [
        "name",
        "barcode",
        "brand",
        "variant",
        "size",
        "description",
        "measure_unit",
      ] as const)
        if (typeof input[key] === "string")
          result[key] = input[key].slice(0, 1000);
      if (
        typeof input.bottle_size === "number" &&
        Number.isFinite(input.bottle_size) &&
        input.bottle_size > 0
      )
        result.bottle_size = input.bottle_size;
      return result;
    } catch {
      return {};
    }
  });
  const attach = useCallback(
    async (id: string) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        const audit = await productAuditService.addItems(auditId, [id]);
        if (physicalQuantity.current !== null) {
          const item = audit.items.find((row) => row.product_id === id);
          if (!item) throw new Error("Product was not returned in the audit. Retry adding it.");
          await productAuditService.updateItem(auditId, item.id, {
            physical_qty: physicalQuantity.current,
            reason: "Physical quantity entered when adding the product",
          });
        }
        router.replace(`/product-audits/${auditId}` as Href);
      } catch (e) {
        setError(getApiErrorMessage(e));
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [auditId],
  );
  useEffect(() => {
    if (productId) void attach(productId);
  }, [productId, attach]);
  const allowed =
    hasInventoryPermission(user, "create_product_audit") &&
    ((hasInventoryPermission(user, "view_products") &&
      hasInventoryPermission(user, "create_products")) ||
      hasInventoryPermission(user, "add_consumable"));
  if (!allowed || !auditId)
    return (
      <AuditPage title="New audit product">
        <Text>
          You do not have permission to create products for this audit.
        </Text>
      </AuditPage>
    );
  if (productId)
    return (
      <AuditPage title="Product saved">
        <Text>
          The catalog product is saved.{" "}
          {error
            ? "It could not be attached to this audit. Retry without creating another product."
            : "Adding it to the audit…"}
        </Text>
        {!!error && <Text>{error}</Text>}
        <AuditButton
          label="Retry adding to audit"
          disabled={busy}
          onPress={() => void attach(productId)}
        />
        <AuditButton
          label="Back to audit"
          disabled={busy}
          onPress={() => router.replace(`/product-audits/${auditId}` as Href)}
        />
      </AuditPage>
    );
  return (
    <ProductFormScreen
      mode="create"
      scannerDraft={prefill}
      onCreated={(id, quantity) => {
        physicalQuantity.current = quantity;
        setProductId(id);
      }}
    />
  );
}
