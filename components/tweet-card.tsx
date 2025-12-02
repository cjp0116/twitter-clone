"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Heart, Share, MoreHorizontal, Repeat2, Edit, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ReplyDialog } from "@/components/reply-dialog"
import { RetweetButton } from "@/components/retweet-button"
import { EditTweetDialog } from "@/components/edit-tweet-dialog"
import { DeleteTweetDialog } from "@/components/delete-tweet-dialog"
import Link from "next/link"

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
  profiles: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface TweetCardProps {
  tweet: Tweet
  currentUserId?: string
  currentUser?: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      username?: string
    }
  }
  onUpdate?: () => void
}

export function TweetCard({ tweet, currentUserId, currentUser, onUpdate }: TweetCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(tweet.likes_count)
  const [isLiking, setIsLiking] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const supabase = createClient()

  const handleLike = async () => {
    if (!currentUserId || isLiking) return

    setIsLiking(true)
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase.from("likes").delete().eq("user_id", currentUserId).eq("tweet_id", tweet.id)

        if (!error) {
          setIsLiked(false)
          setLikesCount((prev) => prev - 1)
        }
      } else {
        // Like
        const { error } = await supabase.from("likes").insert({
          user_id: currentUserId,
          tweet_id: tweet.id,
        })

        if (!error) {
          setIsLiked(true)
          setLikesCount((prev) => prev + 1)
        }
      }
      onUpdate?.()
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const isOwner = currentUserId === tweet.author_id
  const isRetweet = !!tweet.retweet_of_id

  return (
    <>
      <Card className="border-0 border-b rounded-none hover:bg-muted/30 transition-colors">
        <CardContent className="p-4">
          {isRetweet && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Repeat2 className="h-4 w-4 ml-8" />
              <span>{tweet.profiles.display_name} retweeted</span>
            </div>
          )}

          <div className="flex gap-3">
            <Link href={`/profile/${tweet.profiles.username}`}>
              <Avatar className="h-12 w-12 cursor-pointer">
                <AvatarImage src={tweet.profiles.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {tweet.profiles.display_name[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${tweet.profiles.username}`} className="hover:underline">
                  <span className="font-semibold text-foreground">{tweet.profiles.display_name}</span>
                </Link>
                <span className="text-muted-foreground">@{tweet.profiles.username}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true })}
                </span>
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwner && !isRetweet && (
                        <>
                          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit tweet
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete tweet
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isOwner && (
                        <DropdownMenuItem>
                          <span className="text-muted-foreground">No actions available</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {tweet.content && <div className="text-foreground leading-relaxed">{tweet.content}</div>}

              <div className="flex items-center justify-between max-w-md pt-2">
                {currentUser && <ReplyDialog tweet={tweet} currentUser={currentUser} onReplyPosted={onUpdate} />}
                <span className="text-sm text-muted-foreground ml-1">{tweet.replies_count}</span>

                {currentUserId && (
                  <RetweetButton
                    tweetId={tweet.id}
                    currentUserId={currentUserId}
                    initialRetweetCount={tweet.retweets_count}
                    onUpdate={onUpdate}
                  />
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`h-8 px-2 ${
                    isLiked
                      ? "text-red-600 hover:text-red-700 hover:bg-red-600/10"
                      : "text-muted-foreground hover:text-red-600 hover:bg-red-600/10"
                  }`}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                  <span className="text-sm">{likesCount}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentUser && isOwner && (
        <>
          <EditTweetDialog
            tweet={tweet}
            currentUser={currentUser}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onTweetUpdated={onUpdate}
          />
          <DeleteTweetDialog
            tweetId={tweet.id}
            currentUserId={currentUserId}
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onTweetDeleted={onUpdate}
          />
        </>
      )}
    </>
  )
}
