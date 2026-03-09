import "../../styles/PaymentDrawer.scss"

interface Props {
  open: boolean
  total: number
  onClose: () => void
  onSuccess: (method: string) => void
}

export default function PaymentDrawer({
  open,
  total,
  onClose,
  onSuccess,
}: Props) {

  if (!open) return null

  const methods = ["Cash", "Card", "UPI"]

  return (
    <>
      {/* Overlay */}
      <div
        className="payment-overlay"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="payment-drawer">

        {/* HEADER */}
        <div className="drawer-header">
          <h5 className="fw-semibold mb-0">
            Select Payment Method
          </h5>
        </div>

        {/* BODY */}
        <div className="drawer-body">

          {methods.map((m) => (

            <div
              key={m}
              className="payment-method"
              onClick={() => onSuccess(m)}
            >

              {m}

            </div>

          ))}

        </div>

        {/* FOOTER */}
        <div className="drawer-footer">

          <div className="d-flex justify-content-between fw-semibold fs-5">

            <span>Total</span>

            <span>₹{total}</span>

          </div>

        </div>

      </div>
    </>
  )
}