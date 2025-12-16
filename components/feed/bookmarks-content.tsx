"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { TweetCard } from "@/components/tweet/tweet-card"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Loader2 } from "lucide-react"

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

interface BookmarksContentProps {
  initialBookmarks: Tweet[]
  currentUserId: string
  currentUser: {
    id: string
    email?: string
  }
}

export function BookmarksContent({ initialBookmarks, currentUserId, currentUser }: BookmarksContentProps) {
  const [bookmarks, setBookmarks] = useState<Tweet[]>(initialBookmarks)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialBookmarks.length === 20)
  const supabase = createClient()

  const fetchMoreBookmarks = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const { data: newBookmarks, error } = await supabase
        .from("bookmarks")
        .select(`
          tweet_id,
          created_at,
          tweets (
            id,
            content,
            created_at,
            likes_count,
            retweets_count,
            replies_count,
            author_id,
            reply_to_id,
            retweet_of_id,
            media_urls,
            media_types,
            profiles (
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .range(bookmarks.length, bookmarks.length + 19)

      if (error) throw error

      const newTweets = (newBookmarks?.map((bookmark: any) => bookmark.tweets).filter(Boolean) || []) as Tweet[]
      setBookmarks((prev) => [...prev, ...newTweets])
      setHasMore(newTweets.length === 20)
    } catch (error) {
      console.error("Error fetching more bookmarks:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, currentUserId, bookmarks.length, isLoading])

  const loadMoreRef = useInfiniteScroll({
    onLoadMore: fetchMoreBookmarks,
    isLoading,
    hasMore,
  })

  // Real-time subscription for bookmark changes
  useEffect(() => {
    const channel = supabase
      .channel(`bookmarks:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          // Refresh bookmarks on any change
          fetchInitialBookmarks()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUserId])

  const fetchInitialBookmarks = async () => {
    const { data: newBookmarks, error } = await supabase
      .from("bookmarks")
      .select(`
        tweet_id,
        created_at,
        tweets (
          id,
          content,
          created_at,
          likes_count,
          retweets_count,
          replies_count,
          author_id,
          reply_to_id,
          retweet_of_id,
          media_urls,
          media_types,
          profiles (
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && newBookmarks) {
      const tweets = (newBookmarks.map((bookmark: any) => bookmark.tweets).filter(Boolean) || []) as Tweet[]
      setBookmarks(tweets)
      setHasMore(tweets.length === 20)
    }
  }

  return (
    <>
      {bookmarks.length > 0 ? (
        <div className="divide-y divide-border">
          {bookmarks.map((tweet) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              currentUserId={currentUserId}
              currentUser={currentUser}
            />
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="p-4 flex justify-center">
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading more bookmarks...</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-lg mb-2">No bookmarks yet</p>
          <p className="text-sm">Save tweets for later by clicking the bookmark icon</p>
        </div>
      )}
    </>
  )
}
