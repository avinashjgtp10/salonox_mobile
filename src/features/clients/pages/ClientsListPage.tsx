import { useEffect, useState } from "react";
import { getClients, deleteClient, blockClients, exportClients, mergeDuplicateClients, mergeSelectedClients } from "../services/clientService";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDownUp,
  X,
  Person,
  People,
  ArrowRight,
  ArrowLeftRight,
  FileEarmarkExcel,
  FiletypeCsv,
} from "react-bootstrap-icons";
import ClientDetailsDrawer from "../components/ClientDetailsDrawer";


import "../styles/ClientsListPage.scss";

export default function ClientsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await getClients();
      console.log("CLIENT API RESPONSE:", res.data);
      const clientsData = res.data?.data?.items || [];
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error("Error fetching clients", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [location]);

  /* ================= FILTER STATE ================= */
  const [showFilter, setShowFilter] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const genderOptions = [
    "All",
    "Prefer not to say",
    "Female",
    "Male",
    "Non-binary",
  ];

  /* ================= SORT STATE ================= */
  const [sortOpen, setSortOpen] = useState(false);

  const sortOptions = [
    "First name (A-Z)",
    "First name (Z-A)",
    "Last name (A-Z)",
    "Last name (Z-A)",
    "Gender (A-Z)",
    "Gender (Z-A)",
    "Created at (oldest first)",
    "Created at (newest first)",
  ];

  const [selectedSort, setSelectedSort] = useState("Created at (newest first)");

  /* ================= OPTIONS DROPDOWN ================= */
  const [optionsOpen, setOptionsOpen] = useState(false);

  /* ================= CLIENTS STATE ================= */
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | number | null>(null);



  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedClients(clients.map((c: any) => String(c.id)));
    else setSelectedClients([]);
  };

  const handleSelectClient = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedClients(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleDeleteClients = async () => {
    try {
      await Promise.all(
        selectedClients.map((id) => deleteClient(id))
      );
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Error deleting clients", error);
    }
  };

  const handleBlockClients = async () => {
    if (selectedClients.length === 0) return;
    try {
      await blockClients(selectedClients, blockReason);
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Block error:", error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await exportClients("excel");
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "clients.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setOptionsOpen(false);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await exportClients("csv");
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "clients.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setOptionsOpen(false);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const handleMergeDuplicates = async () => {
    try {
      setLoading(true);
      await mergeDuplicateClients();
      await fetchClients();
      setOptionsOpen(false);
      alert("Duplicate clients merged successfully based on phone number.");
    } catch (error) {
      console.error("Merge error:", error);
      alert("Failed to merge duplicate clients.");
    } finally {
      setLoading(false);
    }
  };

  const handleMergeSelected = async () => {

    if (selectedClients.length !== 2 || !primaryClientId) return;
    const secondaryId = selectedClients.find(id => id !== primaryClientId);
    if (!secondaryId) return;

    try {
      setLoading(true);
      await mergeSelectedClients(primaryClientId, secondaryId);
      setSelectedClients([]);
      setMergeModalOpen(false);
      setPrimaryClientId(null);
      await fetchClients();
      alert("Clients merged successfully.");
    } catch (error) {
      console.error("Merge error:", error);
      alert("Failed to merge clients.");
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="clients-page">

      {/* ================= FILTER DRAWER ================= */}
      {showFilter && (
        <div className="filter-overlay">
          <div className="filter-drawer">

            <div className="filter-header">
              <button
                className="close-btn"
                onClick={() => setShowFilter(false)}
              >
                <X size={16} />
              </button>
              <h4>All filters</h4>
            </div>

            <div className="filter-body">

              <div className="filter-item">
                <div className="filter-title">
                  <div className="title-left">
                    <People size={16} />
                    <span>Client group</span>
                  </div>
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="filter-item">

                <div
                  className="filter-title"
                  onClick={() => setGenderOpen(!genderOpen)}
                >
                  <div className="title-left">
                    <Person size={16} />
                    <span>Gender</span>

                    {selectedGender && (
                      <span className="filter-count">1</span>
                    )}
                  </div>

                  <div className="title-right">

                    {selectedGender && (
                      <span
                        className="clear-text"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGender(null);
                        }}
                      >
                        Clear
                      </span>
                    )}

                    {genderOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </div>

                {genderOpen && (
                  <div className="filter-options">

                    {genderOptions.map((g) => (
                      <div
                        key={g}
                        className={`option ${selectedGender === g ? "active" : ""
                          }`}
                        onClick={() => setSelectedGender(g)}
                      >
                        <span>{g}</span>

                        {selectedGender === g && (
                          <span className="check-icon">✓</span>
                        )}
                      </div>
                    ))}

                  </div>
                )}

              </div>

            </div>

            <div className="filter-footer">

              <button
                className="clear-btn"
                onClick={() => setSelectedGender(null)}
              >
                Clear filters
              </button>

              <button
                className="apply-btn"
                onClick={() => setShowFilter(false)}
              >
                Apply
              </button>



            </div>

          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="page-header">

        <div className="header-left">
          <div className="title-container">
            <h2 className="page-title">Clients list</h2>
            <span className="client-count">{clients.length}</span>
          </div>
          <p className="page-subtitle">
            View, add, edit and delete your client's details.
            <span className="learn-more-link"> Learn more</span>
          </p>
        </div>

        <div className="header-actions">
          {/* OPTIONS DROPDOWN */}
          <div className="options-dropdown">
            <button
              className="btn-outline-premium"
              onClick={() => setOptionsOpen(!optionsOpen)}
            >
              Options
              <ChevronDown size={14} className={`chevron ${optionsOpen ? 'open' : ''}`} />
            </button>

            {optionsOpen && (
              <div className="options-menu">
                <div
                  className="option-item"
                  onClick={() => {
                    setOptionsOpen(false);
                    navigate("/dashboard/clients/import");
                  }}
                >
                  <ArrowRight size={14} />
                  Import clients
                </div>
                <div className="option-item" onClick={handleMergeDuplicates}>
                  <ArrowLeftRight size={14} />
                  Merge clients
                </div>
                <div className="divider" />
                <div className="export-title">Export</div>
                <div className="option-item" onClick={handleExportExcel}>
                  <FileEarmarkExcel size={14} />
                  Excel
                </div>
                <div className="option-item" onClick={handleExportCSV}>
                  <FiletypeCsv size={14} />
                  CSV
                </div>
              </div>
            )}
          </div>

          {/* ADD BUTTON */}
          <button
            className="btn-add-primary"
            onClick={() => navigate("/dashboard/clients/add")}
          >
            Add
          </button>
        </div>
      </div>

      {/* ================= IMPORT BANNER ================= */}
      <div className="import-banner">
        <div className="banner-content">
          <h3>Import your client list</h3>
          <p>Takes a few minutes and prevents new client fees for existing clients who book online</p>
          <div className="banner-actions">
            <button className="btn-banner-white" onClick={() => navigate("/dashboard/clients/import")}>
              Start import
            </button>
            <span className="banner-link">Learn more</span>
          </div>
        </div>
        <div className="banner-image">
          {/* This would ideally be the avatars image from the screenshot */}
        </div>
        <button className="banner-close">
          <X size={18} />
        </button>
      </div>

      {/* ================= SEARCH + SORT ================= */}
      <div className="search-container">

        <div className="search-section">

          <div className="search-left">

            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Name, email or phone"
              />
            </div>

            <button
              className="btn-outline-premium"
              onClick={() => setShowFilter(true)}
            >
              <Sliders size={14} /> Filters
            </button>

          </div>

          <div className="sort-dropdown">

            <button
              className="btn-outline-premium sort-btn"
              onClick={() => setSortOpen(!sortOpen)}
            >
              {selectedSort}
              <ArrowDownUp size={14} />
            </button>

            {sortOpen && (
              <div className="sort-menu">

                {sortOptions.map((option) => (
                  <div
                    key={option}
                    className={`sort-item ${selectedSort === option ? "active" : ""
                      }`}
                    onClick={() => {
                      setSelectedSort(option);
                      setSortOpen(false);
                    }}
                  >
                    {option}
                  </div>
                ))}

              </div>
            )}

          </div>

        </div>
      </div>

      {/* ================= TABLE ================= */}
      {loading ? (
        <div className="text-center p-5">Loading clients...</div>
      ) : (
        <div className="table-card">
          <div className="clients-table">
            {selectedClients.length > 0 ? (
              <div className="table-header selected-header">
                <div className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedClients.length === clients.length}
                    onChange={handleSelectAll}
                  />
                </div>
                <div className="selected-actions-container" style={{ gridColumn: '2 / -1' }}>
                  <div className="selected-count">
                    {selectedClients.length === clients.length ? "All selected" : `${selectedClients.length} selected`}
                    <span className="dot">•</span>
                    <button className="deselect-btn" onClick={() => setSelectedClients([])}>Deselect</button>
                  </div>
                  <div className="selected-actions-buttons">
                    <div className="bulk-edit-dropdown">
                      <button
                        className="btn-outline"
                        onClick={() => setBulkEditOpen(!bulkEditOpen)}
                      >
                        Bulk edit {bulkEditOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {bulkEditOpen && (
                        <div className="bulk-edit-menu">
                          <div
                            className="bulk-edit-item"
                            onClick={() => {
                              setBulkEditOpen(false);
                              setBlockModalOpen(true);
                            }}
                          >
                            Block customers
                          </div>
                        </div>
                      )}
                    </div>
                    <button className="btn-outline text-danger" onClick={() => setDeleteModalOpen(true)}>Delete</button>

                  </div>
                </div>
              </div>
            ) : (
              <div className="table-header">
                <div className="col-checkbox">
                  <input type="checkbox" onChange={handleSelectAll} checked={false} />
                </div>
                <div className="col-name">Client name <ArrowUp size={12} /></div>
                <div>Mobile number</div>
                <div>Reviews</div>
                <div>Sales</div>
                <div>Created at</div>
              </div>
            )}

            {clients.length === 0 ? (
              <div className="text-center p-5 text-muted">No clients found.</div>
            ) : (
              clients.map(client => (
                <div
                  key={client.id}
                  className="table-row"
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setIsDrawerOpen(true);
                  }}
                >
                  <div className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(String(client.id))}
                      onChange={() => { }}
                      onClick={(e) => handleSelectClient(e, String(client.id))}
                    />
                  </div>

                  <div className="col-name">
                    <div className="avatar">{(client.first_name?.[0] || 'C').toUpperCase()}</div>
                    <div>
                      <div className="name">
                        {`${client.first_name || ''} ${client.last_name || ''}`}
                        {client.is_blocked && (
                          <span className="blocked-badge">Blocked</span>
                        )}
                      </div>
                      <div className="email">{client.email || '-'}</div>
                    </div>
                  </div>

                  <div>{client.phone_number || '-'}</div>
                  <div>-</div>
                  <div>-</div>
                  <div>
                    {client.created_at
                      ? new Date(client.created_at).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="results-text">
        Viewing 1–{clients.length} of {clients.length} results
      </div>

      {/* ================= DELETE MODAL ================= */}
      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h4>Delete clients?</h4>
              <button
                className="close-btn"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteInput("");
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this client? This operation can't be undone.</p>

              <div className="input-group">
                <label>Type DELETE to confirm</label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-outline mt-0 w-100"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteInput("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn-danger w-100"
                disabled={deleteInput !== "DELETE"}
                onClick={async () => {
                  await handleDeleteClients();
                  setDeleteModalOpen(false);
                  setDeleteInput("");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BLOCK MODAL ================= */}
      {blockModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h4>Block client</h4>
              <button
                className="close-btn"
                onClick={() => {
                  setBlockModalOpen(false);
                  setBlockReason("");
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Blocking clients prevents them from booking online appointments with you and automatically excludes them from any marketing messages.</p>

              <div className="input-group">
                <label>Select blocking reason</label>
                <div className="select-wrapper">
                  <select
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className={blockReason === "" ? "placeholder-selected" : ""}
                  >
                    <option value="" disabled hidden>Select blocking reason</option>
                    <option value="Too many no-shows">Too many no-shows</option>
                    <option value="Too many late cancellations">Too many late cancellations</option>
                    <option value="Too many reschedules">Too many reschedules</option>
                    <option value="Rude or inappropriate to a team member">Rude or inappropriate to a team member</option>
                    <option value="Refused to pay">Refused to pay</option>
                    <option value="Booked fake appointments">Booked fake appointments</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="select-icon" size={14} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-outline mt-0 w-100"
                onClick={() => {
                  setBlockModalOpen(false);
                  setBlockReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn-dark w-100"
                disabled={!blockReason}
                onClick={async () => {
                  await handleBlockClients();
                  setBlockModalOpen(false);
                  setBlockReason("");
                }}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MERGE MODAL ================= */}
      {mergeModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h4>Merge clients</h4>
              <button className="close-btn" onClick={() => setMergeModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Select the primary client to keep. The other client's history (sessions, notes, etc.) will be merged into this one, and the secondary record will be deleted.</p>

              <div className="input-group">
                <label>Choose primary profile</label>
                <div className="merge-options">
                  {selectedClients.map(id => {
                    const client = clients.find(c => String(c.id) === id);
                    return (
                      <div
                        key={id}
                        className={`merge-option-card ${primaryClientId === id ? 'active' : ''}`}
                        onClick={() => setPrimaryClientId(id)}
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: primaryClientId === id ? '#f3f4f6' : 'white',
                          borderColor: primaryClientId === id ? '#6366f1' : '#e5e7eb'
                        }}
                      >
                        <input
                          type="radio"
                          name="primaryClient"
                          checked={primaryClientId === id}
                          readOnly
                        />
                        <div className="client-mini-info">
                          <div style={{ fontWeight: 600 }}>{client?.first_name} {client?.last_name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{client?.email || client?.phone_number}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline w-100" onClick={() => setMergeModalOpen(false)}>Cancel</button>
              <button
                className="btn-dark w-100"
                onClick={handleMergeSelected}
                disabled={!primaryClientId}
              >
                Merge to primary
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientDetailsDrawer
        clientId={selectedClientId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>

  );
}
