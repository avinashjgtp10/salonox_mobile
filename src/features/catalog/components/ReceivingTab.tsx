import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { BoxSeam } from "react-bootstrap-icons";
import type { RootState } from "../../../store/store";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  fetchOrCreateDraftReceiptThunk,
  saveReceiptDraftThunk,
  confirmReceiptThunk,
} from "../../../middleware/inventory/inventory.thunk";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { selectAllStaff, selectCurrentSalon, selectUserProfile } from "../../../store/selectors/slices.selectors";
import type { Order, OrderReceiptWithItems } from "../../../types/inventory.types";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import { Dropdown } from "../../../components/ui/Dropdown";
import "../styles/ReceivingTab.scss";

interface Props {
  order: Order;
  can: (permKey: string) => boolean;
  denyPerm: (permKey: string) => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  onOrderUpdated: (order: Order) => void;
}

// Confirmed/Damaged targets are edited as raw strings (same convention as
// OrderDetailPage's old receiveQtys) so an empty/partial input doesn't fight
// the user mid-keystroke; parsed to numbers only on save/confirm.
interface RowEdit {
  confirmed: string;
  damaged: string;
}

const toNum = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// Receiving — the tab that replaces the old single-shot Receive modal.
// Confirmed/Damaged are absolute cumulative targets (not deltas): opening a
// fresh draft pre-fills them with whatever's already been received/damaged,
// and the clerk raises the numbers by however much just arrived. Save Draft
// never touches stock; only Confirm Receiving does (via confirmReceiptThunk).
const ReceivingTab: React.FC<Props> = ({ order, can, denyPerm, showSuccess, showError, onOrderUpdated }) => {
  const dispatch = useAppDispatch();
  const currentSalon = useSelector(selectCurrentSalon);
  const userProfile = useSelector(selectUserProfile);
  const { branches } = useSelector((s: RootState) => s.salon);
  const staff = useSelector(selectAllStaff);

  const [receipt, setReceipt] = useState<OrderReceiptWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [branchId, setBranchId] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (currentSalon?.id) dispatch(fetchBranchesThunk(currentSalon.id));
    dispatch(fetchStaffThunk());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSalon?.id]);

  const applyReceipt = (r: OrderReceiptWithItems) => {
    setReceipt(r);
    const nextEdits: Record<string, RowEdit> = {};
    r.items.forEach((it) => {
      // Postgres NUMERIC columns come back as fixed-decimal strings (e.g.
      // "0.000") — Number(...) round-trips through JS's own toString(),
      // which drops the trailing zeros, before these hit the input's value.
      // A zero starts the field BLANK (placeholder shows "0") rather than
      // pre-filled with the string "0" — typing into a pre-filled "0"
      // without selecting it first inserts next to it instead of replacing
      // it (e.g. typing "3" yields "30"), which is confusing for the common
      // case of an item nothing's been confirmed/damaged for yet.
      const confirmedQty = Number(it.confirmed_qty) || 0;
      const damagedQty = Number(it.damaged_qty) || 0;
      nextEdits[it.order_item_id] = {
        confirmed: confirmedQty ? String(confirmedQty) : "",
        damaged: damagedQty ? String(damagedQty) : "",
      };
    });
    setEdits(nextEdits);
    setBranchId(r.branch_id ?? "");
    setReceivedBy(r.received_by ?? "");
  };

  useEffect(() => {
    setLoading(true);
    dispatch(fetchOrCreateDraftReceiptThunk(order.id))
      .unwrap()
      .then(applyReceipt)
      .catch((err) => showError(typeof err === "string" ? err : "Couldn't load draft receipt"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  // Defaults Received By to the logged-in user's own staff row once staff
  // loads — same convention as CreateAuditModal's auditorId default.
  useEffect(() => {
    if (receivedBy) return;
    const self = staff.find((s: any) => s.user_id === userProfile?.id);
    if (self) setReceivedBy(String(self.user_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, userProfile]);

  const branchOptions = useMemo(() => branches.map((b: any) => ({ id: b.id, name: b.name })), [branches]);
  const staffOptions = useMemo(
    () => staff.filter((s: any) => s.user_id)
      .map((s: any) => ({ id: String(s.user_id), name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed" })),
    [staff],
  );

  const orderItemsById = useMemo(() => new Map((order.items ?? []).map((i) => [i.id, i])), [order.items]);

  const buildItemsPayload = () =>
    Object.entries(edits).map(([order_item_id, v]) => ({
      order_item_id,
      confirmed_qty: toNum(v.confirmed),
      damaged_qty: toNum(v.damaged),
    }));

  const validateRows = (): string | null => {
    for (const [orderItemId, v] of Object.entries(edits)) {
      const orderItem = orderItemsById.get(orderItemId);
      if (!orderItem) continue;
      const total = toNum(v.confirmed) + toNum(v.damaged);
      if (total > Number(orderItem.qty) + 0.001) {
        return `Confirmed + Damaged can't exceed Ordered (${orderItem.qty}) for "${orderItem.product_name ?? "this item"}"`;
      }
    }
    return null;
  };

  async function handleSaveDraft() {
    if (!receipt) return;
    if (!can("receive_order")) { denyPerm("receive_order"); return; }
    const rowError = validateRows();
    if (rowError) { showError(rowError); return; }

    setSaving(true);
    try {
      const updated = await dispatch(saveReceiptDraftThunk({
        orderId: order.id,
        receiptId: receipt.id,
        payload: { branch_id: branchId || null, received_by: receivedBy || null, items: buildItemsPayload() },
      })).unwrap();
      applyReceipt(updated);
      showSuccess("Draft saved");
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!receipt) return;
    if (!can("receive_order")) { denyPerm("receive_order"); return; }
    if (!branchId) { showError("Select a Receiving Location before confirming"); return; }
    if (!receivedBy) { showError("Select Received By before confirming"); return; }
    const rowError = validateRows();
    if (rowError) { showError(rowError); return; }

    setConfirming(true);
    try {
      // Persist whatever's currently on screen first, so Confirm always acts
      // on the latest edits rather than whatever was last explicitly saved.
      const saved = await dispatch(saveReceiptDraftThunk({
        orderId: order.id,
        receiptId: receipt.id,
        payload: { branch_id: branchId, received_by: receivedBy, items: buildItemsPayload() },
      })).unwrap();

      const result = await dispatch(confirmReceiptThunk({
        orderId: order.id, receiptId: saved.id, payload: {},
      })).unwrap();

      onOrderUpdated(result.order);
      showSuccess("Receiving confirmed — stock and supplier balance updated");

      // A fully-received order has nothing left to receive; a
      // partially-received one gets a fresh draft on next visit to this tab.
      if (result.order.status !== "received") {
        setLoading(true);
        const draft = await dispatch(fetchOrCreateDraftReceiptThunk(order.id)).unwrap();
        applyReceipt(draft);
        setLoading(false);
      } else {
        setReceipt(null);
      }
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Failed to confirm receiving");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return <Skeleton width="100%" height={200} />;
  }

  if (order.status === "received") {
    return <p className="text-muted">This order has been fully received — nothing left to receive.</p>;
  }

  if (!receipt) {
    return <p className="text-muted">Couldn't load a draft receipt for this order.</p>;
  }

  const disabled = !can("receive_order");

  return (
    <div className="receiving-tab">
      <div className="receiving-tab__field-row mb-3">
        <div>
          <label className="receiving-tab__label">Receiving Location <span className="receiving-tab__req">*</span></label>
          <Dropdown value={branchId} options={branchOptions} placeholder="Select location" onChange={setBranchId} />
        </div>
        <div>
          <label className="receiving-tab__label">Received By <span className="receiving-tab__req">*</span></label>
          <Dropdown value={receivedBy} options={staffOptions} placeholder="Select staff member" onChange={setReceivedBy} />
        </div>
      </div>

      <table className="receiving-tab__table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="receiving-tab__num">Ordered</th>
            <th className="receiving-tab__num">Confirmed</th>
            <th className="receiving-tab__num">Damaged</th>
            <th className="receiving-tab__num">Pending</th>
          </tr>
        </thead>
        <tbody>
          {(order.items ?? []).map((item) => {
            const edit = edits[item.id] ?? { confirmed: "", damaged: "" };
            const pending = Math.max(0, Number(item.qty) - toNum(edit.confirmed) - toNum(edit.damaged));
            return (
              <tr key={item.id}>
                <td>{item.product_name || "—"}</td>
                <td className="receiving-tab__num">{Number(item.qty) || 0}</td>
                <td className="receiving-tab__num">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    className="receiving-tab__input"
                    value={edit.confirmed}
                    disabled={disabled}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: { ...prev[item.id], confirmed: e.target.value } }))}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </td>
                <td className="receiving-tab__num">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    className="receiving-tab__input"
                    value={edit.damaged}
                    disabled={disabled}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: { ...prev[item.id], damaged: e.target.value } }))}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </td>
                <td className="receiving-tab__num">{pending}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <Button
          variant="outline-dark"
          onClick={handleSaveDraft}
          disabled={saving || confirming}
          style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          {saving ? "Saving…" : "Save Draft"}
        </Button>
        <Button
          variant="dark"
          iconLeft={<BoxSeam size={14} />}
          onClick={handleConfirm}
          disabled={saving || confirming}
          style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          {confirming ? "Confirming…" : "Confirm Receipt"}
        </Button>
      </div>
    </div>
  );
};

export default ReceivingTab;
