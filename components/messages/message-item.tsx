"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { Smile, Reply, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface MessageItemProps {
  message: {
    id: string
    content: string | null
    media_url: string | null
    media_type: string | null
    sender_id: string
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
      users: string[]
      count: number
    }[]
  }
  currentUserId: string
  onReply: (message: any) => void
  conversationId?: string
}

const EMOJI_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥", "👏"]

export function MessageItem({ message, currentUserId, onReply, conversationId }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [localReactions, setLocalReactions] = useState(message.reactions)
  const supabase = createClient()
  const isOwnMessage = message.sender_id === currentUserId

  // Update local reactions when message prop changes
  useEffect(() => {
    setLocalReactions(message.reactions)
  }, [message.reactions])

  const addReaction = async (emoji: string) => {
    // Check if user already reacted with this emoji
    const existingReaction = localReactions.find((r) => r.emoji === emoji && r.users.includes(currentUserId))

    if (existingReaction) {
      // Optimistic update: remove reaction immediately
      setLocalReactions((prev) =>
        prev
          .map((r) => {
            if (r.emoji !== emoji) return r
            const newUsers = r.users.filter((u) => u !== currentUserId)
            return {
              ...r,
              count: newUsers.length,
              users: newUsers,
            }
          })
          .filter((r) => r.count > 0),
      )

      // Remove reaction from database
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", message.id)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji)

      if (error) {
        console.error("Error removing reaction:", error)
        // Revert on error
        setLocalReactions(message.reactions)
      }
    } else {
      // Optimistic update: add reaction immediately
      const existingEmojiReaction = localReactions.find((r) => r.emoji === emoji)
      if (existingEmojiReaction) {
        setLocalReactions((prev) =>
          prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] } : r,
          ),
        )
      } else {
        setLocalReactions((prev) => [...prev, { emoji, user_id: currentUserId, users: [currentUserId], count: 1 }])
      }

      // Add reaction to database
      const { error } = await supabase.from("message_reactions").insert({
        message_id: message.id,
        user_id: currentUserId,
        emoji,
      })

      if (error) {
        console.error("Error adding reaction:", error)
        // Revert on error
        setLocalReactions(message.reactions)
      }
    }
  }

  const deleteMessage = async () => {
    await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", message.id)
  }

  return (
    <div
      className={`flex gap-3 group ${isOwnMessage ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={message.sender_profile.avatar_url || "/placeholder.svg"} />
        <AvatarFallback className="bg-gray-600 text-white">
          {message.sender_profile.display_name?.[0]?.toUpperCase() ||
            message.sender_profile.username?.[0]?.toUpperCase() ||
            "U"}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-md ${isOwnMessage ? "flex flex-col items-end" : ""}`}>
        {/* Reply reference */}
        {message.reply_to && (
          <div className="text-xs text-gray-400 mb-1 px-3 py-1 bg-gray-800/50 rounded-lg">
            <span className="font-semibold">{message.reply_to.sender_profile.display_name}</span>:{" "}
            {message.reply_to.content
              ? message.reply_to.content.substring(0, 50) + (message.reply_to.content.length > 50 ? "..." : "")
              : message.reply_to.media_type
                ? `📎 ${message.reply_to.media_type}`
                : "Message"}
          </div>
        )}

        <div className={`relative group/message ${isOwnMessage ? "bg-blue-600" : "bg-gray-800"} rounded-2xl px-4 py-2`}>
          {/* Message content */}
          {message.media_url && (
            <div className="mb-2">
              {message.media_type === "image" ? (
                <img
                  src={message.media_url}
                  alt="Shared image"
                  className="rounded-lg max-w-full max-h-96 object-cover"
                />
              ) : message.media_type === "video" ? (
                <video src={message.media_url} controls className="rounded-lg max-w-full max-h-96" />
              ) : message.media_type === "audio" ? (
                <audio src={message.media_url} controls className="w-full" />
              ) : (
                <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                  📎 Download file
                </a>
              )}
            </div>
          )}

          {message.content && <p className="text-white wrap-break-word">{message.content}</p>}

          {/* Reactions */}
          {localReactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {localReactions.map((reaction) => {
                const userReacted = reaction.users.includes(currentUserId)
                return (
                  <button
                    key={reaction.emoji}
                    onClick={() => addReaction(reaction.emoji)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      userReacted ? "bg-blue-500/30 border border-blue-500" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-white font-medium">{reaction.count}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Hover actions */}
          {showActions && (
            <div
              className={`absolute -top-8 ${isOwnMessage ? "right-0" : "left-0"} flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg`}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Smile className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align={isOwnMessage ? "end" : "start"}>
                  <div className="flex gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(emoji)}
                        className="text-2xl hover:bg-gray-700 rounded p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onReply(message)}>
                <Reply className="w-4 h-4" />
              </Button>

              {isOwnMessage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={deleteMessage} className="text-red-500">
                      Delete message
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>

        <span className="text-xs text-gray-500 mt-1 px-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
