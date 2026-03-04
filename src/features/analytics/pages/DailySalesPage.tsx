import "../styles/DailySalesPage.scss"
import SalesDateFilter from "../components/SalesDateFilter"
import TransactionSummary from "../components/TransactionSummary"
import CashMovementSummary from "../components/CashMovementSummary"
export default function DailySalesPage() {
  return (
    <div className="container-fluid sales-page p-4">

      {/* Header */}
      <div className="sales-header d-flex justify-content-between align-items-center mb-4">

        <div>
          <h2>Daily sales</h2>
          <p>
            View, filter and export the transactions and cash movement for the day.
          </p>
        </div>

        <div className="sales-actions d-flex gap-2">
          <button className="btn btn-outline-secondary rounded-pill">
            Export
          </button>
          <button className="btn btn-dark rounded-pill">
            Add new
          </button>
        </div>

      </div>

      <SalesDateFilter />

      <div className="row g-4 mt-3">
        <div className="col-lg-6">
          <TransactionSummary />
        </div>
        <div className="col-lg-6">
          <CashMovementSummary />
        </div>
      </div>

    </div>
  )
}