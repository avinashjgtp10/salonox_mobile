import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useServiceForm } from "../hooks/useServiceForm.ts";
import BasicDetailsTab from "../components/tabs/BasicDetailsTab.tsx";
import TeamMembersTab from "../components/tabs/TeamMembersTab.tsx";
import ResourcesTab from "../components/tabs/ResourcesTab.tsx";
import ServiceAddOnsTab from "../components/tabs/ServiceAddOnsTab.tsx";
import OnlineBookingTab from "../components/tabs/OnlineBookingTab.tsx";
import PortfolioImagesTab from "../components/tabs/PortfolioImagesTab.tsx";
import FormsTab from "../components/tabs/FormsTab.tsx";
import CommissionTab from "../components/tabs/CommissionTab.tsx";
import SettingsTab from "../components/tabs/SettingsTab.tsx";
import "../styles/AddServicePage.scss";

type TabKey = "basic" | "team" | "resources" | "addons" | "online-booking" | "portfolio" | "forms" | "commission" | "settings";

const tabs: { key: TabKey; label: string }[] = [
    { key: "basic", label: "Basic Details" },
    { key: "team", label: "Team Members" },
    { key: "resources", label: "Resources" },
    { key: "addons", label: "Service Add-Ons" },
    { key: "online-booking", label: "Online Booking" },
    { key: "portfolio", label: "Portfolio Images" },
    { key: "forms", label: "Forms" },
    { key: "commission", label: "Commission" },
    { key: "settings", label: "Settings" },
];

const AddServicePage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const serviceType = (searchParams.get("type") || "single") as "single" | "bundle";
    const [activeTab, setActiveTab] = useState<TabKey>("basic");
    const { formData, updateField, handleSubmit, loading, error } = useServiceForm(serviceType);

    const onSubmit = async () => {
        const success = await handleSubmit();
        if (success) navigate("/dashboard/catalog/services");
    };

    return (
        <div className="add-service-page">
            <div className="add-service-page__header">
                <button className="btn btn-link" onClick={() => navigate("/dashboard/catalog/services")}>
                    <i className="bi bi-arrow-left" /> Back
                </button>
                <h1>{serviceType === "bundle" ? "Add Bundle" : "Add Service"}</h1>
                <div className="add-service-page__header-actions">
                    <button className="btn btn-outline-secondary" onClick={() => navigate("/dashboard/catalog/services")}>Cancel</button>
                    <button className="btn btn-primary" onClick={onSubmit} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                        Save Service
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-danger mx-4">{error}</div>}

            <div className="add-service-page__tabs">
                <ul className="nav nav-tabs">
                    {tabs.map((tab) => (
                        <li className="nav-item" key={tab.key}>
                            <button className={`nav-link ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                                {tab.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="add-service-page__content">
                {activeTab === "basic" && <BasicDetailsTab data={formData.basic} onChange={(v: any) => updateField("basic", v)} serviceType={serviceType} />}
                {activeTab === "team" && <TeamMembersTab data={formData.team} onChange={(v: any) => updateField("team", v)} />}
                {activeTab === "resources" && <ResourcesTab data={formData.resources} onChange={(v: any) => updateField("resources", v)} />}
                {activeTab === "addons" && <ServiceAddOnsTab data={formData.addons} onChange={(v: any) => updateField("addons", v)} />}
                {activeTab === "online-booking" && <OnlineBookingTab data={formData.onlineBooking} onChange={(v: any) => updateField("onlineBooking", v)} />}
                {activeTab === "portfolio" && <PortfolioImagesTab data={formData.portfolio} onChange={(v: any) => updateField("portfolio", v)} />}
                {activeTab === "forms" && <FormsTab data={formData.forms} onChange={(v: any) => updateField("forms", v)} />}
                {activeTab === "commission" && <CommissionTab data={formData.commission} onChange={(v: any) => updateField("commission", v)} />}
                {activeTab === "settings" && <SettingsTab data={formData.settings} onChange={(v: any) => updateField("settings", v)} />}
            </div>
        </div>
    );
};

export default AddServicePage;