import { useEffect, useState } from "react";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
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
  DashCircleFill,
} from "react-bootstrap-icons";
import ClientDetailsDrawer from "../components/ClientDetailsDrawer";

// UI Components
import { Button, Badge, Input, Modal } from "../../../components/ui";
import { useTranslation } from "react-i18next";

import "../styles/ClientsListPage.scss";

export default function ClientsListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get(CLIENT.BASE);
      console.log("CLIENT API RESPONSE:", res.data);
      const clientsData = res.data?.data?.items || [];
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setCurrentPage(1);
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
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");



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
        selectedClients.map((id) => api.delete(CLIENT.BY_ID(id)))
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
      await api.patch(CLIENT.BLOCK, { client_ids: selectedClients, reason: blockReason });
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Block error:", error);
    }
  };

  const handleUnblockClients = async () => {
    if (selectedClients.length === 0) return;
    try {
      await api.patch(CLIENT.UNBLOCK, { client_ids: selectedClients });
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Unblock error:", error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await api.get(CLIENT.EXPORT("excel"), { responseType: "blob" });
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
      const res = await api.get(CLIENT.EXPORT("csv"), { responseType: "blob" });
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
      await api.post(CLIENT.MERGE_DUPLICATES, { merge_by: "phone" });
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
      await api.post(CLIENT.MERGE, { primary_id: primaryClientId, secondary_id: secondaryId });
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
      <div className="page-header d-flex align-items-center justify-content-between mb-4">
        <div className="header-left">
          <div className="title-container d-flex align-items-center">
            <h2 className="page-title mb-0">{t("clients.header.title", "Clients list")}</h2>
            <Badge variant="dark" pill className="ms-3">{clients.length}</Badge>
          </div>
          <p className="page-subtitle text-muted mt-2">
            {t("clients.header.subtitle", "View, add, edit and delete your client's details.")}
            <span className="learn-more-link text-primary cursor-pointer ms-1"> {t("clients.header.learnMore", "Learn more")}</span>
          </p>
        </div>

        <div className="header-actions">
          <Button
            variant="outline-dark"
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')}
          >
            {i18n.language === 'en' ? 'Español' : 'English'}
          </Button>
          {/* OPTIONS DROPDOWN */}
          <div className="options-dropdown position-relative">
            <Button
              variant="outline-dark"
              onClick={() => setOptionsOpen(!optionsOpen)}
              iconRight={<ChevronDown size={14} className={`chevron ${optionsOpen ? 'open' : ''}`} />}
            >
              Options
            </Button>

            {optionsOpen && (
              <div className="options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2" style={{ width: '200px' }}>
                <div
                  className="option-item p-2 cursor-pointer"
                  onClick={() => {
                    setOptionsOpen(false);
                    navigate("/dashboard/clients/import");
                  }}
                >
                  <ArrowRight size={14} className="me-2" />
                  Import clients
                </div>
                <div className="option-item p-2 cursor-pointer" onClick={handleMergeDuplicates}>
                  <ArrowLeftRight size={14} className="me-2" />
                  Merge clients
                </div>
                <div className="divider border-top my-1" />
                <div className="export-title px-2 py-1 small fw-bold text-muted">Export</div>
                <div className="option-item p-2 cursor-pointer" onClick={handleExportExcel}>
                  <FileEarmarkExcel size={14} className="me-2" />
                  Excel
                </div>
                <div className="option-item p-2 cursor-pointer" onClick={handleExportCSV}>
                  <FiletypeCsv size={14} className="me-2" />
                  CSV
                </div>
              </div>
            )}
          </div>

          {/* ADD BUTTON */}
          <Button
            variant="dark"
            onClick={() => navigate("/dashboard/clients/add")}
            className="ms-2"
          >
            Add
          </Button>
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
      <div className="search-container mb-4">
        <div className="search-section d-flex align-items-center justify-content-between">
          <div className="search-left d-flex align-items-center gap-2 flex-grow-1 me-3">
            <div style={{ maxWidth: '400px', flex: 1 }}>
              <Input
                placeholder="Name, email or phone"
                className="mb-0"
                containerClass="mb-0"
                iconLeft={<Search size={16} />}
              />
            </div>

            <Button
              variant="outline-dark"
              onClick={() => setShowFilter(true)}
              iconLeft={<Sliders size={14} />}
            >
              Filters
              {selectedGender && <Badge variant="dark" pill className="ms-2">1</Badge>}
            </Button>
          </div>

          <div className="sort-dropdown position-relative">
            <Button
              variant="outline-dark"
              onClick={() => setSortOpen(!sortOpen)}
              iconRight={<ArrowDownUp size={14} />}
            >
              {selectedSort}
            </Button>

            {sortOpen && (
              <div className="sort-menu shadow border position-absolute end-0 mt-2 bg-white z-2" style={{ width: '220px' }}>
                {sortOptions.map((option) => (
                  <div
                    key={option}
                    className={`sort-item p-2 cursor-pointer ${selectedSort === option ? "bg-light fw-bold" : ""}`}
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
                          {selectedClients.some(id => clients.find(c => String(c.id) === id)?.is_blocked) ? (
                            <div
                              className="bulk-edit-item"
                              onClick={() => {
                                setBulkEditOpen(false);
                                handleUnblockClients();
                              }}
                            >
                              Unblock customers
                            </div>
                          ) : (
                            <div
                              className="bulk-edit-item"
                              onClick={() => {
                                setBulkEditOpen(false);
                                setBlockModalOpen(true);
                              }}
                            >
                              Block customers
                            </div>
                          )}
                          <div
                            className="bulk-edit-item"
                            onClick={() => {
                              setBulkEditOpen(false);
                              setTagsModalOpen(true);
                            }}
                          >
                            Add tags
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
              (() => {

                const paginatedClients = clients.slice(
                  (currentPage - 1) * ROWS_PER_PAGE,
                  currentPage * ROWS_PER_PAGE
                );
                return paginatedClients.map(client => (
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
                      <div className="avatar-container position-relative d-inline-block">
                        <div className="avatar">{(client.first_name?.[0] || 'C').toUpperCase()}</div>
                        {client.is_blocked && (
                          <div
                            className="position-absolute bg-white rounded-circle d-flex align-items-center justify-content-center"
                            style={{ 
                              bottom: '-2px', 
                              right: '-2px', 
                              width: '16px', 
                              height: '16px',
                              boxShadow: '0 0 0 1.5px #fff' 
                            }}
                          >
                            <DashCircleFill className="text-danger" size={14} />
                          </div>
                        )}
                      </div>
                      <div className="ms-3">
                        <div className="name">
                          {`${client.first_name || ''} ${client.last_name || ''}`}
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
                ));
              })()
            )}
          </div>
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      {clients.length > 0 && (() => {
        const totalPages = Math.ceil(clients.length / ROWS_PER_PAGE);
        const startItem = (currentPage - 1) * ROWS_PER_PAGE + 1;
        const endItem = Math.min(currentPage * ROWS_PER_PAGE, clients.length);
        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
        return (
          <div className="pagination-bar d-flex align-items-center justify-content-between mt-4">
            <div className="results-text">
              Viewing {startItem}–{endItem} of {clients.length} results
            </div>
            <div className="pagination-controls d-flex align-items-center gap-1">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                ← Prev
              </button>
              {pageNumbers.map(page => (
                <button
                  key={page}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ================= DELETE MODAL ================= */}
      <Modal
        show={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete clients?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE"}
              onClick={async () => {
                await handleDeleteClients();
                setDeleteModalOpen(false);
                setDeleteInput("");
              }}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteInput("");
              }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">Are you sure you want to delete this client? This operation can't be undone.</p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>

      {/* ================= BLOCK MODAL ================= */}
      <Modal
        show={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Block client"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="dark"
              fullWidth
              disabled={!blockReason}
              onClick={async () => {
                await handleBlockClients();
                setBlockModalOpen(false);
                setBlockReason("");
              }}
            >
              Block
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => {
                setBlockModalOpen(false);
                setBlockReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">Blocking clients prevents them from booking online appointments with you and automatically excludes them from any marketing messages.</p>
        <div className="mb-3">
          <label className="form-label fw-semibold small">Select blocking reason</label>
          <select
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className={`form-select ${blockReason === "" ? "text-muted" : ""}`}
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
        </div>
      </Modal>

      {/* ================= ADD TAGS MODAL ================= */}
      <Modal
        show={tagsModalOpen}
        onClose={() => setTagsModalOpen(false)}
        title="Add client tags"
        footer={
          <div className="d-flex justify-content-end gap-2 w-100">
            <Button
              variant="outline-dark"
              onClick={() => {
                setTagsModalOpen(false);
                setTagInput("");
              }}
              style={{ borderRadius: '999px', padding: '8px 24px', fontWeight: 600, border: '1px solid #d1d5db' }}
            >
              Cancel
            </Button>
            <Button
              variant="dark"
              disabled={!tagInput}
              onClick={() => {
                setTagsModalOpen(false);
                setTagInput("");
                // handle add tags
              }}
              style={{ borderRadius: '999px', padding: '8px 24px', fontWeight: 600 }}
            >
              Apply
            </Button>
          </div>
        }
      >
        <div className="mb-4 mt-2">
          <label className="form-label fw-bold" style={{ fontSize: '13px' }}>Tags</label>
          <div className="position-relative">
            <input
              type="text"
              className="form-control"
              placeholder="Select or create a tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              style={{ 
                padding: '10px 14px', 
                borderRadius: '8px', 
                border: '1px solid #d1d5db',
                fontSize: '15px'
              }}
            />
            <ChevronDown size={14} className="position-absolute text-muted" style={{ right: '14px', top: '14px', pointerEvents: 'none' }} />
          </div>
        </div>
      </Modal>

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
