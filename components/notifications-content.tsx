"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, Heart, UserPlus, Sparkles, AtSign, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

interface Notification {
  id: string
  type: "follow" | "like" | "reply" | "retweet"
  actor_id: string
  user_id: string
  tweet_id?: string
  read: boolean
  created_at: string
  actor_profile?: {
    display_name: string
    username: string
    avatar_url?: string
  }
  tweet?: {
    content: string
  }
}

interface NotificationsContentProps {
  user: {
    id: string
    email?: string
  }
}

export function NotificationsContent({ user }: NotificationsContentProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "verified" | "mentions">("all")
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
  }, [activeTab])

  // Realtime subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the complete notification with related data
          const { data: newNotification, error } = await supabase
            .from("notifications")
            .select(`
              *,
              actor_profile:profiles!notifications_actor_id_fkey(display_name, username, avatar_url),
              tweet:tweets(content)
            `)
            .eq("id", payload.new.id)
            .single()

          if (!error && newNotification) {
            // Only add if it matches the current tab filter
            if (activeTab === "all" || (activeTab === "mentions" && newNotification.type === "reply")) {
              setNotifications((prev) => [newNotification, ...prev])
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update the notification in the list (e.g., when marked as read)
          setNotifications((prev) =>
            prev.map((notif) => (notif.id === payload.new.id ? { ...notif, ...payload.new } : notif)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id, activeTab])

  const fetchNotifications = async () => {
    setLoading(true)

    let query = supabase
      .from("notifications")
      .select(`
        *,
        actor_profile:profiles!notifications_actor_id_fkey(display_name, username, avatar_url),
        tweet:tweets(content)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)



    if (activeTab === "mentions") {
      // Mentions and replies are both modeled as "reply" notifications
      query = query.eq("type", "reply")
    }
    const { data, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
    } else {
      setNotifications(data || [])
      setHasMore((data?.length || 0) === 20)
    }
    setLoading(false)
  }

  const fetchMoreNotifications = useCallback(async () => {
    if (isLoadingMore) return
    setIsLoadingMore(true)
    let query = supabase
      .from("notifications")
      .select(`
        *,
        actor_profile:profiles!notifications_actor_id_fkey(display_name, username, avatar_url),
        tweet:tweets(content)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(notifications.length, notifications.length + 19)

    if (activeTab === "mentions") {
      query = query.eq("type", "reply")
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching more notifications:", error)
    } else {
      setNotifications((prev) => [...prev, ...(data || [])])
      setHasMore((data?.length || 0) === 20)
    }
    setIsLoadingMore(false)
  }, [supabase, user.id, activeTab, notifications.length, isLoadingMore])

  const loadMoreRef = useInfiniteScroll({
    onLoadMore: fetchMoreNotifications,
    isLoading: isLoadingMore,
    hasMore,
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <UserPlus className="w-8 h-8 text-blue-500" />
      case "like":
        return <Heart className="w-8 h-8 text-red-500" />
      case "reply":
        return <AtSign className="w-8 h-8 text-blue-500" />
      case "retweet":
        return <Sparkles className="w-8 h-8 text-green-500" />
      default:
        return <Sparkles className="w-8 h-8 text-purple-500" />
    }
  }

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor_profile?.display_name || notification.actor_profile?.username || "Someone"

    switch (notification.type) {
      case "follow":
        return `${actorName} followed you`
      case "like":
        return `${actorName} liked your post`
      case "reply":
        return `${actorName} replied to or mentioned you`
      case "retweet":
        return `${actorName} retweeted your post`
      default:
        return `${actorName} interacted with your content`
    }
  }

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-blue-500 hover:text-blue-400">
                Mark all as read
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-3 font-medium transition-colors relative ${activeTab === "all" ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
          >
            All
            {activeTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("verified")}
            className={`px-4 py-3 font-medium transition-colors relative ${activeTab === "verified" ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
          >
            Verified
            {activeTab === "verified" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("mentions")}
            className={`px-4 py-3 font-medium transition-colors relative ${activeTab === "mentions" ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
          >
            Mentions
            {activeTab === "mentions" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-gray-800">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {activeTab === "mentions" ? "No mentions yet" : "No notifications yet"}
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-900/50 transition-colors cursor-pointer ${!notification.read ? "bg-blue-500/5 border-l-2 border-blue-500" : ""
                  }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className="shrink-0">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={notification.actor_profile?.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gray-600 text-white text-xs">
                          {notification.actor_profile?.display_name?.[0]?.toUpperCase() ||
                            notification.actor_profile?.username?.[0]?.toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{getNotificationText(notification)}</p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" title="Unread" />
                            )}
                          </div>
                          <span className="text-gray-500 text-sm">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {notification.tweet && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{notification.tweet.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <div ref={loadMoreRef} className="p-4 flex justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading more notifications...</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
