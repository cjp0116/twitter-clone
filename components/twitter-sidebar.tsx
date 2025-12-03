"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Search, Bell, Mail, Bookmark, User, Settings } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { createClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

interface TwitterSidebarProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      username?: string
    }
  }
}

export function TwitterSidebar({ user }: TwitterSidebarProps) {
  const pathname = usePathname()
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const supabase = createClient()

  const navigationItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Bell, label: "Notifications", href: "/notifications", badge: unreadNotificationsCount },
    { icon: Mail, label: "Messages", href: "/messages", badge: unreadMessagesCount },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    { icon: User, label: "Profile", href: `/profile/${user.user_metadata?.username || user.id}` },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadNotificationsCount = async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)

      if (!error && count !== null) {
        setUnreadNotificationsCount(count)
      }
    }

    fetchUnreadNotificationsCount()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`notifications_count:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadNotificationsCount((prev) => prev + 1)
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
          // If notification was marked as read, decrement count
          if (payload.new.read && !payload.old.read) {
            setUnreadNotificationsCount((prev) => Math.max(0, prev - 1))
          }
          // If notification was marked as unread, increment count
          else if (!payload.new.read && payload.old.read) {
            setUnreadNotificationsCount((prev) => prev + 1)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id])

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadMessagesCount = async () => {
      // Get all conversations the user is part of
      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id)

      if (!participantData || participantData.length === 0) {
        setUnreadMessagesCount(0)
        return
      }

      // Count unread messages across all conversations
      let totalUnread = 0
      for (const participant of participantData) {
        const lastReadAt = participant.last_read_at || new Date(0).toISOString()

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", participant.conversation_id)
          .neq("sender_id", user.id)
          .gt("created_at", lastReadAt)
          .is("deleted_at", null)

        totalUnread += count || 0
      }

      setUnreadMessagesCount(totalUnread)
    }

    fetchUnreadMessagesCount()

    // Subscribe to realtime changes for new messages
    const channel = supabase
      .channel(`messages_count:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // Check if this message is in one of the user's conversations and not from them
          if (payload.new.sender_id !== user.id) {
            const { data: isParticipant } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("conversation_id", payload.new.conversation_id)
              .eq("user_id", user.id)
              .single()

            if (isParticipant) {
              setUnreadMessagesCount((prev) => prev + 1)
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // When user reads messages (last_read_at updates), recalculate count
          fetchUnreadMessagesCount()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-2">
          <h1 className="text-2xl font-bold text-primary group-data-[collapsible=icon]:text-lg">
            <span className="group-data-[collapsible=icon]:hidden">Twitter</span>
            <span className="hidden group-data-[collapsible=icon]:block">T</span>
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const showBadge = item.badge !== undefined && item.badge > 0

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} size="lg" tooltip={item.label}>
                  <Link href={item.href} className="relative">
                    <Icon className="h-6 w-6" />
                    <span>{item.label}</span>
                    {showBadge && (
                      <span className="absolute -top-1 left-3 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        <SidebarSeparator />

        {/* Tweet button */}
        <div className="px-2">
          <Button className="w-full h-12 text-lg font-semibold rounded-full group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0">
            <span className="group-data-[collapsible=icon]:hidden">Tweet</span>
            <span className="hidden group-data-[collapsible=icon]:block text-xl">+</span>
          </Button>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between p-2 border rounded-lg">
          <Link
            href={`/profile/${user.user_metadata?.username || user.id}`}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.user_metadata?.display_name?.[0]?.toUpperCase() ||
                  user.user_metadata?.username?.[0]?.toUpperCase() ||
                  user.email?.[0]?.toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="font-semibold text-sm truncate">{user.user_metadata?.display_name || "User"}</p>
              <p className="text-muted-foreground text-sm truncate">@{user.user_metadata?.username || "username"}</p>
            </div>
          </Link>
          <div className="group-data-[collapsible=icon]:hidden">
            <LogoutButton variant="ghost" size="sm" />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
