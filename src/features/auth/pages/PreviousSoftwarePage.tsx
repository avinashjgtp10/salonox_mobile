import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import salonImg from "../../../assets/images/salon.jpg";
import "../styles/PreviousSoftwarePage.scss";

export default function PreviousSoftwarePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("");
  const [otherSoftware, setOtherSoftware] = useState("");

  const softwareList = [
    "Acuity",
    "Booksy",
    "Calendly",
    "Goldie",
    "Janeapp",
    "Mindbody",
    "Salon Iris",
    "Setmore",
    "Shortcuts",
    "Square",
    "Styleseat",
    "Timely",
    "Treatwell",
    "Vagaro",
    "Zenoti",
    "I'm not using any software",
    "Other",
  ];

  const handleContinue = () => {
    navigate("/recommendation-source");
  };

  return (
    <div className="container-fluid p-0">
      {/* Progress */}
      <div className="progress" style={{ height: "5px" }}>
        <div className="progress-bar bg-dark" style={{ width: "75%" }} />
      </div>

      <div className="row g-0 min-vh-100">
        {/* LEFT SIDE */}
        <div className="col-lg-5 col-12 bg-white p-5 position-relative">
          <button
            className="btn btn-light border rounded-circle position-absolute d-md-flex align-items-center justify-content-center"
            style={{ top: "30px", left: "50px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>
          <div style={{ maxWidth: "420px" }} className="mt-5">
            <p className="text-muted small">Account setup</p>

            <h4 className="fw-bold my-3">
              Which software are you currently using?
            </h4>

            <p className="text-muted small mb-4">
              If you're looking to switch, we can help speed up your business
              setup.
            </p>

            {/* BUTTON STYLE OPTIONS */}
            <div className="d-grid gap-3">
              {softwareList.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className={`btn software-btn ${
                    selected === item ? "active" : ""
                  }`}
                  onClick={() => setSelected(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Other Input */}
            {selected === "Other" && (
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-2">
                  <label className="form-label">What other software?</label>
                  <small className="text-muted">
                    {otherSoftware.length}/30
                  </small>
                </div>

                <input
                  type="text"
                  className={`form-control ${
                    otherSoftware.length === 0 ? "is-invalid" : ""
                  }`}
                  placeholder="Type software name"
                  value={otherSoftware}
                  maxLength={30}
                  onChange={(e) => setOtherSoftware(e.target.value)}
                />

                {otherSoftware.length === 0 && (
                  <div className="invalid-feedback d-block">
                    Other software is required
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div
          className="col-lg-7 d-none d-lg-block position-relative p-0"
          style={{ minHeight: "100vh" }}
        >
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />

          {/* Desktop Continue Button on Image */}
          <div className="position-absolute top-0 end-0 p-4 z-3">
            <button
              className="btn btn-dark rounded-pill px-4"
              disabled={
                !selected ||
                (selected === "Other" && otherSoftware.length === 0)
              }
              onClick={handleContinue}
            >
              Continue <FiArrowRight size={16} className="ms-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
