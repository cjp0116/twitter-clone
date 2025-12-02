"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface FollowButtonProps {
  targetUserId: string
  isFollowing: boolean
  currentUserId: string
}

export function FollowButton({ targetUserId, isFollowing: initialIsFollowing, currentUserId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleFollow = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId)

        if (!error) {
          setIsFollowing(false)
        }
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        })

        if (!error) {
          setIsFollowing(true)
        }
      }
      router.refresh()
    } catch (error) {
      console.error("Error toggling follow:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleFollow}
      disabled={isLoading}
      variant={isFollowing ? "outline" : "default"}
      className="rounded-full px-6"
    >
      {isLoading ? "Loading..." : isFollowing ? "Unfollow" : "Follow"}
    </Button>
  )
}
