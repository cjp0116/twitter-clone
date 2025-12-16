"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TweetCard } from "@/components/tweet/tweet-card"
import { createClient } from "@/lib/supabase/client"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useBlockedMuted, filterBlockedMutedTweets } from "@/hooks/use-blocked-muted"
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

interface ProfileContentProps {
  tweets: Tweet[]
  currentUserId: string
  isOwnProfile: boolean
  username: string
  profileId: string
}

export function ProfileContent({ tweets: initialTweets, currentUserId, isOwnProfile, username, profileId }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState("tweets")
  const [tweets, setTweets] = useState<Tweet[]>(initialTweets)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialTweets.length === 20)
  const supabase = createClient()

  // Get blocked and muted users
  const { blockedUserIds, mutedUserIds } = useBlockedMuted(currentUserId)

  // Filter tweets to exclude blocked/muted users (except for the profile owner's own tweets)
  const filteredTweets = useMemo(
    () => filterBlockedMutedTweets(tweets, blockedUserIds, mutedUserIds),
    [tweets, blockedUserIds, mutedUserIds]
  )

  // Reset tweets when initial tweets change (e.g., profile changed)
  useEffect(() => {
    setTweets(initialTweets)
    setHasMore(initialTweets.length === 20)
  }, [initialTweets])

  const fetchMoreTweets = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      // Fetch user's own tweets
      const { data: ownTweets, error: tweetsError } = await supabase
        .from("tweets")
        .select(`
          *,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("author_id", profileId)
        .order("created_at", { ascending: false })
        .range(tweets.length, tweets.length + 19)

      if (tweetsError) throw tweetsError

      // Fetch tweets where this user is mentioned
      const { data: mentionedTweets, error: mentionedError } = await supabase
        .from("tweets")
        .select(`
          *,
          profiles (
            username,
            display_name,
            avatar_url
          ),
          tweet_mentions!inner (
            mentioned_user_id
          )
        `)
        .eq("tweet_mentions.mentioned_user_id", profileId)
        .order("created_at", { ascending: false })
        .range(tweets.length, tweets.length + 19)

      if (mentionedError) throw mentionedError

      // Combine and dedupe tweets
      const tweetsMap = new Map<string, Tweet>()
      for (const t of tweets) {
        tweetsMap.set(t.id, t)
      }
      for (const t of ownTweets || []) {
        tweetsMap.set(t.id, t as Tweet)
      }
      for (const t of mentionedTweets || []) {
        tweetsMap.set(t.id, t as Tweet)
      }
      const combinedTweets = Array.from(tweetsMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      setTweets(combinedTweets)
      setHasMore((ownTweets?.length || 0) === 20 || (mentionedTweets?.length || 0) === 20)
    } catch (error) {
      console.error("Error fetching more tweets:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, profileId, tweets, isLoading])

  const loadMoreRef = useInfiniteScroll({
    onLoadMore: fetchMoreTweets,
    isLoading,
    hasMore,
  })

  // Filter tweets with media
  const mediaTweets = filteredTweets.filter((tweet) => tweet.media_urls && tweet.media_urls.length > 0)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="border-b border-border">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
          <TabsTrigger
            value="tweets"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-4"
          >
            Tweets
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-4"
          >
            Media
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tweets" className="mt-0">
        <div className="divide-y divide-border">
          {filteredTweets && filteredTweets.length > 0 ? (
            <>
              {filteredTweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} currentUserId={currentUserId} />)}
              {hasMore && (
                <div ref={loadMoreRef} className="p-4 flex justify-center">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more tweets...</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg mb-2">No tweets yet</p>
              <p className="text-sm">
                {isOwnProfile ? "Share your first thought!" : `@${username} hasn't tweeted yet.`}
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="media" className="mt-0">
        <div className="divide-y divide-border">
          {mediaTweets && mediaTweets.length > 0 ? (
            <>
              {mediaTweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} currentUserId={currentUserId} />)}
              {hasMore && (
                <div ref={loadMoreRef} className="p-4 flex justify-center">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more tweets...</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg mb-2">No media yet</p>
              <p className="text-sm">
                {isOwnProfile
                  ? "Tweets with photos and videos will show up here."
                  : `@${username} hasn't posted any media yet.`}
              </p>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
