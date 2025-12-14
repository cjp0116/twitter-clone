import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// hook to fetch lists of blocked and muted user IDs. Returns empty arrays while loading.

export function useBlockedMuted(currentUserId: string | undefined) {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if(!currentUserId) {
      setIsLoading(false)
      return
    }
    const fetchBlockedAndMuted = async () => {
      try {
        const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', currentUserId)
        const blockedIds = blocks?.map(b => b.blocked_id) || []
        setBlockedUserIds(blockedIds)

        const { data: mutes } = await supabase.from('mutes').select('muted_id').eq('muter_id', currentUserId)
        const mutedIds = mutes?.map(m => m.muted_id) || []
        setMutedUserIds(mutedIds)
      } catch (error) {
        console.error('Error fetching blocked/muted users:', error)
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
  }, [supabase, currentUserId])

  return { blockedUserIds, mutedUserIds, isLoading }
} 
export function filterBlockedMutedTweets<T extends { author_id: string }>(
  tweets: T[],
  blockedUserIds: string[],
  mutedUserIds: string[]
): T[] {
  const excludedIds = new Set([...blockedUserIds, ...mutedUserIds])
  return tweets.filter((tweet) => !excludedIds.has(tweet.author_id))
}