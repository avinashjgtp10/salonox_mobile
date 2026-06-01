// src/components/packages/PackageModule.tsx
import React, { useState } from "react";
import styles from "./packages.module.scss";
import PackageDashboard from "./PackageDashboard";
import PackageCreateForm from "./PackageCreateForm";
import PackageCreatedSuccess from "./PackageCreatedSuccess";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import type { ClientPackage } from "../../services/api/endpoints/packages.endpoints";

type View = "dashboard" | "create" | "created";

const PackageModule: React.FC = () => {
  const [view,           setView]           = useState<View>("dashboard");
  const [lastCreated,    setLastCreated]    = useState<ClientPackage | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);

  const handlePackageCreated = (pkg: ClientPackage) => {
    setLastCreated(pkg);
    setView("created");
  };

  return (
    <div className={styles.module} style={{ padding: "20px 24px" }}>
      {view === "dashboard" && (
        <PackageDashboard
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          onCreateNew={() => setView("create")}
        />
      )}
      {view === "create" && (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <PackageCreateForm
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            onCancel={() => setView("dashboard")}
            onSaved={handlePackageCreated}
          />
        </div>
      )}
      {view === "created" && lastCreated && (
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
