import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/BusinessLocationPage.scss"

export default function BusinessLocationPage() {

  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(item => item !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  const handleContinue = () => {
    if (selected.length === 0) return

    if (selected.includes("physical")) {
      navigate("/venue-location")
    } else {
      navigate("/previous-software")
    }
  }

  const options = [
    { id: "physical", label: "Clients come to me at a physical location" },
    { id: "mobile", label: "I visit my clients as a mobile operator" },
    { id: "virtual", label: "I provide virtual services online" }
  ]

  return (
    <div className="container-fluid p-0">

      {/* Progress */}
      <div className="progress" style={{ height: "5px" }}>
        <div className="progress-bar bg-dark" style={{ width: "80%" }} />
      </div>

      <div className="row g-0 min-vh-100">

        {/* LEFT SIDE */}
        <div className="col-lg-5 col-md-6 bg-light p-5 position-relative">

          {/* Back Button */}
          <button
            className="btn btn-outline-secondary rounded-circle position-absolute"
            style={{ top: "25px", left: "30px", width: "44px", height: "44px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div style={{ maxWidth: "480px" }} className="mt-5">

            <p className="text-muted small">Account setup</p>

            <h4 className="fw-bold mb-4">
              Where do you provide your services?
            </h4>

            {/* OPTIONS */}
            <div className="d-grid gap-3">

              {options.map((item) => (
                <div
                  key={item.id}
                  className={`card p-3 position-relative cursor-pointer
                    ${selected.includes(item.id) ? "border-primary shadow-sm" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleOption(item.id)}
                >
                  <p className="mb-0 fw-medium">
                    {item.label}
                  </p>

                  {selected.includes(item.id) && (
                    <FiCheck
                      className="position-absolute text-primary"
                      style={{ right: "20px", top: "50%", transform: "translateY(-50%)" }}
                    />
                  )}
                </div>
              ))}

            </div>

          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="col-lg-7 col-md-6 d-none d-md-block position-relative">

          {/* Top Buttons */}
          <div className="position-absolute top-0 end-0 m-4 d-flex gap-2">

            <button
              className="btn btn-outline-secondary rounded-pill"
              onClick={() => navigate("/dashboard")}
            >
              Close
            </button>

            <button
              className="btn btn-dark rounded-pill"
              disabled={selected.length === 0}
              onClick={handleContinue}
            >
              Continue <FiArrowRight size={16} />
            </button>

          </div>

          <img
            src={salonImg}
            alt="Business Location"
            className="img-fluid w-100 h-100 object-fit-cover"
          />

        </div>

      </div>
    </div>
  )
}