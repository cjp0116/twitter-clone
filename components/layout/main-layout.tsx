"use client"

import type React from "react"
import type { User } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  user?: User
  showRightSidebar?: boolean
}

export function MainLayout({ children, title, user, showRightSidebar = true }: MainLayoutProps) {
  return (
    <div className="flex max-w-7xl mx-auto">
      <div className="w-[600px] border-x border-border">
        {/* Header */}
        <Card className="border-0 border-b rounded-none sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <CardHeader className="p-4 flex flex-row items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
          </CardHeader>
        </Card>

        {children}
      </div>

      {/* Right sidebar - What's happening and Who to follow */}
      {showRightSidebar && (
        <div className="hidden xl:flex flex-col w-80 p-4 space-y-4">
          {/* What's happening section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's happening</CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3">
              <div className="hover:bg-muted/50 p-2 rounded cursor-pointer">
                <p className="text-sm text-muted-foreground">Trending in United States</p>
                <p className="font-semibold">SMOONA</p>
                <p className="text-sm text-muted-foreground">5,086 posts</p>
              </div>
              <div className="hover:bg-muted/50 p-2 rounded cursor-pointer">
                <p className="text-sm text-muted-foreground">Trending in United States</p>
                <p className="font-semibold">BHVR</p>
              </div>
              <div className="hover:bg-muted/50 p-2 rounded cursor-pointer">
                <p className="text-sm text-muted-foreground">Trending in United States</p>
                <p className="font-semibold">North Texas Giving Day</p>
              </div>
              <div className="text-blue-500 hover:underline cursor-pointer p-2">Show more</div>
            </div>
          </Card>

          {/* Who to follow section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Who to follow</CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                    P
                  </div>
                  <div>
                    <p className="font-semibold">pope papi 🔮 bday ...</p>
                    <p className="text-sm text-muted-foreground">@THEEsimphunter</p>
                  </div>
                </div>
                <button className="bg-foreground text-background px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-foreground/90">
                  Follow
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                    D
                  </div>
                  <div>
                    <p className="font-semibold">fj</p>
                    <p className="text-sm text-muted-foreground">@dancosparado</p>
                  </div>
                </div>
                <button className="bg-foreground text-background px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-foreground/90">
                  Follow
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                    じ
                  </div>
                  <div>
                    <p className="font-semibold">じゅーレー</p>
                    <p className="text-sm text-muted-foreground">@juicy20191129</p>
                  </div>
                </div>
                <button className="bg-foreground text-background px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-foreground/90">
                  Follow
                </button>
              </div>
              <div className="text-blue-500 hover:underline cursor-pointer p-2">Show more</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
