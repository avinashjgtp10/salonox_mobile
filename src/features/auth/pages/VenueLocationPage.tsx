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
          }

        } catch (error) {
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

      } catch (error) {
        console.log("Search error")
      }
    } else {
      setSuggestions([])
    }
  }

  return (
    <div className="venue-container">

      <div className="venue-left">

        <button
          className="circle-back-btn"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <div className="venue-content">

          <p className="setup-text">Account setup</p>

          <h1>Set your venue's physical location</h1>

          <p className="sub-text">
            Add your primary business location so your clients can easily find you.
          </p>

          <div className="input-wrapper" style={{ position: "relative" }}>

            <HiOutlineLocationMarker
              className="location-icon"
              onClick={handleGetLocation}
            />

            <input
              type="text"
              placeholder="Search location (e.g., Baramati)"
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
            />

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <ul style={{
                listStyle: "none",
                padding: "8px",
                margin: 0,
                border: "1px solid #ddd",
                maxHeight: "160px",
                overflowY: "auto",
                background: "#fff",
                position: "absolute",
                width: "100%",
                zIndex: 50,
                top: "48px",
                borderRadius: "8px"
              }}>
                {suggestions.map((item, index) => (
                  <li
                    key={index}
                    style={{
                      padding: "8px",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setAddress(item.display_name)
                      setSuggestions([])
                    }}
                  >
                    {item.display_name}
                  </li>
                ))}
              </ul>
            )}

          </div>

          {loading && (
            <p style={{ fontSize: "12px", marginTop: "8px" }}>
              Fetching live location...
            </p>
          )}

        </div>
      </div>

      {/* RIGHT SIDE IMAGE */}
      <div className="venue-right">

        <div className="top-actions">
          <button
            className="close-btn"
            onClick={() => navigate("/dashboard")}
          >
            Close
          </button>

          <button
            className="continue-btn"
            onClick={() => navigate("/previous-software")}
          >
            Continue
            <FiArrowRight />
          </button>
        </div>

        <img src={salonImg} alt="Venue" />
      </div>

    </div>
  )
}