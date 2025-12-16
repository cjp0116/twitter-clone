import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BookmarksContent } from "@/components/feed/bookmarks-content"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { MainLayout } from "@/components/layout/main-layout"
import { SidebarInset } from "@/components/ui/sidebar"

export default async function BookmarksPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch user's bookmarked tweets with tweet and profile data
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from("bookmarks")
    .select(`
      tweet_id,
      created_at,
      tweets (
        id,
        content,
        created_at,
        likes_count,
        retweets_count,
        replies_count,
        author_id,
        reply_to_id,
        retweet_of_id,
        media_urls,
        media_types,
        profiles (
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (bookmarksError) {
    console.error("Error fetching bookmarks:", bookmarksError)
  }

  // Extract tweets from bookmarks
  // Supabase returns tweets as an object (not array) for one-to-one relations
  const bookmarkedTweets = (bookmarks?.map((bookmark: any) => bookmark.tweets).filter(Boolean) || []) as any[]

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

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Bookmarks" user={user} suggestedUsers={suggestedUsersWithFollowStatus}>
          <BookmarksContent
            initialBookmarks={bookmarkedTweets}
            currentUserId={user.id}
            currentUser={user}
          />
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}

