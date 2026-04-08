import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/ClientSettingsPage.scss";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import { useClientWizard } from "../context/ClientWizardContext";

export default function ClientSettingsPage() {
  const navigate = useNavigate();
  const { clientData } = useClientWizard();

  const handleSave = async () => {
    const payload = {
      ...clientData.profile,
      addresses: clientData.addresses,
      emergency_contact: clientData.emergency,
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
        {/* SIDEBAR */}

        <div className="col-md-3">
          <div className="card p-3">
            <h6 className="fw-bold mb-3">Personal</h6>

            <div className="list-group">
              <button
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => navigate("/dashboard/clients/add")}
              >
                Profile
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

              <button className="list-group-item list-group-item-action active">
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}

        <div className="col-md-9">
          <h5 className="fw-bold">Settings</h5>

          {/* APPOINTMENT NOTIFICATIONS */}

          <div className="settings-section mt-4">
            <h6 className="fw-bold">Appointment notifications</h6>

            <p className="text-muted small">
              Choose how this client is notified about appointments
            </p>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" />
              <label className="form-check-label">Email notifications</label>
            </div>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" />
              <label className="form-check-label">
                Text message notifications
              </label>
            </div>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" />
              <label className="form-check-label">WhatsApp notifications</label>
            </div>
          </div>

          <hr />

          {/* MARKETING NOTIFICATIONS */}

          <div className="settings-section mt-4">
            <h6 className="fw-bold">Marketing notifications</h6>

            <p className="text-muted small">
              Choose if this client has agreed to receive marketing
              notifications
            </p>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" />
              <label className="form-check-label">
                Client accepts email marketing notifications
              </label>
            </div>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" />
              <label className="form-check-label">
                Client accepts text message marketing notifications
              </label>
            </div>

            <div className="form-check">
              <input className="form-check-input" type="checkbox" />
              <label className="form-check-label">
                Client accepts WhatsApp marketing notifications
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
