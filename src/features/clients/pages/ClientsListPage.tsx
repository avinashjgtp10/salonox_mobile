import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import Pagination from "../../../components/ui/Pagination";
import { useNavigate, useLocation } from "react-router-dom";
import {
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
  PersonPlus,
  ThreeDotsVertical,
  PencilSquare,
  Trash,
  SlashCircle,
  CheckCircle,
} from "react-bootstrap-icons";
import ClientDetailsDrawer from "../components/ClientDetailsDrawer";
import ClientSearchInput from "../components/ClientSearchInput";
import ClientImportModal from "../components/ClientImportModal";
import { toast } from "react-hot-toast";

// UI Components
import {
  Button,
  Badge,
  Input,
  Modal,
  DownloadButton,
  Loader,
} from "../../../components/ui";
import { useTranslation } from "react-i18next";

import "../styles/ClientsListPage.scss";

export default function ClientsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const sortMap: Record<string, { sort_by: string; sort_order: string }> = {
    "First name (A-Z)": { sort_by: "full_name", sort_order: "asc" },
    "First name (Z-A)": { sort_by: "full_name", sort_order: "desc" },
    "Created at (oldest first)": { sort_by: "created_at", sort_order: "asc" },
    "Created at (newest first)": { sort_by: "created_at", sort_order: "desc" },
    "Total sales (highest first)": { sort_by: "total_sales", sort_order: "desc" },
    "Total sales (lowest first)": { sort_by: "total_sales", sort_order: "asc" },
  };

  const isMountedRef = useRef(false);

  const fetchClients = useCallback(async (
    page = 1,
    sort = "Created at (newest first)",
    gender: string | null = null,
    ps?: number,
  ) => {
    setLoading(true);
    try {
      const { sort_by, sort_order } = sortMap[sort] ?? { sort_by: "created_at", sort_order: "desc" };
      const resolvedPageSize = ps ?? 20;
      const params: Record<string, any> = {
        page,
        pageSize: resolvedPageSize,
        inactive: true,
        sort_by,
        sort_order,
      };
      if (gender && gender !== "All") params.gender = gender.toLowerCase();
      const res = await api.get(CLIENT.BASE, { params });
      const payload = res.data?.data;
      const items = payload?.items ?? [];
      const mapped = Array.isArray(items)
        ? items.map((c: any) => ({ ...c, is_blocked: !c.is_active }))
        : [];
      setClients(mapped);
      setTotal(payload?.totalRecords ?? payload?.total ?? 0);
      setCurrentPage(page);
      if (ps !== undefined) setPageSize(ps);
    } catch (error) {
      console.error("Error fetching clients", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    isMountedRef.current = true;
  }, [fetchClients]);

  useEffect(() => {
    const handler = () => setOpenRowMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

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
    "Created at (oldest first)",
    "Created at (newest first)",
    "Total sales (highest first)",
    "Total sales (lowest first)",
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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<
    string | number | null
  >(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  useEffect(() => {
    const openClientId = (location.state as any)?.openClientId;
    if (openClientId) {
      setSelectedClientId(openClientId);
      setIsDrawerOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked)
      setSelectedClients(clients.map((c: any) => String(c.id)));
    else setSelectedClients([]);
  };

  const handleSelectClient = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const handleDeleteClients = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedClients.map((id) => api.delete(CLIENT.BY_ID(id) + "?hard=true")),
      );
      toast.success(
        selectedClients.length > 1
          ? "Clients deleted successfully"
          : "Client deleted successfully"
      );
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Error deleting clients", error);
      toast.error("Failed to delete client(s)");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBlockClients = async () => {
    if (selectedClients.length === 0) return;
    try {
      await api.post(CLIENT.BLOCK, {
        client_ids: selectedClients,
        reason: blockReason,
      });
      toast.success("Clients blocked successfully");
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Block error:", error);
      toast.error("Failed to block clients");
    }
  };

  const handleUnblockClients = async () => {
    if (selectedClients.length === 0) return;
    try {
      await api.post(CLIENT.UNBLOCK, { client_ids: selectedClients });
      toast.success("Clients unblocked successfully");
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Unblock error:", error);
      toast.error("Failed to unblock clients");
    }
  };

  const handleUnblockSingle = async (clientId: string) => {
    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        String(c.id) === clientId ? { ...c, is_blocked: false } : c
      )
    );
    try {
      await api.post(CLIENT.UNBLOCK, { client_ids: [clientId] });
      toast.success("Client unblocked successfully");
    } catch (error: any) {
      // Revert on failure
      setClients((prev) =>
        prev.map((c) =>
          String(c.id) === clientId ? { ...c, is_blocked: true } : c
        )
      );
      console.error("Unblock error:", error?.response?.data || error);
      toast.error("Failed to unblock client");
    }
  };

  const handleBlockSingle = async (clientId: string) => {
    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        String(c.id) === clientId ? { ...c, is_blocked: true } : c
      )
    );
    try {
      await api.post(CLIENT.BLOCK, { client_ids: [clientId], reason: "Blocked by admin" });
      toast.success("Client blocked successfully");
    } catch (error: any) {
      // Revert on failure
      setClients((prev) =>
        prev.map((c) =>
          String(c.id) === clientId ? { ...c, is_blocked: false } : c
        )
      );
      console.error("Block error:", error?.response?.data || error);
      toast.error("Failed to block client");
    }
  };

  const handleMergeDuplicates = async () => {
    try {
      setLoading(true);
      await api.post(CLIENT.MERGE_DUPLICATES, { merge_by: "phone" });
      await fetchClients();
      setOptionsOpen(false);
      toast.success("Duplicate clients merged successfully");
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Failed to merge duplicate clients");
    } finally {
      setLoading(false);
    }
  };

  const handleMergeSelected = async () => {
    if (selectedClients.length !== 2 || !primaryClientId) return;
    const secondaryId = selectedClients.find((id) => id !== primaryClientId);
    if (!secondaryId) return;

    try {
      setLoading(true);
      await api.post(CLIENT.MERGE, {
        primary_id: primaryClientId,
        secondary_id: secondaryId,
      });
      setSelectedClients([]);
      setMergeModalOpen(false);
      setPrimaryClientId(null);
      await fetchClients();
      toast.success("Clients merged successfully");
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Failed to merge clients");
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

                    {selectedGender && <span className="filter-count">1</span>}
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
                onClick={() => {
                  setSelectedGender(null);
                  setShowFilter(false);
                  fetchClients(1, selectedSort, null);
                }}
              >
                Clear filters
              </button>

              <button
                className="apply-btn"
                onClick={() => {
                  setShowFilter(false);
                  fetchClients(1, selectedSort, selectedGender);
                }}
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
            <h2 className="page-title mb-0">
              {t("clients.header.title", "Clients list")}
            </h2>
            <Badge variant="dark" pill className="ms-3">
              {total}
            </Badge>
          </div>
          <p className="page-subtitle text-muted mt-2">
            {t(
              "clients.header.subtitle",
              "View, add, edit and delete your client's details.",
            )}
            <span className="learn-more-link text-primary cursor-pointer ms-1">
              {" "}
              {t("clients.header.learnMore", "Learn more")}
            </span>
          </p>
        </div>

        <div className="header-actions">
          {/* OPTIONS DROPDOWN */}
          <div className="options-dropdown position-relative">
            <Button
              variant="outline-dark"
              pill
              onClick={() => setOptionsOpen(!optionsOpen)}
              iconRight={
                <ChevronDown
                  size={14}
                  className={`chevron ${optionsOpen ? "open" : ""}`}
                />
              }
            >
              Options
            </Button>

            {optionsOpen && (
              <div
                className="options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2"
                style={{ width: "200px" }}
              >
                <div
                  className="option-item p-2 cursor-pointer"
                  onClick={() => {
                    setOptionsOpen(false);
                    setImportModalOpen(true);
                  }}
                >
                  <ArrowRight size={14} className="me-2" />
                  Import clients
                </div>
                <div
                  className="option-item p-2 cursor-pointer"
                  onClick={handleMergeDuplicates}
                >
                  <ArrowLeftRight size={14} className="me-2" />
                  Merge clients
                </div>
                <div className="divider border-top my-1" />
                <div className="export-title px-2 py-1 small fw-bold text-muted">
                  Export
                </div>
                <DownloadButton
                  filename="clients.xlsx"
                  fetcher={async () => {
                    const res = await api.get(CLIENT.EXPORT("excel"), {
                      responseType: "blob",
                    });
                    setOptionsOpen(false);
                    return res.data;
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FileEarmarkExcel size={14} className="me-2" />}
                  className="option-item w-100 text-start p-2 small"
                >
                  Excel
                </DownloadButton>
                <DownloadButton
                  filename="clients.csv"
                  fetcher={async () => {
                    const res = await api.get(CLIENT.EXPORT("csv"), {
                      responseType: "blob",
                    });
                    setOptionsOpen(false);
                    return res.data;
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FiletypeCsv size={14} className="me-2" />}
                  className="option-item w-100 text-start p-2 small"
                >
                  CSV
                </DownloadButton>
              </div>
            )}
          </div>

          {/* ADD BUTTON */}
          <Button
            variant="dark"
            pill
            iconLeft={<PersonPlus size={14} />}
            onClick={() => navigate("/dashboard/clients/add")}
          >
            Add
          </Button>
        </div>
      </div>


      {/* ================= ADD CLIENT BANNER ================= */}
      <div className="clp-invite-banner">
        <div className="clp-banner-content">
          <div className="clp-banner-icon-wrap">
            <People size={28} />
          </div>
          <div>
            <h3 className="clp-banner-title">Add your clients</h3>
            <p className="clp-banner-desc">
              Add clients to keep track of their appointments, preferences, and history.
            </p>
          </div>
        </div>
        <div className="clp-banner-actions">
          <button
            className="clp-banner-btn"
            onClick={() => navigate("/dashboard/clients/add")}
          >
            Add client
          </button>
          <span className="clp-banner-link">Learn more</span>
        </div>
      </div>

      {/* ================= SEARCH + SORT ================= */}
      <div className="search-container mb-4">
        <div className="search-section d-flex align-items-center justify-content-between">
          <div className="search-left d-flex align-items-center gap-2 flex-grow-1 me-3">
            <ClientSearchInput
              placeholder="Search by Name / Phone (min 3 chars)"
              highlight
              onSelect={(client) => {
                setSelectedClientId(client.id);
                setIsDrawerOpen(true);
              }}
            />

            <Button
              className="clients-filter-btn"
              variant="outline-dark"
              onClick={() => setShowFilter(true)}
              iconLeft={<Sliders size={14} />}
            >
              Filters
              {selectedGender && (
                <Badge variant="dark" pill className="ms-2">
                  1
                </Badge>
              )}
            </Button>
          </div>

          <div className="sort-dropdown position-relative">
            <Button
              className="clients-sort-btn"
              variant="outline-dark"
              onClick={() => setSortOpen(!sortOpen)}
              iconRight={<ArrowDownUp size={14} />}
            >
              {selectedSort}
            </Button>

            {sortOpen && (
              <div
                className="sort-menu shadow border position-absolute end-0 mt-2 bg-white z-2"
                style={{ width: "220px" }}
              >
                {sortOptions.map((option) => (
                  <div
                    key={option}
                    className={`sort-item p-2 cursor-pointer ${selectedSort === option ? "bg-light fw-bold" : ""}`}
                    onClick={() => {
                      setSelectedSort(option);
                      setSortOpen(false);
                      fetchClients(1, option, selectedGender);
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
        <Loader message="Loading clients..." size="md" />
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
                <div
                  className="selected-actions-container"
                  style={{ gridColumn: "2 / -1" }}
                >
                  <div className="selected-count">
                    {selectedClients.length === clients.length
                      ? "All on page selected"
                      : `${selectedClients.length} selected`}
                    <span className="dot">•</span>
                    <button
                      className="deselect-btn"
                      onClick={() => setSelectedClients([])}
                    >
                      Deselect
                    </button>
                  </div>
                  <div className="selected-actions-buttons">
                    <div className="bulk-edit-dropdown">
                      <button
                        className="btn-outline"
                        onClick={() => setBulkEditOpen(!bulkEditOpen)}
                      >
                        Bulk edit{" "}
                        {bulkEditOpen ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </button>
                      {bulkEditOpen && (
                        <div className="bulk-edit-menu">
                          {selectedClients.some(
                            (id) =>
                              clients.find((c) => String(c.id) === id)
                                ?.is_blocked,
                          ) ? (
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
                        </div>
                      )}
                    </div>
                    <button
                      className="btn-outline text-danger"
                      onClick={() => setDeleteModalOpen(true)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-header">
                <div className="col-checkbox">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={false}
                  />
                </div>
                <div className="col-name">
                  Client name <ArrowUp size={12} />
                </div>
                <div className="col-mobile">Mobile number</div>
                <div className="col-reviews">Reviews</div>
                <div className="col-sales">Sales</div>
                <div className="col-created">Created at</div>
                <div></div>
              </div>
            )}

            {clients.length === 0 ? (
              <div className="text-center p-5 text-muted">
                No clients found.
              </div>
            ) : (
              (() => {
                return clients.map((client) => (
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
                        onClick={(e) =>
                          handleSelectClient(e, String(client.id))
                        }
                      />
                    </div>

                    <div className="col-name">
                      <div className="avatar-container position-relative d-inline-block">
                        <div className="avatar">
                          {(client.first_name?.[0] || "C").toUpperCase()}
                        </div>
                        {client.is_blocked && (
                          <div
                            className="position-absolute bg-white rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                              bottom: "-2px",
                              right: "-2px",
                              width: "16px",
                              height: "16px",
                              boxShadow: "0 0 0 1.5px #fff",
                            }}
                          >
                            <DashCircleFill className="text-danger" size={14} />
                          </div>
                        )}
                      </div>
                      <div className="client-details ms-3">
                        <div
                          className="name"
                          title={`${client.first_name || ""} ${client.last_name || ""}`.trim() || "-"}
                        >
                          {`${client.first_name || ""} ${client.last_name || ""}`}
                        </div>
                        <div className="email" title={client.email || "-"}>
                          {client.email || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="col-mobile" title={client.phone_number || "-"}>
                      {client.phone_number || "-"}
                    </div>
                    <div className="col-reviews">
                      {client.reviews_count > 0
                        ? `${parseFloat(client.reviews_avg || "0").toFixed(1)} ★ (${client.reviews_count})`
                        : "-"}
                    </div>
                    <div className="col-sales">
                      ₹{parseFloat(client.total_sales || "0").toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="col-created">
                      {client.created_at
                        ? new Date(client.created_at).toLocaleDateString()
                        : "-"}
                    </div>

                    {/* 3-dot row menu */}
                    <div
                      className="col-row-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="row-menu-btn"
                        onClick={() =>
                          setOpenRowMenuId((prev) =>
                            prev === String(client.id) ? null : String(client.id)
                          )
                        }
                      >
                        <ThreeDotsVertical size={16} />
                      </button>
                      {openRowMenuId === String(client.id) && (
                        <div className="row-menu-dropdown">
                          <div
                            className="row-menu-item"
                            onClick={() => {
                              setOpenRowMenuId(null);
                              navigate(`/dashboard/clients/edit/${client.id}`);
                            }}
                          >
                            <PencilSquare size={14} /> Edit
                          </div>
                          {client.is_blocked ? (
                            <div
                              className="row-menu-item success"
                              onClick={() => {
                                setOpenRowMenuId(null);
                                handleUnblockSingle(String(client.id));
                              }}
                            >
                              <CheckCircle size={14} /> Unblock
                            </div>
                          ) : (
                            <div
                              className="row-menu-item warning"
                              onClick={() => {
                                setOpenRowMenuId(null);
                                handleBlockSingle(String(client.id));
                              }}
                            >
                              <SlashCircle size={14} /> Block
                            </div>
                          )}
                          <div
                            className="row-menu-item danger"
                            onClick={() => {
                              setOpenRowMenuId(null);
                              setSelectedClients([String(client.id)]);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash size={14} /> Delete
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={(page) => fetchClients(page, selectedSort, selectedGender, pageSize)}
        onPageSizeChange={(sz) => fetchClients(1, selectedSort, selectedGender, sz)}
        className="mt-4"
      />

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
              disabled={deleteInput !== "DELETE" || isDeleting}
              loading={isDeleting}
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
        <p className="text-muted small mb-4">
          Are you sure you want to delete this client? This operation can't be
          undone.
        </p>
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
        <p className="text-muted small mb-4">
          Blocking clients prevents them from booking online appointments with
          you and automatically excludes them from any marketing messages.
        </p>
        <div className="mb-3">
          <label className="form-label fw-semibold small">
            Select blocking reason
          </label>
          <select
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className={`form-select ${blockReason === "" ? "text-muted" : ""}`}
          >
            <option value="" disabled hidden>
              Select blocking reason
            </option>
            <option value="Too many no-shows">Too many no-shows</option>
            <option value="Too many late cancellations">
              Too many late cancellations
            </option>
            <option value="Too many reschedules">Too many reschedules</option>
            <option value="Rude or inappropriate to a team member">
              Rude or inappropriate to a team member
            </option>
            <option value="Refused to pay">Refused to pay</option>
            <option value="Booked fake appointments">
              Booked fake appointments
            </option>
            <option value="Other">Other</option>
          </select>
        </div>
      </Modal>


      {/* ================= MERGE MODAL ================= */}
      {mergeModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h4>Merge clients</h4>
              <button
                className="close-btn"
                onClick={() => setMergeModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Select the primary client to keep. The other client's history
                (sessions, notes, etc.) will be merged into this one, and the
                secondary record will be deleted.
              </p>

              <div className="input-group">
                <label>Choose primary profile</label>
                <div className="merge-options">
                  {selectedClients.map((id) => {
                    const client = clients.find((c) => String(c.id) === id);
                    return (
                      <div
                        key={id}
                        className={`merge-option-card ${primaryClientId === id ? "active" : ""}`}
                        onClick={() => setPrimaryClientId(id)}
                        style={{
                          padding: "12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          background:
                            primaryClientId === id ? "#f3f4f6" : "white",
                          borderColor:
                            primaryClientId === id ? "#6366f1" : "#e5e7eb",
                        }}
                      >
                        <input
                          type="radio"
                          name="primaryClient"
                          checked={primaryClientId === id}
                          readOnly
                        />
                        <div className="client-mini-info">
                          <div style={{ fontWeight: 600 }}>
                            {client?.first_name} {client?.last_name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {client?.email || client?.phone_number}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-outline w-100"
                onClick={() => setMergeModalOpen(false)}
              >
                Cancel
              </button>
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

      <ClientImportModal
        show={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchClients}
      />
    </div>
  );
}
