"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FollowButton } from "@/components/interactions/follow-button"
import Link from "next/link"

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  follower_count: number
  following_count: number
}

interface UserHoverCardProps {
  userId: string
  children: React.ReactNode
  currentUserId?: string
}

export function UserHoverCard({ userId, children, currentUserId }: UserHoverCardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const fetchUserProfile = async () => {
      setIsLoading(true)
      const supabase = createClient()

      try {
        // Fetch user profile first (required for other data to matter)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .eq("id", userId)
          .single()

        if (profileError) throw profileError

        // Parallelize independent follow-related queries
        const followQueries: Promise<{ count: number | null } | { isFollowing: boolean }>[] = [
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", userId)
            .then(({ count }) => ({ count })),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", userId)
            .then(({ count }) => ({ count })),
        ]

        // Add isFollowing check if applicable
        const shouldCheckFollow = currentUserId && currentUserId !== userId
        if (shouldCheckFollow) {
          followQueries.push(
            supabase
              .from("follows")
              .select("id")
              .eq("follower_id", currentUserId)
              .eq("following_id", userId)
              .maybeSingle()
              .then(({ data }) => ({ isFollowing: !!data }))
          )
        }

        const results = await Promise.all(followQueries)
        const followerCount = (results[0] as { count: number | null }).count || 0
        const followingCount = (results[1] as { count: number | null }).count || 0

        if (shouldCheckFollow) {
          setIsFollowing((results[2] as { isFollowing: boolean }).isFollowing)
        }

        setProfile({
          ...profileData,
          follower_count: followerCount,
          following_count: followingCount,
        })
      } catch (error) {
        console.error("Error fetching user profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId, currentUserId, isOpen])

  const handleFollowChange = (newFollowingState: boolean) => {
    setIsFollowing(newFollowingState)
    if (profile) {
      setProfile({
        ...profile,
        follower_count: newFollowingState ? profile.follower_count + 1 : profile.follower_count - 1,
      })
    }
  }

  return (
    <HoverCard openDelay={300} closeDelay={200} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" align="start">
        {isLoading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-16 w-16 rounded-full bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
              <div className="h-12 rounded bg-muted" />
            </div>
          </div>
        ) : profile ? (
          <div className="p-4 space-y-3">
            {/* Avatar and Follow Button */}
            <div className="flex items-start justify-between">
              <Link href={`/profile/${profile.username}`} className="block">
                <Avatar className="h-16 w-16 cursor-pointer hover:opacity-90 transition-opacity">
                  <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile.display_name[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              {currentUserId && currentUserId !== userId && (
                <FollowButton
                  userId={userId}
                  username={profile.username}
                  initialFollowing={isFollowing}
                  onFollowChange={handleFollowChange}
                />
              )}
            </div>

            {/* User Info */}
            <Link href={`/profile/${profile.username}`} className="block space-y-1 hover:underline">
              <div className="font-bold text-base leading-tight">{profile.display_name}</div>
              <div className="text-sm text-muted-foreground">@{profile.username}</div>
            </Link>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{profile.bio}</p>
            )}

            <Separator />

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <Link href={`/profile/${profile.username}/following`} className="hover:underline">
                <span className="font-bold">{profile.following_count}</span>{" "}
                <span className="text-muted-foreground">Following</span>
              </Link>
              <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
                <span className="font-bold">{profile.follower_count}</span>{" "}
                <span className="text-muted-foreground">Followers</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">User not found</div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
