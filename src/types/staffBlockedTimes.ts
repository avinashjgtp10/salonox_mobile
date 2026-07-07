export type BlockedTimeEntry = {
  createdAt: string | null;
  endAt: string | null;
  id: string;
  notes: string | null;
  reason: string | null;
  staffId: string;
  startAt: string | null;
};

export type CreateBlockedTimeRequest = {
  end_at: string;
  notes?: string;
  reason?: string;
  start_at: string;
};

export type UpdateBlockedTimeRequest = Partial<CreateBlockedTimeRequest>;

export type CreateBlockedTimeResponse = {
  blockedTime: BlockedTimeEntry;
  message?: string;
  staffId: string;
};

export type UpdateBlockedTimeResponse = CreateBlockedTimeResponse & {
  recordId: string;
};

export type DeleteBlockedTimeResponse = {
  message?: string;
  recordId: string;
  staffId: string;
};
