import { useNavigate } from "react-router-dom"
import "../styles/SetupCompletePage.scss"

export default function SetupCompletePage() {

  const navigate = useNavigate()

  return (
    <div className="complete-container">

      <div className="complete-content">

        {/* Purple Circle */}
        <div className="complete-icon">
          ✓
        </div>

        <h1>Your business is set up!</h1>

        <p>
          Enjoy 7 days free of using Fresha for business
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