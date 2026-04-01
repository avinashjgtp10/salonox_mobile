import React, { useState, useEffect } from "react";
import { XLg } from "react-bootstrap-icons";
import ClientDetailsDrawer from "../../clients/components/ClientDetailsDrawer";
import "../styles/SearchOverlay.scss";

interface SearchOverlayProps {
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    // Add event listener for escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, isDrawerOpen]);

  // Sample data for clients (recently added) - Adding IDs for drawer
  const recentClients = [
    { id: 1, name: "Jack Doe", email: "jack@example.com" },
    { id: 2, name: "Jane Doe", email: "jane@example.com" },
    { id: 3, name: "John Doe", email: "john@example.com" },
  ];

  const handleClientClick = (id: number) => {
    setSelectedClientId(id);
    setIsDrawerOpen(true);
  };

  return (
    <>
      <div className={`search-overlay ${isDrawerOpen ? "hide-content" : ""}`}>
        <div className="search-header">
          <button className="close-btn" onClick={onClose} aria-label="Close search">
            <XLg size={20} />
          </button>
        </div>

        <div className="search-content">
          <h1 className="search-title">What are you looking for?</h1>
          <p className="search-subtitle">
            Search by client name, mobile, email or booking reference
          </p>

          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by client name, mobile, email or booking reference"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="search-results-grid">
            <div className="results-section">
              <h4>Upcoming appointments</h4>
              <div className="empty-state">None found</div>
            </div>

            <div className="results-section">
              <h4>Clients (recently added)</h4>
              <div className="client-list">
                {recentClients.map((client) => (
                  <div 
                    key={client.id} 
                    className="client-item" 
                    onClick={() => handleClientClick(client.id)}
                  >
                    <div className="client-avatar">
                      {client.name.charAt(0)}
                    </div>
                    <div className="client-info">
                      <span className="client-name">{client.name}</span>
                      <span className="client-email">{client.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClientDetailsDrawer 
        clientId={selectedClientId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
};

export default SearchOverlay;
