import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { FEEDBACK } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";

export interface FeedbackServiceContext {
  serviceRowId: string;
  name: string;
  staffName: string | null;
}

export interface FeedbackContext {
  salonName: string;
  clientName: string;
  appointmentId: string;
  services: FeedbackServiceContext[];
  googleReviewUrl: string | null;
}

export interface ServiceRatingInput {
  serviceRowId: string;
  rating: number;
  comment?: string;
}

export interface SubmitFeedbackPayload {
  slug: string;
  overallRating: number;
  serviceRatings: ServiceRatingInput[];
  improvementTags?: string[];
  additionalComments?: string;
}

export const fetchFeedbackContextThunk = createAsyncThunk<
  FeedbackContext,
  string,
  { rejectValue: string }
>("feedback/fetchContext", async (slug, { rejectWithValue }) => {
  try {
    const res = await api.get(FEEDBACK.CONTEXT(slug));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("This feedback link is invalid or has expired.");
  }
});

export const submitFeedbackThunk = createAsyncThunk<
  { id: string },
  SubmitFeedbackPayload,
  { rejectValue: string }
>("feedback/submit", async ({ slug, overallRating, serviceRatings, improvementTags, additionalComments }, { rejectWithValue }) => {
  try {
    const res = await api.post(FEEDBACK.SUBMIT(slug), {
      overallRating,
      serviceRatings,
      improvementTags,
      additionalComments,
    });
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to submit your feedback.");
  }
});
