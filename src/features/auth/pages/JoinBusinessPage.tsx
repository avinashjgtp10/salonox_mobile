import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/JoinBusinessPage.scss"
import { useNavigate } from "react-router-dom"
import salonImg from "../../../assets/images/salon.jpg"
import { useState, useEffect } from "react"
import { FiSearch, FiArrowLeft } from "react-icons/fi"

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

  useEffect(() => {
    if (search.trim() === "") {
      setResults([])
    } else {
      const filtered = businesses.filter((biz) =>
        biz.name.toLowerCase().includes(search.toLowerCase())
      )
      setResults(filtered)
    }
  }, [search])

  return (
    <div className="container-fluid p-0 join-page">

      {/* 🔵 PROGRESS BAR */}
      <div className="progress rounded-0 progress-top">
        <div className="progress-bar progress-fill"></div>
      </div>



      <div className="row g-0 min-vh-100">

        {/* LEFT SIDE */}
        <div className="col-lg-5 col-12 left-panel d-flex flex-column">

          {/* Back Circle */}
          <div className="p-4">
            <div className="back-circle" onClick={() => navigate(-1)}>
              <FiArrowLeft />
            </div>
          </div>

          {/* Content */}
          <div className="flex-grow-1 d-flex align-items-start justify-content-center pt-4">
            <div className="content-wrapper">

              <h2 className="page-heading">
                Search for a business
              </h2>

              <p className="text-muted mb-4">
                Find a business to request login access to their workspace
              </p>

              <div className="input-group mb-4">
                <span className="input-group-text bg-white">
                  <FiSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Find a business in India"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {results.length > 0 && (
                <div className="list-group custom-list">
                  {results.map((biz) => (
                    <button
                      key={biz.id}
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center
                      ${selected?.id === biz.id ? "active" : ""}`}
                      onClick={() => setSelected(biz)}
                    >
                      <div>
                        <div className="fw-semibold">{biz.name}</div>
                        <small>{biz.location}</small>
                      </div>
                      <span>→</span>
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* RIGHT IMAGE */}
        <div className="col-lg-7 d-none d-lg-block p-0" style={{ minHeight: "100vh" }}>

          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />
        </div>

      </div>
    </div>
  )
}