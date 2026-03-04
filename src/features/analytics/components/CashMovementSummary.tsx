export default function CashMovementSummary() {
  const rows = ["Cash", "Other", "Gift card redemptions"]

  return (
    <div className="sales-card">
      <h5 className="fw-bold mb-3">Cash movement summary</h5>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Payment type</th>
              <th className="text-end">Payments collected</th>
              <th className="text-end">Refunds paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item}>
                <td>{item}</td>
                <td className="text-end">₹0.00</td>
                <td className="text-end">₹0.00</td>
              </tr>
            ))}

            <tr className="fw-bold border-top">
              <td>Payments collected</td>
              <td className="text-end">₹0.00</td>
              <td className="text-end">₹0.00</td>
            </tr>

            <tr className="fw-bold">
              <td>Of which tips</td>
              <td className="text-end">₹0.00</td>
              <td className="text-end">₹0.00</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}
