import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import { useAppDispatch, useAppSelector } from '../../../hooks/useAppRedux'
import {
  fetchConversationsThunk,
  fetchMessagesThunk,
  sendReplyThunk,
} from '../../../middleware/marketing/inbox.thunk'
import {
  setActivePhone,
  receiveMessage,
  receiveConversations,
} from '../../../store/inboxSlice'
import type { WAConversation, WAMessage } from '../../../store/inboxSlice'
import '../styles/InboxPage.scss'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
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
    else { label = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }) }

    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }
  return groups
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// ── MessageBubble ──────────────────────────────────────────────────────────────

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
      className={`inbox-bubble-wrap ${isOut ? 'outbound' : 'inbound'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false) }}
    >
      {showActions && (
        <div className={`inbox-msg-actions ${isOut ? 'actions-left' : 'actions-right'}`}>
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
          <button className="inbox-action-btn danger" title="Delete" onClick={() => { onDelete(msg.id); setShowActions(false) }}>
            🗑
          </button>
        </div>
      )}

      <div className={`inbox-bubble ${isOut ? 'outbound' : 'inbound'}`}>
        <p className="inbox-bubble-text">{msg.body}</p>
        <div className="inbox-bubble-meta">
          <span className="inbox-bubble-time">{time}</span>
          {isOut && statusIcon && (
            <span className={`inbox-bubble-status ${statusClass}`}>{statusIcon}</span>
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

// ── ConversationItem ───────────────────────────────────────────────────────────

function ConversationItem({ conv, isActive, onClick }: { conv: WAConversation; isActive: boolean; onClick: () => void }) {
  return (
    <button className={`inbox-conv-item${isActive ? ' active' : ''}`} onClick={onClick}>
      <div className="inbox-conv-avatar">{getInitials(conv.contactName, conv.contactPhone)}</div>
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

// ── Main Page ──────────────────────────────────────────────────────────────────

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000'

export default function InboxPage() {
  const dispatch = useAppDispatch()
  const { conversations, messages, activePhone, loading } = useAppSelector(s => s.inbox)
  const salonId = useAppSelector(s => s.salon.currentSalon?.id)

  const [search,      setSearch]      = useState('')
  const [replyText,   setReplyText]   = useState('')
  const [connected,   setConnected]   = useState(false)
  const [localMsgs,   setLocalMsgs]   = useState<WAMessage[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const emojiPickerRef  = useRef<HTMLDivElement>(null)
  const socketRef       = useRef<Socket | null>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)

  const displayMessages = localMsgs.length ? localMsgs : messages

  useEffect(() => { dispatch(fetchConversationsThunk()) }, [dispatch])
  useEffect(() => { setLocalMsgs(messages) }, [messages])

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // WebSocket
  useEffect(() => {
    if (!salonId) return
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], withCredentials: true })
    socketRef.current = socket

    socket.on('connect', () => { setConnected(true); socket.emit('join_salon', String(salonId)) })
    socket.on('disconnect', () => setConnected(false))

    socket.on('inbox:message', (payload: { contactPhone: string; contactName: string | null; message: WAMessage }) => {
      dispatch(receiveMessage({ contactPhone: payload.contactPhone, message: payload.message }))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })

    socket.on('inbox:conversations', (convs: WAConversation[]) => {
      dispatch(receiveConversations(convs))
    })

    return () => { socket.disconnect(); socketRef.current = null }
  }, [salonId, dispatch])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

  const handleSelectConversation = useCallback((phone: string) => {
    dispatch(setActivePhone(phone))
    dispatch(fetchMessagesThunk(phone))
    setShowEmojiPicker(false)
  }, [dispatch])

  const handleSend = useCallback(async () => {
    const text = replyText.trim()
    if (!text || !activePhone || loading.sendReply) return
    setReplyText('')
    setShowEmojiPicker(false)
    await dispatch(sendReplyThunk({ phone: activePhone, message: text }))
  }, [replyText, activePhone, loading.sendReply, dispatch])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const cursor = textareaRef.current?.selectionStart ?? replyText.length
    const newText = replyText.slice(0, cursor) + emojiData.emoji + replyText.slice(cursor)
    setReplyText(newText)
    textareaRef.current?.focus()
  }

  const handleDeleteMessage = useCallback((id: string) => {
    setLocalMsgs(prev => prev.filter(m => m.id !== id))
  }, [])

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    return (c.contactName ?? '').toLowerCase().includes(q) || (c.contactPhone ?? '').includes(q)
  })

  const activeConv = conversations.find(c => c.contactPhone === activePhone)
  const grouped    = groupMessagesByDate(displayMessages)

  return (
    <div className="inbox-page">

      {/* ── Left Sidebar ── */}
      <aside className="inbox-sidebar">
        <div className="inbox-sidebar-header">
          <h2 className="inbox-title">Inbox</h2>
          <div className="inbox-status-dot-wrap" title={connected ? 'Live' : 'Connecting…'}>
            <span className={`inbox-status-dot ${connected ? 'connected' : 'disconnected'}`} />
            <span className="inbox-status-label">{connected ? 'Live' : 'Connecting…'}</span>
          </div>
        </div>

        <div className="inbox-search-wrap">
          <span className="inbox-search-icon">🔍</span>
          <input
            className="inbox-search"
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="inbox-conv-list">
          {filtered.length === 0 && !loading.fetchConversations && (
            <div className="inbox-no-convs">
              <p>No conversations yet.</p>
              <span>Replies from your campaigns will appear here.</span>
            </div>
          )}
          {filtered.map(conv => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.contactPhone === activePhone}
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
            <div className="inbox-chat-header">
              <div className="inbox-chat-avatar">
                {getInitials(activeConv?.contactName ?? null, activePhone)}
              </div>
              <div className="inbox-chat-contact">
                <span className="inbox-chat-name">{activeConv?.contactName || activePhone}</span>
                <span className="inbox-chat-phone">{activeConv?.contactName ? activePhone : 'WhatsApp'}</span>
              </div>
              <div className="inbox-chat-actions">
                <button
                  className="inbox-refresh-btn"
                  title="Refresh messages"
                  onClick={() => dispatch(fetchMessagesThunk(activePhone))}
                >↻</button>
              </div>
            </div>

            <div className="inbox-messages">
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
              <div ref={messagesEndRef} />
            </div>

            {/* Reply bar */}
            <div className="inbox-reply-bar">
              {/* Emoji picker */}
              <div className="inbox-emoji-wrap" ref={emojiPickerRef}>
                <button
                  className={`inbox-emoji-toggle ${showEmojiPicker ? 'active' : ''}`}
                  onClick={() => setShowEmojiPicker(p => !p)}
                  title="Emoji"
                >😊</button>
                {showEmojiPicker && (
                  <div className="inbox-emoji-picker-wrap">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={Theme.LIGHT}
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
                placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className={`inbox-send-btn${loading.sendReply ? ' sending' : ''}`}
                onClick={handleSend}
                disabled={!replyText.trim() || loading.sendReply}
              >
                {loading.sendReply ? <span className="inbox-send-spinner" /> : '➤'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}