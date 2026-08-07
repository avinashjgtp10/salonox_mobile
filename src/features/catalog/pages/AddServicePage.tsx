import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { selectAllCategories, selectAllStaff, selectStaffLoading } from "../../../store/selectors/slices.selectors";
import { useServiceForm } from "../hooks/useServiceForm.ts";
import BasicDetailsTab from "../components/tabs/BasicDetailsTab.tsx";
import TeamMembersTab from "../components/tabs/TeamMembersTab.tsx";
import ConsumablesTab from "../components/tabs/ConsumablesTab.tsx";
import OnlineBookingTab from "../components/tabs/OnlineBookingTab.tsx";
import PortfolioImagesTab from "../components/tabs/PortfolioImagesTab.tsx";
import FormsTab from "../components/tabs/FormsTab.tsx";
import CommissionTab from "../components/tabs/CommissionTab.tsx";
import SettingsTab from "../components/tabs/SettingsTab.tsx";
import "../styles/AddServicePage.scss";

type TabKey =
  | "basic"
  | "team"
  | "consumables"
  | "online-booking"
  | "portfolio"
  | "forms"
  | "commission"
  | "settings";

interface TabItem {
  key: TabKey;
  label: string;
  hasError?: boolean;
  count?: number;
}

const generalTabs: TabItem[] = [
  { key: "basic", label: "Basic details" },
  { key: "team", label: "Staff members" },
  { key: "consumables", label: "Consumables used" },
];

const settingsTabs: TabItem[] = [
  { key: "online-booking", label: "Online booking" },
  { key: "portfolio", label: "Portfolio images" },
  { key: "forms", label: "Consent forms" },
  { key: "commission", label: "Commissions" },
  { key: "settings", label: "Settings" },
];

const AddServicePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const serviceType = (searchParams.get("type") || "single") as
    | "single"
    | "bundle";
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
    loading,
    error,
    validationErrors,
    isSubmitted,
  } = useServiceForm(serviceType);

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
        {(tab.hasError || hasErrors(tab.key)) && <div className="error-dot" />}
      </div>
    </li>
  );

  return (
    <div className="add-service-page">
      <header className="add-service-page__header">
        <div className="header-center">
          <span className="header-title">New service</span>
        </div>
        <div className="header-actions-right">
          <button
            className="btn-close-text"
            onClick={() => navigate("/dashboard/catalog/services")}
          >
            Close
          </button>
          <button
            className="btn-save-pill"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              "Save"
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
              {error && <div className="asp-error-banner"><i className="bi bi-exclamation-circle-fill" /><div><strong>{error}</strong></div></div>}

              {activeTab === "basic" && (
                <BasicDetailsTab
                  data={formData.basic}
                  onChange={(v: any) => updateField("basic", v)}
                  serviceType={serviceType}
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
              {activeTab === "consumables" && (
                <ConsumablesTab
                  data={formData.consumables}
                  onChange={(v: any) => updateField("consumables", v)}
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

export default AddServicePage;
