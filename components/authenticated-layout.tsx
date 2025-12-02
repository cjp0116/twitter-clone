"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TwitterSidebar } from "@/components/twitter-sidebar"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  user?: User
}

export function AuthenticatedLayout({ children, user: propUser }: AuthenticatedLayoutProps) {
  const [user, setUser] = useState<User | null>(propUser || null)
  const [loading, setLoading] = useState(!propUser)

  useEffect(() => {
    if (propUser) {
      setUser(propUser)
      setLoading(false)
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [propUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <TwitterSidebar user={user} />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  )
}
