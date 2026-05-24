import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api/axios'
import { MARKETING_ENDPOINTS } from '../../services/api/endpoints'

export interface AnalyticsQuery {
  start:        string
  end:          string
  granularity?: 'DAILY' | 'MONTHLY'
}

export interface DailySpend {
  date:               string
  marketing:          number
  utility:            number
  authentication:     number
  service:            number
  totalMessages:      number
  totalConversations: number
  estimatedCost:      number
}

export interface WAAnalyticsStats {
  totalConversations:  number
  totalMessages:       number
  totalEstimatedCost:  number
  pricingModel:        'PMP' | 'CBP'
  currency:            string
  byCategory: {
    marketing:      number
    utility:        number
    authentication: number
    service:        number
  }
  byCategoryCost: {
    marketing:      number
    utility:        number
    authentication: number
    service:        number
  }
  daily:       DailySpend[]
  periodStart: string
  periodEnd:   string
}

export const fetchAnalytics = createAsyncThunk(
  'marketing/fetchAnalytics',
  async (query: AnalyticsQuery, { rejectWithValue }) => {
    try {
      const { data } = await api.get<WAAnalyticsStats>(MARKETING_ENDPOINTS.ANALYTICS, {
        params: query,
      })
      return data
    } catch (err: any) {
      const msg =
        err?.response?.data?.error   ??
        err?.response?.data?.message ??
        err?.message                 ??
        'Failed to fetch analytics'
      return rejectWithValue(String(msg))
    }
  }
)