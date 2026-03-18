import api from "../../../services/api/axios";

export const createClient = (data: any) => {
  return api.post("/api/v1/clients", data);
};

export const getClients = () => {
  return api.get("/api/v1/clients");
};

export const getClientById = (id: string | number) => {
  return api.get(`/api/v1/clients/${id}`);
};


export const deleteClient = (id: string | number) => {
  return api.delete(`/api/v1/clients/${id}`);
};

export const blockClients = (ids: string[] | number[], reason: string) => {
  return api.patch("/api/v1/clients/block", {
    client_ids: ids,
    reason: reason
  });
};

export const exportClients = (format: "excel" | "csv") => {
  return api.get(`/api/v1/clients/export?format=${format}`, {
    responseType: "blob",
  });
};
export const importClients = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/api/v1/clients/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const mergeDuplicateClients = () => {
  return api.post("/api/v1/clients/merge-duplicates", {
    merge_by: "phone"
  });
};

export const mergeSelectedClients = (primaryId: string | number, secondaryId: string | number) => {
  return api.post("/api/v1/clients/merge", {
    primary_id: primaryId,
    secondary_id: secondaryId
  });
};