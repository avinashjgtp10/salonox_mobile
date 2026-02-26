import "bootstrap/dist/css/bootstrap.min.css"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft, FiArrowRight } from "react-icons/fi"
import { HiOutlineLocationMarker } from "react-icons/hi"
import salonImg from "../../../assets/images/salon.jpg"
import "../styles/VenueLocationPage.scss"

export default function VenueLocationPage() {

  const navigate = useNavigate()

  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [submitted, setSubmitted] = useState(false)

  /* ================= LIVE LOCATION ================= */
  const handleGetLocation = () => {

    if (!navigator.geolocation) {
      alert("Geolocation not supported")
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )

          const data = await response.json()

          if (data.display_name) {
            setAddress(data.display_name)
            setSubmitted(false)
          }

        } catch {
          console.log("Error fetching address")
        }

        setLoading(false)
      },
      () => {
        alert("Please allow location permission")
        setLoading(false)
      }
    )
  }

  /* ================= SEARCH LOCATION ================= */
  const handleSearch = async (value: string) => {

    setAddress(value)

    if (value.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${value}`
        )

        const data = await response.json()
        setSuggestions(data)

      } catch {
        console.log("Search error")
      }
    } else {
      setSuggestions([])
    }
  }

  /* ================= CONTINUE ================= */
  const handleContinue = () => {
    setSubmitted(true)

    if (!address.trim()) return

    navigate("/previous-software")
  }

  return (
    <div className="container-fluid p-0 venue-page">

      {/* 🔵 TOP PROGRESS BAR */}
      <div className="progress rounded-0 progress-top">
        <div className="progress-bar progress-fill"></div>
      </div>

      <div className="row g-0 min-vh-100">

        {/* LEFT SIDE */}
        <div className="col-lg-5 col-12 bg-white p-5 position-relative">

          {/* Back Button */}
          <button
            className="btn btn-light border rounded-circle position-absolute"
            style={{ top: "30px", left: "50px" }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div className="mt-5 pt-5" style={{ maxWidth: "420px" }}>

            <p className="text-muted small">Account setup</p>

            <h3 className="fw-bold mb-3">
              Set your venue's physical location
            </h3>

            <p className="text-muted mb-4">
              Add your primary business location so your clients can easily find you.
            </p>

            {/* INPUT */}
            <div className="position-relative">

              <HiOutlineLocationMarker
                className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                style={{ cursor: "pointer" }}
                onClick={handleGetLocation}
              />

              <input
                type="text"
                className={`form-control ps-5 ${
                  submitted && !address.trim() ? "is-invalid" : ""
                }`}
                placeholder="Search location (e.g., Baramati)"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setSubmitted(false)
                  handleSearch(e.target.value)
                }}
              />

              {submitted && !address.trim() && (
                <div className="invalid-feedback d-block">
                  Please select your business location
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <ul className="list-group position-absolute w-100 mt-1 z-3 suggestion-box">
                  {suggestions.map((item, index) => (
                    <li
                      key={index}
                      className="list-group-item list-group-item-action"
                      onClick={() => {
                        setAddress(item.display_name)
                        setSuggestions([])
                        setSubmitted(false)
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}

            </div>

            {loading && (
              <small className="text-muted d-block mt-2">
                Fetching live location...
              </small>
            )}

          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="col-lg-7 d-none d-lg-block position-relative">

          <div className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3">

            <button
              className="btn btn-outline-secondary rounded-pill"
              onClick={() => navigate("/dashboard")}
            >
              Close
            </button>

            <button
              className="btn btn-dark rounded-pill"
              onClick={handleContinue}
            >
              Continue
              <FiArrowRight className="ms-2" />
            </button>

          </div>

          <img
            src={salonImg}
            alt="Venue"
            className="img-fluid w-100 h-100 object-fit-cover"
          />

        </div>

      </div>
    </div>
  )
}