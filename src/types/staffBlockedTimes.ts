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
  date: string;
  end_time: string;
  reason?: string;
  start_time: string;
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
