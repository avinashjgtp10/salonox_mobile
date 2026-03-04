import { ChevronLeft, ChevronRight } from "react-bootstrap-icons"

export default function SalesDateFilter() {
  return (
    <div className="bg-light rounded p-3 d-flex align-items-center gap-3">
      <button className="btn btn-light rounded-circle">
        <ChevronLeft />
      </button>

      <button className="btn btn-outline-secondary rounded-pill">
        Today
      </button>

      <div className="fw-semibold">
        Wednesday 25 Feb, 2026
      </div>

      <button className="btn btn-light rounded-circle ms-auto">
        <ChevronRight />
      </button>
    </div>
  )
}