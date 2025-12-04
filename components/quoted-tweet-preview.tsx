"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { TweetMediaGallery } from "@/components/tweet-media-gallery"

interface QuotedTweetPreviewProps {
  tweet: {
    id: string
    content: string
    created_at: string
    author_id: string
    media_urls?: string[]
    media_types?: string[]
    profiles: {
      username: string
      display_name: string
      avatar_url?: string
    }
  }
  compact?: boolean
}

export function QuotedTweetPreview({ tweet, compact = false }: QuotedTweetPreviewProps) {
  const renderContent = (text: string) => {
    // Truncate long content for compact view
    if (compact && text.length > 100) {
      return text.slice(0, 100) + "..."
    }

    const parts = text.split(/(\s+)/)

    return parts.map((part, index) => {
      if (/^#[A-Za-z0-9_]+$/.test(part)) {
        const tag = part.slice(1)
        return (
          <Link
            key={`${part}-${index}`}
            href={`/explore?tag=${encodeURIComponent(tag)}`}
            className="text-sky-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        )
      }

      return <span key={`${part}-${index}`}>{part}</span>
    })
  }

  return (
    <Card className="border border-border rounded-2xl overflow-hidden hover:bg-muted/30 transition-colors cursor-pointer">
      <CardContent className="p-3">
        <div className="flex gap-2">
          <Link
            href={`/profile/${tweet.profiles.username}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={tweet.profiles.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {tweet.profiles.display_name[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1 text-sm">
              <Link
                href={`/profile/${tweet.profiles.username}`}
                className="font-semibold hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {tweet.profiles.display_name}
              </Link>
              <span className="text-muted-foreground truncate">
                @{tweet.profiles.username}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true })}
              </span>
            </div>

            {tweet.content && (
              <div className="text-sm text-foreground leading-snug break-words">
                {renderContent(tweet.content)}
              </div>
            )}

            {tweet.media_urls && tweet.media_urls.length > 0 && !compact && (
              <div className="mt-2">
                <TweetMediaGallery
                  mediaUrls={tweet.media_urls}
                  mediaTypes={tweet.media_types || []}
                />
              </div>
            )}

            {tweet.media_urls && tweet.media_urls.length > 0 && compact && (
              <div className="text-xs text-muted-foreground mt-1">
                📎 {tweet.media_urls.length} media file{tweet.media_urls.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
