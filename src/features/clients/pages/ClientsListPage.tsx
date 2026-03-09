import { useNavigate } from "react-router-dom";
import { useState } from "react";

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

import "../styles/ClientsListPage.scss";

export default function ClientsListPage() {
  const navigate = useNavigate();

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
  const mockClients = [
    { id: 1, name: "John Doe", email: "john@example.com", mobile: "-", reviews: "-", sales: "₹0", createdAt: "2 Mar 2026", avatar: "J" }
  ];

  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedClients(mockClients.map(c => c.id));
    else setSelectedClients([]);
  };

  const handleSelectClient = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedClients(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
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
                className="btn-dark"
                onClick={() => navigate("/dashboard/clients/add")}
              >
                Add
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="page-header">

        <div>
          <h4>
            Clients list <span className="count-badge">1</span>
          </h4>

          <p>
            View, add, edit and delete your client’s details.
            <span className="learn-more"> Learn more</span>
          </p>
        </div>

        <div className="header-actions">

          {/* OPTIONS DROPDOWN */}
          <div className="options-dropdown">

            <button
              className="btn-outline"
              onClick={() => setOptionsOpen(!optionsOpen)}
            >
              Options

              {optionsOpen ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}

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

                <div className="option-item">
                  <ArrowLeftRight size={14} />
                  Merge clients
                </div>

                <div className="divider" />

                <div className="export-title">
                  Export
                </div>

                <div className="option-item">
                  <FileEarmarkExcel size={14} />
                  Excel
                </div>

                <div className="option-item">
                  <FiletypeCsv size={14} />
                  CSV
                </div>

              </div>
            )}

          </div>

          {/* ADD BUTTON */}
          <button
            className="btn-dark"
            onClick={() => navigate("/dashboard/clients/add")}
          >
            Add
          </button>

        </div>
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
              className="btn-outline"
              onClick={() => setShowFilter(true)}
            >
              <Sliders size={14} /> Filters
            </button>

          </div>

          <div className="sort-dropdown">

            <button
              className="btn-outline sort-btn"
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
      <div className="table-card">

        <div className="clients-table">

          {selectedClients.length > 0 ? (
            <div className="table-header selected-header">
              <div className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedClients.length === mockClients.length}
                  onChange={handleSelectAll}
                />
              </div>
              <div className="selected-actions-container" style={{ gridColumn: '2 / -1' }}>
                <div className="selected-count">
                  {selectedClients.length === mockClients.length ? "All selected" : `${selectedClients.length} selected`}
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

          {mockClients.map(client => (
            <div
              key={client.id}
              className="table-row"
              onClick={() => navigate(`/dashboard/clients/${client.id}`)}
            >
              <div className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedClients.includes(client.id)}
                  onChange={() => { }}
                  onClick={(e) => handleSelectClient(e, client.id)}
                />
              </div>

              <div className="col-name">
                <div className="avatar">{client.avatar}</div>
                <div>
                  <div className="name">{client.name}</div>
                  <div className="email">{client.email}</div>
                </div>
              </div>

              <div>{client.mobile}</div>
              <div>{client.reviews}</div>
              <div>{client.sales}</div>
              <div>{client.createdAt}</div>
            </div>
          ))}

        </div>

      </div>

      <div className="results-text">
        Viewing 1–{mockClients.length} of {mockClients.length} results
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
                onClick={() => {
                  // Handle delete
                  setSelectedClients([]);
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
                onClick={() => {
                  // Handle block
                  setSelectedClients([]);
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

    </div>
  );
}