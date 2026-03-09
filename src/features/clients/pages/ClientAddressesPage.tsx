import { useNavigate } from "react-router-dom"
import { useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/ClientAddressesPage.scss"
import NewAddressModal from "../pages/NewAddressModal"
import { X } from "react-bootstrap-icons"

export default function ClientAddressesPage() {

  const navigate = useNavigate()

  const [openAddressModal, setOpenAddressModal] = useState(false)
  const [firstName] = useState("")
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isFirstNameInvalid = attemptedSubmit && firstName.trim() === ""

  const handleSave = () => {
    setAttemptedSubmit(true)

    if (firstName.trim() === "") {
      return // Stop if validation fails
    }

    console.log("Saving client addresses...")
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
      <div className="d-flex justify-content-between align-items-center mb-4">

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

              <button
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => navigate("/dashboard/clients/add")}
              >
                Profile
                {isFirstNameInvalid && <span className="text-danger-dot">●</span>}
              </button>

              <button className="list-group-item list-group-item-action active">
                Addresses
              </button>

              <button
                className="list-group-item list-group-item-action"
                onClick={() => navigate("/dashboard/clients/emergency")}
              >
                Emergency contacts
              </button>

              <button className="list-group-item list-group-item-action">
                Settings
              </button>

            </div>

          </div>

        </div>


        {/* RIGHT SECTION */}
        <div className="col-md-9">

          <h5 className="fw-bold">Addresses</h5>

          <p className="text-muted">
            Manage your client’s addresses
          </p>

          <button
            className="btn btn-outline-primary mt-3"
            onClick={() => setOpenAddressModal(true)}
          >
            + Add new address
          </button>

        </div>

      </div>


      {/* ADDRESS MODAL */}
      <NewAddressModal
        open={openAddressModal}
        onClose={() => setOpenAddressModal(false)}
      />

    </div>

  )

}