"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Search, Bell, Mail, Bookmark, User, Settings } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"

interface SidebarNavigationProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      username?: string
    }
  }
}

export function SidebarNavigation({ user }: SidebarNavigationProps) {
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
    <div className="w-64 h-screen sticky top-0 p-4 space-y-4">
      {/* Logo */}
      <div className="px-3 py-2">
        <h1 className="text-2xl font-bold text-primary">Twitter</h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? "default" : "ghost"}
              className="w-full justify-start text-lg h-12 px-3"
            >
              <Link href={item.href}>
                <Icon className="h-6 w-6 mr-4" />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* Tweet button */}
      <Button className="w-full h-12 text-lg font-semibold rounded-full">Tweet</Button>

      {/* User profile */}
      {/* <Card className="mt-auto">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
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
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user.user_metadata?.display_name || "User"}</p>
                <p className="text-muted-foreground text-sm truncate">@{user.user_metadata?.username || "username"}</p>
              </div>
            </Link>
            <LogoutButton variant="ghost" size="sm" />
          </div>
        </CardContent>
      </Card> */}
      <Card className="mt-auto">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Link href={`/profile/${username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {displayName[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <p className="text-muted-foreground text-sm truncate">@{username}</p>
              </div>
            </Link>
            <LogoutButton variant="ghost" size="sm" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
