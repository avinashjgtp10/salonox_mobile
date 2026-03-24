import { useEffect } from "react";
import Card from "../../../components/ui/Card";
import Table from "../../../components/ui/Table";

interface Props {
  selectedDate: Date
}

export default function CashMovementSummary({ selectedDate }: Props) {

  const rows = [
    "Cash",
    "Other",
    "Gift card redemptions",
    "Payments collected",
    "Of which tips"
  ]

  useEffect(() => {
    console.log("Fetching cash movement for:", selectedDate)

    // 🔥 API call here
  }, [selectedDate])

  const columns = [
    { header: "Payment type", key: "type" },
    { header: "Payments collected", key: "collected" },
    { header: "Refunds paid", key: "refunded", className: "text-end" }
  ];

  const data = rows.map((item, index) => ({
    id: index,
    type: item,
    collected: "₹0.00",
    refunded: "₹0.00"
  }));

  return (
    <Card 
      title="Cash movement summary"
      noPadding
      className="mb-4"
    >
      <Table
        columns={columns}
        data={data}
      />
    </Card>
  );
}