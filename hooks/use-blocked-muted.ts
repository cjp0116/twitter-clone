import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Hook to fetch lists of blocked and muted user IDs
 * Returns empty arrays while loading
 */
export function useBlockedMuted(currentUserId: string | undefined) {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false)
      return
    }

    const fetchBlockedAndMuted = async () => {
      try {
        // Fetch blocked users
        const { data: blocks } = await supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", currentUserId)

        const blockedIds = blocks?.map((b) => b.blocked_id) || []
        setBlockedUserIds(blockedIds)

        // Fetch muted users
        const { data: mutes } = await supabase
          .from("mutes")
          .select("muted_id")
          .eq("muter_id", currentUserId)

        const mutedIds = mutes?.map((m) => m.muted_id) || []
        setMutedUserIds(mutedIds)
      } catch (error) {
        console.error("Error fetching blocked/muted users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlockedAndMuted()

    // Subscribe to real-time changes
    const blocksChannel = supabase
      .channel(`blocks:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocks",
          filter: `blocker_id=eq.${currentUserId}`,
        },
        () => {
          fetchBlockedAndMuted()
        }
      )
      .subscribe()

    const mutesChannel = supabase
      .channel(`mutes:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mutes",
          filter: `muter_id=eq.${currentUserId}`,
        },
        () => {
          fetchBlockedAndMuted()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(blocksChannel)
      supabase.removeChannel(mutesChannel)
    }
  }, [currentUserId, supabase])

  return { blockedUserIds, mutedUserIds, isLoading }
}

/**
 * Filter tweets to exclude blocked and muted users
 */
export function filterBlockedMutedTweets<T extends { author_id: string }>(
  tweets: T[],
  blockedUserIds: string[],
  mutedUserIds: string[]
): T[] {
  const excludedIds = new Set([...blockedUserIds, ...mutedUserIds])
  return tweets.filter((tweet) => !excludedIds.has(tweet.author_id))
}
