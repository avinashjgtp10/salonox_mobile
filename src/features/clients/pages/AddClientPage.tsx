import { useNavigate } from "react-router-dom"
import { useRef, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/AddClientPage.scss"
import { createClient } from "../services/clientService";
import { Person, Pencil, X } from "react-bootstrap-icons"

import { useClientWizard } from "../context/ClientWizardContext";

export default function AddClientPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { resetWizard } = useClientWizard()

  // Individual states for form inputs
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [birthday, setBirthday] = useState("")
  const [year, setYear] = useState("")
  const [gender, setGender] = useState("")
  const [pronouns, setPronouns] = useState("")
  const [occupation, setOccupation] = useState("")
  const [additionalEmail, setAdditionalEmail] = useState("")
  const [additionalPhone, setAdditionalPhone] = useState("")
  const [clientSource, setClientSource] = useState("walk_in")
  const [preferredLanguage, setPreferredLanguage] = useState("en")
  const [country, setCountry] = useState("IN")

  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isFirstNameInvalid = attemptedSubmit && firstName.trim() === ""



  const handleSave = async () => {
    if (firstName.trim() === "") {
      setAttemptedSubmit(true)
      return
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone_number: phone,
      birthday: birthday,
      birth_year: year,
      gender: gender,
      pronouns: pronouns,
      occupation: occupation,
      additional_email: additionalEmail,
      additional_phone: additionalPhone,
      client_source: clientSource,
      preferred_language: preferredLanguage,
      country: country,
      addresses: [],
      emergency_contact: {}
    }

    try {
      await createClient(payload)
      resetWizard()
      navigate("/dashboard/clients/list")
    } catch (error) {
      console.error("Error saving client:", error)
      alert("Failed to save client. Please try again.")
    }
  }


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

          <button type="button" className="btn btn-dark" onClick={handleSave}>
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
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 12345 67890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Birthday</label>
              <input
                type="date"
                className="form-control"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Year</label>
              <input
                type="number"
                className="form-control"
                placeholder="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select an option</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Pronouns</label>
              <select
                className="form-select"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
              >
                <option value="">Select an option</option>
                <option value="She/Her">She/Her</option>
                <option value="He/Him">He/Him</option>
                <option value="They/Them">They/Them</option>
                <option value="Prefer not to say">Prefer not to say</option>
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
                <select
                  className="form-select"
                  value={clientSource}
                  onChange={(e) => setClientSource(e.target.value)}
                >
                  <option value="walk_in">Walk-in</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
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
                <select
                  className="form-select"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="mr">Marathi</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Occupation</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter client job information"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Country</label>
                <select
                  className="form-select"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="UK">UK</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Additional email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="example@domain.com"
                  value={additionalEmail}
                  onChange={(e) => setAdditionalEmail(e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Additional phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={additionalPhone}
                  onChange={(e) => setAdditionalPhone(e.target.value)}
                />
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}