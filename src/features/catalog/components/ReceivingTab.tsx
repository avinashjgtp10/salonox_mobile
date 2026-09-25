import type { Order } from "../../../types/inventory.types";
import "../styles/ReceivingTab.scss";

interface Props {
  order: Order;
}

// Verify Order — read-only. Actual stock receiving now happens in exactly
// one place: Product Inventory → Record Purchase → pick the supplier's open
// PO (see PurchaseModal.tsx's loadOrderIntoLines/ORDER_RECEIVE). This tab
// used to also write stock itself via a draft-receipt Confirm Receipt flow;
// that was removed so the Orders module can't add stock at all, only show
// where each line stands.
const ReceivingTab: React.FC<Props> = ({ order }) => {
  if (order.status === "received") {
    return <p className="text-muted">This order has been fully received — nothing left to receive.</p>;
  }

  return (
    <div className="receiving-tab">
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
            const pending = Math.max(0, Number(item.qty) - received - damaged);
            return (
              <tr key={item.id}>
                <td>{item.product_name || "—"}</td>
                <td className="receiving-tab__num">{Number(item.qty) || 0}</td>
                <td className="receiving-tab__num">{received}</td>
                <td className="receiving-tab__num">{damaged}</td>
                <td className="receiving-tab__num">{pending}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-muted small mt-3 mb-0">
        To receive stock against this order, go to Product Inventory → Record Purchase and pick this supplier's order.
      </p>
    </div>
  );
};

export default ReceivingTab;
