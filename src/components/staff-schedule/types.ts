export type ShiftType = "working" | "blocked" | "dayoff";

export interface StaffMember {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  avatarColor: string;
  isActive: boolean;
}

export interface ShiftBreak {
  start: string;
  end: string;
}

export interface ShiftEntry {
  id?: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: string;
  type: ShiftType;
  isAvailable: boolean;
  breaks?: ShiftBreak[];
}

// staffId -> date -> ShiftEntry
export type ShiftMap = Record<string, Record<string, ShiftEntry>>;

export type DrawerMode = "edit" | "timeoff" | "dayoff" | "blocked" | "copy" | null;
