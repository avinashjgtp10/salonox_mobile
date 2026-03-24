import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";

export default function SalesDateFilter() {
  return (
    <div className="bg-light rounded-4 p-2 d-flex align-items-center gap-3">
      <Button
        variant="light"
        className="rounded-circle p-2"
        iconLeft={<ChevronLeft size={18} />}
      />

      <Button
        variant="outline-secondary"
        pill
        size="sm"
      >
        Today
      </Button>

      <div className="fw-bold small">
        Wednesday 25 Feb, 2026
      </div>

      <Button
        variant="light"
        className="rounded-circle p-2 ms-auto"
        iconLeft={<ChevronRight size={18} />}
      />
    </div>
  )
}