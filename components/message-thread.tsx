"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageInput } from "@/components/message-input"
import { MessageItem } from "@/components/message-item"
import { Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  content: string | null
  media_url: string | null
  media_type: string | null
  sender_id: string
  reply_to_id: string | null
  created_at: string
  sender_profile: {
    username: string
    display_name: string
    avatar_url?: string
  }
  reply_to?: {
    id: string
    content: string | null
    media_type: string | null
    sender_profile: {
      display_name: string
      username: string
    }
  }
  reactions: {
    emoji: string
    user_id: string
    count: number
  }[]
}

interface MessageThreadProps {
  user: {
    id: string
    email?: string
  }
  conversationId: string
}

export function MessageThread({ user, conversationId }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
    fetchOtherUser()
    markAsRead()
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Realtime subscription for messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the complete message with related data
          const { data: newMessage } = await supabase
            .from("messages")
            .select(
              `
              *,
              sender_profile:profiles!sender_id(username, display_name, avatar_url)
            `,
            )
            .eq("id", payload.new.id)
            .single()

          if (newMessage) {
            // Fetch reply-to message if exists
            let replyTo = undefined
            if (newMessage.reply_to_id) {
              const { data: replyData } = await supabase
                .from("messages")
                .select(
                  `
                  id,
                  content,
                  media_type,
                  sender_profile:profiles!sender_id(display_name, username)
                `,
                )
                .eq("id", newMessage.reply_to_id)
                .single()

              replyTo = replyData
            }

            // Fetch reactions for the new message
            const { data: reactions } = await supabase
              .from("message_reactions")
              .select("emoji, user_id")
              .eq("message_id", newMessage.id)

            const groupedReactions = groupReactions(reactions || [])

            setMessages((prev) => [...prev, { ...newMessage, reply_to: replyTo, reactions: groupedReactions }])

            // Mark as read if the message is from the other user
            if (newMessage.sender_id !== user.id) {
              markAsRead()
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          // Update reactions in real-time without reloading
          const messageId = payload.new.message_id
          const emoji = payload.new.emoji
          const userId = payload.new.user_id

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== messageId) return msg

              // Add the new reaction
              const existingReaction = msg.reactions.find((r) => r.emoji === emoji)
              if (existingReaction) {
                // Increment count and add user
                return {
                  ...msg,
                  reactions: msg.reactions.map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count + 1, users: [...r.users, userId] }
                      : r
                  ),
                }
              } else {
                // Add new reaction
                return {
                  ...msg,
                  reactions: [...msg.reactions, { emoji, user_id: userId, users: [userId], count: 1 }],
                }
              }
            }),
          )
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          // Update reactions in real-time without reloading
          console.log("DELETE reaction event received:", payload)
          const messageId = payload.old.message_id
          const emoji = payload.old.emoji
          const userId = payload.old.user_id

          setMessages((prev) => {
            console.log("Before removing reaction - messages:", prev.length)
            const updated = prev.map((msg) => {
              if (msg.id !== messageId) return msg

              console.log(`Removing reaction ${emoji} from message ${messageId} by user ${userId}`)
              console.log("Current reactions:", msg.reactions)

              // Remove the reaction
              const newReactions = msg.reactions
                .map((r) => {
                  if (r.emoji !== emoji) return r

                  // Remove user and decrement count
                  const newUsers = r.users.filter((u) => u !== userId)
                  console.log(`Updated users for ${emoji}:`, newUsers)
                  return {
                    ...r,
                    count: newUsers.length,
                    users: newUsers,
                  }
                })
                .filter((r) => r.count > 0) // Remove reactions with 0 count

              console.log("New reactions:", newReactions)
              return {
                ...msg,
                reactions: newReactions,
              }
            })
            console.log("After removing reaction - messages:", updated.length)
            return updated
          })
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const typing = new Set<string>()
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.typing && presence.user_id !== user.id) {
              typing.add(presence.user_id)
            }
          })
        })
        setTypingUsers(typing)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, typing: false })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, conversationId, user.id])

  const fetchMessages = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender_profile:profiles!sender_id(username, display_name, avatar_url)
      `,
      )
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
    } else {
      // Fetch reply-to messages and reactions
      const messageIds = (data || []).map((m) => m.id)
      const replyToIds = (data || []).map((m) => m.reply_to_id).filter(Boolean)

      // Fetch reply-to messages
      let replyToMessages: Record<string, any> = {}
      if (replyToIds.length > 0) {
        const { data: replyData } = await supabase
          .from("messages")
          .select(
            `
            id,
            content,
            media_type,
            sender_profile:profiles!sender_id(display_name, username)
          `,
          )
          .in("id", replyToIds)

        replyToMessages = (replyData || []).reduce(
          (acc, msg) => {
            acc[msg.id] = msg
            return acc
          },
          {} as Record<string, any>,
        )
      }

      // Fetch reactions
      const { data: reactions } = await supabase
        .from("message_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", messageIds)

      const messagesWithReactions = (data || []).map((message) => {
        const messageReactions = (reactions || []).filter((r) => r.message_id === message.id)
        const groupedReactions = groupReactions(messageReactions)
        return {
          ...message,
          reactions: groupedReactions,
          reply_to: message.reply_to_id ? replyToMessages[message.reply_to_id] : undefined,
        }
      })

      setMessages(messagesWithReactions)
    }

    setLoading(false)
  }

  const fetchOtherUser = async () => {
    const { data } = await supabase
      .from("conversation_participants")
      .select("user_id, profile:profiles(username, display_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .single()

    if (data) {
      setOtherUser(data.profile)
    }
  }

  const markAsRead = async () => {
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const groupReactions = (reactions: any[]) => {
    const grouped = reactions.reduce(
      (acc, r) => {
        if (!acc[r.emoji]) {
          acc[r.emoji] = { emoji: r.emoji, user_id: r.user_id, users: [], count: 0 }
        }
        acc[r.emoji].users.push(r.user_id)
        acc[r.emoji].count++
        return acc
      },
      {} as Record<string, any>,
    )

    return Object.values(grouped)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser?.avatar_url || "/placeholder.svg"} />
            <AvatarFallback className="bg-gray-600 text-white">
              {otherUser?.display_name?.[0]?.toUpperCase() || otherUser?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold">{otherUser?.display_name || otherUser?.username || "Unknown User"}</h2>
            <p className="text-sm text-gray-400">@{otherUser?.username || "unknown"}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            currentUserId={user.id}
            onReply={setReplyingTo}
            conversationId={conversationId}
          />
        ))}
        <div ref={messagesEndRef} />

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>{otherUser?.display_name} is typing...</span>
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="border-t border-gray-800 p-3 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-gray-400">Replying to </span>
              <span className="text-blue-500">{replyingTo.sender_profile.display_name}</span>
              <p className="text-gray-300 truncate mt-1">{replyingTo.content}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        user={user}
        conversationId={conversationId}
        replyToId={replyingTo?.id}
        onMessageSent={() => setReplyingTo(null)}
      />
    </div>
  )
}
