import React, { useState } from "react";
import styles from "./packages.module.scss";
import PackageDashboard from "./PackageDashboard";
import PackageCreateForm from "./PackageCreateForm";
import PackageCreatedSuccess from "./PackageCreatedSuccess";
import PackageTemplatesManager from "./PackageTemplatesManager";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import type { ClientPackage, PackageTemplate } from "../../services/api/endpoints/packages.endpoints";

type View = "dashboard" | "create" | "created";
type Tab  = "packages" | "templates";

const PackageModule: React.FC = () => {
  const [tab,             setTab]            = useState<Tab>("packages");
  const [view,            setView]           = useState<View>("dashboard");
  const [lastCreated,     setLastCreated]    = useState<ClientPackage | null>(null);
  const [selectedClient,  setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [templateToLoad,  setTemplateToLoad] = useState<PackageTemplate | null>(null);

  const handlePackageCreated = (pkg: ClientPackage) => {
    setLastCreated(pkg);
    setTemplateToLoad(null);
    setView("created");
  };

  const handleCreateNew = () => {
    setTemplateToLoad(null);
    setView("create");
  };

  const handleCreateFromTemplate = (template: PackageTemplate) => {
    setTemplateToLoad(template);
    setView("create");
  };

  const handleCancel = () => {
    setTemplateToLoad(null);
    setView("dashboard");
  };

  return (
    <div className={styles.module} style={{ padding: "20px 24px" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 0 }}>
        {(["packages", "templates"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "packages") setView("dashboard"); }}
            style={{
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "#7c3aed" : "#6b7280",
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              textTransform: "capitalize",
              marginBottom: -1,
              transition: "all 0.15s",
            }}
          >
            {t === "packages" ? "Client Packages" : "Templates"}
          </button>
        ))}
      </div>

      {/* Templates tab */}
      {tab === "templates" && <PackageTemplatesManager />}

      {/* Packages tab */}
      {tab === "packages" && view === "dashboard" && (
        <PackageDashboard
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          onCreateNew={handleCreateNew}
          onCreateFromTemplate={handleCreateFromTemplate}
        />
      )}
      {tab === "packages" && view === "create" && (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <PackageCreateForm
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            onCancel={handleCancel}
            onSaved={handlePackageCreated}
            templateToLoad={templateToLoad}
          />
        </div>
      )}
      {tab === "packages" && view === "created" && lastCreated && (
        <PackageCreatedSuccess
          pkg={lastCreated}
          onViewPackages={() => setView("dashboard")}
          onCreateAnother={() => setView("create")}
        />
      )}
    </div>
  );
};

export default PackageModule;
