import { Input } from "@/components/ui/input"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TweetCard } from "@/components/tweet-card"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { MainLayout } from "@/components/main-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { SearchComponent } from "@/components/search-component"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { UserCard } from "@/components/user-card"

export default async function ExplorePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch trending tweets (most liked in last 24 hours)
  const { data: trendingTweets, error: trendingError } = await supabase
    .from("tweets")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("likes_count", { ascending: false })
    .limit(10)

  const { data: suggestedUsers, error: usersError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
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
        <MainLayout title="Explore" user={user} suggestedUsers={suggestedUsersWithFollowStatus}>
          <SearchComponent currentUserId={user.id} currentUser={user} />

          {/* Trending */}
          <div className="border-b border-border">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Trending now</h2>
            </div>
            <div className="divide-y divide-border">
              {trendingTweets && trendingTweets.length > 0 ? (
                trendingTweets.map((tweet) => (
                  <TweetCard key={tweet.id} tweet={tweet} currentUserId={user.id} currentUser={user} />
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No trending tweets right now</p>
                </div>
              )}
            </div>
          </div>
          {suggestedUsers && suggestedUsers.length > 0 && (
            <div className="border-b border-border">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Suggested users</h2>
              </div>
              <div className="divide-y divide-border">
                {suggestedUsers.map((user) => (
                  <Link key={user.id} href={`/profile/${user.username}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.display_name[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.display_name}</p>
                        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                        {user.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
