import { useNavigate } from "react-router-dom"
import { useRef, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/AddClientPage.scss"
import { Person, Pencil, X } from "react-bootstrap-icons"

export default function AddClientPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState("")
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isFirstNameInvalid = attemptedSubmit && firstName.trim() === ""

  const handleSave = () => {
    setAttemptedSubmit(true)

    if (firstName.trim() === "") {
      return // Stop if validation fails
    }

    // Proceed with saving when valid
    console.log("Saving client:", firstName)
  }

  const navigate = useNavigate()

  return (
    <div className="container-fluid p-4 bg-white position-relative">

      {/* ERROR TOAST */}
      {isFirstNameInvalid && (
        <div
          className="position-fixed d-flex align-items-center justify-content-between rounded-pill shadow-sm"
          style={{
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#E20030",
            color: "white",
            zIndex: 1050,
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            minWidth: "250px"
          }}
        >
          <span>First name is required</span>
          <X
            size={20}
            className="ms-3 cursor-pointer"
            style={{ cursor: "pointer" }}
            onClick={() => setAttemptedSubmit(false)}
          />
        </div>
      )}

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3">

        <h2 className="fw-bold">Add a new client</h2>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/dashboard/clients/list")}
          >
            Close
          </button>

          <button className="btn btn-dark" onClick={handleSave}>
            Save
          </button>
        </div>

      </div>

      <div className="row">

        {/* LEFT SIDEBAR */}
        <div className="col-md-3">

          <div className="card p-3">

            <h6 className="fw-bold mb-3">Personal</h6>

            <div className="list-group">

              <button className="list-group-item list-group-item-action active d-flex justify-content-between align-items-center">
                Profile
                {isFirstNameInvalid && <span className="text-danger-dot">●</span>}
              </button>

              <button
                className="list-group-item list-group-item-action"
                onClick={() => navigate("/dashboard/clients/addresses")}
              >
                Addresses
              </button>

              <button
                className="list-group-item list-group-item-action"
                onClick={() => navigate("/dashboard/clients/emergency")}
              >
                Emergency contacts
              </button>

              <button
                className="list-group-item list-group-item-action"
                onClick={() => navigate("/dashboard/clients/settings")}
              >
                Settings
              </button>

            </div>

          </div>

        </div>


        {/* RIGHT FORM */}
        <div className="col-md-9">

          {/* PROFILE SECTION */}
          <h5 className="fw-bold mb-3">Profile</h5>

          <p className="text-muted">
            Manage your client’s personal profile
          </p>

          <div className="d-flex align-items-center mb-4 mt-3">
            <div className="profile-image-upload position-relative d-inline-block">
              <input
                type="file"
                ref={fileInputRef}
                className="d-none"
                accept="image/*"
              />
              <div
                className="profile-placeholder rounded-circle d-flex justify-content-center align-items-center"
                style={{ width: "80px", height: "80px", backgroundColor: "#F0F0FE" }}
              >
                <Person style={{ color: "#7A5CFF" }} size={48} />
              </div>
              <button
                type="button"
                className="btn btn-white rounded-circle position-absolute d-flex justify-content-center align-items-center shadow-sm p-0 m-0"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "28px",
                  height: "28px",
                  bottom: "0px",
                  right: "0px",
                  backgroundColor: "#FAFAFA",
                  border: "1px solid #EAEAEA",
                  padding: "0"
                }}
              >
                <Pencil size={12} style={{ color: "#888" }} />
              </button>
            </div>
          </div>

          <div className="row g-3">

            <div className="col-md-6">
              <label className="form-label">First name</label>
              <input
                type="text"
                className={`form-control ${isFirstNameInvalid ? 'is-invalid' : ''}`}
                placeholder="e.g. John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              {isFirstNameInvalid && (
                <div className="invalid-feedback">
                  This field is required
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">Last name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Hancock"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="example@domain.com"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 12345 67890"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Birthday</label>
              <input type="date" className="form-control" />
            </div>

            <div className="col-md-6">
              <label className="form-label">Year</label>
              <input
                type="number"
                className="form-control"
                placeholder="Year"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Gender</label>
              <select className="form-select">
                <option>Select an option</option>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Pronouns</label>
              <select className="form-select">
                <option>Select an option</option>
              </select>
            </div>

          </div>

          {/* ================= ADDITIONAL INFO ================= */}

          <div className="mt-5">

            <h5 className="fw-bold">Additional info</h5>

            <p className="text-muted">
              Edit additional information about the client
            </p>

            <div className="row g-3 mt-2">

              <div className="col-md-6">
                <label className="form-label">Client source</label>
                <select className="form-select">
                  <option>Walk-in</option>
                  <option>Instagram</option>
                  <option>Google</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Referred by</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Select a client"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Preferred language</label>
                <select className="form-select">
                  <option>Select language</option>
                  <option>English</option>
                  <option>Marathi</option>
                  <option>Hindi</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Occupation</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter client job information"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Country</label>
                <select className="form-select">
                  <option>Select country</option>
                  <option>India</option>
                  <option>United States</option>
                  <option>UK</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Additional email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="example@domain.com"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Additional phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+91 98765 43210"
                />
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}