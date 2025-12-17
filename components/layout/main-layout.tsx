"use client"

import type React from "react"
import type { User } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FollowButton } from "@/components/interactions/follow-button"
import { UserHoverCard } from "@/components/user/user-hover-card"
import Link from "next/link"

interface SuggestedUser {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  isFollowing: boolean
}

interface TrendingHashtag {
  tag: string
  tweet_count: number
}

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  user?: User
  showRightSidebar?: boolean
  showBackButton?: boolean
  suggestedUsers?: SuggestedUser[]
  trendingHashtags?: TrendingHashtag[]
}

export function MainLayout({
  children,
  title,
  user,
  showRightSidebar = true,
  showBackButton = false,
  suggestedUsers = [],
  trendingHashtags = [],
}: MainLayoutProps) {
  const router = useRouter()

  return (
    <div className="flex max-w-7xl mx-auto">
      <div className="w-[600px] border-x border-border">
        {/* Header */}
        <Card className="border-0 border-b rounded-none sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <CardHeader className="p-4 flex flex-row items-center gap-4">
            {showBackButton ? (
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <SidebarTrigger className="md:hidden" />
            )}
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
          </CardHeader>
        </Card>

        {children}
      </div>

      {/* Right sidebar - What's happening and Who to follow */}
      {showRightSidebar && (
        <div className="hidden xl:flex flex-col w-80 p-4 space-y-4">
          {/* What's happening section */}
          {trendingHashtags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trending</CardTitle>
              </CardHeader>
              <div className="p-4 pt-0 space-y-3">
                {trendingHashtags.map((hashtag, index) => (
                  <Link
                    key={hashtag.tag}
                    href={`/hashtag/${encodeURIComponent(hashtag.tag)}`}
                    className="block hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                  >
                    <p className="text-sm text-muted-foreground">Trending · #{index + 1}</p>
                    <p className="font-semibold">#{hashtag.tag}</p>
                    <p className="text-sm text-muted-foreground">
                      {hashtag.tweet_count.toLocaleString()} {hashtag.tweet_count === 1 ? "post" : "posts"}
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Who to follow section */}
          {suggestedUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Who to follow</CardTitle>
              </CardHeader>
              <div className="p-4 pt-0 space-y-3">
                {suggestedUsers.slice(0, 3).map((suggestedUser) => (
                  <div key={suggestedUser.id} className="flex items-center justify-between">
                    <UserHoverCard userId={suggestedUser.id} currentUserId={user?.id}>
                      <Link
                        href={`/profile/${suggestedUser.username}`}
                        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={suggestedUser.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {suggestedUser.display_name[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{suggestedUser.display_name}</p>
                          <p className="text-sm text-muted-foreground truncate">@{suggestedUser.username}</p>
                        </div>
                      </Link>
                    </UserHoverCard>
                    {user && (
                      <FollowButton
                        targetUserId={suggestedUser.id}
                        isFollowing={suggestedUser.isFollowing}
                        currentUserId={user.id}
                      />
                    )}
                  </div>
                ))}
                {suggestedUsers.length > 3 && (
                  <div className="text-blue-500 hover:underline cursor-pointer p-2">Show more</div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
