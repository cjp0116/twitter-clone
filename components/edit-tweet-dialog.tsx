"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface EditTweetDialogProps {
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
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTweetUpdated?: () => void
}

export function EditTweetDialog({ tweet, currentUser, isOpen, onOpenChange, onTweetUpdated }: EditTweetDialogProps) {
  const [content, setContent] = useState(tweet.content)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const extractUsernamesFromContent = (text: string): string[] => {
    const regex = /@([A-Za-z0-9_]+)/g
    const usernames = new Set<string>()
    let match
    while ((match = regex.exec(text)) !== null) {
      usernames.add(match[1])
    }
    return Array.from(usernames)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.length > 280) return

    setIsUpdating(true)
    setError(null)

    try {
      const { data: updatedTweets, error } = await supabase
        .from("tweets")
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tweet.id)
        .eq("author_id", currentUser.id) // Ensure only owner can update
        .select("id, content")

      if (error) throw error

      // Rebuild mentions for this tweet
      await supabase.from("tweet_mentions").delete().eq("tweet_id", tweet.id)

      const updatedTweet = updatedTweets?.[0]
      if (!updatedTweet) {
        throw new Error("Failed to retrieve updated tweet")
      }
      const usernames = extractUsernamesFromContent(updatedTweet.content)

      if (usernames.length > 0) {
        const { data: mentionedProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("username", usernames)

        if (!profilesError && mentionedProfiles && mentionedProfiles.length > 0) {
          const rows = mentionedProfiles
            .filter((p) => p.id !== currentUser.id)
            .map((p) => ({
              tweet_id: updatedTweet.id,
              mentioned_user_id: p.id,
            }))

          if (rows.length > 0) {
            await supabase.from("tweet_mentions").insert(rows)
          }
        }
      }

      onOpenChange(false)
      onTweetUpdated?.()
    } catch (error) {
      console.error("Error updating tweet:", error)
      setError("Failed to update tweet. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const characterCount = content.length
  const isOverLimit = characterCount > 280
  const isEmpty = !content.trim()
  const hasChanged = content.trim() !== tweet.content

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit tweet</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tweet.profiles.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {tweet.profiles.display_name[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-xl border-0 resize-none focus-visible:ring-0 p-0 placeholder:text-xl placeholder:text-muted-foreground"
                maxLength={300}
              />
            </div>
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

          <div className="flex items-center justify-between">
            <div className={`text-sm ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {characterCount}/280
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEmpty || isOverLimit || isUpdating || !hasChanged}
                className="rounded-full px-6"
              >
                {isUpdating ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
