import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { ClientSearchResult } from "../../clients/components/ClientSearchInput";
import MembershipCreateForm from "../components/MembershipCreateForm";

const CreateMembershipPage: React.FC = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();

  // client passed from Memberships list page
  const locationClient = (location.state as any)?.client as ClientSearchResult | undefined;
  const [pageClient, setPageClient] = useState<ClientSearchResult | null>(locationClient ?? null);

  return (
    <MembershipCreateForm
      editId={id}
      selectedClient={pageClient}
      onClientChange={setPageClient}
      onCancel={() => navigate(-1)}
      onSaved={() => navigate("/dashboard/catalog/memberships")}
    />
  );
};

export default CreateMembershipPage;
