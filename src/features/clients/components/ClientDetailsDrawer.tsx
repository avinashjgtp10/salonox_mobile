import { useEffect, useState } from "react";
import {
  X,
  ChevronDown,
  Person,
  Plus,
  Clock
} from "react-bootstrap-icons";

import { getClientById } from "../services/clientService";
import "../styles/ClientDetailsDrawer.scss";

interface ClientDetailsDrawerProps {
  clientId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: "Overview" },
  { id: "Appointments", count: 1 },
  { id: "Sales" },
  { id: "Client details" },
  { id: "Items" },
  { id: "Documents", hasSubmenu: true },
  { id: "Wallet" },
  { id: "Loyalty" },
  { id: "Reviews" }
];

export default function ClientDetailsDrawer({ clientId, isOpen, onClose }: ClientDetailsDrawerProps) {
  const [client, setClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Appointments");
  const [activeSubTab, setActiveSubTab] = useState("Booked");

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

  const initials = client ? `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase() : "J";

  return (
    <div className={`client-drawer-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="client-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="drawer-main-container">
          {/* PANE 1: PROFILE SUMMARY */}
          <div className="profile-summary-pane">
            <div className="profile-info-card">
              <div className="profile-avatar">{initials}</div>
              <h3 className="profile-name">{client?.first_name || "Jack"} {client?.last_name || "Doe"}</h3>
              <p className="profile-email">{client?.email || "jack@example.com"}</p>

              <div className="profile-buttons">
                <button className="btn-actions">
                  Actions <ChevronDown size={12} />
                </button>
                <button className="btn-book-now">Book now</button>
              </div>

              <div className="profile-meta-list">
                <div className="meta-item">
                  <Plus size={18} /> <span>Add pronouns</span>
                </div>
                <div className="meta-item">
                  <Plus size={18} /> <span>Add date of birth</span>
                </div>
                <div className="meta-item created-date">
                  <Person size={14} />
                  <span>Created {client?.created_at ? new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "26 Mar 2026"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* PANE 3: NAVIGATION TABS */}
          <div className="navigation-tabs-pane">
            <div className="tabs-list">
              {TABS.map((tab) => (
                <div
                  key={tab.id}
                  className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-label">{tab.id}</span>
                  {tab.count && <span className="tab-count">{tab.count}</span>}
                  {tab.hasSubmenu && <ChevronDown size={12} className="ms-auto" />}
                </div>
              ))}
            </div>
          </div>

          {/* PANE 4: CONTENT AREA */}
          <div className="tab-content-pane">
            <div className="content-header">
              <h2>{activeTab}</h2>

              {activeTab === "Appointments" && (
                <div className="content-filters">
                  <div className="sub-tabs-pills">
                    {["All", "Booked", "Confirmed", "More"].map(st => (
                      <button
                        key={st}
                        className={`sub-tab-pill ${activeSubTab === st ? 'active' : ''}`}
                        onClick={() => setActiveSubTab(st)}
                      >
                        {st} {st === 'More' && <ChevronDown size={12} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="content-body">
              {activeTab === "Appointments" && (
                <div className="appointments-view">
                  <div className="month-header">March</div>

                  <div className="appointment-card-v2">
                    <div className="status-line bg-blue"></div>
                    <div className="card-content">
                      <div className="card-header">
                        <div className="header-left">
                          <Clock size={16} />
                          <div className="header-text">
                            <span className="type">Appointment</span>
                            <span className="info">Thu 26 Mar 10:00am - test123@gmail.com</span>
                          </div>
                        </div>
                        <span className="status-badge">Booked</span>
                      </div>

                      <div className="card-body">
                        <div className="service-info">
                          <div className="service-name">Blow Dry</div>
                          <div className="service-meta">10:00am • 35min • Wendy Smith (Demo)</div>
                        </div>
                        <div className="service-price">₹35</div>
                      </div>

                      <div className="card-footer">
                        <button className="btn-checkout">Checkout</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab !== "Appointments" && (
                <div className="placeholder-view">
                  <p>No content available for {activeTab}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
