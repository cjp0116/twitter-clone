"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { TweetCard } from "@/components/tweet-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useBlockedMuted, filterBlockedMutedTweets } from "@/hooks/use-blocked-muted"

interface Tweet {
  id: string
  content: string
  created_at: string
  likes_count: number
  retweets_count: number
  replies_count: number
  author_id: string
  profiles: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface TimelineFeedProps {
  initialTweets: Tweet[]
  currentUserId: string
  currentUser?: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      username?: string
    }
  }
}

export function TimelineFeed({ initialTweets, currentUserId, currentUser }: TimelineFeedProps) {
  const [tweets, setTweets] = useState<Tweet[]>(initialTweets)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [newTweetsCount, setNewTweetsCount] = useState(0)
  const supabase = createClient()

  // Get blocked and muted users
  const { blockedUserIds, mutedUserIds } = useBlockedMuted(currentUserId)

  // Filter tweets to exclude blocked/muted users
  const filteredTweets = useMemo(
    () => filterBlockedMutedTweets(tweets, blockedUserIds, mutedUserIds),
    [tweets, blockedUserIds, mutedUserIds]
  )

  const fetchTweets = useCallback(
    async (offset = 0, isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const { data: newTweets, error } = await supabase
          .from("tweets")
          .select(`
          *,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
          .order("created_at", { ascending: false })
          .range(offset, offset + 19)

        if (error) throw error

        if (isRefresh) {
          setTweets(newTweets || [])
          setNewTweetsCount(0)
        } else if (offset === 0) {
          setTweets(newTweets || [])
        } else {
          setTweets((prev) => [...prev, ...(newTweets || [])])
        }

        setHasMore((newTweets?.length || 0) === 20)
      } catch (error) {
        console.error("Error fetching tweets:", error)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [supabase],
  )

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchTweets(tweets.length)
    }
  }

  const refresh = () => {
    fetchTweets(0, true)
  }

  useEffect(() => {
    const channel = supabase
      .channel("tweets")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tweets",
        },
        (payload) => {
          // Don't show notification for current user's tweets
          if (payload.new.author_id !== currentUserId) {
            setNewTweetsCount((prev) => prev + 1)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUserId])

  const handleTweetUpdate = useCallback(() => {
    // Refresh the feed when a tweet is updated (liked, etc.)
    fetchTweets(0, true)
  }, [fetchTweets])

  // Infinite scroll hook
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: loadMore,
    isLoading,
    hasMore,
  })

  return (
    <div className="space-y-0">
      {/* New tweets notification */}
      {newTweetsCount > 0 && (
        <div className="sticky top-16 z-10 p-3 bg-primary/10 border-b border-border">
          <Button onClick={refresh} variant="ghost" className="w-full text-primary hover:bg-primary/20">
            {newTweetsCount} new tweet{newTweetsCount > 1 ? "s" : ""} - Click to refresh
          </Button>
        </div>
      )}

      {/* Refresh button */}
      <div className="p-3 border-b border-border">
        <Button onClick={refresh} variant="ghost" size="sm" disabled={isRefreshing} className="w-full">
          {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Tweet list */}
      <div className="divide-y divide-border">
        {filteredTweets.length > 0 ? (
          filteredTweets.map((tweet) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              currentUserId={currentUserId}
              currentUser={currentUser}
              onUpdate={handleTweetUpdate}
            />
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-lg mb-2">No tweets yet</p>
            <p className="text-sm">Be the first to share what's happening!</p>
          </div>
        )}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && tweets.length > 0 && (
        <div ref={loadMoreRef} className="p-4 border-t border-border flex justify-center">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more tweets...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
