"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Loader2 } from "lucide-react"

interface Conversation {
  id: string
  updated_at: string
  participants: {
    user_id: string
    profile: {
      username: string
      display_name: string
      avatar_url?: string
    }
  }[]
  last_message?: {
    content: string
    created_at: string
    sender_id: string
  }
  unread_count: number
}

interface ConversationListProps {
  user: {
    id: string
    email?: string
  }
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
}

export function ConversationList({ user, selectedConversationId, onSelectConversation }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchConversations()
  }, [])

  // Realtime subscription for conversations and messages
  useEffect(() => {
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refresh conversations when a new message is sent
          fetchConversations()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh conversations when user is added to a new conversation
          fetchConversations()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id])

  const fetchConversations = async () => {
    setLoading(true)

    // Get all conversations the user is part of
    const { data: participantData, error: participantError } = await supabase
      .from("conversation_participants")
      .select(
        `
        conversation_id,
        last_read_at
      `,
      )
      .eq("user_id", user.id)

    if (participantError) {
      console.error("Error fetching participant data:", participantError)
      setLoading(false)
      return
    }

    if (!participantData || participantData.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const conversationIds = participantData.map((p) => p.conversation_id)

    // Get conversation details
    const { data: conversationsData, error: conversationsError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        updated_at,
        conversation_participants!inner(
          user_id,
          profile:profiles(username, display_name, avatar_url)
        )
      `,
      )
      .in("id", conversationIds)
      .order("updated_at", { ascending: false })

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError)
      setLoading(false)
      return
    }

    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      (conversationsData || []).map(async (conv) => {
        // Get last message
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, created_at, sender_id, media_type")
          .eq("conversation_id", conv.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        // Get unread count
        const userParticipant = participantData.find((p) => p.conversation_id === conv.id)
        const lastReadAt = userParticipant?.last_read_at || new Date(0).toISOString()

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .gt("created_at", lastReadAt)
          .is("deleted_at", null)

        // Filter out current user from participants
        const otherParticipants = conv.conversation_participants.filter((p: any) => p.user_id !== user.id)

        return {
          id: conv.id,
          updated_at: conv.updated_at,
          participants: otherParticipants,
          last_message: lastMessage || undefined,
          unread_count: unreadCount || 0,
        }
      }),
    )

    setConversations(conversationsWithMessages)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center px-4">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Start a conversation by clicking the + button</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conversation) => {
        const otherUser = conversation.participants[0]?.profile
        const isSelected = conversation.id === selectedConversationId

        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full p-4 hover:bg-gray-900/50 transition-colors border-b border-gray-800 text-left ${
              isSelected ? "bg-gray-900" : ""
            }`}
          >
            <div className="flex gap-3">
              <Avatar className="w-12 h-12 shrink-0">
                <AvatarImage src={otherUser?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-gray-600 text-white">
                  {otherUser?.display_name?.[0]?.toUpperCase() || otherUser?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white truncate">
                    {otherUser?.display_name || otherUser?.username || "Unknown User"}
                  </span>
                  {conversation.last_message && (
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400 truncate">
                    {conversation.last_message
                      ? conversation.last_message.media_type
                        ? `📎 ${conversation.last_message.media_type}`
                        : conversation.last_message.content
                      : "No messages yet"}
                  </p>
                  {conversation.unread_count > 0 && (
                    <span className="shrink-0 ml-2 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
