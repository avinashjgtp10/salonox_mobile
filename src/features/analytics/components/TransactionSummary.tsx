import { useEffect } from "react"

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

  return (
    <div className="sales-card">

      <h4 className="mb-3">Transaction summary</h4>

      <table>
        <thead>
          <tr>
            <th>Item type</th>
            <th>Sales qty</th>
            <th>Refund qty</th>
            <th style={{ textAlign: "right" }}>Gross total</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item}>
              <td>{item}</td>
              <td>0</td>
              <td>0</td>
              <td style={{ textAlign: "right" }}>₹0.00</td>
            </tr>
          ))}

          <tr style={{ fontWeight: 600 }}>
            <td>Total Sales</td>
            <td>0</td>
            <td>0</td>
            <td style={{ textAlign: "right" }}>₹0.00</td>
          </tr>
        </tbody>
      </table>

    </div>
  )
}