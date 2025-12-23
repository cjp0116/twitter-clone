"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { TweetCard } from "@/components/tweet/tweet-card"
import { Loader2 } from "lucide-react"

interface HashtagFeedProps {
  tag: string
  currentUserId: string
}

interface Tweet {
  id: string
  content: string
  created_at: string
  likes_count: number
  retweets_count: number
  replies_count: number
  author_id: string
  reply_to_id?: string
  retweet_of_id?: string
  media_urls?: string[]
  media_types?: string[]
  profiles: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

export function HashtagFeed({ tag, currentUserId }: HashtagFeedProps) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchTweets = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // First, get the hashtag ID
        const { data: hashtagData, error: hashtagError } = await supabase
          .from("hashtags")
          .select("id")
          .eq("tag", tag)
          .single()

        if (hashtagError || !hashtagData) {
          setTweets([])
          setIsLoading(false)
          return
        }

        // Get tweet IDs that have this hashtag
        const { data: tweetHashtags, error: tweetHashtagsError } = await supabase
          .from("tweet_hashtags")
          .select("tweet_id")
          .eq("hashtag_id", hashtagData.id)

        if (tweetHashtagsError) throw tweetHashtagsError

        if (!tweetHashtags || tweetHashtags.length === 0) {
          setTweets([])
          setIsLoading(false)
          return
        }

        const tweetIds = tweetHashtags.map((th) => th.tweet_id)

        // Fetch the actual tweets
        const { data: tweetsData, error: tweetsError } = await supabase
          .from("tweets")
          .select(
            `
            *,
            profiles (
              username,
              display_name,
              avatar_url
            )
          `
          )
          .in("id", tweetIds)
          .order("created_at", { ascending: false })

        if (tweetsError) throw tweetsError

        setTweets(tweetsData || [])
      } catch (err) {
        console.error("Error fetching hashtag tweets:", err)
        setError("Failed to load tweets")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTweets()

    // Subscribe to new tweets with this hashtag
    const channel = supabase
      .channel(`hashtag-${tag}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tweet_hashtags",
        },
        () => {
          fetchTweets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tag, supabase])

  const handleUpdate = () => {
    // Refetch tweets when one is updated/deleted
    const fetchTweets = async () => {
      const { data: hashtagData } = await supabase
        .from("hashtags")
        .select("id")
        .eq("tag", tag)
        .single()

      if (!hashtagData) return

      const { data: tweetHashtags } = await supabase
        .from("tweet_hashtags")
        .select("tweet_id")
        .eq("hashtag_id", hashtagData.id)

      if (!tweetHashtags || tweetHashtags.length === 0) {
        setTweets([])
        setIsLoading(false)
        return
      }

      const tweetIds = tweetHashtags.map((th) => th.tweet_id)

      const { data: tweetsData, error: tweetsError } = await supabase
        .from("tweets")
        .select(
          `
          *,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `
        )
        .in("id", tweetIds)
        .order("created_at", { ascending: false })

      if (tweetsError) {
        console.error("Error fetching tweets:", tweetsError)
        setTweets([])
        setIsLoading(false)
        return
      }

      setTweets(tweetsData || [])
    }

    fetchTweets()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (tweets.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No posts with this hashtag yet.</p>
        <p className="text-sm text-muted-foreground mt-2">Be the first to post with #{tag}!</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} currentUserId={currentUserId} onUpdate={handleUpdate} />
      ))}
    </div>
  )
}
