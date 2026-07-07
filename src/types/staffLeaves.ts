export type LeaveEntry = {
  createdAt: string | null;
  endDate: string | null;
  id: string;
  notes: string | null;
  reason: string | null;
  staffId: string;
  startDate: string | null;
  status: string;
  type: string;
};

export type CreateLeaveRequest = {
  end_date: string;
  notes?: string;
  reason?: string;
  start_date: string;
  type?: string;
};

export type UpdateLeaveRequest = Partial<CreateLeaveRequest> & {
  status?: string;
};

export type LeaveListResponse = {
  leaves: LeaveEntry[];
  staffId: string;
};

export type CreateLeaveResponse = {
  leave: LeaveEntry;
  message?: string;
  staffId: string;
};

export type UpdateLeaveResponse = CreateLeaveResponse & {
  recordId: string;
};

export type DeleteLeaveResponse = {
  message?: string;
  recordId: string;
  staffId: string;
};
