import { createSlice } from "@reduxjs/toolkit";
import {
  submitTicketThunk,
  fetchMyTicketsThunk,
  fetchAllTicketsThunk,
  fetchSupportStatsThunk,
  replyToTicketThunk,
  updateTicketStatusThunk,
} from "../middleware/support/support.thunk";

export interface SupportTicket {
  id: string;
  salon_id: string;
  user_id: string;
  subject: string;
  category: string;
  message: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_reply?: string;
  replied_at?: string;
  created_at: string;
  updated_at: string;
  submitter_name?: string;
  submitter_email?: string;
  salon_name?: string;
  attachments?: string[];
}

export interface SupportStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  high_priority: number;
}

interface SupportState {
  myTickets: SupportTicket[];
  allTickets: SupportTicket[];
  stats: SupportStats | null;
  loading: {
    submit: boolean;
    myTickets: boolean;
    allTickets: boolean;
    stats: boolean;
    reply: boolean;
    status: boolean;
  };
  error: string | null;
  submitSuccess: boolean;
}

const initialState: SupportState = {
  myTickets: [],
  allTickets: [],
  stats: null,
  loading: { submit: false, myTickets: false, allTickets: false, stats: false, reply: false, status: false },
  error: null,
  submitSuccess: false,
};

const supportSlice = createSlice({
  name: "support",
  initialState,
  reducers: {
    clearSubmitSuccess(state) { state.submitSuccess = false; },
    clearError(state)        { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitTicketThunk.pending,   (state) => { state.loading.submit = true; state.error = null; state.submitSuccess = false; })
      .addCase(submitTicketThunk.fulfilled, (state, { payload }) => {
        state.loading.submit = false;
        state.submitSuccess  = true;
        state.myTickets      = [payload, ...state.myTickets];
      })
      .addCase(submitTicketThunk.rejected,  (state, { payload }) => { state.loading.submit = false; state.error = payload ?? null; });

    builder
      .addCase(fetchMyTicketsThunk.pending,   (state) => { state.loading.myTickets = true; })
      .addCase(fetchMyTicketsThunk.fulfilled, (state, { payload }) => { state.loading.myTickets = false; state.myTickets = payload; })
      .addCase(fetchMyTicketsThunk.rejected,  (state) => { state.loading.myTickets = false; });

    builder
      .addCase(fetchAllTicketsThunk.pending,   (state) => { state.loading.allTickets = true; state.error = null; })
      .addCase(fetchAllTicketsThunk.fulfilled, (state, { payload }) => { state.loading.allTickets = false; state.allTickets = payload; })
      .addCase(fetchAllTicketsThunk.rejected,  (state, { payload }) => { state.loading.allTickets = false; state.error = payload ?? "Failed to load tickets"; });

    builder
      .addCase(fetchSupportStatsThunk.pending,   (state) => { state.loading.stats = true; })
      .addCase(fetchSupportStatsThunk.fulfilled, (state, { payload }) => { state.loading.stats = false; state.stats = payload; })
      .addCase(fetchSupportStatsThunk.rejected,  (state) => { state.loading.stats = false; });

    builder
      .addCase(replyToTicketThunk.fulfilled, (state, { payload }) => {
        state.loading.reply = false;
        const idx = state.allTickets.findIndex(t => t.id === payload.id);
        if (idx !== -1) state.allTickets[idx] = payload;
      })
      .addCase(replyToTicketThunk.pending,  (state) => { state.loading.reply = true; })
      .addCase(replyToTicketThunk.rejected, (state) => { state.loading.reply = false; });

    builder
      .addCase(updateTicketStatusThunk.fulfilled, (state, { payload }) => {
        state.loading.status = false;
        const idx = state.allTickets.findIndex(t => t.id === payload.id);
        if (idx !== -1) state.allTickets[idx] = payload;
      })
      .addCase(updateTicketStatusThunk.pending,  (state) => { state.loading.status = true; })
      .addCase(updateTicketStatusThunk.rejected, (state) => { state.loading.status = false; });
  },
});

export const { clearSubmitSuccess, clearError } = supportSlice.actions;
export default supportSlice.reducer;
