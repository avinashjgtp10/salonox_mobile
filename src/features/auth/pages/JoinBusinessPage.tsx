import "../styles/JoinBusinessPage.scss"
import { useNavigate } from "react-router-dom"
import salonImg from "../../../assets/images/salon.jpg"
import { useState, useEffect } from "react"
import { FiSearch, FiX } from "react-icons/fi"

const businesses = [
  { id: 1, name: "Pink Hair Design", location: "London" },
  { id: 2, name: "Glow Beauty Studio", location: "Manchester" },
  { id: 3, name: "Urban Nails Spa", location: "Birmingham" },
  { id: 4, name: "Elite Salon & Spa", location: "Leeds" }
]

export default function JoinBusinessPage() {

  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<typeof businesses>([])
  const [selected, setSelected] = useState<any>(null)

  // 🔥 Debounced Search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (search.trim() === "") {
        setResults([])
      } else {
        const filtered = businesses.filter((biz) =>
          biz.name.toLowerCase().includes(search.toLowerCase())
        )
        setResults(filtered)
      }
    }, 400)

    return () => clearTimeout(delay)
  }, [search])

  return (
    <div className="join-container">

      {/* 🔥 TOP RIGHT BUTTONS */}
      <div className="top-header">

        {/* Close → Dashboard */}
        <button
          className="close-btn"
          onClick={() => navigate("/dashboard")}
        >
          Close
        </button>

        {/* Continue → Dashboard with selected business */}
        <button
          className="continue-top-btn"
          disabled={!selected}
          onClick={() => {
            if (selected) {
              navigate("/send-request", { state: { business: selected } })
            }
          }}
        >
          Continue →
        </button>
      </div>

      {/* LEFT SECTION */}
      <div className="join-left">
        <div className="join-content">

          <div className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </div>

          <h1>Search for a business</h1>

          <p className="sub-text">
            Find a business to request login access to their workspace
          </p>

          {/* SEARCH */}
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Find a business"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* DROPDOWN */}
          {results.length > 0 && (
            <div className="results-dropdown">

              <div className="dropdown-header">
                <span>Results</span>
                <FiX onClick={() => setResults([])} />
              </div>

              {results.map((biz) => (
                <div
                  key={biz.id}
                  className={`result-card ${
                    selected?.id === biz.id ? "active" : ""
                  }`}
                  onClick={() => setSelected(biz)}
                >
                  <div>
                    <h4>{biz.name}</h4>
                    <p>{biz.location}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelected(biz)
                    }}
                  >
                    Request Access
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* RIGHT IMAGE */}
      <div className="join-right">
        <img src={salonImg} alt="Join Business" />
      </div>

    </div>
  )
}