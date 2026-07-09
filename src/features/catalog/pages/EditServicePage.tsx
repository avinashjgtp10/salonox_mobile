import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  selectAllCategories,
  selectAllStaff,
  selectStaffLoading,
} from "../../../store/selectors/slices.selectors";
import { useEditServiceForm } from "../hooks/useEditServiceForm.ts";
import BasicDetailsTab from "../components/tabs/BasicDetailsTab.tsx";
import TeamMembersTab from "../components/tabs/TeamMembersTab.tsx";
import ServiceAddOnsTab from "../components/tabs/ServiceAddOnsTab.tsx";
import OnlineBookingTab from "../components/tabs/OnlineBookingTab.tsx";
import PortfolioImagesTab from "../components/tabs/PortfolioImagesTab.tsx";
import FormsTab from "../components/tabs/FormsTab.tsx";
import CommissionTab from "../components/tabs/CommissionTab.tsx";
import SettingsTab from "../components/tabs/SettingsTab.tsx";
import "../styles/AddServicePage.scss";

type TabKey =
  | "basic"
  | "team"
  | "addons"
  | "online-booking"
  | "portfolio"
  | "forms"
  | "commission"
  | "settings";

interface TabItem {
  key: TabKey;
  label: string;
  count?: number;
}

const generalTabs: TabItem[] = [
  { key: "basic", label: "Basic details" },
  { key: "team", label: "Team members" },
  { key: "addons", label: "Service add-ons" },
];

const settingsTabs: TabItem[] = [
  { key: "online-booking", label: "Online booking" },
  { key: "portfolio", label: "Portfolio images" },
  { key: "forms", label: "Consent forms" },
  { key: "commission", label: "Commissions" },
  { key: "settings", label: "Settings" },
];

const EditServicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<TabKey>("basic");

  const rawCategories = useSelector(selectAllCategories);
  const categories = (Array.isArray(rawCategories) ? rawCategories : []).map(
    (c) => ({ id: c.id, name: c.name }),
  );

  const rawStaff = useSelector(selectAllStaff);
  const staffLoading = useSelector(selectStaffLoading);
  const staffMembers = (Array.isArray(rawStaff) ? rawStaff : []).map((s) => ({
    id: String(s.id),
    firstName: s.first_name ?? "",
    lastName: s.last_name ?? "",
    role: s.designation ?? s.role ?? "",
  }));

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  const {
    formData,
    updateField,
    handleSubmit,
    fetchLoading,
    loading,
    error,
    validationErrors,
    serviceName,
  } = useEditServiceForm(id!);

  const onSubmit = async () => {
    const success = await handleSubmit();
    if (success) navigate("/dashboard/catalog/services");
  };

  const hasErrors = (key: TabKey) => !!validationErrors[key];

  const renderTabItem = (tab: TabItem) => (
    <li
      key={tab.key}
      className={`sidebar-nav-item ${activeTab === tab.key ? "active" : ""}`}
      onClick={() => setActiveTab(tab.key)}
    >
      <div className="nav-item-content">
        <span>{tab.label}</span>
        {tab.count !== undefined && (
          <span className="nav-item-count">{tab.count}</span>
        )}
        {hasErrors(tab.key) && <div className="error-dot" />}
      </div>
    </li>
  );

  if (fetchLoading) {
    return (
      <div className="add-service-page">
        <header className="add-service-page__header">
          <div className="header-actions-right ms-auto">
            <button
              className="btn-close-text"
              onClick={() => navigate("/dashboard/catalog/services")}
            >
              Close
            </button>
          </div>
        </header>
        <main className="add-service-page__layout">
          <div className="layout-container" style={{ alignItems: "center", paddingTop: 80 }}>
            <div className="d-flex flex-column align-items-center gap-3">
              <span className="spinner-border" style={{ color: "#6366f1", width: 36, height: 36 }} />
              <p className="text-muted small">Loading service…</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="add-service-page">
        <header className="add-service-page__header">
          <div className="header-actions-right ms-auto">
            <button
              className="btn-close-text"
              onClick={() => navigate("/dashboard/catalog/services")}
            >
              Close
            </button>
          </div>
        </header>
        <main className="add-service-page__layout">
          <div className="layout-container">
            <div className="alert alert-danger">{error ?? "Service not found."}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="add-service-page">
      <header className="add-service-page__header">
        <div className="header-actions-right ms-auto">
          <button
            className="btn-close-text"
            onClick={() => navigate("/dashboard/catalog/services")}
          >
            Close
          </button>
          <button className="btn-save-pill" onClick={onSubmit} disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </header>

      <main className="add-service-page__layout">
        <div className="layout-container">

          <div className="layout-body">
            <aside className="add-service-page__sidebar">
              <nav>
                <ul className="sidebar-nav-list">
                  {generalTabs.map(renderTabItem)}
                </ul>
                <div className="sidebar-section-title">Settings</div>
                <ul className="sidebar-nav-list">
                  {settingsTabs.map(renderTabItem)}
                </ul>
              </nav>
            </aside>

            <section className="add-service-page__content">
              {error && <div className="alert alert-danger mb-4">{error}</div>}

              {activeTab === "basic" && (
                <BasicDetailsTab
                  data={formData.basic}
                  onChange={(v: any) => updateField("basic", v)}
                  serviceType="single"
                  errors={validationErrors.basic}
                  categories={categories}
                />
              )}
              {activeTab === "team" && (
                <TeamMembersTab
                  data={formData.team}
                  onChange={(v: any) => updateField("team", v)}
                  errors={validationErrors.team}
                  staffMembers={staffMembers}
                  staffLoading={staffLoading.fetchAll}
                />
              )}
              {activeTab === "addons" && (
                <ServiceAddOnsTab
                  data={formData.addons}
                  onChange={(v: any) => updateField("addons", v)}
                />
              )}
              {activeTab === "online-booking" && (
                <OnlineBookingTab
                  data={formData.onlineBooking}
                  onChange={(v: any) => updateField("onlineBooking", v)}
                />
              )}
              {activeTab === "portfolio" && (
                <PortfolioImagesTab
                  data={formData.portfolio}
                  onChange={(v: any) => updateField("portfolio", v)}
                />
              )}
              {activeTab === "forms" && (
                <FormsTab
                  data={formData.forms}
                  serviceId={id}
                  onChange={(v: any) => updateField("forms", v)}
                  staffMembers={staffMembers}
                />
              )}
              {activeTab === "commission" && (
                <CommissionTab
                  data={formData.commission}
                  onChange={(v: any) => updateField("commission", v)}
                />
              )}
              {activeTab === "settings" && (
                <SettingsTab
                  data={formData.settings}
                  onChange={(v: any) => updateField("settings", v)}
                />
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditServicePage;
