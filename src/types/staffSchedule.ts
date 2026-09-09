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

export type UpdateScheduleItemRequest = {
  day_of_week: number;
  end_time?: string | null;
  is_available: boolean;
  start_time?: string | null;
};

export type UpdateScheduleRequest = {
  items: UpdateScheduleItemRequest[];
};

export type UpdateScheduleResponse = {
  message?: string;
  schedule: StaffSchedule;
};

export type DeleteScheduleResponse = {
  message?: string;
  staffId: string;
};
