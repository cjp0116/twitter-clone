"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Search, Bell, Mail, Bookmark, User, Settings } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
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

  const navigationItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    { icon: User, label: "Profile", href: `/profile/${user.user_metadata?.username || user.id}` },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

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

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} size="lg" tooltip={item.label}>
                  <Link href={item.href}>
                    <Icon className="h-6 w-6" />
                    <span>{item.label}</span>
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
