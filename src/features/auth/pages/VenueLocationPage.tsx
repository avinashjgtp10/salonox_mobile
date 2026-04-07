import "bootstrap/dist/css/bootstrap.min.css"
import { useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { ArrowLeft, ArrowRight, GeoAlt } from "react-bootstrap-icons"
import "../styles/VenueLocationPage.scss"
import { useOnboarding } from "../../../context/OnboardingContext"
import salonImg from "../../../assets/images/salon.jpg"

export default function VenueLocationPage() {

  const navigate = useNavigate()
  const { update } = useOnboarding()

  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [submitted, setSubmitted] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search using Photon API (CORS-friendly, OpenStreetMap-based)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (address.length > 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=5`
          )
          const data = await res.json()
          const mapped = (data.features ?? []).map((f: any) => {
            const p = f.properties
            const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean)
            return { display_name: parts.join(", "), raw: f }
          })
          setSuggestions(mapped)
        } catch {
          console.log("Search error")
          setSuggestions([])
        }
      }, 400)
    } else {
      setSuggestions([])
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [address])

  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
          const res = await fetch(
            `https://corsproxy.io/?${encodeURIComponent(nominatimUrl)}`
          )
          const data = await res.json()
          if (data.display_name) {
            setAddress(data.display_name)
            setSubmitted(false)
            setSuggestions([])
          }
        } catch {
          alert("Could not fetch address. Please type your location manually.")
        }
        setLoading(false)
      },
      () => { alert("Please allow location permission"); setLoading(false) }
    )
  }

  const handleContinue = () => {
    setSubmitted(true)
    if (!address.trim()) return
    update({ address: address.trim() })
    navigate("/previous-software")
  }

  return (
    <div className="container-fluid p-0 venue-page">

      <div className="progress rounded-0 progress-top">
        <div className="progress-bar progress-fill" />
      </div>

      <div className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3">
        <button
          className="btn btn-outline-secondary rounded-pill bg-white px-4"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button className="btn btn-dark rounded-pill px-4 d-lg-none" onClick={handleContinue}>
          Continue <ArrowRight size={16} className="ms-1" />
        </button>
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-12 bg-white p-5 position-relative">

          <button
            className="btn btn-light border rounded-circle position-absolute"
            style={{ top: "30px", left: "50px" }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft />
          </button>

          <div className="mt-5 pt-5" style={{ maxWidth: "420px" }}>
            <p className="text-muted small">Account setup</p>
            <h3 className="fw-bold mb-3">Set your venue's physical location</h3>
            <p className="text-muted mb-4">
              Add your primary business location so your clients can easily find you.
            </p>

            <div className="position-relative">
              <GeoAlt
                className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                style={{ cursor: "pointer" }}
                onClick={handleGetLocation}
              />
              <input
                type="text"
                className={`form-control ps-5 ${submitted && !address.trim() ? "is-invalid" : ""}`}
                placeholder="Search location (e.g., Mumbai)"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setSubmitted(false)
                }}
              />
              {submitted && !address.trim() && (
                <div className="invalid-feedback d-block">
                  Please select your business location
                </div>
              )}
              {suggestions.length > 0 && (
                <ul className="list-group position-absolute w-100 mt-1 z-3 suggestion-box">
                  {suggestions.map((item, index) => (
                    <li
                      key={index}
                      className="list-group-item list-group-item-action"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setAddress(item.display_name)
                        setSuggestions([])
                        setSubmitted(false)
                      }}
                    >
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {loading && <small className="text-muted d-block mt-2">Fetching live location...</small>}
          </div>
        </div>

        <div className="col-lg-7 d-none d-lg-block position-relative p-0" style={{ minHeight: "100vh" }} >
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />

          {/* Desktop Continue Button on Image */}
          <div className="position-absolute top-0 end-0 p-4 z-3">
            <button className="btn btn-dark rounded-pill px-4" onClick={handleContinue}>
              Continue <ArrowRight size={16} className="ms-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}