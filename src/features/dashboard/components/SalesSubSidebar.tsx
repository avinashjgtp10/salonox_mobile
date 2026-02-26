import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "react-bootstrap-icons"

import { useState } from "react"

interface Props {
  onClose: () => void
}

export default function SalesSubSidebar({ onClose }: Props) {

  const navigate = useNavigate()
  const [activeItem, setActiveItem] = useState<string | null>(null)

  const handleClick = (path: string, key: string) => {
    setActiveItem(key)
    navigate(path)
  }

  return (
    <div className="sub-sidebar">

      <div className="sub-header">
        <h3>Sales</h3>
        <button className="close-btn" onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <div
        className={activeItem === "daily" ? "sub-link active" : "sub-link"}
        onClick={() => handleClick("/dashboard/sales/daily", "daily")}
      >
        Daily sales summary
      </div>

      <div
        className={activeItem === "appointments" ? "sub-link active" : "sub-link"}
        onClick={() => handleClick("/dashboard/sales/appointments", "appointments")}
      >
        Appointments
      </div>

      <div
        className={activeItem === "sales" ? "sub-link active" : "sub-link"}
        onClick={() => handleClick("/dashboard/sales", "sales")}
      >
        Sales
      </div>

      <div
        className={activeItem === "payments" ? "sub-link active" : "sub-link"}
        onClick={() => handleClick("/dashboard/sales/payments", "payments")}
      >
        Payments
      </div>

      <div
        className={activeItem === "gift" ? "sub-link active" : "sub-link"}
        onClick={() => handleClick("/dashboard/sales/gift-cards", "gift")}
      >
        Gift cards sold
      </div>

      <div
        className={activeItem === "memberships" ? "sub-link active" : "sub-link"}
        onClick={() => handleClick("/dashboard/sales/memberships", "memberships")}
      >
        Memberships sold
      </div>

    </div>
  )
}