import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { MainLayout } from "@/components/layout/main-layout"
import { TweetDetailContent, getRelevantPeople } from "@/components/tweet/tweet-detail-content"

interface TweetPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TweetPage({ params }: TweetPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch the tweet
  const { data: tweet, error: tweetError } = await supabase
    .from("tweets")
    .select(
      `
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("id", id)
    .single()

  if (tweetError || !tweet) {
    redirect("/")
  }

  // Fetch current user's profile
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Fetch relevant people (people who engaged with this tweet)
  const relevantPeople = await getRelevantPeople(id, supabase)

  // Check which relevant people the current user is following
  const relevantPeopleWithFollowStatus = await Promise.all(
    relevantPeople.map(async (profile) => {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle()

      return {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        isFollowing: !!followData,
      }
    })
  )

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Post" user={user} showBackButton suggestedUsers={relevantPeopleWithFollowStatus}>
          <TweetDetailContent
            tweet={tweet}
            currentUserId={user.id}
            currentUser={{
              id: user.id,
              email: user.email,
              user_metadata: {
                display_name: currentUserProfile?.display_name || user.email?.split("@")[0] || "User",
                username: currentUserProfile?.username || user.email?.split("@")[0] || "user",
              },
            }}
          />
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
