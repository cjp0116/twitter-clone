"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TweetCard } from "@/components/tweet-card"

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
}

export function ProfileContent({ tweets, currentUserId, isOwnProfile, username }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState("tweets")

  // Filter tweets with media
  const mediaTweets = tweets.filter((tweet) => tweet.media_urls && tweet.media_urls.length > 0)

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
          {tweets && tweets.length > 0 ? (
            tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} currentUserId={currentUserId} />)
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
            mediaTweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} currentUserId={currentUserId} />)
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
