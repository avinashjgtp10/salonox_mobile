import "../styles/AccountTypePage.scss"
import { useNavigate } from "react-router-dom"
import { FiArrowLeft } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"

export default function AccountTypePage() {

  const navigate = useNavigate()

  return (
    <div className="account-container">

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      {/* LEFT SIDE */}
      <div className="account-left">

        {/* Circle Back Button */}
        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="account-content">

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
            onClick={() => navigate("/join-business")}
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