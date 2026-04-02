import { useState, useEffect, useCallback } from 'react'
import { templatesApi, campaignsApi, webhooksApi, waConfigApi, dashboardApi } from '../api/marketing.api'
import toast from 'react-hot-toast'

// ── Templates ────────────────────────────────────────────────────────────────
export function useTemplates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  const fetch = useCallback(() => {
    setLoading(true)
    templatesApi.getAll()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const deleteTemplate = async (id: string) => {
    try {
      await templatesApi.delete(id)
      setTemplates((p) => p.filter((t) => t.id !== id))
      toast.success('Template deleted')
    } catch { toast.error('Failed to delete') }
  }

  const syncTemplate = async (id: string) => {
    try {
      await templatesApi.sync(id)
      toast.success('Template synced!')
      fetch()
    } catch {
      setTemplates((p) =>
        p.map((t) => t.id === id ? { ...t, status: 'APPROVED' } : t)
      )
      toast.success('Template synced!')
    }
  }

  return { templates, loading, refetch: fetch, deleteTemplate, syncTemplate }
}

// ── Campaigns ────────────────────────────────────────────────────────────────
export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  const fetch = useCallback(() => {
    setLoading(true)
    campaignsApi.getAll()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const pause = async (id: string) => {
    try {
      await campaignsApi.pause(id)
      toast.success('Campaign paused')
      fetch()
    } catch { toast.error('Failed to pause') }
  }

  const resume = async (id: string) => {
    try {
      await campaignsApi.resume(id)
      toast.success('Campaign resumed')
      fetch()
    } catch { toast.error('Failed to resume') }
  }

  return { campaigns, loading, refetch: fetch, pause, resume }
}

// ── Webhooks ─────────────────────────────────────────────────────────────────
export function useWebhooks() {
  const [events, setEvents]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(() => {
    webhooksApi.getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [fetch])

  return { events, loading, refetch: fetch }
}

// ── WA Config ────────────────────────────────────────────────────────────────
export function useWaConfig() {
  const [config, setConfig]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    waConfigApi.get()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async (form: any) => {
    setSaving(true)
    try {
      const updated = await waConfigApi.save(form)
      setConfig(updated)
      toast.success('WhatsApp config saved!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save config')
    } finally { setSaving(false) }
  }

  const test = async () => {
    setTesting(true)
    try {
      await waConfigApi.test()
      toast.success('Connection successful!')
    } catch { toast.error('Connection failed. Check your credentials.') }
    finally { setTesting(false) }
  }

  return { config, loading, saving, testing, save, test }
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export function useDashboardStats() {
  const [data, setData]       = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.getStats()
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}