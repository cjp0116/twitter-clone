import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ComposeTweet } from "@/components/tweet/compose-tweet"
import { TimelineFeed } from "@/components/feed/timeline-feed"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { MainLayout } from "@/components/layout/main-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { getTrendingHashtags } from "@/lib/queries/trending-hashtags"
import type { TrendingHashtag as TrendingHashtagType } from "@/lib/queries/trending-hashtags"

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

  // Fetch suggested users
  const { data: suggestedUsers, error: usersError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .neq("id", user.id)
    .order("followers_count", { ascending: false })
    .limit(5)

  // Check which users the current user is following
  const suggestedUsersWithFollowStatus = await Promise.all(
    (suggestedUsers || []).map(async (profile) => {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .single()

      return {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        isFollowing: !!followData,
      }
    })
  )

  // Fetch trending hashtags
  let trendingHashtags: TrendingHashtagType[] = []
  try {
    trendingHashtags = await getTrendingHashtags(5) || []
  } catch (error) {
    console.error("Error fetching trending hashtags:", error)
  }
  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Home" user={user} suggestedUsers={suggestedUsersWithFollowStatus} trendingHashtags={trendingHashtags}>
          {/* Compose Tweet */}
          <ComposeTweet user={user} />

          {/* Timeline Feed */}
          <TimelineFeed initialTweets={tweets || []} currentUserId={user.id} currentUser={user} />
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
