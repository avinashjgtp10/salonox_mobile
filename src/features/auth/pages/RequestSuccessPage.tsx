import { useNavigate } from "react-router-dom"
import "../styles/RequestSuccessPage.scss"

export default function RequestSuccessPage() {

  const navigate = useNavigate()

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center">

      <div className="text-center">

        <div className="check-circle mx-auto mb-4">
          ✓
        </div>

        <h2 className="fw-bold mb-2">
          Your request has been sent!
        </h2>

        <p className="text-muted mb-4">
          The business owner will review your request and notify you once approved.
        </p>

        <button
          className="btn btn-dark rounded-pill px-4"
          onClick={() => navigate("/dashboard")}
        >
          Done
        </button>

      </div>

    </div>
  )
}