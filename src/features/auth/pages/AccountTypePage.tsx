import "../styles/AccountTypePage.scss"
import { useNavigate } from "react-router-dom"
import salonImg from "../../../assets/images/salon.jpg"

export default function AccountTypePage() {

  const navigate = useNavigate()

  return (
    <div className="account-container">

      {/* LEFT SIDE */}
      <div className="account-left">
        <div className="account-content">

          {/* BACK BUTTON */}
          <div
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            ← Back
          </div>

          <h2>
            How would you like to set up your professional account?
          </h2>

          {/* Create Business */}
          <div
            className="account-card"
            onClick={() => navigate("/business-name")}
          >
            <p>Create a new business account</p>
            <span>→</span>
          </div>

          {/* Join Business */}
          <div
            className="account-card"
            onClick={() => alert("Join business page coming soon")}
          >
            <p>Join an existing business</p>
            <span>→</span>
          </div>

        </div>
      </div>

      {/* RIGHT SIDE IMAGE */}
      <div className="account-right">
        <img src={salonImg} alt="Account Setup" />
      </div>

    </div>
  )
}
