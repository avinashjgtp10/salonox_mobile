import { useEffect, useState } from "react";
import { 
  X, 
  ChevronDown, 
  Calendar3, 
  Person,
  PencilSquare,
  Plus
} from "react-bootstrap-icons";

import { getClientById } from "../services/clientService";
import "../styles/ClientDetailsDrawer.scss";

interface ClientDetailsDrawerProps {
  clientId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  "Overview",
  "Appointments",
  "Sales",
  "Client details",
  "Items",
  "Documents",
  "Notes",
  "Allergies",
  "Patch tests",
  "Client forms",
  "Files",
  "Wallet",
  "Loyalty",
  "Reviews"
];

export default function ClientDetailsDrawer({ clientId, isOpen, onClose }: ClientDetailsDrawerProps) {
  const [client, setClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Notes"); // Defaulting to Notes as in screenshot


  useEffect(() => {
    if (isOpen && clientId) {
      fetchClientDetails(clientId);
    }
  }, [isOpen, clientId]);

  const fetchClientDetails = async (id: string | number) => {
    try {
      const res = await getClientById(id);
      setClient(res.data?.data || res.data);
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  };


  if (!isOpen) return null;

  const initials = client ? `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase() || "C" : "";

  return (
    <div className={`client-drawer-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="client-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="drawer-container">
          {/* LEFT PANEL: PROFILE SUMMARY */}
          <div className="profile-summary-panel">
            <div className="profile-header">
              <div className="avatar">{initials}</div>
              <h3>{client?.first_name} {client?.last_name}</h3>
              <p className="email">{client?.email}</p>
              <p className="phone">{client?.phone_number}</p>
              <span className="badge-new">New</span>
            </div>

            <div className="profile-actions">
              <div className="actions-dropdown">
                <button className="btn-actions">
                  Actions <ChevronDown size={12} />
                </button>
              </div>
              <button className="btn-book-now">Book now</button>
            </div>

            <div className="profile-meta">
              <div className="meta-item">
                <Plus size={16} /> <span>Add pronouns</span>
              </div>
              <div className="meta-item">
                <Calendar3 size={14} /> <span>Add date of birth</span>
              </div>
              <div className="meta-item created-at">
                <Person size={14} /> 
                <span>Created {client?.created_at ? new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ""}</span>
              </div>
            </div>
          </div>

          {/* MIDDLE PANEL: NAVIGATION TABS */}
          <div className="tabs-navigation-panel">
            <div className="tabs-list">
              {TABS.map((tab) => (
                <div 
                  key={tab} 
                  className={`tab-item ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL: CONTENT AREA */}
          <div className="tab-content-panel">
            <div className="tab-header">
              <h2>{activeTab}</h2>
              {activeTab === "Notes" && <button className="btn-add-note">Add</button>}
            </div>

            <div className="tab-body">
              {activeTab === "Notes" && (
                <div className="notes-container">
                  <div className="notes-subtabs">
                    <button className="subtab-btn active">Client notes</button>
                    <button className="subtab-btn">Appointment notes</button>
                  </div>
                  
                  <div className="empty-state">
                    <div className="empty-icon">
                      <PencilSquare size={32} color="#6366f1" />
                    </div>
                    <h4>No notes</h4>
                    <p>No notes have been created for this client</p>
                  </div>
                </div>
              )}
              
              {activeTab !== "Notes" && (
                <div className="placeholder-content">
                  <p>Content for {activeTab} section goes here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
