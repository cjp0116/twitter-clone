"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Image, X, Loader2 } from "lucide-react"

interface MessageInputProps {
  user: {
    id: string
    email?: string
  }
  conversationId: string
  replyToId?: string
  onMessageSent?: () => void
}

export function MessageInput({ user, conversationId, replyToId, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Set up presence channel for typing indicators
    const channel = supabase.channel(`messages:${conversationId}`)

    return () => {
      if (isTyping) {
        channel.track({ user_id: user.id, typing: false })
      }
    }
  }, [conversationId, isTyping, user.id])

  const handleTyping = (value: string) => {
    setMessage(value)

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current as NodeJS.Timeout)
    }

    // Update typing status
    if (value.trim() && !isTyping) {
      setIsTyping(true)
      const channel = supabase.channel(`messages:${conversationId}`)
      channel.track({ user_id: user.id, typing: true })
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      const channel = supabase.channel(`messages:${conversationId}`)
      channel.track({ user_id: user.id, typing: false })
    }, 2000)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMediaFile(file)

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setMediaPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setMediaPreview(file.name)
      }
    }
  }

  const removeMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadMedia = async (file: File): Promise<{ url: string; type: string } | null> => {
    try {
      setUploading(true)

      // Determine media type
      let mediaType = "file"
      if (file.type.startsWith("image/")) mediaType = "image"
      else if (file.type.startsWith("video/")) mediaType = "video"
      else if (file.type.startsWith("audio/")) mediaType = "audio"

      // Create unique file name
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = `messages/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from("media").upload(filePath, file)

      if (error) {
        console.error("Error uploading file:", error)
        return null
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath)

      return { url: publicUrl, type: mediaType }
    } catch (error) {
      console.error("Error uploading media:", error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const sendMessage = async () => {
    if ((!message.trim() && !mediaFile) || sending) return

    setSending(true)

    try {
      let mediaUrl = null
      let mediaType = null

      // Upload media if present
      if (mediaFile) {
        const uploadResult = await uploadMedia(mediaFile)
        if (uploadResult) {
          mediaUrl = uploadResult.url
          mediaType = uploadResult.type
        }
      }

      // Insert message
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: message.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to_id: replyToId || null,
      })

      if (error) {
        console.error("Error sending message:", error)
      } else {
        setMessage("")
        removeMedia()
        if (onMessageSent) onMessageSent()

        // Stop typing indicator
        setIsTyping(false)
        const channel = supabase.channel(`messages:${conversationId}`)
        channel.track({ user_id: user.id, typing: false })
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="border-t border-gray-800 p-4">
      {/* Media preview */}
      {mediaPreview && (
        <div className="mb-3 relative inline-block">
          {mediaFile?.type.startsWith("image/") ? (
            <img src={mediaPreview} alt="Preview" className="max-h-32 rounded-lg" />
          ) : (
            <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-sm text-gray-300">📎 {mediaPreview}</span>
            </div>
          )}
          <button
            type="button"
            onClick={removeMedia}
            title="Remove media"
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          aria-label="Upload media"
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending}
          title="Upload media"
        >
          <Image className="w-5 h-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 min-h-[44px] max-h-32 resize-none bg-gray-800 border-gray-700 focus:border-blue-500"
          disabled={sending}
        />

        <Button onClick={sendMessage} disabled={(!message.trim() && !mediaFile) || sending || uploading} size="icon">
          {sending || uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  )
}
