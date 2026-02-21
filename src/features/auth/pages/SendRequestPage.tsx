import "../styles/RequestSuccessPage.scss"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function RequestSuccessPage() {

  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard")
    }, 4000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="success-container">

      <div className="success-content">

        <div className="check-circle">
          <svg viewBox="0 0 52 52" width="40" height="40">
            <path
              d="M14 27 L22 35 L38 18"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="check-path"
            />
          </svg>
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

        <span className="redirect-text">
         
        </span>

      </div>

    </div>
  )
}