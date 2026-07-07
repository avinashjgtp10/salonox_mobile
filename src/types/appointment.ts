export type AppointmentStatus =
  | "Upcoming"
  | "Confirmed"
  | "Waiting"
  | "Checked In"
  | "In Service"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Missed";

export type AppointmentPaymentMethod =
  | "Cash"
  | "Card"
  | "UPI"
  | "Wallet"
  | "Bank Transfer"
  | "Other";

export type AppointmentCalendarView = "day" | "week" | "month";

export type AppointmentApiClient = {
  email?: string | null;
  first_name?: string | null;
  full_name?: string | null;
  id?: string | number | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  phone_number?: string | null;
};

export type AppointmentApiService = {
  duration?: number | string | null;
  id?: string | number | null;
  name?: string | null;
  price?: number | string | null;
  service_id?: string | number | null;
  title?: string | null;
};

export type AppointmentApiStaff = {
  firstName?: string | null;
  first_name?: string | null;
  id?: string | number | null;
  lastName?: string | null;
  last_name?: string | null;
  name?: string | null;
};

export type AppointmentApiItem = {
  amount?: number | string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  client?: AppointmentApiClient | null;
  client_id?: string | number | null;
  client_name?: string | null;
  client_phone?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  discount?: number | string | null;
  duration?: number | string | null;
  end_time?: string | null;
  id?: string | number | null;
  mobile?: string | null;
  notes?: string | null;
  paid_amount?: number | string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  phone?: string | null;
  price?: number | string | null;
  scheduled_at?: string | null;
  service?: AppointmentApiService | string | null;
  service_id?: string | number | null;
  service_name?: string | null;
  services?: AppointmentApiService[] | null;
  staff?: AppointmentApiStaff | null;
  staff_id?: string | number | null;
  staff_name?: string | null;
  start_time?: string | null;
  status?: string | null;
  tax?: number | string | null;
  title?: string | null;
  total?: number | string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export type AppointmentApiPagination = {
  has_more?: boolean | string | null;
  hasMore?: boolean | string | null;
  limit?: number | string | null;
  next_page?: number | string | null;
  nextPage?: number | string | null;
  page?: number | string | null;
  total?: number | string | null;
  totalCount?: number | string | null;
  total_count?: number | string | null;
  total_pages?: number | string | null;
  totalPages?: number | string | null;
};

export type AppointmentListApiData =
  | AppointmentApiItem[]
  | {
      appointments?: AppointmentApiItem[] | null;
      data?: AppointmentApiItem[] | null;
      items?: AppointmentApiItem[] | null;
      pagination?: AppointmentApiPagination | null;
      rows?: AppointmentApiItem[] | null;
      total?: number | string | null;
      totalCount?: number | string | null;
      total_count?: number | string | null;
    };

export type AppointmentDetailApiData =
  | AppointmentApiItem
  | {
      appointment?: AppointmentApiItem | null;
      data?: AppointmentApiItem | null;
    };

export type AppointmentListQuery = {
  date?: string;
  from_date?: string;
  limit: number;
  page: number;
  search: string;
  sort_by: string;
  sort_order: "ASC" | "DESC";
  staff_id?: string;
  status?: string;
  to_date?: string;
};

export type AppointmentListPagination = {
  hasMore: boolean;
  limit: number;
  nextPage: number;
  page: number;
  totalCount: number;
  totalPages: number | null;
};

export type AppointmentListItem = {
  amount: number;
  cancelledAt: string | null;
  cancellationReason: string;
  clientEmail: string;
  clientId: string;
  clientName: string;
  createdAt: string | null;
  discount: number;
  durationLabel: string;
  durationMinutes: number | null;
  endTime: string | null;
  id: string;
  notes: string;
  paidAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  phone: string;
  raw: AppointmentApiItem;
  scheduledAt: string | null;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startTime: string | null;
  status: AppointmentStatus;
  tax: number;
  title: string;
  total: number;
  updatedAt: string | null;
};

export type AppointmentListResponse = {
  appointments: AppointmentListItem[];
  pagination: AppointmentListPagination;
  query: AppointmentListQuery;
  totalCount: number;
};

export type AppointmentDetailResponse = {
  appointment: AppointmentListItem;
  message?: string;
};

export type CreateAppointmentRequest = {
  client_id: string;
  discount?: number;
  duration: number;
  end_time: string;
  notes?: string;
  payment_method?: string;
  price?: number;
  salon_id?: string;
  scheduled_at?: string;
  service_id?: string;
  service_name?: string;
  staff_id: string;
  start_time: string;
  status: string;
};

export type UpdateAppointmentRequest = Partial<CreateAppointmentRequest>;

export type CancelAppointmentRequest = {
  cancellation_reason?: string;
};

export type RescheduleAppointmentRequest = {
  duration?: number;
  end_time: string;
  notes?: string;
  scheduled_at?: string;
  start_time: string;
  staff_id?: string;
};

export type AppointmentMutationResponse = {
  appointment: AppointmentListItem;
  message?: string;
};

export type AppointmentHistoryResponse = {
  appointments: AppointmentListItem[];
  clientId?: string;
};
