import { api } from "@/services/api";

export type SupportRequest = {
  category: string;
  message: string;
  priority: string;
  subject: string;
};

export const supportService = {
  submitRequest: (request: SupportRequest) => api.post("/support", request),
};
