import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/AccountTypePage.scss"
import { useNavigate } from "react-router-dom"
import { FiArrowLeft, FiArrowRight } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"

export default function AccountTypePage() {

  const navigate = useNavigate()

  return (
  <div className="container-fluid p-0">

    <div className="row g-0 min-vh-100">

      {/* LEFT PANEL */}
<div className="col-lg-5 col-md-6 d-flex align-items-center position-relative px-5 min-vh-100 left-panel">        <button
          className="btn btn-outline-secondary rounded-circle position-absolute top-0 start-0 m-4 back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="w-100 account-wrapper">

          <h2 className="account-heading mb-5">
            How would you like to set up your professional account?
          </h2>

          <div
            className="card p-4 mb-4 shadow-sm account-card"
            onClick={() => navigate("/business-name")}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">
                Create a new business account
              </span>
              <FiArrowRight />
            </div>
          </div>

          <div
            className="card p-4 shadow-sm account-card"
            onClick={() => navigate("/join-business")}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-semibold">
                  Join an existing business on Fresha
                </div>
                <small className="text-muted">
                  Find the business you want to join
                </small>
              </div>
              <FiArrowRight />
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT IMAGE */}
      <div className="col-lg-7 col-md-6 d-none d-md-block p-0 min-vh-100">
        <img
  src={salonImg}
  alt="Account Setup"
  className="w-100 h-100"
  style={{ objectFit: "cover", filter: "brightness(0.9)" }}
/>
      </div>

    </div>
  </div>
)
}