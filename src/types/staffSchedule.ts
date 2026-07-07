export type ScheduleDayEntry = {
  day: string;
  endTime: string | null;
  isOff: boolean;
  startTime: string | null;
};

export type StaffSchedule = {
  days: ScheduleDayEntry[];
  staffId: string;
  updatedAt: string | null;
};

export type UpdateScheduleDayRequest = {
  day: string;
  end_time?: string;
  is_off?: boolean;
  start_time?: string;
};

export type UpdateScheduleRequest = {
  days: UpdateScheduleDayRequest[];
};

export type UpdateScheduleResponse = {
  message?: string;
  schedule: StaffSchedule;
};

export type DeleteScheduleResponse = {
  message?: string;
  staffId: string;
};
