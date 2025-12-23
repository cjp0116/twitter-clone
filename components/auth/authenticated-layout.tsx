"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import type { User } from "@supabase/supabase-js"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TwitterSidebar } from "@/components/layout/twitter-sidebar"
import { createClient } from '@/lib/supabase/client'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  user?: User
}

export function AuthenticatedLayout({ children, user: propUser }: AuthenticatedLayoutProps) {
  const [user, setUser] = useState<User | null>(propUser || null)
  const [loading, setLoading] = useState(!propUser)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (propUser) {
      setUser(propUser)
      setLoading(false)
      return
    }

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
  }, [propUser, supabase])

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
