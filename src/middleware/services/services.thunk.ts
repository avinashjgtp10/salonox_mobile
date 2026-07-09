import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SERVICES } from "../../services/api/endpoints/services.endpoints";
import { ApiError } from "../../services/api/interceptors";
import type { Service, ServiceConsultationFormValues } from "../../features/catalog/types/catalog.types";

export interface ConsultationFormApi {
  id: string;
  service_id: string;
  name: string;
  is_selected: boolean;
  values: ServiceConsultationFormValues | null;
  created_at: string;
  updated_at: string;
}

/**
 * Backend wraps every response as:
 *   { success: true, data: <payload>, message: "...", meta: {...} }
 *
 * For the services LIST endpoint the payload itself is:
 *   { data: Service[], pagination: { total, page, limit, total_pages } }
 *
 * So the full chain is:
 *   axios response body  → res.data
 *   outer envelope .data → res.data.data  (= ServiceListPayload)
 *   inner array          → res.data.data.data (= Service[])
 *
 * For single-item endpoints the payload is just the Service object:
 *   res.data.data  (= Service)
 */

// ── Fetch services with pagination ───────────────────────────────────────────
export interface FetchServicesParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string | number;
  // Filter params
  isActive?: boolean;
  onlineBooking?: boolean;
  commissionEnabled?: boolean;
  resourceRequired?: boolean;
}

export const fetchServicesThunk = createAsyncThunk<
  { data: Service[]; pagination: { total: number; page: number; limit: number; total_pages: number } } | Service[],
  FetchServicesParams | void,
  { rejectValue: string }
>("services/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const queryParts: string[] = [];
    if (params) {
      if (params.page)       queryParts.push(`page=${params.page}`);
      if (params.limit)      queryParts.push(`limit=${params.limit}`);
      if (params.search)     queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.categoryId && params.categoryId !== "all") queryParts.push(`category_id=${params.categoryId}`);
      if (params.isActive !== undefined)         queryParts.push(`is_active=${params.isActive}`);
      if (params.onlineBooking !== undefined)    queryParts.push(`online_booking=${params.onlineBooking}`);
      if (params.commissionEnabled !== undefined) queryParts.push(`commission_enabled=${params.commissionEnabled}`);
      if (params.resourceRequired !== undefined) queryParts.push(`resource_required=${params.resourceRequired}`);
    } else {
       // Default limit if none provided
       queryParts.push("limit=200");
    }

    const res = await api.get(SERVICES.LIST(queryParts.join("&")));
    const payload = (res.data as any)?.data;

    // The backend returns { data: Service[], pagination: { ... } }
    // If it's already an array, return it as is (for compatibility)
    if (Array.isArray(payload)) return payload as Service[];

    // Otherwise return the object with data and pagination
    return payload as {
      data: Service[];
      pagination: { total: number; page: number; limit: number; total_pages: number };
    };
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch services");
  }
});


// ── Fetch single service ──────────────────────────────────────────────────────
export const fetchServiceByIdThunk = createAsyncThunk<
  Service,
  string | number,
  { rejectValue: string }
>("services/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(SERVICES.BY_ID(id));
    return (res.data as any).data as Service;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch service");
  }
});

// ── Create service ────────────────────────────────────────────────────────────
export const createServiceThunk = createAsyncThunk<
  Service,
  Partial<Service>,
  { rejectValue: string }
>("services/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(SERVICES.BASE, payload);
    return (res.data as any).data as Service;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create service");
  }
});

// ── Update service (backend uses PATCH) ────────────────────────────────────────
export const updateServiceThunk = createAsyncThunk<
  Service,
  { id: string | number; data: Partial<Service> },
  { rejectValue: string }
>("services/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(SERVICES.BY_ID(id), data);
    return (res.data as any).data as Service;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update service");
  }
});

// ── Consultation forms ────────────────────────────────────────────────────────
export const fetchConsultationFormsThunk = createAsyncThunk<
  ConsultationFormApi[],
  string | number,
  { rejectValue: string }
>("services/fetchConsultationForms", async (serviceId, { rejectWithValue }) => {
  try {
    const res = await api.get(SERVICES.CONSULTATION_FORMS(serviceId));
    return (res.data as any).data as ConsultationFormApi[];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch consultation forms");
  }
});

export const createConsultationFormThunk = createAsyncThunk<
  ConsultationFormApi,
  { serviceId: string | number; name: string },
  { rejectValue: string }
>("services/createConsultationForm", async ({ serviceId, name }, { rejectWithValue }) => {
  try {
    const res = await api.post(SERVICES.CONSULTATION_FORMS(serviceId), { name });
    return (res.data as any).data as ConsultationFormApi;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create consultation form");
  }
});

export const updateConsultationFormThunk = createAsyncThunk<
  ConsultationFormApi,
  {
    serviceId: string | number;
    formId: string | number;
    data: Partial<{ name: string; is_selected: boolean; values: ServiceConsultationFormValues | null }>;
  },
  { rejectValue: string }
>("services/updateConsultationForm", async ({ serviceId, formId, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(SERVICES.CONSULTATION_FORM_BY_ID(serviceId, formId), data);
    return (res.data as any).data as ConsultationFormApi;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update consultation form");
  }
});

export const deleteConsultationFormThunk = createAsyncThunk<
  { serviceId: string | number; formId: string | number },
  { serviceId: string | number; formId: string | number },
  { rejectValue: string }
>("services/deleteConsultationForm", async ({ serviceId, formId }, { rejectWithValue }) => {
  try {
    await api.delete(SERVICES.CONSULTATION_FORM_BY_ID(serviceId, formId));
    return { serviceId, formId };
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete consultation form");
  }
});

// ── Delete service ────────────────────────────────────────────────────────────
export const deleteServiceThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("services/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(SERVICES.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete service");
  }
});

// ── Download helpers (trigger browser download via blob) ──────────────────────
const downloadBlob = (data: Blob, filename: string) => {
  const url = URL.createObjectURL(data);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const downloadServicesPdfThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("services/downloadPdf", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(SERVICES.DOWNLOAD_PDF, { responseType: "blob" });
    downloadBlob(res.data, "services.pdf");
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to download PDF");
  }
});

export const downloadServicesExcelThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("services/downloadExcel", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(SERVICES.DOWNLOAD_EXCEL, { responseType: "blob" });
    downloadBlob(res.data, "services.xlsx");
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to download Excel");
  }
});

export const downloadServicesCsvThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("services/downloadCsv", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(SERVICES.DOWNLOAD_CSV, { responseType: "blob" });
    downloadBlob(res.data, "services.csv");
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to download CSV");
  }
});

// ── Export stub (required by createCRUDSlice) ─────────────────────────────────
export const exportServicesThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("services/export", async (_format, { rejectWithValue }) => {
  return rejectWithValue("Use downloadServicesExcelThunk / downloadServicesCsvThunk instead");
});
