import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ComposeTweet } from "@/components/tweet/compose-tweet"
import { TimelineFeed } from "@/components/feed/timeline-feed"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { MainLayout } from "@/components/layout/main-layout"
import { SidebarInset } from "@/components/ui/sidebar"

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch initial tweets with profile information
  const { data: tweets, error: tweetsError } = await supabase
    .from("tweets")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })
    .limit(20)

  if (tweetsError) {
    console.error("Error fetching tweets:", tweetsError)
  }

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Home" user={user}>
          {/* Compose Tweet */}
          <ComposeTweet user={user} />

          {/* Timeline Feed */}
          <TimelineFeed initialTweets={tweets || []} currentUserId={user.id} currentUser={user} />
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
