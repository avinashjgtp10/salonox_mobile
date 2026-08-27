// src/features/marketing/pages/CampaignsPage.tsx
//
// Single "Campaigns" section with "New Campaign" / "History" tabs — replaces
// the two previously-separate pages (CreateCampaignPage, CampaignHistoryPage),
// same Tabs pattern TemplatesListPage uses for its Campaign/Trigger split.
// Both tabs stay reachable at their own URL (campaigns/create,
// campaigns/history) so the sidebar's two links, direct navigation, and
// CreateCampaignPage's own post-launch navigate() all keep working unchanged
// — the active tab is derived from the URL, not local-only state.
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader, Tabs } from "../../../components/ui";
import CreateCampaignPage from "./CreateCampaignPage";
import CampaignHistoryPage from "./CampaignHistoryPage";

type CampaignTab = "create" | "history";

export default function CampaignsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab: CampaignTab = location.pathname.endsWith("/history") ? "history" : "create";

  const handleTabChange = (key: string) => {
    navigate(key === "history" ? "/dashboard/marketing/campaigns/history" : "/dashboard/marketing/campaigns/create");
  };

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle={
          activeTab === "create"
            ? "Send a bulk WhatsApp campaign to your contacts"
            : "Click on a campaign to see contact-level delivery details"
        }
      />

      <Tabs
        variant="underline"
        activeKey={activeTab}
        onChange={handleTabChange}
        tabs={[
          { key: "create",  label: "New Campaign" },
          { key: "history", label: "History" },
        ]}
      />

      {activeTab === "create" ? <CreateCampaignPage /> : <CampaignHistoryPage />}
    </div>
  );
}
