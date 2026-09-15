import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./packages.module.scss";
import PackageDashboard from "./PackageDashboard";
import PackageCreateForm, { type CustomPackageLineItem } from "./PackageCreateForm";
import PackageTemplatesManager from "./PackageTemplatesManager";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppDispatch } from "../../hooks/useAppRedux";
import { showPermissionDenied } from "../../store/permissionDialogSlice";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import type { PackageTemplate } from "../../services/api/endpoints/packages.endpoints";
import { customPackageLineItemToPackageRow } from "../../features/bookings/utils/customPackageItem";

type View = "dashboard" | "create";
type Tab  = "packages" | "templates";

const TAB_PATH: Record<Tab, string> = {
  packages: "/dashboard/catalog/packages/client-packages",
  templates: "/dashboard/catalog/packages/templates",
};

const PackageModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  // Client Packages/Package Templates are now two real URLs (see
  // CatalogRoutes.tsx) — the active tab follows whichever one is currently
  // loaded, so a direct link to either lands on the right tab, and each
  // route's own PermissionGuard already keeps a denied tab from ever
  // mounting this component on that URL in the first place. Switching tabs
  // here still double-checks permission before navigating, for the same
  // "visible but disabled, click shows the denial popup" treatment as
  // every other gated tab in the app.
  const tab: Tab = location.pathname.includes("/packages/templates") ? "templates" : "packages";
  const [view,            setView]           = useState<View>("dashboard");
  const [selectedClient,  setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [templateToLoad,  setTemplateToLoad] = useState<PackageTemplate | null>(null);

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

  // No create/pay-now here anymore — this hands the built definition (and
  // whichever client was picked) off to Quick Sale, where it lands as a bill
  // row via AppointmentModal's initialCustomPackageItem, to be paid together
  // with whatever else gets added there. Same handoff shape "+ Sell Package"
  // itself builds inline (AppointmentModal.tsx) when a bill is already open.
  const handleAddToBill = (item: CustomPackageLineItem) => {
    navigate("/dashboard/sales/quick", {
      state: {
        pendingPackageSale: {
          client: selectedClient ? {
            id: String(selectedClient.id),
            name: `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim(),
            phone: selectedClient.phone_number,
          } : undefined,
          customPackageItem: customPackageLineItemToPackageRow(item, ""),
        },
      },
    });
  };

  return (
    <div className={styles.module} style={{ padding: "20px 24px" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 0 }}>
        {(["packages", "templates"] as Tab[]).map(t => {
          const permKey = t === "packages" ? "view_client_packages" : "view_package_templates";
          const allowed = can(permKey);
          return (
          <button
            key={t}
            onClick={() => {
              if (!allowed) {
                dispatch(showPermissionDenied(
                  `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
                ));
                return;
              }
              if (t === "packages") setView("dashboard");
              navigate(TAB_PATH[t]);
            }}
            style={{
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "#7c3aed" : "#6b7280",
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
              cursor: allowed ? "pointer" : "not-allowed",
              opacity: allowed ? 1 : 0.5,
              fontFamily: "Inter, sans-serif",
              textTransform: "capitalize",
              marginBottom: -1,
              transition: "all 0.15s",
            }}
          >
            {t === "packages" ? "Client Packages" : "Templates"}
          </button>
          );
        })}
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
            onSaved={() => {}}
            templateToLoad={templateToLoad}
            showClientPicker
            showStaffPicker
            lineItemMode
            onAddLineItem={handleAddToBill}
          />
        </div>
      )}
    </div>
  );
};

export default PackageModule;
