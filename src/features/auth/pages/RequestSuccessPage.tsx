import "../styles/RequestSuccessPage.scss"
import { useNavigate } from "react-router-dom"

export default function RequestSuccessPage() {

  const navigate = useNavigate()

  return (
    <div className="success-container">

      <div className="success-content">

        <div className="check-circle">
          ✓
        </div>

        <h1>Your request has been sent!</h1>

        <p>
          The business owner will review your request and notify you once approved.
        </p>

        <button
          className="done-btn"
          onClick={() => navigate("/dashboard")}
        >
          Done
        </button>

      </div>

    </div>
  )
}