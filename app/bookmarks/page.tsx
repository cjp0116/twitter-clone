import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TweetCard } from "@/components/tweet-card"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { MainLayout } from "@/components/main-layout"
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
  
  if (bookmarksError) {
    console.error("Error fetching bookmarks:", bookmarksError)
  }

  // Extract tweets from bookmarks
  // Supabase returns tweets as an object (not array) for one-to-one relations
  const bookmarkedTweets = bookmarks?.map((bookmark) => bookmark.tweets).filter(Boolean) || []

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Bookmarks" user={user}>
          {bookmarkedTweets.length > 0 ? (
            <div className="divide-y divide-border">
              {bookmarkedTweets.map((tweet) => (
                <TweetCard
                  key={tweet.id}
                  tweet={tweet}
                  currentUserId={user.id}
                  currentUser={user}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg mb-2">No bookmarks yet</p>
              <p className="text-sm">Save tweets for later by clicking the bookmark icon</p>
            </div>
          )}
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}

