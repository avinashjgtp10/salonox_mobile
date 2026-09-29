import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import { useAppDispatch, useAppSelector } from '../../../hooks/useAppRedux'
import {
  fetchConversationsThunk,
  fetchMessagesThunk,
  fetchCustomerInfoThunk,
  sendReplyThunk,
  type InboxCustomerInfo,
} from '../../../middleware/marketing/inbox.thunk'
import {
  setActivePhone,
  receiveMessage,
  receiveConversations,
} from '../../../store/inboxSlice'
import type { WAConversation, WAMessage } from '../../../store/inboxSlice'
import { API_ORIGIN } from '../../../services/api/baseUrl'
import Dropdown from '../../../components/ui/Dropdown'
import ClientHistoryModal from '../../clients/components/ClientHistoryModal'
import { useListClientPackagesQuery } from '../../../services/api/endpoints/packages.endpoints'
import { usePermissions } from '../../../hooks/usePermissions'
import { showPermissionDenied } from '../../../store/permissionDialogSlice'
import '../styles/InboxPage.scss'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const SOCKET_URL   = import.meta.env.VITE_SOCKET_URL ?? (API_ORIGIN || 'http://localhost:3000')

const CANNED_RESPONSES = [
  { label: 'Confirmed',     text: 'Your appointment is confirmed! We look forward to seeing you.' },
  { label: 'Thank you',    text: 'Thank you for visiting us! Hope to see you again soon.' },
  { label: 'Reschedule',   text: 'We need to reschedule your appointment. Please let us know a convenient time.' },
  { label: 'Hours',        text: 'Our salon is open Mon–Sat 10am–8pm and Sun 11am–6pm.' },
  { label: 'Offer',        text: 'Special offer for you! Book this week and get 20% off on all services.' },
  { label: 'Running late', text: 'We are running slightly behind schedule. Your appointment will start in about 15 minutes.' },
]

