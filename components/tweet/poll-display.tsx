"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PollOption {
  id: string
  option_text: string
  vote_count: number
  position: number
}

interface Poll {
  id: string
  tweet_id: string
  duration_hours: number
  ends_at: string
  created_at: string
}

interface PollDisplayProps {
  tweetId: string
  currentUserId?: string
}

export function PollDisplay({ tweetId, currentUserId }: PollDisplayProps) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [options, setOptions] = useState<PollOption[]>([])
  const [userVote, setUserVote] = useState<string | null>(null)
  const [totalVotes, setTotalVotes] = useState(0)
  const [hasEnded, setHasEnded] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchPollData()
  }, [tweetId])

  // Set up real-time subscriptions only when poll exists
  useEffect(() => {
    if (!poll?.id) return

    const channel = supabase
      .channel(`poll-${poll.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${poll.id}`,
        },
        () => {
          fetchPollData()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "poll_options",
          filter: `poll_id=eq.${poll.id}`,
        },
        () => {
          fetchPollData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [poll?.id])

  const fetchPollData = async () => {
    try {
      // Fetch poll - use maybeSingle() to avoid errors when no poll exists
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("tweet_id", tweetId)
        .maybeSingle()

      if (pollError) {
        console.error("Error fetching poll for tweet", tweetId, ":", pollError)
        setPoll(null)
        setOptions([])
        setUserVote(null)
        setTotalVotes(0)
        return
      }

      if (!pollData) {
        // console.log("No poll found for tweet:", tweetId)
        setPoll(null)
        setOptions([])
        setUserVote(null)
        setTotalVotes(0)
        return
      }
      // console.log("Poll found for tweet", tweetId, ":", pollData)
      setPoll(pollData)
      setHasEnded(new Date(pollData.ends_at) < new Date())

      // Fetch poll options
      const { data: optionsData, error: optionsError } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", pollData.id)
        .order("position", { ascending: true })

      if (optionsError) throw optionsError

      setOptions(optionsData || [])

      // Calculate total votes
      const total = (optionsData || []).reduce((sum, opt) => sum + opt.vote_count, 0)
      setTotalVotes(total)

      // Check if current user has voted
      if (currentUserId) {
        const { data: voteData, error: voteError } = await supabase
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", pollData.id)
          .eq("user_id", currentUserId)
          .maybeSingle()

        if (voteError) {
          console.error("Error fetching poll vote:", voteError)
          setUserVote(null)
          return
        }

        setUserVote(voteData?.option_id || null)
      }
    } catch (error) {
      console.error("Error fetching poll:", error)
    }
  }

  const handleVote = async (optionId: string) => {
    if (!currentUserId || isVoting || hasEnded || userVote) return

    setIsVoting(true)
    try {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: poll!.id,
        option_id: optionId,
        user_id: currentUserId,
      })

      if (error) throw error

      setUserVote(optionId)
      await fetchPollData()
    } catch (error) {
      console.error("Error voting:", error)
    } finally {
      setIsVoting(false)
    }
  }

  const getPercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0
    return Math.round((voteCount / totalVotes) * 100)
  }

  const getLeadingOptionId = () => {
    if (options.length === 0) return null
    return options.reduce((max, opt) => (opt.vote_count > max.vote_count ? opt : max)).id
  }

  const formatTimeRemaining = () => {
    if (!poll) return ""
    const now = new Date()
    const end = new Date(poll.ends_at)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return "Poll ended"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h left`
    if (hours > 0) return `${hours}h ${minutes}m left`
    return `${minutes}m left`
  }

  if (!poll || options.length === 0) return null

  const showResults = hasEnded || userVote !== null
  const leadingOptionId = getLeadingOptionId()

  return (
    <div className="mt-3 space-y-2">
      {options.map((option) => {
        const percentage = getPercentage(option.vote_count)
        const isLeading = option.id === leadingOptionId && totalVotes > 0
        const isUserChoice = option.id === userVote

        return (
          <div key={option.id} className="relative">
            {showResults ? (
              // Show results
              <div
                className={cn(
                  "relative overflow-hidden rounded-md border p-3",
                  isUserChoice
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 bg-gray-800/50"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 transition-all",
                    isUserChoice ? "bg-blue-500/20" : "bg-gray-700/30"
                  )}
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.option_text}</span>
                    {isUserChoice && <Check className="h-4 w-4 text-blue-500" />}
                  </div>
                  <span className={cn("font-bold", isLeading && "text-blue-500")}>
                    {percentage}%
                  </span>
                </div>
              </div>
            ) : (
              // Show voting buttons
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 hover:bg-blue-500/10 hover:border-blue-500"
                onClick={() => handleVote(option.id)}
                disabled={isVoting || !currentUserId}
              >
                {option.option_text}
              </Button>
            )}
          </div>
        )
      })}

      {/* Poll metadata */}
      <div className="flex items-center gap-2 text-sm text-gray-500 pt-1">
        <span>{totalVotes.toLocaleString()} votes</span>
        <span>•</span>
        <span>{formatTimeRemaining()}</span>
      </div>
    </div>
  )
}
