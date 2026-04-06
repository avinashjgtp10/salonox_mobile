import { useMemo } from "react"
import "../../styles/ReceiptDrawer.scss"
import { downloadBlob } from "../../../../utils/downloadBlob"

interface Props {
  open: boolean
  services: any[]
  total: number
  clientName: string
  clientMobile: string
  paymentMethod: string
  onClose: () => void
}

export default function ReceiptDrawer({
  open,
  services,
  total,
  clientName,
  clientMobile,
  paymentMethod,
  onClose,
}: Props) {

  // All hooks MUST be declared before any conditional return (Rules of Hooks)
  const receiptId = useMemo(() => "RCPT-" + Math.floor(Math.random() * 100000), [])
  const now = useMemo(() => new Date(), [])

  if (!open) return null

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsApp = () => {

    const message = `
Receipt: ${receiptId}
Client: ${clientName}
Mobile: ${clientMobile}
Date: ${now.toLocaleString()}
Total Paid: ₹${total}
Payment: ${paymentMethod}
`

    if (clientMobile && clientMobile !== "N/A") {

      window.open(
        `https://wa.me/91${clientMobile}?text=${encodeURIComponent(message)}`
      )

    } else {

      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`
      )

    }

  }

  const handleDownload = () => {
    const content = [
      `Receipt ID: ${receiptId}`,
      `Client: ${clientName || "Walk-in"}`,
      `Mobile: ${clientMobile || "N/A"}`,
      `Date: ${now.toLocaleString()}`,
      `Payment Method: ${paymentMethod}`,
      ``,
      `Services:`,
      ...services.map((s) => `  ${s.name} - \u20B9${s.price}`),
      ``,
      `Total Paid: \u20B9${total}`,
    ].join("\n")

    const ok = downloadBlob(content, `${receiptId}.txt`, "text/plain")
    if (!ok) console.warn("ReceiptDrawer: download could not be triggered")
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="receipt-overlay"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="receipt-drawer">

        {/* HEADER */}
        <div className="drawer-header">

          <h5 className="fw-semibold mb-0">
            Payment Successful 🎉
          </h5>

        </div>

        {/* BODY */}
        <div id="print-area" className="drawer-body">

          <div className="receipt-row">

            <small className="text-muted">
              Receipt ID
            </small>

            <div className="fw-semibold">
              {receiptId}
            </div>

          </div>

          <div className="receipt-row">

            <small className="text-muted">
              Client Name
            </small>

            <div className="fw-semibold">
              {clientName || "Walk-in"}
            </div>

          </div>

          <div className="receipt-row">

            <small className="text-muted">
              Mobile
            </small>

            <div className="fw-semibold">
              {clientMobile || "N/A"}
            </div>

          </div>

          <div className="receipt-row">

            <small className="text-muted">
              Date & Time
            </small>

            <div className="fw-semibold">
              {now.toLocaleString()}
            </div>

          </div>

          {/* SERVICES */}
          <div className="services-list">

            {services.map((s, i) => (

              <div
                key={i}
                className="service-row"
              >

                <span>{s.name}</span>

                <span>₹{s.price}</span>

              </div>

            ))}

          </div>

          {/* TOTAL */}
          <div className="total-row">

            <span>Total Paid</span>

            <span>₹{total}</span>

          </div>

          <div className="payment-method text-muted small">

            Payment Method: {paymentMethod}

          </div>

        </div>

        {/* FOOTER */}
        <div className="drawer-footer no-print">

          <button
            className="btn btn-outline-dark w-100 mb-2"
            onClick={handleDownload}
          >
            Download Receipt
          </button>

          <button
            className="btn btn-outline-dark w-100 mb-2"
            onClick={handlePrint}
          >
            Print
          </button>

          <button
            className="btn btn-outline-dark w-100 mb-2"
            onClick={handleWhatsApp}
          >
            Share via WhatsApp
          </button>

          <button
            className="btn btn-dark w-100"
            onClick={onClose}
          >
            Done
          </button>

        </div>

      </div>
    </>
  )
}