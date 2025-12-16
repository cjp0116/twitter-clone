import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { MainLayout } from "@/components/layout/main-layout"
import { TweetDetailContent } from "@/components/tweet/tweet-detail-content"

interface TweetPageProps {
  params: {
    id: string
  }
}

export default async function TweetPage({ params }: TweetPageProps) {
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
    .eq("id", params.id)
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

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Post" user={user} showBackButton>
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
