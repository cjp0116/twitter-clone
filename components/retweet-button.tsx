"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Repeat2 } from "lucide-react"

interface RetweetButtonProps {
  tweetId: string
  currentUserId: string
  initialRetweetCount: number
  onUpdate?: () => void
}

export function RetweetButton({ tweetId, currentUserId, initialRetweetCount, onUpdate }: RetweetButtonProps) {
  const [isRetweeted, setIsRetweeted] = useState(false)
  const [retweetCount, setRetweetCount] = useState(initialRetweetCount)
  const [isRetweeting, setIsRetweeting] = useState(false)
  const supabase = createClient()

  const handleRetweet = async () => {
    if (isRetweeting) return

    setIsRetweeting(true)
    try {
      if (isRetweeted) {
        // Remove retweet
        const { error } = await supabase
          .from("tweets")
          .delete()
          .eq("author_id", currentUserId)
          .eq("retweet_of_id", tweetId)

        if (!error) {
          setIsRetweeted(false)
          setRetweetCount((prev) => prev - 1)
        }
      } else {
        // Create retweet
        const { error } = await supabase.from("tweets").insert({
          content: "", // Retweets have empty content
          author_id: currentUserId,
          retweet_of_id: tweetId,
        })

        if (!error) {
          setIsRetweeted(true)
          setRetweetCount((prev) => prev + 1)
        }
      }
      onUpdate?.()
    } catch (error) {
      console.error("Error toggling retweet:", error)
    } finally {
      setIsRetweeting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRetweet}
      disabled={isRetweeting}
      className={`h-8 px-2 ${
        isRetweeted
          ? "text-green-600 hover:text-green-700 hover:bg-green-600/10"
          : "text-muted-foreground hover:text-green-600 hover:bg-green-600/10"
      }`}
    >
      <Repeat2 className="h-4 w-4 mr-2" />
      <span className="text-sm">{retweetCount}</span>
    </Button>
  )
}
