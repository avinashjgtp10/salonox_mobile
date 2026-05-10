// src/types/inbox.types.ts

export interface WAConversation {
  id:            string
  salonId?:      string
  contactPhone:  string
  contactName:   string | null
  lastMessage:   string | null
  lastMessageAt: string | null
  unreadCount:   number
}

export interface WAMessage {
  id:             string
  conversationId: string
  direction:      'INBOUND' | 'OUTBOUND'
  body:           string
  wamid:          string | null
  status:         'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | null
  sent_at:        string   // ← matches backend DB column
  delivered_at:   string | null
  read_at:        string | null
}