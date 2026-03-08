import "../../styles/CheckoutDrawer.scss"

interface Props {
  open: boolean
  services: any[]
  onClose: () => void
  onCheckout: (subtotal: number) => void
}

export default function CheckoutDrawer({
  open,
  services,
  onClose,
  onCheckout,
}: Props) {

  if (!open) return null

  const subtotal = services.reduce(
    (sum, s) => sum + (s.price || 0),
    0
  )

  return (
    <>
      {/* OVERLAY */}
      <div
        className="checkout-overlay"
        onClick={onClose}
      />

      {/* DRAWER */}
      <div
        className="checkout-drawer"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="drawer-header">
          <h5 className="fw-semibold mb-0">
            Checkout
          </h5>
        </div>

        {/* BODY */}
        <div className="drawer-body">

          {services.length === 0 && (
            <div className="text-muted small">
              No services selected
            </div>
          )}

          {services.map((s, i) => (

            <div
              key={i}
              className="service-row"
            >

              <div>

                <div className="fw-medium">
                  {s.name}
                </div>

                <small className="text-muted">
                  {s.duration} min
                </small>

              </div>

              <div className="fw-semibold">
                ₹{s.price}
              </div>

            </div>

          ))}

        </div>

        {/* FOOTER */}
        <div className="drawer-footer">

          <div className="d-flex justify-content-between fw-semibold fs-5 mb-3">

            <span>Total</span>

            <span>₹{subtotal}</span>

          </div>

          <button
            className="btn btn-dark w-100"
            onClick={() => onCheckout(subtotal)}
          >
            Checkout
          </button>

        </div>

      </div>
    </>
  )
}