import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dropdown from "../../../components/ui/Dropdown";
import { toTitleCase } from "../../../utils/titleCase";
import "../styles/CategoriesPage.scss";

interface Category {
  id: number;
  name: string;
  serviceCount: number;
  color: string;
  status: "active" | "inactive";
}

const mockCategories: Category[] = [
  {
    id: 1,
    name: "Hair Services",
    serviceCount: 8,
    color: "#0d6efd",
    status: "active",
  },
  {
    id: 2,
    name: "Nail Services",
    serviceCount: 5,
    color: "#198754",
    status: "active",
  },
  {
    id: 3,
    name: "Makeup",
    serviceCount: 4,
    color: "#dc3545",
    status: "active",
  },
  {
    id: 4,
    name: "Skin Care",
    serviceCount: 6,
    color: "#6f42c1",
    status: "active",
  },
  {
    id: 5,
    name: "Massage",
    serviceCount: 3,
    color: "#fd7e14",
    status: "inactive",
  },
];

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(mockCategories);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    color: "#0d6efd",
    status: "active" as "active" | "inactive",
  });

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", color: "#0d6efd", status: "active" });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditItem(cat);
    setForm({ name: cat.name, color: cat.color, status: cat.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const normalized = { ...form, name: toTitleCase(form.name.trim()) };
    if (editItem) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editItem.id ? { ...c, ...normalized } : c)),
      );
    } else {
      setCategories((prev) => [
        ...prev,
        { id: Date.now(), ...normalized, serviceCount: 0 },
      ]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) =>
    setCategories((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="categories-page container-fluid py-4 px-4">
      {/* Header */}
      <div className="row align-items-center mb-4">
        <div className="col">
          <h4 className="categories-page__title mb-0 fw-bold">Categories</h4>
          <p className="text-muted small mb-0">
            Organise your services into categories
          </p>
        </div>
        <div className="col-auto d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => navigate("/dashboard/catalog/services")}
          >
            <i className="bi bi-arrow-left" />
            Services
          </button>
          <button
            className="btn btn-sm btn-primary d-flex align-items-center gap-1"
            onClick={openAdd}
          >
            <i className="bi bi-plus-lg" />
            Add Category
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-2">
          <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 categories-page__table">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Category</th>
                  <th>Services</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-5">
                      <i className="bi bi-tag fs-2 d-block mb-2" />
                      No categories found
                    </td>
                  </tr>
                ) : (
                  filtered.map((cat) => (
                    <tr key={cat.id} className="categories-page__row">
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="categories-page__color-dot"
                            style={{ background: cat.color }}
                          />
                          <span className="fw-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {cat.serviceCount} services
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge categories-page__status-badge ${cat.status === "active" ? "bg-success" : "bg-secondary"}`}
                        >
                          {cat.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary py-0 px-2"
                            onClick={() => openEdit(cat)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger py-0 px-2"
                            onClick={() => handleDelete(cat.id)}
                            title="Delete"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-white text-muted small px-4 py-2">
          {filtered.length} of {categories.length} categories
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-semibold">
                  {editItem ? "Edit Category" : "Add Category"}
                </h6>
                <button
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-medium">
                    Category Name <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="e.g. Hair Services"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-medium d-block">
                    Color
                  </label>
                  <div className="d-flex gap-2 flex-wrap">
                    {[
                      "#0d6efd",
                      "#198754",
                      "#dc3545",
                      "#fd7e14",
                      "#6f42c1",
                      "#20c997",
                      "#0dcaf0",
                      "#ffc107",
                    ].map((color) => (
                      <div
                        key={color}
                        className={`rounded-circle border-2 ${form.color === color ? "border border-dark" : ""}`}
                        style={{
                          width: 26,
                          height: 26,
                          background: color,
                          cursor: "pointer",
                          outline:
                            form.color === color ? "2px solid #000" : "none",
                        }}
                        onClick={() => setForm({ ...form, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="mb-1">
                  <label className="form-label small fw-medium">Status</label>
                  <Dropdown
                    className="form-select form-select-sm"
                    searchable={false}
                    value={form.status}
                    options={[
                      { id: "active", name: "Active" },
                      { id: "inactive", name: "Inactive" },
                    ]}
                    onChange={(id) => setForm({ ...form, status: id as "active" | "inactive" })}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-sm btn-primary" onClick={handleSave}>
                  {editItem ? "Save Changes" : "Add Category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
