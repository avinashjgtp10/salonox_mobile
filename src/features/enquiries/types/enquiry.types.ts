export type EnquiryStatus = "New" | "Follow-up" | "Converted" | "Closed";

export const ENQUIRY_STATUSES: EnquiryStatus[] = ["New", "Follow-up", "Converted", "Closed"];

export const ENQUIRY_SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone Call" },
  { value: "website", label: "Website" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "referral", label: "Referral" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other" },
];

export interface Enquiry {
  id: string;
  enquiry_no: number;
  name: string;
  phone: string;
  service_id: string | null;
  service_name: string | null;
  staff_id: string | null;
  staff_name: string | null;
  status: EnquiryStatus;
  notes: string | null;
  source: string | null;
  follow_up_at: string | null;
  created_at: string;
}

export interface EnquiryFormValues {
  name: string;
  phone: string;
  service_id: string;
  staff_id: string;
  status: EnquiryStatus;
  notes: string;
  source: string;
  follow_up_at: string;
}
