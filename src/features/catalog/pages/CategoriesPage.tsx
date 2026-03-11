import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../hooks/useCategories.ts";
import "../styles/CategoriesPage.scss";

const CategoriesPage: React.FC = () => {
    const navigate = useNavigate();
    const { categories, loading, error, createCategory, deleteCategory } = useCategories();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        setSaving(true);
        await createCategory({ name: newCategoryName.trim() });
        setNewCategoryName("");
        setShowAddModal(false);
        setSaving(false);
    };

    return (
        <div className="categories-page">
            <div className="categories-page__header">
                <button className="btn btn-link" onClick={() => navigate("/dashboard/catalog/services")}>
                    <i className="bi bi-arrow-left" /> Back to Services
                </button>
                <h1>Categories</h1>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <i className="bi bi-plus-lg" /> Add Category
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : (
                <div className="categories-page__list">
                    {categories.length === 0 ? (
                        <div className="categories-page__empty"><p>No categories yet. Add your first category.</p></div>
                    ) : (
                        categories.map((cat: any) => (
                            <div key={cat.id} className="categories-page__item">
                                <div className="categories-page__item-drag"><i className="bi bi-grip-vertical" /></div>
                                <div className="categories-page__item-info">
                                    <span className="categories-page__item-name">{cat.name}</span>
                                    <span className="categories-page__item-count">{cat.serviceCount} services</span>
                                </div>
                                <div className="categories-page__item-actions">
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/dashboard/catalog/services/categories/${cat.id}/edit`)}>Edit</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteCategory(cat.id)}>Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showAddModal && (
                <div className="modal show d-block" tabIndex={-1}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Add Category</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
                            </div>
                            <div className="modal-body">
                                <label className="form-label">Category Name</label>
                                <input type="text" className="form-control" value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Hair, Nails, Skin" autoFocus />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !newCategoryName.trim()}>
                                    {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null} Save
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show" onClick={() => setShowAddModal(false)} />
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;