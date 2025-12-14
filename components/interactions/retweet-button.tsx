"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Repeat2, Quote } from "lucide-react"

interface RetweetButtonProps {
  tweetId: string
  currentUserId: string
  initialRetweetCount: number
  onUpdate?: () => void
  onQuote?: () => void
}

export function RetweetButton({ tweetId, currentUserId, initialRetweetCount, onUpdate, onQuote }: RetweetButtonProps) {
  const [isRetweeted, setIsRetweeted] = useState(false)
  const [retweetCount, setRetweetCount] = useState(initialRetweetCount)
  const [isRetweeting, setIsRetweeting] = useState(false)
  const supabase = createClient()

  // Check if user has retweeted this tweet
  useEffect(() => {
    const checkRetweetStatus = async () => {
      const { data, error } = await supabase
        .from("tweets")
        .select("id")
        .eq("author_id", currentUserId)
        .eq("retweet_of_id", tweetId)
        .is("content", null) // Plain retweets have null content
        .maybeSingle()

      if (!error && data) {
        setIsRetweeted(true)
      }
    }

    checkRetweetStatus()
  }, [supabase, currentUserId, tweetId])

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
          .is("content", null) // Only delete plain retweets

        if (!error) {
          setIsRetweeted(false)
          setRetweetCount((prev) => prev - 1)
        }
      } else {
        // Create retweet
        const { error } = await supabase.from("tweets").insert({
          content: null, // Plain retweets have null content
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleRetweet} disabled={isRetweeting}>
          <Repeat2 className="h-4 w-4 mr-2" />
          {isRetweeted ? "Undo Retweet" : "Retweet"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onQuote}>
          <Quote className="h-4 w-4 mr-2" />
          Quote Tweet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
