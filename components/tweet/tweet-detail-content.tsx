"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Heart, MessageCircle, Eye, BarChart3 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { ReplyDialog } from "@/components/tweet/reply-dialog"
import { RetweetButton } from "@/components/interactions/retweet-button"
import { BookmarkButton } from "@/components/interactions/bookmark-button"
import { TweetMediaGallery } from "@/components/tweet/tweet-media-gallery"
import { PollDisplay } from "@/components/tweet/poll-display"
import { QuotedTweetPreview } from "@/components/tweet/quoted-tweet-preview"

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
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface TweetDetailContentProps {
  tweet: Tweet
  currentUserId: string
  currentUser: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      username?: string
    }
  }
}

export function TweetDetailContent({ tweet, currentUserId, currentUser }: TweetDetailContentProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(tweet.likes_count)
  const [isLiking, setIsLiking] = useState(false)
  const [replies, setReplies] = useState<Tweet[]>([])
  const [relevantPeople, setRelevantPeople] = useState<any[]>([])
  const [quotedTweet, setQuotedTweet] = useState<any>(null)
  const [viewCount, setViewCount] = useState(0)
  const supabase = createClient()

  const isQuoteTweet = !!tweet.retweet_of_id && !!tweet.content

  // Load like state
  useEffect(() => {
    const loadLikeState = async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("tweet_id", tweet.id)
        .maybeSingle()

      if (data) {
        setIsLiked(true)
      }
    }

    loadLikeState()
  }, [currentUserId, tweet.id])

  // Load replies
  useEffect(() => {
    const loadReplies = async () => {
      const { data, error } = await supabase
        .from("tweets")
        .select(
          `
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `
        )
        .eq("reply_to_id", tweet.id)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setReplies(data as Tweet[])
      }
    }

    loadReplies()
  }, [tweet.id])

  // Load relevant people (people who engaged)
  useEffect(() => {
    const loadRelevantPeople = async () => {
      // Get people who liked, retweeted, or replied
      const { data: likers } = await supabase
        .from("likes")
        .select("user_id, profiles(id, username, display_name, avatar_url)")
        .eq("tweet_id", tweet.id)
        .limit(5)

      const { data: retweeters } = await supabase
        .from("tweets")
        .select("author_id, profiles(id, username, display_name, avatar_url)")
        .eq("retweet_of_id", tweet.id)
        .limit(5)

      const { data: repliers } = await supabase
        .from("tweets")
        .select("author_id, profiles(id, username, display_name, avatar_url)")
        .eq("reply_to_id", tweet.id)
        .limit(5)

      // Combine and dedupe
      const peopleMap = new Map()

      likers?.forEach((like: any) => {
        if (like.profiles) {
          peopleMap.set(like.profiles.id, like.profiles)
        }
      })

      retweeters?.forEach((retweet: any) => {
        if (retweet.profiles) {
          peopleMap.set(retweet.profiles.id, retweet.profiles)
        }
      })

      repliers?.forEach((reply: any) => {
        if (reply.profiles) {
          peopleMap.set(reply.profiles.id, reply.profiles)
        }
      })

      setRelevantPeople(Array.from(peopleMap.values()).slice(0, 5))
    }

    loadRelevantPeople()
  }, [tweet.id])

  // Fetch quoted tweet if this is a quote tweet
  useEffect(() => {
    if (!isQuoteTweet) return

    const fetchQuotedTweet = async () => {
      const { data } = await supabase
        .from("tweets")
        .select(
          `
          id,
          content,
          created_at,
          author_id,
          media_urls,
          media_types,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `
        )
        .eq("id", tweet.retweet_of_id)
        .single()

      if (data) {
        setQuotedTweet(data)
      }
    }

    fetchQuotedTweet()
  }, [tweet.retweet_of_id, isQuoteTweet])

  // Simulate view count (you can track this properly later)
  useEffect(() => {
    setViewCount(Math.floor(Math.random() * 1000) + 100)
  }, [])

  const handleLike = async () => {
    if (!currentUserId || isLiking) return

    setIsLiking(true)
    try {
      if (isLiked) {
        const { error } = await supabase.from("likes").delete().eq("user_id", currentUserId).eq("tweet_id", tweet.id)

        if (!error) {
          setIsLiked(false)
          setLikesCount((prev) => prev - 1)
        }
      } else {
        const { error } = await supabase.from("likes").insert({
          user_id: currentUserId,
          tweet_id: tweet.id,
        })

        if (!error) {
          setIsLiked(true)
          setLikesCount((prev) => prev + 1)
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const renderContent = (text: string) => {
    const parts = text.split(/(\s+)/)

    return parts.map((part, index) => {
      if (/^#[A-Za-z0-9_]+$/.test(part)) {
        const tag = part.slice(1)
        return (
          <Link
            key={`${part}-${index}`}
            href={`/explore?tag=${encodeURIComponent(tag)}`}
            className="text-sky-500 hover:underline"
          >
            {part}
          </Link>
        )
      }

      if (/^@[A-Za-z0-9_]+$/.test(part)) {
        const username = part.slice(1)
        return (
          <Link
            key={`${part}-${index}`}
            href={`/profile/${encodeURIComponent(username)}`}
            className="text-sky-500 hover:underline"
          >
            {part}
          </Link>
        )
      }

      return <span key={`${part}-${index}`}>{part}</span>
    })
  }

  return (
    <Card className="border-0 border-b rounded-none">
      <CardContent className="p-4 space-y-4">
        {/* Author Info */}
        <div className="flex items-center gap-3">
          <Link href={`/profile/${tweet.profiles.username}`}>
            <Avatar className="h-12 w-12 cursor-pointer">
              <AvatarImage src={tweet.profiles.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {tweet.profiles.display_name[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${tweet.profiles.username}`} className="hover:underline">
              <p className="font-semibold text-foreground">{tweet.profiles.display_name}</p>
            </Link>
            <p className="text-muted-foreground">@{tweet.profiles.username}</p>
          </div>
        </div>

        {/* Tweet Content */}
        {tweet.content && (
          <div className="text-foreground text-xl leading-relaxed break-words">{renderContent(tweet.content)}</div>
        )}

        {/* Media */}
        {tweet.media_urls && tweet.media_urls.length > 0 && (
          <TweetMediaGallery mediaUrls={tweet.media_urls} mediaTypes={tweet.media_types || []} />
        )}

        {/* Quote Tweet */}
        {isQuoteTweet && quotedTweet && (
          <div className="mt-3">
            <QuotedTweetPreview tweet={quotedTweet} />
          </div>
        )}

        {/* Poll */}
        <PollDisplay tweetId={tweet.id} currentUserId={currentUserId} />

        {/* Timestamp */}
        <p className="text-muted-foreground text-sm">
          {new Date(tweet.created_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}{" "}
          ·{" "}
          {new Date(tweet.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <Separator />

        {/* Engagement Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{viewCount.toLocaleString()}</span>
            <span className="text-muted-foreground">Views</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">{tweet.retweets_count}</span>
            <span className="text-muted-foreground">Retweets</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">{likesCount}</span>
            <span className="text-muted-foreground">Likes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">{tweet.replies_count}</span>
            <span className="text-muted-foreground">Replies</span>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-around">
          <ReplyDialog tweet={tweet} currentUser={currentUser} onReplyPosted={() => window.location.reload()} />

          <RetweetButton tweetId={tweet.id} currentUserId={currentUserId} initialRetweetCount={tweet.retweets_count} />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className={`h-10 px-4 ${
              isLiked
                ? "text-red-600 hover:text-red-700 hover:bg-red-600/10"
                : "text-muted-foreground hover:text-red-600 hover:bg-red-600/10"
            }`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
          </Button>

          <BookmarkButton tweetId={tweet.id} currentUserId={currentUserId} />
        </div>

        <Separator />

        {/* Reply Composer */}
        <div className="py-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentUser.user_metadata?.display_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <ReplyDialog tweet={tweet} currentUser={currentUser} onReplyPosted={() => window.location.reload()}>
                <Button variant="outline" className="w-full justify-start text-muted-foreground">
                  Post your reply
                </Button>
              </ReplyDialog>
            </div>
          </div>
        </div>

        <Separator />

        {/* Replies Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Replies</h3>
          {replies.length > 0 ? (
            replies.map((reply) => (
              <Card key={reply.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                <div className="flex gap-3">
                  <Link href={`/profile/${reply.profiles.username}`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reply.profiles.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{reply.profiles.display_name[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${reply.profiles.username}`}>
                        <span className="font-semibold hover:underline">{reply.profiles.display_name}</span>
                      </Link>
                      <span className="text-muted-foreground">@{reply.profiles.username}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {reply.content && (
                      <p className="text-foreground mt-1 break-words">{renderContent(reply.content)}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">No replies yet. Be the first to reply!</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Export relevant people data for the page to use in sidebar
export interface RelevantPerson {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

export async function getRelevantPeople(tweetId: string, supabase: any): Promise<RelevantPerson[]> {
  // Get people who liked, retweeted, or replied
  const { data: likers } = await supabase
    .from("likes")
    .select("user_id, profiles(id, username, display_name, avatar_url)")
    .eq("tweet_id", tweetId)
    .limit(5)

  const { data: retweeters } = await supabase
    .from("tweets")
    .select("author_id, profiles(id, username, display_name, avatar_url)")
    .eq("retweet_of_id", tweetId)
    .limit(5)

  const { data: repliers } = await supabase
    .from("tweets")
    .select("author_id, profiles(id, username, display_name, avatar_url)")
    .eq("reply_to_id", tweetId)
    .limit(5)

  // Combine and dedupe
  const peopleMap = new Map()

  likers?.forEach((like: any) => {
    if (like.profiles) {
      peopleMap.set(like.profiles.id, like.profiles)
    }
  })

  retweeters?.forEach((retweet: any) => {
    if (retweet.profiles) {
      peopleMap.set(retweet.profiles.id, retweet.profiles)
    }
  })

  repliers?.forEach((reply: any) => {
    if (reply.profiles) {
      peopleMap.set(reply.profiles.id, reply.profiles)
    }
  })

  return Array.from(peopleMap.values()).slice(0, 5)
}
