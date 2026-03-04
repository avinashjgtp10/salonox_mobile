export default function TransactionSummary() {
  const rows = [
    "Services",
    "Service add-ons",
    "Products",
    "Shipping",
    "Gift cards",
    "Memberships",
    "Late cancellation"
  ]

  return (
    <div className="sales-card">
      <h5 className="fw-bold mb-3">Transaction summary</h5>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Item type</th>
              <th>Sales qty</th>
              <th>Refund qty</th>
              <th className="text-end">Gross total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item}>
                <td>{item}</td>
                <td>0</td>
                <td>0</td>
                <td className="text-end">₹0.00</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}