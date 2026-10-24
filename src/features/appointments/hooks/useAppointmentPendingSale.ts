import { fetchAppointmentByIdThunk } from "@/middleware/appointment/appointment.thunk";
import { createSaleThunk } from "@/middleware/sales/sales.thunk";
import { useAppDispatch } from "@/store/hooks";
import type { AppointmentApiService, AppointmentListItem } from "@/types/appointment";
import type { SaleItemType, SaleLineItemRequest } from "@/types/sales";
import { useCallback, useState } from "react";

const ITEM_SOURCES: { idKey: string; key: "services" | "product_items" | "package_items" | "membership_items"; type: SaleItemType }[] = [
  { idKey: "service_id", key: "services", type: "service" },
  { idKey: "product_id", key: "product_items", type: "product" },
  { idKey: "package_id", key: "package_items", type: "package" },
  { idKey: "membership_id", key: "membership_items", type: "membership" },
];

const toId = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() || undefined : undefined;

/** The appointment's billed rows as Quick Sale line items. */
const toSaleLineItems = (appointment: AppointmentListItem): SaleLineItemRequest[] =>
  ITEM_SOURCES.flatMap(({ idKey, key, type }) => {
    const rows = appointment.raw[key];
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row: AppointmentApiService) => {
      const record = row as Record<string, unknown>;
      const quantity = Math.max(1, Number(row.quantity ?? row.qty) || 1);
      // Package-covered sessions were paid for when the package was bought.
      const unitPrice = row.is_package_service ? 0 : Math.max(0, Number(row.price) || 0);
      // Row discount is stored as a percentage (web parity).
      const discountPercent = Math.max(0, Number(row.discount) || 0);
      const discountAmount = Math.round(unitPrice * quantity * discountPercent) / 100;
      const staffId = toId(row.staff_id) ?? (appointment.staffId || undefined);

      return {
        ...(discountAmount > 0 ? { discountAmount } : {}),
        itemId: toId(record[idKey]),
        itemType: type,
        name: row.name?.trim() || type,
        quantity,
        ...(staffId ? { staffId } : {}),
        unitPrice,
      };
    });
  });

type PendingSaleResult = { draftId: string; error?: undefined } | { draftId?: undefined; error: string };

/**
 * Returns the pending (draft) sale that bills this appointment, creating one
 * from its items the first time — the same link Calendar Quick Sale makes when
 * it books — so "Continue to Payment" can open it in Quick Sale checkout.
 */
export function useAppointmentPendingSale() {
  const dispatch = useAppDispatch();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensurePendingSale = useCallback(async (appointment: AppointmentListItem): Promise<PendingSaleResult> => {
    if (appointment.pendingSaleId) {
      return { draftId: appointment.pendingSaleId };
    }

    const items = toSaleLineItems(appointment);
    if (items.length === 0) {
      const message = "This appointment has no services or items to bill.";
      setError(message);
      return { error: message };
    }

    setPreparing(true);
    setError(null);
    try {
      const action = await dispatch(createSaleThunk({
        appointmentId: appointment.id,
        clientId: appointment.clientId || undefined,
        items,
        notes: appointment.notes?.trim() || undefined,
        staffId: appointment.staffId || undefined,
        status: "draft",
      }));

      if (!createSaleThunk.fulfilled.match(action)) {
        const message = action.payload?.message ?? "Unable to prepare this bill for payment.";
        setError(message);
        return { error: message };
      }

      // Pick up the new pending_sale_id so the next tap reuses this draft.
      void dispatch(fetchAppointmentByIdThunk(appointment.id));
      return { draftId: action.payload.sale.id };
    } finally {
      setPreparing(false);
    }
  }, [dispatch]);

  return { ensurePendingSale, error, preparing };
}
