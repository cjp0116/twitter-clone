"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle } from "lucide-react"

interface ReplyDialogProps {
  tweet: {
    id: string
    content: string
    profiles: {
      username: string
      display_name: string
      avatar_url?: string
    }
  }
  currentUser: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      username?: string
    }
  }
  onReplyPosted?: () => void
  children?: React.ReactNode
}

export function ReplyDialog({ tweet, currentUser, onReplyPosted, children }: ReplyDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.length > 280) return

    setIsPosting(true)
    setError(null)

    try {
      const { error } = await supabase.from("tweets").insert({
        content: content.trim(),
        author_id: currentUser.id,
        reply_to_id: tweet.id,
      })

      if (error) throw error

      setContent("")
      setIsOpen(false)
      onReplyPosted?.()
    } catch (error) {
      console.error("Error posting reply:", error)
      setError("Failed to post reply. Please try again.")
    } finally {
      setIsPosting(false)
    }
  }

  const characterCount = content.length
  const isOverLimit = characterCount > 280
  const isEmpty = !content.trim()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reply to @{tweet.profiles.username}</DialogTitle>
        </DialogHeader>

        {/* Original tweet */}
        <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarImage src={tweet.profiles.avatar_url || "/placeholder.svg"} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {tweet.profiles.display_name[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{tweet.profiles.display_name}</span>
              <span className="text-muted-foreground text-sm">@{tweet.profiles.username}</span>
            </div>
            <p className="text-sm">{tweet.content}</p>
          </div>
        </div>

        {/* Reply form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentUser.user_metadata?.display_name?.[0]?.toUpperCase() ||
                  currentUser.user_metadata?.username?.[0]?.toUpperCase() ||
                  currentUser.email?.[0]?.toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder={`Reply to @${tweet.profiles.username}...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] border-0 resize-none focus-visible:ring-0 p-0"
                maxLength={300}
              />
            </div>
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

          <div className="flex items-center justify-between">
            <div className={`text-sm ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {characterCount}/280
            </div>
            <Button type="submit" disabled={isEmpty || isOverLimit || isPosting} className="rounded-full px-6">
              {isPosting ? "Replying..." : "Reply"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
