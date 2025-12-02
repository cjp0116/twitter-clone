"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, Heart, UserPlus, Sparkles, AtSign } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  type: "follow" | "like" | "mention"
  actor_id: string
  recipient_id: string
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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchNotifications()
  }, [activeTab])

  const fetchNotifications = async () => {
    setLoading(true)

    let query = supabase
      .from("notifications")
      .select(`
        *,
        actor_profile:profiles!notifications_actor_id_fkey(display_name, username, avatar_url),
        tweet:tweets(content)
      `)
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })

    if (activeTab === "mentions") {
      query = query.eq("type", "mention")
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
    } else {
      setNotifications(data || [])
    }

    setLoading(false)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <UserPlus className="w-8 h-8 text-blue-500" />
      case "like":
        return <Heart className="w-8 h-8 text-red-500" />
      case "mention":
        return <AtSign className="w-8 h-8 text-blue-500" />
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
      case "mention":
        return `${actorName} mentioned you`
      default:
        return `${actorName} interacted with your content`
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === "all" ? "text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            All
            {activeTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("verified")}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === "verified" ? "text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Verified
            {activeTab === "verified" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("mentions")}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === "mentions" ? "text-white" : "text-gray-500 hover:text-gray-300"
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
          notifications.map((notification) => (
            <div key={notification.id} className="p-4 hover:bg-gray-900/50 transition-colors">
              <div className="flex gap-3">
                <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
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
                        <p className="text-white font-medium">{getNotificationText(notification)}</p>
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
          ))
        )}
      </div>
    </div>
  )
}
