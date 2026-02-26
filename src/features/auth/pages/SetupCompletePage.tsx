import { useNavigate } from "react-router-dom"
import "../styles/SetupCompletePage.scss"

export default function SetupCompletePage() {

  const navigate = useNavigate()

  return (
    <div className="container-fluid vh-100 d-flex justify-content-center align-items-center bg-light">

      <div className="text-center">

        {/* Gradient Circle */}
        <div className="complete-icon mb-4 d-flex justify-content-center align-items-center mx-auto">
          ✓
        </div>

        <h2 className="fw-bold mb-2">
          Your business is set up!
        </h2>

        <p className="text-muted mb-4">
          Enjoy 7 days free of using Fresha for business
        </p>

        <button
          className="btn btn-dark rounded-pill px-5"
          onClick={() => navigate("/dashboard")}
        >
          Done
        </button>

      </div>

    </div>
  )
}