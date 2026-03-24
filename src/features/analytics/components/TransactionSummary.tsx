import { useEffect } from "react";
import Card from "../../../components/ui/Card";
import Table from "../../../components/ui/Table";

interface Props {
  selectedDate: Date
}

export default function TransactionSummary({ selectedDate }: Props) {

  const rows = [
    "Services",
    "Service add-ons",
    "Products",
    "Shipping",
    "Gift cards",
    "Memberships",
    "Late cancellation fees",
    "No-show fees",
    "Refund amount"
  ]

  useEffect(() => {
    console.log("Fetching transaction summary for:", selectedDate)

    // 🔥 API call here based on selectedDate
  }, [selectedDate])

  const columns = [
    { header: "Item type", key: "type" },
    { header: "Sales qty", key: "salesQty" },
    { header: "Refund qty", key: "refundQty" },
    { header: "Gross total", key: "total", className: "text-end" }
  ];

  const data = [
    ...rows.map((item, index) => ({
      id: index,
      type: item,
      salesQty: "0",
      refundQty: "0",
      total: "₹0.00"
    })),
    {
      id: "total",
      type: "Total Sales",
      salesQty: "0",
      refundQty: "0",
      total: "₹0.00",
      isTotal: true
    }
  ];

  return (
    <Card 
      title="Transaction summary"
      noPadding
      className="mb-4"
    >
      <Table
        columns={columns}
        data={data}
        rowClassName={(item: any) => item.isTotal ? "fw-bold bg-light" : ""}
      />
    </Card>
  );
}