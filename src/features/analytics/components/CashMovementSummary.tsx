import { useEffect } from "react"

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

  return (
    <div className="sales-card">

      <h4 className="mb-3">Cash movement summary</h4>

      <table>
        <thead>
          <tr>
            <th>Payment type</th>
            <th>Payments collected</th>
            <th style={{ textAlign: "right" }}>Refunds paid</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item}>
              <td>{item}</td>
              <td>₹0.00</td>
              <td style={{ textAlign: "right" }}>₹0.00</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  )
}