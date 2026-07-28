import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddMembershipModal from "../components/AddMembershipModal";

const CreateMembershipPage: React.FC = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  return (
    <AddMembershipModal
      editId={id}
      onCancel={() => navigate(-1)}
      onSaved={() => navigate("/dashboard/catalog/memberships")}
    />
  );
};

export default CreateMembershipPage;