const AVATAR_COLORS = [
  '#00a884', '#25d366', '#34b7f1', '#ecb22e',
  '#e11d48', '#7c3aed', '#0284c7', '#b45309',
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const isToday =
    d.getDate()     === now.getDate()     &&
    d.getMonth()    === now.getMonth()    &&
    d.getFullYear() === now.getFullYear()
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function getInitials(name: string | null, phone: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(' ')
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return phone.slice(-2)
}

function groupMessagesByDate(messages: WAMessage[]) {
  const groups: { label: string; messages: WAMessage[] }[] = []
  let currentLabel = ''
  const now       = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  for (const msg of messages) {
    const d = new Date(msg.sent_at)
    let label: string
    if (
      d.getDate()     === now.getDate()     &&
      d.getMonth()    === now.getMonth()    &&
      d.getFullYear() === now.getFullYear()
    ) { label = 'Today' }
    else if (
      d.getDate()     === yesterday.getDate()     &&
      d.getMonth()    === yesterday.getMonth()    &&
      d.getFullYear() === yesterday.getFullYear()
    ) { label = 'Yesterday' }
    else {
      label = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
    }

    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }
  return groups
}

function formatMoney(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function formatVisitDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function get24hrWindow(messages: WAMessage[]): number | null {
  const lastInbound = [...messages].reverse().find(m => m.direction === 'INBOUND')
  if (!lastInbound) return null
  const elapsed   = (Date.now() - new Date(lastInbound.sent_at).getTime()) / 3600000
  return 24 - elapsed
}

// ─────────────────────────────────────────────────────────────────────────────
// Media renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderMedia(msg: WAMessage) {
  if (!msg.media_type || !msg.media_url) return null
  const configs: Record<string, { icon: string; label: string }> = {
    image:    { icon: '🖼',  label: 'Image'    },
    video:    { icon: '🎬', label: 'Video'    },
    document: { icon: '📄', label: 'Document' },
  }
  const cfg = configs[msg.media_type]
  if (!cfg) return null
  return (
    <div className="inbox-msg-media">
      <div className="inbox-msg-media-placeholder">
        <span className="inbox-msg-media-icon">{cfg.icon}</span>
        <span className="inbox-msg-media-label">{cfg.label}</span>
        <span className="inbox-msg-media-note">{'ID: ' + msg.media_url.slice(0, 14) + '...'}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ msg, onDelete }: { msg: WAMessage; onDelete: (id: string) => void }) {
  const isOut = msg.direction === 'OUTBOUND'
  const time  = new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const [showActions, setShowActions] = useState(false)
  const [showEmojis,  setShowEmojis]  = useState(false)
  const [reaction,    setReaction]    = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)

  const statusIcon  = msg.status === 'READ' ? '✓✓' : msg.status === 'DELIVERED' ? '✓✓' : msg.status === 'SENT' ? '✓' : ''
  const statusClass = msg.status === 'READ' ? 'read' : msg.status === 'DELIVERED' ? 'delivered' : 'sent'

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    setShowActions(false)
  }

  const handleReact = (emoji: string) => {
    setReaction(prev => prev === emoji ? null : emoji)
    setShowEmojis(false)
    setShowActions(false)
  }

  return (
    <div
      className={'inbox-bubble-wrap ' + (isOut ? 'outbound' : 'inbound')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false) }}
    >
      {showActions && (
        <div className={'inbox-msg-actions ' + (isOut ? 'actions-left' : 'actions-right')}>
          <div className="inbox-action-wrap">
            <button className="inbox-action-btn" title="React" onClick={() => setShowEmojis(p => !p)}>😊</button>
            {showEmojis && (
              <div className="inbox-emoji-reaction-picker">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} className="inbox-emoji-btn" onClick={() => handleReact(e)}>{e}</button>
                ))}
              </div>
            )}
          </div>
          <button className="inbox-action-btn" title={copied ? 'Copied!' : 'Copy'} onClick={handleCopy}>
            {copied ? '✓' : '📋'}
          </button>
          <button
            className="inbox-action-btn danger"
            title="Delete"
            onClick={() => { onDelete(msg.id); setShowActions(false) }}
          >
            🗑
          </button>
        </div>
      )}

      <div className={'inbox-bubble ' + (isOut ? 'outbound' : 'inbound')}>
        {renderMedia(msg)}
        {msg.body && msg.body.trim().length > 0 && (
          <p className="inbox-bubble-text">{msg.body}</p>
        )}
        <div className="inbox-bubble-meta">
          <span className="inbox-bubble-time">{time}</span>
          {isOut && statusIcon && (
            <span className={'inbox-bubble-status ' + statusClass}>{statusIcon}</span>
          )}
        </div>
        {reaction && (
          <div className="inbox-bubble-reaction" onClick={() => setReaction(null)} title="Click to remove">
            {reaction}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ConversationItem
// ─────────────────────────────────────────────────────────────────────────────

function ConversationItem({ conv, isActive, onClick, disabled }: {
  conv: WAConversation; isActive: boolean; onClick: () => void; disabled?: boolean
}) {
  const color = avatarColor(conv.contactName ?? conv.contactPhone)

  return (
    <button
      className={'inbox-conv-item' + (isActive ? ' active' : '') + (conv.unreadCount > 0 ? ' unread' : '')}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      onClick={onClick}
    >
      <div className="inbox-conv-avatar" style={{ background: color }}>
        {getInitials(conv.contactName, conv.contactPhone)}
      </div>
      <div className="inbox-conv-info">
        <div className="inbox-conv-row">
          <span className="inbox-conv-name">{conv.contactName ?? conv.contactPhone}</span>
          <span className="inbox-conv-time">{formatTime(conv.lastMessageAt)}</span>
        </div>
        <div className="inbox-conv-row">
          <span className="inbox-conv-preview">{conv.lastMessage || '—'}</span>
          {conv.unreadCount > 0 && <span className="inbox-conv-badge">{conv.unreadCount}</span>}
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type SortMode   = 'latest' | 'unread'
type FilterMode = 'all' | 'unread'
type Theme_     = 'light' | 'dark'

export default function InboxPage() {
  const dispatch = useAppDispatch()
  const { conversations, messages, activePhone, loading } = useAppSelector(s => s.inbox)
  const salonId = useAppSelector(s => s.salon.currentSalon?.id ?? s.auth?.salonId)
  const { can } = usePermissions()
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ))
  // Trimmed from 4 Inbox keys to 2 on request — view_conversation folded
  // into view_inbox, send_message removed in favor of reply_to_conversation
  // (see inbox.routes.ts).
  const canSend = can('reply_to_conversation')

  // ── Theme toggle — persisted to localStorage ──────────────────────────────
  const [theme, setTheme] = useState<Theme_>(() =>
    (localStorage.getItem('inbox-theme') as Theme_) ?? 'light'
  )

  const toggleTheme = () => {
    const next: Theme_ = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('inbox-theme', next)
  }

  const [search,          setSearch]          = useState('')
  const [replyText,       setReplyText]       = useState('')
  const [connected,       setConnected]       = useState(false)
  const [localMsgs,       setLocalMsgs]       = useState<WAMessage[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showCanned,      setShowCanned]      = useState(false)
  const [sortMode,        setSortMode]        = useState<SortMode>('latest')
  const [filterMode,      setFilterMode]      = useState<FilterMode>('all')
  const [customerInfo,    setCustomerInfo]    = useState<InboxCustomerInfo | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(false)
  const [historyClientId, setHistoryClientId] = useState<string | null>(null)
  const [infoPanelOpen,   setInfoPanelOpen]   = useState(true)

  const { data: clientPackagesData } = useListClientPackagesQuery(
    { clientId: customerInfo?.id, status: 'Active' },
    { skip: !customerInfo?.id }
  )
  const activePackages = clientPackagesData?.items ?? []

  const messagesListRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const cannedRef      = useRef<HTMLDivElement>(null)
  const socketRef      = useRef<Socket | null>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)

  const displayMessages = localMsgs.length ? localMsgs : messages

  useEffect(() => { dispatch(fetchConversationsThunk()) }, [dispatch])
  useEffect(() => { setLocalMsgs(messages) }, [messages])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false)
      if (cannedRef.current       && !cannedRef.current.contains(e.target as Node))       setShowCanned(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // WebSocket
  useEffect(() => {
    if (!salonId) return
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], withCredentials: true })
    socketRef.current = socket
    socket.on('connect',    () => { setConnected(true); socket.emit('join_salon', String(salonId)) })
    socket.on('disconnect', () => setConnected(false))
    socket.on('inbox:message', (payload: { contactPhone: string; contactName: string | null; message: WAMessage }) => {
      dispatch(receiveMessage({ contactPhone: payload.contactPhone, message: payload.message }))
      setTimeout(() => {
        const el = messagesListRef.current
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, 50)
    })
    socket.on('inbox:conversations', (convs: WAConversation[]) => {
      dispatch(receiveConversations(convs))
    })
    return () => { socket.disconnect(); socketRef.current = null }
  }, [salonId, dispatch])

  useEffect(() => {
    const el = messagesListRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [displayMessages])

  const handleSelectConversation = useCallback((phone: string) => {
    if (!can('view_inbox')) { denyPerm('view_inbox'); return }
    dispatch(setActivePhone(phone))
    dispatch(fetchMessagesThunk(phone))
    setShowEmojiPicker(false)
    setShowCanned(false)
    setCustomerInfo(null)
    setLoadingCustomer(true)
    setInfoPanelOpen(true)
    dispatch(fetchCustomerInfoThunk(phone)).then((res) => {
      if (fetchCustomerInfoThunk.fulfilled.match(res)) setCustomerInfo(res.payload)
      setLoadingCustomer(false)
    })
  }, [dispatch, can])

  const handleSend = useCallback(async () => {
    const text = replyText.trim()
    if (!text || !activePhone || loading.sendReply) return
    if (!canSend) { denyPerm('send_message'); return }
    setReplyText('')
    setShowEmojiPicker(false)
    setShowCanned(false)
    await dispatch(sendReplyThunk({ phone: activePhone, message: text }))
  }, [replyText, activePhone, loading.sendReply, dispatch, canSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === '/' && replyText === '') { e.preventDefault(); setShowCanned(true) }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const cursor  = textareaRef.current?.selectionStart ?? replyText.length
    const newText = replyText.slice(0, cursor) + emojiData.emoji + replyText.slice(cursor)
    setReplyText(newText)
    textareaRef.current?.focus()
  }

  const handleDeleteMessage = useCallback((id: string) => {
    setLocalMsgs(prev => prev.filter(m => m.id !== id))
  }, [])

  const handleCannedPick = (text: string) => {
    setReplyText(text)
    setShowCanned(false)
    textareaRef.current?.focus()
  }

  const processed = useMemo(() => {
    let list = conversations.filter(c => {
      const q           = search.toLowerCase()
      const matchSearch = (c.contactName ?? '').toLowerCase().includes(q) || (c.contactPhone ?? '').includes(q)
      const matchFilter = filterMode === 'all' || (filterMode === 'unread' && c.unreadCount > 0)
      return matchSearch && matchFilter
    })
    if (sortMode === 'unread') {
      list = [...list].sort((a, b) => (b.unreadCount ?? 0) - (a.unreadCount ?? 0))
    } else {
      list = [...list].sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
        return tb - ta
      })
    }
    return list
  }, [conversations, search, filterMode, sortMode])

  const totalUnread   = useMemo(() => conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0), [conversations])
  const activeConv    = conversations.find(c => c.contactPhone === activePhone)
  const grouped       = groupMessagesByDate(displayMessages)
  const windowHours   = get24hrWindow(displayMessages)
  const showWindowWarning = windowHours !== null && windowHours < 8  && windowHours > 0
  const windowExpired     = windowHours !== null && windowHours <= 0
  const windowOpen        = windowHours !== null && windowHours >= 8
  const activeColor   = avatarColor(activeConv?.contactName ?? activePhone ?? '')

  return (
    <div className="inbox-page" data-theme={theme}>

      {/* ── Left Sidebar ── */}
      <aside className="inbox-sidebar">
        <div className="inbox-sidebar-header">
          <div className="inbox-title-row">
            <h2 className="inbox-title">Inbox</h2>
            {totalUnread > 0 && <span className="inbox-total-badge">{totalUnread}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Theme toggle */}
            <button
              className="inbox-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="inbox-status-dot-wrap" title={connected ? 'Live' : 'Connecting…'}>
              <span className={'inbox-status-dot ' + (connected ? 'connected' : 'disconnected')} />
              <span className="inbox-status-label">{connected ? 'Live' : 'Connecting…'}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="inbox-search-wrap">
          <span className="inbox-search-icon">🔍</span>
          <input
            className="inbox-search"
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter + Sort bar */}
        <div className="inbox-filter-bar">
          <div className="inbox-filter-tabs">
            <button
              className={'inbox-filter-tab' + (filterMode === 'all' ? ' active' : '')}
              onClick={() => setFilterMode('all')}
            >
              All
            </button>
            <button
              className={'inbox-filter-tab' + (filterMode === 'unread' ? ' active' : '')}
              onClick={() => setFilterMode('unread')}
            >
              Unread {totalUnread > 0 && <span className="inbox-filter-count">{totalUnread}</span>}
            </button>
          </div>
          <Dropdown
            className="inbox-sort-select"
            searchable={false}
            value={sortMode}
            options={[
              { id: 'latest', name: 'Latest' },
              { id: 'unread', name: 'Unread first' },
            ]}
            onChange={id => setSortMode(id as SortMode)}
          />
        </div>

        {/* Conversation list */}
        <div className="inbox-conv-list">
          {processed.length === 0 && !loading.fetchConversations && (
            <div className="inbox-no-convs">
              <p>{filterMode === 'unread' ? 'No unread conversations.' : 'No conversations yet.'}</p>
              <span>{filterMode === 'unread' ? 'Switch to All to see everything.' : 'Replies from your campaigns will appear here.'}</span>
            </div>
          )}
          {processed.map(conv => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.contactPhone === activePhone}
              disabled={!can('view_inbox')}
              onClick={() => handleSelectConversation(conv.contactPhone)}
            />
          ))}
        </div>
      </aside>

      {/* ── Chat ── */}
      <main className="inbox-chat">
        {!activePhone ? (
          <div className="inbox-empty-state">
            <div className="inbox-empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a contact from the left to view messages and reply.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="inbox-chat-header">
              <div className="inbox-chat-avatar" style={{ background: activeColor }}>
                {getInitials(activeConv?.contactName ?? null, activePhone)}
              </div>
              <div className="inbox-chat-contact">
                <span className="inbox-chat-name">{activeConv?.contactName || activePhone}</span>
                <span className="inbox-chat-phone">{activeConv?.contactName ? activePhone : 'WhatsApp'}</span>
              </div>
              <div className="inbox-chat-actions">
                {!infoPanelOpen && (
                  <button
                    className="inbox-refresh-btn"
                    title="Show customer info"
                    onClick={() => setInfoPanelOpen(true)}
                  >
                    ⓘ
                  </button>
                )}
                <button
                  className="inbox-refresh-btn"
                  title="Refresh messages"
                  onClick={() => dispatch(fetchMessagesThunk(activePhone))}
                >
                  ↻
                </button>
              </div>
            </div>

            {/* Window banners */}
            {windowOpen && (
              <div className="inbox-window-open">
                <span className="inbox-window-warn-icon">✅</span>
                <span>{'WhatsApp window open — ' + (windowHours as number).toFixed(1) + 'h remaining. Free-form replies and utility templates are free.'}</span>
              </div>
            )}
            {showWindowWarning && (
              <div className="inbox-window-warn">
                <span className="inbox-window-warn-icon">⏰</span>
                <span>{'Window closing in ' + (windowHours as number).toFixed(1) + 'h — reply now while messaging is free!'}</span>
              </div>
            )}
            {windowExpired && (
              <div className="inbox-window-expired">
                <span className="inbox-window-warn-icon">🔒</span>
                <span>24hr window closed — only approved templates can be sent. Use Blast Campaign to re-engage.</span>
              </div>
            )}

            {/* Messages */}
            <div className="inbox-messages" ref={messagesListRef}>
              {loading.fetchMessages ? (
                <div className="inbox-messages-loading">Loading messages…</div>
              ) : displayMessages.length === 0 ? (
                <div className="inbox-messages-empty">No messages yet.</div>
              ) : (
                grouped.map(group => (
                  <div key={group.label} className="inbox-msg-group">
                    <div className="inbox-date-divider"><span>{group.label}</span></div>
                    {group.messages.map(msg => (
                      <MessageBubble key={msg.id} msg={msg} onDelete={handleDeleteMessage} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Char counter */}
            {replyText.length > 0 && (
              <div className="inbox-char-counter">
                <span className={replyText.length > 900 ? 'warn' : ''}>{replyText.length}/1024</span>
              </div>
            )}

            {/* Window expired bar */}
            {windowExpired && (
              <div className="inbox-window-expired-bar">
                🔒 24hr window closed — free-form replies blocked by Meta.
                Use <strong>Blast Campaign</strong> with a template to re-engage.
              </div>
            )}

            {/* Reply bar */}
            <div className={`inbox-reply-bar${windowExpired ? ' inbox-reply-bar--disabled' : ''}`}>
              {/* Canned responses */}
              <div className="inbox-canned-wrap" ref={cannedRef}>
                <button
                  className={'inbox-canned-btn' + (showCanned ? ' active' : '')}
                  title="Quick replies (or type /)"
                  onClick={() => setShowCanned(p => !p)}
                >
                  ⚡
                </button>
                {showCanned && (
                  <div className="inbox-canned-panel">
                    <div className="inbox-canned-title">Quick Replies</div>
                    {CANNED_RESPONSES.map(r => (
                      <button key={r.label} className="inbox-canned-item" onClick={() => handleCannedPick(r.text)}>
                        <span className="inbox-canned-label">{r.label}</span>
                        <span className="inbox-canned-preview">{r.text.slice(0, 50) + '…'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Emoji picker */}
              <div className="inbox-emoji-wrap" ref={emojiPickerRef}>
                <button
                  className={'inbox-emoji-toggle ' + (showEmojiPicker ? 'active' : '')}
                  onClick={() => setShowEmojiPicker(p => !p)}
                  title="Emoji"
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <div className="inbox-emoji-picker-wrap">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                      height={380}
                      width={320}
                      searchPlaceholder="Search emoji..."
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                className="inbox-reply-input"
                placeholder={windowExpired
                  ? "Window closed — use a campaign template to message this contact"
                  : "Type a message… (/ for quick replies, Enter to send)"
                }
                value={replyText}
                disabled={windowExpired}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />

              <button
                className={'inbox-send-btn' + (loading.sendReply ? ' sending' : '')}
                onClick={handleSend}
                disabled={(!replyText.trim() || loading.sendReply || windowExpired) && canSend}
                style={!canSend ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                {loading.sendReply ? <span className="inbox-send-spinner" /> : '➤'}
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── Customer Info ── */}
      {activePhone && infoPanelOpen && (
        <aside className="inbox-info-panel">
          <div className="inbox-info-header-row">
            <div className="inbox-info-header">Customer Info</div>
            <button className="inbox-info-close" title="Close" onClick={() => setInfoPanelOpen(false)}>✕</button>
          </div>
          {loadingCustomer ? (
            <div className="inbox-info-loading">Loading…</div>
          ) : customerInfo ? (
            <>
              <div className="inbox-info-profile">
                <div className="inbox-info-avatar" style={{ background: activeColor }}>
                  {getInitials(customerInfo.fullName, activePhone)}
                </div>
                <div className="inbox-info-name">{customerInfo.fullName || activePhone}</div>
                <div className="inbox-info-phone">{activePhone}</div>
                <button className="inbox-info-link" onClick={() => setHistoryClientId(customerInfo.id)}>
                  View Profile →
                </button>
              </div>

              <div className="inbox-info-stats">
                <div className="inbox-info-stat-row">
                  <span className="inbox-info-stat-label">Total Visits</span>
                  <span className="inbox-info-stat-value inbox-info-stat-value--blue">{customerInfo.totalVisits}</span>
                </div>
                <div className="inbox-info-stat-row">
                  <span className="inbox-info-stat-label">Total Spend</span>
                  <span className="inbox-info-stat-value inbox-info-stat-value--green">{formatMoney(customerInfo.lifetimeSpend)}</span>
                </div>
                <div className="inbox-info-stat-row">
                  <span className="inbox-info-stat-label">Last Visit</span>
                  <span className="inbox-info-stat-value inbox-info-stat-value--purple">{formatVisitDate(customerInfo.lastVisitDate)}</span>
                </div>
                <div className="inbox-info-stat-row">
                  <span className="inbox-info-stat-label">Member</span>
                  <span className={`inbox-info-stat-value ${customerInfo.membershipName ? 'inbox-info-stat-value--gold' : 'inbox-info-stat-value--muted'}`}>
                    {customerInfo.membershipName ? `Yes (${customerInfo.membershipName})` : 'No'}
                  </span>
                </div>
              </div>

              {activePackages.length > 0 && (
                <div className="inbox-info-recent">
                  <div className="inbox-info-recent-title">Packages</div>
                  {activePackages.map(pkg => {
                    const totalRemaining = pkg.services.reduce((sum, s) => sum + s.remainingSessions, 0)
                    const totalSessions  = pkg.services.reduce((sum, s) => sum + s.totalSessions, 0)
                    return (
                      <div key={pkg.id} className="inbox-info-recent-row">
                        <span className="inbox-info-recent-icon" style={{ background: activeColor }}>📦</span>
                        <div>
                          <div className="inbox-info-recent-text">{pkg.packageName}</div>
                          <div className="inbox-info-recent-time">
                            {totalRemaining}/{totalSessions} sessions left
                            {pkg.expiryDate ? ` · Expires ${formatVisitDate(pkg.expiryDate)}` : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="inbox-info-empty">
              <span className="inbox-info-empty-icon">🙍</span>
              <p>Not a saved client yet.</p>
              <span>This number hasn't been added to your Clients list.</span>
            </div>
          )}
        </aside>
      )}

      {historyClientId && (
        <ClientHistoryModal clientId={historyClientId} onClose={() => setHistoryClientId(null)} />
      )}
    </div>
  )
}