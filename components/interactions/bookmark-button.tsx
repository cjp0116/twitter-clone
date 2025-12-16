"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"

interface BookmarkButtonProps {
  tweetId: string
  currentUserId: string
  onUpdate?: () => void
}

export function BookmarkButton({ tweetId, currentUserId, onUpdate }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isBookmarking, setIsBookmarking] = useState(false)
  const supabase = createClient()

  // Check if tweet is already bookmarked on mount
  useEffect(() => {
    const checkBookmark = async () => {
      const client = createClient()
      const { data, error } = await client
        .from("bookmarks")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("tweet_id", tweetId)
        .maybeSingle()

      if (!error && data) {
        setIsBookmarked(true)
      }
    }

    if (currentUserId && tweetId) {
      checkBookmark()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, tweetId])

  const handleBookmark = async () => {
    if (isBookmarking) return

    setIsBookmarking(true)
    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", currentUserId)
          .eq("tweet_id", tweetId)

        if (!error) {
          setIsBookmarked(false)
        }
      } else {
        // Add bookmark
        const { error } = await supabase.from("bookmarks").insert({
          user_id: currentUserId,
          tweet_id: tweetId,
        })

        if (!error) {
          setIsBookmarked(true)
        }
      }
      onUpdate?.()
    } catch (error) {
      console.error("Error toggling bookmark:", error)
    } finally {
      setIsBookmarking(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBookmark}
      disabled={isBookmarking}
      className={`h-8 px-2 ${isBookmarked
        ? "text-blue-600 hover:text-blue-700 hover:bg-blue-600/10"
        : "text-muted-foreground hover:text-blue-600 hover:bg-blue-600/10"
        }`}
    >
      <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
    </Button>
  )
}

