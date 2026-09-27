import { useState } from "react";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import type { Order } from "../../../types/inventory.types";
import Button from "../../../components/ui/Button";
import { BoxSeam } from "react-bootstrap-icons";
import "../styles/ReceivingTab.scss";

interface Props {
  order: Order;
  onReceived: (updated: Order) => void;
  onError: (msg: string) => void;
}

// Verify Order — Received/Damaged are editable right here; Receive Stock
// posts them straight to ORDER_RECEIVE (order_items.received_qty/
// damaged_qty), same endpoint the old PurchaseModal "receive against this
// PO" flow used, so products.amount only ever gets the good (non-damaged)
// units.
const ReceivingTab: React.FC<Props> = ({ order, onReceived, onError }) => {
  const [drafts, setDrafts] = useState<Record<string, { received: string; damaged: string }>>({});
  const [saving, setSaving] = useState(false);

  if (order.status === "received") {
    return <p className="text-muted">This order has been fully received — nothing left to receive.</p>;
  }

  function draftFor(itemId: string) {
    return drafts[itemId] ?? { received: "", damaged: "" };
  }

  // Clamps whatever's typed to [0, remaining] right away — the input's HTML
  // `max` attribute is advisory only and doesn't stop a value like 9989 on a
  // qty-1 line from actually being typed/pasted in.
  function patchDraft(itemId: string, patch: Partial<{ received: string; damaged: string }>) {
    const item = (order.items ?? []).find((i) => i.id === itemId);
    const remaining = item
      ? Math.max(0, Number(item.qty) - Number(item.received_qty) - Number(item.damaged_qty))
      : Infinity;
    const current = draftFor(itemId);
    const next = { ...current, ...patch };

    const clamp = (raw: string, otherRaw: string) => {
      if (raw === "") return raw;
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || n < 0) return "0";
      const other = parseFloat(otherRaw) || 0;
      const cap = Math.max(0, remaining - other);
      return n > cap ? String(cap) : raw;
    };

    if (patch.received !== undefined) next.received = clamp(next.received, next.damaged);
    if (patch.damaged !== undefined) next.damaged = clamp(next.damaged, next.received);

    setDrafts((prev) => ({ ...prev, [itemId]: next }));
  }

  async function handleReceiveStock() {
    const items: { order_item_id: string; received_qty: number; damaged_qty: number }[] = [];
    for (const item of order.items ?? []) {
      const draft = draftFor(item.id);
      const received = parseFloat(draft.received) || 0;
      const damaged = parseFloat(draft.damaged) || 0;
      if (received <= 0 && damaged <= 0) continue;
      const remaining = Math.max(0, Number(item.qty) - Number(item.received_qty) - Number(item.damaged_qty));
      if (received + damaged > remaining + 0.001) {
        onError(`${item.product_name || "An item"}: received + damaged (${received + damaged}) exceeds the ${remaining} still remaining`);
        return;
      }
      items.push({ order_item_id: item.id, received_qty: received, damaged_qty: damaged });
    }

    if (!items.length) {
      onError("Enter a received or damaged quantity for at least one item");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post(INVENTORY.ORDER_RECEIVE(order.id), { items });
      setDrafts({});
      onReceived(res.data?.data);
    } catch (err: any) {
      onError(err?.response?.data?.message || "Couldn't receive stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="receiving-tab">
      <div className="receiving-tab__actions">
        <Button variant="dark" iconLeft={<BoxSeam size={14} />} onClick={handleReceiveStock} disabled={saving} loading={saving}>
          Receive Stock
        </Button>
      </div>
      <table className="receiving-tab__table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="receiving-tab__num">Ordered</th>
            <th className="receiving-tab__num">Received</th>
            <th className="receiving-tab__num">Damaged</th>
            <th className="receiving-tab__num">Pending</th>
          </tr>
        </thead>
        <tbody>
          {(order.items ?? []).map((item) => {
            const received = Number(item.received_qty) || 0;
            const damaged = Number(item.damaged_qty) || 0;
            const remaining = Math.max(0, Number(item.qty) - received - damaged);
            const draft = draftFor(item.id);
            return (
              <tr key={item.id}>
                <td>{item.product_name || "—"}</td>
                <td className="receiving-tab__num">{Number(item.qty) || 0}</td>
                <td className="receiving-tab__num">
                  {remaining > 0 ? (
                    <input
                      type="number"
                      min="0"
                      max={remaining - (parseFloat(draft.damaged) || 0)}
                      className="receiving-tab__input"
                      value={draft.received}
                      placeholder="0"
                      onChange={(e) => patchDraft(item.id, { received: e.target.value })}
                    />
                  ) : (
                    received
                  )}
                </td>
                <td className="receiving-tab__num">
                  {remaining > 0 ? (
                    <input
                      type="number"
                      min="0"
                      max={remaining - (parseFloat(draft.received) || 0)}
                      className="receiving-tab__input"
                      value={draft.damaged}
                      placeholder="0"
                      onChange={(e) => patchDraft(item.id, { damaged: e.target.value })}
                    />
                  ) : (
                    damaged
                  )}
                </td>
                <td className="receiving-tab__num">{remaining}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ReceivingTab;
