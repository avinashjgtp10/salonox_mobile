import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/ClientEmergencyContactsPage.scss";
import { X } from "react-bootstrap-icons";
import { useClientWizard } from "../context/ClientWizardContext";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";

export default function ClientEmergencyContactsPage() {
  const navigate = useNavigate();
  const { clientData } = useClientWizard();

  const [firstName] = useState("");
  const [primaryName, setPrimaryName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const isFirstNameInvalid = attemptedSubmit && firstName.trim() === "";

  const handleSave = async () => {
    const emergency = {
      name: primaryName,
      phone: primaryPhone,
    };

    const payload = {
      ...clientData.profile,
      addresses: clientData.addresses,
      emergency_contact: emergency,
    };

    try {
      await api.post(CLIENT.BASE, payload);
      console.log("Client saved successfully");
      navigate("/dashboard/clients/list");
    } catch (error) {
      console.error("Error saving client", error);
    }
  };

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
            minWidth: "250px",
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
                {isFirstNameInvalid && (
                  <span className="text-danger-dot">●</span>
                )}
              </button>

              <button
                className="list-group-item list-group-item-action"
                onClick={() => navigate("/dashboard/clients/addresses")}
              >
                Addresses
              </button>

              <button className="list-group-item list-group-item-action active">
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
          <h5 className="fw-bold">Emergency contacts</h5>

          <p className="text-muted">Manage your client's emergency contacts.</p>

          {/* PRIMARY CONTACT */}

          <h6 className="fw-bold mt-4">Primary contact</h6>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Full name</label>
              <input
                className="form-control"
                placeholder="e.g. John Hancock"
                value={primaryName}
                onChange={(e) => setPrimaryName(e.target.value)}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Relationship</label>
              <input className="form-control" placeholder="e.g. Parent" />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                placeholder="example@domain.com"
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Phone</label>

              <div className="d-flex gap-2">
                <select className="form-select w-25">
                  <option>+91</option>
                  <option>+1</option>
                  <option>+44</option>
                </select>

                <input
                  className="form-control"
                  placeholder="e.g. +1 234 567 8901"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <hr />

          {/* SECONDARY CONTACT */}

          <h6 className="fw-bold mt-4">Secondary contact</h6>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Full name</label>
              <input className="form-control" placeholder="e.g. John Hancock" />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Relationship</label>
              <input className="form-control" placeholder="e.g. Parent" />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                placeholder="example@domain.com"
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Phone</label>

              <div className="d-flex gap-2">
                <select className="form-select w-25">
                  <option>+91</option>
                  <option>+1</option>
                  <option>+44</option>
                </select>

                <input
                  className="form-control"
                  placeholder="e.g. +1 234 567 8901"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
