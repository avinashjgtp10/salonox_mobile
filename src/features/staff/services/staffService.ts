import api from "../../../services/api/axios";

export const createStaff = (data: any) => {
  return api.post("/api/v1/staff", data);
};

export const getStaff = () => {
  return api.get("/api/v1/staff");
};

export const deleteStaff = (id: string | number) => {
  return api.delete(`/api/v1/staff/${id}`);
};

export const updateStaff = (id: string | number, data: any) => {
  return api.put(`/api/v1/staff/${id}`, data);
};

export const exportStaff = (format: "excel" | "csv") => {
  return api.get(`/api/v1/staff/export?format=${format}`, {
    responseType: "blob",
  });
};
